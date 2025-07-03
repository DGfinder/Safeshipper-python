# Generated manually for initial Vehicle model setup

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('companies', '0001_initial'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Vehicle',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('registration_number', models.CharField(max_length=20, unique=True, verbose_name='Registration Number')),
                ('make', models.CharField(max_length=50, verbose_name='Make')),
                ('model', models.CharField(max_length=50, verbose_name='Model')),
                ('year', models.PositiveIntegerField(verbose_name='Year')),
                ('vehicle_type', models.CharField(choices=[('TRUCK', 'Truck'), ('TRAILER', 'Trailer'), ('VAN', 'Van'), ('CAR', 'Car'), ('MOTORCYCLE', 'Motorcycle'), ('OTHER', 'Other')], max_length=20, verbose_name='Vehicle Type')),
                ('capacity_volume', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Capacity (Volume)')),
                ('capacity_weight', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Capacity (Weight)')),
                ('dimensions', models.JSONField(blank=True, default=dict, verbose_name='Dimensions')),
                ('status', models.CharField(choices=[('ACTIVE', 'Active'), ('MAINTENANCE', 'Maintenance'), ('OUT_OF_SERVICE', 'Out of Service'), ('RETIRED', 'Retired')], default='ACTIVE', max_length=20, verbose_name='Status')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='vehicles', to='companies.company')),
                ('driver', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_vehicles', to='users.user')),
            ],
            options={
                'verbose_name': 'Vehicle',
                'verbose_name_plural': 'Vehicles',
                'ordering': ['registration_number'],
            },
        ),
    ] 