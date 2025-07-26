"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { ArrowLeft, Save, Truck, Loader2 } from "lucide-react";
import { usePermissions } from "@/contexts/PermissionContext";
import { useMockFleetStatus } from "@/shared/hooks/useMockAPI";
import toast from "react-hot-toast";

export default function EditVehiclePage() {
  const params = useParams();
  const router = useRouter();
  const { can } = usePermissions();
  const { data: fleetData } = useMockFleetStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vehicleId = params.id as string;
  const vehicle = fleetData?.vehicles.find(v => v.id === vehicleId);

  // Check permission
  if (!can("vehicle.edit")) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              You don't have permission to edit vehicles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [formData, setFormData] = useState({
    registration_number: "",
    vehicle_type: "",
    make: "",
    model: "",
    year: "",
    vin: "",
    capacity: "",
    fuel_type: "diesel",
    status: "ACTIVE",
    notes: ""
  });

  // Populate form with existing vehicle data
  useEffect(() => {
    if (vehicle) {
      setFormData({
        registration_number: vehicle.registration_number || "",
        vehicle_type: vehicle.vehicle_type || "",
        make: "Mercedes-Benz", // Mock data
        model: "Actros", // Mock data
        year: "2023", // Mock data
        vin: "WDB1234567890123", // Mock data
        capacity: "25", // Mock data
        fuel_type: "diesel",
        status: vehicle.status || "ACTIVE",
        notes: ""
      });
    }
  }, [vehicle]);

  if (!vehicle) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Vehicle not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement API call to update vehicle
      console.log("Updating vehicle:", formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Vehicle updated successfully!");
      router.push(`/fleet/vehicles/${vehicleId}`);
    } catch (error) {
      toast.error("Failed to update vehicle. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <h1 className="text-3xl font-bold text-gray-900">
          Edit Vehicle: {vehicle.registration_number}
        </h1>
        <p className="text-gray-600 mt-1">
          Update vehicle information and settings
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="registration_number">Registration Number *</Label>
                <Input
                  id="registration_number"
                  value={formData.registration_number}
                  onChange={(e) => handleChange("registration_number", e.target.value)}
                  placeholder="ABC-123"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(value) => handleChange("vehicle_type", value)}
                  required
                >
                  <SelectTrigger id="vehicle_type">
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="tanker">Tanker</SelectItem>
                    <SelectItem value="flatbed">Flatbed</SelectItem>
                    <SelectItem value="refrigerated">Refrigerated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Make and Model */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="make">Make *</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) => handleChange("make", e.target.value)}
                  placeholder="Mercedes-Benz"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleChange("model", e.target.value)}
                  placeholder="Actros"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => handleChange("year", e.target.value)}
                  placeholder="2023"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>
            </div>

            {/* VIN and Capacity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vin">VIN</Label>
                <Input
                  id="vin"
                  value={formData.vin}
                  onChange={(e) => handleChange("vin", e.target.value)}
                  placeholder="Vehicle Identification Number"
                />
              </div>
              
              <div>
                <Label htmlFor="capacity">Capacity (tons)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => handleChange("capacity", e.target.value)}
                  placeholder="25"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>

            {/* Fuel Type and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fuel_type">Fuel Type</Label>
                <Select
                  value={formData.fuel_type}
                  onValueChange={(value) => handleChange("fuel_type", value)}
                >
                  <SelectTrigger id="fuel_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="lng">LNG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange("status", value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="OFFLINE">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Additional notes about the vehicle..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/fleet/vehicles/${vehicleId}`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}