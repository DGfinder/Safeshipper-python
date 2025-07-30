# Generated migration for comprehensive incident management system

from django.db import migrations, models
from django.contrib.gis.db import models as gis_models
import django.core.validators
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('companies', '0001_initial'),
        ('users', '0001_initial'),
        ('dangerous_goods', '0001_initial'),
        ('shipments', '0001_initial'),
        ('vehicles', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='IncidentType',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField()),
                ('severity', models.CharField(choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')], max_length=20)),
                ('category', models.CharField(help_text="e.g., 'hazmat', 'vehicle', 'personnel'", max_length=50)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['category', 'name'],
            },
        ),
        migrations.CreateModel(
            name='Incident',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('incident_number', models.CharField(max_length=50, unique=True)),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('location', models.CharField(max_length=200)),
                ('address', models.TextField(blank=True, help_text='Full address of incident location')),
                ('coordinates', models.JSONField(blank=True, null=True)),
                ('location_point', gis_models.PointField(blank=True, help_text='PostGIS point for spatial queries', null=True, srid=4326)),
                ('occurred_at', models.DateTimeField()),
                ('reported_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('status', models.CharField(choices=[('reported', 'Reported'), ('investigating', 'Under Investigation'), ('resolved', 'Resolved'), ('closed', 'Closed')], default='reported', max_length=20)),
                ('priority', models.CharField(choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')], default='medium', max_length=20)),
                ('injuries_count', models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0)])),
                ('property_damage_estimate', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('environmental_impact', models.BooleanField(default=False)),
                ('resolution_notes', models.TextField(blank=True)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('closed_at', models.DateTimeField(blank=True, null=True)),
                ('authority_notified', models.BooleanField(default=False, help_text='Whether regulatory authorities have been notified')),
                ('authority_reference', models.CharField(blank=True, help_text='Reference number from regulatory authority', max_length=100)),
                ('regulatory_deadline', models.DateTimeField(blank=True, help_text='Deadline for regulatory reporting or response', null=True)),
                ('root_cause', models.TextField(blank=True, help_text='Identified root cause of the incident')),
                ('contributing_factors', models.JSONField(default=list, help_text='List of contributing factors')),
                ('emergency_services_called', models.BooleanField(default=False, help_text='Whether emergency services were called')),
                ('emergency_response_time', models.DurationField(blank=True, help_text='Time taken for emergency services to respond', null=True)),
                ('safety_officer_notified', models.BooleanField(default=False, help_text='Whether safety officer was notified')),
                ('quality_impact', models.CharField(choices=[('none', 'No Impact'), ('minor', 'Minor Impact'), ('moderate', 'Moderate Impact'), ('major', 'Major Impact'), ('severe', 'Severe Impact')], default='none', help_text='Impact on product/service quality', max_length=50)),
                ('weather_conditions', models.JSONField(blank=True, default=dict, help_text='Weather conditions at time of incident')),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assigned_to', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_incidents', to='users.user')),
                ('company', models.ForeignKey(help_text='Company that owns this incident', on_delete=django.db.models.deletion.CASCADE, related_name='incidents', to='companies.company')),
                ('incident_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='incidents.incidenttype')),
                ('reporter', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reported_incidents', to='users.user')),
                ('shipment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='shipments.shipment')),
                ('vehicle', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='vehicles.vehicle')),
                ('witnesses', models.ManyToManyField(blank=True, related_name='witnessed_incidents', to='users.user')),
                ('investigators', models.ManyToManyField(blank=True, help_text='Team members investigating this incident', related_name='investigating_incidents', to='users.user')),
            ],
            options={
                'ordering': ['-occurred_at'],
            },
        ),
        migrations.CreateModel(
            name='IncidentDangerousGood',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity_involved', models.DecimalField(decimal_places=3, help_text='Quantity of dangerous good involved in incident', max_digits=10)),
                ('quantity_unit', models.CharField(default='kg', help_text='Unit of measurement for quantity', max_length=20)),
                ('packaging_type', models.CharField(blank=True, help_text='Type of packaging involved', max_length=100)),
                ('release_amount', models.DecimalField(blank=True, decimal_places=3, help_text='Amount released during incident', max_digits=10, null=True)),
                ('containment_status', models.CharField(choices=[('contained', 'Fully Contained'), ('partial', 'Partially Contained'), ('released', 'Released to Environment'), ('unknown', 'Unknown')], default='unknown', help_text='Containment status of the dangerous good', max_length=50)),
                ('dangerous_good', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='dangerous_goods.dangerousgood')),
                ('incident', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='incidents.incident')),
            ],
        ),
        migrations.CreateModel(
            name='IncidentDocument',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('document_type', models.CharField(choices=[('photo', 'Photo'), ('report', 'Report'), ('witness_statement', 'Witness Statement'), ('insurance_claim', 'Insurance Claim'), ('corrective_action', 'Corrective Action Plan'), ('other', 'Other')], max_length=50)),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('file', models.FileField(upload_to='incident_documents/')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('incident', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='incidents.incident')),
                ('uploaded_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='users.user')),
            ],
            options={
                'ordering': ['-uploaded_at'],
            },
        ),
        migrations.CreateModel(
            name='IncidentUpdate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('update_type', models.CharField(choices=[('status_change', 'Status Change'), ('assignment', 'Assignment'), ('investigation', 'Investigation Note'), ('resolution', 'Resolution'), ('closure', 'Closure'), ('other', 'Other')], max_length=50)),
                ('description', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='users.user')),
                ('incident', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='updates', to='incidents.incident')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='CorrectiveAction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('status', models.CharField(choices=[('planned', 'Planned'), ('in_progress', 'In Progress'), ('completed', 'Completed'), ('cancelled', 'Cancelled')], default='planned', max_length=20)),
                ('due_date', models.DateField()),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('completion_notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assigned_to', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assigned_corrective_actions', to='users.user')),
                ('incident', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='corrective_actions', to='incidents.incident')),
            ],
            options={
                'ordering': ['due_date'],
            },
        ),
        migrations.AddField(
            model_name='incident',
            name='dangerous_goods_involved',
            field=models.ManyToManyField(blank=True, help_text='Dangerous goods involved in this incident', related_name='incidents', through='incidents.IncidentDangerousGood', to='dangerous_goods.dangerousgood'),
        ),
        # Add indexes
        migrations.AddIndex(
            model_name='incident',
            index=models.Index(fields=['incident_number'], name='incidents_incident_incident_number_idx'),
        ),
        migrations.AddIndex(
            model_name='incident',
            index=models.Index(fields=['status'], name='incidents_incident_status_idx'),
        ),
        migrations.AddIndex(
            model_name='incident',
            index=models.Index(fields=['priority'], name='incidents_incident_priority_idx'),
        ),
        migrations.AddIndex(
            model_name='incident',
            index=models.Index(fields=['occurred_at'], name='incidents_incident_occurred_at_idx'),
        ),
        migrations.AddIndex(
            model_name='incident',
            index=models.Index(fields=['company'], name='incidents_incident_company_idx'),
        ),
        migrations.AddIndex(
            model_name='incident',
            index=models.Index(fields=['assigned_to'], name='incidents_incident_assigned_to_idx'),
        ),
        migrations.AddIndex(
            model_name='incident',
            index=models.Index(fields=['reporter'], name='incidents_incident_reporter_idx'),
        ),
        migrations.AddIndex(
            model_name='incident',
            index=models.Index(fields=['authority_notified'], name='incidents_incident_authority_notified_idx'),
        ),
        migrations.AddIndex(
            model_name='incident',
            index=models.Index(fields=['emergency_services_called'], name='incidents_incident_emergency_services_called_idx'),
        ),
        # Add unique constraint for IncidentDangerousGood
        migrations.AlterUniqueTogether(
            name='incidentdangerousgood',
            unique_together={('incident', 'dangerous_good')},
        ),
    ]