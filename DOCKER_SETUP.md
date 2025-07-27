# SafeShipper Docker Development Setup

This guide helps you set up the complete SafeShipper development environment using Docker Compose.

## Prerequisites

- Docker Engine 20.10.0+
- Docker Compose v2.0.0+
- At least 8GB RAM available for Docker
- At least 10GB free disk space

## Quick Start

1. **Clone and Setup Environment**
   ```bash
   git clone <repository-url>
   cd SafeShipper
   cp .env.example .env
   # Edit .env with your specific configuration
   ```

2. **Start All Services**
   ```bash
   docker-compose up -d
   ```

3. **Wait for Services to be Ready**
   ```bash
   docker-compose logs -f backend
   # Wait for "Django development server is running"
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Admin Panel: http://localhost:8000/admin/
   - API Docs: http://localhost:8000/api/docs/
   - Grafana: http://localhost:3001 (admin/admin)
   - Flower (Celery): http://localhost:5555
   - MinIO Console: http://localhost:9001 (safeshipper/safeshipper123)

## Services Overview

| Service | Port | Purpose |
|---------|------|---------|
| frontend | 3000 | Next.js React application |
| backend | 8000 | Django REST API |
| postgres | 5432 | Primary database |
| redis | 6379 | Cache & message broker |
| elasticsearch | 9200 | Search engine |
| celery-worker | - | Background task processing |
| celery-beat | - | Periodic task scheduler |
| flower | 5555 | Celery monitoring |
| minio | 9000/9001 | S3-compatible file storage |
| prometheus | 9090 | Metrics collection |
| grafana | 3001 | Metrics visualization |

## Development Workflow

### Starting Services
```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres redis elasticsearch

# View logs
docker-compose logs -f backend
docker-compose logs -f celery-worker
```

### Database Operations
```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Import dangerous goods data
docker-compose exec backend python manage.py import_dg_data

# Rebuild search indexes
docker-compose exec backend python manage.py rebuild_search_indexes --force
```

### Code Changes
- **Backend**: Code changes are automatically reloaded via volume mounts
- **Frontend**: Next.js hot reload is enabled via volume mounts

### Debugging
```bash
# Access backend shell
docker-compose exec backend python manage.py shell

# Access database
docker-compose exec postgres psql -U safeshipper -d safeshipper

# Access Redis CLI
docker-compose exec redis redis-cli

# Check Elasticsearch
curl http://localhost:9200/_cluster/health
```

## Environment Configuration

Key environment variables in `.env`:

### Database
```env
DATABASE_URL=postgresql://safeshipper:safeshipper_dev_password@postgres:5432/safeshipper
```

### Search
```env
ELASTICSEARCH_HOST=elasticsearch:9200
```

### Message Queue
```env
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
```

### File Storage (Local Development)
```env
# Use MinIO for local S3-compatible storage
AWS_ACCESS_KEY_ID=safeshipper
AWS_SECRET_ACCESS_KEY=safeshipper123
AWS_STORAGE_BUCKET_NAME=safeshipper-dev
AWS_S3_ENDPOINT_URL=http://minio:9000
```

## Monitoring & Observability

### Prometheus Metrics
- Django metrics: http://localhost:8000/metrics/
- Prometheus UI: http://localhost:9090
- Targets status: http://localhost:9090/targets

### Grafana Dashboards
- Access: http://localhost:3001 (admin/admin)
- Pre-configured dashboards for Django, Celery, and infrastructure

### Celery Monitoring
- Flower UI: http://localhost:5555
- Monitor task queues, workers, and task history

## Troubleshooting

### Services Won't Start
```bash
# Check service health
docker-compose ps

# Check logs for errors
docker-compose logs backend
docker-compose logs postgres

# Restart problematic service
docker-compose restart backend
```

### Database Connection Issues
```bash
# Check PostgreSQL is ready
docker-compose exec postgres pg_isready -U safeshipper

# Reset database
docker-compose down -v
docker-compose up -d postgres
# Wait for PostgreSQL to be ready, then start other services
```

### Elasticsearch Issues
```bash
# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# Reset Elasticsearch data
docker-compose down
docker volume rm safeshipper_elasticsearch_data
docker-compose up -d elasticsearch
```

### Memory Issues
```bash
# Check Docker resource usage
docker stats

# Increase Docker memory limit in Docker Desktop settings
# Recommended: 8GB RAM, 4GB swap
```

## Production Differences

This development setup differs from production in several ways:

1. **Security**: Uses weak passwords and exposes all ports
2. **Performance**: Single-node Elasticsearch, minimal resource limits
3. **Persistence**: Data persists in Docker volumes but may be lost
4. **SSL**: No HTTPS termination
5. **Scaling**: All services run single instances

For production deployment, see the Kubernetes manifests in the `k8s/` directory.

## Useful Commands

```bash
# Full reset (careful: destroys all data)
docker-compose down -v
docker system prune -a

# Update and rebuild services
docker-compose pull
docker-compose build --no-cache
docker-compose up -d

# Export/import database
docker-compose exec postgres pg_dump -U safeshipper safeshipper > backup.sql
docker-compose exec -T postgres psql -U safeshipper safeshipper < backup.sql

# View resource usage
docker-compose top
docker system df
```