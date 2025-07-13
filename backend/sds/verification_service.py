# SDS Verification and Quality Control Workflow Service
# This service handles comprehensive SDS data verification, quality scoring, and expert review workflows

import json
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from decimal import Decimal
from dataclasses import dataclass
from enum import Enum

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

from .enhanced_models import (
    EnhancedSafetyDataSheet, SDSQualityCheck, SDSDataSource,
    SDSSourceContribution
)
from .models import SafetyDataSheet
from dangerous_goods.models import DangerousGood
from users.models import User

logger = logging.getLogger(__name__)

User = get_user_model()


class VerificationLevel(Enum):
    """Levels of SDS verification"""
    BASIC_AUTOMATED = "basic_automated"
    PEER_REVIEW = "peer_review"
    EXPERT_VERIFICATION = "expert_verification"
    REGULATORY_COMPLIANCE = "regulatory_compliance"
    MANUFACTURER_CONFIRMED = "manufacturer_confirmed"


class QualityIssueType(Enum):
    """Types of quality issues found in SDS data"""
    MISSING_CRITICAL_DATA = "missing_critical_data"
    INCONSISTENT_DATA = "inconsistent_data"
    OUTDATED_INFORMATION = "outdated_information"
    REGULATORY_NON_COMPLIANCE = "regulatory_non_compliance"
    FORMAT_ISSUES = "format_issues"
    DUPLICATE_RECORD = "duplicate_record"
    SOURCE_RELIABILITY = "source_reliability"


@dataclass
class QualityIssue:
    """Represents a quality issue found during verification"""
    issue_type: QualityIssueType
    severity: str  # 'critical', 'major', 'minor', 'info'
    field_name: str
    description: str
    recommendation: str
    confidence: float
    auto_fixable: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'issue_type': self.issue_type.value,
            'severity': self.severity,
            'field_name': self.field_name,
            'description': self.description,
            'recommendation': self.recommendation,
            'confidence': self.confidence,
            'auto_fixable': self.auto_fixable
        }


@dataclass
class VerificationResult:
    """Results of SDS verification process"""
    overall_score: float
    verification_level: VerificationLevel
    quality_issues: List[QualityIssue]
    recommendations: List[str]
    confidence_score: float
    completeness_score: float
    accuracy_score: float
    regulatory_compliance_score: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'overall_score': self.overall_score,
            'verification_level': self.verification_level.value,
            'quality_issues': [issue.to_dict() for issue in self.quality_issues],
            'recommendations': self.recommendations,
            'confidence_score': self.confidence_score,
            'completeness_score': self.completeness_score,
            'accuracy_score': self.accuracy_score,
            'regulatory_compliance_score': self.regulatory_compliance_score
        }


