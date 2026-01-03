from django.db import models
from django.contrib.auth import get_user_model
from apps.futsals.models import TimeSlot

User = get_user_model()


class Booking(models.Model):
    """Booking Model"""
    BOOKING_STATUS_CHOICES = [
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
        ('no_show', 'No Show'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    slot = models.ForeignKey(TimeSlot, on_delete=models.CASCADE, related_name='bookings')
    booking_date = models.DateTimeField(auto_now_add=True)
    booking_status = models.CharField(
        max_length=20, 
        choices=BOOKING_STATUS_CHOICES, 
        default='confirmed'
    )
    payment_status = models.CharField(
        max_length=20, 
        choices=PAYMENT_STATUS_CHOICES, 
        default='pending'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-booking_date']
        verbose_name = 'Booking'
        verbose_name_plural = 'Bookings'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['booking_status']),
        ]
    
    def __str__(self):
        return f"Booking {self.id} - {self.user.username} - {self.slot}"


class OpponentPost(models.Model):
    """Player-created post for finding a match opponent."""

    SKILL_CHOICES = [
        ('casual', 'Casual'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('matched', 'Matched'),
        ('closed', 'Closed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='opponent_posts')
    matched_with = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='matched_opponent_posts',
    )
    location = models.CharField(max_length=255)
    preferred_date = models.DateField()
    preferred_start_time = models.TimeField()
    preferred_end_time = models.TimeField()
    skill_level = models.CharField(max_length=20, choices=SKILL_CHOICES, default='casual')
    notes = models.CharField(max_length=400, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Opponent Post'
        verbose_name_plural = 'Opponent Posts'
        indexes = [
            models.Index(fields=['status', 'preferred_date']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"Opponent Post {self.id} - {self.user.username} ({self.status})"
