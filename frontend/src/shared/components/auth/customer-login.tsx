"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { useAuthStore } from "@/shared/stores/auth-store";
import { LoadingSpinner } from "@/shared/components/ui/loading-spinner";
import { getEnvironmentConfig } from "@/shared/config/environment";
import { DemoIndicator } from "@/shared/components/ui/demo-indicator";
import {
  User,
  Lock,
  AlertCircle,
  Building2,
  Shield,
  CheckCircle,
  Mail,
  Eye,
  EyeOff,
} from "lucide-react";

interface CustomerLoginProps {
  onSuccess?: () => void;
}

export function CustomerLogin({ onSuccess }: CustomerLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuthStore();
  const config = getEnvironmentConfig();

  // Demo customer credentials for easy access
  const demoCustomers = [
    {
      name: "BHP Billiton",
      email: "logistics@bhpbilliton.com.au",
      password: "demo123",
      category: "Mining",
    },
    {
      name: "Wesfarmers Chemicals",
      email: "logistics@wesfarmerschemicals.com.au", 
      password: "demo123",
      category: "Industrial",
    },
    {
      name: "CBH Group",
      email: "logistics@cbhgroup.com.au",
      password: "demo123", 
      category: "Agricultural",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (config.apiMode === "demo") {
        // Demo mode - simulate login with demo customer
        const demoCustomer = demoCustomers.find(c => c.email === email);
        if (demoCustomer && password === "demo123") {
          // Simulate successful demo login
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const mockUser = {
            id: `customer-${demoCustomer.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            username: demoCustomer.name,
            email: demoCustomer.email,
            role: "customer", // Use lowercase for consistency
            avatar: demoCustomer.name.substring(0, 2).toUpperCase(),
          };

          // Set demo auth state
          useAuthStore.getState().setUser(mockUser);
          
          if (onSuccess) onSuccess();
          return;
        } else {
          throw new Error("Invalid demo credentials");
        }
      }

      // Real API login
      const result = await (login as any)({ email, password });
      
      if (result.requiresMFA) {
        // Handle MFA flow if needed
        setError("MFA required - please contact support for customer portal access");
        return;
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (customer: typeof demoCustomers[0]) => {
    setEmail(customer.email);
    setPassword(customer.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6">
        {/* Demo Indicator */}
        {(config.apiMode === "demo" || config.enableTerryMode) && (
          <DemoIndicator type="demo" label="Customer Portal Demo" />
        )}

        {/* Login Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Customer Portal</CardTitle>
            <p className="text-gray-600">
              Access your shipments, compliance data, and support
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your-company@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Sign In to Portal
                  </>
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            {config.apiMode === "demo" && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Demo Customers</span>
                </div>
                <div className="space-y-2">
                  {demoCustomers.map((customer, index) => (
                    <button
                      key={index}
                      onClick={() => handleDemoLogin(customer)}
                      className="w-full text-left p-2 text-xs bg-white rounded border hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-gray-600">{customer.email}</div>
                      <div className="text-blue-600">{customer.category} • Password: demo123</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Features List */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Portal Features</h4>
              <div className="space-y-2">
                {[
                  "Real-time shipment tracking",
                  "Compliance dashboard & metrics", 
                  "Safety documentation access",
                  "Support ticket management",
                  "Notification preferences",
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Need help accessing your account?{" "}
            <a href="/support" className="text-blue-600 hover:text-blue-800">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}