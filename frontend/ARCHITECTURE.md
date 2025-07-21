# SafeShipper Frontend Architecture

## Overview

This document outlines the architectural design and file structure of the SafeShipper frontend application. The architecture follows modern React best practices with a feature-first approach, ensuring scalability, maintainability, and developer experience.

## 🏗️ Architecture Principles

### 1. Feature-First Organization
- **Domain-Driven Design**: Each feature is a self-contained module with its own components, hooks, services, and types
- **Separation of Concerns**: Clear boundaries between features and shared functionality
- **Scalability**: Easy to add new features without affecting existing ones

### 2. Shared Resources
- **Reusable Components**: UI components, layouts, and common functionality
- **Consistent Patterns**: Standardized hooks, services, and utilities
- **Type Safety**: Comprehensive TypeScript coverage with shared types

### 3. Clean Import Strategy
- **Barrel Exports**: Index files for clean import statements
- **Path Aliases**: Configured TypeScript paths for better developer experience
- **Dependency Management**: Clear separation of internal and external dependencies

## 📁 File Structure

```
src/
├── app/                          # Next.js App Router (routes only)
│   ├── (dashboard)/             # Route groups
│   ├── api/                     # API routes
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   ├── loading.tsx              # Loading UI
│   ├── not-found.tsx            # 404 page
│   └── providers.tsx            # Context providers
│
├── features/                     # Feature modules
│   ├── analytics/               # Analytics & reporting
│   ├── auth/                    # Authentication
│   ├── customer-portal/         # Customer-facing features
│   ├── dashboard/               # Dashboard functionality
│   ├── dangerous-goods/         # DG management
│   ├── developer/               # Developer tools
│   ├── erp-integration/         # ERP connectors
│   ├── fleet/                   # Fleet management
│   ├── manifests/               # Manifest handling
│   ├── operations/              # Operations management
│   ├── sds/                     # Safety Data Sheets
│   ├── shipments/               # Shipment tracking
│   ├── users/                   # User management
│   └── index.ts                 # Feature barrel exports
│
├── shared/                       # Shared resources
│   ├── components/              # Reusable components
│   │   ├── ui/                  # Base UI components
│   │   ├── layout/              # Layout components
│   │   ├── forms/               # Form components
│   │   ├── charts/              # Chart components
│   │   ├── maps/                # Map components
│   │   └── common/              # Common components
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # API services & contexts
│   ├── stores/                  # Global state management
│   ├── types/                   # TypeScript definitions
│   ├── utils/                   # utility functions
│   └── index.ts                 # Shared barrel exports
│
├── assets/                       # Static assets
│   ├── icons/                   # Icon files
│   ├── images/                  # Image assets
│   └── fonts/                   # Font files
│
└── styles/                       # Styling
    ├── globals.css              # Global styles
    ├── components.css           # Component styles
    └── design-tokens.ts         # Design system tokens
```

## 🎯 Feature Module Structure

Each feature module follows a consistent structure:

```
features/[feature-name]/
├── components/                   # Feature-specific components
│   ├── [ComponentName].tsx      # Component files
│   └── index.ts                 # Component exports
├── hooks/                       # Feature-specific hooks
│   ├── use-[hook-name].ts       # Hook files
│   └── index.ts                 # Hook exports
├── services/                    # Feature API services
│   ├── [feature]-service.ts     # Service files
│   └── index.ts                 # Service exports
├── stores/                      # Feature state management
│   ├── [feature]-store.ts       # Store files
│   └── index.ts                 # Store exports
├── types/                       # Feature type definitions
│   ├── [feature]-types.ts       # Type files
│   └── index.ts                 # Type exports
├── utils/                       # Feature utilities
│   ├── [feature]-utils.ts       # Utility files
│   └── index.ts                 # Utility exports
└── index.ts                     # Feature barrel export
```

## 🔧 TypeScript Configuration

### Path Aliases

```typescript
{
  "paths": {
    "@/*": ["./src/*"],
    "@/features/*": ["./src/features/*"],
    "@/shared/*": ["./src/shared/*"],
    "@/components/*": ["./src/shared/components/*"],
    "@/hooks/*": ["./src/shared/hooks/*"],
    "@/services/*": ["./src/shared/services/*"],
    "@/utils/*": ["./src/shared/utils/*"],
    "@/types/*": ["./src/shared/types/*"],
    "@/stores/*": ["./src/shared/stores/*"]
  }
}
```

### Import Examples

```typescript
// Feature imports
import { AnalyticsService } from '@/features/analytics';
import { useAuth } from '@/features/auth';

// Shared imports
import { Button, Card } from '@/components/ui';
import { useDebounce } from '@/hooks';
import { ApiService } from '@/services';
import { User } from '@/types';

// Clean feature imports
import { 
  AnalyticsInsight, 
  useAnalyticsFilters, 
  AnalyticsService 
} from '@/features/analytics';
```

## 🎨 Design System Integration

### Component Hierarchy

```
shared/components/
├── ui/                          # Base design system components
│   ├── Button/                  # Button variations
│   ├── Card/                    # Card components
│   ├── Form/                    # Form components
│   └── ...                      # Other UI components
├── layout/                      # Layout components
│   ├── DashboardLayout/         # Dashboard wrapper
│   ├── Sidebar/                 # Navigation sidebar
│   └── Header/                  # Page headers
├── forms/                       # Form-specific components
│   ├── FormField/               # Form field wrapper
│   ├── FormValidation/          # Validation components
│   └── FormWizard/              # Multi-step forms
└── charts/                      # Data visualization
    ├── AnalyticsChart/          # Analytics charts
    ├── MetricsDisplay/          # Metrics components
    └── DataTable/               # Data tables
```

## 🔄 State Management

### Global State (Zustand)

```typescript
// Shared stores for global state
shared/stores/
├── auth-store.ts                # Authentication state
├── theme-store.ts               # Theme preferences
├── notification-store.ts        # Notifications
└── user-store.ts                # User profile
```

### Feature State

```typescript
// Feature-specific state management
features/analytics/stores/
├── analytics-store.ts           # Analytics data
├── filters-store.ts             # Filter state
└── insights-store.ts            # Insights data
```

## 🚀 Performance Optimizations

### Server-Side Rendering (SSR)

SafeShipper leverages Next.js 14's App Router with React Server Components for optimal performance:

```typescript
// Server-side API client with caching
export const serverApi = {
  getDashboardStats: cache(async () => {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/stats/`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });
    return await response.json();
  }),
};

// Server component with data fetching
async function ServerDashboard() {
  const stats = await serverApi.getDashboardStats();
  return <Dashboard stats={stats} />;
}
```

**Benefits**:
- **Sub-2s page loads**: Critical data rendered on server
- **SEO optimization**: Fully rendered HTML for search engines  
- **Reduced hydration**: Smaller client-side JavaScript bundles
- **Automatic caching**: React cache() prevents duplicate requests

### Advanced Caching Strategy

#### Three-Layer Caching Architecture

1. **Server-Side Caching (React cache())**
```typescript
// Automatic request deduplication
const getDashboardStats = cache(async () => {
  return await fetch(API_URL, { next: { revalidate: 60 } });
});
```

2. **HTTP Caching (CDN + Headers)**
```javascript
// next.config.js
async headers() {
  return [
    {
      source: "/api/(.*)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, s-maxage=60, stale-while-revalidate=300",
        },
      ],
    },
  ];
}
```

3. **Client-Side Caching (Memory + Storage)**
```typescript
// Intelligent memory cache with LRU eviction
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    // LRU eviction when cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }
}
```

### Code Splitting & Bundle Optimization

- **Route-based splitting**: Automatic with Next.js App Router
- **Feature-based splitting**: Lazy loading of feature modules
- **Component-based splitting**: Dynamic imports for heavy components
- **Tree shaking**: Enabled through ES modules and barrel exports
- **Dead code elimination**: Automatic with modern bundlers
- **Bundle analysis**: Regular monitoring of bundle sizes

#### Dynamic Imports for Heavy Components
```typescript
// Lazy load expensive 3D components
const LoadPlanner3D = dynamic(() => import('./LoadPlanner3D'), {
  loading: () => <LoadPlannerSkeleton />,
  ssr: false // Client-side only for WebGL
});

// Code splitting with Suspense
<Suspense fallback={<ChartSkeleton />}>
  <AnalyticsChart />
</Suspense>
```

### Performance Monitoring

```typescript
// Real-time Web Vitals tracking
export const performanceMonitor = new PerformanceMonitor();

// Track component load times
export function usePerformanceMonitoring(componentName: string) {
  const startTime = performance.now();
  
  return {
    loadTime: performance.now() - startTime,
    reportComponentLoad: () => {
      const loadTime = performance.now() - startTime;
      console.debug(`${componentName} loaded in ${loadTime.toFixed(2)}ms`);
    }
  };
}

