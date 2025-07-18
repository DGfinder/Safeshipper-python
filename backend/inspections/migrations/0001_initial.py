# Generated by Django 5.2.1 on 2025-07-14 11:07

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("shipments", "0002_consignmentitem_dg_quantity_type_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="InspectionTemplate",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=100)),
                (
                    "inspection_type",
                    models.CharField(
                        choices=[
                            ("PRE_TRIP", "Pre-Trip Inspection"),
                            ("POST_TRIP", "Post-Trip Inspection"),
                            ("LOADING", "Loading Inspection"),
                            ("UNLOADING", "Unloading Inspection"),
                            ("SAFETY_CHECK", "Safety Check"),
                        ],
                        max_length=20,
                    ),
                ),
                ("description", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["inspection_type", "name"],
            },
        ),
        migrations.CreateModel(
            name="Inspection",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "inspection_type",
                    models.CharField(
                        choices=[
                            ("PRE_TRIP", "Pre-Trip Inspection"),
                            ("POST_TRIP", "Post-Trip Inspection"),
                            ("LOADING", "Loading Inspection"),
                            ("UNLOADING", "Unloading Inspection"),
                            ("SAFETY_CHECK", "Safety Check"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("IN_PROGRESS", "In Progress"),
                            ("COMPLETED", "Completed"),
                            ("FAILED", "Failed"),
                            ("CANCELLED", "Cancelled"),
                        ],
                        default="IN_PROGRESS",
                        max_length=20,
                    ),
                ),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "overall_result",
                    models.CharField(
                        blank=True,
                        choices=[("PASS", "Pass"), ("FAIL", "Fail")],
                        max_length=10,
                        null=True,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "inspector",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="conducted_inspections",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "shipment",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="inspections",
                        to="shipments.shipment",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="InspectionItem",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("description", models.CharField(max_length=255)),
                ("category", models.CharField(blank=True, max_length=50)),
                ("is_mandatory", models.BooleanField(default=True)),
                (
                    "result",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("PASS", "Pass"),
                            ("FAIL", "Fail"),
                            ("N/A", "Not Applicable"),
                        ],
                        max_length=10,
                        null=True,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("corrective_action", models.TextField(blank=True)),
                ("checked_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "inspection",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="items",
                        to="inspections.inspection",
                    ),
                ),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
        migrations.CreateModel(
            name="InspectionPhoto",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("image_url", models.URLField(max_length=500)),
                ("thumbnail_url", models.URLField(blank=True, max_length=500)),
                ("file_name", models.CharField(max_length=255)),
                ("file_size", models.PositiveIntegerField(blank=True, null=True)),
                ("caption", models.CharField(blank=True, max_length=255)),
                ("taken_at", models.DateTimeField(auto_now_add=True)),
                (
                    "inspection_item",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="photos",
                        to="inspections.inspectionitem",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["taken_at"],
            },
        ),
        migrations.CreateModel(
            name="InspectionTemplateItem",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("description", models.CharField(max_length=255)),
                ("category", models.CharField(blank=True, max_length=50)),
                ("is_mandatory", models.BooleanField(default=True)),
                ("order", models.PositiveIntegerField(default=0)),
                ("help_text", models.TextField(blank=True)),
                (
                    "template",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="template_items",
                        to="inspections.inspectiontemplate",
                    ),
                ),
            ],
            options={
                "ordering": ["order", "description"],
            },
        ),
        migrations.AddIndex(
            model_name="inspection",
            index=models.Index(
                fields=["shipment", "inspection_type"],
                name="inspections_shipmen_00e65c_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="inspection",
            index=models.Index(
                fields=["inspector", "created_at"],
                name="inspections_inspect_39bd4d_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="inspectionitem",
            index=models.Index(
                fields=["inspection", "category"], name="inspections_inspect_b550bf_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="inspectionitem",
            index=models.Index(fields=["result"], name="inspections_result_f8f570_idx"),
        ),
    ]
