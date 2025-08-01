# SafeShipper Trial-Ready Setup Guide
## 🎯 Complete Step-by-Step Guide for Non-Developers

**⚠️ IMPORTANT: This guide assumes ZERO programming experience. Follow every step exactly as written.**

---

## 📋 Overview

This guide will transform SafeShipper from its current 35-45% functional state into a fully trial-ready dangerous goods logistics platform. The process takes approximately 6-8 hours and requires no prior development experience.

### **Current Issues We'll Fix:**
- ❌ GIS/Location features broken (core logistics functionality)
- ❌ Database configuration problems
- ❌ Missing API keys for Google Maps and OpenAI
- ❌ Infrastructure services not running (Redis, Celery, Elasticsearch)
- ❌ Frontend-backend connection issues

### **What You'll Have After This Guide:**
- ✅ Fully functional SafeShipper platform
- ✅ Real-time GPS tracking and mapping
- ✅ Working dangerous goods compliance system
- ✅ Complete emergency response procedures
- ✅ Functional fleet management
- ✅ All 12 integrated modules working

---

## 🛡️ Safety First: Backup & Preparation

### **Step 1: Create a Backup**
Before making any changes, create a complete backup of your SafeShipper folder:

1. **Right-click** on your SafeShipper folder
2. **Select "Copy"**
3. **Right-click** in the same location
4. **Select "Paste"** 
5. **Rename the copy** to `SafeShipper-BACKUP-[TODAY'S DATE]`

**Example:** `SafeShipper-BACKUP-2025-01-30`

### **Step 2: Check System Requirements**

| Requirement | Minimum | Recommended |
|------------|---------|-------------|
| **RAM** | 8GB | 16GB+ |
| **Storage** | 10GB free | 20GB+ free |
| **Internet** | Stable connection | High-speed broadband |
| **Operating System** | Windows 10/11, macOS 10.15+, Ubuntu 20.04+ | Latest version |

---

## 🔧 Phase 1: Development Environment Setup
*Estimated Time: 1-2 hours*

### **Step 1: Install Git**

**Windows:**
1. Go to https://git-scm.com/download/windows
2. Download the installer
3. Run installer with **default settings**
4. Open Command Prompt and type: `git --version`
5. **Expected output:** `git version 2.x.x`

**Mac:**
1. Open Terminal (Applications → Utilities → Terminal)
2. Type: `git --version`
3. If not installed, follow prompts to install

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install git -y
git --version
```

### **Step 2: Install Python 3.11**

**Windows:**
1. Go to https://www.python.org/downloads/
2. Download Python 3.11.x (NOT 3.12+)
3. **⚠️ IMPORTANT:** Check "Add Python to PATH" during installation
4. Open Command Prompt and type: `python --version`
5. **Expected output:** `Python 3.11.x`

**Mac:**
1. Go to https://www.python.org/downloads/
2. Download Python 3.11.x
3. Install with default settings
4. Open Terminal and type: `python3 --version`

**Linux:**
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-dev -y
python3.11 --version
```

### **Step 3: Install Node.js**

**All Platforms:**
1. Go to https://nodejs.org/
2. Download the **LTS version** (v18 or v20)
3. Install with default settings
4. Open terminal/command prompt and type:
   ```bash
   node --version
   npm --version
   ```
5. **Expected output:** 
   ```
   v18.x.x (or v20.x.x)
   9.x.x (or 10.x.x)
   ```

---

## 🗄️ Phase 2: Database Setup (PostgreSQL with PostGIS)
*Estimated Time: 45 minutes*

### **Why This Is Critical:**
SafeShipper requires PostgreSQL with PostGIS extension for location-based logistics features. This is currently broken and preventing core functionality.

### **Step 1: Install PostgreSQL**

**Windows:**
1. Go to https://www.postgresql.org/download/windows/
2. Download the installer (version 15 or 16)
3. **During installation, remember these settings:**
   - Port: `5432` (default)
   - Username: `postgres`
   - **Password:** Choose a secure password and **WRITE IT DOWN**
