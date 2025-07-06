# services.py for manifests app

from typing import Dict, List, Set, Optional, Tuple
import fitz  # PyMuPDF
import re
import logging
from django.utils import timezone
from documents.models import Document, DocumentStatus
from documents.services import analyze_manifest
from dangerous_goods.services import match_synonym_to_dg, check_dg_compatibility, check_list_compatibility
from dangerous_goods.models import DangerousGood
from django.utils.translation import gettext_lazy as _
from .models import Manifest, ManifestDangerousGoodMatch, ManifestStatus, ManifestType

logger = logging.getLogger(__name__)

def extract_text_from_pdf(document: Document) -> str:
    """
    Extract text from a PDF document using PyMuPDF.
    
    Args:
        document: Document instance with a PDF file
        
    Returns:
        Extracted text as a string
        
    Raises:
        ValueError: If the file is not a PDF or cannot be read
    """
    try:
        with fitz.open(document.file.path) as pdf:
            text = ""
            for page in pdf:
                text += page.get_text()
            return text
    except Exception as e:
        raise ValueError(
            _("Failed to extract text from PDF: {error}").format(error=str(e))
        )

def identify_dg_items(text: str) -> Tuple[List[DangerousGood], List[str]]:
    """
    Identify dangerous goods items from text.
    
    Args:
        text: Text to analyze
        
    Returns:
        Tuple of (identified_dgs, unmatched_entries)
    """
    identified_dgs = []
    unmatched_entries = []
    
    # Split text into lines and process each line
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Try to match the line to a DG
        dg = match_synonym_to_dg(line)
        if dg:
            identified_dgs.append(dg)
        else:
            # Check if line might contain DG information
            if any(keyword in line.lower() for keyword in ['un', 'dangerous', 'hazard']):
                unmatched_entries.append(line)
    
    return identified_dgs, unmatched_entries

def create_manifest_from_document(document: Document, manifest_type: str = None) -> Manifest:
    """
    Create a Manifest instance from a Document.
    
    Args:
        document: Document instance
        manifest_type: Type of manifest (defaults to DG_MANIFEST)
        
    Returns:
        Created Manifest instance
    """
    if not manifest_type:
        manifest_type = ManifestType.DG_MANIFEST
    
    manifest = Manifest.objects.create(
        document=document,
        shipment=document.shipment,
        manifest_type=manifest_type,
        status=ManifestStatus.UPLOADED
    )
    
    logger.info(f"Created manifest {manifest.id} for document {document.id}")
    return manifest

def run_enhanced_manifest_analysis(document: Document) -> Dict:
    """
    Run enhanced manifest analysis using the improved documents services.
    
    Args:
        document: Document instance to analyze
        
    Returns:
        Dict containing enhanced analysis results
    """
    try:
        # Use the enhanced analyze_manifest function from documents services
        analysis_results = analyze_manifest(document)
        
        # Get or create manifest record
        manifest = None
        if hasattr(document, 'manifest'):
            manifest = document.manifest
            manifest.status = ManifestStatus.ANALYZING
            manifest.analysis_started_at = timezone.now()
            manifest.save()
        
        # Extract dangerous goods from analysis results
        potential_dgs = analysis_results.get('potential_dangerous_goods', [])
        
        # Create manifest DG matches if we have a manifest
        if manifest and potential_dgs:
            create_manifest_dg_matches(manifest, potential_dgs)
        
        # Check compatibility
        compatibility_result = None
        if len(potential_dgs) > 1:
            un_numbers = [dg['un_number'] for dg in potential_dgs]
            compatibility_result = check_list_compatibility(un_numbers)
        
        # Prepare enhanced results
        enhanced_results = {
            'analysis_results': analysis_results,
            'compatibility_check': compatibility_result,
            'total_potential_dgs': len(potential_dgs),
            'requires_confirmation': len(potential_dgs) > 0,
            'processing_metadata': analysis_results.get('metadata', {})
        }
        
        # Update manifest status
        if manifest:
            manifest.analysis_results = enhanced_results
            manifest.analysis_completed_at = timezone.now()
            manifest.status = ManifestStatus.AWAITING_CONFIRMATION if potential_dgs else ManifestStatus.CONFIRMED
            manifest.save()
        
        logger.info(f"Enhanced analysis completed for document {document.id}, found {len(potential_dgs)} potential DGs")
        return enhanced_results
        
    except Exception as e:
        logger.error(f"Enhanced manifest analysis failed for document {document.id}: {str(e)}")
        
        # Update manifest status to failed if exists
        if hasattr(document, 'manifest'):
            manifest = document.manifest
            manifest.status = ManifestStatus.PROCESSING_FAILED
            manifest.save()
        
        raise Exception(f"Enhanced analysis failed: {str(e)}")

