"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Image,
  Camera,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  User,
  FileText,
  Info,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface Photo {
  id: string;
  image_url: string;
  thumbnail_url?: string;
  file_name: string;
  file_size_mb?: number;
  caption?: string;
  taken_at: string;
  metadata?: {
    gps_coordinates?: string;
    hazard_analysis?: string;
    safety_alert?: string;
    device_info?: string;
  };
}

interface PhotoViewerProps {
  photos: Photo[];
  isOpen: boolean;
  onClose: () => void;
  initialPhotoIndex?: number;
  title?: string;
  context?: 'pod' | 'inspection';
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photos,
  isOpen,
  onClose,
  initialPhotoIndex = 0,
  title = "Photo Viewer",
  context = 'pod'
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const currentPhoto = photos[currentIndex];

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
    resetView();
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    resetView();
  };

  const resetView = () => {
    setZoom(100);
    setRotation(0);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (currentPhoto) {
      // Create a temporary link to download the image
      const link = document.createElement('a');
      link.href = currentPhoto.image_url;
      link.download = currentPhoto.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async () => {
    if (currentPhoto && navigator.share) {
      try {
        await navigator.share({
          title: `${context === 'pod' ? 'POD' : 'Inspection'} Photo`,
          text: currentPhoto.caption || currentPhoto.file_name,
          url: currentPhoto.image_url
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentPhoto) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {title}
              <Badge variant="outline">
                {currentIndex + 1} of {photos.length}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Photo Display */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70"
                  onClick={prevPhoto}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70"
                  onClick={nextPhoto}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Photo */}
            <div
              className="max-w-full max-h-full flex items-center justify-center"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease'
              }}
            >
              <img
                src={currentPhoto.image_url}
                alt={currentPhoto.caption || currentPhoto.file_name}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMTAwQzE2MS4zNCA0MCA5MCA2MS4zNCA5MCA0MFMxNjEuMzQgNDAgMjAwIDEwMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                }}
              />
            </div>

            {/* Control Bar */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/70 rounded-lg p-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-white text-sm px-2">{zoom}%</span>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="w-px h-4 bg-white/30 mx-1" />
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleRotate}>
                <RotateCw className="h-4 w-4" />
              </Button>
              <div className="w-px h-4 bg-white/30 mx-1" />
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              {navigator.share && (
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Photo Information Panel */}
          <div className="w-80 bg-gray-50 p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Photo Details */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Photo Details
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">File Name:</span>
                      <div className="font-medium">{currentPhoto.file_name}</div>
                    </div>
                    
                    {currentPhoto.file_size_mb && (
                      <div>
                        <span className="text-gray-600">Size:</span>
                        <div className="font-medium">{currentPhoto.file_size_mb}MB</div>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-gray-600">Captured:</span>
                      <div className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(currentPhoto.taken_at)}
                      </div>
                    </div>
                    
                    {currentPhoto.caption && (
                      <div>
                        <span className="text-gray-600">Caption:</span>
                        <div className="font-medium">{currentPhoto.caption}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Mobile Metadata (for inspection photos) */}
              {currentPhoto.metadata && context === 'inspection' && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Mobile Capture Data
                    </h3>
                    
                    <div className="space-y-2 text-sm">
                      {currentPhoto.metadata.gps_coordinates && (
                        <div>
                          <span className="text-gray-600">Location:</span>
                          <div className="font-medium flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {currentPhoto.metadata.gps_coordinates}
                          </div>
                        </div>
                      )}
                      
                      {currentPhoto.metadata.device_info && (
                        <div>
                          <span className="text-gray-600">Device:</span>
                          <div className="font-medium">{currentPhoto.metadata.device_info}</div>
                        </div>
                      )}
                      
                      {currentPhoto.metadata.hazard_analysis && (
                        <div>
                          <span className="text-gray-600">Hazard Analysis:</span>
                          <div className="font-medium text-orange-700 flex items-start gap-1">
                            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {currentPhoto.metadata.hazard_analysis}
                          </div>
                        </div>
                      )}
                      
                      {currentPhoto.metadata.safety_alert && (
                        <div>
                          <span className="text-gray-600">Safety Alert:</span>
                          <div className="font-medium text-red-700 flex items-start gap-1">
                            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {currentPhoto.metadata.safety_alert}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Photo Thumbnails */}
              {photos.length > 1 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      All Photos
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className={`aspect-square bg-gray-100 rounded cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-center border-2 ${
                            index === currentIndex ? 'border-blue-500' : 'border-transparent'
                          }`}
                          onClick={() => {
                            setCurrentIndex(index);
                            resetView();
                          }}
                        >
                          <Image className="h-6 w-6 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Context-specific Information */}
              {context === 'pod' && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Delivery Evidence
                    </h3>
                    <div className="text-sm text-gray-600">
                      This photo serves as proof of delivery and is part of the official POD record.
                    </div>
                  </CardContent>
                </Card>
              )}

              {context === 'inspection' && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Inspection Record
                    </h3>
                    <div className="text-sm text-gray-600">
                      This photo documents inspection findings and supports compliance reporting.
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoViewer;