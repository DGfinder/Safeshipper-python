# SafeShipper API Endpoints Reference

**Complete reference for all SafeShipper backend API endpoints**

This document provides comprehensive documentation for all API endpoints available in the SafeShipper backend, including request/response formats, authentication requirements, and usage examples.

---

## 🔗 **Base URL & Authentication**

### Base URL
```
Production: https://api.safeshipper.com/api/v1/
Development: http://localhost:8000/api/v1/
```

### Authentication
All endpoints require JWT authentication unless explicitly marked as public.

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Standard Response Format
```json
{
  "count": 42,
  "next": "http://localhost:8000/api/v1/endpoint/?page=3",
  "previous": "http://localhost:8000/api/v1/endpoint/?page=1",
  "results": [...],
  "meta": {
    "total_pages": 10,
    "current_page": 2
  }
}
```

---

## 🚨 **Emergency Procedures API**

### Base URL: `/api/v1/emergency-procedures/`

#### **Emergency Procedures**

##### 📋 List Emergency Procedures
```http
GET /api/v1/emergency-procedures/api/procedures/
```

**Query Parameters:**
- `hazard_class` (optional): Filter by hazard class (1-9)
- `emergency_type` (optional): SPILL, FIRE, EXPOSURE, TRANSPORT_ACCIDENT
- `search` (optional): Search in procedure title and description
- `applicable_zones` (optional): Filter by applicable zones

**Response:**
```json
{
  "count": 25,
  "results": [
    {
      "id": "uuid",
      "title": "Class 3 Flammable Liquid Spill Response",
      "description": "Emergency response for flammable liquid spills",
      "emergency_type": "SPILL",
      "applicable_hazard_classes": [3],
      "applicable_un_numbers": ["1203", "1090"],
      "response_time_minutes": 15,
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

##### 🔍 Get Emergency Procedure Details
```http
GET /api/v1/emergency-procedures/api/procedures/{id}/
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Class 3 Flammable Liquid Spill Response",
  "description": "Comprehensive emergency response protocol...",
  "emergency_type": "SPILL",
  "applicable_hazard_classes": [3],
  "applicable_un_numbers": ["1203", "1090"],
  "response_time_minutes": 15,
  "procedure_steps": [
    {
      "step_number": 1,
      "instruction": "Ensure personal safety and evacuate area",
      "estimated_time_minutes": 2
    }
  ],
  "required_equipment": ["Fire extinguisher", "Spill kit", "PPE"],
  "safety_precautions": ["Avoid ignition sources", "Ensure ventilation"],
  "applicable_zones": ["URBAN", "HIGHWAY"],
  "contact_authorities": true,
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

##### ⚡ Quick Reference
```http
GET /api/v1/emergency-procedures/api/procedures/quick-reference/
```

**Query Parameters:**
- `hazard_class` (required): Hazard class (1-9)
- `un_number` (optional): Specific UN number

**Response:**
```json
{
  "hazard_class": 3,
  "quick_actions": [
    "Stop vehicle in safe location",
    "Activate emergency signals",
    "Check for injuries",
    "Contain spill if safe to do so"
  ],
  "emergency_contacts": [
    {
      "name": "Fire Brigade",
      "phone": "000",
      "type": "EMERGENCY_SERVICES"
    }
  ],
  "applicable_procedures": 3
}
```

##### 🔍 Search Procedures
```http
GET /api/v1/emergency-procedures/api/procedures/search-by-criteria/
```

**Query Parameters:**
- `hazard_classes` (optional): Comma-separated list of hazard classes
- `emergency_types` (optional): Comma-separated emergency types
- `zone` (optional): Operating zone
- `response_time_max` (optional): Maximum response time in minutes

#### **Emergency Incidents**

##### 📋 List Emergency Incidents
```http
GET /api/v1/emergency-procedures/api/incidents/
```

**Query Parameters:**
- `status` (optional): REPORTED, IN_PROGRESS, RESOLVED, CLOSED
- `emergency_type` (optional): Emergency type filter
- `severity_level` (optional): LOW, MEDIUM, HIGH, CRITICAL
- `date_from` (optional): Filter from date (YYYY-MM-DD)
- `date_to` (optional): Filter to date (YYYY-MM-DD)

