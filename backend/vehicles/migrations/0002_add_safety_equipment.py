# Generated migration for Safety Equipment models

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('vehicles', '0001_initial'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='SafetyEquipmentType',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(db_index=True, max_length=100, unique=True)),
                ('category', models.CharField(choices=[('FIRE_EXTINGUISHER', 'Fire Extinguisher'), ('FIRST_AID_KIT', 'First Aid Kit'), ('SPILL_KIT', 'Spill Kit'), ('EMERGENCY_STOP', 'Emergency Stop Equipment'), ('PROTECTIVE_EQUIPMENT', 'Protective Equipment'), ('COMMUNICATION', 'Communication Equipment'), ('TOOLS', 'Emergency Tools'), ('DOCUMENTATION', 'Documentation'), ('OTHER', 'Other')], max_length=32)),
                ('description', models.TextField(blank=True)),
                ('required_for_adr_classes', models.JSONField(default=list, help_text='List of ADR classes requiring this equipment')),
                ('required_by_vehicle_weight', models.BooleanField(default=False, help_text='Whether equipment requirement varies by vehicle weight')),
                ('minimum_capacity', models.CharField(blank=True, help_text="Minimum capacity requirement (e.g., '2kg', '6kg')", max_length=50)),
                ('certification_standard', models.CharField(blank=True, help_text="Required certification standard (e.g., 'EN 3', 'AS/NZS 1841')", max_length=100)),
                ('has_expiry_date', models.BooleanField(default=True)),
                ('inspection_interval_months', models.PositiveIntegerField(default=12, help_text='Months between required inspections')),
                ('replacement_interval_months', models.PositiveIntegerField(blank=True, help_text='Months until equipment must be replaced (if applicable)', null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Safety Equipment Type',
                'verbose_name_plural': 'Safety Equipment Types',
                'ordering': ['category', 'name'],
            },
        ),
        migrations.CreateModel(
            name='VehicleSafetyEquipment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('serial_number', models.CharField(blank=True, db_index=True, max_length=100)),
                ('manufacturer', models.CharField(blank=True, max_length=100)),
                ('model', models.CharField(blank=True, max_length=100)),
                ('capacity', models.CharField(blank=True, help_text="Actual capacity (e.g., '2kg', '6kg')", max_length=50)),
                ('installation_date', models.DateField()),
                ('expiry_date', models.DateField(blank=True, null=True)),
                ('last_inspection_date', models.DateField(blank=True, null=True)),
                ('next_inspection_date', models.DateField(blank=True, null=True)),
                ('status', models.CharField(choices=[('ACTIVE', 'Active'), ('EXPIRED', 'Expired'), ('MAINTENANCE', 'Under Maintenance'), ('DECOMMISSIONED', 'Decommissioned')], default='ACTIVE', max_length=16)),
                ('location_on_vehicle', models.CharField(blank=True, help_text="Physical location on vehicle (e.g., 'Driver side cab', 'Rear of trailer')", max_length=100)),
                ('certification_number', models.CharField(blank=True, max_length=100)),
                ('compliance_notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('equipment_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='vehicle_instances', to='vehicles.safetyequipmenttype')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='safety_equipment', to='vehicles.vehicle')),
            ],
            options={
                'verbose_name': 'Vehicle Safety Equipment',
                'verbose_name_plural': 'Vehicle Safety Equipment',
                'ordering': ['-installation_date'],
            },
        ),
        migrations.CreateModel(
            name='SafetyEquipmentInspection',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('inspection_type', models.CharField(choices=[('ROUTINE', 'Routine Inspection'), ('MAINTENANCE', 'Maintenance Check'), ('INCIDENT', 'Incident-Related'), ('PRE_TRIP', 'Pre-Trip Check'), ('CERTIFICATION', 'Certification Inspection')], max_length=16)),
                ('inspection_date', models.DateField()),
                ('result', models.CharField(choices=[('PASSED', 'Passed'), ('FAILED', 'Failed'), ('CONDITIONAL', 'Conditional Pass'), ('MAINTENANCE_REQUIRED', 'Maintenance Required')], max_length=32)),
                ('findings', models.TextField(blank=True)),
                ('actions_required', models.TextField(blank=True)),
                ('next_inspection_due', models.DateField(blank=True, null=True)),
                ('maintenance_completed', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('equipment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='inspections', to='vehicles.vehiclesafetyequipment')),
                ('inspector', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='safety_inspections', to='users.user')),
            ],
            options={
                'verbose_name': 'Safety Equipment Inspection',
                'verbose_name_plural': 'Safety Equipment Inspections',
                'ordering': ['-inspection_date'],
            },
        ),
        migrations.CreateModel(
            name='SafetyEquipmentCertification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('certification_type', models.CharField(choices=[('MANUFACTURING', 'Manufacturing Certificate'), ('TESTING', 'Testing Certificate'), ('CALIBRATION', 'Calibration Certificate'), ('COMPLIANCE', 'Compliance Certificate'), ('WARRANTY', 'Warranty Document'), ('OTHER', 'Other')], max_length=16)),
                ('certificate_number', models.CharField(db_index=True, max_length=100)),
                ('issuing_authority', models.CharField(max_length=200)),
                ('standard_reference', models.CharField(blank=True, help_text="Relevant standard (e.g., 'EN 3-7:2004', 'AS/NZS 1841.1')", max_length=100)),
                ('issue_date', models.DateField()),
                ('expiry_date', models.DateField(blank=True, null=True)),
                ('document_file', models.FileField(blank=True, null=True, upload_to='safety_equipment/certifications/')),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('equipment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='certifications', to='vehicles.vehiclesafetyequipment')),
            ],
            options={
                'verbose_name': 'Safety Equipment Certification',
                'verbose_name_plural': 'Safety Equipment Certifications',
                'ordering': ['-issue_date'],
            },
        ),
        # Add indexes
        migrations.AddIndex(
            model_name='safetyequipmenttype',
            index=models.Index(fields=['category'], name='vehicles_sa_categor_1a2c3d_idx'),
        ),
        migrations.AddIndex(
            model_name='safetyequipmenttype',
            index=models.Index(fields=['is_active'], name='vehicles_sa_is_acti_2b3e4f_idx'),
        ),
        migrations.AddIndex(
            model_name='vehiclesafetyequipment',
            index=models.Index(fields=['vehicle', 'equipment_type'], name='vehicles_ve_vehicle_3c4d5e_idx'),
        ),
        migrations.AddIndex(
            model_name='vehiclesafetyequipment',
            index=models.Index(fields=['status'], name='vehicles_ve_status_4d5e6f_idx'),
        ),
        migrations.AddIndex(
            model_name='vehiclesafetyequipment',
            index=models.Index(fields=['expiry_date'], name='vehicles_ve_expiry__5e6f7g_idx'),
        ),
        migrations.AddIndex(
            model_name='vehiclesafetyequipment',
            index=models.Index(fields=['next_inspection_date'], name='vehicles_ve_next_in_6f7g8h_idx'),
        ),
        migrations.AddIndex(
            model_name='vehiclesafetyequipment',
            index=models.Index(fields=['serial_number'], name='vehicles_ve_serial__7g8h9i_idx'),
        ),
        migrations.AddIndex(
            model_name='safetyequipmentinspection',
            index=models.Index(fields=['equipment', 'inspection_date'], name='vehicles_sa_equipme_8h9i0j_idx'),
        ),
        migrations.AddIndex(
            model_name='safetyequipmentinspection',
            index=models.Index(fields=['result'], name='vehicles_sa_result_9i0j1k_idx'),
        ),
        migrations.AddIndex(
            model_name='safetyequipmentinspection',
            index=models.Index(fields=['next_inspection_due'], name='vehicles_sa_next_in_0j1k2l_idx'),
        ),
        migrations.AddIndex(
            model_name='safetyequipmentcertification',
            index=models.Index(fields=['equipment', 'certification_type'], name='vehicles_sa_equipme_1k2l3m_idx'),
        ),
        migrations.AddIndex(
            model_name='safetyequipmentcertification',
            index=models.Index(fields=['certificate_number'], name='vehicles_sa_certifi_2l3m4n_idx'),
        ),
        migrations.AddIndex(
            model_name='safetyequipmentcertification',
            index=models.Index(fields=['expiry_date'], name='vehicles_sa_expiry__3m4n5o_idx'),
        ),
        # Add constraint
        migrations.AddConstraint(
            model_name='vehiclesafetyequipment',
            constraint=models.UniqueConstraint(condition=models.Q(('status', 'ACTIVE')), fields=('vehicle', 'equipment_type', 'serial_number'), name='unique_equipment_per_vehicle'),
        ),
    ]