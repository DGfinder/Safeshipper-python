# Government API Integration Service for Australian SDS Data Sources
# This service handles integration with official Australian government databases

import requests
import csv
import json
import hashlib
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from io import StringIO
from urllib.parse import urljoin
from dataclasses import dataclass

from django.conf import settings
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.db import transaction

from .enhanced_models import (
    SDSDataSource, SDSDataImport, AustralianGovernmentSDSSync,
    DataSourceType, DataSourceStatus
)
from dangerous_goods.models import DangerousGood

logger = logging.getLogger(__name__)


@dataclass
class GovernmentDataRecord:
    """Standard data structure for government dangerous goods records"""
    un_number: str
    proper_shipping_name: str
    hazard_class: str
    packing_group: Optional[str] = None
    sub_hazard: Optional[str] = None
    special_provisions: Optional[str] = None
    limited_quantities: Optional[str] = None
    excepted_quantities: Optional[str] = None
    packaging_instructions: Optional[str] = None
    source_agency: str = ""
    last_updated: Optional[datetime] = None
    additional_data: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.additional_data is None:
            self.additional_data = {}


class SafeWorkAustraliaAPI:
    """
    Integration service for Safe Work Australia dangerous goods data
    """
    
    def __init__(self):
        self.base_url = "https://www.safeworkaustralia.gov.au/"
        self.adg_list_url = "https://www.safeworkaustralia.gov.au/system/files/documents/1702/australian-dangerous-goods-list.xlsx"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'SafeShipper-SDS-System/1.0 (contact@safeshipper.com.au)'
        })
    
    def fetch_dangerous_goods_list(self) -> List[GovernmentDataRecord]:
        """
        Fetch the latest Australian Dangerous Goods (ADG) list from Safe Work Australia
        
        Returns:
            List of GovernmentDataRecord objects
        """
        logger.info("Fetching ADG list from Safe Work Australia")
        
        try:
            response = self.session.get(self.adg_list_url, timeout=60)
            response.raise_for_status()
            
            # Save the file temporarily and process as Excel
            import pandas as pd
            
            # Read Excel file directly from response content
            df = pd.read_excel(response.content, sheet_name=0)
            
            records = []
            for _, row in df.iterrows():
                try:
                    record = GovernmentDataRecord(
                        un_number=str(row.get('UN Number', '')).strip(),
                        proper_shipping_name=str(row.get('Proper Shipping Name', '')).strip(),
                        hazard_class=str(row.get('Class', '')).strip(),
                        packing_group=str(row.get('Packing Group', '')).strip() or None,
                        sub_hazard=str(row.get('Subsidiary Risk', '')).strip() or None,
                        special_provisions=str(row.get('Special Provisions', '')).strip() or None,
                        limited_quantities=str(row.get('Limited Quantities', '')).strip() or None,
                        excepted_quantities=str(row.get('Excepted Quantities', '')).strip() or None,
                        packaging_instructions=str(row.get('Packaging Instructions', '')).strip() or None,
                        source_agency="SAFE_WORK_AU",
                        last_updated=timezone.now(),
                        additional_data={
                            'row_index': len(records),
                            'special_provisions_code': row.get('Special Provisions Code', ''),
                            'transport_category': row.get('Transport Category', ''),
                        }
                    )
                    
                    # Validate record has minimum required data
                    if record.un_number and record.proper_shipping_name:
                        records.append(record)
                    
                except Exception as e:
                    logger.warning(f"Failed to process ADG row {len(records)}: {str(e)}")
                    continue
            
            logger.info(f"Successfully fetched {len(records)} ADG records from Safe Work Australia")
            return records
            
        except Exception as e:
            logger.error(f"Failed to fetch ADG list from Safe Work Australia: {str(e)}")
            raise Exception(f"Safe Work Australia API error: {str(e)}")
    
    def check_for_updates(self) -> bool:
        """
        Check if the ADG list has been updated since last sync
        
        Returns:
            True if updates are available, False otherwise
        """
        try:
            # Get last sync info
            sync_record = AustralianGovernmentSDSSync.objects.filter(
                agency='SAFE_WORK_AU',
                dataset_name='Australian Dangerous Goods List'
            ).first()
            
            # Make HEAD request to check file metadata
            response = self.session.head(self.adg_list_url, timeout=30)
            response.raise_for_status()
            
            # Check content length and last-modified
            content_length = response.headers.get('content-length', '')
            last_modified = response.headers.get('last-modified', '')
            
            # Create a simple hash of the metadata
            current_hash = hashlib.md5(f"{content_length}{last_modified}".encode()).hexdigest()
            
            if not sync_record or sync_record.last_file_hash != current_hash:
                logger.info("ADG list updates detected")
                return True
            
            logger.info("No ADG list updates detected")
            return False
            
        except Exception as e:
            logger.warning(f"Failed to check for ADG updates: {str(e)}")
            return True  # Assume updates available if check fails


