# e2e_tests/__init__.py
"""
SafeShipper End-to-End Test Suite

Comprehensive end-to-end testing for dangerous goods transportation workflows.
Tests complete business processes from start to finish with real data flows.
"""

__version__ = "1.0.0"
__author__ = "SafeShipper Development Team"

from .test_shipment_lifecycle import *
from .test_compliance_workflows import *
from .test_emergency_procedures import *
from .test_integration_flows import *
from .utils import *

__all__ = [
    "ShipmentLifecycleE2ETests",
    "ComplianceWorkflowE2ETests", 
    "EmergencyProcedureE2ETests",
    "IntegrationFlowE2ETests",
    "E2ETestSetup",
    "E2ETestUtils"
]