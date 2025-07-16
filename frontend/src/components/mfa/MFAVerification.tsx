"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Shield,
  Smartphone,
  Mail,
  Key,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface MFADevice {
  device_id: string;
  device_type: string;
  device_name: string;
  is_primary: boolean;
}

interface MFAVerificationProps {
  tempToken: string;
  availableMethods: MFADevice[];
  onVerificationSuccess: (tokens: {
    access_token: string;
    refresh_token: string;
    user: any;
  }) => void;
  onCancel?: () => void;
  className?: string;
}

export function MFAVerification({
  tempToken,
  availableMethods,
  onVerificationSuccess,
  onCancel,
  className = "",
}: MFAVerificationProps) {
  const [selectedDevice, setSelectedDevice] = useState<MFADevice | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Auto-select primary device if available
  useEffect(() => {
    const primaryDevice = availableMethods.find((method) => method.is_primary);
    if (primaryDevice) {
      setSelectedDevice(primaryDevice);
    } else if (availableMethods.length > 0) {
      setSelectedDevice(availableMethods[0]);
    }
  }, [availableMethods]);

  // Start countdown for SMS resend
  useEffect(() => {
    if (selectedDevice?.device_type === "sms" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, selectedDevice]);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "totp":
        return Smartphone;
      case "sms":
        return Mail;
      case "backup":
        return Key;
      default:
        return Shield;
    }
  };

  const getDeviceDescription = (device: MFADevice) => {
    switch (device.device_type) {
      case "totp":
        return "Enter the 6-digit code from your authenticator app";
      case "sms":
        return "Enter the code sent to your phone";
      case "backup":
        return "Enter one of your backup recovery codes";
      default:
        return "Enter your verification code";
    }
  };

  const handleVerification = async () => {
    if (!verificationCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    if (!selectedDevice) {
      setError("Please select a verification method");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/v1/auth/mfa/verify-login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temp_token: tempToken,
          device_id: selectedDevice.device_id,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store tokens
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);

        onVerificationSuccess(data);
      } else {
        setError(data.error || "Verification failed");
        setVerificationCode(""); // Clear the code on failure
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendSMS = async () => {
    if (!selectedDevice || selectedDevice.device_type !== "sms") return;

    setIsLoading(true);
    setError("");

    try {
      // This would trigger a new SMS code
      const response = await fetch("/api/v1/auth/mfa/resend-sms/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temp_token: tempToken,
          device_id: selectedDevice.device_id,
        }),
      });

      if (response.ok) {
        setCountdown(60); // 60 second countdown
      } else {
        setError("Failed to resend SMS code");
      }
    } catch (error) {
      setError("Failed to resend SMS code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleVerification();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Device Selection */}
        {availableMethods.length > 1 && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Choose verification method:
            </label>
            <div className="space-y-2">
              {availableMethods.map((device) => {
                const IconComponent = getDeviceIcon(device.device_type);
                return (
                  <button
                    key={device.device_id}
                    onClick={() => setSelectedDevice(device)}
                    className={`w-full p-3 border rounded-lg text-left transition-colors ${
                      selectedDevice?.device_id === device.device_id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5 text-gray-600" />
                      <div>
                        <div className="font-medium">{device.device_name}</div>
                        <div className="text-sm text-gray-600">
                          {device.device_type === "totp"
                            ? "Authenticator App"
                            : device.device_type === "sms"
                              ? "SMS"
                              : "Backup Codes"}
                          {device.is_primary && (
                            <span className="ml-2 text-blue-600">
                              (Primary)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Current Device Info */}
        {selectedDevice && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              {React.createElement(getDeviceIcon(selectedDevice.device_type), {
                className: "h-4 w-4 text-gray-600",
              })}
              <span className="font-medium">{selectedDevice.device_name}</span>
            </div>
            <p className="text-sm text-gray-600">
              {getDeviceDescription(selectedDevice)}
            </p>
          </div>
        )}

        {/* Verification Code Input */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Verification Code
          </label>
          <Input
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder={
              selectedDevice?.device_type === "backup"
                ? "Enter backup code"
                : "Enter 6-digit code"
            }
            maxLength={selectedDevice?.device_type === "backup" ? 8 : 6}
            onKeyPress={handleKeyPress}
            autoFocus
          />
        </div>

        {/* SMS Resend Option */}
        {selectedDevice?.device_type === "sms" && (
          <div className="text-sm text-gray-600">
            {"Didn't receive the code? "}
            <button
              onClick={handleResendSMS}
              disabled={countdown > 0 || isLoading}
              className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              {countdown > 0 ? `Resend in ${countdown}s` : "Resend SMS"}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={handleVerification}
            disabled={isLoading || !verificationCode.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>

          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 text-center">
          Having trouble? Contact your administrator for assistance.
        </div>
      </CardContent>
    </Card>
  );
}