class APVMAAPIService:
    """
    Integration service for APVMA (Australian Pesticides and Veterinary Medicines Authority)
    """
    
    def __init__(self):
        self.base_url = "https://apvma.gov.au/webapi/"
        self.pubcris_url = "https://portal.apvma.gov.au/pubcris"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'SafeShipper-SDS-System/1.0',
            'Accept': 'application/json'
        })
    
    def fetch_active_ingredients(self) -> List[GovernmentDataRecord]:
        """
        Fetch active ingredients database from APVMA
        
        Returns:
            List of GovernmentDataRecord objects for agricultural chemicals
        """
        logger.info("Fetching active ingredients from APVMA")
        
        try:
            # APVMA PUBCRIS API endpoint for active ingredients
            api_url = f"{self.pubcris_url}/api/public/activeconstituents"
            
            response = self.session.get(api_url, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            records = []
            
            for item in data.get('results', []):
                try:
                    # Extract relevant information
                    constituent_name = item.get('constituentName', '').strip()
                    cas_number = item.get('casNumber', '').strip()
                    approval_status = item.get('approvalStatus', '').strip()
                    
                    if not constituent_name:
                        continue
                    
                    record = GovernmentDataRecord(
                        un_number="",  # APVMA doesn't provide UN numbers directly
                        proper_shipping_name=constituent_name,
                        hazard_class="9",  # Default to Class 9 for agricultural chemicals
                        source_agency="APVMA",
                        last_updated=timezone.now(),
                        additional_data={
                            'cas_number': cas_number,
                            'approval_status': approval_status,
                            'constituent_type': item.get('constituentType', ''),
                            'registration_date': item.get('registrationDate', ''),
                            'expiry_date': item.get('expiryDate', ''),
                            'apvma_code': item.get('constituentCode', ''),
                        }
                    )
                    
                    records.append(record)
                    
                except Exception as e:
                    logger.warning(f"Failed to process APVMA constituent: {str(e)}")
                    continue
            
            logger.info(f"Successfully fetched {len(records)} APVMA active ingredients")
            return records
            
        except Exception as e:
            logger.error(f"Failed to fetch APVMA active ingredients: {str(e)}")
            raise Exception(f"APVMA API error: {str(e)}")


class ACCCProductSafetyAPI:
    """
    Integration service for ACCC Product Safety recalls and alerts
    """
    
    def __init__(self):
        self.base_url = "https://www.productsafety.gov.au/"
        self.recalls_api = "https://www.productsafety.gov.au/api/v1/recalls"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'SafeShipper-SDS-System/1.0',
            'Accept': 'application/json'
        })
    
    def fetch_product_recalls(self, days_back: int = 365) -> List[Dict[str, Any]]:
        """
        Fetch product recalls and safety alerts from ACCC
        
        Args:
            days_back: Number of days to look back for recalls
            
        Returns:
            List of recall information dictionaries
        """
        logger.info(f"Fetching ACCC product recalls from last {days_back} days")
        
        try:
            # Calculate date range
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=days_back)
            
            params = {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'format': 'json',
                'limit': 1000
            }
            
            response = self.session.get(self.recalls_api, params=params, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            recalls = []
            
            for recall in data.get('recalls', []):
                try:
                    recall_info = {
                        'recall_id': recall.get('recall_number', ''),
                        'product_name': recall.get('product_name', ''),
                        'product_type': recall.get('product_type', ''),
                        'hazard_type': recall.get('hazard_type', ''),
                        'recall_date': recall.get('recall_date', ''),
                        'company': recall.get('company_name', ''),
                        'description': recall.get('description', ''),
                        'action_required': recall.get('consumer_action', ''),
                        'status': recall.get('status', ''),
                        'source': 'ACCC',
                        'last_updated': timezone.now().isoformat(),
                    }
                    
                    recalls.append(recall_info)
                    
                except Exception as e:
                    logger.warning(f"Failed to process ACCC recall: {str(e)}")
                    continue
            
            logger.info(f"Successfully fetched {len(recalls)} ACCC product recalls")
            return recalls
            
        except Exception as e:
            logger.error(f"Failed to fetch ACCC recalls: {str(e)}")
            raise Exception(f"ACCC API error: {str(e)}")


class TGATherapeuticGoodsAPI:
    """
    Integration service for TGA (Therapeutic Goods Administration)
    """
    
    def __init__(self):
        self.base_url = "https://www.tga.gov.au/"
        self.artg_api = "https://www.tga.gov.au/artg/artg-public-api"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'SafeShipper-SDS-System/1.0',
            'Accept': 'application/json'
        })
    
    def fetch_therapeutic_goods(self, product_type: str = "medicines") -> List[GovernmentDataRecord]:
        """
        Fetch therapeutic goods from TGA ARTG database
        
        Args:
            product_type: Type of products to fetch ('medicines', 'medical-devices', etc.)
            
        Returns:
            List of GovernmentDataRecord objects for therapeutic goods
        """
        logger.info(f"Fetching TGA therapeutic goods: {product_type}")
        
        try:
            # TGA ARTG API endpoint
            api_url = f"{self.artg_api}/{product_type}"
            
            params = {
                'format': 'json',
                'limit': 10000,  # Adjust based on API limits
                'status': 'current'
            }
            
            response = self.session.get(api_url, params=params, timeout=120)
            response.raise_for_status()
            
            data = response.json()
            records = []
            
            for item in data.get('results', []):
                try:
                    product_name = item.get('product_name', '').strip()
                    sponsor = item.get('sponsor', '').strip()
                    artg_id = item.get('artg_id', '').strip()
                    
                    if not product_name:
                        continue
                    
                    record = GovernmentDataRecord(
                        un_number="",  # TGA doesn't provide UN numbers
                        proper_shipping_name=product_name,
                        hazard_class="",  # Will need to be determined separately
                        source_agency="TGA",
                        last_updated=timezone.now(),
                        additional_data={
                            'artg_id': artg_id,
                            'sponsor': sponsor,
                            'product_type': product_type,
                            'indication': item.get('indication', ''),
                            'active_ingredients': item.get('active_ingredients', []),
                            'approval_date': item.get('approval_date', ''),
                            'cancellation_date': item.get('cancellation_date', ''),
                            'tga_category': item.get('category', ''),
                        }
                    )
                    
                    records.append(record)
                    
                except Exception as e:
                    logger.warning(f"Failed to process TGA product: {str(e)}")
                    continue
            
            logger.info(f"Successfully fetched {len(records)} TGA therapeutic goods")
            return records
            
        except Exception as e:
            logger.error(f"Failed to fetch TGA therapeutic goods: {str(e)}")
            raise Exception(f"TGA API error: {str(e)}")


