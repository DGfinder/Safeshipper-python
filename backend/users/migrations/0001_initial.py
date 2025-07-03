# Generated manually for initial User model setup

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import simple_history.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('companies', '0001_initial'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('is_staff', models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status')),
                ('is_active', models.BooleanField(default=True, help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.', verbose_name='active')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('username', models.CharField(max_length=150, unique=True, verbose_name='username')),
                ('email', models.EmailField(max_length=254, unique=True, verbose_name='email address')),
                ('role', models.CharField(choices=[('ADMIN', 'Admin'), ('COMPLIANCE_OFFICER', 'Compliance Officer'), ('DISPATCHER', 'Dispatcher'), ('WAREHOUSE', 'Warehouse Staff'), ('DRIVER', 'Driver'), ('CUSTOMER', 'Customer'), ('READONLY', 'Read-Only User')], default='DRIVER', help_text="User's role within the system.", max_length=20)),
                ('logistics_model', models.CharField(blank=True, choices=[('1PL', '1PL (1st Party Logistics)'), ('3PL', '3PL (3rd Party Logistics)'), ('BROKER', 'Broker'), ('FORWARDER', 'Forwarder')], help_text='The logistics model this user operates under (e.g., 1PL, 3PL).', max_length=15, null=True, verbose_name='Logistics Model')),
                ('company', models.ForeignKey(blank=True, help_text='The company this user belongs to (if applicable, e.g., for carrier staff or customer users).', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='employees', to='companies.company')),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'verbose_name': 'User',
                'verbose_name_plural': 'Users',
                'ordering': ['username'],
            },
        ),
        migrations.CreateModel(
            name='HistoricalUser',
            fields=[
                ('id', models.BigIntegerField(auto_created=True, blank=True, db_index=True, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('is_staff', models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status')),
                ('is_active', models.BooleanField(default=True, help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.', verbose_name='active')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('username', models.CharField(db_index=True, max_length=150, verbose_name='username')),
                ('email', models.EmailField(db_index=True, max_length=254, verbose_name='email address')),
                ('role', models.CharField(choices=[('ADMIN', 'Admin'), ('COMPLIANCE_OFFICER', 'Compliance Officer'), ('DISPATCHER', 'Dispatcher'), ('WAREHOUSE', 'Warehouse Staff'), ('DRIVER', 'Driver'), ('CUSTOMER', 'Customer'), ('READONLY', 'Read-Only User')], default='DRIVER', help_text="User's role within the system.", max_length=20)),
                ('logistics_model', models.CharField(blank=True, choices=[('1PL', '1PL (1st Party Logistics)'), ('3PL', '3PL (3rd Party Logistics)'), ('BROKER', 'Broker'), ('FORWARDER', 'Forwarder')], help_text='The logistics model this user operates under (e.g., 1PL, 3PL).', max_length=15, null=True, verbose_name='Logistics Model')),
                ('history_id', models.AutoField(primary_key=True, serialize=False)),
                ('history_date', models.DateTimeField(db_index=True)),
                ('history_change_reason', models.CharField(max_length=100, null=True)),
                ('history_type', models.CharField(choices=[('+', 'Created'), ('~', 'Changed'), ('-', 'Deleted')], max_length=1)),
                ('company', models.ForeignKey(blank=True, db_constraint=False, help_text='The company this user belongs to (if applicable, e.g., for carrier staff or customer users).', null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name='+', to='companies.company')),
                ('history_user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='users.user')),
            ],
            options={
                'verbose_name': 'historical User',
                'verbose_name_plural': 'historical Users',
                'ordering': ('-history_date', '-history_id'),
                'get_latest_by': ('history_date', 'history_id'),
            },
            bases=(simple_history.models.HistoricalRecords, models.Model),
        ),
    ] 