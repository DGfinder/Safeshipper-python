"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Shield,
  Smartphone,
  Key,
  Mail,
  QrCode,
  Copy,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface MFASetupProps {
  onSetupComplete?: () => void;
  className?: string;
}

interface MFADevice {
  id: string;
  device_type: string;
  name: string;
  is_confirmed: boolean;
  is_primary: boolean;
  created_at: string;
}

export function MFASetup({ onSetupComplete, className = "" }: MFASetupProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [deviceName, setDeviceName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [step, setStep] = useState<"select" | "setup" | "verify" | "complete">(
    "select",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const mfaMethods = [
    {
      id: "totp",
      name: "Authenticator App",
      description: "Use Google Authenticator, Authy, or similar apps",
      icon: Smartphone,
      recommended: true,
    },
    {
      id: "sms",
      name: "SMS",
      description: "Receive codes via text message",
      icon: Mail,
      recommended: false,
    },
  ];

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
    setDeviceName(method === "totp" ? "My Authenticator" : "My Phone");
    setStep("setup");
    setError("");
  };

  const handleSetupDevice = async () => {
    if (!deviceName.trim()) {
      setError("Please enter a device name");
      return;
    }

    if (selectedMethod === "sms" && !phoneNumber.trim()) {
      setError("Please enter a phone number");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/v1/auth/mfa/enroll/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          device_type: selectedMethod,
          device_name: deviceName,
          phone_number: phoneNumber,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setDeviceId(data.device_id);

        if (selectedMethod === "totp") {
          setQrCodeUrl(data.qr_code_url);
          setSecretKey(data.secret_key);
          setBackupCodes(data.backup_codes || []);
        }

        setStep("verify");
        setSuccess(data.message);
      } else {
        setError(data.error || "Failed to setup MFA device");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyDevice = async () => {
    if (!verificationCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/v1/auth/mfa/verify/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          device_id: deviceId,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("complete");
        setSuccess("MFA device verified successfully!");

        if (onSetupComplete) {
          setTimeout(() => onSetupComplete(), 2000);
        }
      } else {
        setError(data.error || "Invalid verification code");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess("Copied to clipboard!");
    setTimeout(() => setSuccess(""), 2000);
  };

  const renderMethodSelection = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-blue-600" />
        <h3 className="text-lg font-semibold mb-2">Secure Your Account</h3>
        <p className="text-gray-600 text-sm">
          Choose a two-factor authentication method to add extra security to
          your account.
        </p>
      </div>

      <div className="space-y-3">
        {mfaMethods.map((method) => {
          const IconComponent = method.icon;
          return (
            <button
              key={method.id}
              onClick={() => handleMethodSelect(method.id)}
              className="w-full p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <div className="flex items-start gap-3">
                <IconComponent className="h-6 w-6 text-gray-600 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{method.name}</span>
                    {method.recommended && (
                      <Badge variant="secondary" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{method.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderSetup = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">
          Setup {mfaMethods.find((m) => m.id === selectedMethod)?.name}
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Device Name</label>
          <Input
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="e.g., My Authenticator"
          />
        </div>

        {selectedMethod === "sms" && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Phone Number
            </label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              type="tel"
            />
          </div>
        )}

        <Button
          onClick={handleSetupDevice}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : (
            "Setup Device"
          )}
        </Button>
      </div>
    </div>
  );

  const renderVerify = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Verify Your Device</h3>
      </div>

      {selectedMethod === "totp" && qrCodeUrl && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Scan this QR code with your authenticator app:
            </p>
            <div className="inline-block p-4 bg-white border rounded-lg">
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
            </div>
          </div>

          {secretKey && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-1">Manual Entry Key:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white p-2 rounded border">
                  {secretKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(secretKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {backupCodes.length > 0 && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Key className="h-4 w-4" />
                Backup Recovery Codes
              </p>
              <p className="text-xs text-gray-600 mb-2">
                Save these codes in a secure place. You can use them to access
                your account if you lose your device.
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                {backupCodes.map((code, index) => (
                  <div key={index} className="bg-white p-1 rounded">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Verification Code
        </label>
        <Input
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          placeholder="Enter 6-digit code"
          maxLength={6}
        />
      </div>

      <Button
        onClick={handleVerifyDevice}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          "Verify Device"
        )}
      </Button>
    </div>
  );

  const renderComplete = () => (
    <div className="text-center space-y-4">
      <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
      <div>
        <h3 className="text-lg font-semibold mb-2">Setup Complete!</h3>
        <p className="text-gray-600">
          Your two-factor authentication is now active and your account is more
          secure.
        </p>
      </div>
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication Setup
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {step === "select" && renderMethodSelection()}
        {step === "setup" && renderSetup()}
        {step === "verify" && renderVerify()}
        {step === "complete" && renderComplete()}

        {step !== "select" && step !== "complete" && (
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setStep("select");
                setSelectedMethod("");
                setError("");
                setSuccess("");
              }}
              className="w-full"
            >
              Back to Method Selection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