class GovernmentDataSyncService:
    """
    Main service for coordinating government data synchronization
    """
    
    def __init__(self):
        self.safe_work_api = SafeWorkAustraliaAPI()
        self.apvma_api = APVMAAPIService()
        self.accc_api = ACCCProductSafetyAPI()
        self.tga_api = TGATherapeuticGoodsAPI()
    
    def sync_safe_work_australia(self, force_update: bool = False) -> Dict[str, Any]:
        """
        Synchronize dangerous goods data from Safe Work Australia
        
        Args:
            force_update: Force update even if no changes detected
            
        Returns:
            Dictionary with sync results
        """
        logger.info("Starting Safe Work Australia sync")
        
        try:
            # Get or create sync record
            sync_record, created = AustralianGovernmentSDSSync.objects.get_or_create(
                agency='SAFE_WORK_AU',
                dataset_name='Australian Dangerous Goods List',
                defaults={
                    'sync_frequency': 'QUARTERLY',
                    'api_endpoint': self.safe_work_api.adg_list_url,
                    'download_url': self.safe_work_api.adg_list_url,
                }
            )
            
            # Check if update is needed
            if not force_update and not self.safe_work_api.check_for_updates():
                logger.info("No Safe Work Australia updates needed")
                return {
                    'success': True,
                    'updated': False,
                    'message': 'No updates available'
                }
            
            # Get or create data source
            data_source, created = SDSDataSource.objects.get_or_create(
                short_name='SAFE_WORK_AU',
                defaults={
                    'name': 'Safe Work Australia - Australian Dangerous Goods List',
                    'source_type': DataSourceType.GOVERNMENT,
                    'organization': 'Safe Work Australia',
                    'website_url': 'https://www.safeworkaustralia.gov.au/',
                    'country_codes': ['AU'],
                    'regulatory_jurisdictions': ['Australian Dangerous Goods Code'],
                    'update_frequency': 'QUARTERLY',
                    'status': DataSourceStatus.ACTIVE,
                }
            )
            
            # Create import session
            import_session = SDSDataImport.objects.create(
                data_source=data_source,
                import_type='INCREMENTAL',
                trigger='SCHEDULED'
            )
            
            try:
                # Fetch data
                sync_record.sync_status = 'RUNNING'
                sync_record.save()
                
                records = self.safe_work_api.fetch_dangerous_goods_list()
                
                # Process records
                created_count = 0
                updated_count = 0
                error_count = 0
                
                with transaction.atomic():
                    for record in records:
                        try:
                            # Try to find existing dangerous good
                            dg, dg_created = DangerousGood.objects.get_or_create(
                                un_number=record.un_number,
                                defaults={
                                    'proper_shipping_name': record.proper_shipping_name,
                                    'hazard_class': record.hazard_class,
                                    'packing_group': record.packing_group,
                                    'sub_hazard': record.sub_hazard,
                                    'simplified_name': record.proper_shipping_name[:100],  # Truncate if needed
                                    'description_notes': f"Imported from Safe Work Australia ADG List",
                                }
                            )
                            
                            if dg_created:
                                created_count += 1
                            else:
                                # Update existing record if data has changed
                                updated = False
                                if dg.proper_shipping_name != record.proper_shipping_name:
                                    dg.proper_shipping_name = record.proper_shipping_name
                                    updated = True
                                if dg.hazard_class != record.hazard_class:
                                    dg.hazard_class = record.hazard_class
                                    updated = True
                                if dg.packing_group != record.packing_group:
                                    dg.packing_group = record.packing_group
                                    updated = True
                                if dg.sub_hazard != record.sub_hazard:
                                    dg.sub_hazard = record.sub_hazard
                                    updated = True
                                
                                if updated:
                                    dg.save()
                                    updated_count += 1
                            
                        except Exception as e:
                            logger.error(f"Failed to process Safe Work AU record {record.un_number}: {str(e)}")
                            error_count += 1
                            continue
                
                # Update sync record
                sync_record.sync_status = 'COMPLETED'
                sync_record.last_sync_date = timezone.now()
                sync_record.next_scheduled_sync = sync_record.calculate_next_sync()
                sync_record.records_in_source = len(records)
                sync_record.records_imported = created_count + updated_count
                sync_record.last_error = ""
                sync_record.save()
                
                # Update import session
                import_session.status = 'COMPLETED'
                import_session.completed_at = timezone.now()
                import_session.records_processed = len(records)
                import_session.records_created = created_count
                import_session.records_updated = updated_count
                import_session.records_errors = error_count
                import_session.save()
                
                # Update data source
                data_source.last_successful_sync = timezone.now()
                data_source.consecutive_failures = 0
                data_source.save()
                
                logger.info(f"Safe Work Australia sync completed: {created_count} created, {updated_count} updated, {error_count} errors")
                
                return {
                    'success': True,
                    'updated': True,
                    'records_processed': len(records),
                    'records_created': created_count,
                    'records_updated': updated_count,
                    'records_errors': error_count,
                    'import_session_id': str(import_session.id)
                }
                
            except Exception as e:
                # Update sync record with error
                sync_record.sync_status = 'FAILED'
                sync_record.last_error = str(e)
                sync_record.save()
                
                # Update import session
                import_session.status = 'FAILED'
                import_session.completed_at = timezone.now()
                import_session.error_summary = str(e)
                import_session.save()
                
                # Update data source
                data_source.consecutive_failures += 1
                data_source.last_error = str(e)
                data_source.save()
                
                raise
                
        except Exception as e:
            logger.error(f"Safe Work Australia sync failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'updated': False
            }
    
    def sync_all_government_sources(self, force_update: bool = False) -> Dict[str, Any]:
        """
        Synchronize all government data sources
        
        Args:
            force_update: Force update all sources
            
        Returns:
            Dictionary with overall sync results
        """
        logger.info("Starting sync of all government sources")
        
        results = {
            'overall_success': True,
            'sources_synced': 0,
            'sources_failed': 0,
            'total_records_processed': 0,
            'sync_details': {}
        }
        
        # Sync Safe Work Australia
        try:
            swa_result = self.sync_safe_work_australia(force_update)
            results['sync_details']['safe_work_australia'] = swa_result
            if swa_result['success']:
                results['sources_synced'] += 1
                results['total_records_processed'] += swa_result.get('records_processed', 0)
            else:
                results['sources_failed'] += 1
                results['overall_success'] = False
        except Exception as e:
            logger.error(f"Safe Work Australia sync failed: {str(e)}")
            results['sources_failed'] += 1
            results['overall_success'] = False
            results['sync_details']['safe_work_australia'] = {'success': False, 'error': str(e)}
        
        # Additional sync operations for other agencies would go here
        # For now, focusing on Safe Work Australia as the primary source
        
        logger.info(f"Government sync completed: {results['sources_synced']} sources synced, {results['sources_failed']} failed")
        
        return results
    
    def get_sync_status(self) -> Dict[str, Any]:
        """
        Get current sync status for all government sources
        
        Returns:
            Dictionary with sync status information
        """
        status = {
            'last_update': timezone.now().isoformat(),
            'sources': []
        }
        
        # Get sync records for all agencies
        sync_records = AustralianGovernmentSDSSync.objects.all().order_by('agency', 'dataset_name')
        
        for sync_record in sync_records:
            source_status = {
                'agency': sync_record.get_agency_display(),
                'dataset': sync_record.dataset_name,
                'last_sync': sync_record.last_sync_date.isoformat() if sync_record.last_sync_date else None,
                'next_sync': sync_record.next_scheduled_sync.isoformat() if sync_record.next_scheduled_sync else None,
                'status': sync_record.sync_status,
                'records_in_source': sync_record.records_in_source,
                'records_imported': sync_record.records_imported,
                'sync_due': sync_record.is_sync_due,
                'last_error': sync_record.last_error[:200] if sync_record.last_error else None
            }
            status['sources'].append(source_status)
        
        return status