def create_manifest_dg_matches(manifest: Manifest, potential_dgs: List[Dict]):
    """
    Create ManifestDangerousGoodMatch records from analysis results.
    
    Args:
        manifest: Manifest instance
        potential_dgs: List of potential dangerous goods from analysis
    """
    # Clear existing matches
    manifest.dg_matches.all().delete()
    
    for dg_data in potential_dgs:
        try:
            # Get the dangerous good from database
            dangerous_good = DangerousGood.objects.get(un_number=dg_data['un_number'])
            
            # Create match record
            ManifestDangerousGoodMatch.objects.create(
                manifest=manifest,
                dangerous_good=dangerous_good,
                found_text=dg_data.get('found_text', ''),
                match_type=dg_data.get('match_type', 'UNKNOWN'),
                confidence_score=dg_data.get('confidence_score', 0.0),
                page_number=dg_data.get('page_number'),
                position_data=dg_data.get('position_data'),
                is_confirmed=False
            )
            
        except DangerousGood.DoesNotExist:
            logger.warning(f"DangerousGood with UN number {dg_data['un_number']} not found")
        except Exception as e:
            logger.error(f"Failed to create DG match for {dg_data.get('un_number', 'unknown')}: {str(e)}")

def confirm_manifest_dangerous_goods(manifest: Manifest, confirmed_un_numbers: List[str], user) -> Dict:
    """
    Confirm dangerous goods selections for a manifest.
    
    Args:
        manifest: Manifest instance
        confirmed_un_numbers: List of UN numbers confirmed by user
        user: User confirming the selection
        
    Returns:
        Dict with confirmation results and compatibility check
    """
    try:
        # Update match records
        confirmed_matches = []
        for un_number in confirmed_un_numbers:
            matches = manifest.dg_matches.filter(dangerous_good__un_number=un_number)
            for match in matches:
                match.is_confirmed = True
                match.confirmed_by = user
                match.confirmed_at = timezone.now()
                match.save()
                confirmed_matches.append(match)
        
        # Mark non-confirmed matches as rejected
        manifest.dg_matches.filter(dangerous_good__un_number__not_in=confirmed_un_numbers).update(
            is_confirmed=False
        )
        
        # Check compatibility of confirmed items
        compatibility_result = check_list_compatibility(confirmed_un_numbers)
        
        # Update manifest
        manifest.confirmed_dangerous_goods = {
            'confirmed_un_numbers': confirmed_un_numbers,
            'confirmed_at': timezone.now().isoformat(),
            'confirmed_by': user.id,
            'compatibility_check': compatibility_result
        }
        manifest.confirmed_by = user
        manifest.confirmed_at = timezone.now()
        manifest.status = ManifestStatus.CONFIRMED
        manifest.save()
        
        result = {
            'confirmed_count': len(confirmed_matches),
            'compatibility_result': compatibility_result,
            'manifest_status': manifest.status
        }
        
        logger.info(f"Confirmed {len(confirmed_matches)} dangerous goods for manifest {manifest.id}")
        return result
        
    except Exception as e:
        logger.error(f"Failed to confirm dangerous goods for manifest {manifest.id}: {str(e)}")
        raise Exception(f"Confirmation failed: {str(e)}")

