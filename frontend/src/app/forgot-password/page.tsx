"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccess(true);
    } catch {
      setError("Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-white">
      <div className="absolute left-0 right-0 top-0 bottom-0 flex flex-col items-start p-0">
        <div className="w-full h-full flex flex-row items-start pl-8 pr-0 py-8">
          {/* Left Container - Illustration */}
          <div
            className="hidden lg:flex flex-col justify-end items-center p-0 gap-6 flex-1 h-full rounded-[20px] relative overflow-hidden"
            style={{ background: "#F8F7FA" }}
          >
            <div
              className="absolute w-[795px] h-[1293px] -left-16 -top-26 z-10"
              style={{
                backgroundImage: "url('/login-illustration.png')",
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                transform: "scaleX(-1)",
              }}
            />
          </div>

          {/* Right Container - Form */}
          <div className="w-full lg:w-[700px] h-full flex flex-col justify-center items-center p-0 gap-6 bg-white">
            {/* Logo */}
            <div className="flex items-center justify-center space-x-2 w-[400px] h-12">
              <Shield className="h-8 w-8 text-[#153F9F]" />
              <span className="text-2xl font-bold text-[#153F9F]">
                SafeShipper
              </span>
            </div>

            {/* Form Section */}
            <div className="flex flex-col items-start p-0 gap-6 w-[400px]">
              {/* Heading Text */}
              <div className="flex flex-col items-start p-0 gap-1.5 w-full">
                <h2 className="w-full font-poppins font-bold text-[26px] leading-9 flex items-center text-black">
                  Reset your password
                </h2>
                <p className="w-full font-poppins font-normal text-[15px] leading-[22px] flex items-center text-gray-600">
                  Enter your email address and we&apos;ll send you a reset link
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Success Alert */}
              {success && (
                <Alert variant="success">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Password reset email sent! Check your inbox for further
                    instructions.
                  </AlertDescription>
                </Alert>
              )}

              {/* Form */}
              {!success && (
                <form
                  className="flex flex-col items-start p-0 gap-4 w-full"
                  onSubmit={handleSubmit}
                >
                  {/* Email Field */}
                  <div className="flex flex-col items-start p-0 gap-1 w-full">
                    <label
                      htmlFor="email"
                      className="font-poppins font-normal text-[13px] leading-5 text-gray-700"
                    >
                      Email
                    </label>
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

                  {/* Send Reset Email Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#153F9F] hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending email...
                      </>
                    ) : (
                      "Send Reset Email"
                    )}
                  </Button>
                </form>
              )}

              {/* Success Actions */}
              {success && (
                <div className="flex flex-col gap-4 w-full">
                  <Button
                    onClick={() => {
                      setSuccess(false);
                      setEmail("");
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Send Another Email
                  </Button>
                </div>
              )}
            </div>

            {/* Back to Login Link */}
            <div className="text-center">
              <p className="font-poppins font-normal text-[15px] leading-[22px] text-gray-600">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="font-medium text-[#153F9F] hover:text-blue-800 transition-colors duration-200"
                >
                  Back to login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
