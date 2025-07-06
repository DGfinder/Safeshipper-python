'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Shield, Lock, User, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // For demo purposes, simulate login
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Demo credentials check
      if (formData.email === 'demo@safeshipper.com' && formData.password === 'demo123') {
        // Simulate successful login
        localStorage.setItem('auth_token', 'demo_token');
        window.location.href = '/dashboard';
      } else {
        setError('Invalid credentials. Use demo@safeshipper.com / demo123');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="relative h-12 w-12">
                <Image
                  src="/symbol.svg"
                  alt="SafeShipper Symbol"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <div className="relative h-8 w-40">
                <Image
                  src="/logo.svg"
                  alt="SafeShipper"
                  width={160}
                  height={32}
                  className="object-contain"
                />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to your SafeShipper account
            </p>
          </div>

          {/* Login Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-lg">Sign In</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email address
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-10 pr-10"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <Link
                      href="/forgot-password"
                      className="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#153F9F] hover:bg-[#1230B] text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>

                {/* Demo Credentials */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800 font-medium mb-1">Demo Credentials:</p>
                  <p className="text-xs text-blue-700">Email: demo@safeshipper.com</p>
                  <p className="text-xs text-blue-700">Password: demo123</p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              © 2024 SafeShipper. All rights reserved.
            </p>
            <div className="mt-2 flex items-center justify-center space-x-4 text-xs text-gray-400">
              <Link href="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-gray-600">Terms of Service</Link>
              <span>•</span>
              <Link href="/support" className="hover:text-gray-600">Support</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Illustration */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#153F9F] to-[#1E40AF] relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10 flex items-center justify-center w-full">
          <div className="text-center text-white px-8">
            <div className="mb-8 relative">
              <div className="relative w-96 h-96 mx-auto">
                <Image
                  src="/login-illustration.png.png"
                  alt="SafeShipper Login Illustration"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-6">
              Secure Dangerous Goods Transportation
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-md mx-auto leading-relaxed">
              Comprehensive safety management platform for hazardous materials shipping and compliance
            </p>
            <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
              <div className="flex items-center space-x-3 text-blue-100">
                <Shield className="h-5 w-5" />
                <span>Real-time Safety Monitoring</span>
              </div>
              <div className="flex items-center space-x-3 text-blue-100">
                <AlertCircle className="h-5 w-5" />
                <span>Emergency Response Planning</span>
              </div>
              <div className="flex items-center space-x-3 text-blue-100">
                <User className="h-5 w-5" />
                <span>Compliance Management</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 border border-white opacity-20 rounded-full"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 border border-white opacity-20 rounded-full"></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 border border-white opacity-20 rounded-full"></div>
      </div>
    </div>
  );
}