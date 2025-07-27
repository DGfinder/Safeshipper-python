# SafeShipper Developer Setup & Testing Guide

**Complete guide for setting up the SafeShipper development environment and comprehensive testing procedures**

This guide provides step-by-step instructions for setting up a complete SafeShipper development environment, including all dependencies, testing frameworks, and development tools necessary for dangerous goods transportation platform development.

---

## 🚀 **Quick Start (5 Minutes)**

### **Prerequisites Checklist**
- [ ] **Python 3.11+** installed
- [ ] **PostgreSQL 16+** with PostGIS extension
- [ ] **Redis 7+** for caching and sessions
- [ ] **Node.js 18+** for frontend development
- [ ] **Docker & Docker Compose** (recommended for fastest setup)
- [ ] **Git** for version control

### **Docker Setup (Recommended)**

```bash
# 1. Clone repository
git clone <repository-url>
cd SafeShipper-python

# 2. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Start all services with Docker Compose
docker-compose up -d

# 4. Run initial setup
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py collectstatic --noinput

# 5. Load sample dangerous goods data
docker-compose exec backend python manage.py loaddata fixtures/dangerous_goods.json
docker-compose exec backend python manage.py loaddata fixtures/sample_companies.json

# 6. Install frontend dependencies
docker-compose exec frontend npm install --legacy-peer-deps

# 7. Access the application
echo "🎉 Setup complete!"
echo "Backend API: http://localhost:8000"
echo "Frontend: http://localhost:3000" 
echo "Admin Panel: http://localhost:8000/admin"
```

**⚡ That's it! You now have a fully functional SafeShipper development environment.**

---

## 🔧 **Manual Development Setup**

### **Backend Setup**

#### **1. Python Environment Setup**
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
cd backend
pip install -r requirements.txt
```

#### **2. Database Setup**
```bash
# Install PostgreSQL with PostGIS (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib postgis

# Create database and user
sudo -u postgres psql
```

```sql
-- In PostgreSQL shell
CREATE DATABASE safeshipper_dev;
CREATE USER safeshipper_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE safeshipper_dev TO safeshipper_user;

-- Enable PostGIS extension
\c safeshipper_dev
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;

-- Exit PostgreSQL
\q
```

#### **3. Redis Setup**
```bash
# Install Redis (Ubuntu/Debian)
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis connection
redis-cli ping
# Should respond with: PONG
```

#### **4. Environment Configuration**
```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` file:
```bash
# Database Configuration
DATABASE_URL=postgresql://safeshipper_user:your_secure_password@localhost:5432/safeshipper_dev

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Django Configuration
DEBUG=True
SECRET_KEY=your-development-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# API Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# File Storage (Development)
USE_S3=False
MEDIA_ROOT=./media/

# Email Configuration (Development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Search Configuration
ELASTICSEARCH_HOST=localhost:9200
ELASTICSEARCH_ENABLED=False  # Set to True if Elasticsearch installed

# Development Features
ENABLE_DEBUG_TOOLBAR=True
ENABLE_SILK_PROFILING=True
```

#### **5. Database Migration and Initial Data**
```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load initial dangerous goods data
python manage.py loaddata fixtures/dangerous_goods.json
python manage.py loaddata fixtures/emergency_procedures.json
python manage.py loaddata fixtures/sample_companies.json

# Create sample users for testing
python manage.py shell
```

```python
# In Django shell
from users.models import User
from companies.models import Company

# Get the sample company
company = Company.objects.first()

# Create test users with different roles
test_users = [
    {'username': 'driver1', 'email': 'driver@test.com', 'role': 'DRIVER'},
    {'username': 'operator1', 'email': 'operator@test.com', 'role': 'OPERATOR'},
    {'username': 'manager1', 'email': 'manager@test.com', 'role': 'MANAGER'},
    {'username': 'admin1', 'email': 'admin@test.com', 'role': 'ADMIN'}
]

for user_data in test_users:
    user = User.objects.create_user(
        username=user_data['username'],
        email=user_data['email'],
        password='testpass123',
        role=user_data['role'],
        company=company
    )
    print(f"Created user: {user.username} ({user.role})")

exit()
```

#### **6. Start Development Server**
```bash
# Start Django development server
python manage.py runserver

# In a separate terminal, start Celery worker
celery -A safeshipper_core worker --loglevel=info

