from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from datetime import datetime
from .models import Booking, OpponentPost
from .serializers import BookingSerializer, CreateBookingSerializer, UpdateBookingSerializer, OpponentPostSerializer
from apps.notifications.models import Notification
from apps.users.models import User


def close_expired_opponent_posts() -> int:
    today = timezone.localdate()
    now = timezone.now()
    expired_posts = OpponentPost.objects.filter(preferred_date__lt=today).exclude(status='closed')
    expired_count = expired_posts.count()
    if not expired_count:
        return 0

    expired_posts.update(status='closed', matched_with=None, updated_at=now)
    return expired_count


class BookingViewSet(viewsets.ModelViewSet):
    """Booking Management ViewSet"""
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]
    
    def _sync_completed_bookings(self, queryset):
        now = timezone.localtime()
        current_tz = timezone.get_current_timezone()
        booking_ids_to_complete = []

        for booking in queryset.filter(booking_status='confirmed').select_related('slot'):
            slot_end_dt = datetime.combine(booking.slot.slot_date, booking.slot.end_time)
            if timezone.is_naive(slot_end_dt):
                slot_end_dt = timezone.make_aware(slot_end_dt, current_tz)

            if slot_end_dt <= now:
                booking_ids_to_complete.append(booking.id)

        if booking_ids_to_complete:
            Booking.objects.filter(id__in=booking_ids_to_complete).update(booking_status='completed')

            from apps.futsals.models import TimeSlot
            TimeSlot.objects.filter(bookings__id__in=booking_ids_to_complete).update(availability_status='available')

    def get_queryset(self):
        # Players only see their own bookings
        if self.request.user.is_player():
            queryset = Booking.objects.filter(user=self.request.user)
        # Owners see bookings for their futsals
        elif self.request.user.is_owner():
            queryset = Booking.objects.filter(slot__futsal__owner=self.request.user)
        # Admin sees all
        else:
            queryset = Booking.objects.all()

        self._sync_completed_bookings(queryset)
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateBookingSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateBookingSerializer
        return BookingSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):
        booking = self.get_object()

        if self.request.user.is_admin():
            serializer.save()
            return

        if self.request.user.is_owner() and booking.slot.futsal.owner == self.request.user:
            serializer.save()
            return

        if booking.user == self.request.user:
            serializer.save()
            return

        raise PermissionDenied('You do not have permission to edit this booking')

    @transaction.atomic
    def perform_destroy(self, instance):
        can_manage = (
            self.request.user.is_admin()
            or instance.user == self.request.user
            or (self.request.user.is_owner() and instance.slot.futsal.owner == self.request.user)
        )
        if not can_manage:
            raise PermissionDenied('You do not have permission to delete this booking')

        slot = instance.slot
        instance.delete()
        slot.availability_status = 'available'
        slot.save(update_fields=['availability_status', 'updated_at'])
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def cancel(self, request, pk=None):
        """Cancel a booking"""
        booking = Booking.objects.select_for_update().select_related('slot').get(pk=pk)
        
        # Player, futsal owner, or admin can cancel
        can_cancel = (
            booking.user == request.user
            or request.user.is_admin()
            or (request.user.is_owner() and booking.slot.futsal.owner == request.user)
        )
        if not can_cancel:
            return Response(
                {'error': 'You can only cancel your own bookings'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if booking.booking_status == 'cancelled':
            return Response(
                {'error': 'Booking is already cancelled'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        booking.booking_status = 'cancelled'
        if booking.payment_status == 'completed':
            booking.payment_status = 'refunded'
        elif booking.payment_status == 'pending':
            booking.payment_status = 'failed'
        booking.save(update_fields=['booking_status', 'payment_status', 'updated_at'])
        booking.slot.availability_status = 'available'
        booking.slot.save(update_fields=['availability_status', 'updated_at'])

        if booking.payment_status == 'refunded':
            from apps.payments.models import Payment
            Payment.objects.filter(booking=booking).update(payment_status='refunded')
        elif booking.payment_status == 'failed':
            from apps.payments.models import Payment
            Payment.objects.filter(booking=booking, payment_status='pending').update(payment_status='failed')

        return Response({'status': 'Booking cancelled'})
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirm a booking (owner only)"""
        booking = self.get_object()
        futsal_owner = booking.slot.futsal.owner
        
        if request.user != futsal_owner and not request.user.is_admin():
            return Response(
                {'error': 'Only futsal owner can confirm bookings'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if booking.booking_status != 'confirmed':
            booking.booking_status = 'confirmed'
            booking.save()
        
        return Response({'status': 'Booking confirmed'})


class OpponentPostListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_player():
            return Response({'error': 'Only players can access opponent finder'}, status=status.HTTP_403_FORBIDDEN)

        close_expired_opponent_posts()

        queryset = OpponentPost.objects.select_related('user', 'matched_with').filter(
            Q(status='open') | Q(user=request.user) | Q(matched_with=request.user)
        )
        serializer = OpponentPostSerializer(queryset, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        if not request.user.is_player():
            return Response({'error': 'Only players can create opponent posts'}, status=status.HTTP_403_FORBIDDEN)

        serializer = OpponentPostSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        post = serializer.save(user=request.user)

        other_players = User.objects.filter(role='player', status='active').exclude(id=request.user.id)
        Notification.objects.bulk_create([
            Notification(
                user=player,
                message=f"{serializer.data['user_name']} is looking for an opponent at {post.location} on {post.preferred_date}",
                notification_type='opponent',
            )
            for player in other_players
        ])

        return Response(OpponentPostSerializer(post).data, status=status.HTTP_201_CREATED)


class OpponentPostJoinView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        if not request.user.is_player():
            return Response({'error': 'Only players can join opponent posts'}, status=status.HTTP_403_FORBIDDEN)

        close_expired_opponent_posts()

        post = OpponentPost.objects.select_for_update().select_related('user').filter(pk=pk).first()
        if not post:
            return Response({'error': 'Opponent post not found'}, status=status.HTTP_404_NOT_FOUND)

        if post.preferred_date < timezone.localdate():
            post.status = 'closed'
            post.matched_with = None
            post.save(update_fields=['status', 'matched_with', 'updated_at'])
            return Response({'error': 'This post has expired and is no longer open'}, status=status.HTTP_400_BAD_REQUEST)

        if post.user_id == request.user.id:
            return Response({'error': 'You cannot join your own post'}, status=status.HTTP_400_BAD_REQUEST)

        if post.status != 'open':
            return Response({'error': 'This post is no longer open'}, status=status.HTTP_400_BAD_REQUEST)

        post.status = 'matched'
        post.matched_with = request.user
        post.save(update_fields=['status', 'matched_with', 'updated_at'])

        joiner_name = request.user.get_full_name().strip() or request.user.username
        Notification.objects.create(
            user=post.user,
            message=f"{joiner_name} joined your opponent request for {post.location}.",
            notification_type='opponent',
        )

        owner_name = post.user.get_full_name().strip() or post.user.username
        Notification.objects.create(
            user=request.user,
            message=f"You matched with {owner_name} for {post.location}.",
            notification_type='opponent',
        )

        return Response({'status': 'Matched successfully'})


class OpponentPostCloseView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        post = OpponentPost.objects.select_for_update().select_related('user', 'matched_with').filter(pk=pk).first()
        if not post:
            return Response({'error': 'Opponent post not found'}, status=status.HTTP_404_NOT_FOUND)

        can_close = request.user.is_admin() or post.user_id == request.user.id
        if not can_close:
            return Response({'error': 'You do not have permission to close this post'}, status=status.HTTP_403_FORBIDDEN)

        actor_name = request.user.get_full_name().strip() or request.user.username
        owner_name = post.user.get_full_name().strip() or post.user.username
        matched_user = post.matched_with

        post.status = 'closed'
        post.matched_with = None
        post.save(update_fields=['status', 'matched_with', 'updated_at'])

        if matched_user and matched_user.id != request.user.id:
            Notification.objects.create(
                user=matched_user,
                message=f"{owner_name}'s opponent request at {post.location} was closed by {actor_name}.",
                notification_type='opponent',
            )

        if request.user.is_admin() and post.user_id != request.user.id:
            Notification.objects.create(
                user=post.user,
                message=f"Your opponent request at {post.location} was closed by admin.",
                notification_type='opponent',
            )

        return Response({'status': 'Post closed'})


class OpponentPostLeaveView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        if not request.user.is_player():
            return Response({'error': 'Only players can cancel matched participation'}, status=status.HTTP_403_FORBIDDEN)

        post = OpponentPost.objects.select_for_update().select_related('user').filter(pk=pk).first()
        if not post:
            return Response({'error': 'Opponent post not found'}, status=status.HTTP_404_NOT_FOUND)

        if post.matched_with_id != request.user.id:
            return Response({'error': 'Only the matched player can leave this request'}, status=status.HTTP_403_FORBIDDEN)

        if post.status != 'matched':
            return Response({'error': 'This request is not in matched state'}, status=status.HTTP_400_BAD_REQUEST)

        leaver_name = request.user.get_full_name().strip() or request.user.username

        post.status = 'open'
        post.matched_with = None
        post.save(update_fields=['status', 'matched_with', 'updated_at'])

        Notification.objects.create(
            user=post.user,
            message=f"{leaver_name} cancelled the match for your opponent request at {post.location}. Your request is open again.",
            notification_type='opponent',
        )

        Notification.objects.create(
            user=request.user,
            message=f"You cancelled your matched game for {post.location}.",
            notification_type='opponent',
        )

        return Response({'status': 'Match cancelled and post reopened'})
