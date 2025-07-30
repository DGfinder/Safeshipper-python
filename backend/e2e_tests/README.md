# SafeShipper End-to-End Test Suite

Comprehensive end-to-end testing framework for SafeShipper dangerous goods transportation platform. Tests complete business workflows from start to finish with real data flows and user interactions.

## Overview

This E2E test suite validates the entire SafeShipper platform by simulating real-world dangerous goods transportation scenarios. It covers:

- **Complete Shipment Lifecycle**: From creation to delivery confirmation
- **Compliance Workflows**: Regulatory compliance, audit trails, and reporting
- **Emergency Procedures**: Incident response and emergency protocols  
- **System Integrations**: ERP, government APIs, carriers, and IoT systems

## Test Structure

### Test Modules

#### 1. Shipment Lifecycle (`test_shipment_lifecycle.py`)
Tests complete dangerous goods shipment workflows:
- Shipment creation and validation
- Driver/vehicle assignment with qualification checks
- Real-time tracking and location updates
- Proof of delivery capture
- Multi-stop deliveries
- Incident reporting during transport
- Performance requirements validation

#### 2. Compliance Workflows (`test_compliance_workflows.py`)
Tests regulatory compliance and audit processes:
- Comprehensive audit trail generation
- Training compliance tracking and certification
- Dangerous goods regulatory validation
- Document management and expiry monitoring
- Incident compliance reporting
- Data retention compliance
- Automated compliance monitoring

#### 3. Emergency Procedures (`test_emergency_procedures.py`)
Tests emergency response and safety protocols:
- Complete emergency response workflows
- Evacuation coordination and procedures
- Emergency communication systems
- Resource coordination and logistics
- Mobile emergency procedure access
- Critical notification performance

#### 4. Integration Flows (`test_integration_flows.py`)
Tests system integrations and data flows:
- ERP system integration workflows
- Government API reporting and submissions
- Third-party carrier integrations
- Warehouse management system flows
- IoT sensor data processing
- Payment system integration
- Data synchronization across systems

## Quick Start

### 1. Install Dependencies

```bash
cd backend/e2e_tests
pip install -r ../requirements.txt
```

### 2. Configure Test Environment

```bash
# Set up test database
export DJANGO_SETTINGS_MODULE=safeshipper.settings.testing

# Run migrations
python manage.py migrate --settings=safeshipper.settings.testing
```

### 3. Run Tests

```bash
# Run complete E2E test suite
python run_tests.py

# Run smoke tests only
python run_tests.py --smoke

# Run specific workflow
python run_tests.py --workflow shipment
python run_tests.py --workflow compliance
python run_tests.py --workflow emergency
python run_tests.py --workflow integration

# Run specific test patterns
python run_tests.py --patterns e2e_tests.test_shipment_lifecycle.ShipmentLifecycleE2ETests.test_complete_shipment_lifecycle_success_flow
```

## Test Scenarios

### Complete Shipment Lifecycle
```python
def test_complete_shipment_lifecycle_success_flow(self):
    """
    Tests complete successful shipment from creation to delivery:
    1. Customer creates shipment request
    2. Dispatcher reviews and assigns driver/vehicle  
    3. Driver accepts and starts transit
    4. Driver updates location during transport
    5. Driver completes delivery with POD
    6. System generates compliance documentation
    """
```

### Emergency Response Workflow
```python
def test_complete_emergency_response_workflow(self):
    """
    Tests complete emergency response from detection to resolution:
    1. Driver detects emergency situation
    2. Driver reports incident through mobile app
    3. System triggers emergency response protocols
    4. Emergency coordinator receives alerts
    5. Emergency procedures are accessed and followed
    6. Incident is managed through resolution
    7. Post-incident compliance reporting
    """
```

### Compliance Audit Trail
```python
def test_complete_audit_trail_workflow(self):
    """
    Tests complete audit trail generation and compliance reporting:
    1. Generate auditable activities across the system
    2. Driver performs tracked actions
    3. Compliance officer reviews audit trail
    4. Generate compliance report
    5. Verify report contents and compliance metrics
    """
```

