import os
import io
from datetime import datetime
from typing import Dict, List, Optional, BinaryIO
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
import logging

logger = logging.getLogger(__name__)


class PDFGenerator:
    """
    Base PDF generator class using WeasyPrint
    """
    
    def __init__(self):
        self.font_config = FontConfiguration()
        self.base_css = self._get_base_css()
    
    def _get_base_css(self) -> str:
        """Get base CSS styles for PDF documents"""
        return """
        @page {
            size: A4;
            margin: 2cm;
            @top-center {
                content: "SafeShipper - Dangerous Goods Transport";
                font-size: 10pt;
                color: #666;
            }
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10pt;
                color: #666;
            }
        }
        
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #333;
        }
        
        .header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .company-logo {
            font-size: 24pt;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        
        .document-title {
            font-size: 18pt;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }
        
        .document-subtitle {
            font-size: 12pt;
            color: #6b7280;
            margin-bottom: 20px;
        }
        
        .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 14pt;
            font-weight: bold;
            color: #1e40af;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .info-item {
            margin-bottom: 10px;
        }
        
        .info-label {
            font-weight: bold;
            color: #4b5563;
            display: inline-block;
            min-width: 120px;
        }
        
        .info-value {
            color: #111827;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .table th,
        .table td {
            border: 1px solid #d1d5db;
            padding: 8px;
            text-align: left;
        }
        
        .table th {
            background-color: #f3f4f6;
            font-weight: bold;
            color: #374151;
        }
        
        .table tr:nth-child(even) {
            background-color: #f9fafb;
        }
        
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 9pt;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-pending { background-color: #fef3c7; color: #92400e; }
        .status-in-transit { background-color: #dbeafe; color: #1e40af; }
        .status-delivered { background-color: #d1fae5; color: #047857; }
        .status-exception { background-color: #fee2e2; color: #dc2626; }
        
        .hazard-class {
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9pt;
        }
        
        .hazard-class-1 { background-color: #fef2f2; color: #dc2626; }
        .hazard-class-2 { background-color: #fefce8; color: #ca8a04; }
        .hazard-class-3 { background-color: #fee2e2; color: #dc2626; }
        .hazard-class-4 { background-color: #fef3c7; color: #d97706; }
        .hazard-class-5 { background-color: #fefce8; color: #ca8a04; }
        .hazard-class-6 { background-color: #f3f4f6; color: #374151; }
        .hazard-class-7 { background-color: #fef2f2; color: #dc2626; }
        .hazard-class-8 { background-color: #f0f9ff; color: #0369a1; }
        .hazard-class-9 { background-color: #f8fafc; color: #475569; }
        
        .compliance-section {
            background-color: #f8fafc;
            padding: 15px;
            border-left: 4px solid #2563eb;
            margin-bottom: 20px;
        }
        
        .warning-box {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 9pt;
            color: #6b7280;
        }
        
        .page-break {
            page-break-before: always;
        }
        """
    
    def generate_pdf(self, html_content: str, additional_css: str = "") -> bytes:
        """
        Generate PDF from HTML content
        
        Args:
            html_content: HTML content to convert
            additional_css: Additional CSS styles
            
        Returns:
            PDF content as bytes
        """
        try:
            # Combine CSS
            combined_css = self.base_css + "\n" + additional_css
            
            # Generate PDF
            html = HTML(string=html_content)
            css = CSS(string=combined_css, font_config=self.font_config)
            
            pdf_bytes = html.write_pdf(stylesheets=[css], font_config=self.font_config)
            
            logger.info("PDF generated successfully")
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"PDF generation failed: {str(e)}")
            raise Exception(f"PDF generation failed: {str(e)}")