# In another terminal, start Celery beat (for scheduled tasks)
celery -A safeshipper_core beat --loglevel=info
```

### **Frontend Setup**

#### **1. Node.js and Dependencies**
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install --legacy-peer-deps

# Copy environment configuration
cp .env.example .env.local
```

Edit `.env.local`:
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_ENABLE_DEVELOPMENT_FEATURES=true
NEXT_PUBLIC_ENABLE_DEBUG_MODE=true

# Mock Data (for development without backend)
NEXT_PUBLIC_USE_MOCK_DATA=false
```

#### **2. Start Frontend Development Server**
```bash
# Start Next.js development server
npm run dev

# The frontend will be available at http://localhost:3000
```

---

## 🧪 **Testing Setup & Guidelines**

### **Backend Testing Configuration**

#### **1. Test Database Setup**
```bash
# Create test database
sudo -u postgres createdb safeshipper_test
sudo -u postgres psql -d safeshipper_test -c "CREATE EXTENSION postgis;"
```

#### **2. Test Environment Configuration**
Create `backend/safeshipper_core/settings/test.py`:
```python
from .base import *

# Test database
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'safeshipper_test',
        'USER': 'safeshipper_user',
        'PASSWORD': 'your_secure_password',
        'HOST': 'localhost',
        'PORT': '5432',
        'TEST': {
            'NAME': 'test_safeshipper',
        }
    }
}

# Disable migrations for faster tests
class DisableMigrations:
    def __contains__(self, item):
        return True
    
    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# Test-specific settings
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Disable caching for tests
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# Fast password hashing for tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Disable logging for tests
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'null': {
            'class': 'logging.NullHandler',
        },
    },
    'root': {
        'handlers': ['null'],
    },
}
```

#### **3. Comprehensive Test Suite**

Create `backend/test_runner.py`:
```python
#!/usr/bin/env python
"""
Comprehensive test runner for SafeShipper backend
"""
import os
import sys
import django
from django.test.utils import get_runner
from django.conf import settings

def run_tests():
    """Run comprehensive test suite"""
    
    # Set test environment
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper_core.settings.test')
    django.setup()
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    
    # Define test categories
    test_suites = {
        'unit': [
            'dangerous_goods.tests',
            'emergency_procedures.tests',
            'users.tests',
            'shipments.tests',
            'vehicles.tests'
        ],
        'integration': [
            'dangerous_goods.tests.test_api',
            'emergency_procedures.tests.test_integration',
            'search.tests.test_integration'
        ],
        'security': [
            'users.tests.test_security',
            'dangerous_goods.tests.test_security',
            'emergency_procedures.tests.test_security'
        ],
        'performance': [
            'dangerous_goods.tests.test_performance',
            'search.tests.test_performance'
        ]
    }
    
    # Run all tests or specific category
    test_category = sys.argv[1] if len(sys.argv) > 1 else 'all'
    
    if test_category == 'all':
        # Run all tests
        test_labels = []
        for category_tests in test_suites.values():
            test_labels.extend(category_tests)
    elif test_category in test_suites:
        test_labels = test_suites[test_category]
    else:
        print(f"Unknown test category: {test_category}")
        print(f"Available categories: {list(test_suites.keys()) + ['all']}")
        return 1
    
    print(f"Running {test_category} tests...")
    failures = test_runner.run_tests(test_labels)
    
    if failures:
        print(f"❌ {failures} test(s) failed")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == '__main__':
    sys.exit(run_tests())
```

#### **4. Example Test Cases**

Create `backend/dangerous_goods/tests/test_comprehensive.py`:
```python
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
import json

from dangerous_goods.models import DangerousGood
from dangerous_goods.services import check_list_compatibility
from companies.models import Company

User = get_user_model()

