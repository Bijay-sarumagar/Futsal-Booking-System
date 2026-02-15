from datetime import timedelta

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone

from apps.futsals.models import TimeSlot
from apps.payments.models import Payment

from .models import Booking


def get_pending_booking_expiry_minutes() -> int:
    configured_value = getattr(settings, 'PENDING_BOOKING_EXPIRY_MINUTES', 5)
    try:
        minutes = int(configured_value)
    except (TypeError, ValueError):
        minutes = 5
    return max(minutes, 1)


@transaction.atomic
def release_expired_pending_bookings(slot_ids=None) -> int:
    cutoff = timezone.now() - timedelta(minutes=get_pending_booking_expiry_minutes())

    stale_bookings = Booking.objects.filter(
        booking_status='confirmed',
        payment_status='pending',
        created_at__lte=cutoff,
    )

    # PostgreSQL supports SELECT ... FOR UPDATE for row-level locking.
    stale_bookings = stale_bookings.select_for_update()

    if slot_ids is not None:
        stale_bookings = stale_bookings.filter(slot_id__in=slot_ids)

    stale_booking_ids = list(stale_bookings.values_list('id', flat=True))
    if not stale_booking_ids:
        return 0

    # Query slot ids from an unlocked queryset to avoid backend-specific limitations
    # around DISTINCT in combination with FOR UPDATE.
    stale_slot_ids = list(
        Booking.objects.filter(id__in=stale_booking_ids)
        .values_list('slot_id', flat=True)
        .distinct()
    )
    now = timezone.now()

    stale_bookings.update(
        booking_status='cancelled',
        payment_status='failed',
        updated_at=now,
    )

    Payment.objects.filter(
        booking_id__in=stale_booking_ids,
        payment_status='pending',
    ).update(
        payment_status='failed',
        updated_at=now,
    )

    TimeSlot.objects.filter(
        id__in=stale_slot_ids,
        availability_status='booked',
    ).update(
        availability_status='available',
        updated_at=now,
    )

    return len(stale_booking_ids)