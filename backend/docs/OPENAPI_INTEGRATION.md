# SafeShipper OpenAPI/Swagger Integration

**Complete OpenAPI schema generation and interactive documentation for SafeShipper APIs**

This document outlines the implementation of comprehensive OpenAPI 3.0 schema generation, interactive Swagger documentation, and API testing interfaces for the SafeShipper dangerous goods transportation platform.

---

## 📋 **Overview**

SafeShipper uses Django REST Framework with drf-spectacular for automatic OpenAPI schema generation, providing:

- **Complete API Documentation**: All endpoints with request/response schemas
- **Interactive Testing**: Built-in API testing interface
- **Schema Validation**: Automatic validation of API contracts
- **Code Generation**: Client SDK generation capabilities
- **Industry Standards**: OpenAPI 3.0 compliant documentation

---

## 🛠️ **Setup & Configuration**

### **Installation**

```bash
# Install OpenAPI dependencies
pip install drf-spectacular[sidecar]
pip install drf-spectacular-jsonapi  # For JSON:API support
```

### **Django Settings Configuration**

Add to `backend/safeshipper_core/settings/base.py`:

```python
INSTALLED_APPS = [
    # ... other apps
    'drf_spectacular',
    'drf_spectacular_sidecar',
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

# drf-spectacular settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'SafeShipper API',
    'DESCRIPTION': '''
    **Enterprise-grade API for dangerous goods transportation and logistics management.**
    
    The SafeShipper API provides comprehensive functionality for managing dangerous goods 
    transportation operations, including emergency procedures, compliance monitoring, 
    shipment tracking, and safety documentation.
    
    ## Features
    
    - **Dangerous Goods Management**: Complete UN classification and compatibility checking
    - **Emergency Procedures**: Real-time incident management and response coordination
    - **Document Processing**: Intelligent manifest and SDS processing with OCR
    - **Fleet Management**: Vehicle tracking and safety equipment monitoring
    - **Compliance Monitoring**: Automated regulatory compliance checking
    - **Multi-tenant Architecture**: Company-based data isolation and security
    
    ## Authentication
    
    This API uses JWT (JSON Web Token) authentication. Include the token in the 
    Authorization header:
    
    ```
    Authorization: Bearer <your_jwt_token>
    ```
    
    ## Rate Limiting
    
    API requests are limited to 100 requests per minute per user. Emergency endpoints
    have higher rate limits for critical operations.
    
    ## Support
    
    For API support, contact: api-support@safeshipper.com
    ''',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'CONTACT': {
        'name': 'SafeShipper API Support',
        'email': 'api-support@safeshipper.com',
        'url': 'https://support.safeshipper.com',
    },
    'LICENSE': {
        'name': 'Commercial License',
        'url': 'https://safeshipper.com/license',
    },
    'SERVERS': [
        {
            'url': 'https://api.safeshipper.com/api/v1',
            'description': 'Production Server'
        },
        {
            'url': 'https://api-staging.safeshipper.com/api/v1', 
            'description': 'Staging Server'
        },
        {
            'url': 'http://localhost:8000/api/v1',
            'description': 'Development Server'
        }
    ],
    'TAGS': [
        {
            'name': 'Authentication',
            'description': 'User authentication and authorization'
        },
        {
            'name': 'Dangerous Goods',
            'description': 'Dangerous goods classification and compatibility'
        },
        {
            'name': 'Emergency Procedures',
            'description': 'Emergency response and incident management'
        },
        {
            'name': 'Search',
            'description': 'Unified search across all safety data'
        },
        {
            'name': 'Documents', 
            'description': 'File upload and document processing'
        },
        {
            'name': 'Shipments',
            'description': 'Shipment lifecycle management'
        },
        {
            'name': 'Fleet',
            'description': 'Vehicle and driver management'
        },
        {
            'name': 'Analytics',
            'description': 'Business intelligence and reporting'
        },
        {
            'name': 'Administration',
            'description': 'User and system administration'
        }
    ],
    'EXTERNAL_DOCS': {
        'description': 'SafeShipper Documentation',
        'url': 'https://docs.safeshipper.com',
    },
    'SCHEMA_PATH_PREFIX': '/api/v1/',
    'COMPONENT_SPLIT_REQUEST': True,
    'SORT_OPERATIONS': False,
    'ENUM_NAME_OVERRIDES': {
        'ValidationErrorEnum': 'drf_spectacular.openapi.pluck_enum_choices',
    },
    'POSTPROCESSING_HOOKS': [
        'dangerous_goods.openapi_hooks.postprocess_dangerous_goods_schema',
        'emergency_procedures.openapi_hooks.postprocess_emergency_schema',
    ],
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': True,
        'defaultModelExpandDepth': 2,
        'defaultModelsExpandDepth': 2,
        'displayRequestDuration': True,
        'filter': True,
        'showExtensions': True,
        'showCommonExtensions': True,
    },
    'REDOC_UI_SETTINGS': {
        'hideDownloadButton': False,
        'hideHostname': False,
        'expandResponses': 'all',
        'pathInMiddlePanel': True,
        'theme': {
            'colors': {
                'primary': {
                    'main': '#1976d2'
                }
            }
        }
    },
    'AUTHENTICATION_WHITELIST': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'SECURITY': [
        {
            'bearerAuth': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT',
            }
        }
    ],
}
```