class DangerousGoodsModelTests(TestCase):
    """Unit tests for DangerousGood model"""
    
    def setUp(self):
        self.company = Company.objects.create(
            name="Test Transport Co",
            abn="12345678901"
        )
        
        self.dg_flammable = DangerousGood.objects.create(
            un_number="UN1203",
            proper_shipping_name="Gasoline",
            hazard_class="3",
            packing_group="II"
        )
        
        self.dg_corrosive = DangerousGood.objects.create(
            un_number="UN1789",
            proper_shipping_name="Hydrochloric acid",
            hazard_class="8",
            packing_group="II"
        )
    
    def test_dangerous_good_creation(self):
        """Test dangerous good model creation"""
        self.assertEqual(self.dg_flammable.un_number, "UN1203")
        self.assertEqual(self.dg_flammable.hazard_class, "3")
        self.assertTrue(self.dg_flammable.is_dangerous_good)
    
    def test_string_representation(self):
        """Test string representation of dangerous good"""
        expected = "UN1203 - Gasoline (Class 3)"
        self.assertEqual(str(self.dg_flammable), expected)
    
    def test_hazard_classification(self):
        """Test hazard classification methods"""
        self.assertTrue(self.dg_flammable.is_flammable())
        self.assertTrue(self.dg_corrosive.is_corrosive())
        self.assertFalse(self.dg_flammable.is_corrosive())

