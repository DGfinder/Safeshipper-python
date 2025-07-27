# Generated migration for enhanced SDS models

from django.db import migrations, models
import django.db.models.deletion
import uuid
import django.contrib.postgres.fields


class Migration(migrations.Migration):

    dependencies = [
        ('sds', '0001_initial'),
        ('dangerous_goods', '0003_alter_dangerousgood_options_historicaldangerousgood'),
        # ('documents', '0001_initial'),  # Temporarily disabled - app disabled due to circular import
        ('users', '0001_initial'),
    ]

    operations = [
        # Create SDSDataSource model
        migrations.CreateModel(
            name='SDSDataSource',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(help_text='Official name of the data source', max_length=200, unique=True, verbose_name='Source Name')),
                ('short_name', models.CharField(help_text='Abbreviated identifier for the source', max_length=50, unique=True, verbose_name='Short Name')),
                ('source_type', models.CharField(choices=[('GOVERNMENT', 'Government Agency'), ('COMMERCIAL', 'Commercial Provider'), ('MANUFACTURER', 'Manufacturer Direct'), ('USER_UPLOAD', 'User Upload'), ('INDUSTRY_ASSOCIATION', 'Industry Association'), ('CROWDSOURCED', 'Crowdsourced')], db_index=True, max_length=30, verbose_name='Source Type')),
                ('organization', models.CharField(help_text='Organization that owns/maintains this source', max_length=200, verbose_name='Organization')),
                ('website_url', models.URLField(blank=True, verbose_name='Website URL')),
                ('api_endpoint', models.URLField(blank=True, help_text='Base URL for API access', verbose_name='API Endpoint')),
                ('documentation_url', models.URLField(blank=True, help_text='Link to API or data documentation', verbose_name='Documentation URL')),
                ('country_codes', django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=2), default=list, help_text='ISO country codes this source covers', size=10)),
                ('regulatory_jurisdictions', django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=100), default=list, help_text='Regulatory jurisdictions covered', size=20)),
                ('estimated_records', models.PositiveIntegerField(blank=True, help_text='Approximate number of SDS records available', null=True, verbose_name='Estimated Records')),
                ('update_frequency', models.CharField(choices=[('REAL_TIME', 'Real-time'), ('HOURLY', 'Hourly'), ('DAILY', 'Daily'), ('WEEKLY', 'Weekly'), ('MONTHLY', 'Monthly'), ('QUARTERLY', 'Quarterly'), ('ANNUALLY', 'Annually'), ('MANUAL', 'Manual')], default='MONTHLY', max_length=20, verbose_name='Update Frequency')),
                ('data_quality_score', models.FloatField(default=0.8, help_text='Overall data quality score (0.0-1.0)', validators=[django.core.validators.MinValueValidator(0.0), django.core.validators.MaxValueValidator(1.0)], verbose_name='Data Quality Score')),
                ('reliability_score', models.FloatField(default=0.8, help_text='Source reliability score (0.0-1.0)', validators=[django.core.validators.MinValueValidator(0.0), django.core.validators.MaxValueValidator(1.0)], verbose_name='Reliability Score')),
                ('requires_authentication', models.BooleanField(default=True, help_text='Whether this source requires API keys or authentication', verbose_name='Requires Authentication')),
                ('rate_limit_per_hour', models.PositiveIntegerField(blank=True, help_text='API rate limit in requests per hour', null=True, verbose_name='Rate Limit (per hour)')),
                ('cost_model', models.CharField(choices=[('FREE', 'Free'), ('SUBSCRIPTION', 'Subscription'), ('PER_REQUEST', 'Per Request'), ('TIERED', 'Tiered Pricing'), ('ENTERPRISE', 'Enterprise Agreement')], default='FREE', max_length=20, verbose_name='Cost Model')),
                ('annual_cost_aud', models.DecimalField(blank=True, decimal_places=2, help_text='Estimated annual cost in Australian dollars', max_digits=10, null=True, verbose_name='Annual Cost (AUD)')),
                ('status', models.CharField(choices=[('ACTIVE', 'Active'), ('INACTIVE', 'Inactive'), ('TESTING', 'Testing'), ('ERROR', 'Error'), ('MAINTENANCE', 'Maintenance')], db_index=True, default='TESTING', max_length=20, verbose_name='Status')),
                ('last_successful_sync', models.DateTimeField(blank=True, null=True, verbose_name='Last Successful Sync')),
                ('last_error', models.TextField(blank=True, help_text='Description of the most recent error', verbose_name='Last Error')),
                ('consecutive_failures', models.PositiveIntegerField(default=0, help_text='Number of consecutive sync failures', verbose_name='Consecutive Failures')),
                ('configuration', models.JSONField(blank=True, default=dict, help_text='Source-specific configuration parameters', verbose_name='Configuration')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_sds_sources', to='users.user')),
            ],
            options={
                'verbose_name': 'SDS Data Source',
                'verbose_name_plural': 'SDS Data Sources',
                'ordering': ['organization', 'name'],
                'indexes': [
                    models.Index(fields=['source_type', 'status'], name='sds_sdsdatasource_source_type_status_idx'),
                    models.Index(fields=['status', 'last_successful_sync'], name='sds_sdsdatasource_status_last_sync_idx'),
                    models.Index(fields=['organization', 'source_type'], name='sds_sdsdatasource_org_type_idx'),
                ],
            },
        ),
        
        # Create SDSDataImport model
        migrations.CreateModel(
            name='SDSDataImport',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('import_type', models.CharField(choices=[('FULL', 'Full Import'), ('INCREMENTAL', 'Incremental Update'), ('VERIFICATION', 'Verification Check'), ('MANUAL', 'Manual Import')], default='INCREMENTAL', max_length=20, verbose_name='Import Type')),
                ('trigger', models.CharField(choices=[('SCHEDULED', 'Scheduled'), ('MANUAL', 'Manual'), ('API_WEBHOOK', 'API Webhook'), ('ERROR_RECOVERY', 'Error Recovery')], default='SCHEDULED', max_length=20, verbose_name='Trigger')),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('duration_seconds', models.PositiveIntegerField(blank=True, null=True)),
                ('status', models.CharField(choices=[('RUNNING', 'Running'), ('COMPLETED', 'Completed'), ('FAILED', 'Failed'), ('PARTIAL', 'Partial Success'), ('CANCELLED', 'Cancelled')], default='RUNNING', max_length=20, verbose_name='Status')),
                ('records_processed', models.PositiveIntegerField(default=0)),
                ('records_created', models.PositiveIntegerField(default=0)),
                ('records_updated', models.PositiveIntegerField(default=0)),
                ('records_skipped', models.PositiveIntegerField(default=0)),
                ('records_errors', models.PositiveIntegerField(default=0)),
                ('error_summary', models.TextField(blank=True)),
                ('warning_summary', models.TextField(blank=True)),
                ('import_log', models.JSONField(default=list, help_text='Detailed log of import activities')),
                ('data_source', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='import_sessions', to='sds.sdsdatasource')),
                ('initiated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='initiated_sds_imports', to='users.user')),
            ],
            options={
                'verbose_name': 'SDS Data Import',
                'verbose_name_plural': 'SDS Data Imports',
                'ordering': ['-started_at'],
                'indexes': [
                    models.Index(fields=['data_source', 'status'], name='sds_sdsdataimport_source_status_idx'),
                    models.Index(fields=['started_at', 'status'], name='sds_sdsdataimport_started_status_idx'),
                    models.Index(fields=['import_type', 'status'], name='sds_sdsdataimport_type_status_idx'),
                ],
            },
        ),
        
        # Create AustralianGovernmentSDSSync model
        migrations.CreateModel(
            name='AustralianGovernmentSDSSync',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('agency', models.CharField(choices=[('SAFE_WORK_AU', 'Safe Work Australia'), ('ACCC', 'Australian Competition and Consumer Commission'), ('APVMA', 'Australian Pesticides and Veterinary Medicines Authority'), ('TGA', 'Therapeutic Goods Administration'), ('NICNAS', 'National Industrial Chemicals Notification and Assessment Scheme')], max_length=50, verbose_name='Government Agency')),
                ('dataset_name', models.CharField(help_text='Name of the specific dataset being synchronized', max_length=200, verbose_name='Dataset Name')),
                ('last_sync_date', models.DateTimeField(blank=True, null=True, verbose_name='Last Sync Date')),
                ('next_scheduled_sync', models.DateTimeField(blank=True, null=True, verbose_name='Next Scheduled Sync')),
                ('sync_frequency', models.CharField(choices=[('DAILY', 'Daily'), ('WEEKLY', 'Weekly'), ('MONTHLY', 'Monthly'), ('QUARTERLY', 'Quarterly')], default='MONTHLY', max_length=20, verbose_name='Sync Frequency')),
                ('api_endpoint', models.URLField(blank=True, help_text='Government API endpoint for this dataset', verbose_name='API Endpoint')),
                ('download_url', models.URLField(blank=True, help_text='Direct download URL for dataset files', verbose_name='Download URL')),
                ('last_file_hash', models.CharField(blank=True, help_text='Hash of the last downloaded file for change detection', max_length=64, verbose_name='Last File Hash')),
                ('records_in_source', models.PositiveIntegerField(blank=True, help_text='Number of records in the government source', null=True, verbose_name='Records in Source')),
                ('records_imported', models.PositiveIntegerField(default=0, help_text='Number of records successfully imported to our database', verbose_name='Records Imported')),
                ('sync_status', models.CharField(choices=[('PENDING', 'Pending'), ('RUNNING', 'Running'), ('COMPLETED', 'Completed'), ('FAILED', 'Failed'), ('PARTIAL', 'Partial Success')], default='PENDING', max_length=20, verbose_name='Sync Status')),
                ('last_error', models.TextField(blank=True, help_text='Description of the most recent sync error', verbose_name='Last Error')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Australian Government SDS Sync',
                'verbose_name_plural': 'Australian Government SDS Syncs',
                'ordering': ['agency', 'dataset_name'],
                'indexes': [
                    models.Index(fields=['agency', 'sync_status'], name='sds_ausgovsdssync_agency_status_idx'),
                    models.Index(fields=['next_scheduled_sync'], name='sds_ausgovsdssync_next_sync_idx'),
                    models.Index(fields=['last_sync_date'], name='sds_ausgovsdssync_last_sync_idx'),
                ],
            },
        ),
        
        # Add unique constraint
        migrations.AddConstraint(
            model_name='australiangovernmentsdssync',
            constraint=models.UniqueConstraint(fields=('agency', 'dataset_name'), name='unique_agency_dataset'),
        ),
        
        # Add fields to existing SafetyDataSheet model to make it enhanced
        migrations.AddField(
            model_name='safetydatasheet',
            name='primary_source',
            field=models.ForeignKey(help_text='Primary source of this SDS data', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='primary_sds_records', to='sds.sdsdatasource'),
        ),
        
        migrations.AddField(
            model_name='safetydatasheet',
            name='data_completeness_score',
            field=models.FloatField(default=0.5, help_text='How complete the SDS data is (0.0-1.0)', validators=[django.core.validators.MinValueValidator(0.0), django.core.validators.MaxValueValidator(1.0)], verbose_name='Data Completeness Score'),
        ),
        
        migrations.AddField(
            model_name='safetydatasheet',
            name='data_accuracy_score',
            field=models.FloatField(blank=True, help_text='Estimated accuracy based on source reliability and validation', null=True, validators=[django.core.validators.MinValueValidator(0.0), django.core.validators.MaxValueValidator(1.0)], verbose_name='Data Accuracy Score'),
        ),
        
        migrations.AddField(
            model_name='safetydatasheet',
            name='confidence_score',
            field=models.FloatField(default=0.7, help_text='Combined confidence in the SDS data quality', validators=[django.core.validators.MinValueValidator(0.0), django.core.validators.MaxValueValidator(1.0)], verbose_name='Overall Confidence Score'),
        ),
        
        migrations.AddField(
            model_name='safetydatasheet',
            name='verification_status',
            field=models.CharField(choices=[('UNVERIFIED', 'Unverified'), ('AUTO_VERIFIED', 'Auto-verified'), ('PEER_REVIEWED', 'Peer Reviewed'), ('EXPERT_VERIFIED', 'Expert Verified'), ('MANUFACTURER_CONFIRMED', 'Manufacturer Confirmed')], db_index=True, default='UNVERIFIED', max_length=20, verbose_name='Verification Status'),
        ),
        
        migrations.AddField(
            model_name='safetydatasheet',
            name='verified_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='verified_sds_records', to='users.user'),
        ),
        
        migrations.AddField(
            model_name='safetydatasheet',
            name='verified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        
        migrations.AddField(
            model_name='safetydatasheet',
            name='australian_regulatory_status',
            field=models.CharField(choices=[('APPROVED', 'Approved for Australian use'), ('RESTRICTED', 'Restricted use in Australia'), ('PROHIBITED', 'Prohibited in Australia'), ('UNDER_REVIEW', 'Under regulatory review'), ('UNKNOWN', 'Status unknown')], default='UNKNOWN', help_text='Regulatory status in Australia', max_length=30, verbose_name='Australian Regulatory Status'),
        ),
        
        migrations.AddField(
            model_name='safetydatasheet',
            name='adg_classification_verified',
            field=models.BooleanField(default=False, help_text='Whether ADG classification has been verified against official sources', verbose_name='ADG Classification Verified'),
        ),
        
        migrations.AddField(
            model_name='safetydatasheet',
            name='imported_from',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='imported_sds_records', to='sds.sdsdataimport'),
        ),
        
        migrations.AddField(
            model_name='safetydatasheet',
            name='last_source_update',
            field=models.DateTimeField(blank=True, help_text='When this SDS was last updated from its source', null=True, verbose_name='Last Source Update'),
        ),
        
        migrations.AddField(
            model_name='safetydatasheet',
            name='source_update_frequency',
            field=models.CharField(choices=[('REAL_TIME', 'Real-time'), ('DAILY', 'Daily'), ('WEEKLY', 'Weekly'), ('MONTHLY', 'Monthly'), ('QUARTERLY', 'Quarterly'), ('STATIC', 'Static/One-time')], default='MONTHLY', max_length=20, verbose_name='Source Update Frequency'),
        ),
        
        migrations.AddField(
            model_name='safetydatasheet',
            name='duplicate_of',
            field=models.ForeignKey(blank=True, help_text='If this is identified as a duplicate, link to the primary record', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='duplicates', to='sds.safetydatasheet'),
        ),
        
        migrations.AddField(
            model_name='safetydatasheet',
            name='similarity_hash',
            field=models.CharField(blank=True, db_index=True, help_text='Hash for duplicate detection based on key fields', max_length=64, verbose_name='Similarity Hash'),
        ),
        
        # Create SDSQualityCheck model
        migrations.CreateModel(
            name='SDSQualityCheck',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('check_type', models.CharField(choices=[('COMPLETENESS', 'Data Completeness'), ('ACCURACY', 'Data Accuracy'), ('CONSISTENCY', 'Internal Consistency'), ('REGULATORY', 'Regulatory Compliance'), ('DUPLICATE', 'Duplicate Detection'), ('FORMAT', 'Format Validation')], max_length=30, verbose_name='Check Type')),
                ('check_result', models.CharField(choices=[('PASSED', 'Passed'), ('FAILED', 'Failed'), ('WARNING', 'Warning'), ('INFO', 'Information')], max_length=20, verbose_name='Check Result')),
                ('score', models.FloatField(blank=True, help_text='Numeric quality score for this check', null=True, validators=[django.core.validators.MinValueValidator(0.0), django.core.validators.MaxValueValidator(1.0)], verbose_name='Quality Score')),
                ('details', models.JSONField(default=dict, help_text='Detailed results and findings from the quality check')),
                ('automated', models.BooleanField(default=True, help_text='Whether this was an automated or manual quality check', verbose_name='Automated Check')),
                ('performed_at', models.DateTimeField(auto_now_add=True)),
                ('sds', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quality_checks', to='sds.safetydatasheet')),
                ('performed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='performed_quality_checks', to='users.user')),
            ],
            options={
                'verbose_name': 'SDS Quality Check',
                'verbose_name_plural': 'SDS Quality Checks',
                'ordering': ['-performed_at'],
                'indexes': [
                    models.Index(fields=['sds', 'check_type'], name='sds_sdsqualitycheck_sds_type_idx'),
                    models.Index(fields=['check_result', 'performed_at'], name='sds_sdsqualitycheck_result_time_idx'),
                    models.Index(fields=['automated', 'check_type'], name='sds_sdsqualitycheck_auto_type_idx'),
                ],
            },
        ),
        
        # Add additional indexes for enhanced functionality
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS sds_country_code_idx ON sds_safetydatasheet (country_code);",
            reverse_sql="DROP INDEX IF EXISTS sds_country_code_idx;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS sds_status_country_idx ON sds_safetydatasheet (status, country_code);",
            reverse_sql="DROP INDEX IF EXISTS sds_status_country_idx;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS sds_verification_status_idx ON sds_safetydatasheet (verification_status);",
            reverse_sql="DROP INDEX IF EXISTS sds_verification_status_idx;"
        ),
    ]