# Generated by Django 5.2.1 on 2025-07-14 13:09

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("companies", "0001_initial"),
        ("shipments", "0002_consignmentitem_dg_quantity_type_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CustomerProfile",
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
                    "preferred_contact_method",
                    models.CharField(
                        choices=[
                            ("email", "Email"),
                            ("sms", "SMS"),
                            ("push", "Push Notification"),
                            ("webhook", "Webhook"),
                        ],
                        default="email",
                        max_length=20,
                    ),
                ),
                (
                    "notification_preferences",
                    models.JSONField(
                        default=dict, help_text="Notification settings by event type"
                    ),
                ),
                (
                    "dashboard_layout",
                    models.CharField(
                        choices=[
                            ("compact", "Compact View"),
                            ("detailed", "Detailed View"),
                            ("cards", "Card Layout"),
                            ("list", "List View"),
                        ],
                        default="detailed",
                        max_length=20,
                    ),
                ),
                (
                    "default_filters",
                    models.JSONField(
                        default=dict, help_text="Saved filter preferences"
                    ),
                ),
                (
                    "language",
                    models.CharField(
                        default="en", help_text="Preferred language code", max_length=10
                    ),
                ),
                ("timezone", models.CharField(default="UTC", max_length=50)),
                ("api_access_enabled", models.BooleanField(default=False)),
                (
                    "webhook_url",
                    models.URLField(blank=True, help_text="Customer webhook endpoint"),
                ),
                ("webhook_secret", models.CharField(blank=True, max_length=128)),
                (
                    "business_hours",
                    models.JSONField(default=dict, help_text="Business hours by day"),
                ),
                (
                    "emergency_contact",
                    models.JSONField(
                        default=dict, help_text="Emergency contact information"
                    ),
                ),
                ("show_pricing", models.BooleanField(default=True)),
                ("show_documents", models.BooleanField(default=True)),
                ("show_tracking_details", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("last_login_at", models.DateTimeField(blank=True, null=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="customer_profiles",
                        to="companies.company",
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="customer_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["company__name", "user__last_name"],
            },
        ),
        migrations.CreateModel(
            name="SelfServiceRequest",
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
                    "request_type",
                    models.CharField(
                        choices=[
                            ("quote_request", "Quote Request"),
                            ("pickup_request", "Pickup Request"),
                            ("delivery_change", "Delivery Address Change"),
                            ("document_upload", "Document Upload"),
                            ("support_ticket", "Support Ticket"),
                            ("account_update", "Account Information Update"),
                            ("service_inquiry", "Service Inquiry"),
                            ("billing_inquiry", "Billing Inquiry"),
                        ],
                        max_length=30,
                    ),
                ),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField()),
                (
                    "priority",
                    models.CharField(
                        choices=[
                            ("low", "Low"),
                            ("normal", "Normal"),
                            ("high", "High"),
                            ("urgent", "Urgent"),
                        ],
                        default="normal",
                        max_length=10,
                    ),
                ),
                (
                    "request_data",
                    models.JSONField(default=dict, help_text="Structured request data"),
                ),
                (
                    "attachments",
                    models.JSONField(default=list, help_text="List of attachment URLs"),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("submitted", "Submitted"),
                            ("in_review", "In Review"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                            ("completed", "Completed"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="submitted",
                        max_length=20,
                    ),
                ),
                ("response_message", models.TextField(blank=True)),
                ("internal_notes", models.TextField(blank=True)),
                ("submitted_at", models.DateTimeField(auto_now_add=True)),
                ("due_date", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("response_sla_hours", models.IntegerField(default=24)),
                ("resolution_sla_hours", models.IntegerField(default=72)),
                (
                    "assigned_to",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="assigned_requests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "customer_profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="service_requests",
                        to="customer_portal.customerprofile",
                    ),
                ),
                (
                    "shipment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="shipments.shipment",
                    ),
                ),
            ],
            options={
                "ordering": ["-submitted_at"],
            },
        ),
        migrations.CreateModel(
            name="CustomerFeedback",
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
                    "feedback_type",
                    models.CharField(
                        choices=[
                            ("service_rating", "Service Rating"),
                            ("delivery_rating", "Delivery Rating"),
                            ("platform_feedback", "Platform Feedback"),
                            ("feature_request", "Feature Request"),
                            ("bug_report", "Bug Report"),
                            ("general_feedback", "General Feedback"),
                        ],
                        max_length=30,
                    ),
                ),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField()),
                (
                    "rating",
                    models.IntegerField(
                        blank=True,
                        choices=[
                            (1, "1 - Poor"),
                            (2, "2 - Fair"),
                            (3, "3 - Good"),
                            (4, "4 - Very Good"),
                            (5, "5 - Excellent"),
                        ],
                        null=True,
                    ),
                ),
                (
                    "categories",
                    models.JSONField(default=list, help_text="Feedback categories"),
                ),
                ("tags", models.JSONField(default=list, help_text="Feedback tags")),
                ("follow_up_required", models.BooleanField(default=False)),
                ("follow_up_notes", models.TextField(blank=True)),
                ("responded_at", models.DateTimeField(blank=True, null=True)),
                ("submitted_at", models.DateTimeField(auto_now_add=True)),
                (
                    "is_public",
                    models.BooleanField(
                        default=False, help_text="Can be used as testimonial"
                    ),
                ),
                (
                    "shipment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="shipments.shipment",
                    ),
                ),
                (
                    "customer_profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="feedback",
                        to="customer_portal.customerprofile",
                    ),
                ),
                (
                    "service_request",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="customer_portal.selfservicerequest",
                    ),
                ),
            ],
            options={
                "ordering": ["-submitted_at"],
            },
        ),
        migrations.CreateModel(
            name="CustomerNotification",
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
                    "notification_type",
                    models.CharField(
                        choices=[
                            ("shipment_update", "Shipment Update"),
                            ("delivery_confirmation", "Delivery Confirmation"),
                            ("exception_alert", "Exception Alert"),
                            ("document_required", "Document Required"),
                            ("compliance_issue", "Compliance Issue"),
                            ("invoice_ready", "Invoice Ready"),
                            ("system_maintenance", "System Maintenance"),
                            ("account_update", "Account Update"),
                        ],
                        max_length=30,
                    ),
                ),
                ("title", models.CharField(max_length=200)),
                ("message", models.TextField()),
                (
                    "priority",
                    models.CharField(
                        choices=[
                            ("low", "Low"),
                            ("normal", "Normal"),
                            ("high", "High"),
                            ("urgent", "Urgent"),
                        ],
                        default="normal",
                        max_length=10,
                    ),
                ),
                ("related_object_type", models.CharField(blank=True, max_length=50)),
                ("related_object_id", models.UUIDField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("unread", "Unread"),
                            ("read", "Read"),
                            ("archived", "Archived"),
                            ("dismissed", "Dismissed"),
                        ],
                        default="unread",
                        max_length=20,
                    ),
                ),
                (
                    "delivered_via",
                    models.JSONField(default=list, help_text="Delivery channels used"),
                ),
                (
                    "action_url",
                    models.URLField(
                        blank=True, help_text="URL for notification action"
                    ),
                ),
                (
                    "action_text",
                    models.CharField(
                        blank=True, help_text="Action button text", max_length=50
                    ),
                ),
                ("sent_at", models.DateTimeField(auto_now_add=True)),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                (
                    "shipment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="shipments.shipment",
                    ),
                ),
                (
                    "customer_profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notifications",
                        to="customer_portal.customerprofile",
                    ),
                ),
            ],
            options={
                "ordering": ["-sent_at"],
                "indexes": [
                    models.Index(
                        fields=["customer_profile", "status"],
                        name="customer_po_custome_4daedb_idx",
                    ),
                    models.Index(
                        fields=["notification_type", "sent_at"],
                        name="customer_po_notific_3fdcc1_idx",
                    ),
                    models.Index(
                        fields=["priority", "status"],
                        name="customer_po_priorit_da8eba_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="CustomerDashboard",
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
                ("name", models.CharField(default="My Dashboard", max_length=100)),
                ("is_default", models.BooleanField(default=True)),
                (
                    "layout_config",
                    models.JSONField(
                        default=dict, help_text="Widget layout and positioning"
                    ),
                ),
                (
                    "enabled_widgets",
                    models.JSONField(
                        default=list, help_text="List of enabled widget types"
                    ),
                ),
                (
                    "widget_settings",
                    models.JSONField(
                        default=dict, help_text="Settings for each widget"
                    ),
                ),
                (
                    "default_date_range",
                    models.CharField(default="30_days", max_length=20),
                ),
                (
                    "auto_refresh_interval",
                    models.IntegerField(
                        default=300, help_text="Auto-refresh interval in seconds"
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "customer_profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dashboards",
                        to="customer_portal.customerprofile",
                    ),
                ),
            ],
            options={
                "ordering": ["customer_profile", "name"],
                "unique_together": {("customer_profile", "name")},
            },
        ),
        migrations.CreateModel(
            name="PortalUsageAnalytics",
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
                    "action_type",
                    models.CharField(
                        choices=[
                            ("login", "Login"),
                            ("view_dashboard", "View Dashboard"),
                            ("track_shipment", "Track Shipment"),
                            ("download_document", "Download Document"),
                            ("submit_request", "Submit Request"),
                            ("update_profile", "Update Profile"),
                            ("view_invoice", "View Invoice"),
                            ("search", "Search"),
                        ],
                        max_length=30,
                    ),
                ),
                ("page_url", models.URLField()),
                ("user_agent", models.TextField(blank=True)),
                ("ip_address", models.GenericIPAddressField()),
                ("session_id", models.CharField(blank=True, max_length=100)),
                (
                    "action_data",
                    models.JSONField(
                        default=dict, help_text="Additional action context"
                    ),
                ),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                ("duration_seconds", models.IntegerField(blank=True, null=True)),
                (
                    "customer_profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="usage_analytics",
                        to="customer_portal.customerprofile",
                    ),
                ),
            ],
            options={
                "ordering": ["-timestamp"],
                "indexes": [
                    models.Index(
                        fields=["customer_profile", "timestamp"],
                        name="customer_po_custome_f7a01d_idx",
                    ),
                    models.Index(
                        fields=["action_type", "timestamp"],
                        name="customer_po_action__318251_idx",
                    ),
                    models.Index(
                        fields=["session_id"], name="customer_po_session_428003_idx"
                    ),
                ],
            },
        ),
        migrations.AddIndex(
            model_name="selfservicerequest",
            index=models.Index(
                fields=["customer_profile", "status"],
                name="customer_po_custome_3b2804_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="selfservicerequest",
            index=models.Index(
                fields=["request_type", "submitted_at"],
                name="customer_po_request_779fe2_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="selfservicerequest",
            index=models.Index(
                fields=["assigned_to", "status"], name="customer_po_assigne_edbcfd_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="customerfeedback",
            index=models.Index(
                fields=["customer_profile", "rating"],
                name="customer_po_custome_9c6ed6_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="customerfeedback",
            index=models.Index(
                fields=["feedback_type", "submitted_at"],
                name="customer_po_feedbac_41bdf9_idx",
            ),
        ),
    ]
