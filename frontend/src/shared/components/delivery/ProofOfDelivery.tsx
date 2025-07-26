// components/delivery/ProofOfDelivery.tsx
"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  CheckCircle,
  Camera,
  PenTool,
  User,
  Package,
  MapPin,
  Clock,
  Upload,
  Loader2,
  X,
  Eye,
} from "lucide-react";
import { useSubmitProofOfDelivery } from "@/shared/hooks/useShipmentsReal";

interface ProofOfDeliveryProps {
  shipmentId: string;
  customerName: string;
  deliveryAddress: string;
  onComplete?: (podData: any) => void;
  className?: string;
}

interface PODPhoto {
  id: string;
  url: string;
  caption: string;
}

export function ProofOfDelivery({
  shipmentId,
  customerName,
  deliveryAddress,
  onComplete,
  className,
}: ProofOfDeliveryProps) {
  const [step, setStep] = useState<
    "photos" | "signature" | "recipient" | "complete"
  >("photos");
  const [photos, setPhotos] = useState<PODPhoto[]>([]);
  const [signature, setSignature] = useState<string>("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientTitle, setRecipientTitle] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const submitPODMutation = useSubmitProofOfDelivery();

  // Mock signature drawing functionality
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
    // Convert canvas to base64
    const canvas = canvasRef.current;
    if (canvas) {
      setSignature(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
  };

  const addPhoto = () => {
    // Mock photo addition
    const newPhoto: PODPhoto = {
      id: Math.random().toString(),
      url: `https://via.placeholder.com/300x200/4CAF50/FFFFFF?text=POD+Photo+${photos.length + 1}`,
      caption: `Delivery photo ${photos.length + 1}`,
    };
    setPhotos((prev) => [...prev, newPhoto]);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
  };

  const handleSubmitPOD = async () => {
    if (!recipientName.trim()) {
      alert("Please enter recipient name");
      return;
    }

    try {
      const podData = await submitPODMutation.mutateAsync({
        shipment_id: shipmentId,
        signature,
        photos: photos.map((p) => p.url),
        recipient: `${recipientName}${recipientTitle ? ` - ${recipientTitle}` : ""}`,
        delivery_notes: deliveryNotes,
      });

      setStep("complete");
      onComplete?.(podData);
    } catch (error) {
      console.error("Failed to submit POD:", error);
    }
  };

  const canProceedToSignature = photos.length > 0;
  const canProceedToRecipient = signature.length > 0;
  const canSubmit = recipientName.trim().length > 0;

  if (step === "complete") {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            Delivery Completed Successfully
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Proof of delivery has been captured and submitted. The customer
              will receive notification shortly.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p>
                <span className="font-medium">Delivered to:</span>{" "}
                {recipientName}
              </p>
              <p>
                <span className="font-medium">Photos taken:</span>{" "}
                {photos.length}
              </p>
            </div>
            <div>
              <p>
                <span className="font-medium">Signature:</span> Captured
              </p>
              <p>
                <span className="font-medium">Time:</span>{" "}
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>

          <Button onClick={() => window.history.back()} className="w-full">
            Return to Shipments
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Proof of Delivery
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4" />
          <span>{deliveryAddress}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Step Indicator */}
        <div className="flex justify-center space-x-4 mb-6">
          {[
            { key: "photos", label: "Photos", icon: Camera },
            { key: "signature", label: "Signature", icon: PenTool },
            { key: "recipient", label: "Recipient", icon: User },
          ].map(({ key, label, icon: Icon }, index) => (
            <div
              key={key}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                step === key
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Photos */}
        {step === "photos" && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Take Delivery Photos</h3>
              <p className="text-sm text-gray-600 mb-4">
                Capture photos showing the delivered items and delivery location
              </p>
            </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative">
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    onClick={() => removePhoto(photo.id)}
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add Photo Button */}
            <Button
              onClick={addPhoto}
              variant="outline"
              className="w-full h-20 border-dashed"
            >
              <Camera className="h-6 w-6 mr-2" />
              Take Photo
            </Button>

            <Button
              onClick={() => setStep("signature")}
              disabled={!canProceedToSignature}
              className="w-full"
            >
              Continue to Signature
            </Button>
          </div>
        )}

        {/* Step 2: Signature */}
        {step === "signature" && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Capture Recipient Signature</h3>
              <p className="text-sm text-gray-600 mb-4">
                Ask the recipient to sign on the area below
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <canvas
                ref={canvasRef}
                width={300}
                height={150}
                className="border rounded w-full cursor-crosshair bg-white"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500">Signature Area</span>
                <Button
                  onClick={clearSignature}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setStep("photos")}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep("recipient")}
                disabled={!canProceedToRecipient}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Recipient Details */}
        {step === "recipient" && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Recipient Information</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter details of the person who received the delivery
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Name *
                </label>
                <Input
                  placeholder="Full name of recipient"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title/Position (optional)
                </label>
                <Input
                  placeholder="e.g., Warehouse Manager, Security Guard"
                  value={recipientTitle}
                  onChange={(e) => setRecipientTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Notes (optional)
                </label>
                <Input
                  placeholder="Any additional notes about the delivery"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="border rounded-lg p-3 bg-gray-50">
              <h4 className="font-medium text-sm mb-2">Delivery Summary</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <p>• {photos.length} delivery photo(s) captured</p>
                <p>• Recipient signature obtained</p>
                <p>• Delivered to: {customerName}</p>
                <p>• Time: {new Date().toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setStep("signature")}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmitPOD}
                disabled={!canSubmit || submitPODMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {submitPODMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Complete Delivery
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
