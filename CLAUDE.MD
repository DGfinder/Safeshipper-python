# Claude Development Protocol for the SafeShipper Project

This document outlines the standard operating procedure I will follow for all development tasks on the SafeShipper project. My goal is to work as a predictable, efficient, and safe pair-programmer, ensuring every change is simple, well-planned, and approved by you.

## Guiding Principles

My work will be guided by one core principle above all else:

**Simplicity and Small Changes:** Every task will be broken down into the smallest possible, self-contained steps. I will avoid making massive or complex changes in a single step. Each change will impact as little code as possible to ensure clarity, ease of review, and stability.

## My Workflow

I will follow a strict five-step process for every new feature or task request.

### Step 1: Understand and Plan

Before writing any code, my first action will be to understand the request and create a plan.

1.  **Think & Analyze:** I will think through the problem and read the existing codebase to identify all relevant files and potential impacts.
2.  **Create a Plan:** I will then generate a plan in a file named `todo.md`. This plan will contain a checklist of the simple, sequential tasks I will perform to complete the request.

### Step 2: Await Approval

**I will not proceed with any coding until you have verified the plan.**

After I create the `todo.md` file, I will stop and explicitly ask for your approval to proceed. This is a critical checkpoint to ensure we are aligned before any changes are made to the codebase.

### Step 3: Execute and Communicate

Once you approve the plan, I will begin working through the items in `todo.md`.

1.  **Execute Tasks:** I will work on one `todo` item at a time.
2.  **Mark as Complete:** As I complete each item, I will update the `todo.md` file to mark the task as checked (`- [x]`).
3.  **Provide High-Level Updates:** After completing each task, I will provide a brief, high-level explanation of the change I just made (e.g., "I have now created the `UserEditForm.tsx` component and connected it to the `useUpdateUser` hook.").

### Step 4: Security & Quality Review

After all coding tasks are complete, I will perform a dedicated security and quality review. I will add a `## Security Review` section to the `todo.md` file and verify the following points:

-   **Input Validation:** Is all user-provided data (from API requests, forms, etc.) properly validated on the backend to prevent invalid data or injection attacks?
-   **Permissions Check:** Does the new feature correctly enforce our role-based access control? Is there any risk of an unauthorized user accessing the new endpoint or data?
-   **Data Exposure:** Do the API serializers for the new feature expose any sensitive data that shouldn't be public (e.g., password hashes, internal keys)?
-   **Dependency Review:** If any new third-party libraries were added, I will note them and confirm they are from a reputable source.

### Step 5: Final Summary

Once the security review is complete, I will finalize the process.

1.  **Add Review Section:** I will add a `## Review Summary` section to the bottom of the `todo.md` file.
2.  **Summarize Changes:** This section will provide a comprehensive summary of the work done, list all files that were created or modified, and confirm that the initial goal has been achieved.

---

## File Formats

### `todo.md` Structure

All plans will follow this consistent format to ensure clarity.

```markdown
# Task: [A clear, concise title for the overall task]

## Plan

- [ ] **Step 1:** A short description of the first simple task.
- [ ] **Step 2:** A short description of the second simple task.
- [ ] **Step 3:** ...and so on.

---
*(This section will be added after coding is complete)*
## Security Review

- **Input Validation:** [Checked/Not Applicable]
- **Permissions Check:** [Checked/Not Applicable]
- **Data Exposure:** [Checked/Not Applicable]
- **New Dependencies:** [None/List of dependencies]

---
*(This section will be added at the end)*
## Review Summary

A detailed summary of the completed work, including a list of all files created or modified and confirmation that all acceptance criteria have been met.

---

## Permission-Based Development Protocol

SafeShipper follows the **"Build Once, Render for Permissions"** architectural pattern. All new features and components must adhere to this pattern.

### Core Principle
Never create separate components for different user roles. Instead, build unified components that conditionally render features based on granular permissions.

### Permission System Usage

#### 1. Component Development
When building any new component or feature:

```typescript
// ✅ DO: Use permission-based conditional rendering
function FeatureComponent() {
  const { can, hasAnyRole } = usePermissions();
  
  return (
    <div>
      <BaseFeature />
      {can('feature.advanced') && <AdvancedFeature />}
      {can('feature.edit') && <EditControls />}
      {hasAnyRole(['admin', 'manager']) && <AdminControls />}
    </div>
  );
}

