from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    """Review Serializer"""
    user_name = serializers.SerializerMethodField()
    futsal_name = serializers.CharField(source='futsal.futsal_name', read_only=True)

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    
    class Meta:
        model = Review
        fields = ['id', 'user', 'user_name', 'futsal', 'futsal_name', 'booking', 'rating', 'comment', 'review_date', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'review_date', 'created_at', 'updated_at']


class CreateReviewSerializer(serializers.ModelSerializer):
    """Create Review Serializer"""
    class Meta:
        model = Review
        fields = ['futsal', 'booking', 'rating', 'comment']