### **URL Configuration**

Add to `backend/safeshipper_core/urls.py`:

```python
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/v1/', include('dangerous_goods.urls')),
    path('api/v1/', include('emergency_procedures.urls')),
    path('api/v1/', include('search.urls')),
    path('api/v1/', include('documents.urls')),
    path('api/v1/', include('shipments.urls')),
    path('api/v1/', include('users.urls')),
    path('api/v1/', include('vehicles.urls')),
    path('api/v1/', include('analytics.urls')),
    
    # OpenAPI schema and documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # Health check
    path('health/', include('health_check.urls')),
]
```

---

## 📝 **Custom Schema Documentation**

### **ViewSet Documentation Enhancement**

Create enhanced ViewSet documentation with comprehensive examples:

```python
# dangerous_goods/api_views.py
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

@extend_schema_view(
    list=extend_schema(
        tags=['Dangerous Goods'],
        summary="List Dangerous Goods",
        description="""
        Retrieve a paginated list of dangerous goods with optional filtering and search.
        
        This endpoint provides access to the complete dangerous goods database with 
        UN numbers, proper shipping names, hazard classifications, and packaging 
        requirements according to ADG (Australian Dangerous Goods) Code.
        
        **Use Cases:**
        - Search for dangerous goods by UN number or name
        - Filter by hazard class or packing group
        - Lookup dangerous goods for manifest creation
        - Validate dangerous goods classifications
        """,
        parameters=[
            OpenApiParameter(
                name='search',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Search by UN number, proper shipping name, or synonyms',
                examples=[
                    OpenApiExample('UN Number', value='UN1203'),
                    OpenApiExample('Chemical Name', value='gasoline'),
                    OpenApiExample('Common Name', value='petrol')
                ]
            ),
            OpenApiParameter(
                name='hazard_class',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by hazard class (1-9)',
                examples=[
                    OpenApiExample('Flammable Liquids', value='3'),
                    OpenApiExample('Corrosive', value='8'),
                    OpenApiExample('Miscellaneous', value='9')
                ]
            ),
            OpenApiParameter(
                name='packing_group',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by packing group',
                enum=['I', 'II', 'III']
            ),
            OpenApiParameter(
                name='marine_pollutant',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Filter by marine pollutant status'
            ),
        ],
        examples=[
            OpenApiExample(
                'Successful Response',
                value={
                    "count": 156,
                    "next": "http://localhost:8000/api/v1/dangerous-goods/?page=2",
                    "previous": None,
                    "results": [
                        {
                            "id": "123e4567-e89b-12d3-a456-426614174000",
                            "un_number": "UN1203",
                            "proper_shipping_name": "Gasoline",
                            "synonyms": ["Petrol", "Motor spirit"],
                            "hazard_class": "3",
                            "subsidiary_risk": None,
                            "packing_group": "II",
                            "marine_pollutant": False,
                            "limited_quantity": True,
                            "tunnel_code": "D/E",
                            "special_provisions": ["144", "177", "640C"],
                            "packaging_instructions": {
                                "inner": "P001",
                                "combination": "4G/Y1.2/S/01/USA/+AA123"
                            },
                            "transport_category": 2,
                            "label_codes": ["3"],
                            "placard_details": {
                                "primary": "FLAMMABLE LIQUID",
                                "emergency_info": "EmS F-E, S-E"
                            }
                        }
                    ]
                }
            )
        ]
    ),
    create=extend_schema(exclude=True),  # Exclude from docs (read-only resource)
    update=extend_schema(exclude=True),
    partial_update=extend_schema(exclude=True),
    destroy=extend_schema(exclude=True),
    retrieve=extend_schema(
        tags=['Dangerous Goods'],
        summary="Get Dangerous Good Details",
        description="""
        Retrieve detailed information for a specific dangerous good by ID.
        
        Returns comprehensive classification data including packaging requirements,
        transport restrictions, and safety information.
        """,
        examples=[
            OpenApiExample(
                'Detailed Dangerous Good',
                value={
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "un_number": "UN1203",
                    "proper_shipping_name": "Gasoline",
                    "synonyms": ["Petrol", "Motor spirit", "Benzine"],
                    "hazard_class": "3",
                    "subsidiary_risk": None,
                    "packing_group": "II",
                    "marine_pollutant": False,
                    "limited_quantity": True,
                    "tunnel_code": "D/E",
                    "special_provisions": ["144", "177", "640C"],
                    "packaging_instructions": {
                        "inner": "P001",
                        "combination": "4G/Y1.2/S/01/USA/+AA123",
                        "single": "3H1/Y1.8/100/01/USA/+AA456"
                    },
                    "transport_category": 2,
                    "label_codes": ["3"],
                    "placard_details": {
                        "primary": "FLAMMABLE LIQUID",
                        "subsidiary": None,
                        "emergency_info": "EmS F-E, S-E",
                        "stowage": "Category A"
                    },
                    "segregation_requirements": {
                        "group": "Flammable liquids",
                        "segregation_table": "SGG3",
                        "incompatible_classes": ["4.2", "5.1", "8"]
                    }
                }
            )
        ]
    )
)
class DangerousGoodViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for dangerous goods data with comprehensive classification information.
    
    Provides read-only access to dangerous goods database with search and filtering
    capabilities. All dangerous goods data follows ADG (Australian Dangerous Goods)
    Code classification standards.
    """
    queryset = DangerousGood.objects.all()
    serializer_class = DangerousGoodSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['hazard_class', 'packing_group', 'marine_pollutant']
    search_fields = ['un_number', 'proper_shipping_name', 'synonyms']
    ordering_fields = ['un_number', 'proper_shipping_name', 'hazard_class']
    ordering = ['un_number']

    @extend_schema(
        tags=['Dangerous Goods'],
        summary="Check Dangerous Goods Compatibility",
        description="""
        Check compatibility between multiple dangerous goods for safe transport.
        
        This endpoint validates whether the specified dangerous goods can be safely
        transported together according to ADG segregation requirements. Returns
        detailed conflict information if incompatibilities are detected.
        
        **Safety Note:** This check is mandatory for multi-item dangerous goods
        shipments to ensure regulatory compliance and prevent dangerous reactions.
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'un_numbers': {
                        'type': 'array',
                        'items': {'type': 'string', 'pattern': '^UN\\d{4}$'},
                        'minItems': 2,
                        'description': 'List of UN numbers to check for compatibility'
                    }
                },
                'required': ['un_numbers'],
                'example': {
                    'un_numbers': ['UN1203', 'UN1090', 'UN1381']
                }
            }
        },
        responses={
            200: {
                'description': 'Compatibility check completed',
                'content': {
                    'application/json': {
                        'examples': {
                            'compatible': OpenApiExample(
                                'Compatible Dangerous Goods',
                                value={
                                    "is_compatible": True,
                                    "total_combinations_checked": 3,
                                    "conflicts": [],
                                    "compatible_pairs": [
                                        {
                                            "un_number_1": "UN1203",
                                            "un_number_2": "UN1090",
                                            "segregation_requirement": "Separate from"
                                        }
                                    ],
                                    "recommendations": [
                                        "Maintain minimum 3-meter separation between UN1203 and UN1090"
                                    ]
                                }
                            ),
                            'incompatible': OpenApiExample(
                                'Incompatible Dangerous Goods',
                                value={
                                    "is_compatible": False,
                                    "total_combinations_checked": 3,
                                    "conflicts": [
                                        {
                                            "un_number_1": "UN1203",
                                            "un_number_2": "UN1381",
                                            "hazard_class_1": "3",
                                            "hazard_class_2": "4.2",
                                            "reason": "Class 3 Flammable Liquids are incompatible with Class 4.2 Spontaneously Combustible materials.",
                                            "segregation_code": "X",
                                            "notes": "Complete segregation required - cannot be transported together"
                                        }
                                    ],
                                    "compatible_pairs": [],
                                    "recommendations": [
                                        "Separate UN1203 and UN1381 into different shipments",
                                        "Use separate transport vehicles if segregation cannot be achieved"
                                    ]
                                }
                            )
                        }
                    }
                }
            },
            400: {
                'description': 'Invalid request data',
                'content': {
                    'application/json': {
                        'example': {
                            "error": "Validation failed",
                            "details": {
                                "un_numbers": ["At least 2 UN numbers are required"]
                            }
                        }
                    }
                }
            }
        },
        parameters=[
            OpenApiParameter(
                name='include_recommendations',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Include safety recommendations in response',
                default=True
            )
        ]
    )
    @action(detail=False, methods=['post'])
    def check_compatibility(self, request):
        """Check compatibility between multiple dangerous goods"""
        # Implementation here
        pass

    @extend_schema(
        tags=['Dangerous Goods'],
        summary="Search Dangerous Goods by Synonym",
        description="""
        Search for dangerous goods using alternative names or synonyms.
        
        This endpoint helps find dangerous goods when the exact proper shipping
        name is unknown but alternative names or common synonyms are available.
        """,
        parameters=[
            OpenApiParameter(
                name='synonym',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Alternative name or synonym to search for',
                required=True,
                examples=[
                    OpenApiExample('Common Name', value='petrol'),
                    OpenApiExample('Industrial Name', value='benzine'),
                    OpenApiExample('Trade Name', value='motor spirit')
                ]
            ),
            OpenApiParameter(
                name='fuzzy',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Enable fuzzy matching for approximate matches',
                default=False
            )
        ],
        examples=[
            OpenApiExample(
                'Synonym Match Found',
                value={
                    "synonym": "petrol",
                    "matches": [
                        {
                            "id": "123e4567-e89b-12d3-a456-426614174000",
                            "un_number": "UN1203",
                            "proper_shipping_name": "Gasoline",
                            "match_confidence": 0.95,
                            "synonym_matched": "Petrol"
                        }
                    ]
                }
            )
        ]
    )
    @action(detail=False, methods=['get'])
    def lookup_by_synonym(self, request):
        """Search dangerous goods by synonym"""
        # Implementation here
        pass
```