class SDSQualityAnalyzer:
    """
    Comprehensive SDS quality analysis and scoring system
    """
    
    def __init__(self):
        # Critical fields that must be present for dangerous goods
        self.critical_fields = [
            'product_name', 'manufacturer', 'dangerous_good', 'hazard_class',
            'revision_date', 'language', 'country_code'
        ]
        
        # Important fields that significantly impact quality
        self.important_fields = [
            'version', 'physical_state', 'proper_shipping_name', 'un_number',
            'hazard_statements', 'precautionary_statements', 'flash_point_celsius'
        ]
        
        # Regulatory requirements by hazard class
        self.class_requirements = {
            '1': ['un_number', 'packing_group', 'hazard_statements'],  # Explosives
            '2': ['un_number', 'physical_state', 'hazard_statements'],  # Gases
            '3': ['un_number', 'flash_point_celsius', 'packing_group'],  # Flammable liquids
            '4': ['un_number', 'packing_group', 'handling_precautions'],  # Flammable solids
            '5': ['un_number', 'packing_group', 'storage_requirements'],  # Oxidizers
            '6': ['un_number', 'packing_group', 'first_aid_measures'],  # Toxics
            '7': ['un_number', 'handling_precautions', 'storage_requirements'],  # Radioactive
            '8': ['un_number', 'packing_group', 'ph_value_min', 'ph_value_max'],  # Corrosives
            '9': ['un_number', 'environmental_hazard', 'storage_requirements']  # Miscellaneous
        }
    
    def analyze_sds_quality(self, sds: EnhancedSafetyDataSheet) -> VerificationResult:
        """
        Perform comprehensive quality analysis of an SDS record
        
        Args:
            sds: EnhancedSafetyDataSheet instance to analyze
            
        Returns:
            VerificationResult with detailed quality assessment
        """
        logger.info(f"Starting quality analysis for SDS: {sds.product_name}")
        
        quality_issues = []
        recommendations = []
        
        # Analyze completeness
        completeness_score, completeness_issues = self._analyze_completeness(sds)
        quality_issues.extend(completeness_issues)
        
        # Analyze accuracy and consistency
        accuracy_score, accuracy_issues = self._analyze_accuracy(sds)
        quality_issues.extend(accuracy_issues)
        
        # Analyze regulatory compliance
        compliance_score, compliance_issues = self._analyze_regulatory_compliance(sds)
        quality_issues.extend(compliance_issues)
        
        # Analyze data freshness
        freshness_score, freshness_issues = self._analyze_data_freshness(sds)
        quality_issues.extend(freshness_issues)
        
        # Analyze source reliability
        source_score, source_issues = self._analyze_source_reliability(sds)
        quality_issues.extend(source_issues)
        
        # Check for duplicates
        duplicate_issues = self._check_for_duplicates(sds)
        quality_issues.extend(duplicate_issues)
        
        # Calculate overall scores
        confidence_score = self._calculate_confidence_score(sds, quality_issues)
        overall_score = self._calculate_overall_score(
            completeness_score, accuracy_score, compliance_score, 
            freshness_score, source_score
        )
        
        # Generate recommendations
        recommendations = self._generate_recommendations(quality_issues, sds)
        
        # Determine verification level
        verification_level = self._determine_verification_level(overall_score, quality_issues)
        
        result = VerificationResult(
            overall_score=overall_score,
            verification_level=verification_level,
            quality_issues=quality_issues,
            recommendations=recommendations,
            confidence_score=confidence_score,
            completeness_score=completeness_score,
            accuracy_score=accuracy_score,
            regulatory_compliance_score=compliance_score
        )
        
        logger.info(f"Quality analysis completed for {sds.product_name}: {overall_score:.2f} overall score")
        return result
    
    def _analyze_completeness(self, sds: EnhancedSafetyDataSheet) -> Tuple[float, List[QualityIssue]]:
        """Analyze data completeness"""
        issues = []
        total_fields = 0
        completed_fields = 0
        
        # Check critical fields
        for field in self.critical_fields:
            total_fields += 1
            value = getattr(sds, field, None)
            if value and str(value).strip():
                completed_fields += 1
            else:
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.MISSING_CRITICAL_DATA,
                    severity='critical',
                    field_name=field,
                    description=f"Critical field '{field}' is missing or empty",
                    recommendation=f"Provide valid data for {field}",
                    confidence=1.0
                ))
        
        # Check important fields
        for field in self.important_fields:
            total_fields += 1
            value = getattr(sds, field, None)
            if value and str(value).strip():
                completed_fields += 1
            elif field in ['hazard_statements', 'precautionary_statements']:
                # These are JSON fields, check differently
                json_value = getattr(sds, field, [])
                if json_value and len(json_value) > 0:
                    completed_fields += 1
                else:
                    issues.append(QualityIssue(
                        issue_type=QualityIssueType.MISSING_CRITICAL_DATA,
                        severity='major',
                        field_name=field,
                        description=f"Important field '{field}' is missing",
                        recommendation=f"Add {field} information for better safety compliance",
                        confidence=0.9
                    ))
            else:
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.MISSING_CRITICAL_DATA,
                    severity='minor',
                    field_name=field,
                    description=f"Important field '{field}' is missing",
                    recommendation=f"Consider adding {field} for completeness",
                    confidence=0.8
                ))
        
        # Check hazard class specific requirements
        if sds.dangerous_good and sds.dangerous_good.hazard_class:
            hazard_class = sds.dangerous_good.hazard_class
            required_fields = self.class_requirements.get(hazard_class, [])
            
            for field in required_fields:
                total_fields += 1
                value = getattr(sds, field, None)
                if not value or not str(value).strip():
                    # Special handling for pH fields (Class 8)
                    if field in ['ph_value_min', 'ph_value_max'] and hazard_class == '8':
                        if not sds.has_ph_data:
                            issues.append(QualityIssue(
                                issue_type=QualityIssueType.MISSING_CRITICAL_DATA,
                                severity='major',
                                field_name=field,
                                description=f"pH data required for Class 8 corrosive materials",
                                recommendation="Extract pH values from SDS document or regulatory data",
                                confidence=0.95
                            ))
                        else:
                            completed_fields += 1
                    else:
                        issues.append(QualityIssue(
                            issue_type=QualityIssueType.MISSING_CRITICAL_DATA,
                            severity='major',
                            field_name=field,
                            description=f"Required field for hazard class {hazard_class}: {field}",
                            recommendation=f"Add {field} data required for Class {hazard_class} materials",
                            confidence=0.9
                        ))
                else:
                    completed_fields += 1
        
        completeness_score = completed_fields / total_fields if total_fields > 0 else 0.0
        return completeness_score, issues
    
    def _analyze_accuracy(self, sds: EnhancedSafetyDataSheet) -> Tuple[float, List[QualityIssue]]:
        """Analyze data accuracy and internal consistency"""
        issues = []
        accuracy_checks = 0
        passed_checks = 0
        
        # Check UN number format
        if sds.dangerous_good and sds.dangerous_good.un_number:
            accuracy_checks += 1
            un_number = sds.dangerous_good.un_number.replace('UN', '').strip()
            if un_number.isdigit() and len(un_number) == 4:
                passed_checks += 1
            else:
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.INCONSISTENT_DATA,
                    severity='major',
                    field_name='un_number',
                    description="UN number format is invalid (should be 4 digits)",
                    recommendation="Verify and correct UN number format",
                    confidence=0.95
                ))
        
        # Check pH range consistency (Class 8)
        if sds.is_corrosive_class_8 and sds.has_ph_data:
            accuracy_checks += 1
            ph_min = sds.ph_value_min
            ph_max = sds.ph_value_max
            
            if ph_min is not None and ph_max is not None:
                if ph_min <= ph_max and 0 <= ph_min <= 14 and 0 <= ph_max <= 14:
                    passed_checks += 1
                else:
                    issues.append(QualityIssue(
                        issue_type=QualityIssueType.INCONSISTENT_DATA,
                        severity='major',
                        field_name='ph_values',
                        description="pH values are inconsistent or out of range (0-14)",
                        recommendation="Verify pH measurement data from SDS",
                        confidence=0.9
                    ))
            elif ph_min is not None:
                if 0 <= ph_min <= 14:
                    passed_checks += 1
                else:
                    issues.append(QualityIssue(
                        issue_type=QualityIssueType.INCONSISTENT_DATA,
                        severity='major',
                        field_name='ph_value_min',
                        description="pH value is out of valid range (0-14)",
                        recommendation="Verify pH measurement from SDS document",
                        confidence=0.9
                    ))
        
        # Check flash point reasonableness (Class 3)
        if sds.dangerous_good and sds.dangerous_good.hazard_class == '3' and sds.flash_point_celsius:
            accuracy_checks += 1
            fp = sds.flash_point_celsius
            if -50 <= fp <= 200:  # Reasonable range for most flammable liquids
                passed_checks += 1
            else:
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.INCONSISTENT_DATA,
                    severity='minor',
                    field_name='flash_point_celsius',
                    description="Flash point value seems unreasonable",
                    recommendation="Verify flash point measurement units and accuracy",
                    confidence=0.7
                ))
        
        # Check hazard class consistency
        if sds.dangerous_good and sds.dangerous_good.hazard_class:
            accuracy_checks += 1
            hazard_class = sds.dangerous_good.hazard_class
            
            # Class 3 should have flash point
            if hazard_class == '3' and not sds.flash_point_celsius:
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.INCONSISTENT_DATA,
                    severity='major',
                    field_name='flash_point_celsius',
                    description="Class 3 flammable liquid missing flash point data",
                    recommendation="Add flash point temperature for Class 3 materials",
                    confidence=0.9
                ))
            
            # Class 8 should have pH or corrosivity info
            elif hazard_class == '8' and not sds.has_ph_data:
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.INCONSISTENT_DATA,
                    severity='major',
                    field_name='ph_data',
                    description="Class 8 corrosive material missing pH data",
                    recommendation="Extract pH values from SDS for Class 8 materials",
                    confidence=0.9
                ))
            else:
                passed_checks += 1
        
        # Check revision date reasonableness
        if sds.revision_date:
            accuracy_checks += 1
            current_date = timezone.now().date()
            age_years = (current_date - sds.revision_date).days / 365.25
            
            if age_years <= 5:  # SDS should be reasonably recent
                passed_checks += 1
            else:
                severity = 'critical' if age_years > 10 else 'major'
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.OUTDATED_INFORMATION,
                    severity=severity,
                    field_name='revision_date',
                    description=f"SDS is {age_years:.1f} years old",
                    recommendation="Update to more recent SDS version",
                    confidence=1.0
                ))
        
        accuracy_score = passed_checks / accuracy_checks if accuracy_checks > 0 else 0.0
        return accuracy_score, issues
    
    def _analyze_regulatory_compliance(self, sds: EnhancedSafetyDataSheet) -> Tuple[float, List[QualityIssue]]:
        """Analyze regulatory compliance"""
        issues = []
        compliance_checks = 0
        passed_checks = 0
        
        # Check GHS compliance
        compliance_checks += 1
        if sds.regulatory_standard and 'GHS' in sds.regulatory_standard.upper():
            passed_checks += 1
        else:
            issues.append(QualityIssue(
                issue_type=QualityIssueType.REGULATORY_NON_COMPLIANCE,
                severity='major',
                field_name='regulatory_standard',
                description="SDS should comply with GHS (Globally Harmonized System)",
                recommendation="Update SDS to GHS format and standards",
                confidence=0.8
            ))
        
        # Check Australian country code
        if sds.country_code:
            compliance_checks += 1
            if sds.country_code.upper() == 'AU':
                passed_checks += 1
            else:
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.REGULATORY_NON_COMPLIANCE,
                    severity='minor',
                    field_name='country_code',
                    description="SDS not specifically for Australian jurisdiction",
                    recommendation="Verify applicability to Australian regulations",
                    confidence=0.7
                ))
        
        # Check hazard statements format (GHS H-codes)
        if sds.hazard_statements:
            compliance_checks += 1
            h_codes = [stmt for stmt in sds.hazard_statements if isinstance(stmt, str) and stmt.startswith('H')]
            if h_codes:
                passed_checks += 1
            else:
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.REGULATORY_NON_COMPLIANCE,
                    severity='major',
                    field_name='hazard_statements',
                    description="Missing or invalid GHS H-codes in hazard statements",
                    recommendation="Add proper GHS H-codes (e.g., H226, H315)",
                    confidence=0.85
                ))
        
        # Check precautionary statements format (GHS P-codes)
        if sds.precautionary_statements:
            compliance_checks += 1
            p_codes = [stmt for stmt in sds.precautionary_statements if isinstance(stmt, str) and stmt.startswith('P')]
            if p_codes:
                passed_checks += 1
            else:
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.REGULATORY_NON_COMPLIANCE,
                    severity='minor',
                    field_name='precautionary_statements',
                    description="Missing or invalid GHS P-codes in precautionary statements",
                    recommendation="Add proper GHS P-codes (e.g., P210, P280)",
                    confidence=0.8
                ))
        
        compliance_score = passed_checks / compliance_checks if compliance_checks > 0 else 0.0
        return compliance_score, issues
    
    def _analyze_data_freshness(self, sds: EnhancedSafetyDataSheet) -> Tuple[float, List[QualityIssue]]:
        """Analyze data freshness and currency"""
        issues = []
        
        current_date = timezone.now().date()
        
        # Check SDS age
        if sds.revision_date:
            age_days = (current_date - sds.revision_date).days
            age_score = max(0.0, 1.0 - (age_days / 1825))  # 5-year decay
            
            if age_days > 1825:  # > 5 years
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.OUTDATED_INFORMATION,
                    severity='critical',
                    field_name='revision_date',
                    description=f"SDS is {age_days/365:.1f} years old",
                    recommendation="Obtain updated SDS from manufacturer",
                    confidence=1.0
                ))
            elif age_days > 1095:  # > 3 years
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.OUTDATED_INFORMATION,
                    severity='major',
                    field_name='revision_date',
                    description=f"SDS is {age_days/365:.1f} years old - consider updating",
                    recommendation="Check for updated SDS version",
                    confidence=0.8
                ))
        else:
            age_score = 0.0
            issues.append(QualityIssue(
                issue_type=QualityIssueType.MISSING_CRITICAL_DATA,
                severity='critical',
                field_name='revision_date',
                description="SDS revision date is missing",
                recommendation="Add revision date to SDS",
                confidence=1.0
            ))
        
        # Check expiration date
        if sds.expiration_date:
            if current_date > sds.expiration_date:
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.OUTDATED_INFORMATION,
                    severity='critical',
                    field_name='expiration_date',
                    description="SDS has expired",
                    recommendation="Obtain new SDS from manufacturer",
                    confidence=1.0
                ))
                age_score = min(age_score, 0.1)  # Severely penalize expired SDS
        
        # Check last source update
        if sds.last_source_update:
            source_age_days = (timezone.now() - sds.last_source_update).days
            if source_age_days > 365:  # Source data > 1 year old
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.OUTDATED_INFORMATION,
                    severity='minor',
                    field_name='last_source_update',
                    description="Source data has not been updated recently",
                    recommendation="Refresh data from source",
                    confidence=0.6
                ))
        
        return age_score, issues
    
    def _analyze_source_reliability(self, sds: EnhancedSafetyDataSheet) -> Tuple[float, List[QualityIssue]]:
        """Analyze data source reliability"""
        issues = []
        
        # Check primary source reliability
        source_score = 0.8  # Default score
        
        if sds.primary_source:
            source = sds.primary_source
            source_score = source.reliability_score
            
            # Check source status
            if source.status != 'ACTIVE':
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.SOURCE_RELIABILITY,
                    severity='major',
                    field_name='primary_source',
                    description=f"Primary data source is {source.status}",
                    recommendation="Verify data with alternative source",
                    confidence=0.9
                ))
            
            # Check consecutive failures
            if source.consecutive_failures > 0:
                issues.append(QualityIssue(
                    issue_type=QualityIssueType.SOURCE_RELIABILITY,
                    severity='minor',
                    field_name='primary_source',
                    description=f"Source has {source.consecutive_failures} recent failures",
                    recommendation="Monitor source reliability",
                    confidence=0.7
                ))
        
        # Check verification status
        if sds.verification_status == 'UNVERIFIED':
            issues.append(QualityIssue(
                issue_type=QualityIssueType.SOURCE_RELIABILITY,
                severity='minor',
                field_name='verification_status',
                description="SDS data has not been verified",
                recommendation="Submit for peer review or expert verification",
                confidence=0.8
            ))
        
        return source_score, issues
    
    def _check_for_duplicates(self, sds: EnhancedSafetyDataSheet) -> List[QualityIssue]:
        """Check for potential duplicate SDS records"""
        issues = []
        
        # Look for similar records
        similar_sds = EnhancedSafetyDataSheet.objects.filter(
            product_name__iexact=sds.product_name,
            manufacturer__iexact=sds.manufacturer
        ).exclude(id=sds.id)
        
        if similar_sds.exists():
            issues.append(QualityIssue(
                issue_type=QualityIssueType.DUPLICATE_RECORD,
                severity='minor',
                field_name='product_name',
                description=f"Found {similar_sds.count()} similar SDS records",
                recommendation="Review for potential duplicates and merge if necessary",
                confidence=0.7
            ))
        
        return issues
    
    def _calculate_confidence_score(self, sds: EnhancedSafetyDataSheet, issues: List[QualityIssue]) -> float:
        """Calculate overall confidence score"""
        base_confidence = sds.confidence_score or 0.7
        
        # Reduce confidence based on critical issues
        critical_issues = [issue for issue in issues if issue.severity == 'critical']
        major_issues = [issue for issue in issues if issue.severity == 'major']
        
        confidence_penalty = len(critical_issues) * 0.2 + len(major_issues) * 0.1
        final_confidence = max(0.0, base_confidence - confidence_penalty)
        
        return round(final_confidence, 3)
    
    def _calculate_overall_score(self, completeness: float, accuracy: float, 
                               compliance: float, freshness: float, source: float) -> float:
        """Calculate weighted overall quality score"""
        weights = {
            'completeness': 0.25,
            'accuracy': 0.25,
            'compliance': 0.2,
            'freshness': 0.15,
            'source': 0.15
        }
        
        overall = (
            completeness * weights['completeness'] +
            accuracy * weights['accuracy'] +
            compliance * weights['compliance'] +
            freshness * weights['freshness'] +
            source * weights['source']
        )
        
        return round(overall, 3)
    
    def _generate_recommendations(self, issues: List[QualityIssue], sds: EnhancedSafetyDataSheet) -> List[str]:
        """Generate actionable recommendations based on issues found"""
        recommendations = []
        
        # Group issues by type
        issue_types = {}
        for issue in issues:
            if issue.issue_type not in issue_types:
                issue_types[issue.issue_type] = []
            issue_types[issue.issue_type].append(issue)
        
        # Generate recommendations by issue type
        if QualityIssueType.MISSING_CRITICAL_DATA in issue_types:
            missing_fields = [issue.field_name for issue in issue_types[QualityIssueType.MISSING_CRITICAL_DATA]]
            recommendations.append(f"Complete missing critical fields: {', '.join(set(missing_fields))}")
        
        if QualityIssueType.OUTDATED_INFORMATION in issue_types:
            recommendations.append("Update to more recent SDS version from manufacturer")
        
        if QualityIssueType.REGULATORY_NON_COMPLIANCE in issue_types:
            recommendations.append("Ensure SDS complies with current GHS and Australian regulations")
        
        if QualityIssueType.INCONSISTENT_DATA in issue_types:
            recommendations.append("Verify and correct inconsistent data fields")
        
        # Class-specific recommendations
        if sds.is_corrosive_class_8 and not sds.has_ph_data:
            recommendations.append("Extract pH values from SDS document for Class 8 corrosive material")
        
        if sds.dangerous_good and sds.dangerous_good.hazard_class == '3' and not sds.flash_point_celsius:
            recommendations.append("Add flash point temperature for Class 3 flammable liquid")
        
        return recommendations
    
    def _determine_verification_level(self, overall_score: float, issues: List[QualityIssue]) -> VerificationLevel:
        """Determine appropriate verification level based on quality assessment"""
        critical_issues = [issue for issue in issues if issue.severity == 'critical']
        
        if overall_score >= 0.9 and not critical_issues:
            return VerificationLevel.BASIC_AUTOMATED
        elif overall_score >= 0.7:
            return VerificationLevel.PEER_REVIEW
        elif overall_score >= 0.5:
            return VerificationLevel.EXPERT_VERIFICATION
        else:
            return VerificationLevel.REGULATORY_COMPLIANCE


