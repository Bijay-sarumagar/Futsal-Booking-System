from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'get_futsal_name', 'get_date_time', 'booking_status', 'payment_status']
    list_filter = ['booking_status', 'payment_status', 'booking_date']
    search_fields = ['user__username', 'slot__futsal__futsal_name']
    readonly_fields = ['booking_date', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Booking Information', {
            'fields': ('user', 'slot')
        }),
        ('Status', {
            'fields': ('booking_status', 'payment_status')
        }),
        ('Timestamps', {
            'fields': ('booking_date', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_futsal_name(self, obj):
        return obj.slot.futsal.futsal_name
    get_futsal_name.short_description = 'Futsal'
    
    def get_date_time(self, obj):
        return f"{obj.slot.slot_date} {obj.slot.start_time}"
    get_date_time.short_description = 'Date & Time'
