"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Upload } from "lucide-react";
import SDSUploadForm from "./SDSUploadForm";

interface SDSUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: (sdsId: string) => void;
}

export default function SDSUploadModal({
  open,
  onOpenChange,
  onUploadSuccess,
}: SDSUploadModalProps) {
  const [uploadStep, setUploadStep] = useState<"form" | "success">("form");
  const [uploadedSdsId, setUploadedSdsId] = useState<string | null>(null);

  const handleUploadSuccess = (sdsId: string) => {
    setUploadedSdsId(sdsId);
    setUploadStep("success");
    
    // Auto-close after success
    setTimeout(() => {
      onOpenChange(false);
      if (onUploadSuccess) {
        onUploadSuccess(sdsId);
      }
    }, 2000);
  };

  const handleClose = () => {
    setUploadStep("form");
    setUploadedSdsId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Upload Safety Data Sheet
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {uploadStep === "form" ? (
            <SDSUploadForm
              onUploadSuccess={handleUploadSuccess}
              onCancel={handleClose}
            />
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload Successful!
              </h3>
              <p className="text-gray-600 mb-4">
                Your SDS document has been uploaded and is now available in the library.
              </p>
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}