class SDSVerificationWorkflow:
    """
    Workflow service for managing SDS verification processes
    """
    
    def __init__(self):
        self.analyzer = SDSQualityAnalyzer()
    
    def initiate_verification(self, sds: EnhancedSafetyDataSheet, 
                            requested_by: User,
                            verification_level: Optional[VerificationLevel] = None) -> Dict[str, Any]:
        """
        Initiate verification workflow for an SDS record
        
        Args:
            sds: SDS record to verify
            requested_by: User requesting verification
            verification_level: Specific verification level requested
            
        Returns:
            Dictionary with workflow initiation results
        """
        logger.info(f"Initiating verification for SDS: {sds.product_name}")
        
        try:
            # Perform quality analysis
            verification_result = self.analyzer.analyze_sds_quality(sds)
            
            # Use requested level or determine automatically
            target_level = verification_level or verification_result.verification_level
            
            # Create quality check records
            self._create_quality_check_records(sds, verification_result)
            
            # Update SDS scores
            sds.confidence_score = verification_result.confidence_score
            sds.data_completeness_score = verification_result.completeness_score
            sds.data_accuracy_score = verification_result.accuracy_score
            sds.save(update_fields=['confidence_score', 'data_completeness_score', 'data_accuracy_score'])
            
            # Route to appropriate verification process
            workflow_result = self._route_verification(sds, target_level, requested_by, verification_result)
            
            return {
                'success': True,
                'verification_level': target_level.value,
                'overall_score': verification_result.overall_score,
                'quality_issues_count': len(verification_result.quality_issues),
                'critical_issues_count': len([i for i in verification_result.quality_issues if i.severity == 'critical']),
                'workflow_status': workflow_result.get('status', 'initiated'),
                'next_steps': workflow_result.get('next_steps', []),
                'verification_result': verification_result.to_dict()
            }
            
        except Exception as e:
            logger.error(f"Verification initiation failed for {sds.product_name}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_quality_check_records(self, sds: EnhancedSafetyDataSheet, 
                                    verification_result: VerificationResult):
        """Create quality check records from verification results"""
        
        # Overall quality assessment
        SDSQualityCheck.objects.create(
            sds=sds,
            check_type='COMPLETENESS',
            check_result='PASSED' if verification_result.completeness_score > 0.8 else 'WARNING' if verification_result.completeness_score > 0.5 else 'FAILED',
            score=verification_result.completeness_score,
            details={
                'completeness_score': verification_result.completeness_score,
                'issues': [issue.to_dict() for issue in verification_result.quality_issues if issue.issue_type == QualityIssueType.MISSING_CRITICAL_DATA]
            },
            automated=True
        )
        
        SDSQualityCheck.objects.create(
            sds=sds,
            check_type='ACCURACY',
            check_result='PASSED' if verification_result.accuracy_score > 0.8 else 'WARNING' if verification_result.accuracy_score > 0.5 else 'FAILED',
            score=verification_result.accuracy_score,
            details={
                'accuracy_score': verification_result.accuracy_score,
                'issues': [issue.to_dict() for issue in verification_result.quality_issues if issue.issue_type == QualityIssueType.INCONSISTENT_DATA]
            },
            automated=True
        )
        
        SDSQualityCheck.objects.create(
            sds=sds,
            check_type='REGULATORY',
            check_result='PASSED' if verification_result.regulatory_compliance_score > 0.8 else 'WARNING' if verification_result.regulatory_compliance_score > 0.5 else 'FAILED',
            score=verification_result.regulatory_compliance_score,
            details={
                'compliance_score': verification_result.regulatory_compliance_score,
                'issues': [issue.to_dict() for issue in verification_result.quality_issues if issue.issue_type == QualityIssueType.REGULATORY_NON_COMPLIANCE]
            },
            automated=True
        )
    
    def _route_verification(self, sds: EnhancedSafetyDataSheet, 
                          verification_level: VerificationLevel,
                          requested_by: User,
                          verification_result: VerificationResult) -> Dict[str, Any]:
        """Route SDS to appropriate verification process"""
        
        if verification_level == VerificationLevel.BASIC_AUTOMATED:
            return self._complete_automated_verification(sds, verification_result)
        
        elif verification_level == VerificationLevel.PEER_REVIEW:
            return self._initiate_peer_review(sds, requested_by, verification_result)
        
        elif verification_level == VerificationLevel.EXPERT_VERIFICATION:
            return self._initiate_expert_verification(sds, requested_by, verification_result)
        
        else:
            return self._initiate_regulatory_review(sds, requested_by, verification_result)
    
    def _complete_automated_verification(self, sds: EnhancedSafetyDataSheet, 
                                       verification_result: VerificationResult) -> Dict[str, Any]:
        """Complete automated verification for high-quality SDS"""
        
        sds.verification_status = 'AUTO_VERIFIED'
        sds.verified_at = timezone.now()
        sds.save(update_fields=['verification_status', 'verified_at'])
        
        return {
            'status': 'completed',
            'verification_type': 'automated',
            'next_steps': ['SDS approved for use', 'Monitor for updates'],
            'message': 'SDS passed automated quality checks'
        }
    
    def _initiate_peer_review(self, sds: EnhancedSafetyDataSheet, 
                            requested_by: User,
                            verification_result: VerificationResult) -> Dict[str, Any]:
        """Initiate peer review process"""
        
        # Find potential reviewers (users with review permissions)
        potential_reviewers = User.objects.filter(
            groups__name__in=['SDS_Reviewers', 'Safety_Experts'],
            is_active=True
        ).exclude(id=requested_by.id)
        
        if potential_reviewers.exists():
            # Send review notifications (implement based on notification system)
            self._send_review_notifications(sds, potential_reviewers, 'peer_review')
            
            return {
                'status': 'pending_review',
                'verification_type': 'peer_review',
                'reviewers_notified': potential_reviewers.count(),
                'next_steps': ['Await peer review', 'Address reviewer feedback'],
                'message': f'SDS submitted for peer review to {potential_reviewers.count()} reviewers'
            }
        else:
            # Escalate to expert verification if no peer reviewers available
            return self._initiate_expert_verification(sds, requested_by, verification_result)
    
    def _initiate_expert_verification(self, sds: EnhancedSafetyDataSheet,
                                    requested_by: User,
                                    verification_result: VerificationResult) -> Dict[str, Any]:
        """Initiate expert verification process"""
        
        # Find expert reviewers
        expert_reviewers = User.objects.filter(
            groups__name__in=['Safety_Experts', 'Chemical_Engineers'],
            is_active=True
        ).exclude(id=requested_by.id)
        
        if expert_reviewers.exists():
            self._send_review_notifications(sds, expert_reviewers, 'expert_verification')
            
            return {
                'status': 'pending_expert_review',
                'verification_type': 'expert_verification',
                'experts_notified': expert_reviewers.count(),
                'next_steps': ['Await expert review', 'Address expert feedback', 'Possible regulatory review'],
                'message': f'SDS submitted for expert verification to {expert_reviewers.count()} experts'
            }
        else:
            return {
                'status': 'pending_manual_assignment',
                'verification_type': 'expert_verification',
                'next_steps': ['Assign expert reviewer', 'Contact external consultant'],
                'message': 'No expert reviewers available - manual assignment required'
            }
    
    def _initiate_regulatory_review(self, sds: EnhancedSafetyDataSheet,
                                  requested_by: User,
                                  verification_result: VerificationResult) -> Dict[str, Any]:
        """Initiate regulatory compliance review"""
        
        return {
            'status': 'pending_regulatory_review',
            'verification_type': 'regulatory_compliance',
            'next_steps': [
                'Review against current regulations',
                'Verify with manufacturer',
                'Consider external regulatory consultant'
            ],
            'message': 'SDS requires comprehensive regulatory compliance review'
        }
    
    def _send_review_notifications(self, sds: EnhancedSafetyDataSheet, 
                                 reviewers, review_type: str):
        """Send notifications to potential reviewers"""
        
        # In a real implementation, this would integrate with your notification system
        # For now, we'll log the notification
        
        subject = f"SDS Review Request: {sds.product_name}"
        message = f"""
        A new SDS requires {review_type.replace('_', ' ')}:
        
        Product: {sds.product_name}
        Manufacturer: {sds.manufacturer}
        Hazard Class: {sds.dangerous_good.hazard_class if sds.dangerous_good else 'Unknown'}
        
        Please review at your earliest convenience.
        """
        
        recipient_emails = [user.email for user in reviewers if user.email]
        
        if recipient_emails and hasattr(settings, 'EMAIL_HOST'):
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=recipient_emails,
                    fail_silently=True
                )
                logger.info(f"Review notifications sent for SDS {sds.product_name}")
            except Exception as e:
                logger.error(f"Failed to send review notifications: {str(e)}")
        
        logger.info(f"Review request logged for SDS {sds.product_name}, {len(reviewers)} reviewers notified")
    
    def complete_verification(self, sds: EnhancedSafetyDataSheet,
                            verified_by: User,
                            verification_status: str,
                            notes: str = "") -> Dict[str, Any]:
        """
        Complete verification process
        
        Args:
            sds: SDS record being verified
            verified_by: User completing verification
            verification_status: Final verification status
            notes: Verification notes
            
        Returns:
            Dictionary with completion results
        """
        try:
            # Update verification status
            sds.verification_status = verification_status
            sds.verified_by = verified_by
            sds.verified_at = timezone.now()
            sds.save(update_fields=['verification_status', 'verified_by', 'verified_at'])
            
            # Create completion quality check
            SDSQualityCheck.objects.create(
                sds=sds,
                check_type='REGULATORY',
                check_result='PASSED' if verification_status in ['EXPERT_VERIFIED', 'MANUFACTURER_CONFIRMED'] else 'WARNING',
                details={
                    'verification_status': verification_status,
                    'verified_by': verified_by.username,
                    'verification_notes': notes,
                    'completion_date': timezone.now().isoformat()
                },
                automated=False,
                performed_by=verified_by
            )
            
            logger.info(f"Verification completed for SDS {sds.product_name} by {verified_by.username}")
            
            return {
                'success': True,
                'verification_status': verification_status,
                'verified_by': verified_by.username,
                'verified_at': sds.verified_at.isoformat(),
                'message': 'Verification completed successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to complete verification for {sds.product_name}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }


# Utility functions
def verify_sds(sds_id: str, user: User, verification_level: str = None) -> Dict[str, Any]:
    """
    Convenience function for initiating SDS verification
    """
    try:
        sds = EnhancedSafetyDataSheet.objects.get(id=sds_id)
        level = VerificationLevel(verification_level) if verification_level else None
        
        workflow = SDSVerificationWorkflow()
        return workflow.initiate_verification(sds, user, level)
        
    except EnhancedSafetyDataSheet.DoesNotExist:
        return {'success': False, 'error': 'SDS not found'}
    except ValueError:
        return {'success': False, 'error': 'Invalid verification level'}


def get_sds_quality_report(sds_id: str) -> Dict[str, Any]:
    """
    Generate comprehensive quality report for an SDS
    """
    try:
        sds = EnhancedSafetyDataSheet.objects.get(id=sds_id)
        analyzer = SDSQualityAnalyzer()
        result = analyzer.analyze_sds_quality(sds)
        
        # Get recent quality checks
        recent_checks = SDSQualityCheck.objects.filter(
            sds=sds
        ).order_by('-performed_at')[:10]
        
        return {
            'success': True,
            'sds_info': {
                'product_name': sds.product_name,
                'manufacturer': sds.manufacturer,
                'verification_status': sds.verification_status,
                'last_verified': sds.verified_at.isoformat() if sds.verified_at else None
            },
            'quality_analysis': result.to_dict(),
            'recent_checks': [
                {
                    'check_type': check.check_type,
                    'result': check.check_result,
                    'score': check.score,
                    'performed_at': check.performed_at.isoformat(),
                    'automated': check.automated
                }
                for check in recent_checks
            ]
        }
        
    except EnhancedSafetyDataSheet.DoesNotExist:
        return {'success': False, 'error': 'SDS not found'}