from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Payment
from .serializers import PaymentSerializer


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """Payment Management ViewSet (Read-only)"""
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Players see their own payments
        if self.request.user.is_player():
            return Payment.objects.filter(booking__user=self.request.user)
        # Owners see payments for their futsals
        elif self.request.user.is_owner():
            return Payment.objects.filter(booking__slot__futsal__owner=self.request.user)
        # Admin sees all
        return Payment.objects.all()
