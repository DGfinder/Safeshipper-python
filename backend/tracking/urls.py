from django.urls import path
from .api_views import (
    update_location, public_tracking
)

urlpatterns = [
    # Driver location tracking
    path('update-location/', update_location, name='update_location'),
    
    # Public tracking endpoints - matches frontend API calls
    path('public/<str:tracking_number>/', public_tracking, name='public_tracking'),
]