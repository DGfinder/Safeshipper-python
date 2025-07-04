import Link from 'next/link'

const navigationItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/users', label: 'Users' },
  { href: '/shipments', label: 'Shipments' },
  { href: '/fleet', label: 'Fleet' },
  { href: '/dg-compliance', label: 'DG Compliance' },
  { href: '/customers', label: 'Customers' },
  { href: '/safety', label: 'Safety' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
]

export default function Navigation() {
  return (
    <nav style={{ 
      backgroundColor: '#1f2937', 
      color: 'white', 
      padding: '1rem 0',
      borderBottom: '1px solid #374151'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '0 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold',
          color: '#3b82f6'
        }}>
          SafeShipper
        </div>
        
        <ul style={{ 
          display: 'flex', 
          listStyle: 'none', 
          margin: 0, 
          padding: 0, 
          gap: '1.5rem'
        }}>
          {navigationItems.map((item) => (
            <li key={item.href}>
              <Link 
                href={item.href}
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  transition: 'background-color 0.2s'
                }}
                                 onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                   e.currentTarget.style.backgroundColor = '#374151'
                 }}
                 onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                   e.currentTarget.style.backgroundColor = 'transparent'
                 }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}