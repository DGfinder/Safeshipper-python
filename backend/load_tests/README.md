# SafeShipper Load Testing Framework

Comprehensive load testing framework for SafeShipper dangerous goods transportation platform using Locust.

## Overview

This load testing framework is specifically designed for SafeShipper's dangerous goods transportation operations, simulating realistic user patterns and testing critical business workflows including:

- Dangerous goods search and lookup
- Shipment creation and management
- Emergency procedures access
- Driver mobile operations
- Compliance reporting
- System health monitoring

## Quick Start

### 1. Install Dependencies

```bash
cd backend/load_tests
pip install -r requirements.txt
```

### 2. Run Basic Load Test

```bash
# Run standard test suite on local environment
python run_tests.py --environment local --suite standard

# Run specific scenario
python run_tests.py --scenario peak_hours --environment staging

# Run with custom parameters
python run_tests.py --scenario stress_test --users 50 --duration 10
```

### 3. View Results

Test results are saved in `load_test_results/` directory:
- HTML reports: `{test_run_id}_report.html`
- Detailed JSON results: `{test_run_id}_results.json`
- CSV data: `{test_run_id}_stats.csv`

## Test Scenarios

### Smoke Test
- **Purpose**: Quick validation that system is functional
- **Users**: 5
- **Duration**: 2 minutes
- **Use Case**: CI/CD pipeline validation

### Normal Operation
- **Purpose**: Simulate typical business hours load
- **Users**: 25
- **Duration**: 10 minutes
- **Use Case**: Regular performance monitoring

### Peak Hours
- **Purpose**: Simulate high-traffic periods
- **Users**: 100
- **Duration**: 15 minutes
- **Use Case**: Capacity planning

### Stress Test
- **Purpose**: Find system breaking points
- **Users**: 200
- **Duration**: 20 minutes
- **Use Case**: Infrastructure scaling decisions

### Endurance Test
- **Purpose**: Long-running stability test
- **Users**: 50
- **Duration**: 60 minutes
- **Use Case**: Memory leak detection

### Spike Test
- **Purpose**: Sudden traffic spike simulation
- **Users**: 300 (rapid spawn)
- **Duration**: 5 minutes
- **Use Case**: Auto-scaling validation

## User Types

### SafeShipperAPIUser
Primary user simulation covering:
- Dangerous goods search (most common)
- Shipment management
- System health checks
- PDF report generation
- Emergency procedures lookup

### DriverMobileTasks
Mobile driver operations:
- Shipment status updates
- Proof of delivery capture
- Emergency contact lookup
- Incident reporting

### ComplianceOfficerTasks
Compliance workflows:
- Audit log reviews
- Training compliance checks
- Incident report analysis
- Compliance report generation

### DatabaseStressUser
Database-intensive operations:
- Complex shipment queries
- Audit log queries
- Training record queries
- Incident report queries

## Performance Thresholds

Critical SafeShipper operations have defined performance thresholds:

| Endpoint | Max Avg Response | Max 95th Percentile | Min RPS | Max Error Rate |
|----------|------------------|---------------------|---------|----------------|
| DG Search | 500ms | 1000ms | 50 | 1% |
| DG Details | 200ms | 500ms | 100 | 0.5% |
| Shipment Creation | 1000ms | 2000ms | 20 | 2% |
| Health Check | 100ms | 200ms | 200 | 0.1% |
| Emergency Procedures | 300ms | 600ms | 30 | 0.5% |
| PDF Generation | 3000ms | 5000ms | 5 | 2% |

## Test Suites

### Smoke Suite
- smoke_test

### Standard Suite (Default)
- smoke_test
- normal_operation
- peak_hours

### Comprehensive Suite
- smoke_test
- normal_operation
- peak_hours
- stress_test
- database_stress

### Full Suite
- All scenarios including endurance and spike tests

## Environment Configuration

### Local Development
```bash
python run_tests.py --environment local --suite smoke
```
- Target: http://localhost:8000
- Max Users: 50
- Monitoring: Disabled

### Staging
```bash
python run_tests.py --environment staging --suite standard
```
- Target: https://staging.safeshipper.com
- Max Users: 200
- Monitoring: Enabled

### Production
```bash
python run_tests.py --environment production --suite smoke
```
- Target: https://api.safeshipper.com
- Max Users: 500
- Monitoring: Enabled
- **Note**: Only run smoke tests on production