4. **Install Stack Builder** when prompted
5. In Stack Builder, install **PostGIS** extension

**Mac:**
1. Go to https://postgresapp.com/
2. Download and install Postgres.app
3. Open the app and click "Initialize"
4. Open Terminal and run:
   ```bash
   # Add to your shell profile
   echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

**Linux:**
```bash
# Install PostgreSQL and PostGIS
sudo apt update
sudo apt install postgresql postgresql-contrib postgis postgresql-15-postgis-3 -y

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Set password for postgres user
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your_secure_password';"
```

### **Step 2: Create SafeShipper Database**

**All Platforms:**
1. Open terminal/command prompt
2. Connect to PostgreSQL:
   ```bash
   # Windows/Mac
   psql -U postgres -h localhost
   
   # Linux
   sudo -u postgres psql
   ```
3. Enter your postgres password when prompted
4. **Create the database and enable PostGIS:**
   ```sql
   CREATE DATABASE safeshipper;
   \c safeshipper;
   CREATE EXTENSION postgis;
   CREATE EXTENSION postgis_topology;
   \q
   ```

### **Step 3: Verify PostGIS Installation**
```bash
psql -U postgres -d safeshipper -c "SELECT PostGIS_Version();"
```
**Expected output:** Something like `POSTGIS="3.x.x"`

---

## 🚀 Phase 3: Supporting Services Setup
*Estimated Time: 30 minutes*

### **Step 1: Install Redis**

**Windows:**
1. Download Redis from https://github.com/microsoftarchive/redis/releases
2. Download the .msi installer
3. Install with default settings
4. Redis will start automatically as a Windows service

**Mac:**
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Redis
brew install redis

# Start Redis
brew services start redis
```

**Linux:**
```bash
sudo apt update
sudo apt install redis-server -y
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### **Step 2: Verify Redis**
Open terminal and type:
```bash
redis-cli ping
```
**Expected output:** `PONG`

### **Step 3: Install Elasticsearch (Optional but Recommended)**

**All Platforms:**
1. Go to https://www.elastic.co/downloads/elasticsearch
2. Download version 8.x
3. Extract to a folder (e.g., `C:\elasticsearch` or `/opt/elasticsearch`)
4. **Start Elasticsearch:**
   
   **Windows:**
   ```cmd
   cd C:\elasticsearch\bin
   elasticsearch.bat
   ```
   
   **Mac/Linux:**
   ```bash
   cd /path/to/elasticsearch/bin
   ./elasticsearch
   ```

5. **Verify:** Open browser and go to `http://localhost:9200`
6. **Expected:** JSON response with cluster information

---

## 🔑 Phase 4: API Keys Configuration
*Estimated Time: 30 minutes*

### **Step 1: Get Google Maps API Key**

1. Go to https://console.cloud.google.com/
2. **Create a new project** or select existing one
3. **Enable APIs:**
   - Go to "APIs & Services" → "Library"
   - Search and enable: "Maps JavaScript API"
   - Search and enable: "Geocoding API"
   - Search and enable: "Places API"
4. **Create API Key:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - **Copy the API key** (starts with `AIza...`)
5. **Restrict the API Key:**
   - Click on your API key
   - Under "API restrictions", select "Restrict key"
   - Choose the 3 APIs you enabled above

**⚠️ WARNING:** Never share your API key publicly or commit it to version control.

### **Step 2: Get OpenAI API Key**

1. Go to https://platform.openai.com/api-keys
2. **Sign up** or **log in** to your OpenAI account
3. Click "Create new secret key"
4. **Name it:** "SafeShipper SDS Processing"
5. **Copy the key** (starts with `sk-proj-...`)
6. **Add billing information** in your OpenAI account settings

**💰 Cost Estimate:** ~$10-50/month for typical usage

### **Step 3: Update Environment Configuration**

