from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from .models import Futsal, TimeSlot
from .serializers import (
    FutsalSerializer, 
    FutsalDetailSerializer, 
    CreateFutsalSerializer,
    TimeSlotSerializer
)


class FutsalViewSet(viewsets.ModelViewSet):
    """Futsal Management ViewSet"""
    queryset = Futsal.objects.all()
    serializer_class = FutsalSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['location', 'approval_status']
    search_fields = ['futsal_name', 'location', 'description']
    ordering_fields = ['created_at', 'futsal_name']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Futsal.objects.all()

        if not self.request.user.is_authenticated:
            return queryset.filter(approval_status='approved')

        if self.request.user.is_admin():
            return queryset

        if self.request.user.is_owner() and self.action in ['list', 'retrieve', 'update', 'partial_update', 'destroy']:
            return queryset.filter(owner=self.request.user)

        return queryset.filter(approval_status='approved')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return FutsalDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return CreateFutsalSerializer
        return FutsalSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'my_futsals']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        # Set owner to current user
        serializer.save(owner=self.request.user)
    
    def perform_update(self, serializer):
        # Ensure only owner can update
        futsal = self.get_object()
        if futsal.owner != self.request.user:
            raise PermissionError("You can only update your own futsals")
        serializer.save()
    
    def perform_destroy(self, instance):
        # Ensure only owner can delete
        if instance.owner != self.request.user:
            raise PermissionError("You can only delete your own futsals")
        instance.delete()
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_futsals(self, request):
        """Get futsals owned by current user"""
        futsals = Futsal.objects.filter(owner=request.user)
        serializer = FutsalSerializer(futsals, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        """Approve futsal (admin only)"""
        futsal = self.get_object()
        if not request.user.is_admin:
            return Response(
                {'error': 'Only admins can approve futsals'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        futsal.approval_status = 'approved'
        futsal.save()
        return Response({'status': 'Futsal approved'})
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        """Reject futsal (admin only)"""
        futsal = self.get_object()
        if not request.user.is_admin:
            return Response(
                {'error': 'Only admins can reject futsals'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        futsal.approval_status = 'rejected'
        futsal.save()
        return Response({'status': 'Futsal rejected'})


class TimeSlotViewSet(viewsets.ModelViewSet):
    """Time Slot Management ViewSet"""
    queryset = TimeSlot.objects.all()
    serializer_class = TimeSlotSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['futsal', 'slot_date', 'availability_status']
    ordering_fields = ['slot_date', 'start_time']
    ordering = ['slot_date', 'start_time']
    
    def get_queryset(self):
        queryset = TimeSlot.objects.all()
        futsal_id = self.request.query_params.get('futsal', None)
        if futsal_id is not None:
            queryset = queryset.filter(futsal_id=futsal_id)
        return queryset
    
    def perform_create(self, serializer):
        # Verify owner has access to this futsal
        futsal_id = self.request.data.get('futsal')
        futsal = Futsal.objects.get(id=futsal_id)
        if futsal.owner != self.request.user:
            raise PermissionError("You can only create slots for your futsals")
        serializer.save()
    
    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.futsal.owner != self.request.user:
            raise PermissionError("You can only update slots for your futsals")
        serializer.save()
    
    def perform_destroy(self, instance):
        if instance.futsal.owner != self.request.user:
            raise PermissionError("You can only delete slots from your futsals")
        instance.delete()
