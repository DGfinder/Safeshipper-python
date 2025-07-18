# Generated by Django 5.2.1 on 2025-07-14 10:12

import django.db.models.deletion
import simple_history.models
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SecurityPolicy",
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
                ("name", models.CharField(max_length=100, unique=True)),
                ("description", models.TextField(blank=True)),
                (
                    "require_mfa_for_roles",
                    models.JSONField(
                        default=list, help_text="List of roles that require MFA"
                    ),
                ),
                (
                    "mfa_grace_period_hours",
                    models.PositiveIntegerField(
                        default=24,
                        help_text="Hours before MFA becomes mandatory for new users",
                    ),
                ),
                ("min_password_length", models.PositiveIntegerField(default=8)),
                ("require_password_complexity", models.BooleanField(default=True)),
                ("password_expiry_days", models.PositiveIntegerField(default=90)),
                ("session_timeout_minutes", models.PositiveIntegerField(default=480)),
                ("max_concurrent_sessions", models.PositiveIntegerField(default=3)),
                (
                    "allowed_ip_ranges",
                    models.JSONField(
                        default=list,
                        help_text="List of allowed IP ranges (CIDR notation)",
                    ),
                ),
                (
                    "block_countries",
                    models.JSONField(
                        default=list, help_text="List of country codes to block"
                    ),
                ),
                ("log_all_access", models.BooleanField(default=True)),
                ("alert_on_suspicious_activity", models.BooleanField(default=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Security Policy",
                "verbose_name_plural": "Security Policies",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="SSOProvider",
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
                ("name", models.CharField(max_length=100, unique=True)),
                (
                    "provider_type",
                    models.CharField(
                        choices=[
                            ("google", "Google"),
                            ("microsoft", "Microsoft"),
                            ("okta", "Okta"),
                            ("saml", "SAML"),
                            ("azure_ad", "Azure AD"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "domain",
                    models.CharField(
                        help_text="Company domain for auto-routing", max_length=255
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("client_id", models.CharField(blank=True, max_length=255)),
                ("client_secret", models.CharField(blank=True, max_length=500)),
                ("saml_entity_id", models.CharField(blank=True, max_length=255)),
                ("saml_sso_url", models.URLField(blank=True)),
                ("saml_certificate", models.TextField(blank=True)),
                (
                    "allowed_roles",
                    models.JSONField(
                        default=list,
                        help_text="List of roles allowed to use this SSO provider",
                    ),
                ),
                (
                    "require_company_email",
                    models.BooleanField(
                        default=True,
                        help_text="Require users to have company domain email",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "SSO Provider",
                "verbose_name_plural": "SSO Providers",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="HistoricalMFADevice",
            fields=[
                (
                    "id",
                    models.UUIDField(db_index=True, default=uuid.uuid4, editable=False),
                ),
                (
                    "device_type",
                    models.CharField(
                        choices=[
                            ("totp", "TOTP (Authenticator App)"),
                            ("sms", "SMS"),
                            ("email", "Email"),
                            ("backup", "Backup Codes"),
                        ],
                        max_length=10,
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        help_text="User-friendly device name", max_length=100
                    ),
                ),
                ("phone_number", models.CharField(blank=True, max_length=20)),
                ("secret_key", models.CharField(blank=True, max_length=255)),
                ("backup_codes", models.JSONField(blank=True, default=list)),
                ("is_confirmed", models.BooleanField(default=False)),
                ("is_primary", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(blank=True, editable=False)),
                ("last_used", models.DateTimeField(blank=True, null=True)),
                ("use_count", models.PositiveIntegerField(default=0)),
                ("history_id", models.AutoField(primary_key=True, serialize=False)),
                ("history_date", models.DateTimeField(db_index=True)),
                ("history_change_reason", models.CharField(max_length=100, null=True)),
                (
                    "history_type",
                    models.CharField(
                        choices=[("+", "Created"), ("~", "Changed"), ("-", "Deleted")],
                        max_length=1,
                    ),
                ),
                (
                    "history_user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "historical MFA Device",
                "verbose_name_plural": "historical MFA Devices",
                "ordering": ("-history_date", "-history_id"),
                "get_latest_by": ("history_date", "history_id"),
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
        migrations.CreateModel(
            name="HistoricalSecurityPolicy",
            fields=[
                (
                    "id",
                    models.UUIDField(db_index=True, default=uuid.uuid4, editable=False),
                ),
                ("name", models.CharField(db_index=True, max_length=100)),
                ("description", models.TextField(blank=True)),
                (
                    "require_mfa_for_roles",
                    models.JSONField(
                        default=list, help_text="List of roles that require MFA"
                    ),
                ),
                (
                    "mfa_grace_period_hours",
                    models.PositiveIntegerField(
                        default=24,
                        help_text="Hours before MFA becomes mandatory for new users",
                    ),
                ),
                ("min_password_length", models.PositiveIntegerField(default=8)),
                ("require_password_complexity", models.BooleanField(default=True)),
                ("password_expiry_days", models.PositiveIntegerField(default=90)),
                ("session_timeout_minutes", models.PositiveIntegerField(default=480)),
                ("max_concurrent_sessions", models.PositiveIntegerField(default=3)),
                (
                    "allowed_ip_ranges",
                    models.JSONField(
                        default=list,
                        help_text="List of allowed IP ranges (CIDR notation)",
                    ),
                ),
                (
                    "block_countries",
                    models.JSONField(
                        default=list, help_text="List of country codes to block"
                    ),
                ),
                ("log_all_access", models.BooleanField(default=True)),
                ("alert_on_suspicious_activity", models.BooleanField(default=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(blank=True, editable=False)),
                ("updated_at", models.DateTimeField(blank=True, editable=False)),
                ("history_id", models.AutoField(primary_key=True, serialize=False)),
                ("history_date", models.DateTimeField(db_index=True)),
                ("history_change_reason", models.CharField(max_length=100, null=True)),
                (
                    "history_type",
                    models.CharField(
                        choices=[("+", "Created"), ("~", "Changed"), ("-", "Deleted")],
                        max_length=1,
                    ),
                ),
                (
                    "history_user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "historical Security Policy",
                "verbose_name_plural": "historical Security Policies",
                "ordering": ("-history_date", "-history_id"),
                "get_latest_by": ("history_date", "history_id"),
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
        migrations.CreateModel(
            name="HistoricalSSOProvider",
            fields=[
                (
                    "id",
                    models.UUIDField(db_index=True, default=uuid.uuid4, editable=False),
                ),
                ("name", models.CharField(db_index=True, max_length=100)),
                (
                    "provider_type",
                    models.CharField(
                        choices=[
                            ("google", "Google"),
                            ("microsoft", "Microsoft"),
                            ("okta", "Okta"),
                            ("saml", "SAML"),
                            ("azure_ad", "Azure AD"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "domain",
                    models.CharField(
                        help_text="Company domain for auto-routing", max_length=255
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("client_id", models.CharField(blank=True, max_length=255)),
                ("client_secret", models.CharField(blank=True, max_length=500)),
                ("saml_entity_id", models.CharField(blank=True, max_length=255)),
                ("saml_sso_url", models.URLField(blank=True)),
                ("saml_certificate", models.TextField(blank=True)),
                (
                    "allowed_roles",
                    models.JSONField(
                        default=list,
                        help_text="List of roles allowed to use this SSO provider",
                    ),
                ),
                (
                    "require_company_email",
                    models.BooleanField(
                        default=True,
                        help_text="Require users to have company domain email",
                    ),
                ),
                ("created_at", models.DateTimeField(blank=True, editable=False)),
                ("updated_at", models.DateTimeField(blank=True, editable=False)),
                ("history_id", models.AutoField(primary_key=True, serialize=False)),
                ("history_date", models.DateTimeField(db_index=True)),
                ("history_change_reason", models.CharField(max_length=100, null=True)),
                (
                    "history_type",
                    models.CharField(
                        choices=[("+", "Created"), ("~", "Changed"), ("-", "Deleted")],
                        max_length=1,
                    ),
                ),
                (
                    "history_user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "historical SSO Provider",
                "verbose_name_plural": "historical SSO Providers",
                "ordering": ("-history_date", "-history_id"),
                "get_latest_by": ("history_date", "history_id"),
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
        migrations.CreateModel(
            name="MFADevice",
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
                    "device_type",
                    models.CharField(
                        choices=[
                            ("totp", "TOTP (Authenticator App)"),
                            ("sms", "SMS"),
                            ("email", "Email"),
                            ("backup", "Backup Codes"),
                        ],
                        max_length=10,
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        help_text="User-friendly device name", max_length=100
                    ),
                ),
                ("phone_number", models.CharField(blank=True, max_length=20)),
                ("secret_key", models.CharField(blank=True, max_length=255)),
                ("backup_codes", models.JSONField(blank=True, default=list)),
                ("is_confirmed", models.BooleanField(default=False)),
                ("is_primary", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("last_used", models.DateTimeField(blank=True, null=True)),
                ("use_count", models.PositiveIntegerField(default=0)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="mfa_devices",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "MFA Device",
                "verbose_name_plural": "MFA Devices",
                "ordering": ["-is_primary", "-last_used"],
            },
        ),
        migrations.CreateModel(
            name="HistoricalUserSSOAccount",
            fields=[
                (
                    "id",
                    models.UUIDField(db_index=True, default=uuid.uuid4, editable=False),
                ),
                ("sso_user_id", models.CharField(max_length=255)),
                ("sso_email", models.EmailField(max_length=254)),
                ("sso_display_name", models.CharField(blank=True, max_length=255)),
                ("first_login", models.DateTimeField(blank=True, editable=False)),
                ("last_login", models.DateTimeField(blank=True, editable=False)),
                ("is_active", models.BooleanField(default=True)),
                ("history_id", models.AutoField(primary_key=True, serialize=False)),
                ("history_date", models.DateTimeField(db_index=True)),
                ("history_change_reason", models.CharField(max_length=100, null=True)),
                (
                    "history_type",
                    models.CharField(
                        choices=[("+", "Created"), ("~", "Changed"), ("-", "Deleted")],
                        max_length=1,
                    ),
                ),
                (
                    "history_user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "provider",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="+",
                        to="enterprise_auth.ssoprovider",
                    ),
                ),
            ],
            options={
                "verbose_name": "historical User SSO Account",
                "verbose_name_plural": "historical User SSO Accounts",
                "ordering": ("-history_date", "-history_id"),
                "get_latest_by": ("history_date", "history_id"),
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
        migrations.CreateModel(
            name="AuthenticationLog",
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
                            ("login_success", "Login Success"),
                            ("login_failed", "Login Failed"),
                            ("sso_login", "SSO Login"),
                            ("mfa_challenge", "MFA Challenge"),
                            ("mfa_success", "MFA Success"),
                            ("mfa_failed", "MFA Failed"),
                            ("logout", "Logout"),
                            ("password_reset", "Password Reset"),
                            ("account_locked", "Account Locked"),
                        ],
                        max_length=20,
                    ),
                ),
                ("ip_address", models.GenericIPAddressField()),
                ("user_agent", models.TextField(blank=True)),
                ("session_key", models.CharField(blank=True, max_length=100)),
                ("username_attempted", models.CharField(blank=True, max_length=255)),
                ("success", models.BooleanField()),
                ("failure_reason", models.CharField(blank=True, max_length=255)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
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
                    "mfa_device",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="enterprise_auth.mfadevice",
                    ),
                ),
                (
                    "sso_provider",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="enterprise_auth.ssoprovider",
                    ),
                ),
            ],
            options={
                "verbose_name": "Authentication Log",
                "verbose_name_plural": "Authentication Logs",
                "ordering": ["-timestamp"],
                "indexes": [
                    models.Index(
                        fields=["user", "-timestamp"],
                        name="enterprise__user_id_0a1a37_idx",
                    ),
                    models.Index(
                        fields=["ip_address", "-timestamp"],
                        name="enterprise__ip_addr_985064_idx",
                    ),
                    models.Index(
                        fields=["event_type", "-timestamp"],
                        name="enterprise__event_t_aa4bb5_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="UserSSOAccount",
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
                ("sso_user_id", models.CharField(max_length=255)),
                ("sso_email", models.EmailField(max_length=254)),
                ("sso_display_name", models.CharField(blank=True, max_length=255)),
                ("first_login", models.DateTimeField(auto_now_add=True)),
                ("last_login", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "provider",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="enterprise_auth.ssoprovider",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sso_accounts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "User SSO Account",
                "verbose_name_plural": "User SSO Accounts",
                "ordering": ["-last_login"],
                "unique_together": {("provider", "sso_user_id")},
            },
        ),
    ]
