# compliance/management/commands/setup_compliance_zones.py

from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Polygon, Point
from compliance.models import ComplianceZone


class Command(BaseCommand):
    help = 'Set up sample compliance zones for dangerous goods transport'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-sample-zones',
            action='store_true',
            help='Create sample compliance zones for testing',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Setting up compliance zones...')
        )
        
        try:
            if options['create_sample_zones']:
                self._create_sample_zones()
            else:
                self.stdout.write(
                    self.style.WARNING(
                        'Use --create-sample-zones to create sample zones for testing'
                    )
                )
            
            self.stdout.write(
                self.style.SUCCESS('Compliance zone setup completed successfully!')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error setting up compliance zones: {str(e)}')
            )
            raise

    def _create_sample_zones(self):
        """Create sample compliance zones for testing"""
        
        sample_zones = [
            {
                'name': 'Sydney CBD School Zone',
                'zone_type': ComplianceZone.ZoneType.SCHOOL_ZONE,
                'boundary': self._create_sample_polygon(-33.8688, 151.2093, 0.01),  # Sydney CBD
                'restricted_hazard_classes': ['1', '2', '3'],
                'prohibited_hazard_classes': [],
                'max_speed_kmh': 40,
                'requires_notification': True,
                'regulatory_authority': 'NSW Education Department',
                'description': 'School zone with restricted hours for dangerous goods transport',
                'time_restrictions': {
                    'weekdays': {
                        'restricted_hours': ['07:00-09:00', '15:00-17:00'],
                        'prohibited_classes': ['1', '2']
                    }
                }
            },
            {
                'name': 'Melbourne Tunnel Restriction',
                'zone_type': ComplianceZone.ZoneType.TUNNEL,
                'boundary': self._create_sample_polygon(-37.8136, 144.9631, 0.005),  # Melbourne CBD
                'restricted_hazard_classes': ['1', '7'],
                'prohibited_hazard_classes': ['1'],
                'max_speed_kmh': 60,
                'requires_escort': True,
                'regulatory_authority': 'VIC Transport Authority',
                'description': 'Tunnel with restrictions on explosives and radioactive materials',
                'regulatory_reference': 'VIC DG Regulation 2024 Section 15'
            },
            {
                'name': 'Brisbane Port Industrial Area',
                'zone_type': ComplianceZone.ZoneType.INDUSTRIAL,
                'boundary': self._create_sample_polygon(-27.3817, 153.1363, 0.02),  # Brisbane Port
                'restricted_hazard_classes': [],
                'prohibited_hazard_classes': [],
                'max_speed_kmh': 50,
                'requires_notification': True,
                'regulatory_authority': 'Brisbane Port Authority',
                'description': 'Industrial port area with notification requirements'
            },
            {
                'name': 'Perth Residential Zone',
                'zone_type': ComplianceZone.ZoneType.RESIDENTIAL,
                'boundary': self._create_sample_polygon(-31.9505, 115.8605, 0.015),  # Perth CBD
                'restricted_hazard_classes': ['1', '2', '3', '8'],
                'prohibited_hazard_classes': [],
                'max_speed_kmh': 50,
                'regulatory_authority': 'City of Perth',
                'description': 'High-density residential area with speed and time restrictions',
                'time_restrictions': {
                    'all_days': {
                        'restricted_hours': ['22:00-06:00'],
                        'restricted_classes': ['1', '2', '3']
                    }
                }
            },
            {
                'name': 'Adelaide Emergency Services Precinct',
                'zone_type': ComplianceZone.ZoneType.EMERGENCY_SERVICES,
                'boundary': self._create_sample_polygon(-34.9285, 138.6007, 0.008),  # Adelaide CBD
                'restricted_hazard_classes': ['1', '2', '7'],
                'prohibited_hazard_classes': ['1'],
                'max_speed_kmh': 40,
                'requires_notification': True,
                'requires_escort': True,
                'regulatory_authority': 'SA Emergency Services',
                'description': 'Emergency services area requiring special precautions'
            }
        ]
        
        created_count = 0
        
        for zone_data in sample_zones:
            zone, created = ComplianceZone.objects.get_or_create(
                name=zone_data['name'],
                defaults=zone_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created zone: {zone.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Zone already exists: {zone.name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Created {created_count} new compliance zones')
        )
        
        # Display summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(
            self.style.SUCCESS('Compliance Zones Summary:')
        )
        self.stdout.write('='*60)
        
        zones = ComplianceZone.objects.filter(is_active=True)
        for zone in zones:
            restricted = ', '.join(zone.restricted_hazard_classes) if zone.restricted_hazard_classes else 'None'
            prohibited = ', '.join(zone.prohibited_hazard_classes) if zone.prohibited_hazard_classes else 'None'
            
            self.stdout.write(f'✓ {zone.name} ({zone.get_zone_type_display()})')
            self.stdout.write(f'  Restricted Classes: {restricted}')
            self.stdout.write(f'  Prohibited Classes: {prohibited}')
            if zone.max_speed_kmh:
                self.stdout.write(f'  Max Speed: {zone.max_speed_kmh} km/h')
            if zone.requires_escort:
                self.stdout.write(f'  Requires Escort: Yes')
            if zone.requires_notification:
                self.stdout.write(f'  Requires Notification: Yes')
            self.stdout.write('')

    def _create_sample_polygon(self, center_lat: float, center_lng: float, size: float) -> Polygon:
        """Create a sample rectangular polygon around a center point"""
        
        # Create a simple rectangular boundary
        half_size = size / 2
        
        coords = [
            (center_lng - half_size, center_lat - half_size),  # Bottom left
            (center_lng + half_size, center_lat - half_size),  # Bottom right
            (center_lng + half_size, center_lat + half_size),  # Top right
            (center_lng - half_size, center_lat + half_size),  # Top left
            (center_lng - half_size, center_lat - half_size),  # Close polygon
        ]
        
        return Polygon(coords, srid=4326)