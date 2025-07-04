'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/stores/auth-store';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      setError('Invalid email or password. Please try again.');
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

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Form */}
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