### **Emergency Procedures Schema Documentation**

```python
# emergency_procedures/api_views.py
@extend_schema_view(
    list=extend_schema(
        tags=['Emergency Procedures'],
        summary="List Emergency Procedures",
        description="""
        Retrieve emergency response procedures for dangerous goods incidents.
        
        Emergency procedures are organized by hazard class and incident type,
        providing step-by-step response protocols compliant with ADG requirements.
        """,
        parameters=[
            OpenApiParameter(
                name='hazard_class',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by dangerous goods hazard class',
                examples=[
                    OpenApiExample('Class 3 - Flammable Liquids', value='3'),
                    OpenApiExample('Class 8 - Corrosive', value='8')
                ]
            ),
            OpenApiParameter(
                name='emergency_type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by emergency type',
                enum=['SPILL', 'FIRE', 'EXPOSURE', 'TRANSPORT_ACCIDENT']
            ),
            OpenApiParameter(
                name='applicable_zones',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by operating zone',
                examples=[
                    OpenApiExample('Urban Areas', value='URBAN'),
                    OpenApiExample('Highway Transport', value='HIGHWAY')
                ]
            )
        ]
    ),
    create=extend_schema(
        tags=['Emergency Procedures'],
        summary="Create Emergency Procedure",
        description="""
        Create a new emergency response procedure.
        
        Requires MANAGER role or above. All procedures must be reviewed and
        approved before becoming active.
        """,
        examples=[
            OpenApiExample(
                'Create Spill Response Procedure',
                value={
                    "title": "Class 3 Liquid Spill Response",
                    "description": "Emergency response for flammable liquid spills",
                    "emergency_type": "SPILL",
                    "applicable_hazard_classes": [3],
                    "applicable_un_numbers": ["UN1203", "UN1090"],
                    "response_time_minutes": 15,
                    "procedure_steps": [
                        {
                            "step_number": 1,
                            "instruction": "Ensure personal safety and evacuate immediate area",
                            "estimated_time_minutes": 2
                        },
                        {
                            "step_number": 2,
                            "instruction": "Eliminate ignition sources within 50 meters",
                            "estimated_time_minutes": 3
                        }
                    ],
                    "required_equipment": [
                        "Fire extinguisher (Class B)",
                        "Spill containment kit",
                        "Personal protective equipment"
                    ],
                    "safety_precautions": [
                        "Avoid ignition sources",
                        "Ensure adequate ventilation",
                        "Use appropriate PPE"
                    ],
                    "applicable_zones": ["URBAN", "HIGHWAY", "INDUSTRIAL"]
                }
            )
        ]
    )
)
class EmergencyProcedureViewSet(viewsets.ModelViewSet):
    """
    Comprehensive emergency procedure management for dangerous goods incidents.
    
    Provides CRUD operations for emergency response procedures with role-based
    access control and approval workflows.
    """
    
    @extend_schema(
        tags=['Emergency Procedures'],
        summary="Get Emergency Quick Reference",
        description="""
        Get quick reference emergency information for immediate response.
        
        This endpoint provides essential emergency response information that can
        be quickly accessed during incidents. Designed for mobile devices and
        emergency response teams.
        
        **Critical Note:** This information is for immediate response guidance only.
        Always follow complete emergency procedures and contact professional
        emergency services for serious incidents.
        """,
        parameters=[
            OpenApiParameter(
                name='hazard_class',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Hazard class of dangerous good (required)',
                required=True
            ),
            OpenApiParameter(
                name='un_number',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Specific UN number for targeted guidance'
            )
        ],
        examples=[
            OpenApiExample(
                'Class 3 Quick Reference',
                value={
                    "hazard_class": "3",
                    "quick_actions": [
                        "Stop vehicle in safe location away from traffic",
                        "Turn off engine and activate emergency signals",
                        "Check for injuries - provide first aid if qualified",
                        "Eliminate ignition sources in 50m radius",
                        "Contain spill if safe to do so using spill kit",
                        "Contact emergency services: 000"
                    ],
                    "emergency_contacts": [
                        {
                            "name": "Emergency Services",
                            "phone": "000",
                            "type": "EMERGENCY_SERVICES",
                            "available_24_7": True
                        },
                        {
                            "name": "HAZMAT Response Team",
                            "phone": "+61 3 9876 5432",
                            "type": "SPECIALIST_TEAM",
                            "available_24_7": True
                        }
                    ],
                    "immediate_hazards": [
                        "Fire and explosion risk",
                        "Vapor inhalation",
                        "Environmental contamination"
                    ],
                    "personal_protection": [
                        "Evacuate area upwind from spill",
                        "Avoid smoking, sparks, flames",
                        "Use appropriate breathing protection"
                    ],
                    "applicable_procedures": 3
                }
            )
        ]
    )
    @action(detail=False, methods=['get'])
    def quick_reference(self, request):
        """Get emergency quick reference information"""
        # Implementation here
        pass
```