## Advanced Usage

### Custom Scenario Execution

```bash
# Run specific scenario with custom parameters
python run_tests.py \\
  --scenario peak_hours \\
  --users 150 \\
  --duration 20 \\
  --host https://custom.safeshipper.com
```

### Programmatic Usage

```python
from run_tests import SafeShipperLoadTestRunner

# Initialize runner
runner = SafeShipperLoadTestRunner("staging")

# Run specific scenario
result = runner.run_scenario("stress_test", {
    "user_count": 100,
    "run_time_minutes": 15
})

# Run full test suite
suite_result = runner.run_test_suite("comprehensive")
```

### Continuous Integration

```yaml
# Example GitHub Actions workflow
- name: Run Load Tests
  run: |
    cd backend/load_tests
    pip install -r requirements.txt
    python run_tests.py --environment staging --suite smoke
    if [ $? -ne 0 ]; then
      echo "Load tests failed - performance regression detected"
      exit 1
    fi
```

## Monitoring Integration

The framework supports integration with monitoring systems:

### Prometheus Metrics
Load test results can be exported to Prometheus for alerting:

```python
from prometheus_client import CollectorRegistry, Gauge, push_to_gateway

# Export metrics
registry = CollectorRegistry()
response_time_gauge = Gauge('load_test_response_time', 'Average response time', registry=registry)
response_time_gauge.set(avg_response_time)
push_to_gateway('localhost:9091', job='load_test', registry=registry)
```

### Grafana Dashboards
Create dashboards showing:
- Response time trends
- Error rate monitoring
- Throughput analysis
- Resource utilization

## Test Data Management

### Setup Test Data

```python
from performance_config import TestDataSetup

# Create test users
TestDataSetup.create_test_users(100)

# Create test dangerous goods
TestDataSetup.create_test_dangerous_goods(1000)

# Create test shipments
TestDataSetup.create_test_shipments(500)
```

### Cleanup After Testing

```python
# Clean up test data
TestDataSetup.cleanup_test_data()
```

## Performance Analysis

### Automatic Analysis
The framework automatically analyzes results against thresholds:

```json
{
  "analysis": {
    "overall_status": "FAIL",
    "threshold_violations": [
      {
        "type": "response_time",
        "endpoint": "/api/v1/dangerous-goods/search/",
        "actual": 750,
        "threshold": 500,
        "severity": "HIGH"
      }
    ],
    "recommendations": [
      "Dangerous goods search performance issues detected. Consider optimizing database indexes..."
    ]
  }
}
```

### Custom Analysis

```python
from performance_config import PerformanceAnalyzer, SafeShipperPerformanceConfig

config = SafeShipperPerformanceConfig()
analyzer = PerformanceAnalyzer(config)

# Analyze custom results
analysis = analyzer.analyze_results(test_results)
```

## Troubleshooting

### Common Issues

**High Error Rates**
- Check application logs for 500 errors
- Verify database connections
- Check memory usage

**Slow Response Times**
- Review database query performance
- Check cache hit rates
- Monitor CPU usage

**Connection Errors**
- Verify target system is accessible
- Check network connectivity
- Validate authentication

### Debug Mode

```bash
# Run with verbose output
python run_tests.py --scenario smoke_test --environment local -v

# Run single user for debugging
locust --locustfile=locustfile.py --host=http://localhost:8000 --users=1 --spawn-rate=1
```

## Best Practices

### Test Environment Preparation
1. Use dedicated test database
2. Clear caches before testing
3. Ensure consistent baseline
4. Monitor resource usage

### Test Execution
1. Start with smoke tests
2. Gradually increase load
3. Monitor system metrics
4. Allow cooldown between tests

### Result Interpretation
1. Focus on 95th percentile metrics
2. Look for error patterns
3. Compare against baselines
4. Consider business impact

### Continuous Testing
1. Integrate with CI/CD
2. Set up automated alerts
3. Track performance trends
4. Regular baseline updates

## Security Considerations

- Use test credentials only
- Avoid production data
- Limit test scope
- Monitor for security issues
- Clean up test data

## Support

For issues or questions:
- Check application logs
- Review performance thresholds
- Consult SafeShipper architecture documentation
- Contact development team