## Test Data Management

### Automated Test Setup
The test suite automatically creates comprehensive test data:

```python
# Test company and users
test_company = E2ETestSetup.create_test_company()
test_users = E2ETestSetup.create_test_users(test_company)

# Test vehicles and qualifications  
test_vehicles = E2ETestSetup.create_test_vehicles(test_company)
driver_qualifications = E2ETestSetup.create_driver_qualifications(driver_user)

# Test dangerous goods and training modules
test_dangerous_goods = E2ETestSetup.create_test_dangerous_goods()
test_training_modules = E2ETestSetup.create_test_training_modules()
```

### Test Utilities
Comprehensive utility functions for test operations:

```python
# Authentication and API access
E2ETestUtils.authenticate_user(client, user)

# Test data generation
shipment_data = E2ETestUtils.create_test_shipment_data(['UN1203', 'UN3480'])
incident_data = E2ETestUtils.create_test_incident_data()
pod_data = E2ETestUtils.create_proof_of_delivery_data()

# Verification utilities
E2ETestUtils.assert_response_contains_fields(response, required_fields)
E2ETestUtils.assert_audit_trail_exists(user, action, object_type)
E2ETestUtils.verify_email_sent('Subject Contains')
```

## Test Configuration

### Environment Settings

```python
# Test settings for different environments
ENVIRONMENT_CONFIGS = {
    'local': {
        'database': 'sqlite:///test_safeshipper.db',
        'celery_always_eager': True,
        'email_backend': 'django.core.mail.backends.locmem.EmailBackend'
    },
    'staging': {
        'database': 'postgresql://staging_test_db',
        'external_apis_enabled': True,
        'monitoring_enabled': True
    }
}
```

### Test Execution Options

```bash
# Verbosity levels
python run_tests.py --verbosity 0  # Minimal output
python run_tests.py --verbosity 1  # Standard output  
python run_tests.py --verbosity 2  # Detailed output (default)
python run_tests.py --verbosity 3  # Maximum output

# Database management
python run_tests.py --keepdb       # Keep test database for debugging

# Output control
python run_tests.py --output-dir custom_results  # Custom result directory
```

## Integration Testing

### ERP System Integration
```python
def test_erp_integration_flow(self):
    """
    Tests complete ERP integration workflow:
    - Order creation in ERP system
    - Shipment generation in SafeShipper
    - Status synchronization
    - Delivery confirmation back to ERP
    """
```

### Government API Integration
```python  
def test_government_api_integration_flow(self):
    """
    Tests government reporting integration:
    - Manifest generation for border crossing
    - API submission to government systems
    - Status tracking and compliance verification
    """
```

### IoT Sensor Integration
```python
def test_iot_sensor_integration_flow(self):
    """
    Tests IoT sensor data integration:
    - Sensor data ingestion and processing
    - Threshold violation detection
    - Alert generation and notification
    """
```

## Performance Validation

### Response Time Requirements
```python
def test_shipment_lifecycle_performance_requirements(self):
    """
    Validates performance requirements:
    - Shipment creation: < 2 seconds
    - Shipment retrieval: < 500ms  
    - PDF generation: < 5 seconds
    """
```

### Load Testing Integration
The E2E tests can be combined with load testing:

```bash
# Run E2E tests under load
python run_tests.py --workflow shipment &
locust --locustfile=../load_tests/locustfile.py --users=10 --spawn-rate=2
```

## Continuous Integration

### GitHub Actions Integration
```yaml
name: SafeShipper E2E Tests
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r backend/requirements.txt
          
      - name: Run E2E smoke tests
        run: |
          cd backend/e2e_tests
          python run_tests.py --smoke
          
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: e2e-test-results
          path: backend/e2e_tests/e2e_test_results/
```

