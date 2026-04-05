from django.contrib import admin
from .models import Futsal, TimeSlot


@admin.register(Futsal)
class FutsalAdmin(admin.ModelAdmin):
    list_display = ['futsal_name', 'owner', 'location', 'approval_status', 'created_at']
    list_filter = ['approval_status', 'created_at']
    search_fields = ['futsal_name', 'location', 'owner__username']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Futsal Information', {
            'fields': ('futsal_name', 'location', 'latitude', 'longitude', 'description', 'owner')
        }),
        ('Status', {
            'fields': ('approval_status',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = ['get_futsal_name', 'slot_date', 'start_time', 'end_time', 'price', 'availability_status']
    list_filter = ['futsal', 'slot_date', 'availability_status']
    search_fields = ['futsal__futsal_name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Slot Information', {
            'fields': ('futsal', 'slot_date', 'start_time', 'end_time', 'price')
        }),
        ('Status', {
            'fields': ('availability_status',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_futsal_name(self, obj):
        return obj.futsal.futsal_name
    get_futsal_name.short_description = 'Futsal'
