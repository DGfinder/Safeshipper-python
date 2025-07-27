# SafeShipper Backend API

![Django](https://img.shields.io/badge/Django-5.2-green)
![DRF](https://img.shields.io/badge/DRF-3.15-blue)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)

**Enterprise-grade backend API for dangerous goods logistics management.**

The SafeShipper backend is a comprehensive Django REST Framework application designed specifically for dangerous goods transport operations, emergency response management, and regulatory compliance in the logistics industry.

## 🚀 Key Features

### 🎯 **Dangerous Goods Specialization**
- **Emergency Procedures Management**: ADG-compliant emergency response procedures
- **Incident Tracking**: Real-time emergency incident management with GPS coordinates
- **Safety Data Sheet (SDS) Management**: Comprehensive SDS handling and AI extraction
- **Dangerous Goods Compatibility**: Real-time chemical compatibility analysis
- **Regulatory Compliance**: Full ADG (Australian Dangerous Goods) Code compliance

### ⚡ **Advanced API Systems**
- **Unified Search API**: Elasticsearch-powered search across all safety data
- **File Upload System**: Multi-storage backend support (S3, MinIO, Local)
- **Real-time Communication**: WebSocket integration for live updates
- **Document Processing**: OCR and intelligent document extraction
- **Analytics Engine**: Comprehensive reporting and insights

### 🏢 **Enterprise Features**
- **Multi-tenant Architecture**: Company-based data segregation
- **Role-based Access Control**: Granular permissions system
- **API Gateway**: Rate limiting, versioning, and monitoring
- **Background Processing**: Celery-based task queue system
- **Comprehensive Auditing**: Full audit trail for all operations

## 🏗️ **Technical Architecture**

```
SafeShipper Backend Architecture
├── 🌐 Django REST Framework
│   ├── API Gateway & Versioning
│   ├── Permission-based ViewSets
│   ├── Comprehensive Serialization
│   └── OpenAPI Documentation
│
├── 📊 Data Layer
│   ├── PostgreSQL + PostGIS (Spatial data)
│   ├── Redis (Caching & Sessions)
│   ├── Elasticsearch (Search & Analytics)
│   └── Multi-storage (S3/MinIO/Local)
│
├── 🔧 Processing Layer
│   ├── Celery (Background tasks)
│   ├── OCR & Document Processing
│   ├── AI-powered Data Extraction
│   └── Real-time WebSocket updates
│
├── 🛡️ Security Layer
│   ├── JWT Authentication
│   ├── Role-based Permissions
│   ├── API Rate Limiting
│   └── Input Validation
│
└── 🚀 Infrastructure
    ├── Docker Containerization
    ├── Health Monitoring
    ├── Logging & Metrics
    └── CI/CD Integration
```

## 🚀 **Quick Start**

### Prerequisites
- **Python 3.11+** with pip
- **PostgreSQL 16+** with PostGIS extension
- **Redis 7+** for caching and sessions
- **Docker & Docker Compose** (recommended)

### Docker Setup (Recommended)

```bash
# 1. Clone and navigate
git clone <repository>
cd backend

# 2. Environment setup
cp .env.example .env
# Edit .env with your configuration

# 3. Start with Docker Compose
docker-compose up -d

# 4. Run migrations
docker-compose exec backend python manage.py migrate

# 5. Create superuser
docker-compose exec backend python manage.py createsuperuser

# 6. Load sample data (optional)
docker-compose exec backend python manage.py loaddata fixtures/sample_data.json
```

**🎉 API Ready at:** `http://localhost:8000/api/v1/`  
**📚 API Documentation:** `http://localhost:8000/api/docs/`

### Local Development Setup

```bash
# 1. Virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Database setup
createdb safeshipper
python manage.py migrate

# 4. Create superuser
python manage.py createsuperuser

# 5. Start development server
python manage.py runserver
```

## 📁 **Project Structure**

```
backend/
├── safeshipper_core/          # Core Django project
│   ├── settings/              # Environment-specific settings
│   ├── urls.py               # Main URL configuration
│   ├── wsgi.py & asgi.py     # WSGI/ASGI applications
│   └── middleware.py         # Custom middleware
│
├── apps/                      # Application modules
│   ├── emergency_procedures/  # Emergency response system
│   │   ├── models.py         # Emergency models
│   │   ├── views.py          # API views & ViewSets
│   │   ├── serializers.py    # Data serialization
│   │   ├── permissions.py    # Access control
│   │   └── urls.py           # URL routing
│   │
│   ├── search/               # Unified search system
│   │   ├── views.py          # Search API endpoints
│   │   ├── services.py       # Search coordination
│   │   └── urls.py           # Search routing
│   │
│   ├── documents/            # File upload & management
│   │   ├── models.py         # Document models
│   │   ├── file_upload_views.py # File upload APIs
│   │   ├── storage_backends.py  # Storage integration
│   │   └── urls.py           # File API routing
│   │
│   ├── dangerous_goods/      # DG management
│   ├── sds/                  # Safety Data Sheets
│   ├── shipments/            # Shipment tracking
│   ├── users/                # User management
│   ├── vehicles/             # Fleet management
│   ├── tracking/             # GPS tracking
│   ├── communications/       # Real-time communication
│   └── audits/               # Audit system
│
├── storage/                   # File storage backends
├── tasks/                     # Celery background tasks
├── tests/                     # Test suites
└── requirements/              # Dependencies
```

## 🌟 **API Systems Overview**

### Emergency Procedures API
**Endpoints**: `/api/v1/emergency-procedures/`

Complete emergency response management system:
- **Procedures**: ADG-compliant emergency procedures
- **Incidents**: Real-time incident tracking with analytics
- **Contacts**: Emergency contact management with verification

```python
# Example: Get emergency procedures for Class 3 hazards
GET /api/v1/emergency-procedures/api/procedures/?hazard_class=3

# Example: Report new incident
POST /api/v1/emergency-procedures/api/incidents/
{
    "emergency_type": "SPILL",
    "description": "Chemical spill on Highway 1",
    "location": "Highway 1, KM 45",
    "coordinates": {"lat": -37.8136, "lng": 144.9631},
    "severity_level": "HIGH"
}
```

### Unified Search API
**Endpoints**: `/api/v1/search/`

Elasticsearch-powered search across all safety data:
- **Multi-type Search**: Dangerous goods, SDS, procedures
- **Auto-complete**: Smart suggestions and completions
- **Analytics**: Search performance and usage statistics

```python
# Example: Search dangerous goods and SDS
GET /api/v1/search/api/?q=lithium+battery&type=all

# Example: Get search suggestions
GET /api/v1/search/api/suggestions/?q=lith&limit=10
```

### File Upload API
**Endpoints**: `/api/v1/documents/api/files/`

Comprehensive file management with multi-storage support:
- **Single Upload**: Secure file upload with validation
- **Bulk Upload**: Multiple file processing
- **Download**: Secure file access with permissions

```python
# Example: Upload manifest document
POST /api/v1/documents/api/files/upload/
Content-Type: multipart/form-data
{
    "file": <file_data>,
    "document_type": "DG_MANIFEST",
    "description": "Manifest for Shipment #12345"
}

# Example: Download with access control
GET /api/v1/documents/api/files/{document_id}/download/
```

## 🔧 **Development Workflow**

### Available Management Commands

```bash
# Database & Migrations
python manage.py makemigrations
python manage.py migrate
python manage.py loaddata fixtures/sample_data.json

# Search Index Management
python manage.py search_index --rebuild
python manage.py update_search_indexes

# Background Tasks
python manage.py celery worker --loglevel=info
python manage.py celery beat --loglevel=info

# Testing
python manage.py test
python manage.py test --settings=safeshipper_core.settings.test

# Production Utilities
python manage.py collectstatic
python manage.py check --deploy
python manage.py migrate --check
```

### Code Quality & Testing

```bash
# Code formatting
black .
isort .

# Linting
flake8
pylint safeshipper_core/

# Security checks
bandit -r .
safety check

# Type checking
mypy .

# Test coverage
coverage run --source='.' manage.py test
coverage report
coverage html
```

## 🛡️ **Security Features**

### Authentication & Authorization
- **JWT Tokens**: Secure API authentication
- **Role-based Permissions**: Granular access control
- **Multi-factor Authentication**: OTP support
- **Session Management**: Secure session handling

### API Security
- **Rate Limiting**: API throttling and quota management
- **Input Validation**: Comprehensive data validation
- **CORS Protection**: Cross-origin request security
- **SQL Injection Prevention**: Parameterized queries

### Data Protection
- **Encryption at Rest**: Database and file encryption
- **Secure File Upload**: Virus scanning and validation
- **Audit Logging**: Complete activity tracking
- **Data Anonymization**: GDPR compliance features

## 📊 **Performance & Monitoring**

### Caching Strategy
- **Redis**: Application-level caching
- **Database Query Optimization**: Efficient ORM usage
- **Search Caching**: Elasticsearch result caching
- **File Storage Optimization**: CDN integration

### Monitoring & Metrics
- **Health Checks**: Application health monitoring
- **Performance Metrics**: API response time tracking
- **Error Tracking**: Comprehensive error logging
- **Usage Analytics**: API usage statistics

## 🚀 **Production Deployment**

### Docker Production Setup

```dockerfile
# Multi-stage production build
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim as runner
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY . /app
WORKDIR /app
EXPOSE 8000
CMD ["gunicorn", "safeshipper_core.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### Environment Configuration

```bash
# Production environment variables
DEBUG=False
SECRET_KEY=your-secure-secret-key
DATABASE_URL=postgres://user:pass@localhost/safeshipper
REDIS_URL=redis://localhost:6379/0
ELASTICSEARCH_HOST=localhost:9200
AWS_STORAGE_BUCKET_NAME=safeshipper-production
CELERY_BROKER_URL=redis://localhost:6379/1
```

### Health & Monitoring

```python
# Health check endpoint
GET /health/
Response: {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "services": {
        "database": "healthy",
        "redis": "healthy",
        "elasticsearch": "healthy"
    }
}
```

## 📚 **API Documentation**

### Interactive Documentation
- **Swagger UI**: `/api/docs/` - Interactive API explorer
- **ReDoc**: `/api/redoc/` - API reference documentation
- **OpenAPI Schema**: `/api/schema/` - Machine-readable API spec

### Key Documentation Files
- **[API_ENDPOINTS_REFERENCE.md](./docs/API_ENDPOINTS_REFERENCE.md)**: Complete endpoint reference
- **[EMERGENCY_PROCEDURES_API.md](./docs/EMERGENCY_PROCEDURES_API.md)**: Emergency system documentation
- **[SEARCH_API.md](./docs/SEARCH_API.md)**: Search system reference
- **[FILE_UPLOAD_API.md](./docs/FILE_UPLOAD_API.md)**: File management documentation

## 🤝 **Contributing**

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Set up development environment
4. Make changes with comprehensive tests
5. Run quality checks: `flake8 && python manage.py test`
6. Submit pull request

### Code Review Checklist
- [ ] Comprehensive test coverage (>90%)
- [ ] API documentation updated
- [ ] Security considerations addressed
- [ ] Performance impact evaluated
- [ ] Migration scripts provided
- [ ] Error handling implemented
- [ ] Logging statements added

---

**Built for Safety. Designed for Scale. Optimized for Compliance.**

*The SafeShipper backend API delivers enterprise-grade performance and security for dangerous goods logistics operations worldwide.*