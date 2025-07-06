'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For now, redirect to login after successful signup
      router.push('/login?message=Account created successfully! Please sign in.');
    } catch {
      setError('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="relative w-full h-screen bg-white">
      <div className="absolute left-0 right-0 top-0 bottom-0 flex flex-col items-start p-0">
        <div className="w-full h-full flex flex-row items-start pl-8 pr-0 py-8">
          
          {/* Left Container - Illustration */}
          <div 
            className="hidden lg:flex flex-col justify-end items-center p-0 gap-6 flex-1 h-full rounded-[20px] relative overflow-hidden"
            style={{ background: '#F8F7FA' }}
          >
            <div
              className="absolute w-[795px] h-[1293px] -left-16 -top-26 z-10"
              style={{
                backgroundImage: "url('/login-illustration.png')",
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                transform: 'scaleX(-1)',
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
              <div className="flex flex-col items-start p-0 gap-1.5 w-full">
                <h2 className="w-full font-poppins font-bold text-[26px] leading-9 flex items-center text-black">
                  Create your account
                </h2>
                <p className="w-full font-poppins font-normal text-[15px] leading-[22px] flex items-center text-gray-600">
                  Join SafeShipper and start managing your logistics safely
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
                
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="flex flex-col items-start p-0 gap-1">
                    <label htmlFor="firstName" className="font-poppins font-normal text-[13px] leading-5 text-gray-700">
                      First Name
                    </label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="flex flex-col items-start p-0 gap-1">
                    <label htmlFor="lastName" className="font-poppins font-normal text-[13px] leading-5 text-gray-700">
                      Last Name
                    </label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="flex flex-col items-start p-0 gap-1 w-full">
                  <label htmlFor="email" className="font-poppins font-normal text-[13px] leading-5 text-gray-700">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>

                {/* Password Field */}
                <div className="flex flex-col items-start p-0 gap-1 w-full">
                  <label htmlFor="password" className="font-poppins font-normal text-[13px] leading-5 text-gray-700">
                    Password
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Create a password"
                  />
                </div>

                {/* Confirm Password Field */}
                <div className="flex flex-col items-start p-0 gap-1 w-full">
                  <label htmlFor="confirmPassword" className="font-poppins font-normal text-[13px] leading-5 text-gray-700">
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Confirm your password"
                  />
                </div>

                {/* Sign Up Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#153F9F] hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="font-poppins font-normal text-[15px] leading-[22px] text-gray-600">
                Already have an account?{' '}
                <Link 
                  href="/login" 
                  className="font-medium text-[#153F9F] hover:text-blue-800 transition-colors duration-200"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}