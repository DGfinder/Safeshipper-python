// components/epg/EPGTemplateSelectionDialog.tsx
"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { 
  Shield, 
  FileText, 
  Zap, 
  AlertTriangle, 
  Flame, 
  Droplets, 
  Skull, 
  Activity,
  Beaker,
  Package
} from "lucide-react";
import { useCreateEPGFromTemplate } from "@/shared/hooks/useEPG";

interface EPGTemplateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const hazardClassTemplates = [
  {
    class: "1",
    title: "Class 1 - Explosives",
    description: "Materials that can explode under certain conditions",
    icon: Zap,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    examples: ["TNT", "Fireworks", "Ammunition", "Blasting caps"],
    emergencyTypes: ["FIRE", "EXPLOSION", "TRANSPORT_ACCIDENT"],
    riskLevel: "CRITICAL"
  },
  {
    class: "2",
    title: "Class 2 - Gases",
    description: "Compressed, liquefied, or dissolved gases",
    icon: Package,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    examples: ["Oxygen", "Propane", "Chlorine", "Helium"],
    emergencyTypes: ["FIRE", "SPILL", "EXPOSURE"],
    riskLevel: "HIGH"
  },
  {
    class: "3",
    title: "Class 3 - Flammable Liquids",
    description: "Liquids with low flashpoint temperatures",
    icon: Flame,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    examples: ["Gasoline", "Alcohol", "Acetone", "Paint thinner"],
    emergencyTypes: ["FIRE", "SPILL", "ENVIRONMENTAL"],
    riskLevel: "HIGH"
  },
  {
    class: "4",
    title: "Class 4 - Flammable Solids",
    description: "Solids that are readily combustible",
    icon: Flame,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    examples: ["Matches", "Sulfur", "Magnesium", "White phosphorus"],
    emergencyTypes: ["FIRE", "SPILL", "EXPOSURE"],
    riskLevel: "MEDIUM"
  },
  {
    class: "5",
    title: "Class 5 - Oxidizing Substances",
    description: "Materials that can cause or enhance combustion",
    icon: Beaker,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    examples: ["Hydrogen peroxide", "Potassium permanganate", "Nitrates"],
    emergencyTypes: ["FIRE", "SPILL", "EXPOSURE"],
    riskLevel: "HIGH"
  },
  {
    class: "6",
    title: "Class 6 - Toxic Substances",
    description: "Materials poisonous to humans and animals",
    icon: Skull,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    examples: ["Pesticides", "Cyanides", "Arsenic compounds"],
    emergencyTypes: ["EXPOSURE", "SPILL", "ENVIRONMENTAL"],
    riskLevel: "CRITICAL"
  },
  {
    class: "7",
    title: "Class 7 - Radioactive Materials",
    description: "Materials that emit ionizing radiation",
    icon: Activity,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    examples: ["Uranium", "Medical isotopes", "Industrial sources"],
    emergencyTypes: ["EXPOSURE", "TRANSPORT_ACCIDENT", "ENVIRONMENTAL"],
    riskLevel: "CRITICAL"
  },
  {
    class: "8",
    title: "Class 8 - Corrosive Substances",
    description: "Materials that can destroy living tissue or metals",
    icon: Droplets,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    examples: ["Sulfuric acid", "Sodium hydroxide", "Battery acid"],
    emergencyTypes: ["SPILL", "EXPOSURE", "ENVIRONMENTAL"],
    riskLevel: "HIGH"
  },
  {
    class: "9",
    title: "Class 9 - Miscellaneous Dangerous Goods",
    description: "Materials with hazards not covered by other classes",
    icon: FileText,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    examples: ["Dry ice", "Lithium batteries", "Asbestos", "Magnetized materials"],
    emergencyTypes: ["TRANSPORT_ACCIDENT", "EXPOSURE", "ENVIRONMENTAL"],
    riskLevel: "MEDIUM"
  }
];