class DangerousGoodsAPITests(APITestCase):
    """Integration tests for Dangerous Goods API"""
    
    def setUp(self):
        self.company = Company.objects.create(
            name="Test Transport Co",
            abn="12345678901"
        )
        
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            role="OPERATOR",
            company=self.company
        )
        
        self.client.force_authenticate(user=self.user)
        
        # Create test dangerous goods
        self.dg1 = DangerousGood.objects.create(
            un_number="UN1203",
            proper_shipping_name="Gasoline",
            hazard_class="3",
            packing_group="II"
        )
        
        self.dg2 = DangerousGood.objects.create(
            un_number="UN1381",
            proper_shipping_name="Phosphorus",
            hazard_class="4.2",
            packing_group="II"
        )
    
    def test_list_dangerous_goods(self):
        """Test listing dangerous goods"""
        url = reverse('dangerousgood-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
    
    def test_search_dangerous_goods(self):
        """Test searching dangerous goods"""
        url = reverse('dangerousgood-list')
        response = self.client.get(url, {'search': 'gasoline'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['un_number'], 'UN1203')
    
    def test_compatibility_check(self):
        """Test dangerous goods compatibility checking"""
        url = reverse('dangerousgood-check-compatibility')
        data = {'un_numbers': ['UN1203', 'UN1381']}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_compatible'])
        self.assertGreater(len(response.data['conflicts']), 0)
    
    def test_compatibility_check_validation(self):
        """Test compatibility check input validation"""
        url = reverse('dangerousgood-check-compatibility')
        
        # Test empty UN numbers
        response = self.client.post(url, {'un_numbers': []}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test invalid UN number format
        response = self.client.post(url, {'un_numbers': ['INVALID']}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

class DangerousGoodsSecurityTests(APITestCase):
    """Security tests for Dangerous Goods API"""
    
    def setUp(self):
        self.company1 = Company.objects.create(
            name="Company 1",
            abn="12345678901"
        )
        
        self.company2 = Company.objects.create(
            name="Company 2", 
            abn="98765432109"
        )
        
        self.user1 = User.objects.create_user(
            username="user1",
            email="user1@company1.com",
            password="testpass123",
            role="OPERATOR",
            company=self.company1
        )
        
        self.user2 = User.objects.create_user(
            username="user2",
            email="user2@company2.com", 
            password="testpass123",
            role="OPERATOR",
            company=self.company2
        )
    
    def test_unauthenticated_access(self):
        """Test that unauthenticated users cannot access API"""
        url = reverse('dangerousgood-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_permission_enforcement(self):
        """Test that proper permissions are enforced"""
        self.client.force_authenticate(user=self.user1)
        
        # Test that OPERATOR can access dangerous goods
        url = reverse('dangerousgood-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test compatibility checking permission
        url = reverse('dangerousgood-check-compatibility')
        data = {'un_numbers': ['UN1203', 'UN1090']}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_rate_limiting(self):
        """Test API rate limiting"""
        self.client.force_authenticate(user=self.user1)
        url = reverse('dangerousgood-list')
        
        # Make multiple rapid requests
        responses = []
        for i in range(105):  # Exceed typical rate limit
            response = self.client.get(url)
            responses.append(response.status_code)
        
        # Should eventually receive 429 (Too Many Requests)
        self.assertIn(429, responses)

class DangerousGoodsPerformanceTests(TransactionTestCase):
    """Performance tests for Dangerous Goods operations"""
    
    def setUp(self):
        self.company = Company.objects.create(
            name="Test Transport Co",
            abn="12345678901"
        )
        
        # Create large dataset for performance testing
        self.dangerous_goods = []
        for i in range(1000):
            dg = DangerousGood.objects.create(
                un_number=f"UN{1000 + i}",
                proper_shipping_name=f"Test Chemical {i}",
                hazard_class=str((i % 9) + 1),
                packing_group="II"
            )
            self.dangerous_goods.append(dg)
    
    def test_large_compatibility_check_performance(self):
        """Test performance of compatibility checking with many UN numbers"""
        import time
        
        # Test with 50 UN numbers
        un_numbers = [dg.un_number for dg in self.dangerous_goods[:50]]
        
        start_time = time.time()
        result = check_list_compatibility(un_numbers)
        end_time = time.time()
        
        # Should complete within 5 seconds
        self.assertLess(end_time - start_time, 5.0)
        self.assertIn('is_compatible', result)
    
    def test_search_performance(self):
        """Test search performance with large dataset"""
        import time
        from dangerous_goods.api_views import DangerousGoodViewSet
        
        viewset = DangerousGoodViewSet()
        
        start_time = time.time()
        queryset = viewset.get_queryset().filter(
            proper_shipping_name__icontains='Test'
        )
        results = list(queryset[:20])  # Force evaluation
        end_time = time.time()
        
        # Should complete within 1 second
        self.assertLess(end_time - start_time, 1.0)
        self.assertGreater(len(results), 0)

class EmergencyProceduresIntegrationTests(APITestCase):
    """Integration tests for Emergency Procedures system"""
    
    def setUp(self):
        self.company = Company.objects.create(
            name="Emergency Test Co",
            abn="12345678901"
        )
        
        self.manager = User.objects.create_user(
            username="manager",
            email="manager@test.com",
            password="testpass123",
            role="MANAGER",
            company=self.company
        )
        
        self.driver = User.objects.create_user(
            username="driver",
            email="driver@test.com",
            password="testpass123",
            role="DRIVER", 
            company=self.company
        )
    
    def test_emergency_incident_workflow(self):
        """Test complete emergency incident workflow"""
        
        # Step 1: Driver reports incident
        self.client.force_authenticate(user=self.driver)
        
        incident_data = {
            'emergency_type': 'SPILL',
            'description': 'Chemical spill during loading',
            'location': 'Loading Dock A',
            'coordinates': {'lat': -37.8136, 'lng': 144.9631},
            'severity_level': 'HIGH'
        }
        
        url = reverse('emergencyincident-list')
        response = self.client.post(url, incident_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        incident_id = response.data['id']
        self.assertEqual(response.data['status'], 'REPORTED')
        
        # Step 2: Manager starts response
        self.client.force_authenticate(user=self.manager)
        
        response_data = {
            'response_team': [str(self.manager.id)],
            'estimated_completion': '2024-12-31T14:00:00Z',
            'notes': 'Emergency response team dispatched'
        }
        
        url = reverse('emergencyincident-start-response', args=[incident_id])
        response = self.client.post(url, response_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'IN_PROGRESS')
        
        # Step 3: Manager resolves incident
        resolution_data = {
            'resolution_details': 'Spill contained and cleaned up',
            'lessons_learned': 'Additional training required',
            'cost_estimate': 2500.00
        }
        
        url = reverse('emergencyincident-mark-resolved', args=[incident_id])
        response = self.client.post(url, resolution_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'RESOLVED')
```

#### **5. Running Tests**

```bash
# Run all tests
python test_runner.py

# Run specific test categories
python test_runner.py unit
python test_runner.py integration
python test_runner.py security
python test_runner.py performance

# Run specific test files
python manage.py test dangerous_goods.tests.test_comprehensive --settings=safeshipper_core.settings.test

# Run with coverage
pip install coverage
coverage run --source='.' manage.py test --settings=safeshipper_core.settings.test
coverage report
coverage html  # Generate HTML coverage report
```

### **Frontend Testing Setup**

#### **1. Install Testing Dependencies**
```bash
cd frontend

# Install testing packages
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest \
  jest-environment-jsdom \
  eslint-plugin-testing-library
```

#### **2. Jest Configuration**
Create `frontend/jest.config.js`:
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Path to your Next.js app
  dir: './',
})

// Custom Jest configuration
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

Create `frontend/jest.setup.js`:
```javascript
import '@testing-library/jest-dom'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  
  observe() {
    return null
  }
  
  disconnect() {
    return null
  }
  
  unobserve() {
    return null
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  
  observe() {
    return null
  }
  
  disconnect() {
    return null
  }
  
  unobserve() {
    return null
  }
}

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))
```

#### **3. Example Frontend Tests**

Create `frontend/src/components/__tests__/DangerousGoodsChecker.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DangerousGoodsChecker from '../DangerousGoodsChecker'

// Mock API responses
const mockApiResponse = {
  is_compatible: false,
  conflicts: [
    {
      un_number_1: 'UN1203',
      un_number_2: 'UN1381',
      reason: 'Class 3 Flammable Liquids are incompatible with Class 4.2 Spontaneously Combustible materials.'
    }
  ]
}

// Mock fetch
global.fetch = jest.fn()

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('DangerousGoodsChecker', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear()
  })

  it('renders the dangerous goods checker form', () => {
    renderWithQueryClient(<DangerousGoodsChecker />)
    
    expect(screen.getByRole('heading', { name: /dangerous goods compatibility checker/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/un numbers/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /check compatibility/i })).toBeInTheDocument()
  })

  it('validates UN number format', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<DangerousGoodsChecker />)
    
    const input = screen.getByLabelText(/un numbers/i)
    const submitButton = screen.getByRole('button', { name: /check compatibility/i })
    
    // Enter invalid UN number
    await user.type(input, 'INVALID')
    await user.click(submitButton)
    
    expect(screen.getByText(/invalid un number format/i)).toBeInTheDocument()
  })

  it('performs compatibility check and displays results', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    })
    
    renderWithQueryClient(<DangerousGoodsChecker />)
    
    const input = screen.getByLabelText(/un numbers/i)
    const submitButton = screen.getByRole('button', { name: /check compatibility/i })
    
    // Enter valid UN numbers
    await user.type(input, 'UN1203, UN1381')
    await user.click(submitButton)
    
    // Wait for API call and results
    await waitFor(() => {
      expect(screen.getByText(/incompatible dangerous goods detected/i)).toBeInTheDocument()
    })
    
    expect(screen.getByText(/class 3 flammable liquids are incompatible/i)).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))
    
    renderWithQueryClient(<DangerousGoodsChecker />)
    
    const input = screen.getByLabelText(/un numbers/i)
    const submitButton = screen.getByRole('button', { name: /check compatibility/i })
    
    await user.type(input, 'UN1203, UN1381')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/error checking compatibility/i)).toBeInTheDocument()
    })
  })
})
```

#### **4. Running Frontend Tests**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- DangerousGoodsChecker.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="compatibility check"
```

