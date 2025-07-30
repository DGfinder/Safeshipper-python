# load_tests/__init__.py
"""
SafeShipper Load Testing Framework

Comprehensive load testing suite for dangerous goods transportation platform.
Includes realistic user simulations, performance thresholds, and automated analysis.
"""

__version__ = "1.0.0"
__author__ = "SafeShipper Development Team"

from .performance_config import (
    SafeShipperPerformanceConfig,
    PerformanceThreshold, 
    LoadTestScenario,
    PerformanceAnalyzer,
    TestDataSetup
)

from .run_tests import SafeShipperLoadTestRunner

__all__ = [
    "SafeShipperPerformanceConfig",
    "PerformanceThreshold",
    "LoadTestScenario", 
    "PerformanceAnalyzer",
    "TestDataSetup",
    "SafeShipperLoadTestRunner"
]