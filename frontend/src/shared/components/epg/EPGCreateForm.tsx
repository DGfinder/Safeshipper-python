// components/epg/EPGCreateForm.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { 
  Save, 
  AlertTriangle, 
  Shield, 
  Phone, 
  MapPin, 
  FileText,
  Plus,
  X
} from "lucide-react";
import { useCreateEPG, type EmergencyProcedureGuide } from "@/shared/hooks/useEPG";
import { useForm } from "react-hook-form";

interface EPGCreateFormProps {
  onSuccess?: (epg: EmergencyProcedureGuide) => void;
  onCancel?: () => void;
  initialData?: Partial<EmergencyProcedureGuide>;
}

interface EPGFormData {
  epg_number: string;
  title: string;
  hazard_class: string;
  subsidiary_risks: string[];
  emergency_types: string[];
  severity_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  immediate_actions: string;
  personal_protection: string;
  fire_procedures: string;
  spill_procedures: string;
  medical_procedures: string;
  evacuation_procedures: string;
  notification_requirements: string;
  environmental_precautions: string;
  water_pollution_response: string;
  transport_specific_guidance: string;
  weather_considerations: string;
  version: string;
  country_code: string;
  regulatory_references: string[];
  emergency_contacts: Record<string, any>;
  isolation_distances: Record<string, any>;
  protective_action_distances: Record<string, any>;
}

const hazardClasses = [
  { value: "1", label: "Class 1 - Explosives" },
  { value: "2", label: "Class 2 - Gases" },
  { value: "3", label: "Class 3 - Flammable Liquids" },
  { value: "4", label: "Class 4 - Flammable Solids" },
  { value: "5", label: "Class 5 - Oxidizing Substances" },
  { value: "6", label: "Class 6 - Toxic Substances" },
  { value: "7", label: "Class 7 - Radioactive Materials" },
  { value: "8", label: "Class 8 - Corrosive Substances" },
  { value: "9", label: "Class 9 - Miscellaneous Dangerous Goods" },
];

const emergencyTypeOptions = [
  { value: "FIRE", label: "Fire/Explosion" },
  { value: "SPILL", label: "Spill/Leak" },
  { value: "EXPOSURE", label: "Human Exposure" },
  { value: "TRANSPORT_ACCIDENT", label: "Transport Accident" },
  { value: "CONTAINER_DAMAGE", label: "Container Damage" },
  { value: "ENVIRONMENTAL", label: "Environmental Release" },
  { value: "MULTI_HAZARD", label: "Multiple Hazards" },
];

const severityLevels = [
  { value: "LOW", label: "Low Risk" },
  { value: "MEDIUM", label: "Medium Risk" },
  { value: "HIGH", label: "High Risk" },
  { value: "CRITICAL", label: "Critical Risk" },
];

const countryCodes = [
  { value: "AU", label: "Australia" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "EU", label: "European Union" },
];

