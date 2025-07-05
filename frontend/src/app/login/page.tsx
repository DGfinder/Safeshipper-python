'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/stores/auth-store';
import { MFAVerification } from '@/components/mfa/MFAVerification';
import { Shield, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithMFA, isLoading, requiresMFA, tempToken, availableMFAMethods, clearMFAState } = useAuthStore();

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      setSuccessMessage(message);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const result = await login(email, password);
      if (!result.requiresMFA) {
        router.push('/dashboard');
      }
      // If MFA is required, the component will show MFA verification
    } catch (error: any) {
      setError(error.message || 'Invalid email or password. Please try again.');
    }
  };

  const handleMFASuccess = (tokens: { access_token: string; refresh_token: string; user: any }) => {
    router.push('/dashboard');
  };

  const handleMFACancel = () => {
    clearMFAState();
    setError('');
  };

  const handleSSOLogin = async (provider: string) => {
    setError('');
    
    try {
      if (provider === 'google') {
        // Redirect to Google OAuth
        window.location.href = '/api/v1/auth/sso/google/';
      } else if (provider === 'microsoft') {
        // Redirect to Microsoft OAuth
        window.location.href = '/api/v1/auth/sso/microsoft/';
      } else if (provider === 'enterprise') {
        // For enterprise SSO, we might want to show a domain input first
        const domain = prompt('Enter your company domain (e.g., company.com):');
        if (domain) {
          window.location.href = `/api/v1/auth/sso/providers/?domain=${domain}`;
        }
      }
    } catch (error) {
      setError('SSO login failed. Please try again.');
    }
  };

  return (
    <div className="relative w-full h-screen bg-white">
      {/* Container */}
      <div className="absolute left-0 right-0 top-0 bottom-0 flex flex-col items-start p-0">
        {/* Body */}
        <div className="w-full h-full flex flex-row items-start pl-8 pr-0 py-8">
          
          {/* Left Container - Illustration */}
          <div 
            className="hidden lg:flex flex-col justify-end items-center p-0 gap-6 flex-1 h-full rounded-[20px] relative overflow-hidden"
            style={{ background: '#F8F7FA' }}
          >
            {/* Login Illustration */}
            <div
              className="absolute w-[795px] h-[1293px] -left-16 -top-26 z-10"
              style={{
                backgroundImage: "url('/login-illustration.png')",
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                transform: 'scaleX(-1)', // flip horizontally as per design
              }}
            />
          </div>

          {/* Right Container - Form */}
          <div className="w-full lg:w-[700px] h-full flex flex-col justify-center items-center p-0 gap-6 bg-white">
            
            {/* Logo */}
            <div className="flex items-center justify-center space-x-2 w-[400px] h-12">
              <Shield className="h-8 w-8 text-[#153F9F]" />
              <span className="text-2xl font-bold text-[#153F9F]">SafeShipper</span>
            </div>

            {/* Form Section */}
            <div className="flex flex-col items-start p-0 gap-6 w-[400px]">
              
              {/* Heading Text */}
              <div className="flex flex-col items-start p-0 gap-1.5 w-full h-[86px]">
                <h2 
                  className="w-full h-9 font-poppins font-bold text-[26px] leading-9 flex items-center text-black"
                >
                  Welcome to Safeshipper! 👋
                </h2>
                <p 
                  className="w-full h-11 font-poppins font-normal text-[15px] leading-[22px] flex items-center text-gray-600"
                >
                  Please sign in to your account and start the adventure
                </p>
              </div>

              {/* Success Alert */}
              {successMessage && (
                <Alert variant="success">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* MFA Verification */}
              {requiresMFA && tempToken && (
                <MFAVerification
                  tempToken={tempToken}
                  availableMethods={availableMFAMethods}
                  onVerificationSuccess={handleMFASuccess}
                  onCancel={handleMFACancel}
                  className="w-full"
                />
              )}

              {/* Form */}
              {!requiresMFA && (
              <form className="flex flex-col items-start p-0 gap-4 w-full" onSubmit={handleSubmit}>
                
                {/* Email Field */}
                <div className="flex flex-row items-start p-0 gap-4 w-full h-[62px]">
                  <div className="flex flex-col items-start p-0 gap-1 w-full h-[62px]">
                    {/* Label */}
                    <div className="flex flex-row items-start p-0 gap-1 w-full h-5">
                      <label 
                        htmlFor="email"
                        className="w-full h-5 font-poppins font-normal text-[13px] leading-5 flex items-center text-gray-700"
                      >
                        Email
                      </label>
                    </div>
                    {/* Form Input */}
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="flex flex-row items-start p-0 gap-4 w-full h-[62px]">
                  <div className="flex flex-col items-start p-0 gap-1 w-full h-[62px]">
                    {/* Label Row */}
                    <div className="flex flex-row items-start p-0 gap-1 w-full h-5">
                      <label 
                        htmlFor="password"
                        className="flex-1 h-5 font-poppins font-normal text-[13px] leading-5 flex items-center text-gray-700"
                      >
                        Password
                      </label>
                      <Link 
                        href="/forgot-password"
                        className="flex-1 h-5 font-poppins font-normal text-[13px] leading-5 flex items-center text-right text-[#153F9F] hover:text-blue-800 transition-colors"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                    {/* Form Input */}
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                {/* Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <label 
                    htmlFor="remember-me" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Remember Me
                  </label>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#153F9F] hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>
              )}

              {/* SSO Divider */}
              {!requiresMFA && (
              <div className="flex items-center gap-4 w-full">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-sm text-gray-500">or continue with</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* SSO Buttons */}
              <div className="flex flex-col gap-3 w-full">
                {/* Google SSO */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 border-gray-300 hover:bg-gray-50"
                  onClick={() => handleSSOLogin('google')}
                  disabled={isLoading}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </Button>

                {/* Microsoft SSO */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 border-gray-300 hover:bg-gray-50"
                  onClick={() => handleSSOLogin('microsoft')}
                  disabled={isLoading}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M13 1h10v10H13z"/>
                    <path fill="#05a6f0" d="M1 13h10v10H1z"/>
                    <path fill="#ffba08" d="M13 13h10v10H13z"/>
                  </svg>
                  Sign in with Microsoft
                </Button>

                {/* Enterprise SSO */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 border-gray-300 hover:bg-gray-50"
                  onClick={() => handleSSOLogin('enterprise')}
                  disabled={isLoading}
                >
                  <Shield className="w-5 h-5 text-gray-600" />
                  Enterprise SSO
                </Button>
              </div>
              )}
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="font-poppins font-normal text-[15px] leading-[22px] text-gray-600">
                New on our platform?{' '}
                <Link 
                  href="/signup" 
                  className="font-medium text-[#153F9F] hover:text-blue-800 transition-colors duration-200"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#153F9F]"></div>
    </div>}>
      <LoginForm />
    </Suspense>
  );
} 