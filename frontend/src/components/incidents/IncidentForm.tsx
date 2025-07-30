"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { Progress } from '@/shared/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  AlertTriangle,
  Upload,
  X,
  Plus,
  MapPin,
  Calendar,
  User,
  FileText,
  Loader2,
  Save,
  Send,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { incidentService } from '@/shared/services/incidentService';
import {
  CreateIncidentRequest,
  UpdateIncidentRequest,
  IncidentType,
  DangerousGood,
  User as UserType,
  Incident,
} from '@/shared/types/incident';

// Form validation schema
const incidentFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  incident_type_id: z.string().min(1, 'Incident type is required'),
  location: z.string().min(3, 'Location is required'),
  address: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  occurred_at: z.string().min(1, 'Occurrence date/time is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  witness_ids: z.array(z.string()).optional(),
  injuries_count: z.number().min(0).default(0),
  property_damage_estimate: z.number().min(0).optional(),
  environmental_impact: z.boolean().default(false),
  emergency_services_called: z.boolean().default(false),
  safety_officer_notified: z.boolean().default(false),
  shipment: z.string().optional(),
  vehicle: z.string().optional(),
  weather_conditions: z.object({
    temperature: z.string().optional(),
    weather: z.string().optional(),
    visibility: z.string().optional(),
    wind: z.string().optional(),
  }).optional(),
  dangerous_goods: z.array(z.object({
    dangerous_good_id: z.string(),
    quantity_involved: z.number().min(0),
    quantity_unit: z.string().default('L'),
    packaging_type: z.string().optional(),
    release_amount: z.number().min(0).optional(),
    containment_status: z.enum(['contained', 'partial', 'released', 'unknown']).default('unknown'),
  })).optional(),
});

type IncidentFormData = z.infer<typeof incidentFormSchema>;