def finalize_manifest_shipment(manifest: Manifest, confirmed_dgs_data: List[Dict], user) -> Dict:
    """
    Finalize a manifest by creating shipment items and checking final compatibility.
    
    Args:
        manifest: Manifest instance
        confirmed_dgs_data: List of confirmed DG data with quantities/weights
        user: User finalizing the manifest
        
    Returns:
        Dict with finalization results
    """
    from documents.services import create_shipment_from_confirmed_dgs
    
    try:
        # Check final compatibility
        un_numbers = [dg['un_number'] for dg in confirmed_dgs_data]
        compatibility_result = check_list_compatibility(un_numbers)
        
        if not compatibility_result['is_compatible']:
            return {
                'success': False,
                'error': 'Dangerous goods are not compatible for transport',
                'compatibility_result': compatibility_result
            }
        
        # Create shipment items
        created_items = create_shipment_from_confirmed_dgs(
            manifest.shipment, confirmed_dgs_data, user
        )
        
        # Update manifest as finalized
        manifest.status = ManifestStatus.FINALIZED
        manifest.finalized_at = timezone.now()
        manifest.save()
        
        # Update document status
        manifest.document.status = DocumentStatus.VALIDATED_OK
        manifest.document.save()
        
        result = {
            'success': True,
            'created_items_count': len(created_items),
            'compatibility_result': compatibility_result,
            'manifest_status': manifest.status
        }
        
        logger.info(f"Finalized manifest {manifest.id} with {len(created_items)} shipment items")
        return result
        
    except Exception as e:
        logger.error(f"Failed to finalize manifest {manifest.id}: {str(e)}")
        raise Exception(f"Finalization failed: {str(e)}")

def run_manifest_validation(document: Document) -> Dict:
    """
    Run the complete manifest validation process (legacy function for compatibility).
    Now uses enhanced analysis.
    
    Args:
        document: Document instance to validate
        
    Returns:
        Dict containing validation results
    """
    try:
        # Use enhanced analysis
        enhanced_results = run_enhanced_manifest_analysis(document)
        
        # Convert to legacy format for backward compatibility
        analysis_results = enhanced_results.get('analysis_results', {})
        potential_dgs = analysis_results.get('potential_dangerous_goods', [])
        
        validation_results = {
            'identified_dgs': [
                {
                    'un_number': dg['un_number'],
                    'proper_shipping_name': dg['proper_shipping_name'],
                    'hazard_class': dg['hazard_class'],
                    'packing_group': dg['packing_group'],
                    'found_text': dg.get('found_text', ''),
                    'confidence_score': dg.get('confidence_score', 0.0)
                }
                for dg in potential_dgs
            ],
            'unmatched_entries': analysis_results.get('unmatched_text', []),
            'compatibility_issues': [],
            'validation_errors': [],
            'warnings': []
        }
        
        # Add compatibility check results
        compatibility_result = enhanced_results.get('compatibility_check')
        if compatibility_result and not compatibility_result.get('is_compatible', True):
            validation_results['compatibility_issues'] = compatibility_result.get('conflicts', [])
            validation_results['validation_errors'].extend(compatibility_result.get('conflicts', []))
        
        # Add metadata
        validation_results.update({
            'total_dgs_identified': len(potential_dgs),
            'total_unmatched': len(analysis_results.get('unmatched_text', [])),
            'total_compatibility_issues': len(validation_results['compatibility_issues']),
            'enhanced_analysis': True
        })
        
        return validation_results
        
    except Exception as e:
        logger.error(f"Manifest validation failed for document {document.id}: {str(e)}")
        return {
            'identified_dgs': [],
            'unmatched_entries': [],
            'compatibility_issues': [],
            'validation_errors': [str(e)],
            'warnings': [],
            'total_dgs_identified': 0,
            'total_unmatched': 0,
            'total_compatibility_issues': 0
        }