export const EPGCreateForm: React.FC<EPGCreateFormProps> = ({
  onSuccess,
  onCancel,
  initialData = {},
}) => {
  const createEPG = useCreateEPG();
  const [emergencyTypes, setEmergencyTypes] = useState<string[]>(
    initialData.emergency_types || []
  );
  const [subsidiaryRisks, setSubsidiaryRisks] = useState<string[]>(
    initialData.subsidiary_risks || []
  );
  const [regulatoryRefs, setRegulatoryRefs] = useState<string[]>(
    initialData.regulatory_references || []
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EPGFormData>({
    defaultValues: {
      epg_number: initialData.epg_number || "",
      title: initialData.title || "",
      hazard_class: initialData.hazard_class || "",
      severity_level: initialData.severity_level || "MEDIUM",
      immediate_actions: initialData.immediate_actions || "",
      personal_protection: initialData.personal_protection || "",
      fire_procedures: initialData.fire_procedures || "",
      spill_procedures: initialData.spill_procedures || "",
      medical_procedures: initialData.medical_procedures || "",
      evacuation_procedures: initialData.evacuation_procedures || "",
      notification_requirements: initialData.notification_requirements || "",
      environmental_precautions: initialData.environmental_precautions || "",
      water_pollution_response: initialData.water_pollution_response || "",
      transport_specific_guidance: initialData.transport_specific_guidance || "",
      weather_considerations: initialData.weather_considerations || "",
      version: initialData.version || "1.0",
      country_code: initialData.country_code || "AU",
      emergency_contacts: initialData.emergency_contacts || {},
      isolation_distances: initialData.isolation_distances || {},
      protective_action_distances: initialData.protective_action_distances || {},
    },
  });

  const onSubmit = async (data: EPGFormData) => {
    try {
      const epgData = {
        ...data,
        emergency_types: emergencyTypes,
        subsidiary_risks: subsidiaryRisks,
        regulatory_references: regulatoryRefs,
        status: "DRAFT" as const,
        effective_date: new Date().toISOString().split('T')[0],
      };

      const result = await createEPG.mutateAsync(epgData);
      onSuccess?.(result);
    } catch (error) {
      console.error("Failed to create EPG:", error);
    }
  };

  const addEmergencyType = (type: string) => {
    if (!emergencyTypes.includes(type)) {
      setEmergencyTypes([...emergencyTypes, type]);
    }
  };

  const removeEmergencyType = (type: string) => {
    setEmergencyTypes(emergencyTypes.filter(t => t !== type));
  };

  const addSubsidiaryRisk = (risk: string) => {
    if (!subsidiaryRisks.includes(risk)) {
      setSubsidiaryRisks([...subsidiaryRisks, risk]);
    }
  };

  const removeSubsidiaryRisk = (risk: string) => {
    setSubsidiaryRisks(subsidiaryRisks.filter(r => r !== risk));
  };

  const addRegulatoryRef = () => {
    const input = document.getElementById('newRegulatoryRef') as HTMLInputElement;
    if (input?.value && !regulatoryRefs.includes(input.value)) {
      setRegulatoryRefs([...regulatoryRefs, input.value]);
      input.value = '';
    }
  };

  const removeRegulatoryRef = (ref: string) => {
    setRegulatoryRefs(regulatoryRefs.filter(r => r !== ref));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          Create Emergency Procedure Guide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="procedures">Procedures</TabsTrigger>
              <TabsTrigger value="distances">Distances</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="epg_number">EPG Number *</Label>
                  <Input
                    id="epg_number"
                    {...register("epg_number", { required: "EPG number is required" })}
                    placeholder="EPG-001"
                  />
                  {errors.epg_number && (
                    <p className="text-red-500 text-sm">{errors.epg_number.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    {...register("version")}
                    placeholder="1.0"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    {...register("title", { required: "Title is required" })}
                    placeholder="Emergency procedures for..."
                  />
                  {errors.title && (
                    <p className="text-red-500 text-sm">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hazard_class">Primary Hazard Class *</Label>
                  <Select onValueChange={(value) => setValue("hazard_class", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hazard class" />
                    </SelectTrigger>
                    <SelectContent>
                      {hazardClasses.map((hazard) => (
                        <SelectItem key={hazard.value} value={hazard.value}>
                          {hazard.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.hazard_class && (
                    <p className="text-red-500 text-sm">Hazard class is required</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="severity_level">Severity Level</Label>
                  <Select onValueChange={(value) => setValue("severity_level", value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {severityLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country_code">Country/Region</Label>
                  <Select onValueChange={(value) => setValue("country_code", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subsidiary Risks */}
              <div className="space-y-2">
                <Label>Subsidiary Risks</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {subsidiaryRisks.map((risk) => (
                    <Badge key={risk} variant="secondary" className="flex items-center gap-1">
                      Class {risk}
                      <button
                        type="button"
                        onClick={() => removeSubsidiaryRisk(risk)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Select onValueChange={addSubsidiaryRisk}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Add subsidiary risk" />
                    </SelectTrigger>
                    <SelectContent>
                      {hazardClasses.map((hazard) => (
                        <SelectItem key={hazard.value} value={hazard.value}>
                          {hazard.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Emergency Types */}
              <div className="space-y-2">
                <Label>Emergency Types Covered</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {emergencyTypes.map((type) => (
                    <Badge key={type} variant="destructive" className="flex items-center gap-1">
                      {emergencyTypeOptions.find(t => t.value === type)?.label}
                      <button
                        type="button"
                        onClick={() => removeEmergencyType(type)}
                        className="ml-1 hover:text-red-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Select onValueChange={addEmergencyType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Add emergency type" />
                    </SelectTrigger>
                    <SelectContent>
                      {emergencyTypeOptions.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Regulatory References */}
              <div className="space-y-2">
                <Label>Regulatory References</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {regulatoryRefs.map((ref) => (
                    <Badge key={ref} variant="outline" className="flex items-center gap-1">
                      {ref}
                      <button
                        type="button"
                        onClick={() => removeRegulatoryRef(ref)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="newRegulatoryRef"
                    placeholder="Enter regulatory reference (e.g., IATA DGR)"
                    className="flex-1"
                  />
                  <Button type="button" onClick={addRegulatoryRef} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Emergency Procedures Tab */}
            <TabsContent value="procedures" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Provide clear, step-by-step instructions for each emergency scenario. Use action-oriented language.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="immediate_actions">Immediate Actions *</Label>
                  <Textarea
                    id="immediate_actions"
                    {...register("immediate_actions", { required: "Immediate actions are required" })}
                    placeholder="First response actions to take immediately..."
                    rows={4}
                  />
                  {errors.immediate_actions && (
                    <p className="text-red-500 text-sm">{errors.immediate_actions.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personal_protection">Personal Protection *</Label>
                  <Textarea
                    id="personal_protection"
                    {...register("personal_protection", { required: "Personal protection info is required" })}
                    placeholder="Personal protective equipment and safety measures..."
                    rows={3}
                  />
                  {errors.personal_protection && (
                    <p className="text-red-500 text-sm">{errors.personal_protection.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fire_procedures">Fire Fighting Procedures</Label>
                    <Textarea
                      id="fire_procedures"
                      {...register("fire_procedures")}
                      placeholder="Fire suppression and firefighting procedures..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="spill_procedures">Spill Response Procedures</Label>
                    <Textarea
                      id="spill_procedures"
                      {...register("spill_procedures")}
                      placeholder="Spill containment and cleanup procedures..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medical_procedures">Medical Response</Label>
                    <Textarea
                      id="medical_procedures"
                      {...register("medical_procedures")}
                      placeholder="First aid and medical response procedures..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="evacuation_procedures">Evacuation Procedures</Label>
                    <Textarea
                      id="evacuation_procedures"
                      {...register("evacuation_procedures")}
                      placeholder="Evacuation distances and procedures..."
                      rows={4}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notification_requirements">Notification Requirements *</Label>
                  <Textarea
                    id="notification_requirements"
                    {...register("notification_requirements", { required: "Notification requirements are required" })}
                    placeholder="Who to contact and when..."
                    rows={3}
                  />
                  {errors.notification_requirements && (
                    <p className="text-red-500 text-sm">{errors.notification_requirements.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="environmental_precautions">Environmental Precautions</Label>
                    <Textarea
                      id="environmental_precautions"
                      {...register("environmental_precautions")}
                      placeholder="Environmental protection measures..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="water_pollution_response">Water Pollution Response</Label>
                    <Textarea
                      id="water_pollution_response"
                      {...register("water_pollution_response")}
                      placeholder="Response to water contamination..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transport_specific_guidance">Transport Specific Guidance</Label>
                    <Textarea
                      id="transport_specific_guidance"
                      {...register("transport_specific_guidance")}
                      placeholder="Transport-related emergency guidance..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weather_considerations">Weather Considerations</Label>
                    <Textarea
                      id="weather_considerations"
                      {...register("weather_considerations")}
                      placeholder="Weather-specific considerations..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Distances Tab */}
            <TabsContent value="distances" className="space-y-4">
              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  Specify isolation and protective action distances in meters for different scenarios.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Isolation Distances</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Small Spill (meters)</Label>
                      <Input
                        type="number"
                        placeholder="25"
                        onChange={(e) => setValue("isolation_distances", {
                          ...watch("isolation_distances"),
                          spill: { ...watch("isolation_distances")?.spill, small: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Large Spill (meters)</Label>
                      <Input
                        type="number"
                        placeholder="50"
                        onChange={(e) => setValue("isolation_distances", {
                          ...watch("isolation_distances"),
                          spill: { ...watch("isolation_distances")?.spill, large: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fire - Initial (meters)</Label>
                      <Input
                        type="number"
                        placeholder="100"
                        onChange={(e) => setValue("isolation_distances", {
                          ...watch("isolation_distances"),
                          fire: { ...watch("isolation_distances")?.fire, initial: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fire - Full Evacuation (meters)</Label>
                      <Input
                        type="number"
                        placeholder="200"
                        onChange={(e) => setValue("isolation_distances", {
                          ...watch("isolation_distances"),
                          fire: { ...watch("isolation_distances")?.fire, full: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Protective Action Distances</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Day - Initial Action (meters)</Label>
                      <Input
                        type="number"
                        placeholder="100"
                        onChange={(e) => setValue("protective_action_distances", {
                          ...watch("protective_action_distances"),
                          day: { ...watch("protective_action_distances")?.day, initial: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Day - Protective Action (meters)</Label>
                      <Input
                        type="number"
                        placeholder="300"
                        onChange={(e) => setValue("protective_action_distances", {
                          ...watch("protective_action_distances"),
                          day: { ...watch("protective_action_distances")?.day, protective: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Night - Initial Action (meters)</Label>
                      <Input
                        type="number"
                        placeholder="200"
                        onChange={(e) => setValue("protective_action_distances", {
                          ...watch("protective_action_distances"),
                          night: { ...watch("protective_action_distances")?.night, initial: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Night - Protective Action (meters)</Label>
                      <Input
                        type="number"
                        placeholder="500"
                        onChange={(e) => setValue("protective_action_distances", {
                          ...watch("protective_action_distances"),
                          night: { ...watch("protective_action_distances")?.night, protective: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Emergency Contacts Tab */}
            <TabsContent value="contacts" className="space-y-4">
              <Alert>
                <Phone className="h-4 w-4" />
                <AlertDescription>
                  Add emergency contact information by region. Include 24/7 hotlines and specialized response teams.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Australia</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Emergency Services</Label>
                      <Input
                        placeholder="000"
                        onChange={(e) => setValue("emergency_contacts", {
                          ...watch("emergency_contacts"),
                          AU: { ...watch("emergency_contacts")?.AU, emergency_services: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Poison Control</Label>
                      <Input
                        placeholder="13 11 26"
                        onChange={(e) => setValue("emergency_contacts", {
                          ...watch("emergency_contacts"),
                          AU: { ...watch("emergency_contacts")?.AU, poison_control: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fire & Rescue</Label>
                      <Input
                        placeholder="000"
                        onChange={(e) => setValue("emergency_contacts", {
                          ...watch("emergency_contacts"),
                          AU: { ...watch("emergency_contacts")?.AU, fire_rescue: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CHEMCALL</Label>
                      <Input
                        placeholder="1800 127 406"
                        onChange={(e) => setValue("emergency_contacts", {
                          ...watch("emergency_contacts"),
                          AU: { ...watch("emergency_contacts")?.AU, chemcall: e.target.value }
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">United States</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Emergency Services</Label>
                      <Input
                        placeholder="911"
                        onChange={(e) => setValue("emergency_contacts", {
                          ...watch("emergency_contacts"),
                          US: { ...watch("emergency_contacts")?.US, emergency_services: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Poison Control</Label>
                      <Input
                        placeholder="1-800-222-1222"
                        onChange={(e) => setValue("emergency_contacts", {
                          ...watch("emergency_contacts"),
                          US: { ...watch("emergency_contacts")?.US, poison_control: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CHEMTREC</Label>
                      <Input
                        placeholder="1-800-424-9300"
                        onChange={(e) => setValue("emergency_contacts", {
                          ...watch("emergency_contacts"),
                          US: { ...watch("emergency_contacts")?.US, chemtrec: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>EPA National Response</Label>
                      <Input
                        placeholder="1-800-424-8802"
                        onChange={(e) => setValue("emergency_contacts", {
                          ...watch("emergency_contacts"),
                          US: { ...watch("emergency_contacts")?.US, epa_response: e.target.value }
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-6 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating EPG...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create EPG
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};