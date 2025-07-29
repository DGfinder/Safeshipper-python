from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssessmentTemplateViewSet, 
    AssessmentSectionViewSet,
    AssessmentQuestionViewSet,
    HazardAssessmentViewSet,
    AssessmentAnswerViewSet,
    AssessmentAssignmentViewSet,
    MobileHazardAssessmentViewSet
)

# Create router and register ViewSets
router = DefaultRouter()
router.register(r'templates', AssessmentTemplateViewSet, basename='assessmenttemplate')
router.register(r'sections', AssessmentSectionViewSet, basename='assessmentsection')
router.register(r'questions', AssessmentQuestionViewSet, basename='assessmentquestion')
router.register(r'assessments', HazardAssessmentViewSet, basename='hazardassessment')
router.register(r'answers', AssessmentAnswerViewSet, basename='assessmentanswer')
router.register(r'assignments', AssessmentAssignmentViewSet, basename='assessmentassignment')

# Mobile-specific router
mobile_router = DefaultRouter()
mobile_router.register(r'assessments', MobileHazardAssessmentViewSet, basename='mobile-hazardassessment')

app_name = 'hazard_assessments'

urlpatterns = [
    # Standard API endpoints
    path('api/', include(router.urls)),
    
    # Mobile-optimized endpoints
    path('api/mobile/', include(mobile_router.urls)),
    
    # Additional custom endpoints can be added here
]