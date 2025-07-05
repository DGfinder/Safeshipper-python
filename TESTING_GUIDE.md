# SafeShipper Enterprise Features - Testing Guide

## Overview

This guide covers the comprehensive test suite for the enterprise features implemented in the SafeShipper platform, including audit trails, document generation, and enhanced public tracking.

## Test Structure

### Test Coverage Areas

1. **Audit Trail System**
   - Model creation and relationships
   - Automatic audit capture via Django signals
   - API endpoints with role-based permissions
   - Search, filtering, and export functionality

2. **Document Generation & Management**
   - PDF generation using WeasyPrint
   - Document upload and validation
   - Document access controls and permissions
   - Batch document generation with ZIP downloads

3. **Enhanced Public Tracking**
   - Public shipment tracking API
   - Document download functionality
   - Communication logs integration
   - Proof of delivery features

## Test Categories

### Unit Tests
Focus on individual components and models:

- `audits.tests.AuditModelsTestCase`
- `audits.tests.AuditSignalsTestCase`
- `documents.tests.DocumentModelsTestCase`
- `documents.tests.PDFGeneratorTestCase`
- `tracking.tests.TrackingModelsTestCase`

### API Tests
Test REST API endpoints and authentication:

- `audits.tests.AuditAPITestCase`
- `documents.tests.DocumentAPITestCase`
- `tracking.tests.PublicTrackingAPITestCase`
- `tracking.tests.PublicDocumentDownloadTestCase`
- `tracking.tests.PublicDeliveryTimelineTestCase`

### Integration Tests
Test complete workflows and system interactions:

- `audits.tests.AuditIntegrationTestCase`
- `documents.tests.DocumentIntegrationTestCase`
- `tracking.tests.TrackingIntegrationTestCase`

## Running Tests

### Quick Start

```bash
# Run all enterprise tests
python backend/run_enterprise_tests.py

# Run with verbose output and coverage
python backend/run_enterprise_tests.py --verbose --coverage

# Run specific apps only
python backend/run_enterprise_tests.py --apps=audits,documents

# Run specific test categories
python backend/run_enterprise_tests.py --categories=unit
```

### Standard Django Test Commands

```bash
# Run all tests for specific apps
python manage.py test audits documents tracking

# Run specific test class
python manage.py test audits.tests.AuditModelsTestCase

# Run with coverage
coverage run --source='.' manage.py test audits documents tracking
coverage report
coverage html
```

### Test Runner Options

| Option | Description |
|--------|-------------|
| `--verbose` | Enable detailed test output |
| `--coverage` | Run with coverage analysis |
| `--failfast` | Stop on first test failure |
| `--apps` | Test specific apps only |
| `--categories` | Run specific test categories |
| `--report` | Generate detailed test report |
| `--list-tests` | List available tests |

## Test Configuration

### Required Settings

Ensure these settings are configured for testing:

```python
# settings/test.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Use in-memory file storage for tests
DEFAULT_FILE_STORAGE = 'django.core.files.storage.InMemoryStorage'

# Disable migrations for faster tests
class DisableMigrations:
    def __contains__(self, item):
        return True
    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()
```

### Test Data Setup

Tests use factories and fixtures for consistent data:

```python
# Example test setup
def setUp(self):
    self.user = User.objects.create_user(
        username='testuser',
        email='test@test.com',
        password='testpass123',
        role='ADMIN'
    )
    
    self.shipment = Shipment.objects.create(
        tracking_number='TEST-001',
        customer=self.user,
        origin_location='Sydney',
        destination_location='Melbourne',
        status='PENDING'
    )
```

## Key Test Cases

### Audit Trail Tests

#### Model Tests
- Audit log creation with all required fields
- Proper foreign key relationships
- String representations
- Cascade deletion behavior

#### Signal Tests
- Automatic audit creation on model changes
- Proper serialization of model data
- Context capture (user, IP, user agent)
- Thread-local storage functionality

