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
from django.utils import timezone
import json
import logging
from urllib import request as urllib_request
from urllib.error import HTTPError, URLError
from apps.futsals.models import Futsal, TimeSlot
from apps.bookings.models import Booking, OpponentPost

from .serializers import (
    UserSerializer, 
    RegisterSerializer, 
    CustomTokenObtainPairSerializer,
    ChangePasswordSerializer,
    UserDetailSerializer
)

User = get_user_model()
logger = logging.getLogger(__name__)


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

    @action(detail=False, methods=['get'])
    def admin_users(self, request):
        """Get all users for admin user management"""
        if not request.user.is_admin():
            return Response({'detail': 'Only admins can access user list'}, status=status.HTTP_403_FORBIDDEN)

        users = User.objects.exclude(role='admin').order_by('-created_at')
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def set_user_status(self, request, pk=None):
        """Update player/owner account status (admin only)"""
        if not request.user.is_admin():
            return Response({'detail': 'Only admins can update user status'}, status=status.HTTP_403_FORBIDDEN)

        target_user = get_object_or_404(User.objects.exclude(role='admin'), pk=pk)
        new_status = request.data.get('status')

        valid_statuses = {'active', 'inactive', 'suspended'}
        if new_status not in valid_statuses:
            return Response({'detail': 'Invalid user status'}, status=status.HTTP_400_BAD_REQUEST)

        target_user.status = new_status
        target_user.save(update_fields=['status', 'updated_at'])

        return Response({
            'status': f'User status set to {new_status}',
            'user': self.get_serializer(target_user).data,
        }, status=status.HTTP_200_OK)

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


