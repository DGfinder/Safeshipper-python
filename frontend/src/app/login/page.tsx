"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // For demo purposes, simulate login
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Demo credentials check
      if (
        formData.email === "demo@safeshipper.com" &&
        formData.password === "demo123"
      ) {
        // Simulate successful login
        localStorage.setItem("auth_token", "demo_token");
        window.location.href = "/dashboard";
      } else {
        setError("Invalid credentials. Use demo@safeshipper.com / demo123");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left side - Hero Image with Diagonal Cut */}
      <div className="relative flex-1 bg-gradient-to-br from-gray-100 to-gray-200">
        {/* Diagonal overlay shape */}
        <div
          className="absolute inset-0 bg-white"
          style={{
            clipPath: "polygon(0 0, 70% 0, 85% 100%, 0 100%)",
          }}
        ></div>

        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/login-illustration.png.png"
            alt="SafeShipper Fleet Management"
            fill
            className="object-cover object-center"
            style={{
              clipPath: "polygon(0 0, 70% 0, 85% 100%, 0 100%)",
            }}
          />
          {/* Overlay for better contrast */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-transparent"
            style={{
              clipPath: "polygon(0 0, 70% 0, 85% 100%, 0 100%)",
            }}
          ></div>
        </div>

        {/* Content overlay on image */}
        <div className="relative z-10 h-full flex items-end p-12">
          <div className="text-white max-w-md">
            <h1 className="text-4xl font-bold mb-4">
              Professional Fleet
              <br />
              Management
            </h1>
            <p className="text-lg text-white/90 leading-relaxed">
              Secure dangerous goods transportation with comprehensive safety
              monitoring and compliance management.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-8 sm:px-12 lg:px-16 bg-white">
        <div className="max-w-md w-full space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-8">
              <div className="relative h-10 w-10">
                <Image
                  src="/symbol.svg"
                  alt="SafeShipper Symbol"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              <span className="text-2xl font-bold text-[#153F9F]">
                SafeShipper
              </span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to SafeShipper! 👋
            </h2>
            <p className="text-gray-600">
              Please sign in to your account and start the adventure
            </p>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email or Username
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="h-12 px-4 rounded-lg border border-gray-300 focus:border-[#153F9F] focus:ring-[#153F9F]"
                  placeholder="john@doe.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="h-12 px-4 pr-12 rounded-lg border border-gray-300 focus:border-[#153F9F] focus:ring-[#153F9F]"
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-[#153F9F] focus:ring-[#153F9F] border-gray-300 rounded"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-gray-600"
                  >
                    Remember Me
                  </label>
                </div>

                <div className="text-sm">
                  <Link
                    href="/forgot-password"
                    className="font-medium text-[#153F9F] hover:text-[#1230B]"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#153F9F] hover:bg-[#1230B] text-white font-medium rounded-lg transition-colors text-base"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">
                Demo Credentials:
              </p>
              <p className="text-xs text-blue-700">
                Email: demo@safeshipper.com
              </p>
              <p className="text-xs text-blue-700">Password: demo123</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-xs text-gray-400">
              © 2024 SafeShipper. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
