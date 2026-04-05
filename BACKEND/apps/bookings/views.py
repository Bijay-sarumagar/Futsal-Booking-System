from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone
from datetime import datetime
from .models import Booking
from .serializers import BookingSerializer, CreateBookingSerializer, UpdateBookingSerializer


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
        booking.save(update_fields=['booking_status', 'updated_at'])
        booking.slot.availability_status = 'available'
        booking.slot.save(update_fields=['availability_status', 'updated_at'])
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
