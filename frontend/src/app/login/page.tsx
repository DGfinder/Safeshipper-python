'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login attempt:', { email, password, rememberMe });
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
            <div className="flex flex-row items-center p-0 gap-2.5 w-[400px] h-12">
              <Image
                src="/logo.svg"
                alt="Safeshipper Logo"
                width={400}
                height={48}
                className="w-full h-12"
              />
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

              {/* Form */}
              <form className="flex flex-col items-start p-0 gap-4 w-full h-[232px]" onSubmit={handleSubmit}>
                
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
                    <div className="w-full h-[38px] bg-white border border-[#F4F4F4] rounded-md">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-[38px] px-3.5 py-1.5 font-poppins font-normal text-[15px] leading-6 border-none outline-none rounded-md placeholder-gray-400"
                        placeholder="Enter your email"
                      />
                    </div>
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
                    <div className="w-full h-[38px] bg-white border border-[#F4F4F4] rounded-md">
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-[38px] px-3.5 py-1.5 font-poppins font-normal text-[15px] leading-6 border-none outline-none rounded-md placeholder-gray-400"
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>
                </div>

                {/* Checkbox */}
                <div className="flex flex-row items-center p-0 gap-1.5 w-[134px] h-[22px]">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-[18px] h-[18px] rounded border-2 border-gray-300 text-[#153F9F] focus:ring-[#153F9F]"
                  />
                  <label 
                    htmlFor="remember-me" 
                    className="w-[110px] h-[22px] font-poppins font-normal text-[15px] leading-[22px] flex items-center text-gray-700"
                  >
                    Remember Me
                  </label>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  className="flex flex-row justify-center items-center p-0 w-full h-[38px] bg-[#153F9F] rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#153F9F] transition-all duration-200"
                  style={{ boxShadow: '0px 2px 4px rgba(165, 163, 174, 0.3)' }}
                >
                  <div className="flex flex-row justify-center items-center py-2.5 px-5 gap-3 w-[94px] h-[38px]">
                    <span className="w-[54px] h-[18px] font-poppins font-medium text-[15px] leading-[18px] flex items-center text-white tracking-[0.43px]">
                      Sign in
                    </span>
                  </div>
                </button>
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