interface IncidentFormProps {
  incident?: Incident;
  onSuccess?: (incident: Incident) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

const FORM_STEPS = [
  { id: 'basic', title: 'Basic Information', description: 'Essential incident details' },
  { id: 'location', title: 'Location & Context', description: 'Where and when it happened' },
  { id: 'impact', title: 'Impact Assessment', description: 'Injuries, damage, and environment' },
  { id: 'dangerous-goods', title: 'Dangerous Goods', description: 'Hazardous materials involved' },
  { id: 'response', title: 'Emergency Response', description: 'Actions taken and notifications' },
  { id: 'documents', title: 'Documentation', description: 'Photos and supporting files' },
];

export default function IncidentForm({
  incident,
  onSuccess,
  onCancel,
  mode = 'create'
}: IncidentFormProps) {
  const { can } = usePermissions();
  const [currentStep, setCurrentStep] = useState(0);
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [dangerousGoods, setDangerousGoods] = useState<DangerousGood[]>([]);
  const [witnesses, setWitnesses] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isEditing = mode === 'edit' && Boolean(incident);
  const canCreate = can('incidents.create');
  const canEdit = can('incidents.edit');
  const canSubmit = isEditing ? canEdit : canCreate;

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      title: incident?.title || '',
      description: incident?.description || '',
      incident_type_id: incident?.incident_type?.id || '',
      location: incident?.location || '',
      address: incident?.address || '',
      coordinates: incident?.coordinates,
      occurred_at: incident?.occurred_at ? 
        new Date(incident.occurred_at).toISOString().slice(0, 16) : '',
      priority: incident?.priority || 'medium',
      witness_ids: incident?.witnesses?.map(w => w.id) || [],
      injuries_count: incident?.injuries_count || 0,
      property_damage_estimate: incident?.property_damage_estimate || 0,
      environmental_impact: incident?.environmental_impact || false,
      emergency_services_called: incident?.emergency_services_called || false,
      safety_officer_notified: incident?.safety_officer_notified || false,
      shipment: incident?.shipment || '',
      vehicle: incident?.vehicle || '',
      weather_conditions: incident?.weather_conditions || {},
      dangerous_goods: incident?.dangerous_goods_details?.map(dg => ({
        dangerous_good_id: dg.dangerous_good.id,
        quantity_involved: dg.quantity_involved,
        quantity_unit: dg.quantity_unit,
        packaging_type: dg.packaging_type || '',
        release_amount: dg.release_amount || 0,
        containment_status: dg.containment_status,
      })) || [],
    },
  });

  // Load reference data
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [typesData, dgData, witnessData] = await Promise.all([
          incidentService.getIncidentTypes(),
          incidentService.getDangerousGoods(), // Assume this exists
          incidentService.getUsers(), // Assume this exists
        ]);

        setIncidentTypes(typesData);
        setDangerousGoods(dgData);
        setWitnesses(witnessData);
      } catch (error) {
        console.error('Error loading reference data:', error);
        toast.error('Failed to load form data');
      }
    };

    loadReferenceData();
  }, []);

  const onSubmit = async (data: IncidentFormData) => {
    if (!canSubmit) {
      toast.error('You do not have permission to perform this action');
      return;
    }

    setLoading(true);
    
    try {
      let result: Incident;
      
      if (isEditing && incident) {
        const updateData: UpdateIncidentRequest = {
          ...data,
          occurred_at: new Date(data.occurred_at).toISOString(),
        };
        result = await incidentService.updateIncident(incident.id, updateData);
        toast.success('Incident updated successfully');
      } else {
        const createData: CreateIncidentRequest = {
          ...data,
          occurred_at: new Date(data.occurred_at).toISOString(),
        };
        result = await incidentService.createIncident(createData);
        toast.success('Incident reported successfully');
      }

      // Add dangerous goods if any
      if (data.dangerous_goods && data.dangerous_goods.length > 0) {
        await Promise.all(
          data.dangerous_goods.map(dg =>
            incidentService.addDangerousGood(result.id, dg)
          )
        );
      }

      // Upload files if any
      if (uploadingFiles.length > 0) {
        await uploadFiles(result.id);
      }

      onSuccess?.(result);
    } catch (error) {
      console.error('Error saving incident:', error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} incident`);
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (incidentId: string) => {
    if (uploadingFiles.length === 0) return;

    const totalFiles = uploadingFiles.length;
    let completedFiles = 0;

    try {
      for (const file of uploadingFiles) {
        await incidentService.uploadDocument(incidentId, file, {
          document_type: getDocumentType(file),
          title: file.name,
        });
        
        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
      }

      toast.success(`${totalFiles} files uploaded successfully`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Some files failed to upload');
    }
  };

  const getDocumentType = (file: File): string => {
    if (file.type.startsWith('image/')) return 'photo';
    if (file.type === 'application/pdf') return 'report';
    return 'other';
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).filter(file => {
      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    setUploadingFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const nextStep = () => {
    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (!canSubmit) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            You do not have permission to {mode} incidents.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {isEditing ? 'Edit Incident' : 'Report New Incident'}
              </CardTitle>
              <CardDescription>
                Step {currentStep + 1} of {FORM_STEPS.length}: {FORM_STEPS[currentStep].title}
              </CardDescription>
            </div>
            <Badge variant="outline">
              {Math.round(((currentStep + 1) / FORM_STEPS.length) * 100)}% Complete
            </Badge>
          </div>
          <Progress value={((currentStep + 1) / FORM_STEPS.length) * 100} className="w-full" />
        </CardHeader>
      </Card>

      {/* Step Navigation */}
      <div className="flex justify-center space-x-2 overflow-x-auto pb-2">
        {FORM_STEPS.map((step, index) => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(index)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              index === currentStep
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : index < currentStep
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}
          >
            {index < currentStep ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <span className="h-4 w-4 rounded-full border-2 flex items-center justify-center text-xs">
                {index + 1}
              </span>
            )}
            <span className="hidden sm:inline">{step.title}</span>
          </button>
        ))}
      </div>

      {/* Form Content */}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{FORM_STEPS[currentStep].title}</CardTitle>
            <CardDescription>{FORM_STEPS[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="title">Incident Title *</Label>
                    <Input
                      id="title"
                      {...form.register('title')}
                      placeholder="Brief, descriptive title of the incident"
                    />
                    {form.formState.errors.title && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.title.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="incident_type_id">Incident Type *</Label>
                    <Controller
                      name="incident_type_id"
                      control={form.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select incident type" />
                          </SelectTrigger>
                          <SelectContent>
                            {incidentTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {type.category}
                                  </Badge>
                                  <span>{type.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.incident_type_id && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.incident_type_id.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority Level *</Label>
                    <Controller
                      name="priority"
                      control={form.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['low', 'medium', 'high', 'critical'].map((priority) => (
                              <SelectItem key={priority} value={priority}>
                                <div className="flex items-center space-x-2">
                                  <div className={`w-3 h-3 rounded-full ${getPriorityColor(priority)}`} />
                                  <span className="capitalize">{priority}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Detailed Description *</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Provide a detailed description of what happened, including sequence of events, people involved, and immediate actions taken..."
                    rows={6}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Location & Context */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      {...form.register('location')}
                      placeholder="e.g., Warehouse A - Loading Bay 3"
                    />
                    {form.formState.errors.location && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.location.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="address">Full Address</Label>
                    <Input
                      id="address"
                      {...form.register('address')}
                      placeholder="Street address, city, state"
                    />
                  </div>

                  <div>
                    <Label htmlFor="occurred_at">Date & Time Occurred *</Label>
                    <Input
                      id="occurred_at"
                      type="datetime-local"
                      {...form.register('occurred_at')}
                    />
                    {form.formState.errors.occurred_at && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.occurred_at.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Associated Shipment/Vehicle</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        {...form.register('shipment')}
                        placeholder="Shipment ID"
                      />
                      <Input
                        {...form.register('vehicle')}
                        placeholder="Vehicle ID"
                      />
                    </div>
                  </div>
                </div>

                {/* Weather Conditions */}
                <div>
                  <Label>Weather Conditions (if relevant)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div>
                      <Input
                        {...form.register('weather_conditions.temperature')}
                        placeholder="Temperature"
                      />
                    </div>
                    <div>
                      <Input
                        {...form.register('weather_conditions.weather')}
                        placeholder="Weather"
                      />
                    </div>
                    <div>
                      <Input
                        {...form.register('weather_conditions.visibility')}
                        placeholder="Visibility"
                      />
                    </div>
                    <div>
                      <Input
                        {...form.register('weather_conditions.wind')}
                        placeholder="Wind"
                      />
                    </div>
                  </div>
                </div>

                {/* Witnesses */}
                {can('incidents.manage.witnesses') && (
                  <div>
                    <Label>Witnesses</Label>
                    <Controller
                      name="witness_ids"
                      control={form.control}
                      render={({ field }) => (
                        <div className="space-y-2 mt-2">
                          {witnesses.map((witness) => (
                            <div key={witness.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`witness-${witness.id}`}
                                checked={field.value?.includes(witness.id) || false}
                                onCheckedChange={(checked) => {
                                  const currentIds = field.value || [];
                                  if (checked) {
                                    field.onChange([...currentIds, witness.id]);
                                  } else {
                                    field.onChange(currentIds.filter(id => id !== witness.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`witness-${witness.id}`} className="text-sm">
                                {witness.first_name} {witness.last_name} ({witness.role})
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Impact Assessment */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="injuries_count">Number of Injuries</Label>
                    <Input
                      id="injuries_count"
                      type="number"
                      min="0"
                      {...form.register('injuries_count', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="property_damage_estimate">Property Damage Estimate ($)</Label>
                    <Input
                      id="property_damage_estimate"
                      type="number"
                      min="0"
                      step="0.01"
                      {...form.register('property_damage_estimate', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Controller
                      name="environmental_impact"
                      control={form.control}
                      render={({ field }) => (
                        <Checkbox
                          id="environmental_impact"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="environmental_impact" className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span>Environmental Impact</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Controller
                      name="emergency_services_called"
                      control={form.control}
                      render={({ field }) => (
                        <Checkbox
                          id="emergency_services_called"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="emergency_services_called">Emergency Services Called</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Controller
                      name="safety_officer_notified"
                      control={form.control}
                      render={({ field }) => (
                        <Checkbox
                          id="safety_officer_notified"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="safety_officer_notified">Safety Officer Notified</Label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Dangerous Goods */}
            {currentStep === 3 && can('dangerous_goods.manage') && (
              <DangerousGoodsStep
                form={form}
                dangerousGoods={dangerousGoods}
              />
            )}

            {/* Step 5: Emergency Response */}
            {currentStep === 4 && (
              <EmergencyResponseStep form={form} />
            )}

            {/* Step 6: Documentation */}
            {currentStep === 5 && (
              <DocumentationStep
                uploadingFiles={uploadingFiles}
                uploadProgress={uploadProgress}
                onFileSelect={handleFileSelect}
                onRemoveFile={removeFile}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {currentStep < FORM_STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="min-w-[120px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isEditing ? 'Updating...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {isEditing ? 'Update Incident' : 'Submit Report'}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

// Step Components
function DangerousGoodsStep({ form, dangerousGoods }: { 
  form: any; 
  dangerousGoods: DangerousGood[]; 
}) {
  const { watch, setValue } = form;
  const currentDangerousGoods = watch('dangerous_goods') || [];

  const addDangerousGood = () => {
    setValue('dangerous_goods', [
      ...currentDangerousGoods,
      {
        dangerous_good_id: '',
        quantity_involved: 0,
        quantity_unit: 'L',
        packaging_type: '',
        release_amount: 0,
        containment_status: 'unknown',
      },
    ]);
  };

  const removeDangerousGood = (index: number) => {
    setValue(
      'dangerous_goods',
      currentDangerousGoods.filter((_: any, i: number) => i !== index)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Dangerous Goods Involved</h3>
          <p className="text-sm text-gray-600">
            Add any hazardous materials that were involved in this incident
          </p>
        </div>
        <Button type="button" onClick={addDangerousGood} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Dangerous Good
        </Button>
      </div>

      {currentDangerousGoods.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No dangerous goods added yet</p>
            <Button type="button" onClick={addDangerousGood} className="mt-2">
              Add First Dangerous Good
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {currentDangerousGoods.map((dg: any, index: number) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="font-medium">Dangerous Good #{index + 1}</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeDangerousGood(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Dangerous Good *</Label>
                    <Controller
                      name={`dangerous_goods.${index}.dangerous_good_id`}
                      control={form.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select dangerous good" />
                          </SelectTrigger>
                          <SelectContent>
                            {dangerousGoods.map((dg) => (
                              <SelectItem key={dg.id} value={dg.id}>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">{dg.un_number}</Badge>
                                  <span>{dg.proper_shipping_name}</span>
                                  <Badge className="ml-2">Class {dg.hazard_class}</Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Quantity Involved</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...form.register(`dangerous_goods.${index}.quantity_involved`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>

                  <div>
                    <Label>Unit</Label>
                    <Controller
                      name={`dangerous_goods.${index}.quantity_unit`}
                      control={form.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="L">Litres (L)</SelectItem>
                            <SelectItem value="kg">Kilograms (kg)</SelectItem>
                            <SelectItem value="units">Units</SelectItem>
                            <SelectItem value="m³">Cubic Metres (m³)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Packaging Type</Label>
                    <Input
                      {...form.register(`dangerous_goods.${index}.packaging_type`)}
                      placeholder="e.g., Drum, IBC, Bag"
                    />
                  </div>

                  <div>
                    <Label>Release Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...form.register(`dangerous_goods.${index}.release_amount`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Containment Status</Label>
                    <Controller
                      name={`dangerous_goods.${index}.containment_status`}
                      control={form.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contained">Fully Contained</SelectItem>
                            <SelectItem value="partial">Partially Contained</SelectItem>
                            <SelectItem value="released">Released to Environment</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function EmergencyResponseStep({ form }: { form: any }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-4">Emergency Response Actions</h3>
        <p className="text-sm text-gray-600 mb-6">
          Document the immediate response actions and notifications made
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-4">Response Timeline & Actions</h4>
          <div className="space-y-4">
            <div>
              <Label>Immediate Actions Taken</Label>
              <Textarea
                placeholder="Describe the immediate actions taken to address the incident..."
                rows={4}
              />
            </div>

            <div>
              <Label>Notifications Made</Label>
              <Textarea
                placeholder="List who was notified and when (e.g., Safety Officer at 10:30am, Emergency Services at 10:35am)..."
                rows={3}
              />
            </div>

            <div>
              <Label>Containment Measures</Label>
              <Textarea
                placeholder="Describe any containment or cleanup measures implemented..."
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentationStep({
  uploadingFiles,
  uploadProgress,
  onFileSelect,
  onRemoveFile,
}: {
  uploadingFiles: File[];
  uploadProgress: number;
  onFileSelect: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-4">Supporting Documentation</h3>
        <p className="text-sm text-gray-600 mb-6">
          Upload photos, reports, witness statements, or other relevant documents
        </p>
      </div>

      {/* File Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Upload Files</p>
              <p className="text-sm text-gray-600">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Supports: JPG, PNG, PDF, DOC, DOCX (Max 10MB each)
              </p>
            </div>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              onChange={(e) => onFileSelect(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Files to Upload ({uploadingFiles.length})</CardTitle>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <Progress value={uploadProgress} className="w-full" />
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {uploadingFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}