---

## 🔄 **Development Workflow**

### **Daily Development Process**

1. **Start Development Environment**
```bash
# Terminal 1: Backend services
cd backend
source venv/bin/activate
python manage.py runserver

# Terminal 2: Celery worker
celery -A safeshipper_core worker --loglevel=info

# Terminal 3: Frontend
cd frontend
npm run dev

# Terminal 4: Redis (if not running as service)
redis-server
```

2. **Code Quality Checks**
```bash
# Backend code quality
cd backend
black .                    # Code formatting
isort .                    # Import sorting
flake8                     # Linting
mypy .                     # Type checking
python manage.py test      # Tests

# Frontend code quality
cd frontend
npm run lint               # ESLint
npm run type-check         # TypeScript checking
npm test                   # Tests
```

3. **Database Management**
```bash
# Create new migration
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Reset database (development only)
python manage.py reset_db
python manage.py migrate
python manage.py loaddata fixtures/dangerous_goods.json
```

### **Git Workflow**

```bash
# Start new feature
git checkout -b feature/dangerous-goods-enhancement

# Make changes and commit
git add .
git commit -m "Add enhanced dangerous goods compatibility checking"

# Push feature branch
git push origin feature/dangerous-goods-enhancement

# Create pull request through GitHub/GitLab
```

### **Performance Monitoring**

#### **Development Performance Tools**

1. **Django Debug Toolbar**
```python
# Already configured in development settings
# Access at: http://localhost:8000/your-page with debug toolbar
```

2. **Django Silk Profiling**
```python
# Access profiling at: http://localhost:8000/silk/
# Monitor SQL queries, view performance
```

3. **Frontend Performance**
```bash
# Analyze bundle size
npm run analyze

# Lighthouse audit
npm run lighthouse

# Performance testing
npm run perf
```

---

## 📊 **Monitoring & Debugging**

