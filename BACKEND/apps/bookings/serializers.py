from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import Booking, OpponentPost
from .utils import release_expired_pending_bookings
from apps.futsals.models import TimeSlot


class BookingSerializer(serializers.ModelSerializer):
    """Booking Serializer"""
    user_name = serializers.SerializerMethodField()
    user_profile_picture = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    owner_profile_picture = serializers.SerializerMethodField()
    slot_details = serializers.SerializerMethodField()
    futsal_details = serializers.SerializerMethodField()
    payment_proof_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = [
            'id',
            'user',
            'user_name',
            'user_profile_picture',
            'owner_name',
            'owner_profile_picture',
            'slot',
            'slot_details',
            'futsal_details',
            'payment_proof_image',
            'booking_date',
            'booking_status',
            'payment_status',
            'created_at',
        ]
        read_only_fields = ['id', 'user', 'booking_date', 'created_at']
    
    def get_slot_details(self, obj):
        return {
            'slot_date': obj.slot.slot_date,
            'start_time': obj.slot.start_time,
            'end_time': obj.slot.end_time,
            'price': str(obj.slot.price),
        }

    def get_user_name(self, obj):
        full_name = obj.user.get_full_name().strip()
        return full_name or obj.user.username

    def get_user_profile_picture(self, obj):
        if not obj.user.profile_picture:
            return None
        request = self.context.get('request')
        url = obj.user.profile_picture.url
        return request.build_absolute_uri(url) if request else url

    def get_owner_name(self, obj):
        owner = obj.slot.futsal.owner
        full_name = owner.get_full_name().strip()
        return full_name or owner.username

    def get_owner_profile_picture(self, obj):
        owner = obj.slot.futsal.owner
        if not owner.profile_picture:
            return None
        request = self.context.get('request')
        url = owner.profile_picture.url
        return request.build_absolute_uri(url) if request else url
    
    def get_futsal_details(self, obj):
        return {
            'futsal_id': obj.slot.futsal.id,
            'futsal_name': obj.slot.futsal.futsal_name,
            'location': obj.slot.futsal.location,
        }

    def get_payment_proof_image(self, obj):
        try:
            payment = obj.payment
        except Exception:
            return None

        if not payment.payment_proof_image:
            return None

        request = self.context.get('request')
        url = payment.payment_proof_image.url
        return request.build_absolute_uri(url) if request else url


class CreateBookingSerializer(serializers.ModelSerializer):
    """Create Booking Serializer"""
    class Meta:
        model = Booking
        fields = ['id', 'slot']
        read_only_fields = ['id']

    def _validate_slot_datetime(self, slot):
        today = timezone.localdate()
        if slot.slot_date < today:
            raise serializers.ValidationError('You cannot book a past date')

        if slot.slot_date == today and slot.end_time <= timezone.localtime().time():
            raise serializers.ValidationError('This slot time has already passed')

    def validate_slot(self, slot):
        self._validate_slot_datetime(slot)
        if slot.availability_status != 'available':
            raise serializers.ValidationError('This slot is not available for booking')
        return slot

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        slot = TimeSlot.objects.select_for_update().get(pk=validated_data['slot'].pk)
        release_expired_pending_bookings(slot_ids=[slot.id])
        slot.refresh_from_db(fields=['availability_status', 'updated_at'])
        self._validate_slot_datetime(slot)

        if slot.availability_status != 'available':
            raise serializers.ValidationError({'slot': 'This slot has already been booked'})

        existing_active_booking = Booking.objects.filter(
            slot=slot,
            booking_status__in=['confirmed', 'completed'],
        ).exists()
        if existing_active_booking:
            raise serializers.ValidationError({'slot': 'This slot has already been booked'})

        booking = Booking.objects.create(user=user, slot=slot)
        slot.availability_status = 'booked'
        slot.save(update_fields=['availability_status', 'updated_at'])
        return booking


class UpdateBookingSerializer(serializers.ModelSerializer):
    """Update Booking Status Serializer"""
    class Meta:
        model = Booking
        fields = ['slot', 'booking_status', 'payment_status']

    def validate_slot(self, slot):
        request = self.context.get('request')
        if not request:
            return slot

        user = request.user
        if user.is_owner() and slot.futsal.owner != user:
            raise serializers.ValidationError('You can only assign bookings to your own futsal slots')

        if slot.availability_status != 'available':
            current_instance = self.instance
            if not current_instance or slot.id != current_instance.slot_id:
                raise serializers.ValidationError('Selected slot is not available')

        return slot

    @transaction.atomic
    def update(self, instance, validated_data):
        new_slot = validated_data.get('slot')

        if new_slot and new_slot.id != instance.slot_id:
            current_slot = TimeSlot.objects.select_for_update().get(pk=instance.slot_id)
            next_slot = TimeSlot.objects.select_for_update().get(pk=new_slot.id)

            if next_slot.availability_status != 'available':
                raise serializers.ValidationError({'slot': 'Selected slot is already booked'})

            current_slot.availability_status = 'available'
            current_slot.save(update_fields=['availability_status', 'updated_at'])

            next_slot.availability_status = 'booked'
            next_slot.save(update_fields=['availability_status', 'updated_at'])

            instance.slot = next_slot

        if 'booking_status' in validated_data:
            instance.booking_status = validated_data['booking_status']

        if 'payment_status' in validated_data:
            instance.payment_status = validated_data['payment_status']

        instance.save(update_fields=['slot', 'booking_status', 'payment_status', 'updated_at'])
        return instance


class OpponentPostSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_profile_picture = serializers.SerializerMethodField()
    matched_with_name = serializers.SerializerMethodField()
    matched_with_profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = OpponentPost
        fields = [
            'id',
            'user',
            'user_name',
            'user_profile_picture',
            'matched_with',
            'matched_with_name',
            'matched_with_profile_picture',
            'location',
            'preferred_date',
            'preferred_start_time',
            'preferred_end_time',
            'skill_level',
            'notes',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'matched_with', 'status', 'created_at', 'updated_at']

    def validate(self, attrs):
        preferred_date = attrs.get('preferred_date')
        start_time = attrs.get('preferred_start_time')
        end_time = attrs.get('preferred_end_time')

        if preferred_date and preferred_date < timezone.localdate():
            raise serializers.ValidationError('Preferred date cannot be in the past')

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError('End time must be after start time')

        return attrs

    def get_user_name(self, obj):
        full_name = obj.user.get_full_name().strip()
        return full_name or obj.user.username

    def get_matched_with_name(self, obj):
        if not obj.matched_with:
            return None
        full_name = obj.matched_with.get_full_name().strip()
        return full_name or obj.matched_with.username

    def get_user_profile_picture(self, obj):
        if not obj.user.profile_picture:
            return None
        request = self.context.get('request')
        url = obj.user.profile_picture.url
        return request.build_absolute_uri(url) if request else url

    def get_matched_with_profile_picture(self, obj):
        if not obj.matched_with or not obj.matched_with.profile_picture:
            return None
        request = self.context.get('request')
        url = obj.matched_with.profile_picture.url
        return request.build_absolute_uri(url) if request else url