### **Custom Schema Postprocessing**

Create custom postprocessing hooks to enhance schema documentation:

```python
# dangerous_goods/openapi_hooks.py
def postprocess_dangerous_goods_schema(result, generator, request, public):
    """
    Postprocess OpenAPI schema for dangerous goods endpoints
    """
    
    # Add dangerous goods specific components
    if 'components' not in result:
        result['components'] = {}
    
    if 'schemas' not in result['components']:
        result['components']['schemas'] = {}
    
    # Add dangerous goods classification schema
    result['components']['schemas']['DangerousGoodsClassification'] = {
        'type': 'object',
        'properties': {
            'hazard_class': {
                'type': 'string',
                'enum': ['1', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '2.1', '2.2', '2.3', '3', '4.1', '4.2', '4.3', '5.1', '5.2', '6.1', '6.2', '7', '8', '9'],
                'description': 'ADG hazard classification'
            },
            'packing_group': {
                'type': 'string',
                'enum': ['I', 'II', 'III'],
                'description': 'Degree of danger (I = high, II = medium, III = low)'
            },
            'label_codes': {
                'type': 'array',
                'items': {'type': 'string'},
                'description': 'Required hazard labels'
            }
        },
        'description': 'Dangerous goods classification according to ADG Code'
    }
    
    # Add compatibility check result schema
    result['components']['schemas']['CompatibilityCheckResult'] = {
        'type': 'object',
        'properties': {
            'is_compatible': {
                'type': 'boolean',
                'description': 'Whether the dangerous goods can be transported together'
            },
            'conflicts': {
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'un_number_1': {'type': 'string'},
                        'un_number_2': {'type': 'string'},
                        'reason': {'type': 'string'},
                        'segregation_code': {'type': 'string'},
                        'severity': {'type': 'string', 'enum': ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']}
                    }
                },
                'description': 'List of incompatibility conflicts'
            },
            'recommendations': {
                'type': 'array',
                'items': {'type': 'string'},
                'description': 'Safety recommendations for transport'
            }
        },
        'required': ['is_compatible'],
        'description': 'Result of dangerous goods compatibility check'
    }
    
    # Add industry-specific tags and examples
    if 'tags' in result:
        for tag in result['tags']:
            if tag['name'] == 'Dangerous Goods':
                tag['externalDocs'] = {
                    'description': 'ADG Code Reference',
                    'url': 'https://www.ntc.gov.au/codes-and-guidelines/australian-dangerous-goods-code'
                }
    
    return result

# emergency_procedures/openapi_hooks.py
def postprocess_emergency_schema(result, generator, request, public):
    """
    Postprocess OpenAPI schema for emergency procedures
    """
    
    # Add emergency response schemas
    if 'components' not in result:
        result['components'] = {}
    
    if 'schemas' not in result['components']:
        result['components']['schemas'] = {}
    
    # Add emergency severity levels
    result['components']['schemas']['EmergencySeverityLevel'] = {
        'type': 'string',
        'enum': ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        'description': '''
        Emergency severity classification:
        - LOW: Minor incidents, no immediate danger
        - MEDIUM: Moderate incidents, contained situation
        - HIGH: Serious incidents, potential for escalation
        - CRITICAL: Life-threatening or major environmental threat
        '''
    }
    
    # Add emergency contact schema
    result['components']['schemas']['EmergencyContact'] = {
        'type': 'object',
        'properties': {
            'name': {
                'type': 'string',
                'description': 'Contact name or organization'
            },
            'phone': {
                'type': 'string',
                'pattern': r'^\+?[1-9]\d{1,14}$',
                'description': 'Emergency contact phone number'
            },
            'contact_type': {
                'type': 'string',
                'enum': ['EMERGENCY_SERVICES', 'COMPANY_EMERGENCY', 'SPECIALIST_TEAM'],
                'description': 'Type of emergency contact'
            },
            'available_24_7': {
                'type': 'boolean',
                'description': 'Whether contact is available 24/7'
            },
            'specialties': {
                'type': 'array',
                'items': {'type': 'string'},
                'description': 'Emergency response specialties'
            }
        },
        'required': ['name', 'phone', 'contact_type'],
        'description': 'Emergency contact information'
    }
    
    return result
```