// ❌ DON'T: Create role-specific components
function AdminFeatureComponent() { /* ... */ }
function UserFeatureComponent() { /* ... */ }
```

#### 2. Navigation Items
All navigation items must use the `requiredPermission` property:

```typescript
const navigationItem = {
  name: "Feature Name",
  href: "/feature",
  icon: FeatureIcon,
  requiredPermission: "feature.view" // Single permission string
};
```

#### 3. Permission Naming Convention
Follow the `domain.action.scope?` pattern:
- `user.view` - View users
- `fleet.analytics.export` - Export fleet analytics
- `shipments.view.own` - View own shipments only

### Updated Security Review Checklist

When implementing new features, verify:

- **Permission Implementation**: Does the feature use the unified PermissionContext?
- **Granular Access Control**: Are permissions specific enough to provide proper access control?
- **No Role Duplication**: Have you avoided creating separate components for different roles?
- **Type Safety**: Are all permission strings properly typed and validated?
- **Consistent Patterns**: Does the implementation follow established permission patterns?
- **Defense in Depth**: Are permissions checked at multiple component levels?

### Required Documentation References
- **Architecture Guide**: See `FRONTEND_ARCHITECTURE_GUIDE.md` for detailed patterns
- **Implementation Details**: See `PERMISSION_SYSTEM_REFACTOR_SUMMARY.md` for technical specifications
- **Migration Guide**: See `COMPONENT_MIGRATION_GUIDE.md` for converting existing components

### Development Workflow Integration
1. **Analysis**: Identify all permission requirements for the feature
2. **Permission Definition**: Add required permissions to `PermissionContext.tsx`
3. **Implementation**: Build unified components with conditional rendering
4. **Testing**: Test with different user roles to verify access control
5. **Security Review**: Ensure proper permission boundaries and no access bypasses

---

## Advanced API Development Patterns

SafeShipper has established comprehensive API development patterns for dangerous goods transportation. When implementing new API features, follow these proven patterns.

### API Architecture Standards

#### 1. ViewSet Implementation Pattern
```python
# ✅ DO: Follow the established SafeShipper ViewSet pattern
class EmergencyProcedureViewSet(viewsets.ModelViewSet):
    """
    Standard SafeShipper ViewSet with:
    - Company-based data filtering
    - Permission-based access control  
    - Comprehensive error handling
    - Audit logging integration
    """
    serializer_class = EmergencyProcedureSerializer
    permission_classes = [IsAuthenticated, EmergencyProcedurePermissions]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    
    def get_queryset(self):
        # Apply company-based filtering for multi-tenant data
        return EmergencyProcedure.objects.filter(
            company=self.request.user.company
        ).select_related('created_by').prefetch_related('emergency_contacts')
    
    @action(detail=False, methods=['get'])
    def quick_reference(self, request):
        """Custom action following SafeShipper patterns"""
        # Implementation with proper validation and error handling
        pass

# ❌ DON'T: Create ViewSets without company filtering or permissions
```

#### 2. Serializer Design Patterns
```python
# ✅ DO: Use dynamic serializer selection for different actions
class DynamicSerializerViewSet(viewsets.ModelViewSet):
    serializer_action_classes = {
        'create': DetailedCreateSerializer,
        'update': UpdateSerializer,
        'list': OptimizedListSerializer,
        'retrieve': FullDetailSerializer,
    }
    
    def get_serializer_class(self):
        return self.serializer_action_classes.get(
            self.action, 
            self.serializer_class
        )

# ✅ DO: Include comprehensive validation for safety-critical data
class DangerousGoodSerializer(serializers.ModelSerializer):
    def validate_un_number(self, value):
        """Validate UN number format and existence"""
        if not re.match(r'^UN\d{4}$', value):
            raise ValidationError("Invalid UN number format")
        return value
```

#### 3. Permission System Integration
```python
# ✅ DO: Implement granular permissions for emergency systems
class EmergencyProcedurePermissions(BasePermission):
    def has_permission(self, request, view):
        if view.action == 'quick_reference':
            return request.user.has_perm('emergency.procedures.view')
        elif view.action == 'create':
            return request.user.has_perm('emergency.procedures.create')
        elif view.action in ['start_response', 'mark_resolved']:
            return request.user.has_perm('emergency.incidents.manage')
        return super().has_permission(request, view)
