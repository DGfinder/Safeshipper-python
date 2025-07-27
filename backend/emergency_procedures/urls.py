# emergency_procedures/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmergencyProcedureViewSet,
    EmergencyIncidentViewSet,
    EmergencyContactViewSet
)

# Create a router for the API endpoints
router = DefaultRouter()
router.register(r'procedures', EmergencyProcedureViewSet, basename='emergency-procedure')
router.register(r'incidents', EmergencyIncidentViewSet, basename='emergency-incident')
router.register(r'contacts', EmergencyContactViewSet, basename='emergency-contact')

app_name = 'emergency_procedures'

urlpatterns = [
    path('api/', include(router.urls)),
    
    # Additional direct paths if needed
    path('api/procedures/<uuid:pk>/approve/', 
         EmergencyProcedureViewSet.as_view({'post': 'approve'}), 
         name='procedure-approve'),
    path('api/procedures/<uuid:pk>/mark-for-review/', 
         EmergencyProcedureViewSet.as_view({'post': 'mark_for_review'}), 
         name='procedure-mark-for-review'),
    path('api/procedures/search-by-emergency-type/', 
         EmergencyProcedureViewSet.as_view({'get': 'search_by_emergency_type'}), 
         name='procedure-search-by-type'),
    path('api/procedures/quick-reference/', 
         EmergencyProcedureViewSet.as_view({'get': 'quick_reference'}), 
         name='procedure-quick-reference'),
    path('api/procedures/needing-review/', 
         EmergencyProcedureViewSet.as_view({'get': 'needing_review'}), 
         name='procedure-needing-review'),
    
    # Incident specific endpoints
    path('api/incidents/<uuid:pk>/start-response/', 
         EmergencyIncidentViewSet.as_view({'post': 'start_response'}), 
         name='incident-start-response'),
    path('api/incidents/<uuid:pk>/resolve/', 
         EmergencyIncidentViewSet.as_view({'post': 'resolve_incident'}), 
         name='incident-resolve'),
    path('api/incidents/analytics/', 
         EmergencyIncidentViewSet.as_view({'get': 'analytics'}), 
         name='incident-analytics'),
    path('api/incidents/recent/', 
         EmergencyIncidentViewSet.as_view({'get': 'recent'}), 
         name='incident-recent'),
    
    # Contact specific endpoints
    path('api/contacts/by-location/', 
         EmergencyContactViewSet.as_view({'get': 'by_location'}), 
         name='contact-by-location'),
    path('api/contacts/emergency-numbers/', 
         EmergencyContactViewSet.as_view({'get': 'emergency_numbers'}), 
         name='contact-emergency-numbers'),
    path('api/contacts/<uuid:pk>/verify/', 
         EmergencyContactViewSet.as_view({'post': 'verify_contact'}), 
         name='contact-verify'),
    path('api/contacts/needing-verification/', 
         EmergencyContactViewSet.as_view({'get': 'needing_verification'}), 
         name='contact-needing-verification'),
]