### **Security Schema Enhancement**

```python
# Add security scheme definitions
SPECTACULAR_SETTINGS.update({
    'SECURITY_DEFINITIONS': {
        'Bearer': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header',
            'description': 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
        }
    },
    'SECURITY': [{'Bearer': []}],
})
```

---

## 🎨 **Custom Documentation Views**

### **Enhanced Documentation Landing Page**

Create custom documentation views with additional SafeShipper context:

```python
# safeshipper_core/views.py
from django.shortcuts import render
from django.http import JsonResponse
from drf_spectacular.views import SpectacularSwaggerView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

class SafeShipperSwaggerView(SpectacularSwaggerView):
    """
    Custom Swagger UI with SafeShipper branding and additional documentation
    """
    template_name = 'swagger-ui.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update({
            'title': 'SafeShipper API Documentation',
            'description': 'Interactive API documentation for dangerous goods transportation',
            'version': '1.0.0',
            'company_name': 'SafeShipper',
            'support_email': 'api-support@safeshipper.com',
            'additional_resources': [
                {
                    'title': 'API Integration Guide',
                    'url': '/api/docs/integration-guide/',
                    'description': 'Complete guide for integrating with SafeShipper APIs'
                },
                {
                    'title': 'Security Documentation',
                    'url': '/api/docs/security/',
                    'description': 'Security best practices and authentication guide'
                },
                {
                    'title': 'ADG Code Reference',
                    'url': 'https://www.ntc.gov.au/codes-and-guidelines/australian-dangerous-goods-code',
                    'description': 'Australian Dangerous Goods Code (external)'
                }
            ]
        })
        return context

@api_view(['GET'])
@permission_classes([AllowAny])
def api_health_check(request):
    """
    API health check endpoint for documentation and monitoring
    """
    return JsonResponse({
        'status': 'healthy',
        'version': '1.0.0',
        'timestamp': timezone.now().isoformat(),
        'documentation': {
            'swagger_ui': '/api/docs/',
            'redoc': '/api/redoc/',
            'openapi_schema': '/api/schema/'
        },
        'services': {
            'database': 'healthy',
            'redis': 'healthy',
            'elasticsearch': 'healthy' if settings.ELASTICSEARCH_ENABLED else 'disabled'
        }
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def api_version_info(request):
    """
    API version and feature information
    """
    return JsonResponse({
        'version': '1.0.0',
        'api_name': 'SafeShipper API',
        'features': {
            'dangerous_goods_management': True,
            'emergency_procedures': True,
            'document_processing': True,
            'real_time_tracking': True,
            'compliance_monitoring': True,
            'multi_tenant_support': True
        },
        'endpoints': {
            'dangerous_goods': '/api/v1/dangerous-goods/',
            'emergency_procedures': '/api/v1/emergency-procedures/',
            'search': '/api/v1/search/',
            'documents': '/api/v1/documents/',
            'shipments': '/api/v1/shipments/',
            'analytics': '/api/v1/analytics/'
        },
        'authentication': {
            'type': 'JWT',
            'token_endpoint': '/api/v1/auth/token/',
            'refresh_endpoint': '/api/v1/auth/refresh/'
        },
        'rate_limits': {
            'default': '100 requests per minute',
            'emergency_endpoints': '200 requests per minute',
            'file_uploads': '10 requests per minute'
        }
    })
```