1. **Navigate to your SafeShipper folder**
2. **Open the `backend` folder**
3. **Find the `.env` file** (may be hidden)
4. **Open `.env` in a text editor** (Notepad++ on Windows, TextEdit on Mac)
5. **Update these lines:**
   ```env
   # Replace with your actual password from PostgreSQL setup
   DB_PASSWORD=your_actual_postgres_password_here
   
   # Replace with your Google Maps API key
   GOOGLE_MAPS_API_KEY=AIza_your_actual_google_maps_key_here
   
   # Replace with your OpenAI API key
   OPENAI_API_KEY=sk-proj-your_actual_openai_key_here
   
   # Generate a new Django secret key
   SECRET_KEY=your-new-secret-key-generate-this-below
   ```

### **Step 4: Generate Django Secret Key**

1. **Open terminal/command prompt**
2. **Navigate to SafeShipper backend folder:**
   ```bash
   cd /path/to/SafeShipper-python/backend
   ```
3. **Generate secret key:**
   ```bash
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```
4. **Copy the output** and paste it as your `SECRET_KEY` in `.env`

---

## 🐍 Phase 5: Python Environment Setup
*Estimated Time: 1 hour*

### **Step 1: Install GDAL (Critical for GIS features)**

**Windows:**
1. Download OSGeo4W from https://trac.osgeo.org/osgeo4w/
2. Choose "Express Install"
3. Select "GDAL" package
4. **Add to environment variables:**
   - Open System Properties → Advanced → Environment Variables
   - Add to PATH: `C:\OSGeo4W64\bin`
   - Create new variable: `GDAL_DATA = C:\OSGeo4W64\share\gdal`

**Mac:**
```bash
brew install gdal
```

**Linux:**
```bash
sudo apt update
sudo apt install gdal-bin libgdal-dev -y
```

### **Step 2: Verify GDAL Installation**
```bash
gdalinfo --version
```
**Expected output:** `GDAL 3.x.x`

### **Step 3: Create Python Virtual Environment**

1. **Navigate to SafeShipper backend folder:**
   ```bash
   cd /path/to/SafeShipper-python/backend
   ```

2. **Create virtual environment:**
   ```bash
   # Windows
   python -m venv venv
   
   # Mac/Linux
   python3.11 -m venv venv
   ```

3. **Activate virtual environment:**
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Mac/Linux
   source venv/bin/activate
   ```

4. **Verify activation:** Your command prompt should show `(venv)` at the beginning

### **Step 4: Install Python Dependencies**

**⚠️ IMPORTANT:** Make sure your virtual environment is activated (you see `(venv)`)

```bash
# Upgrade pip first
pip install --upgrade pip

# Install GDAL first (critical step)
pip install GDAL==$(gdalinfo --version | cut -d' ' -f2 | cut -d',' -f1)

# Install all other dependencies
pip install -r requirements.txt

# Install additional dependencies for production
pip install psycopg2-binary celery redis elasticsearch-dsl
```

**If you get errors:** Try these alternative commands:
```bash
# Windows alternative
pip install pipwin
pipwin install gdal

# Mac alternative  
pip install --global-option=build_ext --global-option="-I/usr/local/include" --global-option="-L/usr/local/lib" GDAL

# Linux alternative
pip install GDAL==$(gdal-config --version)
```

---

## 🗃️ Phase 6: Database Migration & Setup
*Estimated Time: 30 minutes*

### **Step 1: Update Django Settings**

1. **Open:** `backend/safeshipper_core/settings.py`
2. **Find line 35:** `# 'django.contrib.gis',  # Temporarily disabled due to GDAL dependency`
3. **Change to:** `'django.contrib.gis',`
4. **Find line 62:** `# 'vehicles',  # Temporarily disabled due to GIS dependencies`
5. **Change to:** `'vehicles',`
6. **Find line 67:** `# 'iot_devices',  # Temporarily disabled due to GIS dependencies`
7. **Change to:** `'iot_devices',`
8. **Find line 82:** `# 'emergency_procedures', # Temporarily disabled due to GIS dependencies`
9. **Change to:** `'emergency_procedures',`

