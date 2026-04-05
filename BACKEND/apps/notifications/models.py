from django.db import models
from django.contrib.auth import get_user_model
from apps.bookings.models import Booking

User = get_user_model()


class Notification(models.Model):
    """Notification Model"""
    NOTIFICATION_TYPE_CHOICES = [
        ('booking', 'Booking'),
        ('payment', 'Payment'),
        ('alert', 'Alert'),
        ('review', 'Review'),
        ('system', 'System'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.CharField(max_length=500)
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPE_CHOICES)
    related_booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True)
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"Notification for {self.user.username} - {self.notification_type}"