### **Custom Templates**

Create `backend/templates/swagger-ui.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }}</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
        .swagger-ui .topbar {
            background-color: #1976d2;
        }
        .swagger-ui .topbar .download-url-wrapper {
            display: none;
        }
        .safeshipper-header {
            background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
            color: white;
            padding: 20px;
            margin-bottom: 20px;
        }
        .safeshipper-header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .safeshipper-header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .additional-resources {
            background: #f5f5f5;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
        }
        .additional-resources h3 {
            margin-top: 0;
            color: #1976d2;
        }
        .resource-link {
            display: block;
            margin: 10px 0;
            color: #1976d2;
            text-decoration: none;
        }
        .resource-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="safeshipper-header">
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
        <p><strong>Version:</strong> {{ version }} | <strong>Support:</strong> {{ support_email }}</p>
    </div>
    
    <div class="additional-resources">
        <h3>📚 Additional Resources</h3>
        {% for resource in additional_resources %}
            <a href="{{ resource.url }}" class="resource-link" target="_blank">
                <strong>{{ resource.title }}</strong> - {{ resource.description }}
            </a>
        {% endfor %}
    </div>
    
    <div id="swagger-ui"></div>
    
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
    <script>
        SwaggerUIBundle({
            url: '{{ schema_url }}',
            dom_id: '#swagger-ui',
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
            ],
            layout: "StandaloneLayout",
            deepLinking: true,
            showExtensions: true,
            showCommonExtensions: true,
            defaultModelExpandDepth: 2,
            defaultModelsExpandDepth: 2,
            displayOperationId: true,
            filter: true,
            persistAuthorization: true,
            tryItOutEnabled: true,
            requestInterceptor: function(request) {
                // Add SafeShipper API key if available
                const apiKey = localStorage.getItem('safeshipper_api_key');
                if (apiKey) {
                    request.headers['Authorization'] = `Bearer ${apiKey}`;
                }
                return request;
            }
        });
    </script>
</body>
</html>
```