# Management command for running government data sync
class Command(BaseCommand):
    """
    Django management command for syncing government data
    Usage: python manage.py sync_government_data [--force] [--source=safe_work_au]
    """
    help = 'Synchronize dangerous goods data from Australian government sources'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update even if no changes detected'
        )
        parser.add_argument(
            '--source',
            type=str,
            choices=['safe_work_au', 'apvma', 'accc', 'tga', 'all'],
            default='all',
            help='Specific source to sync (default: all)'
        )
    
    def handle(self, *args, **options):
        sync_service = GovernmentDataSyncService()
        force_update = options['force']
        source = options['source']
        
        self.stdout.write(f"Starting government data sync (source: {source}, force: {force_update})")
        
        try:
            if source == 'safe_work_au':
                result = sync_service.sync_safe_work_australia(force_update)
            elif source == 'all':
                result = sync_service.sync_all_government_sources(force_update)
            else:
                self.stdout.write(self.style.WARNING(f"Source '{source}' not yet implemented"))
                return
            
            if result['success'] or result.get('overall_success', False):
                self.stdout.write(self.style.SUCCESS("Government data sync completed successfully"))
                if 'records_processed' in result:
                    self.stdout.write(f"Records processed: {result['records_processed']}")
                if 'total_records_processed' in result:
                    self.stdout.write(f"Total records processed: {result['total_records_processed']}")
            else:
                self.stdout.write(self.style.ERROR(f"Government data sync failed: {result.get('error', 'Unknown error')}"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Government data sync error: {str(e)}"))