// Automatic reporting to analytics
export function reportWebVitals(metric: any) {
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      body: JSON.stringify(metric),
    });
  }
}
```

## 🧪 Testing Strategy

### Test Organization

```
__tests__/
├── features/                    # Feature tests
│   ├── analytics/              # Analytics tests
│   └── auth/                   # Auth tests
├── shared/                     # Shared component tests
│   ├── components/             # Component tests
│   └── hooks/                  # Hook tests
└── integration/                # Integration tests
```

### Testing Patterns

- **Unit tests**: Individual functions and components
- **Integration tests**: Feature workflows
- **E2E tests**: Critical user journeys
- **Performance tests**: Core Web Vitals monitoring

## 📚 Documentation Standards

### Code Documentation

- **JSDoc comments**: All public functions and components
- **Type definitions**: Comprehensive TypeScript coverage
- **README files**: Feature-specific documentation
- **Architecture decisions**: ADR (Architecture Decision Records)

### API Documentation

- **OpenAPI specs**: API endpoint documentation
- **Type generation**: Automatic TypeScript types from API
- **Usage examples**: Real-world implementation examples

## 🔍 Development Guidelines

### Component Guidelines

1. **Single Responsibility**: Each component has one clear purpose
2. **Composition**: Prefer composition over inheritance
3. **Props Interface**: Clear and documented prop interfaces
4. **Accessibility**: WCAG 2.1 AA compliance
5. **Performance**: Optimized rendering and memory usage

### Hook Guidelines

1. **Custom Hooks**: Encapsulate complex logic
2. **Dependency Arrays**: Proper dependency management
3. **Error Handling**: Comprehensive error boundaries
4. **Testing**: Unit tests for all custom hooks

### Service Guidelines

1. **API Abstraction**: Clean API service layer
2. **Error Handling**: Consistent error responses
3. **Caching**: Appropriate caching strategies
4. **Type Safety**: Full TypeScript coverage

## 🚦 Quality Assurance

### Code Quality

- **ESLint**: Consistent code style
- **Prettier**: Code formatting
- **TypeScript**: Type safety
- **Husky**: Git hooks for quality checks

### Performance Monitoring

- **Core Web Vitals**: Performance metrics
- **Bundle Analysis**: Size monitoring
- **Error Tracking**: Runtime error monitoring
- **Analytics**: User behavior tracking

## 🛡️ Error Handling & Recovery

### Comprehensive Error Boundaries

```typescript
// Global error boundary with recovery options
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo, this.state.errorId);
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} errorId={this.state.errorId} />;
    }
    return this.props.children;
  }
}
```

### Centralized Error Management

```typescript
// Error handler with categorization and user-friendly messages
class ErrorHandler {
  createError(type: ErrorType, message: string, options: ErrorOptions): AppError {
    const appError: AppError = {
      id: generateErrorId(),
      type,
      message,
      userMessage: this.getDefaultUserMessage(type, options.severity),
      retryable: options.retryable || false,
      context: options.context,
      timestamp: new Date().toISOString(),
    };
    
    this.reportError(appError);
    return appError;
  }

  private getDefaultUserMessage(type: ErrorType, severity: ErrorSeverity): string {
    // Context-aware error messages for different scenarios
    const messageMap = {
      [ErrorType.NETWORK]: {
        [ErrorSeverity.HIGH]: 'Network error occurred. Please try again.',
        [ErrorSeverity.MEDIUM]: 'Connection is slow. Please wait...',
      },
      // ... more error types
    };
    
    return messageMap[type]?.[severity] || 'An error occurred. Please try again.';
  }
}
```

### API Error Handling with Retry Logic

```typescript
// Intelligent retry with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) throw error;
      
      // Check if error is retryable
      const appError = handleApiError(error);
      if (!appError.retryable) throw error;

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

## 🔧 Build & Deployment

### Development

```bash
npm run dev              # Development server with SSR
npm run build            # Production build with optimizations
npm run start            # Production server
npm run test             # Run tests with coverage
npm run lint             # ESLint code analysis
npm run type-check       # TypeScript checking
npm run analyze          # Bundle size analysis
npm run lighthouse       # Performance audit
```

### Production Optimizations

- **Server-Side Rendering**: React 18 SSR with streaming
- **Multi-stage Docker builds**: Optimized container images
- **Advanced caching**: Three-layer caching strategy
- **Bundle optimization**: Tree shaking and code splitting
- **Edge deployment**: CDN integration with caching headers
- **Error monitoring**: Comprehensive error boundaries and reporting
- **Performance tracking**: Real-time Web Vitals monitoring
- **Security headers**: CSP, HSTS, and security middleware

### Docker Production Build

```dockerfile
# Multi-stage build for optimal production images
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

## 📈 Scalability Considerations

### Team Collaboration

- **Feature Teams**: Independent feature development
- **Shared Standards**: Consistent patterns across features
- **Code Reviews**: Quality and knowledge sharing
- **Documentation**: Up-to-date architectural documentation

### Future Expansion

- **Micro-frontends**: Ready for module federation
- **API Evolution**: Versioned API support
- **Internationalization**: Multi-language support
- **Mobile Support**: Progressive Web App capabilities

---

## 🎯 Benefits of This Architecture

### Developer Experience
- **Clear Structure**: Easy to navigate and understand
- **Type Safety**: Comprehensive TypeScript coverage
- **Modern Tooling**: Latest React and Next.js features
- **Fast Development**: Hot reloading and efficient builds

### Maintainability
- **Separation of Concerns**: Clear boundaries between features
- **Code Reusability**: Shared components and utilities
- **Consistent Patterns**: Standardized approaches
- **Easy Testing**: Isolated and testable components

### Performance
- **Code Splitting**: Optimized bundle sizes
- **Tree Shaking**: Unused code elimination
- **Caching**: Efficient data and asset caching
- **Edge Deployment**: Fast global delivery

### Scalability
- **Feature Independence**: Parallel development
- **Team Collaboration**: Clear ownership boundaries
- **Future-Proof**: Ready for growth and evolution
- **Technology Agnostic**: Easy to migrate or upgrade

This architecture provides a solid foundation for the SafeShipper application, ensuring it can grow and evolve while maintaining high code quality and developer productivity.