### **Development Debugging Tools**

#### **Backend Debugging**
```python
# Use Django shell for debugging
python manage.py shell

# Debug database queries
from django.db import connection
print(connection.queries)

# Use pdb for debugging
import pdb; pdb.set_trace()

# Use Django extensions for enhanced shell
pip install django-extensions
python manage.py shell_plus
```

#### **Frontend Debugging**
```javascript
// React Developer Tools (browser extension)
// Redux DevTools (browser extension)

// Debug API calls
console.log('API Response:', response)

// Debug component state
useEffect(() => {
  console.log('Component state:', state)
}, [state])
```

### **Log Analysis**

#### **Backend Logs**
```bash
# View Django logs
tail -f logs/django.log

# View Celery logs
tail -f logs/celery.log

# View security logs
tail -f logs/security.log
```

#### **Frontend Logs**
```bash
# View Next.js build logs
npm run build 2>&1 | tee build.log

# View runtime logs
npm run dev 2>&1 | tee dev.log
```

---

## 🚀 **Production Deployment Preparation**

### **Production Checklist**

- [ ] **Environment Configuration**
  - [ ] All environment variables configured for production
  - [ ] Debug mode disabled
  - [ ] Secure secret keys generated
  - [ ] Database connections secure

- [ ] **Security Configuration**
  - [ ] TLS/SSL certificates configured
  - [ ] Security headers implemented
  - [ ] CORS properly configured
  - [ ] Rate limiting enabled

- [ ] **Performance Optimization**
  - [ ] Static files collected and served via CDN
  - [ ] Database indexes optimized
  - [ ] Caching configured
  - [ ] Image optimization enabled

- [ ] **Monitoring Setup**
  - [ ] Error tracking configured (Sentry)
  - [ ] Performance monitoring enabled
  - [ ] Log aggregation setup
  - [ ] Health checks implemented

### **Deployment Commands**

```bash
# Backend production setup
python manage.py collectstatic --noinput
python manage.py migrate
python manage.py check --deploy

# Frontend production build
npm run build
npm run start

# Docker production deployment
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🆘 **Troubleshooting Guide**

### **Common Issues & Solutions**

#### **Backend Issues**

**Issue: Database connection errors**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Reset database permissions
sudo -u postgres psql
ALTER USER safeshipper_user CREATEDB;
```

**Issue: Celery not processing tasks**
```bash
# Check Redis connection
redis-cli ping

# Restart Celery worker
pkill -f "celery worker"
celery -A safeshipper_core worker --loglevel=info
```

**Issue: PostGIS extension missing**
```sql
-- Connect to database as superuser
sudo -u postgres psql -d safeshipper_dev
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
```

#### **Frontend Issues**

**Issue: Node modules conflicts**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

**Issue: Port already in use**
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9
# Or use different port
npm run dev -- --port 3001
```

**Issue: Environment variables not loading**
```bash
# Check .env.local exists and has correct variables
cat .env.local

# Restart development server
npm run dev
```

### **Performance Issues**

**Slow database queries:**
```python
# Enable query debugging
DEBUG = True
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
            'handlers': ['console'],
        },
    },
}
```

**High memory usage:**
```bash
# Monitor memory usage
htop

# Check for memory leaks in Python
pip install memory_profiler
python -m memory_profiler your_script.py
```

---

## 📋 **Development Checklist**

### **Before Starting Development**

- [ ] Latest code pulled from repository
- [ ] Virtual environment activated
- [ ] Dependencies up to date (`pip install -r requirements.txt`)
- [ ] Database migrations applied
- [ ] Redis and PostgreSQL running
- [ ] Environment variables configured

### **Before Committing Code**

- [ ] All tests passing (`python manage.py test`)
- [ ] Code formatted (`black .` and `isort .`)
- [ ] Linting passes (`flake8`)
- [ ] Type checking passes (`mypy .`)
- [ ] No debugging code left in
- [ ] Commit message follows conventions

### **Before Deployment**

- [ ] Production tests passing
- [ ] Security review completed
- [ ] Performance testing done
- [ ] Documentation updated
- [ ] Environment variables configured for production
- [ ] Database migrations ready
- [ ] Monitoring and alerting configured

---

**This comprehensive developer setup guide ensures all team members can quickly set up a fully functional SafeShipper development environment with proper testing procedures and development workflows for dangerous goods transportation platform development.**