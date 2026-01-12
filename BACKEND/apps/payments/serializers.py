from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    """Payment Serializer"""
    booking_details = serializers.SerializerMethodField()
    payment_proof_image = serializers.ImageField(read_only=True)
    
    class Meta:
        model = Payment
        fields = ['id', 'booking', 'booking_details', 'amount', 'payment_method', 'payment_status', 'transaction_id', 'payment_proof_image', 'payment_date', 'created_at']
        read_only_fields = ['id', 'payment_date', 'created_at']
    
    def get_booking_details(self, obj):
        return {
            'booking_id': obj.booking.id,
            'user': obj.booking.user.username,
            'futsal': obj.booking.slot.futsal.futsal_name,
        }