```

### Search & Discovery Implementation

#### 1. Unified Search Pattern
When implementing search functionality:

```python
# ✅ DO: Follow the unified search architecture
class UnifiedSearchView(APIView):
    """
    Coordinate search across multiple data types:
    - Dangerous goods
    - Emergency procedures  
    - Safety data sheets
    - Documents
    """
    
    def get(self, request):
        query = request.GET.get('q')
        search_type = request.GET.get('type', 'all')
        
        # Use established search services
        results = {
            'dangerous_goods': DangerousGoodsSearchService.search(query),
            'procedures': EmergencyProcedureSearchService.search(query),
            'sds': SDSSearchService.search(query)
        }
        
        return Response(self.format_search_results(results))
```

#### 2. Elasticsearch Integration
```python
# ✅ DO: Use Elasticsearch with database fallback
def search_dangerous_goods(query, limit=20):
    try:
        # Primary: Elasticsearch for performance
        es_results = elasticsearch_client.search(
            index='dangerous_goods',
            body={'query': {'multi_match': {'query': query}}}
        )
        return format_elasticsearch_results(es_results)
    
    except Exception as e:
        # Fallback: Database search for reliability
        logger.warning(f"Elasticsearch unavailable, using database: {e}")
        return DangerousGood.objects.filter(
            Q(proper_shipping_name__icontains=query) |
            Q(un_number__icontains=query)
        )[:limit]
```

### File Upload & Document Processing

#### 1. Multi-Storage Backend Pattern
```python
# ✅ DO: Implement flexible storage with automatic fallback
class FileUploadView(APIView):
    def post(self, request):
        file_obj = request.FILES['file']
        
        # Use storage backend hierarchy: S3 -> MinIO -> Local
        storage_backend = self.get_available_storage_backend()
        
        # Validate file before processing
        validation_result = self.validate_uploaded_file(file_obj)
        if not validation_result['is_valid']:
            return Response(validation_result, status=400)
        
        # Process asynchronously for large files
        document = Document.objects.create(
            file=file_obj,
            document_type=request.data.get('document_type'),
            uploaded_by=request.user,
            processing_status='PENDING'
        )
        
        # Queue background processing
        process_document.delay(document.id)
        
        return Response(DocumentSerializer(document).data, status=201)
```

#### 2. Background Processing Pattern
```python
# ✅ DO: Use Celery for document processing with proper error handling
@shared_task(bind=True, max_retries=3)
def process_document(self, document_id):
    try:
        document = Document.objects.get(id=document_id)
        
        # OCR extraction
        text_content = OCRService.extract_text(document.file.path)
        
        # Dangerous goods detection
        detected_dg = DGDetectionService.analyze_text(text_content)
        
        # Update document with results
        document.extracted_data = {
            'text': text_content,
            'dangerous_goods': detected_dg
        }
        document.processing_status = 'COMPLETED'
        document.save()
        
    except Exception as exc:
        document.processing_status = 'FAILED'
        document.save()
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
```

### Emergency Response System Patterns

#### 1. Real-Time Incident Management
```python
# ✅ DO: Implement comprehensive incident tracking
class EmergencyIncidentViewSet(viewsets.ModelViewSet):
    @action(detail=True, methods=['post'])
    def start_response(self, request, pk=None):
        """Start emergency response with proper validation"""
        incident = self.get_object()
        
        # Validate response team assignment
        response_team = request.data.get('response_team', [])
        if not self.validate_response_team(response_team):
            return Response(
                {'error': 'Invalid response team members'}, 
                status=400
            )
        
        # Update incident status
        incident.status = 'IN_PROGRESS'
        incident.response_started_at = timezone.now()
        incident.response_team = response_team
        incident.save()
        
        # Send real-time notifications
        self.notify_response_started(incident)
        
        return Response(EmergencyIncidentSerializer(incident).data)
