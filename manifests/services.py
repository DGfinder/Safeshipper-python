# services.py for manifests app

from typing import Dict, List, Set, Optional, Tuple
import fitz  # PyMuPDF
import re
import logging
from documents.models import Document, DocumentStatus
from dangerous_goods.services import match_synonym_to_dg, check_dg_compatibility
from dangerous_goods.models import DangerousGood
from django.utils.translation import gettext_lazy as _

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

def run_manifest_validation(document: Document) -> Dict:
    """
    Run the complete manifest validation process.
    
    Args:
        document: Document instance to validate
        
    Returns:
        Dict containing validation results
    """
    validation_results = {
        'identified_dgs': [],
        'unmatched_entries': [],
        'compatibility_issues': [],
        'validation_errors': [],
        'warnings': []
    }
    
    try:
        # Extract text from PDF
        text = extract_text_from_pdf(document)
        
        # Identify DG items
        identified_dgs, unmatched_entries = identify_dg_items(text)
        
        # Update results
        validation_results['identified_dgs'] = [
            {
                'un_number': dg.un_number,
                'proper_shipping_name': dg.proper_shipping_name,
                'dg_class': dg.dg_class,
                'packing_group': dg.packing_group
            }
            for dg in identified_dgs
        ]
        validation_results['unmatched_entries'] = unmatched_entries
        
        # Check DG compatibility if multiple items found
        if len(identified_dgs) > 1:
            compatibility_result = check_dg_compatibility(identified_dgs)
            
            if not compatibility_result['is_compatible']:
                validation_results['compatibility_issues'] = compatibility_result['reasons']
                validation_results['validation_errors'].extend(
                    compatibility_result['reasons']
                )
        
        # Add warnings if any unmatched entries
        if unmatched_entries:
            validation_results['warnings'].append(
                _("Found {count} entries that could not be matched to known dangerous goods").format(
                    count=len(unmatched_entries)
                )
            )
        
        # Add summary statistics
        validation_results.update({
            'total_dgs_identified': len(identified_dgs),
            'total_unmatched': len(unmatched_entries),
            'total_compatibility_issues': len(validation_results['compatibility_issues'])
        })
        
    except ValueError as e:
        validation_results['validation_errors'].append(str(e))
    except Exception as e:
        validation_results['validation_errors'].append(
            _("Unexpected error during validation: {error}").format(error=str(e))
        )
    
    return validation_results
