from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from django.contrib.auth import get_user_model
from django.conf import settings
from django.shortcuts import get_object_or_404
from apps.futsals.models import Futsal

from .serializers import (
    UserSerializer, 
    RegisterSerializer, 
    CustomTokenObtainPairSerializer,
    ChangePasswordSerializer,
    UserDetailSerializer
)

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT Token obtaining endpoint"""
    serializer_class = CustomTokenObtainPairSerializer


def _set_auth_cookies(response, access_token: str, refresh_token: str | None = None):
    common = {
        'httponly': True,
        'secure': settings.AUTH_COOKIE_SECURE,
        'samesite': settings.AUTH_COOKIE_SAMESITE,
        'domain': settings.AUTH_COOKIE_DOMAIN,
    }

    response.set_cookie('access_token', access_token, max_age=60 * 60, path='/', **common)

    if refresh_token is not None:
        response.set_cookie('refresh_token', refresh_token, max_age=7 * 24 * 60 * 60, path='/', **common)

    return response


def _clear_auth_cookies(response):
    response.delete_cookie('access_token', path='/', domain=settings.AUTH_COOKIE_DOMAIN)
    response.delete_cookie('refresh_token', path='/', domain=settings.AUTH_COOKIE_DOMAIN)
    return response


class SessionLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomTokenObtainPairSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        access = serializer.validated_data['access']
        refresh = serializer.validated_data['refresh']
        user = serializer.user

        response = Response({
            'user': UserSerializer(user).data,
            'message': 'Login successful',
        }, status=status.HTTP_200_OK)

        return _set_auth_cookies(response, access, refresh)


class SessionRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response({'detail': 'Refresh token missing'}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
        serializer.is_valid(raise_exception=True)

        access = serializer.validated_data['access']
        response = Response({'message': 'Token refreshed'}, status=status.HTTP_200_OK)
        return _set_auth_cookies(response, access)


class SessionLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
        return _clear_auth_cookies(response)


class AuthViewSet(viewsets.ModelViewSet):
    """Authentication endpoints"""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def register(self, request):
        """User Registration"""
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'user': UserSerializer(user).data,
                'message': 'User registered successfully'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        """User Login - Returns JWT tokens"""
        from rest_framework_simplejwt.views import TokenObtainPairView
        view = CustomTokenObtainPairView.as_view()
        return view(request)


class UserViewSet(viewsets.ModelViewSet):
    """User profile management endpoints"""
    serializer_class = UserDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return User.objects.filter(id=self.request.user.id)

    def get_object(self):
        if self.action in ['set_owner_status', 'verification_summary', 'delete_owner'] and self.request.user.is_admin():
            return get_object_or_404(User.objects.filter(role='owner'), pk=self.kwargs['pk'])
        return super().get_object()
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def owners(self, request):
        """Get all futsal owners (admin only)"""
        if not request.user.is_admin():
            return Response({'detail': 'Only admins can access owner list'}, status=status.HTTP_403_FORBIDDEN)

        owners = User.objects.filter(role='owner').order_by('-created_at')
        serializer = self.get_serializer(owners, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def set_owner_status(self, request, pk=None):
        """Update owner account status (admin only)"""
        if not request.user.is_admin():
            return Response({'detail': 'Only admins can update owner status'}, status=status.HTTP_403_FORBIDDEN)

        owner = self.get_object()
        new_status = request.data.get('status')

        valid_statuses = {'active', 'inactive', 'suspended'}
        if new_status not in valid_statuses:
            return Response({'detail': 'Invalid owner status'}, status=status.HTTP_400_BAD_REQUEST)

        owner.status = new_status
        owner.save(update_fields=['status', 'updated_at'])

        return Response({
            'status': f'Owner status set to {new_status}',
            'owner': self.get_serializer(owner).data,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def verification_summary(self, request, pk=None):
        """Owner verification details for super admin"""
        if not request.user.is_admin():
            return Response({'detail': 'Only admins can view owner verification details'}, status=status.HTTP_403_FORBIDDEN)

        owner = self.get_object()
        futsals = Futsal.objects.filter(owner=owner).order_by('-created_at')

        return Response({
            'owner': self.get_serializer(owner).data,
            'futsals': [
                {
                    'id': futsal.id,
                    'futsal_name': futsal.futsal_name,
                    'location': futsal.location,
                    'approval_status': futsal.approval_status,
                    'created_at': futsal.created_at,
                }
                for futsal in futsals
            ],
            'totals': {
                'futsal_count': futsals.count(),
                'approved_count': futsals.filter(approval_status='approved').count(),
                'pending_count': futsals.filter(approval_status='pending').count(),
                'rejected_count': futsals.filter(approval_status='rejected').count(),
            },
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'])
    def delete_owner(self, request, pk=None):
        """Delete owner account (admin only)"""
        if not request.user.is_admin():
            return Response({'detail': 'Only admins can delete owner accounts'}, status=status.HTTP_403_FORBIDDEN)

        owner = self.get_object()
        owner_display = owner.get_full_name().strip() or owner.username
        owner.delete()

        return Response({
            'status': f'Owner "{owner_display}" deleted successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change user password"""
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['put', 'patch'])
    def update_profile(self, request):
        """Update user profile"""
        user = request.user
        serializer = self.get_serializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
