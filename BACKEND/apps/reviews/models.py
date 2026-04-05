from django.db import models
from django.contrib.auth import get_user_model
from apps.futsals.models import Futsal
from apps.bookings.models import Booking
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()


class Review(models.Model):
    """Review/Rating Model"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    futsal = models.ForeignKey(Futsal, on_delete=models.CASCADE, related_name='reviews')
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True)
    
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True, null=True)
    
    review_date = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-review_date']
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'
        unique_together = ['user', 'futsal']
    
    def __str__(self):
        return f"Review by {self.user.username} for {self.futsal.futsal_name} - {self.rating}/5"
