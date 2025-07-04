// hooks/useMockAuth.ts
// Temporary mock auth hook for demo purposes

export const useMockAuth = () => {
  return {
    getToken: () => 'demo-token',
    isAuthenticated: true,
    user: {
      id: 'demo-user',
      username: 'demo@safeshipper.com',
      email: 'demo@safeshipper.com',
      role: 'DISPATCHER',
      avatar: 'DE'
    }
  };
};