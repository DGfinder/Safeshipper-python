from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings

def health_check(request):
    return JsonResponse({'status': 'ok', 's3_configured': bool(
        hasattr(settings, 'AWS_ACCESS_KEY_ID') and settings.AWS_ACCESS_KEY_ID
    )})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
]