# load_tests/run_tests.py
"""
Test runner for SafeShipper load testing with comprehensive reporting and monitoring.
Orchestrates different test scenarios and generates detailed performance reports.
"""

import os
import sys
import json
import time
import argparse
import subprocess
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from performance_config import (
    SafeShipperPerformanceConfig, 
    PerformanceAnalyzer, 
    LoadTestScenario,
    TestDataSetup
)


class SafeShipperLoadTestRunner:
    """
    Comprehensive load test runner for SafeShipper dangerous goods platform.
    """
    
    def __init__(self, environment: str = "local"):
        self.environment = environment
        self.config = SafeShipperPerformanceConfig()
        self.analyzer = PerformanceAnalyzer(self.config)
        self.env_config = self.config.get_environment_config(environment)
        self.results_dir = Path("load_test_results")
        self.results_dir.mkdir(exist_ok=True)
        
    def run_scenario(self, scenario_name: str, custom_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Run a specific load test scenario."""
        try:
            scenario = self.config.get_scenario_by_name(scenario_name)
            
            # Apply custom parameters if provided
            if custom_params:
                for key, value in custom_params.items():
                    if hasattr(scenario, key):
                        setattr(scenario, key, value)
            
            print(f"\\n🚀 Starting SafeShipper Load Test: {scenario.name}")
            print(f"   Description: {scenario.description}")
            print(f"   Users: {scenario.user_count}")
            print(f"   Spawn Rate: {scenario.spawn_rate}/sec")
            print(f"   Duration: {scenario.run_time_minutes} minutes")
            print(f"   Target: {scenario.host}")
            print(f"   Environment: {self.environment}")
            
            # Setup test environment
            self._setup_test_environment()
            
            # Generate unique test run ID
            test_run_id = f"{scenario.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Prepare Locust command
            locust_cmd = self._build_locust_command(scenario, test_run_id)
            
            # Run the load test
            start_time = time.time()
            result = subprocess.run(locust_cmd, capture_output=True, text=True, shell=True)
            end_time = time.time()
            
            # Parse results
            test_results = self._parse_test_results(test_run_id, start_time, end_time)
            
            # Analyze performance
            analysis = self.analyzer.analyze_results(test_results)
            
            # Generate comprehensive report
            report = self._generate_comprehensive_report(scenario, test_results, analysis, test_run_id)
            
            # Save results
            self._save_test_results(test_run_id, report)
            
            # Display summary
            self._display_test_summary(scenario, analysis)
            
            return report
            
        except Exception as e:
            print(f"❌ Load test failed: {str(e)}")
            return {"status": "ERROR", "error": str(e)}
    
    def run_test_suite(self, test_suite: str = "standard") -> Dict[str, Any]:
        """Run a comprehensive test suite."""
        test_suites = {
            "smoke": ["smoke_test"],
            "standard": ["smoke_test", "normal_operation", "peak_hours"],
            "comprehensive": [
                "smoke_test", "normal_operation", "peak_hours", 
                "stress_test", "database_stress"
            ],
            "full": [
                "smoke_test", "normal_operation", "peak_hours", 
                "stress_test", "endurance_test", "spike_test", 
                "database_stress", "mobile_heavy"
            ]
        }
        
        scenarios = test_suites.get(test_suite, test_suites["standard"])
        suite_results = {"suite": test_suite, "scenarios": {}, "overall_status": "PASS"}
        
        print(f"\\n🧪 Running SafeShipper Test Suite: {test_suite}")
        print(f"   Scenarios: {len(scenarios)}")
        print(f"   Environment: {self.environment}")
        
        for i, scenario_name in enumerate(scenarios, 1):
            print(f"\\n--- Scenario {i}/{len(scenarios)}: {scenario_name} ---")
            
            try:
                result = self.run_scenario(scenario_name)
                suite_results["scenarios"][scenario_name] = result
                
                # Check if scenario passed
                if result.get("analysis", {}).get("overall_status") != "PASS":
                    suite_results["overall_status"] = "FAIL"
                
                # Brief pause between scenarios
                if i < len(scenarios):
                    print("⏸️  Waiting 30 seconds before next scenario...")
                    time.sleep(30)
                    
            except Exception as e:
                print(f"❌ Scenario {scenario_name} failed: {str(e)}")
                suite_results["scenarios"][scenario_name] = {"status": "ERROR", "error": str(e)}
                suite_results["overall_status"] = "FAIL"
        
        # Generate suite summary report
        suite_report = self._generate_suite_report(suite_results)
        
        # Save suite results
        suite_id = f"suite_{test_suite}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self._save_test_results(suite_id, suite_report)
        
        print(f"\\n✅ Test Suite Complete: {suite_results['overall_status']}")
        return suite_report
    
    def monitor_system_during_test(self, test_duration_minutes: int) -> Dict[str, Any]:
        """Monitor system metrics during load test."""
        monitoring_data = {
            "start_time": datetime.now(timezone.utc).isoformat(),
            "duration_minutes": test_duration_minutes,
            "metrics": []
        }
        
        # This would integrate with system monitoring tools
        # For now, we'll create a placeholder structure
        print(f"📊 Monitoring system metrics for {test_duration_minutes} minutes...")
        
        return monitoring_data
    
    def _setup_test_environment(self):
        """Setup test environment and data."""
        print("🔧 Setting up test environment...")
        
        # Verify target system is accessible
        if not self._verify_system_health():
            raise Exception("Target system is not healthy - aborting load test")
        
        # Setup test data if needed
        if self.environment == "local":
            TestDataSetup.create_test_users(100)
            TestDataSetup.create_test_dangerous_goods(1000)
            TestDataSetup.create_test_shipments(500)
    
    def _verify_system_health(self) -> bool:
        """Verify target system is healthy before load testing."""
        try:
            import requests
            health_url = f"{self.env_config['host']}/api/v1/system/health/"
            response = requests.get(health_url, timeout=10)
            return response.status_code in [200, 503]  # 503 is acceptable (degraded but functional)
        except Exception as e:
            print(f"⚠️  Health check failed: {str(e)}")
            return False
    
    def _build_locust_command(self, scenario: LoadTestScenario, test_run_id: str) -> str:
        """Build Locust command for the scenario."""
        locustfile_path = Path(__file__).parent / "locustfile.py"
        html_report_path = self.results_dir / f"{test_run_id}_report.html"
        csv_prefix = self.results_dir / f"{test_run_id}"
        
        # Build user class selection
        user_classes = ",".join(scenario.user_classes)
        
        cmd = [
            "locust",
            f"--locustfile={locustfile_path}",
            f"--host={scenario.host}",
            f"--users={scenario.user_count}",
            f"--spawn-rate={scenario.spawn_rate}",
            f"--run-time={scenario.run_time_minutes}m",
            f"--html={html_report_path}",
            f"--csv={csv_prefix}",
            "--headless",
            "--only-summary",
        ]
        
        # Add user class selection if supported
        if len(scenario.user_classes) == 1:
            cmd.append(f"--class-picker={scenario.user_classes[0]}")
        
        return " ".join(cmd)
    
    def _parse_test_results(self, test_run_id: str, start_time: float, end_time: float) -> Dict[str, Any]:
        """Parse Locust test results from CSV files."""
        csv_stats_path = self.results_dir / f"{test_run_id}_stats.csv"
        csv_failures_path = self.results_dir / f"{test_run_id}_failures.csv"
        
        test_results = {
            "test_run_id": test_run_id,
            "start_time": start_time,
            "end_time": end_time,
            "duration": end_time - start_time,
            "stats": {},
            "failures": []
        }
        
        # Parse stats CSV
        try:
            import pandas as pd
            
            if csv_stats_path.exists():
                stats_df = pd.read_csv(csv_stats_path)
                for _, row in stats_df.iterrows():
                    endpoint = row.get("Name", "unknown")
                    test_results["stats"][endpoint] = {
                        "name": endpoint,
                        "num_requests": row.get("Request Count", 0),
                        "num_failures": row.get("Failure Count", 0),
                        "avg_response_time": row.get("Average Response Time", 0),
                        "min_response_time": row.get("Min Response Time", 0),
                        "max_response_time": row.get("Max Response Time", 0),
                        "95th_percentile": row.get("95%", 0),
                        "requests_per_second": row.get("Requests/s", 0),
                    }
            
            # Parse failures CSV
            if csv_failures_path.exists():
                failures_df = pd.read_csv(csv_failures_path)
                test_results["failures"] = failures_df.to_dict("records")
        
        except ImportError:
            print("⚠️  pandas not available - using basic CSV parsing")
            # Basic CSV parsing fallback
            self._parse_csv_basic(csv_stats_path, test_results)
        
        return test_results
    
    def _parse_csv_basic(self, csv_path: Path, test_results: Dict[str, Any]):
        """Basic CSV parsing without pandas."""
        if not csv_path.exists():
            return
        
        import csv
        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                endpoint = row.get("Name", "unknown")
                test_results["stats"][endpoint] = {
                    "name": endpoint,
                    "num_requests": int(row.get("Request Count", 0)),
                    "num_failures": int(row.get("Failure Count", 0)),
                    "avg_response_time": float(row.get("Average Response Time", 0)),
                    "requests_per_second": float(row.get("Requests/s", 0)),
                }
    
    def _generate_comprehensive_report(
        self, 
        scenario: LoadTestScenario, 
        test_results: Dict[str, Any], 
        analysis: Dict[str, Any],
        test_run_id: str
    ) -> Dict[str, Any]:
        """Generate comprehensive test report."""
        return {
            "test_info": {
                "test_run_id": test_run_id,
                "scenario_name": scenario.name,
                "scenario_description": scenario.description,
                "environment": self.environment,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "duration_minutes": scenario.run_time_minutes
            },
            "test_configuration": {
                "user_count": scenario.user_count,
                "spawn_rate": scenario.spawn_rate,
                "target_host": scenario.host,
                "user_classes": scenario.user_classes
            },
            "performance_results": test_results,
            "analysis": analysis,
            "system_info": self._get_system_info(),
            "recommendations": self._generate_detailed_recommendations(analysis)
        }
    
    def _generate_suite_report(self, suite_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate test suite summary report."""
        total_scenarios = len(suite_results["scenarios"])
        passed_scenarios = sum(1 for result in suite_results["scenarios"].values() 
                             if result.get("analysis", {}).get("overall_status") == "PASS")
        
        return {
            "suite_info": {
                "suite_name": suite_results["suite"],
                "total_scenarios": total_scenarios,
                "passed_scenarios": passed_scenarios,
                "failed_scenarios": total_scenarios - passed_scenarios,
                "overall_status": suite_results["overall_status"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            "scenario_results": suite_results["scenarios"],
            "suite_summary": self._calculate_suite_metrics(suite_results)
        }
    
    def _calculate_suite_metrics(self, suite_results: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate aggregated metrics for the test suite."""
        total_requests = 0
        total_failures = 0
        avg_response_times = []
        
        for scenario_result in suite_results["scenarios"].values():
            perf_results = scenario_result.get("performance_results", {})
            for stats in perf_results.get("stats", {}).values():
                total_requests += stats.get("num_requests", 0)
                total_failures += stats.get("num_failures", 0)
                avg_response_times.append(stats.get("avg_response_time", 0))
        
        return {
            "total_requests": total_requests,
            "total_failures": total_failures,
            "overall_error_rate": (total_failures / max(total_requests, 1)) * 100,
            "average_response_time": sum(avg_response_times) / max(len(avg_response_times), 1)
        }
    
    def _get_system_info(self) -> Dict[str, Any]:
        """Get system information for the report."""
        import platform
        return {
            "platform": platform.platform(),
            "python_version": platform.python_version(),
            "architecture": platform.architecture()[0],
            "processor": platform.processor(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def _generate_detailed_recommendations(self, analysis: Dict[str, Any]) -> List[str]:
        """Generate detailed performance recommendations."""
        recommendations = analysis.get("recommendations", [])
        
        # Add SafeShipper-specific recommendations
        violations = analysis.get("threshold_violations", [])
        
        if any(v["endpoint"].endswith("/dangerous-goods/search/") for v in violations):
            recommendations.append(
                "Dangerous goods search performance issues detected. Consider:"
                "\\n  - Optimizing database indexes on UN numbers and shipping names"
                "\\n  - Implementing Elasticsearch for better search performance"
                "\\n  - Adding more aggressive caching for frequently searched terms"
            )
        
        if any(v["endpoint"].endswith("/shipments/") and v["type"] == "response_time" for v in violations):
            recommendations.append(
                "Shipment creation/listing performance issues. Consider:"
                "\\n  - Database query optimization for shipment filtering"
                "\\n  - Implementing pagination for large result sets"
                "\\n  - Adding database connection pooling"
            )
        
        if any(v["endpoint"].endswith("/generate-pdf/") for v in violations):
            recommendations.append(
                "PDF generation performance issues. Consider:"
                "\\n  - Moving PDF generation to background tasks"
                "\\n  - Implementing PDF caching for similar reports"
                "\\n  - Optimizing PDF templates and data queries"
            )
        
        return recommendations
    
    def _save_test_results(self, test_run_id: str, report: Dict[str, Any]):
        """Save test results to JSON file."""
        results_file = self.results_dir / f"{test_run_id}_results.json"
        
        with open(results_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"📄 Results saved to: {results_file}")
    
    def _display_test_summary(self, scenario: LoadTestScenario, analysis: Dict[str, Any]):
        """Display test summary to console."""
        status = analysis["overall_status"]
        status_emoji = "✅" if status == "PASS" else "❌"
        
        print(f"\\n{status_emoji} Test Complete: {scenario.name} - {status}")
        
        if analysis["threshold_violations"]:
            print(f"\\n⚠️  Performance Violations ({len(analysis['threshold_violations'])}):")
            for violation in analysis["threshold_violations"][:5]:  # Show first 5
                print(f"   • {violation['endpoint']}: {violation['type']} "
                      f"({violation['actual']} > {violation['threshold']})")
        
        # Display performance summary
        summary = analysis["performance_summary"]
        print(f"\\n📊 Performance Summary:")
        print(f"   • Total Requests: {summary['total_requests']:,}")
        print(f"   • Error Rate: {summary['overall_error_rate']:.2f}%")
        print(f"   • Average RPS: {summary['average_rps']:.1f}")


def main():
    """Main entry point for load test runner."""
    parser = argparse.ArgumentParser(description="SafeShipper Load Test Runner")
    parser.add_argument("--scenario", type=str, help="Specific scenario to run")
    parser.add_argument("--suite", type=str, choices=["smoke", "standard", "comprehensive", "full"], 
                       default="standard", help="Test suite to run")
    parser.add_argument("--environment", type=str, choices=["local", "staging", "production"], 
                       default="local", help="Target environment")
    parser.add_argument("--users", type=int, help="Override user count")
    parser.add_argument("--duration", type=int, help="Override test duration (minutes)")
    parser.add_argument("--host", type=str, help="Override target host")
    
    args = parser.parse_args()
    
    # Initialize test runner
    runner = SafeShipperLoadTestRunner(args.environment)
    
    # Custom parameters
    custom_params = {}
    if args.users:
        custom_params["user_count"] = args.users
    if args.duration:
        custom_params["run_time_minutes"] = args.duration
    if args.host:
        custom_params["host"] = args.host
    
    try:
        if args.scenario:
            # Run specific scenario
            result = runner.run_scenario(args.scenario, custom_params)
            return 0 if result.get("analysis", {}).get("overall_status") == "PASS" else 1
        else:
            # Run test suite
            result = runner.run_test_suite(args.suite)
            return 0 if result.get("suite_info", {}).get("overall_status") == "PASS" else 1
    
    except KeyboardInterrupt:
        print("\\n🛑 Load test interrupted by user")
        return 2
    except Exception as e:
        print(f"\\n💥 Load test failed: {str(e)}")
        return 3


if __name__ == "__main__":
    sys.exit(main())