#### API Tests
- Role-based access control
- Search and filtering
- Date range filtering
- Export functionality
- Pagination

### Document Generation Tests

#### PDF Generation Tests
- WeasyPrint integration
- Template rendering
- Context preparation
- Error handling
- Batch generation

#### Document Management Tests
- File upload and validation
- Document approval workflow
- Access permissions
- Download functionality
- Public/private document access

### Public Tracking Tests

#### Public API Tests
- Unauthenticated access
- Data minimization (no sensitive data exposure)
- Tracking number validation
- Error handling for invalid tracking numbers

#### Enhanced Features Tests
- Document list and download links
- Communication logs (customer-visible only)
- Proof of delivery display
- Items summary information

## Security Testing

### Authentication & Authorization
- Unauthenticated access properly blocked
- Role-based permissions enforced
- User can only access own data (where applicable)

### Data Exposure
- Sensitive data not exposed in public APIs
- Proper field filtering in audit logs
- Customer data minimization in public tracking

### File Security
- File type validation
- Upload size limits
- Secure file serving
- Proper file cleanup

## Performance Testing

### Database Performance
- Efficient queries with proper indexing
- Bulk operations for large datasets
- Pagination for large result sets

### File Operations
- PDF generation performance
- File upload handling
- Batch document generation

## Mocking and Test Doubles

### External Dependencies
```python
@patch('weasyprint.HTML')
def test_pdf_generation(self, mock_html):
    mock_html.return_value.write_pdf.return_value = b'test pdf'
    # Test implementation
```

### Django Components
```python
@patch('audits.signals._audit_context')
def test_signal_handling(self, mock_context):
    mock_context.user = self.user
    # Test implementation
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Enterprise Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install coverage
      - name: Run tests
        run: |
          cd backend
          python run_enterprise_tests.py --coverage --verbose
      - name: Upload coverage
        uses: codecov/codecov-action@v1
```

## Test Maintenance

### Adding New Tests
1. Create test class inheriting from appropriate Django test class
2. Follow naming convention: `Test<Feature><Type>TestCase`
3. Include docstrings for test methods
4. Use descriptive test method names
5. Update test runner configuration if needed

### Test Data Management
- Use Django fixtures for complex test data
- Create factory classes for repeated test objects
- Clean up test data in `tearDown()` methods
- Use `@override_settings` for test-specific configuration

### Coverage Goals
- Maintain >90% code coverage for enterprise features
- 100% coverage for critical security functions
- Test both success and failure scenarios
- Include edge cases and error conditions

## Debugging Tests

### Common Issues
- Database state persistence between tests
- File cleanup in document tests
- Mocking external services
- Timezone-related test failures

### Debugging Tools
```bash
# Run specific test with debugging
python manage.py test audits.tests.AuditModelsTestCase.test_audit_log_creation --debug-mode

# Use pdb for debugging
import pdb; pdb.set_trace()

# Print test database queries
python manage.py test --debug-sql
```

## Reporting

### Coverage Reports
- HTML coverage reports in `htmlcov/`
- Console coverage summary
- Coverage badges for documentation

### Test Reports
- JUnit XML for CI integration
- Custom test reports via test runner
- Performance metrics tracking

## Best Practices

### Test Organization
- Group related tests in same test class
- Use descriptive test method names
- Include docstrings explaining test purpose
- Keep tests independent and isolated

### Test Data
- Use minimal test data required
- Create data in `setUp()` method
- Use factories for complex object creation
- Clean up in `tearDown()` if needed

### Assertions
- Use specific assertion methods (`assertEqual`, `assertIn`, etc.)
- Include meaningful assertion messages
- Test both positive and negative cases
- Verify all aspects of expected behavior

### Performance
- Keep tests fast (< 1 second per test)
- Use in-memory database for tests
- Mock external services and dependencies
- Avoid unnecessary database queries

This comprehensive testing guide ensures the enterprise features are thoroughly tested, maintainable, and reliable for production use.