from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    AuthViewSet,
    CustomTokenObtainPairView,
    SessionLoginView,
    SessionRefreshView,
    SessionLogoutView,
)

app_name = 'auth'

router = DefaultRouter()
router.register(r'', AuthViewSet, basename='auth')

urlpatterns = [
    path('session/login/', SessionLoginView.as_view(), name='session_login'),
    path('session/refresh/', SessionRefreshView.as_view(), name='session_refresh'),
    path('session/logout/', SessionLogoutView.as_view(), name='session_logout'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]