### **Step 2: Run Database Migrations**

**⚠️ CRITICAL:** Ensure your virtual environment is activated and PostgreSQL is running!

```bash
# Navigate to backend folder
cd /path/to/SafeShipper-python/backend

# Activate virtual environment if not already active
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser account
python manage.py createsuperuser
```

**When creating superuser:**
- **Username:** admin
- **Email:** your-email@example.com
- **Password:** Choose a secure password and remember it!

### **Step 3: Load Initial Data**

```bash
# Load dangerous goods data
python manage.py import_dg_data

# Set up API gateway
python manage.py setup_api_gateway

# Load sample data (optional but recommended)
python manage.py loaddata fixtures/sample_data.json
```

**Expected output:** Various "Created" messages without errors

---

## 🌐 Phase 7: Frontend Setup
*Estimated Time: 30 minutes*

### **Step 1: Install Frontend Dependencies**

1. **Open new terminal/command prompt**
2. **Navigate to frontend folder:**
   ```bash
   cd /path/to/SafeShipper-python/frontend
   ```
3. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

**Note:** The `--legacy-peer-deps` flag resolves version conflicts

### **Step 2: Configure Frontend Environment**

1. **In the frontend folder, find:** `.env.example`
2. **Copy it to:** `.env.local`
3. **Edit `.env.local`:**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### **Step 3: Build Frontend**

```bash
npm run build
```

**Expected:** Build completes without errors (warnings are OK)

---

## 🧪 Phase 8: System Integration Testing
*Estimated Time: 45 minutes*

### **Step 1: Start All Services**

You'll need **4 terminal windows** open:

**Terminal 1 - Backend:**
```bash
cd /path/to/SafeShipper-python/backend
# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd /path/to/SafeShipper-python/frontend
npm run dev
```

**Terminal 3 - Celery Worker:**
```bash
cd /path/to/SafeShipper-python/backend
# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows
celery -A safeshipper_core worker --loglevel=info
```

**Terminal 4 - Celery Beat (Scheduler):**
```bash
cd /path/to/SafeShipper-python/backend
# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows
celery -A safeshipper_core beat --loglevel=info
```

### **Step 2: Verify Services Are Running**

**Check these URLs in your browser:**

1. **Backend API:** http://localhost:8000/admin/
   - **Expected:** Django admin login page
   - **Login with:** Your superuser credentials

2. **API Documentation:** http://localhost:8000/api/docs/
   - **Expected:** Swagger API documentation

3. **Frontend:** http://localhost:3000
   - **Expected:** SafeShipper login page

4. **Health Check:** http://localhost:8000/api/v1/shared/health/
   - **Expected:** JSON with all services showing "healthy"

### **Step 3: Complete Functionality Test**

1. **Login to frontend** at http://localhost:3000
2. **Navigate to Dashboard** 
3. **Check these sections work:**
   - [ ] Dashboard loads without errors
   - [ ] Shipments page displays
   - [ ] Fleet management shows vehicles
   - [ ] Maps display correctly (Google Maps)
   - [ ] Dangerous goods lookup works
   - [ ] SDS search functions (OpenAI integration)

---

## ✅ Phase 9: Final Verification Checklist

Run through this checklist to confirm SafeShipper is trial-ready:

### **Infrastructure Checks:**
- [ ] PostgreSQL running with PostGIS enabled
- [ ] Redis responding to ping
- [ ] Elasticsearch accessible (if installed)
- [ ] All Python dependencies installed
- [ ] GDAL properly configured

### **Application Checks:**
- [ ] Django backend starts without errors
- [ ] All database migrations completed
- [ ] Superuser account created
- [ ] Frontend builds and starts successfully
- [ ] Celery worker and beat running

### **API Integration Checks:**
- [ ] Google Maps API key working
- [ ] OpenAI API key configured
- [ ] Health check endpoint returns all green
- [ ] Admin panel accessible
- [ ] API documentation loads