class AIChatView(APIView):
    permission_classes = [IsAuthenticated]

    def _extract_reply_text(self, data: dict) -> str:
        content = (
            data.get('choices', [{}])[0]
            .get('message', {})
            .get('content', '')
        )

        if isinstance(content, str):
            return content.strip()

        if isinstance(content, list):
            chunks = []
            for item in content:
                if isinstance(item, dict):
                    text = item.get('text')
                    if isinstance(text, str) and text.strip():
                        chunks.append(text.strip())
            return "\n".join(chunks).strip()

        if isinstance(content, dict):
            text = content.get('text')
            if isinstance(text, str):
                return text.strip()

        return ''

    def _local_fallback_reply(self, message: str) -> str:
        q = message.lower()
        if 'book' in q or 'slot' in q or 'available' in q:
            return (
                "To check live slot availability quickly, open /search and filter by your preferred time and location. "
                "Then open a futsal and book an available slot."
            )
        if 'opponent' in q:
            return "Use /find-opponents to post your preferred time/location and join open requests."
        if 'payment' in q or 'refund' in q:
            return "Payment and refund status is available in /my-bookings for each booking."
        return "I can help with booking, slots, payments, profile, and opponents. Try: 'Which futsal is available today at 6 PM near Tinkune?'"

    def _call_llm(self, messages: list[dict], model: str):
        payload = {
            'model': model,
            'messages': messages,
            'temperature': settings.LLM_TEMPERATURE,
            'max_tokens': settings.LLM_MAX_TOKENS,
        }

        headers = {'Content-Type': 'application/json'}
        if settings.LLM_API_KEY:
            headers['Authorization'] = f'Bearer {settings.LLM_API_KEY}'
        if 'openrouter.ai' in settings.LLM_API_URL:
            headers['HTTP-Referer'] = settings.FRONTEND_BASE_URL
            headers['X-Title'] = 'FutsalHub'

        req = urllib_request.Request(settings.LLM_API_URL, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')

        with urllib_request.urlopen(req, timeout=settings.LLM_REQUEST_TIMEOUT) as resp:
            raw = resp.read().decode('utf-8')
            data = json.loads(raw)
        return self._extract_reply_text(data)

    def _build_app_context(self, user) -> str:
        today = timezone.localdate()

        approved_futsals_qs = Futsal.objects.filter(approval_status='approved').only('futsal_name', 'location')
        approved_futsal_count = approved_futsals_qs.count()
        futsal_examples = list(approved_futsals_qs[:5])

        upcoming_bookings_qs = (
            Booking.objects
            .filter(user=user, booking_status='confirmed', slot__slot_date__gte=today)
            .select_related('slot__futsal')
            .order_by('slot__slot_date', 'slot__start_time')
        )
        upcoming_count = upcoming_bookings_qs.count()
        upcoming_examples = list(upcoming_bookings_qs[:3])

        open_opponent_posts = OpponentPost.objects.filter(status='open', preferred_date__gte=today).count()
        available_slots_today = TimeSlot.objects.filter(slot_date=today, availability_status='available').count()

        futsal_line = ', '.join([f"{f.futsal_name} ({f.location})" for f in futsal_examples]) or 'None'
        bookings_line = '; '.join([
            f"{b.slot.futsal.futsal_name} on {b.slot.slot_date} {b.slot.start_time}-{b.slot.end_time}"
            for b in upcoming_examples
        ]) or 'None'

        return (
            f"App context (truth source):\\n"
            f"- Today: {today}\\n"
            f"- Approved futsals: {approved_futsal_count}\\n"
            f"- Example approved futsals: {futsal_line}\\n"
            f"- Available slots today: {available_slots_today}\\n"
            f"- Open opponent requests: {open_opponent_posts}\\n"
            f"- Current user role: {user.role}\\n"
            f"- Current user upcoming confirmed bookings: {upcoming_count}\\n"
            f"- Upcoming booking examples: {bookings_line}\\n"
            f"Routing hints: /search, /my-bookings, /find-opponents, /profile."
        )

    def post(self, request):
        message = (request.data.get('message') or '').strip()
        history = request.data.get('history') or []

        if not message:
            return Response({'detail': 'message is required'}, status=status.HTTP_400_BAD_REQUEST)

        if len(message) > 1500:
            return Response({'detail': 'message too long'}, status=status.HTTP_400_BAD_REQUEST)

        if not settings.LLM_API_KEY and ('openai.com' in settings.LLM_API_URL or 'openrouter.ai' in settings.LLM_API_URL):
            return Response({'detail': 'LLM_API_KEY is not configured on server'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        messages = [
            {
                'role': 'system',
                'content': (
                    'You are FutsalHub AI assistant. Be accurate, concise, and action-oriented. '
                    'Use only provided app context for factual app data and do not invent unavailable facts. '
                    'When useful, suggest the exact page path users should open. '
                    'If the user asks outside FutsalHub, answer briefly, then steer back to app help.'
                ),
            },
            {
                'role': 'system',
                'content': self._build_app_context(request.user),
            },
        ]

        if isinstance(history, list):
            for item in history[-8:]:
                if not isinstance(item, dict):
                    continue
                role = item.get('role')
                content = (item.get('content') or '').strip()
                if role in {'user', 'assistant'} and content:
                    messages.append({'role': role, 'content': content[:1000]})

        messages.append({'role': 'user', 'content': message})

        models_to_try = [settings.LLM_MODEL, *settings.LLM_FALLBACK_MODELS]

        try:
            for model in models_to_try:
                reply = self._call_llm(messages, model)
                if reply:
                    return Response({
                        'reply': reply,
                        'model': model,
                        'provider': settings.LLM_API_URL,
                    }, status=status.HTTP_200_OK)

            logger.warning('AI chat empty response from all configured models')
            return Response({
                'reply': self._local_fallback_reply(message),
                'model': 'local-fallback',
                'provider': 'futsalhub',
            }, status=status.HTTP_200_OK)

        except HTTPError as err:
            detail = 'LLM request failed'
            try:
                error_body = err.read().decode('utf-8')
                detail = json.loads(error_body).get('error', {}).get('message') or detail
            except Exception:
                pass
            logger.warning('AI chat HTTPError: %s', detail)
            return Response({
                'reply': self._local_fallback_reply(message),
                'model': 'local-fallback',
                'provider': 'futsalhub',
            }, status=status.HTTP_200_OK)
        except URLError:
            logger.warning('AI chat URLError while contacting provider')
            return Response({
                'reply': self._local_fallback_reply(message),
                'model': 'local-fallback',
                'provider': 'futsalhub',
            }, status=status.HTTP_200_OK)
        except Exception:
            logger.exception('AI chat unexpected error')
            return Response({
                'reply': self._local_fallback_reply(message),
                'model': 'local-fallback',
                'provider': 'futsalhub',
            }, status=status.HTTP_200_OK)
