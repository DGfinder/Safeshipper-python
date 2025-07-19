"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import { Eye, EyeOff, AlertCircle, Users, Building, User } from "lucide-react";
import { validateDemoCredentials, validateCustomerCredentials, getAllDemoCredentials } from "@/shared/config/demo-users";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginType, setLoginType] = useState<'internal' | 'customer'>('internal');
  const { login } = useAuthStore();
  const router = useRouter();
  const demoCredentials = getAllDemoCredentials();

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

      if (loginType === 'internal') {
        // Check internal demo credentials
        const user = validateDemoCredentials(formData.email, formData.password);
        if (user) {
          // Set auth store with user data
          login({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            department: user.department,
            permissions: user.permissions,
          });
          
          // Redirect to dashboard
          router.push('/dashboard');
        } else {
          setError("Invalid credentials. Please use one of the demo accounts shown below.");
        }
      } else {
        // Check customer demo credentials
        const customerUser = validateCustomerCredentials(formData.email, formData.password);
        if (customerUser) {
          // Set auth store with customer data
          login({
            id: `customer-${customerUser.email}`,
            email: customerUser.email,
            firstName: customerUser.name.split(' ')[0],
            lastName: customerUser.name.split(' ').slice(1).join(' '),
            role: 'CUSTOMER',
            department: customerUser.category,
            permissions: ['customer_portal'],
          });
          
          // Redirect to customer portal
          router.push('/customer-portal');
        } else {
          setError("Invalid customer credentials. Please use one of the demo accounts shown below.");
        }
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (email: string, password: string) => {
    setFormData({ email, password });
    // Auto-submit after a short delay
    setTimeout(() => {
      const form = document.getElementById('login-form') as HTMLFormElement;
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 100);
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

            <form id="login-form" onSubmit={handleSubmit} className="space-y-5">
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
            <div className="mt-6">
              <Tabs value={loginType} onValueChange={(value) => setLoginType(value as 'internal' | 'customer')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="internal" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Internal Users
                  </TabsTrigger>
                  <TabsTrigger value="customer" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Customer Portal
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="internal" className="space-y-4 mt-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium mb-3">
                      Internal Demo Accounts:
                    </p>
                    <div className="space-y-3">
                      {demoCredentials.internal.map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-blue-900">{user.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {user.role}
                              </Badge>
                            </div>
                            <p className="text-xs text-blue-700 mb-1">{user.email}</p>
                            <p className="text-xs text-blue-600">{user.department}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickLogin(user.email, user.password)}
                            className="text-xs"
                          >
                            Quick Login
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="customer" className="space-y-4 mt-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium mb-3">
                      Customer Demo Accounts:
                    </p>
                    <div className="space-y-3">
                      {demoCredentials.customer.map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-100">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Building className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-900">{user.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {user.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-green-700 mb-1">{user.email}</p>
                            <p className="text-xs text-green-600">{user.description}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickLogin(user.email, user.password)}
                            className="text-xs"
                          >
                            Quick Login
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
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