**Response:**
```json
{
  "count": 15,
  "results": [
    {
      "id": "uuid",
      "incident_number": "INC-2024-001",
      "emergency_type": "SPILL",
      "description": "Chemical spill on Highway 1",
      "status": "RESOLVED",
      "severity_level": "HIGH",
      "location": "Highway 1, KM 45",
      "coordinates": {"lat": -37.8136, "lng": 144.9631},
      "reported_by": "driver_uuid",
      "reported_at": "2024-01-15T10:30:00Z",
      "resolved_at": "2024-01-15T12:45:00Z",
      "response_time_minutes": 18,
      "affected_shipments": ["shipment_uuid"],
      "procedure_followed": "procedure_uuid"
    }
  ]
}
```

##### 📝 Report New Incident
```http
POST /api/v1/emergency-procedures/api/incidents/
```

**Request Body:**
```json
{
  "emergency_type": "SPILL",
  "description": "Chemical spill on Highway 1",
  "location": "Highway 1, KM 45",
  "coordinates": {"lat": -37.8136, "lng": 144.9631},
  "severity_level": "HIGH",
  "affected_shipments": ["shipment_uuid"],
  "immediate_actions_taken": "Area evacuated, emergency services contacted"
}
```

##### 🚀 Start Response
```http
POST /api/v1/emergency-procedures/api/incidents/{id}/start-response/
```

**Request Body:**
```json
{
  "response_team": ["responder1_uuid", "responder2_uuid"],
  "estimated_completion": "2024-01-15T14:00:00Z",
  "notes": "Response team dispatched"
}
```

##### ✅ Mark Resolved
```http
POST /api/v1/emergency-procedures/api/incidents/{id}/mark-resolved/
```

**Request Body:**
```json
{
  "resolution_details": "Spill contained and cleaned up",
  "lessons_learned": "Additional signage needed in this area",
  "cost_estimate": 2500.00
}
```

##### 📊 Incident Analytics
```http
GET /api/v1/emergency-procedures/api/incidents/analytics/
```

**Query Parameters:**
- `period` (optional): daily, weekly, monthly, yearly
- `start_date` (optional): Analysis start date
- `end_date` (optional): Analysis end date

**Response:**
```json
{
  "total_incidents": 156,
  "by_type": {
    "SPILL": 45,
    "FIRE": 12,
    "EXPOSURE": 8,
    "TRANSPORT_ACCIDENT": 91
  },
  "by_severity": {
    "LOW": 89,
    "MEDIUM": 42,
    "HIGH": 21,
    "CRITICAL": 4
  },
  "average_response_time_minutes": 16.5,
  "resolution_rate": 0.94,
  "trends": {
    "incidents_this_month": 12,
    "incidents_last_month": 8,
    "change_percentage": 50.0
  }
}
```

#### **Emergency Contacts**

##### 📋 List Emergency Contacts
```http
GET /api/v1/emergency-procedures/api/contacts/
```

**Query Parameters:**
- `contact_type` (optional): EMERGENCY_SERVICES, COMPANY_EMERGENCY, SPECIALIST_TEAM
- `location` (optional): Geographic area filter
- `is_verified` (optional): true/false
- `available_24_7` (optional): true/false

##### 🔍 Location-Based Contact Search
```http
GET /api/v1/emergency-procedures/api/contacts/search-by-location/
```

**Query Parameters:**
- `latitude` (required): Location latitude
- `longitude` (required): Location longitude
- `radius_km` (optional): Search radius in kilometers (default: 50)
- `contact_type` (optional): Filter by contact type

**Response:**
```json
{
  "location": {"lat": -37.8136, "lng": 144.9631},
  "radius_km": 50,
  "contacts": [
    {
      "id": "uuid",
      "name": "Melbourne Fire Brigade",
      "contact_type": "EMERGENCY_SERVICES",
      "phone": "000",
      "email": "emergency@mfb.vic.gov.au",
      "address": "Fire Station 1, Melbourne",
      "distance_km": 5.2,
      "available_24_7": true,
      "specialties": ["HAZMAT", "FIRE_SUPPRESSION"],
      "response_time_minutes": 8
    }
  ]
}
```

