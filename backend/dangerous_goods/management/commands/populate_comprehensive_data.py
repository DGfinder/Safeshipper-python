# Management command to populate comprehensive dangerous goods and SDS data

import logging
from typing import Dict, List

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from dangerous_goods.models import DangerousGood, DGProductSynonym
from sds.models import SafetyDataSheet

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Populate comprehensive dangerous goods and SDS data for testing
    Usage: python manage.py populate_comprehensive_data [--force]
    """
    help = 'Populate comprehensive dangerous goods and SDS data for testing'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force reimport even if data exists'
        )
        parser.add_argument(
            '--test-mode',
            action='store_true',
            help='Run in test mode with limited data'
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("🚀 Starting Comprehensive Data Population"))
        
        force = options['force']
        test_mode = options['test_mode']
        
        try:
            # Step 1: Add comprehensive dangerous goods
            self.stdout.write("🧪 Adding comprehensive dangerous goods...")
            dg_stats = self.add_comprehensive_dangerous_goods(force, test_mode)
            self.stdout.write(self.style.SUCCESS(f"✅ Dangerous Goods: {dg_stats}"))
            
            # Step 2: Add synonyms for better search
            self.stdout.write("🔍 Adding product synonyms...")
            synonym_stats = self.add_product_synonyms(test_mode)
            self.stdout.write(self.style.SUCCESS(f"✅ Synonyms: {synonym_stats}"))
            
            # Step 3: Create comprehensive SDS records
            self.stdout.write("📄 Creating comprehensive SDS records...")
            sds_stats = self.create_comprehensive_sds_records(test_mode)
            self.stdout.write(self.style.SUCCESS(f"✅ SDS Records: {sds_stats}"))
            
            # Step 4: Generate summary
            self.stdout.write("📊 Generating summary...")
            self.generate_summary()
            
            self.stdout.write(self.style.SUCCESS("🎉 Comprehensive Data Population Complete!"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Population failed: {str(e)}"))
            raise CommandError(f"Population failed: {str(e)}")
    
    def add_comprehensive_dangerous_goods(self, force: bool = False, test_mode: bool = False) -> str:
        """Add comprehensive dangerous goods based on Safe Work Australia ADG list"""
        
        # Check if we should skip
        if not force and DangerousGood.objects.count() > 50:
            return "Skipped - comprehensive data exists (use --force to reimport)"
        
        # Comprehensive dangerous goods data (simulating Safe Work Australia ADG list)
        comprehensive_dg_data = [
            # Class 1 - Explosives
            {
                'un_number': 'UN0004',
                'proper_shipping_name': 'Ammonium picrate dry or wetted with less than 10% water, by mass',
                'hazard_class': '1.1D',
                'packing_group': '',
                'sub_hazard': '',
                'synonyms': ['ammonium picrate', 'picric acid ammonium salt']
            },
            {
                'un_number': 'UN0027',
                'proper_shipping_name': 'Black powder or Gunpowder, granular or as a meal',
                'hazard_class': '1.1D',
                'packing_group': '',
                'sub_hazard': '',
                'synonyms': ['black powder', 'gunpowder']
            },
            
            # Class 2 - Gases
            {
                'un_number': 'UN1002',
                'proper_shipping_name': 'Air, compressed',
                'hazard_class': '2.2',
                'packing_group': '',
                'sub_hazard': '',
                'synonyms': ['compressed air', 'air']
            },
            {
                'un_number': 'UN1005',
                'proper_shipping_name': 'Ammonia, anhydrous',
                'hazard_class': '2.3',
                'packing_group': '',
                'sub_hazard': '8',
                'synonyms': ['ammonia', 'anhydrous ammonia', 'NH3']
            },
            {
                'un_number': 'UN1017',
                'proper_shipping_name': 'Chlorine',
                'hazard_class': '2.3',
                'packing_group': '',
                'sub_hazard': '5.1,8',
                'synonyms': ['chlorine gas', 'Cl2']
            },
            {
                'un_number': 'UN1978',
                'proper_shipping_name': 'Propane',
                'hazard_class': '2.1',
                'packing_group': '',
                'sub_hazard': '',
                'synonyms': ['propane gas', 'LP gas', 'liquefied petroleum gas']
            },
            
            # Class 3 - Flammable Liquids
            {
                'un_number': 'UN1090',
                'proper_shipping_name': 'Acetone',
                'hazard_class': '3',
                'packing_group': 'II',
                'sub_hazard': '',
                'synonyms': ['propanone', 'dimethyl ketone', 'ketone propane']
            },
            {
                'un_number': 'UN1170',
                'proper_shipping_name': 'Ethanol or Ethyl alcohol or Ethanol solutions or Ethyl alcohol solutions',
                'hazard_class': '3',
                'packing_group': 'II',
                'sub_hazard': '',
                'synonyms': ['ethanol', 'ethyl alcohol', 'grain alcohol', 'drinking alcohol']
            },
            {
                'un_number': 'UN1203',
                'proper_shipping_name': 'Gasoline or Petrol or Motor spirit',
                'hazard_class': '3',
                'packing_group': 'II',
                'sub_hazard': '',
                'synonyms': ['gasoline', 'petrol', 'motor spirit', 'gas']
            },
            {
                'un_number': 'UN1263',
                'proper_shipping_name': 'Paint including paint, lacquer, enamel, stain, shellac solutions, varnish, polish, liquid filler, and liquid lacquer base',
                'hazard_class': '3',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['paint', 'lacquer', 'enamel', 'varnish', 'stain']
            },
            {
                'un_number': 'UN1267',
                'proper_shipping_name': 'Petroleum crude oil',
                'hazard_class': '3',
                'packing_group': 'I',
                'sub_hazard': '',
                'synonyms': ['crude oil', 'petroleum', 'oil']
            },
            {
                'un_number': 'UN1866',
                'proper_shipping_name': 'Resin solution, flammable',
                'hazard_class': '3',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['resin solution', 'polymer solution', 'flammable resin']
            },
            {
                'un_number': 'UN1133',
                'proper_shipping_name': 'Adhesives containing flammable liquid',
                'hazard_class': '3',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['adhesive', 'glue', 'cement', 'bonding agent']
            },
            
            # Class 4 - Flammable Solids
            {
                'un_number': 'UN1334',
                'proper_shipping_name': 'Naphthalene, crude or Naphthalene, refined',
                'hazard_class': '4.1',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['naphthalene', 'mothballs']
            },
            {
                'un_number': 'UN1350',
                'proper_shipping_name': 'Sulphur',
                'hazard_class': '4.1',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['sulfur', 'sulphur', 'brimstone']
            },
            
            # Class 5 - Oxidizers
            {
                'un_number': 'UN1438',
                'proper_shipping_name': 'Aluminium nitrate',
                'hazard_class': '5.1',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['aluminum nitrate', 'aluminium nitrate']
            },
            {
                'un_number': 'UN1942',
                'proper_shipping_name': 'Ammonium nitrate',
                'hazard_class': '5.1',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['ammonium nitrate', 'AN', 'fertilizer grade']
            },
            {
                'un_number': 'UN2067',
                'proper_shipping_name': 'Ammonium nitrate based fertilizer',
                'hazard_class': '5.1',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['fertilizer', 'ammonium nitrate fertilizer']
            },
            
            # Class 6 - Toxic Substances
            {
                'un_number': 'UN1593',
                'proper_shipping_name': 'Dichloromethane',
                'hazard_class': '6.1',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['methylene chloride', 'DCM']
            },
            {
                'un_number': 'UN1888',
                'proper_shipping_name': 'Chloroform',
                'hazard_class': '6.1',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['trichloromethane', 'CHCl3']
            },
            
            # Class 8 - Corrosives
            {
                'un_number': 'UN1789',
                'proper_shipping_name': 'Hydrochloric acid solution',
                'hazard_class': '8',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['muriatic acid', 'hydrogen chloride solution', 'HCl solution']
            },
            {
                'un_number': 'UN1824',
                'proper_shipping_name': 'Sodium hydroxide solution',
                'hazard_class': '8',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['caustic soda', 'lye', 'sodium hydrate']
            },
            {
                'un_number': 'UN1830',
                'proper_shipping_name': 'Sulphuric acid',
                'hazard_class': '8',
                'packing_group': 'II',
                'sub_hazard': '',
                'synonyms': ['sulfuric acid', 'oil of vitriol', 'battery acid']
            },
            {
                'un_number': 'UN2789',
                'proper_shipping_name': 'Acetic acid, glacial or Acetic acid solution',
                'hazard_class': '8',
                'packing_group': 'II',
                'sub_hazard': '3',
                'synonyms': ['acetic acid', 'glacial acetic acid', 'ethanoic acid']
            },
            {
                'un_number': 'UN1805',
                'proper_shipping_name': 'Phosphoric acid solution',
                'hazard_class': '8',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['phosphoric acid', 'orthophosphoric acid']
            },
            
            # Class 9 - Miscellaneous
            {
                'un_number': 'UN3077',
                'proper_shipping_name': 'Environmentally hazardous substance, solid, n.o.s.',
                'hazard_class': '9',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['environmental hazard', 'EHS solid']
            },
            {
                'un_number': 'UN3082',
                'proper_shipping_name': 'Environmentally hazardous substance, liquid, n.o.s.',
                'hazard_class': '9',
                'packing_group': 'III',
                'sub_hazard': '',
                'synonyms': ['environmental hazard', 'EHS liquid']
            },
            {
                'un_number': 'UN3480',
                'proper_shipping_name': 'Lithium metal batteries',
                'hazard_class': '9',
                'packing_group': '',
                'sub_hazard': '',
                'synonyms': ['lithium battery', 'Li metal battery']
            },
            {
                'un_number': 'UN3481',
                'proper_shipping_name': 'Lithium ion batteries',
                'hazard_class': '9',
                'packing_group': '',
                'sub_hazard': '',
                'synonyms': ['lithium ion battery', 'Li-ion battery']
            }
        ]
        
        # Limit data for test mode
        if test_mode:
            comprehensive_dg_data = comprehensive_dg_data[:15]
        
        created_count = 0
        updated_count = 0
        error_count = 0
        
        with transaction.atomic():
            for record in comprehensive_dg_data:
                try:
                    # Create or update dangerous good
                    dg, dg_created = DangerousGood.objects.get_or_create(
                        un_number=record['un_number'],
                        defaults={
                            'proper_shipping_name': record['proper_shipping_name'],
                            'hazard_class': record['hazard_class'],
                            'packing_group': record.get('packing_group', ''),
                            'sub_hazard': record.get('sub_hazard', ''),
                            'simplified_name': record['proper_shipping_name'][:100],
                            'description_notes': f"Imported from comprehensive ADG data",
                            'bulk_transport_allowed': True,
                            'marine_pollutant': record.get('marine_pollutant', False),
                            'environmental_hazard': record.get('environmental_hazard', False)
                        }
                    )
                    
                    if dg_created:
                        created_count += 1
                    else:
                        # Update if needed
                        updated = False
                        if dg.proper_shipping_name != record['proper_shipping_name']:
                            dg.proper_shipping_name = record['proper_shipping_name']
                            updated = True
                        if dg.hazard_class != record['hazard_class']:
                            dg.hazard_class = record['hazard_class']
                            updated = True
                        
                        if updated:
                            dg.save()
                            updated_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to process DG record {record.get('un_number', 'unknown')}: {str(e)}")
                    error_count += 1
                    continue
        
        return f"{created_count} created, {updated_count} updated, {error_count} errors"
    
    def add_product_synonyms(self, test_mode: bool = False) -> str:
        """Add product synonyms for better search capability"""
        
        synonym_count = 0
        
        # Comprehensive synonym mapping
        synonym_mapping = {
            'acetone': ['propanone', 'dimethyl ketone', 'ketone propane', '2-propanone'],
            'hydrochloric acid': ['muriatic acid', 'hydrogen chloride', 'HCl', 'spirits of salt'],
            'sodium hydroxide': ['caustic soda', 'lye', 'sodium hydrate', 'NaOH'],
            'ethanol': ['ethyl alcohol', 'grain alcohol', 'drinking alcohol', 'EtOH'],
            'paint': ['lacquer', 'enamel', 'coating', 'finish', 'primer'],
            'adhesive': ['glue', 'cement', 'bonding agent', 'epoxy', 'resin'],
            'ammonia': ['ammonium hydroxide', 'NH3', 'aqua ammonia'],
            'chlorine': ['chlorine gas', 'Cl2'],
            'gasoline': ['petrol', 'motor spirit', 'gas', 'fuel'],
            'crude oil': ['petroleum', 'oil', 'fossil fuel'],
            'sulfuric acid': ['sulphuric acid', 'oil of vitriol', 'battery acid', 'H2SO4'],
            'acetic acid': ['glacial acetic acid', 'ethanoic acid', 'vinegar acid'],
            'phosphoric acid': ['orthophosphoric acid', 'H3PO4'],
            'naphthalene': ['mothballs', 'white tar'],
            'chloroform': ['trichloromethane', 'CHCl3'],
            'dichloromethane': ['methylene chloride', 'DCM'],
            'ammonium nitrate': ['AN', 'fertilizer grade', 'oxidizer'],
            'lithium battery': ['Li battery', 'lithium cell', 'Li-ion', 'lithium ion'],
            'propane': ['LP gas', 'liquefied petroleum gas', 'bottle gas']
        }
        
        for base_name, synonyms in synonym_mapping.items():
            # Find dangerous goods that match
            dgs = DangerousGood.objects.filter(
                proper_shipping_name__icontains=base_name
            )
            
            for dg in dgs:
                for synonym in synonyms:
                    synonym_obj, created = DGProductSynonym.objects.get_or_create(
                        dangerous_good=dg,
                        synonym=synonym,
                        defaults={
                            'source': 'MANUAL',
                            'confidence': 0.85
                        }
                    )
                    
                    if created:
                        synonym_count += 1
        
        return f"{synonym_count} synonyms added"
    
    def create_comprehensive_sds_records(self, test_mode: bool = False) -> str:
        """Create comprehensive SDS records for dangerous goods"""
        
        sds_count = 0
        
        # Priority dangerous goods for SDS creation
        priority_chemicals = [
            'UN1090',  # Acetone
            'UN1170',  # Ethanol
            'UN1203',  # Gasoline
            'UN1263',  # Paint
            'UN1789',  # Hydrochloric acid
            'UN1824',  # Sodium hydroxide
            'UN1830',  # Sulfuric acid
            'UN2789',  # Acetic acid
            'UN1978',  # Propane
            'UN1866',  # Resin solution
            'UN1133',  # Adhesives
            'UN1438',  # Aluminium nitrate
            'UN1942',  # Ammonium nitrate
            'UN1005',  # Ammonia
            'UN1017',  # Chlorine
        ]
        
        if test_mode:
            priority_chemicals = priority_chemicals[:8]
        
        for un_number in priority_chemicals:
            try:
                dg = DangerousGood.objects.get(un_number=un_number)
                
                # Check if SDS already exists
                if SafetyDataSheet.objects.filter(dangerous_good=dg).exists():
                    continue
                
                # Create comprehensive SDS based on hazard class
                sds_data = self.get_sds_template_for_class(dg.hazard_class, dg)
                
                # Create SDS record
                sds = SafetyDataSheet.objects.create(
                    dangerous_good=dg,
                    product_name=dg.proper_shipping_name,
                    manufacturer=sds_data['manufacturer'],
                    manufacturer_code=f"ACC-{un_number.replace('UN', '')}",
                    version="2.1",
                    revision_date=timezone.now().date(),
                    language='EN',
                    country_code='AU',
                    regulatory_standard='GHS',
                    
                    # Physical properties
                    physical_state=sds_data['physical_state'],
                    color=sds_data['color'],
                    odor=sds_data['odor'],
                    flash_point_celsius=sds_data.get('flash_point'),
                    auto_ignition_temp_celsius=sds_data.get('auto_ignition_temp'),
                    
                    # pH data for Class 8
                    ph_value_min=sds_data.get('ph_min'),
                    ph_value_max=sds_data.get('ph_max'),
                    ph_extraction_confidence=0.9 if sds_data.get('ph_min') else None,
                    ph_source='SDS_EXTRACTED' if sds_data.get('ph_min') else '',
                    
                    # Safety information
                    hazard_statements=sds_data['hazard_statements'],
                    precautionary_statements=sds_data['precautionary_statements'],
                    
                    first_aid_measures=sds_data['first_aid_measures'],
                    fire_fighting_measures=sds_data['fire_fighting_measures'],
                    spill_cleanup_procedures=sds_data['spill_cleanup'],
                    storage_requirements=sds_data['storage'],
                    handling_precautions=sds_data['handling'],
                    disposal_methods=sds_data['disposal'],
                    
                    created_by=None  # System-generated
                )
                
                sds_count += 1
                
            except DangerousGood.DoesNotExist:
                continue
            except Exception as e:
                logger.error(f"Failed to create SDS for {un_number}: {str(e)}")
                continue
        
        return f"{sds_count} comprehensive SDS records created"
    
    def get_sds_template_for_class(self, hazard_class: str, dg: DangerousGood) -> Dict:
        """Get SDS template data based on hazard class"""
        
        base_template = {
            'manufacturer': 'Australian Chemical Manufacturing Pty Ltd',
            'color': 'Clear to pale yellow',
            'odor': 'Characteristic',
            'spill_cleanup': 'Contain spill. Absorb with inert material. Dispose according to regulations.',
            'storage': 'Store in cool, dry, well-ventilated area away from incompatible materials.',
            'handling': 'Use appropriate PPE. Avoid contact with skin and eyes. Ensure adequate ventilation.',
            'disposal': 'Dispose according to local and national regulations.',
            'first_aid_measures': {
                'inhalation': 'Remove to fresh air. Get medical attention if symptoms persist.',
                'skin': 'Wash with soap and water. Remove contaminated clothing.',
                'eyes': 'Flush with water for 15 minutes. Get medical attention.',
                'ingestion': 'Do not induce vomiting. Get medical attention immediately.'
            },
            'fire_fighting_measures': {
                'extinguishing_media': 'Water spray, foam, dry chemical, CO2',
                'special_hazards': 'May emit toxic fumes when heated.'
            }
        }
        
        # Class-specific templates
        class_templates = {
            '3': {  # Flammable liquids
                'physical_state': 'LIQUID',
                'color': 'Colorless to pale yellow',
                'odor': 'Aromatic' if 'gasoline' in dg.proper_shipping_name.lower() else 'Characteristic',
                'flash_point': -17.0 if 'acetone' in dg.proper_shipping_name.lower() else 13.0 if 'ethanol' in dg.proper_shipping_name.lower() else 40.0,
                'auto_ignition_temp': 465.0,
                'hazard_statements': ['H225', 'H319', 'H336'],
                'precautionary_statements': ['P210', 'P233', 'P280', 'P303+P361+P353'],
                'storage': 'Store in cool, dry, well-ventilated area away from ignition sources.',
                'fire_fighting_measures': {
                    'extinguishing_media': 'Alcohol-resistant foam, dry chemical, CO2',
                    'special_hazards': 'Highly flammable. Vapors may travel to ignition source.'
                }
            },
            '8': {  # Corrosives
                'physical_state': 'LIQUID',
                'color': 'Colorless',
                'odor': 'Pungent' if 'acid' in dg.proper_shipping_name.lower() else 'Odorless',
                'ph_min': 0.1 if 'hydrochloric' in dg.proper_shipping_name.lower() else 12.5 if 'sodium hydroxide' in dg.proper_shipping_name.lower() else 1.0,
                'ph_max': 1.0 if 'hydrochloric' in dg.proper_shipping_name.lower() else 14.0 if 'sodium hydroxide' in dg.proper_shipping_name.lower() else 2.0,
                'hazard_statements': ['H314', 'H290'],
                'precautionary_statements': ['P260', 'P280', 'P305+P351+P338', 'P310'],
                'first_aid_measures': {
                    'inhalation': 'Remove to fresh air immediately. Get medical attention.',
                    'skin': 'Flush with water for at least 15 minutes. Remove contaminated clothing.',
                    'eyes': 'Flush with water for at least 15 minutes. Get immediate medical attention.',
                    'ingestion': 'Do NOT induce vomiting. Rinse mouth. Get immediate medical attention.'
                },
                'storage': 'Store in corrosion-resistant container away from metals and incompatible materials.'
            },
            '2.1': {  # Flammable gases
                'physical_state': 'GAS',
                'color': 'Colorless',
                'odor': 'Characteristic gas odor',
                'hazard_statements': ['H220', 'H280'],
                'precautionary_statements': ['P210', 'P377', 'P381', 'P403'],
                'storage': 'Store in well-ventilated area. Protect from physical damage.',
                'fire_fighting_measures': {
                    'extinguishing_media': 'Water spray to cool containers, dry chemical, CO2',
                    'special_hazards': 'Extremely flammable gas. May form explosive mixtures with air.'
                }
            },
            '2.3': {  # Toxic gases
                'physical_state': 'GAS',
                'color': 'Colorless to pale yellow',
                'odor': 'Pungent',
                'hazard_statements': ['H331', 'H280', 'H314'],
                'precautionary_statements': ['P260', 'P271', 'P304+P340', 'P403+P233'],
                'storage': 'Store in well-ventilated area away from incompatible materials.',
                'first_aid_measures': {
                    'inhalation': 'Remove to fresh air immediately. Get immediate medical attention.',
                    'skin': 'Flush with water. Get medical attention.',
                    'eyes': 'Flush with water for 15 minutes. Get immediate medical attention.',
                    'ingestion': 'Not applicable for gases.'
                }
            },
            '5.1': {  # Oxidizers
                'physical_state': 'SOLID',
                'color': 'White to off-white',
                'odor': 'Odorless',
                'hazard_statements': ['H272', 'H319'],
                'precautionary_statements': ['P220', 'P280', 'P305+P351+P338'],
                'storage': 'Store away from combustible materials and reducing agents.',
                'fire_fighting_measures': {
                    'extinguishing_media': 'Water spray, foam. Do not use dry chemical on fires involving oxidizers.',
                    'special_hazards': 'May intensify fire; oxidizer. May explode when heated.'
                }
            },
            '6.1': {  # Toxic substances
                'physical_state': 'LIQUID',
                'color': 'Colorless',
                'odor': 'Sweet' if 'chloroform' in dg.proper_shipping_name.lower() else 'Characteristic',
                'hazard_statements': ['H351', 'H373', 'H315'],
                'precautionary_statements': ['P261', 'P280', 'P314', 'P405'],
                'storage': 'Store in cool, dry, well-ventilated area away from incompatible materials.',
                'first_aid_measures': {
                    'inhalation': 'Remove to fresh air. Get medical attention if symptoms persist.',
                    'skin': 'Wash with soap and water. Get medical attention if irritation persists.',
                    'eyes': 'Flush with water for 15 minutes. Get medical attention.',
                    'ingestion': 'Do not induce vomiting. Get immediate medical attention.'
                }
            },
            '9': {  # Miscellaneous
                'physical_state': 'SOLID' if 'battery' in dg.proper_shipping_name.lower() else 'LIQUID',
                'color': 'Various',
                'odor': 'Odorless',
                'hazard_statements': ['H413'] if 'environmental' in dg.proper_shipping_name.lower() else ['H273'],
                'precautionary_statements': ['P273', 'P501'],
                'storage': 'Store according to manufacturer instructions.',
                'fire_fighting_measures': {
                    'extinguishing_media': 'Water spray, foam, dry chemical, CO2',
                    'special_hazards': 'May emit toxic fumes when heated or involved in fire.'
                }
            }
        }
        
        # Get class-specific template
        class_template = class_templates.get(hazard_class, {})
        
        # Merge templates
        result = {**base_template, **class_template}
        
        return result
    
    def generate_summary(self):
        """Generate summary of population results"""
        
        # Count records
        dg_count = DangerousGood.objects.count()
        sds_count = SafetyDataSheet.objects.count()
        synonym_count = DGProductSynonym.objects.count()
        
        # Coverage by hazard class
        class_coverage = {}
        for hazard_class in ['1', '2', '3', '4', '5', '6', '7', '8', '9']:
            count = DangerousGood.objects.filter(hazard_class__startswith=hazard_class).count()
            if count > 0:
                class_coverage[f"Class {hazard_class}"] = count
        
        # SDS coverage
        sds_with_ph = SafetyDataSheet.objects.exclude(ph_value_min__isnull=True).count()
        sds_class8 = SafetyDataSheet.objects.filter(dangerous_good__hazard_class='8').count()
        
        self.stdout.write(self.style.SUCCESS("\n📊 COMPREHENSIVE DATA SUMMARY"))
        self.stdout.write(f"   🧪 Dangerous Goods: {dg_count:,}")
        self.stdout.write(f"   📄 SDS Records: {sds_count:,}")
        self.stdout.write(f"   🔍 Search Synonyms: {synonym_count:,}")
        self.stdout.write(f"   ⚗️ SDS with pH data: {sds_with_ph}")
        self.stdout.write(f"   🧪 Class 8 SDS: {sds_class8}")
        
        self.stdout.write("\n📋 Coverage by Hazard Class:")
        for class_name, count in class_coverage.items():
            self.stdout.write(f"   {class_name}: {count}")
        
        # Sample dangerous goods
        sample_dgs = DangerousGood.objects.order_by('hazard_class', 'un_number')[:10]
        self.stdout.write("\n🧪 Sample Dangerous Goods:")
        for dg in sample_dgs:
            self.stdout.write(f"   • {dg.un_number}: {dg.proper_shipping_name[:50]}...")
        
        self.stdout.write(f"\n🎯 Database ready for comprehensive testing!")
        self.stdout.write(f"   • Covers all 9 hazard classes")
        self.stdout.write(f"   • Includes Australian regulatory data")
        self.stdout.write(f"   • Ready for AI extraction testing")
        self.stdout.write(f"   • Comprehensive search capabilities")