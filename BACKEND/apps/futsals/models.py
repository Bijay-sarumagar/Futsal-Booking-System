from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Futsal(models.Model):
    """Futsal Court Model"""
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='futsals')
    futsal_name = models.CharField(max_length=255)
    location = models.CharField(max_length=500)
    image = models.ImageField(upload_to='futsal_images/', blank=True, null=True)
    amenities = models.JSONField(default=list, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    approval_status = models.CharField(
        max_length=20, 
        choices=APPROVAL_STATUS_CHOICES, 
        default='pending'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Futsal'
        verbose_name_plural = 'Futsals'
        indexes = [
            models.Index(fields=['owner']),
            models.Index(fields=['approval_status']),
        ]
    
    def __str__(self):
        return f"{self.futsal_name} - {self.location}"


class TimeSlot(models.Model):
    """Time Slot for Futsal Booking"""
    AVAILABILITY_CHOICES = [
        ('available', 'Available'),
        ('booked', 'Booked'),
        ('maintenance', 'Maintenance'),
    ]
    
    futsal = models.ForeignKey(Futsal, on_delete=models.CASCADE, related_name='time_slots')
    slot_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    availability_status = models.CharField(
        max_length=20, 
        choices=AVAILABILITY_CHOICES, 
        default='available'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['slot_date', 'start_time']
        verbose_name = 'Time Slot'
        verbose_name_plural = 'Time Slots'
        unique_together = ['futsal', 'slot_date', 'start_time', 'end_time']
        indexes = [
            models.Index(fields=['futsal', 'slot_date']),
            models.Index(fields=['availability_status']),
        ]
    
    def __str__(self):
        return f"{self.futsal.futsal_name} - {self.slot_date} {self.start_time}-{self.end_time}"