const getRiskLevelColor = (riskLevel: string) => {
  switch (riskLevel) {
    case "CRITICAL":
      return "bg-red-100 text-red-800";
    case "HIGH":
      return "bg-orange-100 text-orange-800";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800";
    case "LOW":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const EPGTemplateSelectionDialog: React.FC<EPGTemplateSelectionDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const createFromTemplate = useCreateEPGFromTemplate();

  const handleCreateFromTemplate = async (hazardClass: string) => {
    try {
      await createFromTemplate.mutateAsync({ hazard_class: hazardClass });
      onSuccess?.();
      onOpenChange(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Failed to create EPG from template:", error);
    }
  };

  const handleTemplateSelect = (hazardClass: string) => {
    setSelectedTemplate(hazardClass);
  };

  const selectedTemplateData = hazardClassTemplates.find(t => t.class === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Create EPG from Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Select a hazard class to create a new Emergency Procedure Guide with pre-filled template content based on regulatory standards and best practices.
            </AlertDescription>
          </Alert>

          {!selectedTemplate ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hazardClassTemplates.map((template) => {
                const IconComponent = template.icon;
                return (
                  <Card 
                    key={template.class}
                    className={`cursor-pointer transition-all hover:shadow-md border-2 ${template.borderColor} ${template.bgColor}`}
                    onClick={() => handleTemplateSelect(template.class)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${template.bgColor}`}>
                            <IconComponent className={`h-5 w-5 ${template.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-medium">
                              Class {template.class}
                            </CardTitle>
                            <Badge className={getRiskLevelColor(template.riskLevel)} variant="outline">
                              {template.riskLevel}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {template.title}
                      </h3>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-gray-600 mb-3">
                        {template.description}
                      </p>
                      <div className="space-y-2">
                        <div>
                          <h4 className="text-xs font-medium text-gray-700 mb-1">Examples:</h4>
                          <div className="flex flex-wrap gap-1">
                            {template.examples.slice(0, 2).map((example) => (
                              <Badge key={example} variant="secondary" className="text-xs px-1 py-0">
                                {example}
                              </Badge>
                            ))}
                            {template.examples.length > 2 && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                +{template.examples.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-gray-700 mb-1">Emergency Types:</h4>
                          <div className="flex flex-wrap gap-1">
                            {template.emergencyTypes.map((type) => (
                              <Badge key={type} variant="outline" className="text-xs px-1 py-0">
                                {type.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            selectedTemplateData && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    ← Back to Templates
                  </Button>
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${selectedTemplateData.bgColor}`}>
                      <selectedTemplateData.icon className={`h-5 w-5 ${selectedTemplateData.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedTemplateData.title}</h3>
                      <Badge className={getRiskLevelColor(selectedTemplateData.riskLevel)}>
                        {selectedTemplateData.riskLevel} Risk
                      </Badge>
                    </div>
                  </div>
                </div>

                <Card className={`border-2 ${selectedTemplateData.borderColor}`}>
                  <CardHeader>
                    <CardTitle>Template Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-gray-600">{selectedTemplateData.description}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Common Materials</h4>
                        <div className="space-y-1">
                          {selectedTemplateData.examples.map((example) => (
                            <Badge key={example} variant="secondary" className="mr-1 mb-1">
                              {example}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Emergency Scenarios</h4>
                        <div className="space-y-1">
                          {selectedTemplateData.emergencyTypes.map((type) => (
                            <Badge key={type} variant="outline" className="mr-1 mb-1">
                              {type.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Alert className={selectedTemplateData.bgColor}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This template will create a new EPG with pre-filled procedures, isolation distances, 
                        and emergency contacts specific to {selectedTemplateData.title}. You can customize 
                        all content after creation.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleCreateFromTemplate(selectedTemplate)}
                    disabled={createFromTemplate.isPending}
                    className="flex items-center gap-2"
                  >
                    {createFromTemplate.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Creating EPG...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        Create EPG from Template
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};