class ShipmentReportGenerator(PDFGenerator):
    """
    Generator for comprehensive shipment reports
    """
    
    def generate_shipment_report(self, shipment, include_audit_trail: bool = True) -> bytes:
        """
        Generate comprehensive shipment report PDF
        
        Args:
            shipment: Shipment instance
            include_audit_trail: Whether to include audit trail
            
        Returns:
            PDF content as bytes
        """
        # Prepare context data
        context = self._prepare_shipment_context(shipment, include_audit_trail)
        
        # Render HTML template
        html_content = render_to_string('documents/pdf/shipment_report.html', context)
        
        # Generate PDF
        return self.generate_pdf(html_content)
    
    def _prepare_shipment_context(self, shipment, include_audit_trail: bool) -> Dict:
        """Prepare context data for shipment report"""
        from audits.models import ShipmentAuditLog
        from communications.models import Communication
        
        # Get related data
        consignment_items = shipment.items.all()
        dangerous_items = consignment_items.filter(is_dangerous_good=True)
        documents = shipment.documents.all()
        
        # Get audit trail if requested
        audit_logs = None
        if include_audit_trail:
            audit_logs = ShipmentAuditLog.objects.filter(
                shipment=shipment
            ).select_related('audit_log', 'audit_log__user').order_by('-audit_log__timestamp')[:20]
        
        # Get communications
        communications = Communication.objects.filter(
            shipment=shipment
        ).order_by('-created_at')[:10]
        
        # Calculate totals
        total_weight = sum(
            (item.weight_kg or 0) * item.quantity 
            for item in consignment_items
        )
        
        total_items = sum(item.quantity for item in consignment_items)
        
        return {
            'shipment': shipment,
            'consignment_items': consignment_items,
            'dangerous_items': dangerous_items,
            'documents': documents,
            'audit_logs': audit_logs,
            'communications': communications,
            'total_weight': total_weight,
            'total_items': total_items,
            'generation_date': timezone.now(),
            'include_audit_trail': include_audit_trail,
        }


class ComplianceCertificateGenerator(PDFGenerator):
    """
    Generator for compliance certificates
    """
    
    def generate_compliance_certificate(self, shipment) -> bytes:
        """
        Generate compliance certificate PDF
        
        Args:
            shipment: Shipment instance
            
        Returns:
            PDF content as bytes
        """
        context = self._prepare_compliance_context(shipment)
        html_content = render_to_string('documents/pdf/compliance_certificate.html', context)
        return self.generate_pdf(html_content)
    
    def _prepare_compliance_context(self, shipment) -> Dict:
        """Prepare context data for compliance certificate"""
        from inspections.models import Inspection
        
        # Get dangerous goods items
        dangerous_items = shipment.items.filter(is_dangerous_good=True)
        
        # Get latest inspection
        latest_inspection = Inspection.objects.filter(
            shipment=shipment
        ).order_by('-created_at').first()
        
        # Check compliance status
        compliance_status = self._assess_compliance_status(shipment, dangerous_items)
        
        return {
            'shipment': shipment,
            'dangerous_items': dangerous_items,
            'latest_inspection': latest_inspection,
            'compliance_status': compliance_status,
            'certificate_number': f"CERT-{shipment.tracking_number}-{timezone.now().strftime('%Y%m%d')}",
            'issue_date': timezone.now(),
            'valid_until': timezone.now().replace(year=timezone.now().year + 1),
        }
    
    def _assess_compliance_status(self, shipment, dangerous_items) -> Dict:
        """Assess overall compliance status"""
        status = {
            'is_compliant': True,
            'issues': [],
            'warnings': [],
        }
        
        # Check if all dangerous items have proper documentation
        for item in dangerous_items:
            if not item.dangerous_good_entry:
                status['is_compliant'] = False
                status['issues'].append(f"Item '{item.description}' lacks proper DG classification")
        
        # Check if required documents are present
        required_docs = ['DG_MANIFEST', 'DG_DECLARATION']
        present_docs = set(shipment.documents.values_list('document_type', flat=True))
        
        for doc_type in required_docs:
            if doc_type not in present_docs:
                status['warnings'].append(f"Missing {doc_type.replace('_', ' ').title()}")
        
        return status


