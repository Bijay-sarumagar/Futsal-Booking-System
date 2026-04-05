from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_booking_id', 'amount', 'payment_method', 'payment_status', 'payment_date']
    list_filter = ['payment_status', 'payment_method', 'payment_date']
    search_fields = ['booking__user__username', 'transaction_id']
    readonly_fields = ['payment_date', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('booking', 'amount', 'payment_method', 'transaction_id')
        }),
        ('Status', {
            'fields': ('payment_status',)
        }),
        ('Timestamps', {
            'fields': ('payment_date', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_booking_id(self, obj):
        return obj.booking.id
    get_booking_id.short_description = 'Booking ID'
