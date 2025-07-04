'use client';

export default function UsersPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <div style={{ display: 'flex' }}>
        {/* Simple Sidebar */}
        <div style={{ width: '260px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: '100vh' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
              SafeShipper
            </div>
          </div>
          
          <nav style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', borderRadius: '0.375rem', textDecoration: 'none', color: '#6b7280' }}>
                <span>🏠</span>
                <span>Dashboard</span>
              </a>
              <a href="/users" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', borderRadius: '0.375rem', textDecoration: 'none', backgroundColor: '#3b82f6', color: 'white' }}>
                <span>👥</span>
                <span>Users</span>
              </a>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
              User Management
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              Manage system users, roles, and permissions.
            </p>
            
            {/* Simple Users Table */}
            <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#f3f4f6', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#374151' }}>Users</h3>
              </div>
              <div style={{ padding: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.875rem' }}>Username</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.875rem' }}>Email</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.875rem' }}>Role</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.875rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>john.doe</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>john@example.com</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Driver</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem' }}>
                          Active
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>jane.smith</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>jane@example.com</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Dispatcher</td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem' }}>
                          Active
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.75rem' }}>admin.user</td>
                      <td style={{ padding: '0.75rem' }}>admin@example.com</td>
                      <td style={{ padding: '0.75rem' }}>Admin</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem' }}>
                          Active
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
