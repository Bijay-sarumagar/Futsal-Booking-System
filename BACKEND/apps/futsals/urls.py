from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FutsalViewSet

app_name = 'futsals'

router = DefaultRouter()
router.register(r'', FutsalViewSet, basename='futsal')

urlpatterns = [
    path('', include(router.urls)),
]
