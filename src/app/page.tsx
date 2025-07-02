export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#333', marginBottom: '1rem' }}>
          SafeShipper
        </h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Dangerous Goods Transportation Management System
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <a href="/login" style={{ 
            backgroundColor: '#153F9F', 
            color: 'white', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: '500'
          }}>
            Login
          </a>
          <a href="/dashboard" style={{ 
            backgroundColor: '#6b7280', 
            color: 'white', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: '500'
          }}>
            Dashboard
          </a>
        </div>
        <div style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#666' }}>
          Demo Login: demo@safeshipper.com / demo123
        </div>
      </div>
    </div>
  )
} 