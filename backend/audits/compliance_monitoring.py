"""
Compliance monitoring service for real-time status tracking and alerting
"""
from django.db.models import Q, Count, Avg, Max, Min
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal
from typing import Dict, List, Any, Optional, Tuple
import logging

from .models import (
    AuditLog, ComplianceAuditLog, DangerousGoodsAuditLog, 
    AuditMetrics, AuditActionType
)
from companies.models import Company

logger = logging.getLogger(__name__)


class ComplianceMonitoringService:
    """
    Service for real-time compliance monitoring and alerting
    """
    
    # Compliance thresholds
    CRITICAL_RISK_THRESHOLD = Decimal('90.0')
    HIGH_RISK_THRESHOLD = Decimal('75.0')
    MEDIUM_RISK_THRESHOLD = Decimal('50.0')
    
    # Alert thresholds
    VIOLATION_RATE_THRESHOLD = 0.10  # 10% violation rate triggers alert
    OVERDUE_REMEDIATION_THRESHOLD = 3  # 3 overdue items triggers alert
    HIGH_RISK_COUNT_THRESHOLD = 5  # 5 high-risk items triggers alert
    
    def __init__(self, company: Company):
        self.company = company
    
    def get_compliance_status(self, period_days: int = 30) -> Dict[str, Any]:
        """
        Get comprehensive compliance status for the company
        """
        end_date = timezone.now()
        start_date = end_date - timedelta(days=period_days)
        
        # Get compliance audit logs for the period
        compliance_logs = ComplianceAuditLog.objects.filter(
            company=self.company,
            audit_log__timestamp__gte=start_date,
            audit_log__timestamp__lte=end_date
        )
        
        total_audits = compliance_logs.count()
        if total_audits == 0:
            return self._empty_compliance_status()
        
        # Calculate compliance metrics
        status_breakdown = self._get_status_breakdown(compliance_logs)
        risk_analysis = self._get_risk_analysis(compliance_logs)
        remediation_status = self._get_remediation_status(compliance_logs)
        regulation_compliance = self._get_regulation_compliance(compliance_logs)
        dangerous_goods_compliance = self._get_dg_compliance_status(compliance_logs)
        
        # Calculate overall compliance score
        overall_score = self._calculate_overall_compliance_score(
            status_breakdown, risk_analysis, remediation_status
        )
        
        # Generate alerts
        alerts = self._generate_compliance_alerts(
            status_breakdown, risk_analysis, remediation_status
        )
        
        # Trend analysis
        trends = self._get_compliance_trends(period_days)
        
        return {
            'company_id': str(self.company.id),
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': period_days
            },
            'overall_compliance_score': overall_score,
            'total_audits': total_audits,
            'status_breakdown': status_breakdown,
            'risk_analysis': risk_analysis,
            'remediation_status': remediation_status,
            'regulation_compliance': regulation_compliance,
            'dangerous_goods_compliance': dangerous_goods_compliance,
            'alerts': alerts,
            'trends': trends,
            'last_updated': timezone.now().isoformat()
        }
    
    def get_real_time_alerts(self) -> List[Dict[str, Any]]:
        """
        Get current real-time compliance alerts
        """
        alerts = []
        
        # Check for recent critical violations
        recent_critical = ComplianceAuditLog.objects.filter(
            company=self.company,
            compliance_status='NON_COMPLIANT',
            risk_assessment_score__gte=self.CRITICAL_RISK_THRESHOLD,
            audit_log__timestamp__gte=timezone.now() - timedelta(hours=24)
        ).count()
        
        if recent_critical > 0:
            alerts.append({
                'id': 'critical_violations',
                'level': 'CRITICAL',
                'title': 'Critical Compliance Violations Detected',
                'message': f'{recent_critical} critical compliance violations in the last 24 hours',
                'count': recent_critical,
                'timestamp': timezone.now().isoformat(),
                'requires_immediate_attention': True
            })
        
        # Check for overdue remediations
        overdue_remediations = ComplianceAuditLog.objects.filter(
            company=self.company,
            remediation_required=True,
            remediation_deadline__lt=timezone.now(),
            remediation_status__in=['PENDING', 'IN_PROGRESS']
        ).count()
        
        if overdue_remediations >= self.OVERDUE_REMEDIATION_THRESHOLD:
            alerts.append({
                'id': 'overdue_remediations',
                'level': 'HIGH',
                'title': 'Overdue Remediation Actions',
                'message': f'{overdue_remediations} remediation actions are overdue',
                'count': overdue_remediations,
                'timestamp': timezone.now().isoformat(),
                'requires_immediate_attention': True
            })
        
        # Check for dangerous goods compliance issues
        dg_violations = DangerousGoodsAuditLog.objects.filter(
            company=self.company,
            audit_log__timestamp__gte=timezone.now() - timedelta(hours=24)
        ).filter(
            Q(adg_compliant=False) | 
            Q(iata_compliant=False) | 
            Q(imdg_compliant=False)
        ).count()
        
        if dg_violations > 0:
            alerts.append({
                'id': 'dg_compliance_violations',
                'level': 'HIGH',
                'title': 'Dangerous Goods Compliance Issues',
                'message': f'{dg_violations} dangerous goods compliance violations detected',
                'count': dg_violations,
                'timestamp': timezone.now().isoformat(),
                'requires_immediate_attention': True
            })
        
        # Check for failed regulatory notifications
        failed_notifications = DangerousGoodsAuditLog.objects.filter(
            company=self.company,
            regulatory_notification_required=True,
            regulatory_notification_sent=False,
            audit_log__timestamp__lt=timezone.now() - timedelta(hours=48)
        ).count()
        
        if failed_notifications > 0:
            alerts.append({
                'id': 'failed_notifications',
                'level': 'MEDIUM',
                'title': 'Pending Regulatory Notifications',
                'message': f'{failed_notifications} regulatory notifications are overdue',
                'count': failed_notifications,
                'timestamp': timezone.now().isoformat(),
                'requires_immediate_attention': False
            })
        
        return alerts
    
    def get_compliance_threshold_status(self) -> Dict[str, Any]:
        """
        Get current status against compliance thresholds
        """
        # Get recent compliance data (last 7 days)
        recent_logs = ComplianceAuditLog.objects.filter(
            company=self.company,
            audit_log__timestamp__gte=timezone.now() - timedelta(days=7)
        )
        
        if not recent_logs.exists():
            return {'status': 'NO_DATA', 'message': 'No recent compliance data available'}
        
        # Calculate violation rate
        total_recent = recent_logs.count()
        violations = recent_logs.filter(compliance_status='NON_COMPLIANT').count()
        violation_rate = violations / total_recent if total_recent > 0 else 0
        
        # Calculate average risk score
        avg_risk = recent_logs.exclude(
            risk_assessment_score__isnull=True
        ).aggregate(
            avg_risk=Avg('risk_assessment_score')
        )['avg_risk'] or Decimal('0.0')
        
        # Calculate remediation efficiency
        required_remediations = recent_logs.filter(remediation_required=True).count()
        completed_remediations = recent_logs.filter(remediation_status='COMPLETED').count()
        remediation_rate = (
            completed_remediations / required_remediations 
            if required_remediations > 0 else 1.0
        )
        
        # Determine overall threshold status
        threshold_breaches = []
        
        if violation_rate > self.VIOLATION_RATE_THRESHOLD:
            threshold_breaches.append({
                'metric': 'violation_rate',
                'current_value': violation_rate,
                'threshold': self.VIOLATION_RATE_THRESHOLD,
                'severity': 'HIGH'
            })
        
        if avg_risk >= self.HIGH_RISK_THRESHOLD:
            threshold_breaches.append({
                'metric': 'average_risk_score',
                'current_value': float(avg_risk),
                'threshold': float(self.HIGH_RISK_THRESHOLD),
                'severity': 'MEDIUM' if avg_risk < self.CRITICAL_RISK_THRESHOLD else 'HIGH'
            })
        
        if remediation_rate < 0.8:  # Less than 80% remediation completion
            threshold_breaches.append({
                'metric': 'remediation_completion_rate',
                'current_value': remediation_rate,
                'threshold': 0.8,
                'severity': 'MEDIUM'
            })
        
        return {
            'status': 'THRESHOLD_BREACHED' if threshold_breaches else 'WITHIN_THRESHOLDS',
            'violation_rate': violation_rate,
            'average_risk_score': float(avg_risk),
            'remediation_completion_rate': remediation_rate,
            'threshold_breaches': threshold_breaches,
            'evaluation_period': '7_days',
            'last_updated': timezone.now().isoformat()
        }
    
    def _empty_compliance_status(self) -> Dict[str, Any]:
        """Return empty compliance status when no data is available"""
        return {
            'company_id': str(self.company.id),
            'overall_compliance_score': 100.0,
            'total_audits': 0,
            'status_breakdown': {},
            'risk_analysis': {'average_risk': 0.0, 'high_risk_count': 0},
            'remediation_status': {'required': 0, 'completed': 0, 'overdue': 0},
            'regulation_compliance': {},
            'dangerous_goods_compliance': {},
            'alerts': [],
            'trends': [],
            'last_updated': timezone.now().isoformat()
        }
    
    def _get_status_breakdown(self, compliance_logs) -> Dict[str, int]:
        """Get breakdown of compliance statuses"""
        return dict(
            compliance_logs.values('compliance_status')
            .annotate(count=Count('id'))
            .values_list('compliance_status', 'count')
        )
    
    def _get_risk_analysis(self, compliance_logs) -> Dict[str, Any]:
        """Get risk analysis from compliance logs"""
        risk_stats = compliance_logs.exclude(
            risk_assessment_score__isnull=True
        ).aggregate(
            average_risk=Avg('risk_assessment_score'),
            max_risk=Max('risk_assessment_score'),
            min_risk=Min('risk_assessment_score')
        )
        
        high_risk_count = compliance_logs.filter(
            risk_assessment_score__gte=self.HIGH_RISK_THRESHOLD
        ).count()
        
        critical_risk_count = compliance_logs.filter(
            risk_assessment_score__gte=self.CRITICAL_RISK_THRESHOLD
        ).count()
        
        return {
            'average_risk': float(risk_stats['average_risk'] or 0),
            'max_risk': float(risk_stats['max_risk'] or 0),
            'min_risk': float(risk_stats['min_risk'] or 0),
            'high_risk_count': high_risk_count,
            'critical_risk_count': critical_risk_count
        }
    
    def _get_remediation_status(self, compliance_logs) -> Dict[str, int]:
        """Get remediation status breakdown"""
        required = compliance_logs.filter(remediation_required=True).count()
        completed = compliance_logs.filter(remediation_status='COMPLETED').count()
        overdue = compliance_logs.filter(
            remediation_required=True,
            remediation_deadline__lt=timezone.now(),
            remediation_status__in=['PENDING', 'IN_PROGRESS']
        ).count()
        
        return {
            'required': required,
            'completed': completed,
            'overdue': overdue,
            'completion_rate': (completed / required) if required > 0 else 1.0
        }
    
    def _get_regulation_compliance(self, compliance_logs) -> Dict[str, Dict[str, Any]]:
        """Get compliance breakdown by regulation type"""
        regulation_compliance = {}
        
        for regulation_type in ['ADG_CODE', 'IATA_DGR', 'IMDG', 'DOT_HAZMAT']:
            reg_logs = compliance_logs.filter(regulation_type=regulation_type)
            total = reg_logs.count()
            
            if total > 0:
                compliant = reg_logs.filter(compliance_status='COMPLIANT').count()
                regulation_compliance[regulation_type] = {
                    'total_audits': total,
                    'compliant_count': compliant,
                    'compliance_rate': (compliant / total) * 100,
                    'violations': reg_logs.filter(compliance_status='NON_COMPLIANT').count(),
                    'warnings': reg_logs.filter(compliance_status='WARNING').count()
                }
        
        return regulation_compliance
    
    def _get_dg_compliance_status(self, compliance_logs) -> Dict[str, Any]:
        """Get dangerous goods specific compliance status"""
        # Get dangerous goods audit logs for the same period
        dg_logs = DangerousGoodsAuditLog.objects.filter(
            company=self.company,
            audit_log__timestamp__gte=compliance_logs.first().audit_log.timestamp if compliance_logs.exists() else timezone.now() - timedelta(days=30),
            audit_log__timestamp__lte=compliance_logs.last().audit_log.timestamp if compliance_logs.exists() else timezone.now()
        )
        
        if not dg_logs.exists():
            return {'total_dg_audits': 0}
        
        total_dg = dg_logs.count()
        
        return {
            'total_dg_audits': total_dg,
            'adg_compliance_rate': (dg_logs.filter(adg_compliant=True).count() / total_dg) * 100,
            'iata_compliance_rate': (dg_logs.filter(iata_compliant=True).count() / total_dg) * 100,
            'imdg_compliance_rate': (dg_logs.filter(imdg_compliant=True).count() / total_dg) * 100,
            'operations_by_type': dict(
                dg_logs.values('operation_type')
                .annotate(count=Count('id'))
                .values_list('operation_type', 'count')
            ),
            'most_frequent_un_numbers': self._get_most_frequent_un_numbers(dg_logs),
            'regulatory_notifications_pending': dg_logs.filter(
                regulatory_notification_required=True,
                regulatory_notification_sent=False
            ).count()
        }
    
    def _get_most_frequent_un_numbers(self, dg_logs) -> List[Tuple[str, int]]:
        """Get most frequently audited UN numbers"""
        un_number_frequency = {}
        
        for log in dg_logs.exclude(un_number=''):
            un_number = log.un_number
            un_number_frequency[un_number] = un_number_frequency.get(un_number, 0) + 1
        
        return sorted(un_number_frequency.items(), key=lambda x: x[1], reverse=True)[:10]
    
    def _calculate_overall_compliance_score(
        self, 
        status_breakdown: Dict[str, int], 
        risk_analysis: Dict[str, Any], 
        remediation_status: Dict[str, int]
    ) -> float:
        """
        Calculate overall compliance score (0-100)
        """
        total_events = sum(status_breakdown.values())
        if total_events == 0:
            return 100.0
        
        # Base score from compliance status
        compliant_count = status_breakdown.get('COMPLIANT', 0)
        warning_count = status_breakdown.get('WARNING', 0)
        non_compliant_count = status_breakdown.get('NON_COMPLIANT', 0)
        
        # Weight the different statuses
        weighted_score = (
            (compliant_count * 1.0) + 
            (warning_count * 0.7) + 
            (non_compliant_count * 0.0)
        ) / total_events * 100
        
        # Adjust for risk levels
        if risk_analysis['average_risk'] > 75:
            weighted_score *= 0.9  # 10% penalty for high average risk
        elif risk_analysis['average_risk'] > 50:
            weighted_score *= 0.95  # 5% penalty for medium average risk
        
        # Adjust for remediation completion
        remediation_rate = remediation_status.get('completion_rate', 1.0)
        if remediation_rate < 0.8:
            weighted_score *= 0.9  # 10% penalty for poor remediation completion
        
        return round(max(0.0, min(100.0, weighted_score)), 2)
    
    def _generate_compliance_alerts(
        self, 
        status_breakdown: Dict[str, int], 
        risk_analysis: Dict[str, Any], 
        remediation_status: Dict[str, int]
    ) -> List[Dict[str, Any]]:
        """
        Generate compliance alerts based on current status
        """
        alerts = []
        
        # High violation rate alert
        total_events = sum(status_breakdown.values())
        if total_events > 0:
            violation_rate = status_breakdown.get('NON_COMPLIANT', 0) / total_events
            if violation_rate > self.VIOLATION_RATE_THRESHOLD:
                alerts.append({
                    'type': 'HIGH_VIOLATION_RATE',
                    'level': 'HIGH',
                    'message': f'Violation rate of {violation_rate:.1%} exceeds threshold of {self.VIOLATION_RATE_THRESHOLD:.1%}',
                    'value': violation_rate,
                    'threshold': self.VIOLATION_RATE_THRESHOLD
                })
        
        # High risk alert
        if risk_analysis['critical_risk_count'] > 0:
            alerts.append({
                'type': 'CRITICAL_RISK_ITEMS',
                'level': 'CRITICAL',
                'message': f'{risk_analysis["critical_risk_count"]} items with critical risk scores detected',
                'value': risk_analysis['critical_risk_count'],
                'threshold': 0
            })
        
        # Overdue remediation alert
        if remediation_status['overdue'] >= self.OVERDUE_REMEDIATION_THRESHOLD:
            alerts.append({
                'type': 'OVERDUE_REMEDIATIONS',
                'level': 'MEDIUM',
                'message': f'{remediation_status["overdue"]} remediation actions are overdue',
                'value': remediation_status['overdue'],
                'threshold': self.OVERDUE_REMEDIATION_THRESHOLD
            })
        
        return alerts
    
    def _get_compliance_trends(self, period_days: int) -> List[Dict[str, Any]]:
        """
        Get compliance trends over the period
        """
        # Split period into weekly segments for trend analysis
        trends = []
        end_date = timezone.now()
        
        for week in range(0, min(period_days // 7, 8)):  # Max 8 weeks of trend data
            week_end = end_date - timedelta(days=week * 7)
            week_start = week_end - timedelta(days=7)
            
            week_logs = ComplianceAuditLog.objects.filter(
                company=self.company,
                audit_log__timestamp__gte=week_start,
                audit_log__timestamp__lt=week_end
            )
            
            total_week = week_logs.count()
            if total_week > 0:
                compliant_week = week_logs.filter(compliance_status='COMPLIANT').count()
                compliance_rate = (compliant_week / total_week) * 100
                
                avg_risk = week_logs.exclude(
                    risk_assessment_score__isnull=True
                ).aggregate(
                    avg_risk=Avg('risk_assessment_score')
                )['avg_risk'] or 0
                
                trends.append({
                    'week_start': week_start.date().isoformat(),
                    'week_end': week_end.date().isoformat(),
                    'total_audits': total_week,
                    'compliance_rate': round(compliance_rate, 2),
                    'average_risk_score': round(float(avg_risk), 2)
                })
        
        return list(reversed(trends))  # Most recent first