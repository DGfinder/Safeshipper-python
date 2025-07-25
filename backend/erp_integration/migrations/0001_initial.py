# Generated by Django 5.2.1 on 2025-07-14 13:09

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("companies", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ERPSystem",
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
                ("name", models.CharField(max_length=200)),
                (
                    "system_type",
                    models.CharField(
                        choices=[
                            ("sap", "SAP"),
                            ("oracle", "Oracle ERP"),
                            ("netsuite", "NetSuite"),
                            ("dynamics", "Microsoft Dynamics"),
                            ("workday", "Workday"),
                            ("sage", "Sage"),
                            ("custom", "Custom System"),
                            ("generic", "Generic REST API"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "connection_type",
                    models.CharField(
                        choices=[
                            ("rest_api", "REST API"),
                            ("soap", "SOAP Web Service"),
                            ("sftp", "SFTP File Transfer"),
                            ("database", "Direct Database"),
                            ("message_queue", "Message Queue"),
                            ("webhook", "Webhook"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "base_url",
                    models.URLField(
                        blank=True, help_text="Base URL for API connections"
                    ),
                ),
                (
                    "connection_config",
                    models.JSONField(
                        default=dict, help_text="Connection configuration details"
                    ),
                ),
                (
                    "authentication_config",
                    models.JSONField(
                        default=dict,
                        help_text="Authentication credentials and settings",
                    ),
                ),
                (
                    "sync_frequency_minutes",
                    models.IntegerField(
                        default=60, help_text="Sync frequency in minutes"
                    ),
                ),
                (
                    "enabled_modules",
                    models.JSONField(
                        default=list, help_text="List of enabled integration modules"
                    ),
                ),
                (
                    "legacy_field_mappings",
                    models.JSONField(
                        default=dict, help_text="Legacy field mapping configurations"
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("inactive", "Inactive"),
                            ("testing", "Testing"),
                            ("maintenance", "Maintenance"),
                            ("error", "Error"),
                        ],
                        default="inactive",
                        max_length=20,
                    ),
                ),
                ("last_sync_at", models.DateTimeField(blank=True, null=True)),
                ("last_error", models.TextField(blank=True)),
                ("error_count", models.IntegerField(default=0)),
                (
                    "push_enabled",
                    models.BooleanField(
                        default=True, help_text="Push data to ERP system"
                    ),
                ),
                (
                    "pull_enabled",
                    models.BooleanField(
                        default=True, help_text="Pull data from ERP system"
                    ),
                ),
                (
                    "bidirectional_sync",
                    models.BooleanField(
                        default=False, help_text="Enable bidirectional synchronization"
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="erp_systems",
                        to="companies.company",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["company", "name"],
                "unique_together": {("company", "name")},
            },
        ),
        migrations.CreateModel(
            name="IntegrationEndpoint",
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
                ("name", models.CharField(max_length=200)),
                (
                    "endpoint_type",
                    models.CharField(
                        choices=[
                            ("customers", "Customer Management"),
                            ("orders", "Order Management"),
                            ("shipments", "Shipment Tracking"),
                            ("invoicing", "Invoicing"),
                            ("inventory", "Inventory Management"),
                            ("financials", "Financial Data"),
                            ("master_data", "Master Data"),
                            ("documents", "Document Management"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "path",
                    models.CharField(help_text="API endpoint path", max_length=500),
                ),
                (
                    "http_method",
                    models.CharField(
                        choices=[
                            ("GET", "GET"),
                            ("POST", "POST"),
                            ("PUT", "PUT"),
                            ("PATCH", "PATCH"),
                            ("DELETE", "DELETE"),
                        ],
                        default="POST",
                        max_length=10,
                    ),
                ),
                (
                    "request_template",
                    models.JSONField(default=dict, help_text="Request template/schema"),
                ),
                (
                    "response_mapping",
                    models.JSONField(default=dict, help_text="Response field mappings"),
                ),
                (
                    "headers",
                    models.JSONField(default=dict, help_text="Required headers"),
                ),
                (
                    "sync_direction",
                    models.CharField(
                        choices=[
                            ("push", "Push to ERP"),
                            ("pull", "Pull from ERP"),
                            ("bidirectional", "Bidirectional"),
                        ],
                        default="push",
                        max_length=20,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "erp_system",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="endpoints",
                        to="erp_integration.erpsystem",
                    ),
                ),
            ],
            options={
                "ordering": ["erp_system", "endpoint_type", "name"],
                "unique_together": {("erp_system", "endpoint_type", "name")},
            },
        ),
        migrations.CreateModel(
            name="DataSyncJob",
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
                    "job_type",
                    models.CharField(
                        choices=[
                            ("manual", "Manual Sync"),
                            ("scheduled", "Scheduled Sync"),
                            ("triggered", "Event Triggered"),
                            ("bulk", "Bulk Import/Export"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "direction",
                    models.CharField(
                        choices=[("push", "Push to ERP"), ("pull", "Pull from ERP")],
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("running", "Running"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                            ("cancelled", "Cancelled"),
                            ("partial", "Partially Completed"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("records_processed", models.IntegerField(default=0)),
                ("records_successful", models.IntegerField(default=0)),
                ("records_failed", models.IntegerField(default=0)),
                ("error_message", models.TextField(blank=True)),
                ("error_details", models.JSONField(default=dict)),
                ("retry_count", models.IntegerField(default=0)),
                ("max_retries", models.IntegerField(default=3)),
                ("request_payload", models.JSONField(default=dict)),
                ("response_data", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "initiated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "erp_system",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sync_jobs",
                        to="erp_integration.erpsystem",
                    ),
                ),
                (
                    "endpoint",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sync_jobs",
                        to="erp_integration.integrationendpoint",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ERPEventLog",
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
                    "event_type",
                    models.CharField(
                        choices=[
                            ("sync_started", "Sync Started"),
                            ("sync_completed", "Sync Completed"),
                            ("sync_failed", "Sync Failed"),
                            ("data_pushed", "Data Pushed"),
                            ("data_pulled", "Data Pulled"),
                            ("mapping_error", "Mapping Error"),
                            ("connection_error", "Connection Error"),
                            ("authentication_error", "Authentication Error"),
                            ("configuration_changed", "Configuration Changed"),
                        ],
                        max_length=30,
                    ),
                ),
                (
                    "severity",
                    models.CharField(
                        choices=[
                            ("info", "Info"),
                            ("warning", "Warning"),
                            ("error", "Error"),
                            ("critical", "Critical"),
                        ],
                        default="info",
                        max_length=10,
                    ),
                ),
                ("message", models.TextField()),
                ("details", models.JSONField(default=dict)),
                ("endpoint_path", models.CharField(blank=True, max_length=500)),
                ("record_id", models.CharField(blank=True, max_length=100)),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                (
                    "sync_job",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="event_logs",
                        to="erp_integration.datasyncjob",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "erp_system",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="event_logs",
                        to="erp_integration.erpsystem",
                    ),
                ),
            ],
            options={
                "ordering": ["-timestamp"],
                "indexes": [
                    models.Index(
                        fields=["erp_system", "event_type"],
                        name="erp_integra_erp_sys_5416bc_idx",
                    ),
                    models.Index(
                        fields=["severity", "timestamp"],
                        name="erp_integra_severit_7de11c_idx",
                    ),
                    models.Index(
                        fields=["sync_job", "timestamp"],
                        name="erp_integra_sync_jo_93732b_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="ERPConfiguration",
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
                    "config_type",
                    models.CharField(
                        choices=[
                            ("global", "Global Settings"),
                            ("system", "System Specific"),
                            ("endpoint", "Endpoint Specific"),
                            ("mapping", "Mapping Rules"),
                        ],
                        max_length=20,
                    ),
                ),
                ("config_key", models.CharField(max_length=200)),
                ("config_value", models.JSONField()),
                ("description", models.TextField(blank=True)),
                (
                    "is_sensitive",
                    models.BooleanField(
                        default=False, help_text="Contains sensitive data"
                    ),
                ),
                ("is_editable", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "erp_system",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="configurations",
                        to="erp_integration.erpsystem",
                    ),
                ),
            ],
            options={
                "ordering": ["erp_system", "config_type", "config_key"],
                "unique_together": {("erp_system", "config_key")},
            },
        ),
        migrations.CreateModel(
            name="ERPMapping",
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
                    "safeshipper_field",
                    models.CharField(
                        help_text="SafeShipper field path", max_length=200
                    ),
                ),
                (
                    "erp_field",
                    models.CharField(help_text="ERP system field path", max_length=200),
                ),
                (
                    "mapping_type",
                    models.CharField(
                        choices=[
                            ("direct", "Direct Field Mapping"),
                            ("transform", "Data Transformation"),
                            ("lookup", "Lookup Table"),
                            ("calculated", "Calculated Field"),
                            ("constant", "Constant Value"),
                        ],
                        default="direct",
                        max_length=20,
                    ),
                ),
                (
                    "transformation_rules",
                    models.JSONField(
                        default=dict, help_text="Transformation rules and logic"
                    ),
                ),
                ("default_value", models.CharField(blank=True, max_length=500)),
                ("is_required", models.BooleanField(default=False)),
                ("validation_rules", models.JSONField(default=dict)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "erp_system",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="field_mappings",
                        to="erp_integration.erpsystem",
                    ),
                ),
                (
                    "endpoint",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="field_mappings",
                        to="erp_integration.integrationendpoint",
                    ),
                ),
            ],
            options={
                "ordering": ["erp_system", "endpoint", "safeshipper_field"],
                "unique_together": {("endpoint", "safeshipper_field", "erp_field")},
            },
        ),
        migrations.CreateModel(
            name="ERPDataBuffer",
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
                    "buffer_type",
                    models.CharField(
                        choices=[
                            ("outbound", "Outbound to ERP"),
                            ("inbound", "Inbound from ERP"),
                            ("failed", "Failed Records"),
                            ("pending", "Pending Processing"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "object_type",
                    models.CharField(
                        help_text="Type of object (shipment, customer, etc.)",
                        max_length=50,
                    ),
                ),
                ("object_id", models.UUIDField(help_text="ID of the source object")),
                (
                    "raw_data",
                    models.JSONField(help_text="Original data before transformation"),
                ),
                (
                    "transformed_data",
                    models.JSONField(help_text="Data after transformation"),
                ),
                (
                    "external_id",
                    models.CharField(
                        blank=True, help_text="External system ID", max_length=200
                    ),
                ),
                ("is_processed", models.BooleanField(default=False)),
                ("processed_at", models.DateTimeField(blank=True, null=True)),
                ("error_message", models.TextField(blank=True)),
                ("retry_count", models.IntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "expires_at",
                    models.DateTimeField(help_text="Buffer record expiration time"),
                ),
                (
                    "erp_system",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="data_buffer",
                        to="erp_integration.erpsystem",
                    ),
                ),
                (
                    "endpoint",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="data_buffer",
                        to="erp_integration.integrationendpoint",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["erp_system", "buffer_type"],
                        name="erp_integra_erp_sys_6ce31a_idx",
                    ),
                    models.Index(
                        fields=["object_type", "object_id"],
                        name="erp_integra_object__882dc6_idx",
                    ),
                    models.Index(
                        fields=["is_processed", "created_at"],
                        name="erp_integra_is_proc_7752d3_idx",
                    ),
                    models.Index(
                        fields=["expires_at"], name="erp_integra_expires_65b94e_idx"
                    ),
                ],
            },
        ),
        migrations.AddIndex(
            model_name="datasyncjob",
            index=models.Index(
                fields=["erp_system", "status"], name="erp_integra_erp_sys_5feda9_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="datasyncjob",
            index=models.Index(
                fields=["endpoint", "created_at"], name="erp_integra_endpoin_9d1d4c_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="datasyncjob",
            index=models.Index(
                fields=["status", "started_at"], name="erp_integra_status_4cc2c0_idx"
            ),
        ),
    ]