### Jenkins Pipeline
```groovy
pipeline {
    agent any
    stages {
        stage('E2E Tests') {
            steps {
                sh '''
                    cd backend/e2e_tests
                    python run_tests.py --workflow shipment
                    python run_tests.py --workflow compliance
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'backend/e2e_tests/e2e_test_results/*'
                    publishTestResults testResultsPattern: 'backend/e2e_tests/e2e_test_results/*.xml'
                }
            }
        }
    }
}
```

## Test Reporting

### Comprehensive Reports
The test suite generates detailed reports:

```
SafeShipper End-to-End Test Report
==================================================
Execution Date: 2024-01-16T14:30:00Z
Total Duration: 245.67 seconds
Overall Status: PASSED

Test Summary
--------------------
Total Tests: 24
Failures: 0
Errors: 0

Suite Results
--------------------
test_shipment_lifecycle: ✅ PASSED (8 tests, 89.23s)
test_compliance_workflows: ✅ PASSED (7 tests, 67.45s)
test_emergency_procedures: ✅ PASSED (5 tests, 45.12s)  
test_integration_flows: ✅ PASSED (4 tests, 43.87s)
```

### JSON Results Export
```json
{
  "overall_status": "PASSED",
  "total_duration": 245.67,
  "total_tests": 24,
  "suite_results": {
    "test_shipment_lifecycle": {
      "passed": true,
      "test_count": 8,
      "duration": 89.23
    }
  },
  "timestamp": "2024-01-16T14:30:00Z"
}
```

## Debugging and Troubleshooting

### Debug Mode
```bash
# Run with maximum verbosity for debugging
python run_tests.py --verbosity 3 --keepdb

# Run specific test with detailed output
python -m pytest e2e_tests/test_shipment_lifecycle.py::ShipmentLifecycleE2ETests::test_complete_shipment_lifecycle_success_flow -v -s
```

### Common Issues

**Database Connection Errors**
```bash
# Reset test database
python manage.py flush --settings=safeshipper.settings.testing
python manage.py migrate --settings=safeshipper.settings.testing
```

**Authentication Failures**
```python
# Check user creation in test setup
def setUp(self):
    super().setUp()
    # Verify test users are created properly
    self.assertTrue(User.objects.filter(username='test_driver').exists())
```

**API Response Validation**
```python
# Use comprehensive response validation
E2ETestUtils.assert_response_contains_fields(response.json(), [
    'id', 'status', 'dangerous_goods', 'created_at'
])
```

### Performance Profiling
```bash
# Profile test execution
python -m cProfile -o e2e_profile.prof run_tests.py --smoke

# Analyze profile
python -c "import pstats; p = pstats.Stats('e2e_profile.prof'); p.sort_stats('cumulative').print_stats(20)"
```

## Best Practices

### Test Design
1. **Test Independence**: Each test should be completely independent
2. **Realistic Data**: Use realistic dangerous goods data and scenarios
3. **Comprehensive Validation**: Verify both positive and negative scenarios
4. **Performance Awareness**: Include performance validations
5. **Security Testing**: Verify permissions and access controls

### Test Maintenance
1. **Regular Updates**: Keep test data current with business requirements
2. **Documentation**: Maintain clear test documentation
3. **Monitoring**: Track test execution times and failure patterns
4. **Cleanup**: Ensure proper test data cleanup

### CI/CD Integration
1. **Smoke Tests**: Run critical smoke tests on every commit
2. **Full Suite**: Run complete suite on staging deployments
3. **Parallel Execution**: Use parallel execution where possible
4. **Result Archiving**: Archive test results for historical analysis

## Security Considerations

- Test data is automatically cleaned up after execution
- No production data is used in tests
- Authentication tokens are properly managed
- Sensitive test data is masked in reports
- Test environments are isolated from production

## Support and Maintenance

For issues or questions:
- Review test logs for detailed error information
- Check test environment configuration
- Verify database schema is current
- Consult SafeShipper architecture documentation
- Contact development team for complex issues