```

### Security Implementation Requirements

#### 1. Enhanced Security Review Process
When implementing new API endpoints, verify:

- **Multi-Tenant Data Isolation**: All queries filtered by company
- **Emergency Access Control**: Critical systems have appropriate emergency coordinator permissions
- **Audit Trail**: All dangerous goods operations logged for compliance
- **Input Sanitization**: File uploads and text inputs properly validated
- **Rate Limiting**: Emergency endpoints have appropriate rate limits
- **Data Encryption**: Sensitive emergency contact information encrypted

#### 2. Dangerous Goods Compliance Validation
```python
# ✅ DO: Implement comprehensive DG validation
def validate_dangerous_goods_shipment(shipment_data):
    """Validate shipment meets ADG compliance requirements"""
    
    validation_results = {
        'is_compliant': True,
        'violations': [],
        'warnings': []
    }
    
    # Check UN number compatibility
    un_numbers = [item['un_number'] for item in shipment_data['items']]
    compatibility = check_un_number_compatibility(un_numbers)
    
    if not compatibility['is_compatible']:
        validation_results['is_compliant'] = False
        validation_results['violations'].extend(compatibility['conflicts'])
    
    # Validate packaging requirements
    packaging_validation = validate_packaging_requirements(shipment_data)
    if not packaging_validation['is_valid']:
        validation_results['violations'].extend(packaging_validation['errors'])
    
    return validation_results
```

### Integration Development Guidelines

#### 1. ERP System Integration Pattern
```python
# ✅ DO: Use adapter pattern for different ERP systems
class ERPIntegrationService:
    def __init__(self, erp_type):
        self.adapter = self.get_erp_adapter(erp_type)
    
    def sync_shipment_data(self, shipment):
        """Sync with external ERP following SafeShipper patterns"""
        try:
            erp_data = self.adapter.transform_shipment(shipment)
            response = self.adapter.send_to_erp(erp_data)
            
            # Log integration event
            IntegrationLog.objects.create(
                integration_type=self.adapter.erp_type,
                operation='shipment_sync',
                external_id=response.get('id'),
                status='SUCCESS',
                shipment=shipment
            )
            
        except Exception as e:
            # Handle integration failures gracefully
            IntegrationLog.objects.create(
                integration_type=self.adapter.erp_type,
                operation='shipment_sync',
                status='FAILED',
                error_message=str(e),
                shipment=shipment
            )
            raise
```

### API Documentation Standards

When implementing new API endpoints:

1. **OpenAPI Documentation**: All endpoints must have complete OpenAPI schemas
2. **Request/Response Examples**: Provide realistic JSON examples
3. **Error Response Documentation**: Document all possible error scenarios
4. **Permission Requirements**: Clearly specify required permissions
5. **Rate Limiting**: Document any rate limiting applied

### Testing Requirements

#### 1. Comprehensive Test Coverage
```python
# ✅ DO: Test emergency procedures with realistic scenarios
class EmergencyProcedureAPITestCase(APITestCase):
    def test_quick_reference_chemical_spill(self):
        """Test emergency quick reference for chemical spill scenario"""
        
        # Create test dangerous good
        dg = DangerousGood.objects.create(
            un_number='UN1203',
            proper_shipping_name='Gasoline',
            hazard_class='3'
        )
        
        # Test quick reference endpoint
        response = self.client.get(
            '/api/v1/emergency-procedures/api/procedures/quick-reference/',
            {'hazard_class': '3', 'un_number': 'UN1203'}
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('quick_actions', response.data)
        self.assertIn('emergency_contacts', response.data)
```

#### 2. Security Testing
```python
# ✅ DO: Test permission boundaries and data isolation
def test_company_data_isolation(self):
    """Ensure users cannot access other companies' emergency procedures"""
    
    other_company_procedure = EmergencyProcedure.objects.create(
        title='Other Company Procedure',
        company=self.other_company
    )
    
    response = self.client.get(
        f'/api/v1/emergency-procedures/api/procedures/{other_company_procedure.id}/'
    )
    
    self.assertEqual(response.status_code, 404)  # Should not be accessible
```

---

## API Development Checklist

When implementing new API features, ensure:

- [ ] **Company-based data filtering** applied to all queries
- [ ] **Permission classes** implemented with granular access control
- [ ] **Error handling** follows SafeShipper standards with proper HTTP status codes
- [ ] **Audit logging** integrated for compliance tracking
- [ ] **Serializer validation** includes safety-critical business rules
- [ ] **Background processing** used for heavy operations (OCR, document processing)
- [ ] **Search integration** added to unified search system when applicable
- [ ] **Real-time notifications** implemented for emergency systems
- [ ] **Multi-storage support** for file uploads with automatic fallback
- [ ] **Comprehensive tests** covering security, permissions, and edge cases
- [ ] **OpenAPI documentation** generated with complete examples
- [ ] **Integration logging** for external system communications

This ensures all new API development maintains SafeShipper's high standards for safety, security, and compliance in dangerous goods transportation.

---