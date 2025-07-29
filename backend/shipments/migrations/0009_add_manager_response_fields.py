# Generated migration for adding manager response fields to ShipmentFeedback

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('shipments', '0008_add_shipment_feedback'),
    ]

    operations = [
        migrations.AddField(
            model_name='shipmentfeedback',
            name='manager_response',
            field=models.TextField(
                blank=True,
                help_text='Internal response from manager regarding this feedback (not sent to customer)',
                max_length=2000,
                verbose_name='Manager Response'
            ),
        ),
        migrations.AddField(
            model_name='shipmentfeedback',
            name='responded_at',
            field=models.DateTimeField(
                blank=True,
                help_text='When the manager responded to this feedback',
                null=True,
                verbose_name='Response Date'
            ),
        ),
        migrations.AddField(
            model_name='shipmentfeedback',
            name='responded_by',
            field=models.ForeignKey(
                blank=True,
                help_text='Manager who responded to this feedback',
                limit_choices_to={'role__in': ['MANAGER', 'ADMIN']},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='feedback_responses',
                to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AddIndex(
            model_name='shipmentfeedback',
            index=models.Index(fields=['responded_at'], name='shipments_sh_respond_8f9d52_idx'),
        ),
        migrations.AddIndex(
            model_name='shipmentfeedback',
            index=models.Index(fields=['responded_by'], name='shipments_sh_respond_b4e7a1_idx'),
        ),
    ]