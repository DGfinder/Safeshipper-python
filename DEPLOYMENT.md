# SafeShipper Production Deployment Guide

![Docker](https://img.shields.io/badge/Docker-Enabled-blue)
![Production](https://img.shields.io/badge/Production-Ready-green)
![Security](https://img.shields.io/badge/Security-Hardened-red)

**Complete guide for deploying SafeShipper to production environments.**

This guide covers enterprise-grade deployment strategies, including Docker containerization, environment configuration, SSL/HTTPS setup, monitoring, and scaling considerations for the SafeShipper dangerous goods logistics platform.

## 🎯 Deployment Overview

### Architecture Components

```
Production SafeShipper Deployment
├── 🌐 Load Balancer (Nginx/CloudFlare)
│   ├── SSL Termination
│   ├── Rate Limiting
│   └── Static Asset Caching
│
├── 🚀 Frontend (Next.js)
│   ├── Server-Side Rendering
│   ├── Multi-stage Docker Build
│   ├── Health Checks
│   └── Performance Monitoring
│
├── 🔧 Backend (Django)
│   ├── Django REST Framework
│   ├── Celery Background Tasks
│   ├── Database Migrations
│   └── API Rate Limiting
│
├── 💾 Database Layer
│   ├── PostgreSQL (Primary)
│   ├── Redis (Caching/Sessions)
│   └── PostGIS (Spatial Data)
│
└── 📊 Monitoring Stack
    ├── Prometheus (Metrics)
    ├── Grafana (Dashboards)
    ├── Loki (Logs)
    └── Health Checks
```

## 🐳 Docker Production Deployment

### Prerequisites

- **Docker Engine**: 20.10+ with Compose V2
- **Available Ports**: 80, 443, 3000, 8000, 5432, 6379
- **System Requirements**: 4GB RAM minimum, 8GB recommended
- **SSL Certificates**: Let's Encrypt or custom certificates
- **Domain Names**: Configured DNS for production domains

### Quick Production Setup (5 minutes)

```bash
# 1. Clone repository
git clone <repository-url>
cd safeshipper

# 2. Create production environment file
cp .env.production.example .env.production

# 3. Configure production variables (IMPORTANT)
nano .env.production
# Update all placeholder values with your production settings

# 4. Generate SSL certificates (Let's Encrypt)
./scripts/setup-ssl.sh yourdomain.com

# 5. Deploy with production compose
docker-compose -f docker-compose.prod.yml up -d

# 6. Initialize database and collect static files
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# 7. Verify deployment
curl -f https://yourdomain.com/health
```

**🎉 Production deployment complete!**

## 📋 Environment Configuration

### Required Environment Variables

Create `.env.production` with the following configuration:

```bash
# === Core Application Settings ===
NODE_ENV=production
DJANGO_SETTINGS_MODULE=safeshipper_core.settings
DEBUG=False
SECRET_KEY=your_secure_secret_key_here_256_bits_minimum

# === Domain and URL Configuration ===
SITE_URL=https://yourdomain.com
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# === Database Configuration ===
DB_ENGINE=postgresql
DB_NAME=safeshipper_prod
DB_USER=safeshipper
DB_PASSWORD=your_secure_db_password_here
DB_HOST=postgres
DB_PORT=5432

# === Redis Configuration ===
REDIS_URL=redis://:your_redis_password@redis:6379/0
REDIS_PASSWORD=your_secure_redis_password

# === Email Configuration (for notifications) ===
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@yourdomain.com
EMAIL_HOST_PASSWORD=your_email_password

# === File Storage (AWS S3 recommended) ===
USE_S3=True
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_STORAGE_BUCKET_NAME=safeshipper-files-prod
AWS_S3_REGION_NAME=us-west-2
AWS_S3_CUSTOM_DOMAIN=cdn.yourdomain.com

# === Security Settings ===
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# === Monitoring and Logging ===
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=INFO
ENABLE_DEBUG_TOOLBAR=False

# === Performance Settings ===
CACHE_TTL=300
MAX_UPLOAD_SIZE=100MB
API_RATE_LIMIT=1000/hour

# === External Services (Optional) ===
GOOGLE_MAPS_API_KEY=your_google_maps_key
OPENAI_API_KEY=your_openai_key

# === Monitoring Passwords ===
GRAFANA_ADMIN_PASSWORD=your_grafana_password
PROMETHEUS_PASSWORD=your_prometheus_password
```

### Secret Generation

Generate secure secrets for production:

```bash
# Django SECRET_KEY (256 bits)
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Database passwords (32 characters)
openssl rand -base64 32

# Redis password (64 characters)
openssl rand -base64 64

# JWT secret (256 bits)
node -p "require('crypto').randomBytes(32).toString('hex')"
```

## 🔒 SSL/HTTPS Configuration

### Option 1: Let's Encrypt (Recommended)

Automatic SSL certificate management with automatic renewal:

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run

# Add to crontab for automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Option 2: Custom SSL Certificates

If using custom certificates:

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your certificates
cp yourdomain.com.crt nginx/ssl/
cp yourdomain.com.key nginx/ssl/
cp intermediate.crt nginx/ssl/

# Set proper permissions
chmod 644 nginx/ssl/*.crt
chmod 600 nginx/ssl/*.key
```

### Nginx SSL Configuration

```nginx
# nginx/conf.d/safeshipper.conf
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/yourdomain.com.crt;
    ssl_certificate_key /etc/nginx/ssl/yourdomain.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubdomains; preload";
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Frontend (Next.js)
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    # Static files
    location /static/ {
        alias /var/www/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /var/www/media/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

## 🗄️ Database Setup and Migration

### PostgreSQL Production Configuration

```sql
-- Create production database and user
CREATE DATABASE safeshipper_prod;
CREATE USER safeshipper WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE safeshipper_prod TO safeshipper;

-- Enable PostGIS for spatial data
\c safeshipper_prod;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;
```

### Database Performance Optimization

Add to `docker-compose.prod.yml`:

```yaml
postgres:
  image: postgres:15-alpine
  environment:
    - POSTGRES_DB=safeshipper_prod
    - POSTGRES_USER=safeshipper
    - POSTGRES_PASSWORD=${DB_PASSWORD}
    - POSTGRES_SHARED_PRELOAD_LIBRARIES=pg_stat_statements
  command: >
    postgres
      -c shared_preload_libraries=pg_stat_statements
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c work_mem=4MB
      -c maintenance_work_mem=64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
```

### Initial Database Setup

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Create initial superuser
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Load essential data
docker-compose -f docker-compose.prod.yml exec backend python manage.py setup_api_gateway
docker-compose -f docker-compose.prod.yml exec backend python manage.py import_dg_data
docker-compose -f docker-compose.prod.yml exec backend python manage.py setup_compliance_zones

# Collect static files
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

## 📊 Monitoring and Logging

### Comprehensive Monitoring Stack

The production deployment includes a full monitoring stack:

#### Prometheus Configuration

```yaml
# monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

scrape_configs:
  - job_name: 'safeshipper-frontend'
    static_configs:
      - targets: ['frontend:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'safeshipper-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### Grafana Dashboard Configuration

```yaml
# monitoring/grafana/datasources/prometheus.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    access: proxy
    isDefault: true
```

### Application Health Checks

Each service includes comprehensive health checks:

```typescript
// Frontend health check
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: await checkDatabaseConnection(),
    redis: await checkRedisConnection(),
  };
  
  return Response.json(health);
}
```

```python
# Backend health check
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache

def health_check(request):
    health = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'version': settings.VERSION,
        'database': check_database(),
        'cache': check_cache(),
        'celery': check_celery(),
    }
    
    return JsonResponse(health)
```

## 🔄 Deployment Automation

### GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Run Tests
      run: |
        cd frontend && npm ci && npm test
        cd ../backend && pip install -r requirements.txt && python manage.py test
    
    - name: Build Images
      run: |
        docker-compose -f docker-compose.prod.yml build
    
    - name: Deploy to Production
      env:
        PRODUCTION_HOST: ${{ secrets.PRODUCTION_HOST }}
        SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
      run: |
        echo "$SSH_PRIVATE_KEY" > deploy_key
        chmod 600 deploy_key
        scp -i deploy_key docker-compose.prod.yml user@$PRODUCTION_HOST:/opt/safeshipper/
        ssh -i deploy_key user@$PRODUCTION_HOST "cd /opt/safeshipper && docker-compose -f docker-compose.prod.yml up -d"
```

### Zero-Downtime Deployment Script

```bash
#!/bin/bash
# scripts/deploy-production.sh

set -e

echo "🚀 Starting SafeShipper production deployment..."

# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Run database migrations
echo "📊 Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm backend python manage.py migrate

# Update static files
echo "📁 Collecting static files..."
docker-compose -f docker-compose.prod.yml run --rm backend python manage.py collectstatic --noinput

# Rolling update services
echo "🔄 Updating services..."
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale frontend=2 frontend
sleep 30
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale frontend=1 frontend

docker-compose -f docker-compose.prod.yml up -d --no-deps backend

# Health check
echo "🏥 Performing health checks..."
timeout 60 bash -c 'until curl -f https://yourdomain.com/health; do sleep 2; done'

echo "✅ Deployment completed successfully!"
```

## 🔧 Scaling and Performance

### Horizontal Scaling

Scale individual services based on demand:

```bash
# Scale frontend for high traffic
docker-compose -f docker-compose.prod.yml up -d --scale frontend=3

# Scale backend workers
docker-compose -f docker-compose.prod.yml up -d --scale backend=2

# Scale Celery workers
docker-compose -f docker-compose.prod.yml up -d --scale celery=4
```

### Load Balancing Configuration

```nginx
# Advanced load balancing
upstream frontend_backend {
    least_conn;
    server frontend_1:3000 max_fails=3 fail_timeout=30s;
    server frontend_2:3000 max_fails=3 fail_timeout=30s;
    server frontend_3:3000 max_fails=3 fail_timeout=30s;
}

upstream api_backend {
    ip_hash;  # Sticky sessions for WebSocket
    server backend_1:8000 max_fails=3 fail_timeout=30s;
    server backend_2:8000 max_fails=3 fail_timeout=30s;
}

server {
    location / {
        proxy_pass http://frontend_backend;
        # ... other settings
    }
    
    location /api/ {
        proxy_pass http://api_backend;
        # ... other settings
    }
}
```

### Auto-scaling with Docker Swarm

```yaml
# docker-stack.yml
version: '3.8'
services:
  frontend:
    image: safeshipper/frontend:latest
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
      restart_policy:
        condition: on-failure
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
```

## 🔒 Security Hardening

### Container Security

```dockerfile
# Use non-root user
FROM node:18-alpine AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Remove unnecessary packages
RUN apk del .build-deps

# Set security labels
LABEL security.non-root=true
LABEL security.no-new-privileges=true
```

### Network Security

```yaml
# docker-compose.prod.yml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access
  database:
    driver: bridge
    internal: true  # Database isolated
```

### Environment Security

```bash
# Encrypt environment files
gpg --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
    --s2k-digest-algo SHA512 --s2k-count 65536 \
    --symmetric --output .env.production.gpg .env.production

# Decrypt for deployment
gpg --quiet --batch --yes --decrypt --passphrase="$GPG_PASSPHRASE" \
    --output .env.production .env.production.gpg
```

## 📝 Maintenance and Backup

### Automated Backups

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backups/safeshipper"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump \
    -U safeshipper safeshipper_prod | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# File uploads backup
docker-compose -f docker-compose.prod.yml exec -T backend tar -czf - /app/media \
    > "$BACKUP_DIR/media_$DATE.tar.gz"

# Configuration backup
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
    docker-compose.prod.yml .env.production nginx/

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/" s3://safeshipper-backups/$(date +%Y/%m/%d)/ --recursive

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete
```

### Log Rotation

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  frontend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 🚨 Troubleshooting

### Common Issues and Solutions

**SSL Certificate Issues:**
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/yourdomain.com.crt -text -noout

# Test SSL configuration
curl -vI https://yourdomain.com

# Force certificate renewal
sudo certbot renew --force-renewal
```

**Database Connection Issues:**
```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test database connection
docker-compose -f docker-compose.prod.yml exec backend python manage.py dbshell

# Reset database connection pool
docker-compose -f docker-compose.prod.yml restart backend
```

**Performance Issues:**
```bash
# Check resource usage
docker stats

# Monitor application metrics
curl http://localhost:9090/metrics

# Check slow queries
docker-compose -f docker-compose.prod.yml exec postgres \
    psql -U safeshipper -d safeshipper_prod -c "SELECT * FROM pg_stat_activity;"
```

## 📚 Additional Resources

### Documentation Links
- [Docker Production Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Django Production Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

### Monitoring Tools
- **Application Performance**: New Relic, DataDog
- **Infrastructure**: Prometheus + Grafana
- **Logs**: ELK Stack, Loki
- **Error Tracking**: Sentry, Rollbar

### Support Contacts
- **Production Issues**: production-support@yourdomain.com
- **Security Issues**: security@yourdomain.com
- **Infrastructure**: infrastructure@yourdomain.com

---

**SafeShipper is now production-ready with enterprise-grade security, monitoring, and scalability.** 

This deployment guide ensures your dangerous goods logistics platform operates with 99.9% uptime and enterprise-level security standards.