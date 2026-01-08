from rest_framework import serializers
import json
from .models import Futsal, TimeSlot


class TimeSlotSerializer(serializers.ModelSerializer):
    """Time Slot Serializer"""
    class Meta:
        model = TimeSlot
        fields = ['id', 'futsal', 'slot_date', 'start_time', 'end_time', 'price', 'availability_status', 'created_at']
        read_only_fields = ['id', 'created_at']


class FutsalSerializer(serializers.ModelSerializer):
    """Futsal Listing Serializer"""
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    
    class Meta:
        model = Futsal
        fields = [
            'id',
            'owner',
            'owner_name',
            'futsal_name',
            'location',
            'image',
            'amenities',
            'latitude',
            'longitude',
            'description',
            'esewa_qr_image',
            'fonepay_qr_image',
            'preferred_qr_provider',
            'approval_status',
            'created_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at']


class FutsalDetailSerializer(serializers.ModelSerializer):
    """Detailed Futsal Serializer with time slots"""
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    time_slots = TimeSlotSerializer(many=True, read_only=True)
    
    class Meta:
        model = Futsal
        fields = [
            'id',
            'owner',
            'owner_name',
            'futsal_name',
            'location',
            'image',
            'amenities',
            'latitude',
            'longitude',
            'description',
            'esewa_qr_image',
            'fonepay_qr_image',
            'preferred_qr_provider',
            'approval_status',
            'time_slots',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']


class CreateFutsalSerializer(serializers.ModelSerializer):
    """Create/Update Futsal Serializer"""
    class Meta:
        model = Futsal
        fields = [
            'id',
            'futsal_name',
            'location',
            'image',
            'amenities',
            'latitude',
            'longitude',
            'description',
            'esewa_qr_image',
            'fonepay_qr_image',
            'preferred_qr_provider',
        ]
        read_only_fields = ['id']

    def validate_amenities(self, value):
        if value in (None, ""):
            return []

        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except (TypeError, ValueError):
                raise serializers.ValidationError("Amenities must be a valid list.")
            value = parsed

        if not isinstance(value, list):
            raise serializers.ValidationError("Amenities must be a list.")

        cleaned = []
        for item in value:
            if not isinstance(item, str):
                continue
            text = item.strip()
            if text and text.lower() not in [x.lower() for x in cleaned]:
                cleaned.append(text)
        return cleaned