class ManifestGenerator(PDFGenerator):
    """
    Generator for dangerous goods manifests
    """
    
    def generate_manifest(self, shipment) -> bytes:
        """
        Generate dangerous goods manifest PDF
        
        Args:
            shipment: Shipment instance
            
        Returns:
            PDF content as bytes
        """
        context = self._prepare_manifest_context(shipment)
        html_content = render_to_string('documents/pdf/dg_manifest.html', context)
        
        # Add manifest-specific CSS
        manifest_css = """
        .manifest-header {
            background-color: #fee2e2;
            border: 2px solid #dc2626;
            padding: 15px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .manifest-title {
            font-size: 16pt;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 5px;
        }
        
        .dg-item {
            border: 1px solid #d1d5db;
            margin-bottom: 15px;
            padding: 12px;
            background-color: #f9fafb;
        }
        
        .un-number {
            font-size: 14pt;
            font-weight: bold;
            color: #dc2626;
        }
        """
        
        return self.generate_pdf(html_content, manifest_css)
    
    def _prepare_manifest_context(self, shipment) -> Dict:
        """Prepare context data for manifest"""
        dangerous_items = shipment.items.filter(is_dangerous_good=True)
        
        # Group by hazard class for better organization
        items_by_class = {}
        for item in dangerous_items:
            if item.dangerous_good_entry:
                hazard_class = item.dangerous_good_entry.hazard_class
                if hazard_class not in items_by_class:
                    items_by_class[hazard_class] = []
                items_by_class[hazard_class].append(item)
        
        return {
            'shipment': shipment,
            'dangerous_items': dangerous_items,
            'items_by_class': items_by_class,
            'manifest_number': f"MANIFEST-{shipment.tracking_number}",
            'issue_date': timezone.now(),
        }


class CustomReportGenerator(PDFGenerator):
    """
    Generator for custom reports with flexible templates
    """
    
    def generate_custom_report(self, template_name: str, context: Dict, 
                             additional_css: str = "") -> bytes:
        """
        Generate custom report from template
        
        Args:
            template_name: Name of the template file
            context: Context data for template
            additional_css: Additional CSS styles
            
        Returns:
            PDF content as bytes
        """
        # Add generation metadata
        context.update({
            'generation_date': timezone.now(),
            'generated_by': 'SafeShipper Platform',
        })
        
        html_content = render_to_string(f'documents/pdf/{template_name}', context)
        return self.generate_pdf(html_content, additional_css)


class BatchReportGenerator:
    """
    Generator for batch processing multiple reports
    """
    
    def __init__(self):
        self.shipment_generator = ShipmentReportGenerator()
        self.compliance_generator = ComplianceCertificateGenerator()
        self.manifest_generator = ManifestGenerator()
    
    def generate_batch_reports(self, shipments: List, report_types: List[str]) -> Dict[str, bytes]:
        """
        Generate multiple reports for multiple shipments
        
        Args:
            shipments: List of shipment instances
            report_types: List of report types to generate
            
        Returns:
            Dictionary mapping filename to PDF bytes
        """
        reports = {}
        
        for shipment in shipments:
            for report_type in report_types:
                try:
                    if report_type == 'shipment_report':
                        pdf_bytes = self.shipment_generator.generate_shipment_report(shipment)
                        filename = f"shipment_report_{shipment.tracking_number}.pdf"
                    
                    elif report_type == 'compliance_certificate':
                        pdf_bytes = self.compliance_generator.generate_compliance_certificate(shipment)
                        filename = f"compliance_cert_{shipment.tracking_number}.pdf"
                    
                    elif report_type == 'dg_manifest':
                        pdf_bytes = self.manifest_generator.generate_manifest(shipment)
                        filename = f"dg_manifest_{shipment.tracking_number}.pdf"
                    
                    else:
                        logger.warning(f"Unknown report type: {report_type}")
                        continue
                    
                    reports[filename] = pdf_bytes
                    logger.info(f"Generated {report_type} for shipment {shipment.tracking_number}")
                    
                except Exception as e:
                    logger.error(f"Failed to generate {report_type} for shipment {shipment.tracking_number}: {str(e)}")
                    continue
        
        return reports


# Convenience functions for easy access
def generate_shipment_report(shipment, include_audit_trail: bool = True) -> bytes:
    """Generate shipment report PDF"""
    generator = ShipmentReportGenerator()
    return generator.generate_shipment_report(shipment, include_audit_trail)


def generate_compliance_certificate(shipment) -> bytes:
    """Generate compliance certificate PDF"""
    generator = ComplianceCertificateGenerator()
    return generator.generate_compliance_certificate(shipment)


def generate_dg_manifest(shipment) -> bytes:
    """Generate dangerous goods manifest PDF"""
    generator = ManifestGenerator()
    return generator.generate_manifest(shipment)


def generate_custom_report(template_name: str, context: Dict, additional_css: str = "") -> bytes:
    """Generate custom report PDF"""
    generator = CustomReportGenerator()
    return generator.generate_custom_report(template_name, context, additional_css)