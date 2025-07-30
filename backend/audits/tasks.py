"""
Celery tasks for automated compliance monitoring and alerting
"""
import logging
from datetime import timedelta
from decimal import Decimal
from typing import List, Dict, Any
import asyncio

from celery import shared_task
from django.utils import timezone
from django.db.models import Q, Count, Avg

from .models import (
    AuditLog, ComplianceAuditLog, DangerousGoodsAuditLog, 
    AuditMetrics, AuditActionType
)
from .compliance_monitoring import ComplianceMonitoringService
from .consumers import ComplianceAlertService
from companies.models import Company

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def monitor_compliance_thresholds(self):
    """
    Monitor compliance thresholds across all companies and send alerts
    """
    try:
        companies = Company.objects.filter(is_active=True)
        alerts_sent = 0
        companies_processed = 0
        
        for company in companies:
            try:
                monitoring_service = ComplianceMonitoringService(company)
                
                # Check threshold status
                threshold_status = monitoring_service.get_compliance_threshold_status()
                
                if threshold_status.get('status') == 'THRESHOLD_BREACHED':
                    # Send threshold breach alerts
                    for breach in threshold_status.get('threshold_breaches', []):
                        asyncio.run(send_threshold_breach_alert(company, breach))
                        alerts_sent += 1
                
                # Check for new compliance alerts
                alerts = monitoring_service.get_real_time_alerts()
                critical_alerts = [a for a in alerts if a.get('level') == 'CRITICAL']
                
                if critical_alerts:
                    for alert in critical_alerts:
                        asyncio.run(send_critical_alert(company, alert))
                        alerts_sent += 1
                
                companies_processed += 1
                
            except Exception as e:
                logger.error(f"Error monitoring compliance for company {company.id}: {str(e)}")
                continue
        
        logger.info(f"Compliance threshold monitoring completed: {companies_processed} companies processed, {alerts_sent} alerts sent")
        
        return {
            'companies_processed': companies_processed,
            'alerts_sent': alerts_sent,
            'status': 'completed'
        }
        
    except Exception as exc:
        logger.error(f"Compliance threshold monitoring failed: {str(exc)}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def check_overdue_remediations(self):
    """
    Check for overdue remediation actions and send alerts
    """
    try:
        # Find overdue remediations
        overdue_remediations = ComplianceAuditLog.objects.filter(
            remediation_required=True,
            remediation_deadline__lt=timezone.now(),
            remediation_status__in=['PENDING', 'IN_PROGRESS']
        ).select_related('company', 'audit_log')
        
        remediations_processed = 0
        alerts_sent = 0
        
        # Group by company
        companies_with_overdue = {}
        for remediation in overdue_remediations:
            company_id = str(remediation.company.id)
            if company_id not in companies_with_overdue:
                companies_with_overdue[company_id] = {
                    'company': remediation.company,
                    'remediations': []
                }
            companies_with_overdue[company_id]['remediations'].append(remediation)
        
        # Send alerts for each company
        for company_data in companies_with_overdue.values():
            company = company_data['company']
            overdue_list = company_data['remediations']
            
            # Create alert data
            alert_data = {
                'id': f'overdue_remediations_{company.id}_{timezone.now().timestamp()}',
                'level': 'HIGH',
                'title': 'Overdue Remediation Actions',
                'message': f'{len(overdue_list)} remediation actions are overdue',
                'count': len(overdue_list),
                'timestamp': timezone.now().isoformat(),
                'requires_immediate_attention': True,
                'remediations': [
                    {
                        'id': str(r.id),
                        'regulation_type': r.regulation_type,
                        'deadline': r.remediation_deadline.isoformat(),
                        'days_overdue': (timezone.now().date() - r.remediation_deadline.date()).days,
                        'violation_details': r.violation_details
                    }
                    for r in overdue_list[:10]  # Limit to first 10 for alert
                ]
            }
            
            # Send WebSocket alert
            asyncio.run(ComplianceAlertService.send_remediation_overdue(
                str(company.id), alert_data
            ))
            
            # Update remediation status to escalated if significantly overdue
            for remediation in overdue_list:
                days_overdue = (timezone.now().date() - remediation.remediation_deadline.date()).days
                if days_overdue > 7 and remediation.remediation_status != 'ESCALATED':
                    remediation.remediation_status = 'ESCALATED'
                    remediation.save(update_fields=['remediation_status'])
                    
                    # Log the escalation
                    AuditLog.log_action(
                        action_type=AuditActionType.STATUS_CHANGE,
                        description=f"Remediation action escalated due to {days_overdue} days overdue",
                        content_object=remediation,
                        metadata={
                            'remediation_id': str(remediation.id),
                            'days_overdue': days_overdue,
                            'original_deadline': remediation.remediation_deadline.isoformat(),
                            'escalated_by': 'automated_task'
                        }
                    )
            
            remediations_processed += len(overdue_list)
            alerts_sent += 1
        
        logger.info(f"Overdue remediation check completed: {remediations_processed} remediations processed, {alerts_sent} companies alerted")
        
        return {
            'remediations_processed': remediations_processed,
            'alerts_sent': alerts_sent,
            'status': 'completed'
        }
        
    except Exception as exc:
        logger.error(f"Overdue remediation check failed: {str(exc)}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def generate_daily_compliance_metrics(self):
    """
    Generate daily compliance metrics for all companies
    """
    try:
        companies = Company.objects.filter(is_active=True)
        metrics_generated = 0
        
        for company in companies:
            try:
                # Check if metrics already exist for today
                today = timezone.now().date()
                existing_metrics = AuditMetrics.objects.filter(
                    company=company,
                    date=today,
                    period_type='DAILY'
                ).first()
                
                if existing_metrics:
                    logger.debug(f"Daily metrics already exist for company {company.id}")
                    continue
                
                # Generate metrics for the day
                metrics_data = calculate_daily_metrics(company, today)
                
                # Create AuditMetrics record
                AuditMetrics.objects.create(
                    company=company,
                    date=today,
                    period_type='DAILY',
                    **metrics_data
                )
                
                metrics_generated += 1
                logger.debug(f"Generated daily metrics for company {company.id}")
                
            except Exception as e:
                logger.error(f"Error generating daily metrics for company {company.id}: {str(e)}")
                continue
        
        logger.info(f"Daily compliance metrics generation completed: {metrics_generated} companies processed")
        
        return {
            'metrics_generated': metrics_generated,
            'status': 'completed'
        }
        
    except Exception as exc:
        logger.error(f"Daily compliance metrics generation failed: {str(exc)}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def check_dangerous_goods_compliance(self):
    """
    Check dangerous goods compliance and send alerts for violations
    """
    try:
        # Check for recent DG compliance violations (last 24 hours)
        yesterday = timezone.now() - timedelta(hours=24)
        
        violations = DangerousGoodsAuditLog.objects.filter(
            audit_log__timestamp__gte=yesterday
        ).filter(
            Q(adg_compliant=False) | 
            Q(iata_compliant=False) | 
            Q(imdg_compliant=False)
        ).select_related('company', 'audit_log')
        
        violations_processed = 0
        alerts_sent = 0
        
        # Group by company
        companies_with_violations = {}
        for violation in violations:
            company_id = str(violation.company.id)
            if company_id not in companies_with_violations:
                companies_with_violations[company_id] = {
                    'company': violation.company,
                    'violations': []
                }
            companies_with_violations[company_id]['violations'].append(violation)
        
        # Send alerts for each company
        for company_data in companies_with_violations.values():
            company = company_data['company']
            violation_list = company_data['violations']
            
            # Create alert data
            alert_data = {
                'id': f'dg_violations_{company.id}_{timezone.now().timestamp()}',
                'level': 'HIGH',
                'title': 'Dangerous Goods Compliance Violations',
                'message': f'{len(violation_list)} dangerous goods compliance violations detected in the last 24 hours',
                'count': len(violation_list),
                'timestamp': timezone.now().isoformat(),
                'requires_immediate_attention': True,
                'violations': [
                    {
                        'id': str(v.id),
                        'un_number': v.un_number,
                        'operation_type': v.operation_type,
                        'adg_compliant': v.adg_compliant,
                        'iata_compliant': v.iata_compliant,
                        'imdg_compliant': v.imdg_compliant,
                        'timestamp': v.audit_log.timestamp.isoformat()
                    }
                    for v in violation_list[:10]  # Limit to first 10 for alert
                ]
            }
            
            # Send WebSocket alert
            asyncio.run(ComplianceAlertService.send_violation_detected(
                str(company.id), alert_data
            ))
            
            violations_processed += len(violation_list)
            alerts_sent += 1
        
        logger.info(f"DG compliance check completed: {violations_processed} violations processed, {alerts_sent} companies alerted")
        
        return {
            'violations_processed': violations_processed,
            'alerts_sent': alerts_sent,
            'status': 'completed'
        }
        
    except Exception as exc:
        logger.error(f"DG compliance check failed: {str(exc)}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def send_compliance_status_updates(self):
    """
    Send periodic compliance status updates to connected WebSocket clients
    """
    try:
        companies = Company.objects.filter(is_active=True)
        updates_sent = 0
        
        for company in companies:
            try:
                monitoring_service = ComplianceMonitoringService(company)
                
                # Get current compliance status
                status_data = monitoring_service.get_compliance_status(7)  # Last 7 days
                
                # Send status update
                asyncio.run(ComplianceAlertService.send_status_update(
                    str(company.id), status_data
                ))
                
                updates_sent += 1
                
            except Exception as e:
                logger.error(f"Error sending compliance status update for company {company.id}: {str(e)}")
                continue
        
        logger.info(f"Compliance status updates sent to {updates_sent} companies")
        
        return {
            'updates_sent': updates_sent,
            'status': 'completed'
        }
        
    except Exception as exc:
        logger.error(f"Compliance status updates failed: {str(exc)}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


# Helper functions
async def send_threshold_breach_alert(company: Company, breach_data: Dict[str, Any]):
    """Send threshold breach alert via WebSocket"""
    alert_data = {
        'id': f'threshold_breach_{company.id}_{timezone.now().timestamp()}',
        'level': 'HIGH',
        'title': f'Compliance Threshold Breached: {breach_data["metric"]}',
        'message': f'{breach_data["metric"]} threshold breached: {breach_data["current_value"]} exceeds {breach_data["threshold"]}',
        'breach_details': breach_data,
        'timestamp': timezone.now().isoformat(),
        'requires_immediate_attention': True
    }
    
    await ComplianceAlertService.send_threshold_breach(str(company.id), alert_data)


async def send_critical_alert(company: Company, alert_data: Dict[str, Any]):
    """Send critical compliance alert via WebSocket"""
    await ComplianceAlertService.send_new_alert(str(company.id), alert_data)


def calculate_daily_metrics(company: Company, date) -> Dict[str, Any]:
    """Calculate daily compliance metrics for a company"""
    # Get audit logs for the day
    start_date = timezone.make_aware(timezone.datetime.combine(date, timezone.datetime.min.time()))
    end_date = start_date + timedelta(days=1)
    
    daily_audits = AuditLog.objects.filter(
        timestamp__gte=start_date,
        timestamp__lt=end_date
    ).filter(
        Q(user__company=company) | 
        Q(metadata__contains={'company_id': str(company.id)})
    )
    
    # Basic metrics
    total_audit_events = daily_audits.count()
    security_events = daily_audits.filter(
        action_type__in=[
            AuditActionType.LOGIN, AuditActionType.LOGOUT,
            AuditActionType.ACCESS_DENIED, AuditActionType.ACCESS_GRANTED
        ]
    ).count()
    
    # Compliance-specific metrics
    compliance_audits = ComplianceAuditLog.objects.filter(
        company=company,
        audit_log__timestamp__gte=start_date,
        audit_log__timestamp__lt=end_date
    )
    
    compliance_events = compliance_audits.count()
    compliance_violations = compliance_audits.filter(compliance_status='NON_COMPLIANT').count()
    compliance_warnings = compliance_audits.filter(compliance_status='WARNING').count()
    
    # Dangerous goods metrics
    dg_audits = DangerousGoodsAuditLog.objects.filter(
        company=company,
        audit_log__timestamp__gte=start_date,
        audit_log__timestamp__lt=end_date
    )
    
    dangerous_goods_events = dg_audits.count()
    un_numbers_processed = dg_audits.values('un_number').distinct().count()
    
    # Calculate compliance score
    if compliance_events > 0:
        compliant_count = compliance_audits.filter(compliance_status='COMPLIANT').count()
        average_compliance_score = Decimal((compliant_count / compliance_events) * 100)
    else:
        average_compliance_score = Decimal('100.00')
    
    # Risk metrics
    risk_stats = compliance_audits.exclude(
        risk_assessment_score__isnull=True
    ).aggregate(avg_risk=Avg('risk_assessment_score'))
    
    highest_risk_score = risk_stats.get('avg_risk') or Decimal('0.00')
    
    # User activity
    unique_users_active = daily_audits.values('user').distinct().count()
    
    # System events
    data_export_events = daily_audits.filter(action_type=AuditActionType.EXPORT).count()
    
    # Remediation metrics
    remediation_actions_required = compliance_audits.filter(remediation_required=True).count()
    remediation_actions_completed = compliance_audits.filter(remediation_status='COMPLETED').count()
    
    return {
        'total_audit_events': total_audit_events,
        'security_events': security_events,
        'compliance_events': compliance_events,
        'dangerous_goods_events': dangerous_goods_events,
        'failed_login_attempts': daily_audits.filter(
            action_type=AuditActionType.LOGIN,
            metadata__contains='failed'
        ).count(),
        'compliance_violations': compliance_violations,
        'compliance_warnings': compliance_warnings,
        'remediation_actions_required': remediation_actions_required,
        'remediation_actions_completed': remediation_actions_completed,
        'average_compliance_score': average_compliance_score,
        'highest_risk_score': highest_risk_score,
        'unique_users_active': unique_users_active,
        'data_export_events': data_export_events,
        'system_configuration_changes': daily_audits.filter(
            action_type=AuditActionType.UPDATE,
            metadata__contains='system_configuration'
        ).count(),
        'un_numbers_processed': un_numbers_processed,
        'hazard_classes_involved': list(
            dg_audits.exclude(hazard_class='')
            .values_list('hazard_class', flat=True)
            .distinct()
        ),
        'emergency_procedures_activated': daily_audits.filter(
            action_type=AuditActionType.STATUS_CHANGE,
            metadata__contains='emergency_procedure'
        ).count(),
        'calculation_timestamp': timezone.now()
    }