---

## 🧪 **Schema Validation & Testing**

### **Schema Validation Script**

Create `backend/scripts/validate_openapi_schema.py`:

```python
#!/usr/bin/env python
"""
Validate OpenAPI schema for SafeShipper API
"""
import os
import sys
import django
from django.core.management import execute_from_command_line
import requests
import json
from jsonschema import validate, ValidationError
import yaml

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper_core.settings.development')
django.setup()

def validate_openapi_schema():
    """Validate the generated OpenAPI schema"""
    
    # Generate schema
    from django.test import Client
    from django.contrib.auth import get_user_model
    
    client = Client()
    
    # Get schema
    response = client.get('/api/schema/')
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch schema: {response.status_code}")
        return False
    
    schema = response.json()
    
    # Validate OpenAPI 3.0 compliance
    openapi_3_schema = {
        "type": "object",
        "required": ["openapi", "info", "paths"],
        "properties": {
            "openapi": {"type": "string", "pattern": "^3\\.0\\.\\d+$"},
            "info": {
                "type": "object",
                "required": ["title", "version"],
                "properties": {
                    "title": {"type": "string"},
                    "version": {"type": "string"},
                    "description": {"type": "string"}
                }
            },
            "paths": {"type": "object"},
            "components": {"type": "object"},
            "security": {"type": "array"}
        }
    }
    
    try:
        validate(instance=schema, schema=openapi_3_schema)
        print("✅ OpenAPI 3.0 schema validation passed")
    except ValidationError as e:
        print(f"❌ OpenAPI schema validation failed: {e.message}")
        return False
    
    # Validate SafeShipper specific requirements
    if not validate_safeshipper_schema(schema):
        return False
    
    # Validate all endpoints have proper documentation
    if not validate_endpoint_documentation(schema):
        return False
    
    print("✅ All schema validations passed")
    return True

def validate_safeshipper_schema(schema):
    """Validate SafeShipper specific schema requirements"""
    
    # Check required tags exist
    required_tags = [
        'Dangerous Goods', 'Emergency Procedures', 'Search', 
        'Documents', 'Authentication'
    ]
    
    schema_tags = [tag['name'] for tag in schema.get('tags', [])]
    
    for required_tag in required_tags:
        if required_tag not in schema_tags:
            print(f"❌ Missing required tag: {required_tag}")
            return False
    
    print("✅ Required tags validation passed")
    
    # Check dangerous goods endpoints
    dangerous_goods_paths = [
        path for path in schema['paths'].keys() 
        if 'dangerous-goods' in path
    ]
    
    if not dangerous_goods_paths:
        print("❌ No dangerous goods endpoints found")
        return False
    
    # Check compatibility endpoint exists
    compatibility_endpoint = '/api/v1/dangerous-goods/check-compatibility/'
    if compatibility_endpoint not in schema['paths']:
        print("❌ Missing dangerous goods compatibility endpoint")
        return False
    
    print("✅ SafeShipper specific validation passed")
    return True

def validate_endpoint_documentation(schema):
    """Validate that all endpoints have proper documentation"""
    
    undocumented_endpoints = []
    
    for path, methods in schema['paths'].items():
        for method, operation in methods.items():
            if method.upper() in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']:
                # Check required documentation fields
                if 'summary' not in operation:
                    undocumented_endpoints.append(f"{method.upper()} {path} - missing summary")
                
                if 'description' not in operation:
                    undocumented_endpoints.append(f"{method.upper()} {path} - missing description")
                
                if 'tags' not in operation:
                    undocumented_endpoints.append(f"{method.upper()} {path} - missing tags")
                
                # Check dangerous goods endpoints have examples
                if 'dangerous-goods' in path and 'examples' not in operation.get('responses', {}).get('200', {}):
                    undocumented_endpoints.append(f"{method.upper()} {path} - missing response examples")
    
    if undocumented_endpoints:
        print("❌ Undocumented endpoints found:")
        for endpoint in undocumented_endpoints:
            print(f"   - {endpoint}")
        return False
    
    print("✅ Endpoint documentation validation passed")
    return True

def generate_client_examples():
    """Generate client code examples from schema"""
    
    from django.test import Client
    client = Client()
    response = client.get('/api/schema/')
    schema = response.json()
    
    # Generate Python client example
    python_example = """
# Python client example for SafeShipper API

import requests
import json

class SafeShipperClient:
    def __init__(self, api_key, base_url='https://api.safeshipper.com/api/v1'):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })
    
    def check_dangerous_goods_compatibility(self, un_numbers):
        '''Check compatibility between dangerous goods'''
        url = f'{self.base_url}/dangerous-goods/check-compatibility/'
        response = self.session.post(url, json={'un_numbers': un_numbers})
        return response.json()
    
    def search_dangerous_goods(self, query):
        '''Search dangerous goods database'''
        url = f'{self.base_url}/dangerous-goods/'
        response = self.session.get(url, params={'search': query})
        return response.json()

# Usage example
client = SafeShipperClient('your-api-key')
result = client.check_dangerous_goods_compatibility(['UN1203', 'UN1090'])
print(f"Compatible: {result['is_compatible']}")
"""
    
    # Save example to file
    with open('client_examples/python_client.py', 'w') as f:
        f.write(python_example)
    
    print("✅ Client examples generated")

if __name__ == '__main__':
    success = validate_openapi_schema()
    
    if success:
        generate_client_examples()
        print("\n🎉 Schema validation completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Schema validation failed!")
        sys.exit(1)
```

