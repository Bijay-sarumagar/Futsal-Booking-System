import base64
import hashlib
import hmac
import json
from decimal import Decimal, ROUND_HALF_UP
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.bookings.models import Booking
from apps.bookings.utils import release_expired_pending_bookings
from apps.notifications.models import Notification
from .models import Payment
from .serializers import PaymentSerializer


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """Payment Management ViewSet (Read-only)"""
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    
    def get_queryset(self):
        # Players see their own payments
        if self.request.user.is_player():
            return Payment.objects.filter(booking__user=self.request.user)
        # Owners see payments for their futsals
        elif self.request.user.is_owner():
            return Payment.objects.filter(booking__slot__futsal__owner=self.request.user)
        # Admin sees all
        return Payment.objects.all()

    def _get_allowed_booking(self, booking_id):
        booking = get_object_or_404(Booking.objects.select_related('slot__futsal', 'user'), pk=booking_id)
        release_expired_pending_bookings(slot_ids=[booking.slot_id])
        booking.refresh_from_db(fields=['booking_status', 'payment_status'])

        can_access = (
            self.request.user.is_admin()
            or booking.user == self.request.user
            or (self.request.user.is_owner() and booking.slot.futsal.owner == self.request.user)
        )
        if not can_access:
            return None
        return booking

    def _emit_payment_notifications(self, booking, amount: Decimal, method_label: str):
        amount_str = str(amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
        futsal_name = booking.slot.futsal.futsal_name
        slot_label = f"{booking.slot.slot_date} {booking.slot.start_time}-{booking.slot.end_time}"
        player_name = booking.user.get_full_name().strip() or booking.user.username

        Notification.objects.create(
            user=booking.user,
            message=f"Payment successful: Rs. {amount_str} via {method_label} for {futsal_name} ({slot_label}).",
            notification_type='payment',
            related_booking=booking,
        )

        Notification.objects.create(
            user=booking.slot.futsal.owner,
            message=f"Payment received: {player_name} paid Rs. {amount_str} via {method_label} for {futsal_name}.",
            notification_type='payment',
            related_booking=booking,
        )

    @action(detail=False, methods=['post'], url_path='esewa/initiate')
    def esewa_initiate(self, request):
        booking_id = request.data.get('booking_id')
        if not booking_id:
            return Response({'detail': 'booking_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        booking = self._get_allowed_booking(booking_id)
        if not booking:
            return Response({'detail': 'Not allowed for this booking'}, status=status.HTTP_403_FORBIDDEN)

        if booking.payment_status == 'completed':
            return Response({'detail': 'Booking is already paid'}, status=status.HTTP_400_BAD_REQUEST)

        if booking.booking_status != 'confirmed':
            return Response({'detail': 'Booking is no longer active. Please book the slot again.'}, status=status.HTTP_400_BAD_REQUEST)

        configured_test_amount = getattr(settings, 'ESEWA_TEST_FIXED_AMOUNT', None)
        if configured_test_amount in (None, ''):
            advance_amount = (Decimal(booking.slot.price) * Decimal('0.10')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        else:
            advance_amount = Decimal(str(configured_test_amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        amount = str(advance_amount)
        total_amount = amount
        transaction_uuid = f"BKG-{booking.id}-{int(timezone.now().timestamp())}"
        signed_field_names = 'total_amount,transaction_uuid,product_code'
        signing_payload = f"total_amount={total_amount},transaction_uuid={transaction_uuid},product_code={settings.ESEWA_PRODUCT_CODE}"
        signature = base64.b64encode(
            hmac.new(settings.ESEWA_SECRET_KEY.encode(), signing_payload.encode(), hashlib.sha256).digest()
        ).decode()

        payment, _ = Payment.objects.get_or_create(
            booking=booking,
            defaults={
                'amount': advance_amount,
                'payment_method': 'esewa',
                'payment_status': 'pending',
                'transaction_id': transaction_uuid,
            },
        )
        if payment.payment_status != 'completed':
            payment.payment_method = 'esewa'
            payment.payment_status = 'pending'
            payment.transaction_id = transaction_uuid
            payment.amount = advance_amount
            payment.save(update_fields=['payment_method', 'payment_status', 'transaction_id', 'amount', 'updated_at'])

        booking.payment_status = 'pending'
        booking.save(update_fields=['payment_status', 'updated_at'])

        success_url = f"{settings.FRONTEND_BASE_URL}/payments/success?booking_id={booking.id}"
        failure_url = f"{settings.FRONTEND_BASE_URL}/payments/failure?booking_id={booking.id}"

        return Response({
            'gateway': 'esewa',
            'payment_url': f"{settings.ESEWA_BASE_URL}/api/epay/main/v2/form",
            'fields': {
                'amount': amount,
                'tax_amount': '0',
                'total_amount': total_amount,
                'transaction_uuid': transaction_uuid,
                'product_code': settings.ESEWA_PRODUCT_CODE,
                'product_service_charge': '0',
                'product_delivery_charge': '0',
                'success_url': success_url,
                'failure_url': failure_url,
                'signed_field_names': signed_field_names,
                'signature': signature,
            },
        })

    @action(detail=False, methods=['post'], url_path='esewa/verify')
    @transaction.atomic
    def esewa_verify(self, request):
        booking_id = request.data.get('booking_id')
        encoded_data = request.data.get('data')
        direct_status = request.data.get('status')
        direct_ref = request.data.get('ref_id')

        if not booking_id:
            return Response({'detail': 'booking_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        booking = self._get_allowed_booking(booking_id)
        if not booking:
            return Response({'detail': 'Not allowed for this booking'}, status=status.HTTP_403_FORBIDDEN)

        if booking.booking_status == 'cancelled':
            return Response({'detail': 'Payment session is no longer active. Please create a new booking.'}, status=status.HTTP_400_BAD_REQUEST)

        verify_status = direct_status
        ref_id = direct_ref

        if encoded_data:
            try:
                decoded = base64.b64decode(encoded_data).decode()
                payload = json.loads(decoded)
                verify_status = payload.get('status', verify_status)
                ref_id = payload.get('transaction_code', ref_id) or payload.get('transaction_uuid', ref_id)
            except Exception:
                return Response({'detail': 'Invalid eSewa payload'}, status=status.HTTP_400_BAD_REQUEST)

        payment, _ = Payment.objects.get_or_create(
            booking=booking,
            defaults={
                'amount': booking.slot.price,
                'payment_method': 'esewa',
                'payment_status': 'pending',
                'transaction_id': ref_id,
            },
        )

        if str(verify_status).upper() == 'COMPLETE':
            was_completed = payment.payment_status == 'completed'
            payment.payment_status = 'completed'
            if ref_id:
                payment.transaction_id = str(ref_id)
            payment.payment_method = 'esewa'
            payment.save(update_fields=['payment_status', 'transaction_id', 'payment_method', 'updated_at'])

            booking.payment_status = 'completed'
            booking.save(update_fields=['payment_status', 'updated_at'])
            if not was_completed:
                self._emit_payment_notifications(booking, payment.amount, 'eSewa')
            return Response({'status': 'Payment verified', 'payment_status': 'completed'})

        payment.payment_status = 'failed'
        if ref_id:
            payment.transaction_id = str(ref_id)
        payment.payment_method = 'esewa'
        payment.save(update_fields=['payment_status', 'transaction_id', 'payment_method', 'updated_at'])

        booking.booking_status = 'cancelled'
        booking.payment_status = 'failed'
        booking.save(update_fields=['booking_status', 'payment_status', 'updated_at'])

        booking.slot.availability_status = 'available'
        booking.slot.save(update_fields=['availability_status', 'updated_at'])

        return Response({'status': 'Payment failed', 'payment_status': 'failed'})

    @action(detail=False, methods=['post'], url_path='owner-qr/confirm')
    @transaction.atomic
    def owner_qr_confirm(self, request):
        booking_id = request.data.get('booking_id')
        transaction_id = (request.data.get('transaction_id') or '').strip()

        if not booking_id:
            return Response({'detail': 'booking_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        booking = self._get_allowed_booking(booking_id)
        if not booking:
            return Response({'detail': 'Not allowed for this booking'}, status=status.HTTP_403_FORBIDDEN)

        if booking.booking_status != 'confirmed':
            return Response({'detail': 'Booking is no longer active.'}, status=status.HTTP_400_BAD_REQUEST)

        if booking.payment_status == 'completed':
            return Response({'status': 'Already marked paid', 'payment_status': 'completed'}, status=status.HTTP_200_OK)

        advance_amount = (Decimal(booking.slot.price) * Decimal('0.10')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        fallback_transaction_id = f"OWNERQR-{booking.id}-{int(timezone.now().timestamp())}"
        final_transaction_id = transaction_id or fallback_transaction_id

        payment, _ = Payment.objects.get_or_create(
            booking=booking,
            defaults={
                'amount': advance_amount,
                'payment_method': 'e_wallet',
                'payment_status': 'completed',
                'transaction_id': final_transaction_id,
            },
        )

        payment.amount = advance_amount
        payment.payment_method = 'e_wallet'
        payment.payment_status = 'completed'
        payment.transaction_id = final_transaction_id
        payment.save(update_fields=['amount', 'payment_method', 'payment_status', 'transaction_id', 'updated_at'])

        booking.payment_status = 'completed'
        booking.save(update_fields=['payment_status', 'updated_at'])

        self._emit_payment_notifications(booking, advance_amount, 'Owner QR')

        return Response({'status': 'Payment marked completed', 'payment_status': 'completed'})

    @action(detail=False, methods=['post'], url_path='refund')
    def refund(self, request):
        booking_id = request.data.get('booking_id')
        if not booking_id:
            return Response({'detail': 'booking_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        booking = self._get_allowed_booking(booking_id)
        if not booking:
            return Response({'detail': 'Not allowed for this booking'}, status=status.HTTP_403_FORBIDDEN)

        payment = Payment.objects.filter(booking=booking).first()
        if not payment:
            return Response({'detail': 'No payment found for this booking'}, status=status.HTTP_404_NOT_FOUND)

        if booking.booking_status != 'cancelled':
            return Response({'detail': 'Booking must be cancelled before refund'}, status=status.HTTP_400_BAD_REQUEST)

        payment.payment_status = 'refunded'
        payment.save(update_fields=['payment_status', 'updated_at'])

        booking.payment_status = 'refunded'
        booking.save(update_fields=['payment_status', 'updated_at'])

        return Response({'status': 'Refund completed', 'payment_status': 'refunded'})

    @action(detail=False, methods=['post'], url_path='upload-proof')
    def upload_proof(self, request):
        booking_id = request.data.get('booking_id')
        proof_image = request.FILES.get('payment_proof_image')

        if not booking_id:
            return Response({'detail': 'booking_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not proof_image:
            return Response({'detail': 'payment_proof_image file is required'}, status=status.HTTP_400_BAD_REQUEST)

        booking = self._get_allowed_booking(booking_id)
        if not booking:
            return Response({'detail': 'Not allowed for this booking'}, status=status.HTTP_403_FORBIDDEN)

        payment, _ = Payment.objects.get_or_create(
            booking=booking,
            defaults={
                'amount': booking.slot.price,
                'payment_method': 'e_wallet',
                'payment_status': 'pending',
                'transaction_id': f'PROOF-{booking.id}-{int(timezone.now().timestamp())}',
            },
        )

        payment.payment_proof_image = proof_image
        payment.payment_status = 'pending'
        payment.payment_method = 'e_wallet'
        payment.save(update_fields=['payment_proof_image', 'payment_status', 'payment_method', 'updated_at'])

        booking.payment_status = 'pending'
        booking.save(update_fields=['payment_status', 'updated_at'])

        return Response({'status': 'Payment proof uploaded', 'payment_status': 'pending'})
