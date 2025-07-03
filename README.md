# Safeshipper - Monorepo

A comprehensive logistics and dangerous goods management platform combining a Django REST API backend with a Next.js frontend.

## 🏗️ Project Structure

```
/
├── backend/          # Django REST API
├── frontend/         # Next.js React App
└── README.md         # This file
```

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL
- Redis (for Celery background tasks)

### Backend Setup (Django)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database and other settings
   ```

5. Run migrations:
   ```bash
   python manage.py migrate
   ```

6. Create a superuser:
   ```bash
   python manage.py createsuperuser
   ```

7. Start the development server:
   ```bash
   python manage.py runserver
   ```

The Django API will be available at `http://localhost:8000`

### Frontend Setup (Next.js)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API URL and other settings
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The Next.js app will be available at `http://localhost:3000`

## 🛠️ Development

### Running Both Services

For development, you'll typically want both the backend and frontend running simultaneously:

1. **Terminal 1** (Backend):
   ```bash
   cd backend
   .venv\Scripts\activate  # Windows
   python manage.py runserver
   ```

2. **Terminal 2** (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

### API Documentation

- Django Admin: `http://localhost:8000/admin/`
- API Documentation: `http://localhost:8000/api/docs/`
- API Schema: `http://localhost:8000/api/schema/`

## 🧪 Testing

### Backend Tests
```bash
cd backend
python manage.py test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📦 Key Features

### Backend (Django)
- **User Management**: Role-based authentication and permissions
- **Dangerous Goods**: Classification and compatibility checking
- **Load Planning**: 3D bin packing optimization
- **Tracking**: Real-time shipment and vehicle tracking
- **Capacity Marketplace**: Freight capacity trading
- **Document Management**: SDS and emergency procedure handling

### Frontend (Next.js)
- **Modern React**: TypeScript, Tailwind CSS, shadcn/ui components
- **Real-time Updates**: Live data fetching from Django API
- **Responsive Design**: Mobile-first, accessible interface
- **Dashboard Views**: Analytics and operational insights

## 🔧 Configuration

### Backend Configuration
Key settings in `backend/safeshipper_core/settings.py`:
- Database configuration
- CORS settings for frontend
- API authentication settings

### Frontend Configuration
Key settings in `frontend/next.config.js`:
- API base URL
- Build optimization
- Environment-specific settings

## 🚢 Deployment

### Backend Deployment
The Django backend can be deployed using:
- Docker containers
- Traditional WSGI servers (Gunicorn + Nginx)
- Platform-as-a-Service (Heroku, Railway, etc.)

### Frontend Deployment
The Next.js frontend can be deployed to:
- Vercel (recommended)
- Netlify
- Docker containers
- Static hosting with `npm run build && npm run export`

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes in the appropriate directory (`backend/` or `frontend/`)
3. Test your changes thoroughly
4. Submit a pull request with a clear description

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For technical support or questions:
- Create an issue in the project repository
- Contact the development team

---

**Built with ❤️ for safe and efficient logistics management** 