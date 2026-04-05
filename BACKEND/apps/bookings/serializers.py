from rest_framework import serializers
from django.db import transaction
from .models import Booking
from apps.futsals.models import TimeSlot


class BookingSerializer(serializers.ModelSerializer):
    """Booking Serializer"""
    user_name = serializers.SerializerMethodField()
    slot_details = serializers.SerializerMethodField()
    futsal_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = ['id', 'user', 'user_name', 'slot', 'slot_details', 'futsal_details', 'booking_date', 'booking_status', 'payment_status', 'created_at']
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
    
    def get_futsal_details(self, obj):
        return {
            'futsal_id': obj.slot.futsal.id,
            'futsal_name': obj.slot.futsal.futsal_name,
            'location': obj.slot.futsal.location,
        }


class CreateBookingSerializer(serializers.ModelSerializer):
    """Create Booking Serializer"""
    class Meta:
        model = Booking
        fields = ['slot']

    def validate_slot(self, slot):
        if slot.availability_status != 'available':
            raise serializers.ValidationError('This slot is not available for booking')
        return slot

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        slot = TimeSlot.objects.select_for_update().get(pk=validated_data['slot'].pk)

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
