from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import Review
from .serializers import ReviewSerializer, CreateReviewSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    """Review Management ViewSet"""
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['futsal', 'user']
    ordering_fields = ['review_date', 'rating']
    ordering = ['-review_date']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CreateReviewSerializer
        return ReviewSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        review = self.get_object()
        if review.user != self.request.user:
            raise PermissionDenied('You can only update your own reviews')
        serializer.save()
    
    def perform_destroy(self, instance):
        if instance.user != self.request.user and not self.request.user.is_admin():
            raise PermissionDenied('You can only delete your own reviews')
        instance.delete()
