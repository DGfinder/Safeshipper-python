# Generated manually for ShipmentFeedback model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('shipments', '0007_replace_location_charfields_with_geolocation'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ShipmentFeedback',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('was_on_time', models.BooleanField(help_text='Customer feedback: Was the shipment delivered on time?', verbose_name='Was the delivery on time?')),
                ('was_complete_and_undamaged', models.BooleanField(help_text='Customer feedback: Did the shipment arrive complete and without damage?', verbose_name='Was the shipment complete and undamaged?')),
                ('was_driver_professional', models.BooleanField(help_text='Customer feedback: Was the delivery driver professional and courteous?', verbose_name='Was the driver professional?')),
                ('feedback_notes', models.TextField(blank=True, help_text='Optional customer comments about the delivery experience', max_length=1000, verbose_name='Additional Comments')),
                ('submitted_at', models.DateTimeField(auto_now_add=True, help_text='When the feedback was submitted', verbose_name='Submitted At')),
                ('customer_ip', models.GenericIPAddressField(blank=True, help_text='IP address of the customer submitting feedback', null=True, verbose_name='Customer IP Address')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('shipment', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='customer_feedback', to='shipments.shipment')),
            ],
            options={
                'verbose_name': 'Shipment Feedback',
                'verbose_name_plural': 'Shipment Feedback',
                'ordering': ['-submitted_at'],
            },
        ),
        migrations.AddIndex(
            model_name='shipmentfeedback',
            index=models.Index(fields=['submitted_at'], name='shipments_s_submitt_8d4e3a_idx'),
        ),
        migrations.AddIndex(
            model_name='shipmentfeedback',
            index=models.Index(fields=['shipment'], name='shipments_s_shipmen_6a4b0c_idx'),
        ),
    ]