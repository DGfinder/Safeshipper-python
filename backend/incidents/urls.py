# incidents/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    IncidentViewSet, IncidentTypeViewSet, IncidentDocumentViewSet,
    IncidentUpdateViewSet, CorrectiveActionViewSet
)

# Create router for API endpoints
router = DefaultRouter()
router.register(r'incidents', IncidentViewSet, basename='incident')
router.register(r'incident-types', IncidentTypeViewSet, basename='incidenttype')
router.register(r'incident-documents', IncidentDocumentViewSet, basename='incidentdocument')
router.register(r'incident-updates', IncidentUpdateViewSet, basename='incidentupdate')
router.register(r'corrective-actions', CorrectiveActionViewSet, basename='correctiveaction')

app_name = 'incidents'

urlpatterns = [
    path('api/', include(router.urls)),
]

# API Endpoints Summary:
# 
# Incidents:
# GET    /api/incidents/                          - List incidents with filtering
# POST   /api/incidents/                          - Create new incident
# GET    /api/incidents/{id}/                     - Get incident details
# PUT    /api/incidents/{id}/                     - Update incident
# PATCH  /api/incidents/{id}/                     - Partial update incident
# DELETE /api/incidents/{id}/                     - Delete incident
# POST   /api/incidents/{id}/assign/              - Assign incident to user
# POST   /api/incidents/{id}/close/               - Close incident
# POST   /api/incidents/{id}/reopen/              - Reopen closed incident
# GET    /api/incidents/statistics/               - Get incident statistics
# GET    /api/incidents/my_incidents/             - Get user's incidents
# GET    /api/incidents/overdue/                  - Get overdue incidents
#
# Incident Types:
# GET    /api/incident-types/                     - List incident types
# POST   /api/incident-types/                     - Create incident type (admin only)
# GET    /api/incident-types/{id}/                - Get incident type details
# PUT    /api/incident-types/{id}/                - Update incident type (admin only)
# DELETE /api/incident-types/{id}/                - Delete incident type (admin only)
#
# Incident Documents:
# GET    /api/incident-documents/                 - List incident documents
# POST   /api/incident-documents/                 - Upload incident document
# GET    /api/incident-documents/{id}/            - Get document details
# DELETE /api/incident-documents/{id}/            - Delete document
#
# Incident Updates:
# GET    /api/incident-updates/                   - List incident updates
# POST   /api/incident-updates/                   - Create incident update
# GET    /api/incident-updates/{id}/              - Get update details
#
# Corrective Actions:
# GET    /api/corrective-actions/                 - List corrective actions
# POST   /api/corrective-actions/                 - Create corrective action
# GET    /api/corrective-actions/{id}/            - Get corrective action details
# PUT    /api/corrective-actions/{id}/            - Update corrective action
# POST   /api/corrective-actions/{id}/complete/   - Mark corrective action as completed
# GET    /api/corrective-actions/overdue/         - Get overdue corrective actions