---

## 🔍 **Unified Search API**

### Base URL: `/api/v1/search/`

#### **Unified Search**

##### 🔍 Multi-Type Search
```http
GET /api/v1/search/api/
```

**Query Parameters:**
- `q` (required): Search query
- `type` (optional): all, dangerous_goods, sds, procedures (default: all)
- `limit` (optional): Results per page (default: 20, max: 100)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "query": "lithium battery",
  "total_results": 47,
  "search_time_ms": 156,
  "results": {
    "dangerous_goods": [
      {
        "id": "uuid",
        "un_number": "UN3480",
        "proper_shipping_name": "Lithium metal batteries",
        "hazard_class": "9",
        "relevance_score": 0.95,
        "highlight": "Lithium metal <em>batteries</em> packed with equipment"
      }
    ],
    "sds": [
      {
        "id": "uuid",
        "product_name": "Lithium Ion Battery Pack",
        "manufacturer": "BatteryCorp",
        "relevance_score": 0.87,
        "highlight": "<em>Lithium</em> ion <em>battery</em> safety data sheet"
      }
    ],
    "procedures": [
      {
        "id": "uuid",
        "title": "Lithium Battery Fire Response",
        "emergency_type": "FIRE",
        "relevance_score": 0.82,
        "highlight": "Emergency response for <em>lithium battery</em> fires"
      }
    ]
  },
  "facets": {
    "hazard_classes": {"9": 15, "3": 8},
    "emergency_types": {"FIRE": 5, "SPILL": 2}
  }
}
```

##### 💡 Search Suggestions
```http
GET /api/v1/search/api/suggestions/
```

**Query Parameters:**
- `q` (required): Partial search query
- `limit` (optional): Number of suggestions (default: 10)
- `type` (optional): Filter suggestions by type

**Response:**
```json
{
  "query": "lith",
  "suggestions": [
    {
      "text": "lithium battery",
      "type": "dangerous_goods",
      "frequency": 156,
      "category": "UN3480"
    },
    {
      "text": "lithium metal",
      "type": "dangerous_goods", 
      "frequency": 89,
      "category": "UN3420"
    },
    {
      "text": "lithium fire response",
      "type": "procedures",
      "frequency": 23,
      "category": "emergency_procedures"
    }
  ]
}
```

##### 📊 Search Analytics
```http
GET /api/v1/search/api/analytics/
```

**Query Parameters:**
- `period` (optional): daily, weekly, monthly (default: daily)
- `start_date` (optional): Analytics start date
- `end_date` (optional): Analytics end date

**Response:**
```json
{
  "period": "daily",
  "total_searches": 1247,
  "unique_users": 89,
  "average_response_time_ms": 145,
  "top_queries": [
    {"query": "lithium battery", "count": 67},
    {"query": "flammable liquid", "count": 45},
    {"query": "class 9 dangerous goods", "count": 23}
  ],
  "search_types": {
    "dangerous_goods": 45.2,
    "sds": 32.1,
    "procedures": 22.7
  },
  "performance_metrics": {
    "cache_hit_rate": 0.78,
    "elasticsearch_availability": 0.99,
    "average_results_per_query": 12.3
  }
}
```

---

## 📁 **File Upload API**

### Base URL: `/api/v1/documents/api/files/`

#### **File Upload Operations**

##### 📤 Single File Upload
```http
POST /api/v1/documents/api/files/upload/
Content-Type: multipart/form-data
```

**Form Data:**
- `file` (required): File to upload
- `document_type` (required): DG_MANIFEST, SDS, INVOICE, SHIPPING_LABEL, INSPECTION_REPORT, TRAINING_CERTIFICATE, COMPLIANCE_DOCUMENT
- `description` (optional): File description
- `tags` (optional): JSON array of tags
- `company` (optional): Company UUID (auto-assigned if not provided)

**Response:**
```json
{
  "id": "uuid",
  "file_name": "manifest_12345.pdf",
  "file_size": 2457600,
  "document_type": "DG_MANIFEST",
  "description": "Manifest for Shipment #12345",
  "upload_status": "COMPLETED",
  "storage_backend": "S3",
  "file_url": "https://s3.amazonaws.com/bucket/path/to/file.pdf",
  "validation_results": {
    "is_valid": true,
    "file_type_valid": true,
    "virus_scan_clean": true,
    "size_within_limits": true
  },
  "metadata": {
    "content_type": "application/pdf",
    "encoding": "utf-8",
    "pages": 5
  },
  "uploaded_at": "2024-01-15T10:30:00Z",
  "uploaded_by": "user_uuid"
}
```

##### 📤 Bulk File Upload
```http
POST /api/v1/documents/api/files/bulk-upload/
Content-Type: multipart/form-data
```

**Form Data:**
- `files` (required): Multiple files
- `document_type` (required): Document type for all files
- `description` (optional): Description for all files
- `auto_extract_metadata` (optional): true/false (default: true)

**Response:**
```json
{
  "upload_session_id": "session_uuid",
  "total_files": 5,
  "successful_uploads": 4,
  "failed_uploads": 1,
  "results": [
    {
      "file_name": "manifest1.pdf",
      "status": "SUCCESS",
      "document_id": "uuid"
    },
    {
      "file_name": "corrupt_file.pdf",
      "status": "FAILED",
      "error": "File is corrupted or unreadable"
    }
  ],
  "total_size_bytes": 12345678,
  "processing_time_seconds": 15.4
}
```

##### 📥 File Download
```http
GET /api/v1/documents/api/files/{document_id}/download/
```

**Query Parameters:**
- `disposition` (optional): inline, attachment (default: attachment)
- `format` (optional): original, pdf, thumbnail (default: original)

**Response:**
- **Success**: File stream with appropriate headers
- **Headers**: Content-Type, Content-Disposition, Content-Length
- **Error**: 404 if not found, 403 if no permission

##### 📊 Upload Progress
```http
GET /api/v1/documents/api/files/upload-progress/{session_id}/
```

**Response:**
```json
{
  "session_id": "session_uuid",
  "status": "IN_PROGRESS",
  "total_files": 10,
  "processed_files": 7,
  "current_file": "manifest_08.pdf",
  "progress_percentage": 70.0,
  "estimated_completion": "2024-01-15T10:35:00Z",
  "errors": [
    {
      "file_name": "invalid_file.txt",
      "error": "Unsupported file type"
    }
  ]
}
```

##### 📊 Storage Statistics
```http
GET /api/v1/documents/api/files/storage-stats/
```

**Response:**
```json
{
  "total_files": 15678,
  "total_size_bytes": 5234567890,
  "total_size_human": "4.87 GB",
  "by_document_type": {
    "DG_MANIFEST": {"count": 5234, "size_bytes": 2345678901},
    "SDS": {"count": 7890, "size_bytes": 1876543210},
    "INVOICE": {"count": 2554, "size_bytes": 1012345779}
  },
  "by_storage_backend": {
    "S3": {"count": 14567, "size_bytes": 4890123456},
    "LOCAL": {"count": 1111, "size_bytes": 344444434}
  },
  "upload_trends": {
    "files_this_month": 567,
    "files_last_month": 423,
    "size_this_month_bytes": 345678901
  }
}
```

#### **File Management**

##### 📋 List Documents
```http
GET /api/v1/documents/api/files/
```

**Query Parameters:**
- `document_type` (optional): Filter by document type
- `uploaded_by` (optional): Filter by uploader
- `date_from` (optional): Filter from upload date
- `date_to` (optional): Filter to upload date
- `search` (optional): Search in file name and description
- `tags` (optional): Filter by tags (comma-separated)

##### 🔄 Document Processing Status
```http
GET /api/v1/documents/api/files/{document_id}/processing-status/
```

**Response:**
```json
{
  "document_id": "uuid",
  "processing_status": "COMPLETED",
  "stages": {
    "upload": {"status": "COMPLETED", "timestamp": "2024-01-15T10:30:00Z"},
    "virus_scan": {"status": "COMPLETED", "timestamp": "2024-01-15T10:30:15Z"},
    "metadata_extraction": {"status": "COMPLETED", "timestamp": "2024-01-15T10:30:30Z"},
    "content_analysis": {"status": "COMPLETED", "timestamp": "2024-01-15T10:31:00Z"}
  },
  "extracted_data": {
    "text_content": "Document text...",
    "detected_un_numbers": ["UN1203", "UN1090"],
    "manifest_items": 15,
    "total_weight_kg": 2500
  },
  "warnings": [
    "Some text may be OCR-approximated due to image quality"
  ]
}
```

---

## 👥 **User Management API**

### Base URL: `/api/v1/users/`

#### **User Operations**

##### 📋 List Users
```http
GET /api/v1/users/
```

**Query Parameters:**
- `role` (optional): Filter by user role
- `is_active` (optional): true/false
- `search` (optional): Search in username, email, name
- `company` (optional): Filter by company

**Permission**: Admin only (regular users see only themselves)

##### 👤 Get Current User Profile
```http
GET /api/v1/users/me/
```

**Response:**
```json
{
  "id": "uuid",
  "username": "john.doe",
  "email": "john.doe@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "OPERATOR",
  "role_display": "Operator",
  "is_active": true,
  "is_staff": false,
  "last_login": "2024-01-15T09:30:00Z",
  "date_joined": "2024-01-01T10:00:00Z",
  "company": {
    "id": "uuid",
    "name": "Transport Solutions Ltd"
  },
  "permissions": [
    "shipments.view.all",
    "vehicle.view",
    "sds.library.view"
  ]
}
```

##### 👤 Create User
```http
POST /api/v1/users/
```

**Request Body:**
```json
{
  "username": "jane.smith",
  "password": "SecurePass123!",
  "password2": "SecurePass123!",
  "email": "jane.smith@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "DRIVER",
  "is_active": true
}
```

**Permission**: Admin only

##### ✏️ Update User
```http
PUT /api/v1/users/{id}/
PATCH /api/v1/users/{id}/
```

**Request Body:**
```json
{
  "email": "jane.smith.new@example.com",
  "first_name": "Jane",
  "last_name": "Smith-Johnson",
  "role": "OPERATOR",
  "is_active": true
}
```

**Permission**: Admin or self (limited fields for self)

---

## 🧪 **Dangerous Goods API**

### Base URL: `/api/v1/dangerous-goods/`

#### **Dangerous Goods Operations**

##### 📋 List Dangerous Goods
```http
GET /api/v1/dangerous-goods/
```

**Query Parameters:**
- `search` (optional): Search UN number, proper shipping name, synonyms
- `hazard_class` (optional): Filter by hazard class (1-9)
- `packing_group` (optional): I, II, III
- `marine_pollutant` (optional): true/false
- `limited_quantity` (optional): true/false

**Response:**
```json
{
  "count": 3456,
  "results": [
    {
      "id": "uuid",
      "un_number": "UN1203",
      "proper_shipping_name": "Gasoline",
      "hazard_class": "3",
      "subsidiary_risk": null,
      "packing_group": "II",
      "marine_pollutant": false,
      "limited_quantity": true,
      "tunnel_code": "D/E",
      "special_provisions": ["144", "177", "640C"]
    }
  ]
}
```

##### 🔍 Dangerous Good Details
```http
GET /api/v1/dangerous-goods/{id}/
```

**Response:**
```json
{
  "id": "uuid",
  "un_number": "UN1203",
  "proper_shipping_name": "Gasoline",
  "synonyms": ["Petrol", "Motor spirit"],
  "hazard_class": "3",
  "subsidiary_risk": null,
  "packing_group": "II",
  "marine_pollutant": false,
  "limited_quantity": true,
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
    "emergency_info": "EmS F-E, S-E"
  }
}
```

##### 🔍 Lookup by Synonym
```http
GET /api/v1/dangerous-goods/lookup-by-synonym/
```

**Query Parameters:**
- `synonym` (required): Alternative name to search
- `fuzzy` (optional): true/false (enable fuzzy matching)

**Response:**
```json
{
  "synonym": "petrol",
  "matches": [
    {
      "id": "uuid",
      "un_number": "UN1203",
      "proper_shipping_name": "Gasoline",
      "match_confidence": 0.95,
      "synonym_matched": "Petrol"
    }
  ]
}
```

##### ✅ Check Compatibility
```http
POST /api/v1/dangerous-goods/check-compatibility/
```

**Request Body:**
```json
{
  "un_numbers": ["UN1203", "UN1090", "UN1381"]
}
```

**Response:**
```json
{
  "is_compatible": false,
  "total_combinations_checked": 3,
  "conflicts": [
    {
      "un_number_1": "UN1203",
      "un_number_2": "UN1381",
      "hazard_class_1": "3",
      "hazard_class_2": "4.2",
      "reason": "Class 3 Flammable Liquids are incompatible with Class 4.2 Spontaneously Combustible materials.",
      "segregation_code": "X",
      "notes": "Complete segregation required"
    }
  ],
  "compatible_pairs": [
    {
      "un_number_1": "UN1203",
      "un_number_2": "UN1090",
      "segregation_requirement": "Separate from"
    }
  ],
  "recommendations": [
    "Separate UN1203 and UN1381 by at least 3 meters",
    "Consider separate transport vehicles"
  ]
}
```

---

## 🚛 **Shipment Management API**

### Base URL: `/api/v1/shipments/`

#### **Shipment Operations**

##### 📋 List Shipments
```http
GET /api/v1/shipments/
```

**Query Parameters:**
- `status` (optional): PENDING, IN_TRANSIT, DELIVERED, CANCELLED
- `origin` (optional): Filter by origin location
- `destination` (optional): Filter by destination location
- `driver` (optional): Filter by assigned driver
- `date_from` (optional): Filter from shipment date
- `date_to` (optional): Filter to shipment date
- `has_dangerous_goods` (optional): true/false

##### 📝 Create Shipment
```http
POST /api/v1/shipments/
```

**Request Body:**
```json
{
  "shipment_number": "SH-2024-001",
  "origin": "location_uuid",
  "destination": "location_uuid",
  "scheduled_pickup": "2024-01-20T08:00:00Z",
  "scheduled_delivery": "2024-01-20T16:00:00Z",
  "assigned_driver": "driver_uuid",
  "assigned_vehicle": "vehicle_uuid",
  "consignment_items": [
    {
      "dangerous_good": "dg_uuid",
      "quantity": 10,
      "unit": "CARTONS",
      "net_weight_kg": 50.5,
      "gross_weight_kg": 55.0
    }
  ],
  "special_instructions": "Handle with care - fragile packaging"
}
```

##### 🔄 Update Shipment Status
```http
PATCH /api/v1/shipments/{id}/
```

**Request Body:**
```json
{
  "status": "IN_TRANSIT",
  "actual_pickup": "2024-01-20T08:15:00Z",
  "current_location": "location_uuid",
  "notes": "Pickup completed, en route to destination"
}
```

---

## 🏢 **Company Management API**

### Base URL: `/api/v1/companies/`

#### **Company Operations**

##### 📋 List Companies
```http
GET /api/v1/companies/
```

**Permission**: Admin only

##### 🏢 Get Company Details
```http
GET /api/v1/companies/{id}/
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Transport Solutions Ltd",
  "abn": "12345678901",
  "address": "123 Transport St, Melbourne VIC 3000",
  "contact_person": "John Manager",
  "email": "contact@transportsolutions.com.au",
  "phone": "+61 3 9876 5432",
  "license_number": "DG-VIC-12345",
  "license_expiry": "2025-12-31",
  "insurance_details": {
    "provider": "Transport Insurance Co",
    "policy_number": "TIC-789456",
    "coverage_amount": 5000000,
    "expiry_date": "2025-06-30"
  },
  "created_at": "2024-01-01T00:00:00Z",
  "is_active": true
}
```

---

## 🚗 **Vehicle Management API**

### Base URL: `/api/v1/vehicles/`

#### **Vehicle Operations**

##### 📋 List Vehicles
```http
GET /api/v1/vehicles/
```

**Query Parameters:**
- `vehicle_type` (optional): TRUCK, VAN, TRAILER
- `is_active` (optional): true/false
- `assigned_driver` (optional): Filter by driver
- `company` (optional): Filter by company
- `dg_approved` (optional): true/false

##### 🚗 Get Vehicle Details
```http
GET /api/v1/vehicles/{id}/
```

**Response:**
```json
{
  "id": "uuid",
  "registration_number": "ABC123",
  "vehicle_type": "TRUCK",
  "make": "Mercedes",
  "model": "Actros",
  "year": 2023,
  "vin": "WDB9630001234567",
  "max_gross_weight_kg": 42000,
  "tare_weight_kg": 15000,
  "dangerous_goods_approved": true,
  "dg_license_number": "DG-VIC-V-789",
  "dg_license_expiry": "2025-03-15",
  "safety_equipment": [
    {
      "equipment_type": "FIRE_EXTINGUISHER",
      "description": "2kg Dry Chemical",
      "last_inspection": "2024-01-01",
      "next_inspection": "2024-07-01",
      "status": "SERVICEABLE"
    }
  ],
  "assigned_driver": "driver_uuid",
  "company": "company_uuid",
  "is_active": true
}
```

---

## 📊 **Analytics API**

### Base URL: `/api/v1/analytics/`

#### **Dashboard Analytics**

##### 📊 Dashboard Stats
```http
GET /api/v1/analytics/dashboard-stats/
```

**Response:**
```json
{
  "total_shipments": 1247,
  "active_shipments": 89,
  "completed_shipments": 1158,
  "total_dangerous_goods_transported": 15678,
  "compliance_rate": 0.987,
  "active_vehicles": 45,
  "active_drivers": 78,
  "incidents_this_month": 2,
  "average_delivery_time_hours": 8.5,
  "revenue_this_month": 567890.50,
  "trends": {
    "shipments_vs_last_month": 12.5,
    "compliance_vs_last_month": 2.1,
    "incidents_vs_last_month": -25.0
  }
}
```

##### 📈 Performance Metrics
```http
GET /api/v1/analytics/performance/
```

**Query Parameters:**
- `period` (optional): daily, weekly, monthly, yearly
- `start_date` (optional): Analysis start date
- `end_date` (optional): Analysis end date
- `company` (optional): Filter by company

**Response:**
```json
{
  "period": "monthly",
  "metrics": {
    "on_time_delivery_rate": 0.94,
    "average_transit_time_hours": 8.2,
    "fuel_efficiency_km_per_liter": 3.2,
    "vehicle_utilization_rate": 0.78,
    "driver_efficiency_score": 0.89,
    "customer_satisfaction_score": 4.6
  },
  "trends": [
    {
      "date": "2024-01-01",
      "on_time_delivery_rate": 0.92,
      "total_shipments": 156
    }
  ]
}
```

---

## 🔒 **Authentication API**

### Base URL: `/api/v1/auth/`

#### **Authentication Operations**

##### 🔐 Login
```http
POST /api/v1/auth/login/
```

**Request Body:**
```json
{
  "username": "john.doe",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "username": "john.doe",
    "email": "john.doe@example.com",
    "role": "OPERATOR",
    "permissions": ["shipments.view.all", "vehicle.view"]
  }
}
```

##### 🔄 Refresh Token
```http
POST /api/v1/auth/refresh/
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

##### 🚪 Logout
```http
POST /api/v1/auth/logout/
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## ❌ **Error Responses**

### Standard Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request data is invalid",
    "details": {
      "field_name": ["This field is required"],
      "another_field": ["Enter a valid email address"]
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req_abc123"
}
```

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **204**: No Content
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **422**: Validation Error
- **429**: Rate Limited
- **500**: Internal Server Error

---

## 📝 **Notes**

### Rate Limiting
- **Default**: 100 requests per minute per user
- **Bulk operations**: 10 requests per minute
- **File uploads**: 5 uploads per minute

### Pagination
- **Default page size**: 20 items
- **Maximum page size**: 100 items
- **Use**: `?page=2` or `?offset=20&limit=20`

### Filtering & Searching
- **Text search**: Use `search` parameter for full-text search
- **Date filters**: Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)
- **Boolean filters**: Use `true`/`false` (case insensitive)

---

**Built for Safety. Optimized for Compliance. Designed for Scale.**

*This comprehensive API reference enables developers to build robust integrations with the SafeShipper platform, ensuring safe and compliant dangerous goods transportation operations.*