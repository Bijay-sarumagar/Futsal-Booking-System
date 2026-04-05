from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'futsal', 'rating', 'review_date']
    list_filter = ['rating', 'review_date']
    search_fields = ['user__username', 'futsal__futsal_name', 'comment']
    readonly_fields = ['review_date', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Review Information', {
            'fields': ('user', 'futsal', 'booking', 'rating', 'comment')
        }),
        ('Timestamps', {
            'fields': ('review_date', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
