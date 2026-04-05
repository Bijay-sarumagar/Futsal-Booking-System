from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Notification Serializer"""
    class Meta:
        model = Notification
        fields = ['id', 'user', 'message', 'notification_type', 'related_booking', 'is_read', 'created_at', 'read_at']
        read_only_fields = ['id', 'user', 'created_at']
