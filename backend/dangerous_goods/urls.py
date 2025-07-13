# dangerous_goods/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    DangerousGoodViewSet, 
    DGCompatibilityCheckView, 
    # PHAnalysisView,  # Temporarily disabled
    ADGPlacardCalculationView,
    ADGPlacardRuleViewSet,
    PlacardCalculationLogView,
    DigitalPlacardGenerationView,
    DigitalPlacardViewSet,
    PlacardVerificationView,
    PlacardTemplateViewSet,
    EmergencyInformationPanelView,
    EmergencyContactViewSet,
    EmergencyProcedureViewSet,
    TransportDocumentGenerationView,
    TransportDocumentViewSet,
    TransportDocumentValidationView,
    LimitedQuantityValidationView,
    LimitedQuantityMarkingView,
    LimitedQuantityLimitViewSet,
    LQComplianceReportView
)

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'dangerous-goods', DangerousGoodViewSet, basename='dangerousgood')
router.register(r'placard-rules', ADGPlacardRuleViewSet, basename='adg-placard-rule')
router.register(r'digital-placards', DigitalPlacardViewSet, basename='digital-placard')
router.register(r'placard-templates', PlacardTemplateViewSet, basename='placard-template')
router.register(r'emergency-contacts', EmergencyContactViewSet, basename='emergency-contact')
router.register(r'emergency-procedures', EmergencyProcedureViewSet, basename='emergency-procedure')
router.register(r'transport-documents', TransportDocumentViewSet, basename='transport-document')
router.register(r'lq-limits', LimitedQuantityLimitViewSet, basename='lq-limit')

urlpatterns = [
    path('', include(router.urls)),
    path('check-compatibility/', DGCompatibilityCheckView.as_view(), name='dg-compatibility-check'),
    # path('ph-analysis/', PHAnalysisView.as_view(), name='ph-analysis'),  # Temporarily disabled
    path('calculate-placards/', ADGPlacardCalculationView.as_view(), name='adg-placard-calculation'),
    path('placard-calculation-logs/', PlacardCalculationLogView.as_view(), name='placard-calculation-logs'),
    path('generate-placards/', DigitalPlacardGenerationView.as_view(), name='generate-digital-placards'),
    path('verify-placard/', PlacardVerificationView.as_view(), name='verify-placard'),
    path('emergency-information-panel/', EmergencyInformationPanelView.as_view(), name='emergency-information-panel'),
    path('generate-transport-document/', TransportDocumentGenerationView.as_view(), name='generate-transport-document'),
    path('validate-transport-document/', TransportDocumentValidationView.as_view(), name='validate-transport-document'),
    path('validate-limited-quantity/', LimitedQuantityValidationView.as_view(), name='validate-limited-quantity'),
    path('lq-marking-requirements/', LimitedQuantityMarkingView.as_view(), name='lq-marking-requirements'),
    path('lq-compliance-report/', LQComplianceReportView.as_view(), name='lq-compliance-report'),
]
