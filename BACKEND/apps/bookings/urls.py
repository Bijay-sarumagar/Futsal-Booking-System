from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookingViewSet, OpponentPostListCreateView, OpponentPostJoinView, OpponentPostCloseView, OpponentPostLeaveView

app_name = 'bookings'

router = DefaultRouter()
router.register(r'', BookingViewSet, basename='booking')

urlpatterns = [
    path('opponent-posts/', OpponentPostListCreateView.as_view(), name='opponent-posts-list-create'),
    path('opponent-posts/<int:pk>/join/', OpponentPostJoinView.as_view(), name='opponent-posts-join'),
    path('opponent-posts/<int:pk>/leave/', OpponentPostLeaveView.as_view(), name='opponent-posts-leave'),
    path('opponent-posts/<int:pk>/close/', OpponentPostCloseView.as_view(), name='opponent-posts-close'),
    path('', include(router.urls)),
]