### **Feature Functionality Checks:**
- [ ] User can log in/out
- [ ] Dashboard displays data
- [ ] Maps load and display locations
- [ ] Shipment creation works
- [ ] Dangerous goods lookup functions
- [ ] SDS processing works
- [ ] PDF generation works
- [ ] Fleet tracking displays

---

## 🚨 Troubleshooting Guide

### **Common Issue 1: "GDAL Not Found" Error**

**Symptoms:** Import errors mentioning GDAL or GIS
**Solution:**
```bash
# Verify GDAL is installed
gdalinfo --version

# If not found, reinstall GDAL
# Windows: Reinstall OSGeo4W
# Mac: brew reinstall gdal
# Linux: sudo apt install --reinstall gdal-bin libgdal-dev

# Reinstall Python GDAL binding
pip uninstall GDAL
pip install GDAL==$(gdalinfo --version | cut -d' ' -f2 | cut -d',' -f1)
```

### **Common Issue 2: Database Connection Errors**

**Symptoms:** "Could not connect to server" or authentication errors
**Solution:**
1. **Check PostgreSQL is running:**
   ```bash
   # Windows: Check Services
   # Mac: Open Postgres.app
   # Linux: sudo systemctl status postgresql
   ```
2. **Verify database exists:**
   ```bash
   psql -U postgres -l
   ```
3. **Check password in .env file matches PostgreSQL password**

### **Common Issue 3: Frontend Won't Start**

**Symptoms:** npm run dev fails or shows errors
**Solution:**
```bash
# Clear node modules and reinstall
rm -rf node_modules
rm package-lock.json
npm install --legacy-peer-deps

# If still fails, check Node.js version
node --version  # Should be v18 or v20
```

### **Common Issue 4: API Keys Not Working**

**Symptoms:** Maps don't load, OpenAI features fail
**Solution:**
1. **Verify API keys in .env:**
   ```bash
   # Check .env file has correct format
   grep -E "(GOOGLE_MAPS_API_KEY|OPENAI_API_KEY)" .env
   ```
2. **Restart Django server** after changing .env
3. **Check API quotas** in Google Cloud Console and OpenAI dashboard

### **Common Issue 5: Celery Won't Start**

**Symptoms:** Background tasks not running
**Solution:**
```bash
# Check Redis is running
redis-cli ping

# Verify Celery configuration
celery -A safeshipper_core inspect stats

# If fails, restart Redis and try again
```

---

## 📞 Getting Help

If you encounter issues not covered in this guide:

1. **Check log files** in the backend folder for error messages
2. **Search the error message** on Google or Stack Overflow
3. **Create a support ticket** with:
   - Your operating system
   - Exact error message
   - Which step you were on
   - Screenshots if relevant

---

## 🎉 Congratulations!

If you've completed all steps successfully, SafeShipper is now **trial-ready** and functional at approximately **95%** capacity. You now have:

- ✅ **Fully functional GIS/location features**
- ✅ **Working dangerous goods compliance system**
- ✅ **Real-time fleet tracking and monitoring**
- ✅ **Emergency response procedures**
- ✅ **All 12 integrated modules operational**
- ✅ **Production-grade infrastructure**

### **Next Steps for Company Trial:**

1. **Create demo data** for your specific use case
2. **Customize branding** and company information
3. **Set up user accounts** for trial participants
4. **Configure notification settings**
5. **Prepare training materials** for end users

SafeShipper is now ready for a comprehensive company trial with full dangerous goods logistics functionality!

---

## 📚 Additional Resources

- **Django Documentation:** https://docs.djangoproject.com/
- **Next.js Documentation:** https://nextjs.org/docs
- **PostgreSQL PostGIS:** https://postgis.net/documentation/
- **Google Maps API:** https://developers.google.com/maps/documentation
- **OpenAI API:** https://platform.openai.com/docs

---

*Last Updated: January 2025*  
*Guide Version: 1.0*  
*Estimated Setup Time: 6-8 hours*