### **Automated Testing Integration**

Add to `backend/test_runner.py`:

```python
def run_schema_tests():
    """Run OpenAPI schema validation tests"""
    
    print("Running OpenAPI schema validation...")
    
    # Validate schema
    result = subprocess.run([
        'python', 'scripts/validate_openapi_schema.py'
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        print("❌ Schema validation failed:")
        print(result.stdout)
        print(result.stderr)
        return False
    
    print("✅ Schema validation passed")
    return True

# Add to main test runner
def run_tests():
    # ... existing test code ...
    
    # Add schema validation to test suite
    if not run_schema_tests():
        return 1
    
    # ... rest of tests ...
```

---

## 📖 **Usage Examples**

### **Accessing Documentation**

```bash
# Start development server
python manage.py runserver

# Access documentation URLs:
# Swagger UI: http://localhost:8000/api/docs/
# ReDoc: http://localhost:8000/api/redoc/
# Raw Schema: http://localhost:8000/api/schema/
# API Health: http://localhost:8000/api/health/
```

### **Schema Generation Commands**

```bash
# Generate OpenAPI schema file
python manage.py spectacular --file schema.yaml

# Generate schema in JSON format
python manage.py spectacular --format openapi-json --file schema.json

# Validate schema
python scripts/validate_openapi_schema.py

# Generate client code (requires openapi-generator)
openapi-generator generate -i schema.yaml -g python -o client-python/
```

---

## 🚀 **Production Deployment**

### **Static Documentation Hosting**

```python
# For production, serve static documentation
SPECTACULAR_SETTINGS.update({
    'SWAGGER_UI_DIST': 'SIDECAR',  # Use sidecar for offline documentation
    'SWAGGER_UI_FAVICON_HREF': '/static/img/favicon.ico',
    'REDOC_DIST': 'SIDECAR',
})

# Collect static files
python manage.py collectstatic
```

### **CDN Integration**

```python
# Use CDN for production documentation assets
SPECTACULAR_SETTINGS.update({
    'SWAGGER_UI_SETTINGS': {
        'url': 'https://cdn.safeshipper.com/api/schema.yaml',
        'persistAuthorization': True,
        'displayOperationId': True,
    }
})
```

---

## 📋 **Maintenance Checklist**

### **Regular Schema Updates**

- [ ] **API Changes**: Update schema when adding new endpoints
- [ ] **Examples**: Keep request/response examples current
- [ ] **Documentation**: Update descriptions for clarity
- [ ] **Validation**: Run schema validation tests
- [ ] **Client Generation**: Regenerate client SDKs when needed

### **Quality Assurance**

- [ ] **Completeness**: All endpoints documented
- [ ] **Accuracy**: Examples match actual API behavior
- [ ] **Security**: Authentication properly documented
- [ ] **Compliance**: Industry standards properly reflected
- [ ] **Usability**: Documentation is clear and helpful

---

**This comprehensive OpenAPI integration provides complete, interactive API documentation for SafeShipper's dangerous goods transportation platform, enabling developers to easily understand, test, and integrate with the APIs while maintaining the highest standards of documentation quality and accuracy.**