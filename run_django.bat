@echo off
set SECRET_KEY=django-insecure-your-secret-key-here-for-development-only
set DEBUG=True
set DB_ENGINE=django.db.backends.sqlite3
set DB_NAME=db.sqlite3
set DB_USER=
set DB_PASSWORD=
set DB_HOST=
set DB_PORT=
set ALLOWED_HOSTS=localhost,127.0.0.1
set CORS_ALLOWED_ORIGINS=http://localhost:3000

echo Running Django migrations...
python manage.py migrate

echo Creating superuser (skip if exists)...
echo from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(email='admin@safeshipper.com').exists() or User.objects.create_superuser('admin', 'admin@safeshipper.com', 'admin123') | python manage.py shell

echo Starting Django development server...
python manage.py runserver 