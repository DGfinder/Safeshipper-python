# locations/urls.py
from django.urls import path
from . import views  # Import views from the current app
from .views import country_list_view

app_name = 'locations' # Namespace for these web URLs

urlpatterns = [
    path('countries/', views.country_list_page, name='country_list'),
    path('web/countries/', country_list_view, name='country_list'),
    # Add other location-related URLs here
]