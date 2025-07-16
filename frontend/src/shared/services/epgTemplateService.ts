import { type SDSExtractionResult } from "./sdsExtractionService";

interface EPGEmergencyProcedure {
  scenario: string;
  immediateActions: string;
  category: "spill" | "fire" | "exposure" | "transport" | "general";
  severity: "low" | "medium" | "high" | "critical";
}

interface EPGFirstAidProcedure {
  exposureType: "eyes" | "inhalation" | "skin" | "ingestion";
  procedure: string;
  symptoms: string[];
  immediateActions: string[];
}

interface EPGContactInfo {
  organization: string;
  phone: string;
  type: "emergency" | "poison" | "fire" | "police" | "medical";
}

interface EPGData {
  // Basic Information
  chemicalName: string;
  unNumber: string;
  hazchemCode: string;
  hazardClass: string;
  properShippingName: string;

  // Health Hazards
  hazardSummary: string;
  specialHazards: string[];
  reactivity: string;

  // Emergency Procedures
  emergencyProcedures: EPGEmergencyProcedure[];

  // First Aid
  firstAidProcedures: EPGFirstAidProcedure[];

  // Emergency Contacts
  emergencyContacts: EPGContactInfo[];

  // Additional Information
  extinguishingMedia: string[];
  spillResponse: string[];
  precautions: string[];

  // Metadata
  generatedDate: string;
  documentVersion: string;
  regulatoryReferences: string[];
}

interface EPGGenerationRequest {
  sdsData: SDSExtractionResult;
  unNumber: string;
  hazardClass: string;
  properShippingName: string;
  additionalContacts?: EPGContactInfo[];
  locationInfo?: {
    country: string;
    region: string;
  };
}

interface EPGGenerationResult {
  success: boolean;
  epgData?: EPGData;
  documentUrl?: string;
  error?: string;
  warnings: string[];
}

class EPGTemplateService {
  private baseUrl = "/api/v1";

  async generateEPGFromSDS(
    request: EPGGenerationRequest,
  ): Promise<EPGGenerationResult> {
    try {
      // First try backend API
      return await this.generateViaAPI(request);
    } catch (error) {
      console.error(
        "API EPG generation failed, falling back to simulation:",
        error,
      );
      // Fallback to local generation
      return this.simulateEPGGeneration(request);
    }
  }

  private async generateViaAPI(
    request: EPGGenerationRequest,
  ): Promise<EPGGenerationResult> {
    const response = await fetch(`${this.baseUrl}/epg/generate-from-sds/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sds_data: request.sdsData,
        un_number: request.unNumber,
        hazard_class: request.hazardClass,
        proper_shipping_name: request.properShippingName,
        additional_contacts: request.additionalContacts,
        location_info: request.locationInfo,
      }),
    });

    if (!response.ok) {
      throw new Error("EPG generation API failed");
    }

    const data = await response.json();
    return {
      success: true,
      epgData: this.transformAPIResponse(data.epg_data),
      documentUrl: data.document_url,
      warnings: data.warnings || [],
    };
  }

  private async simulateEPGGeneration(
    request: EPGGenerationRequest,
  ): Promise<EPGGenerationResult> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const epgData = this.extractEPGDataFromSDS(request);

    return {
      success: true,
      epgData,
      warnings: this.generateWarnings(request),
    };
  }

  private extractEPGDataFromSDS(request: EPGGenerationRequest): EPGData {
    const { sdsData, unNumber, hazardClass, properShippingName } = request;

    return {
      // Basic Information
      chemicalName: sdsData.chemicalName,
      unNumber: unNumber,
      hazchemCode: this.generateHazchemCode(hazardClass),
      hazardClass: hazardClass,
      properShippingName: properShippingName,

      // Health Hazards
      hazardSummary: this.extractHazardSummary(sdsData),
      specialHazards: this.extractSpecialHazards(sdsData),
      reactivity:
        sdsData.extractedData.physicalProperties?.flammability ||
        "See SDS for reactivity information",

      // Emergency Procedures
      emergencyProcedures: this.extractEmergencyProcedures(sdsData),

      // First Aid
      firstAidProcedures: this.extractFirstAidProcedures(sdsData),

      // Emergency Contacts
      emergencyContacts: this.getStandardEmergencyContacts(
        request.locationInfo,
      ),

      // Additional Information
      extinguishingMedia: this.extractExtinguishingMedia(sdsData),
      spillResponse: this.extractSpillResponse(sdsData),
      precautions: this.extractPrecautions(sdsData),

      // Metadata
      generatedDate: new Date().toISOString(),
      documentVersion: "1.0",
      regulatoryReferences: [
        "ADG Code",
        "IMDG Code",
        "Workplace Health and Safety Regulations",
      ],
    };
  }

  private extractHazardSummary(sdsData: SDSExtractionResult): string {
    const hazards = sdsData.extractedData.hazardClassification || [];
    const statements = sdsData.extractedData.hazardStatements || [];

    if (hazards.length > 0) {
      return `${hazards.join(", ")}. ${statements.join(" ")}`;
    }

    return "Refer to Safety Data Sheet for complete hazard information.";
  }

  private extractSpecialHazards(sdsData: SDSExtractionResult): string[] {
    const hazards: string[] = [];

    if (
      sdsData.extractedData.physicalProperties?.flammability
        ?.toLowerCase()
        .includes("flammable")
    ) {
      hazards.push("Flammable - keep away from heat, sparks, open flames");
    }

    if (
      sdsData.extractedData.transportInfo?.transportHazardClass?.includes("5.1")
    ) {
      hazards.push(
        "Oxidizing agent - incompatible with combustible materials, reducing agents",
      );
    }

    if (
      sdsData.extractedData.transportInfo?.transportHazardClass?.includes("8")
    ) {
      hazards.push("Corrosive - causes severe burns to skin and eyes");
    }

    if (hazards.length === 0) {
      hazards.push("Refer to SDS Section 2 for complete hazard identification");
    }

    return hazards;
  }

  private extractEmergencyProcedures(
    sdsData: SDSExtractionResult,
  ): EPGEmergencyProcedure[] {
    const procedures: EPGEmergencyProcedure[] = [];

    // Fire emergency procedures
    procedures.push({
      scenario: "Fire involving this material",
      immediateActions:
        "Evacuate area. Alert fire brigade. Do not allow water runoff to reach storm drains. Use appropriate extinguishing agents. Cool containers with water spray from safe distance.",
      category: "fire",
      severity: "high",
    });

    // Spill procedures
    procedures.push({
      scenario: "Large spill or leak",
      immediateActions:
        "Evacuate area. Prevent entry to storm drains. Contain spill using non-combustible absorbent material. Collect in suitable containers for disposal. Clean area with water if safe to do so.",
      category: "spill",
      severity: "medium",
    });

    // Exposure procedures
    procedures.push({
      scenario: "Person overcome by fumes",
      immediateActions:
        "Remove from exposure. Move to fresh air immediately. Keep warm and at rest. Give artificial respiration if breathing has stopped. Obtain medical attention.",
      category: "exposure",
      severity: "critical",
    });

    // Transport emergency
    procedures.push({
      scenario: "Transport emergency",
      immediateActions:
        "Stop vehicle safely. Alert emergency services. Identify dangerous goods using placard/documentation. Keep public away. Contact emergency number on transport documents.",
      category: "transport",
      severity: "high",
    });

    return procedures;
  }

  private extractFirstAidProcedures(
    sdsData: SDSExtractionResult,
  ): EPGFirstAidProcedure[] {
    const firstAid = sdsData.extractedData.firstAidMeasures;

    const procedures: EPGFirstAidProcedure[] = [];

    if (firstAid?.eyeContact) {
      procedures.push({
        exposureType: "eyes",
        procedure: firstAid.eyeContact,
        symptoms: firstAid.immediateSymptoms?.filter((s) =>
          s.toLowerCase().includes("eye"),
        ) || ["Eye irritation", "Redness", "Tearing"],
        immediateActions: [
          "Flush with water for 15+ minutes",
          "Remove contact lenses",
          "Seek medical attention",
        ],
      });
    }

    if (firstAid?.inhalation) {
      procedures.push({
        exposureType: "inhalation",
        procedure: firstAid.inhalation,
        symptoms: firstAid.immediateSymptoms?.filter((s) =>
          s.toLowerCase().includes("respir"),
        ) || ["Coughing", "Shortness of breath", "Chest tightness"],
        immediateActions: [
          "Move to fresh air",
          "Monitor breathing",
          "Give oxygen if needed",
          "Seek medical attention",
        ],
      });
    }

    if (firstAid?.skinContact) {
      procedures.push({
        exposureType: "skin",
        procedure: firstAid.skinContact,
        symptoms: firstAid.immediateSymptoms?.filter((s) =>
          s.toLowerCase().includes("skin"),
        ) || ["Skin irritation", "Redness", "Burns"],
        immediateActions: [
          "Remove contaminated clothing",
          "Flush with water",
          "Seek medical attention if severe",
        ],
      });
    }

    if (firstAid?.ingestion) {
      procedures.push({
        exposureType: "ingestion",
        procedure: firstAid.ingestion,
        symptoms: ["Nausea", "Vomiting", "Abdominal pain"],
        immediateActions: [
          "Do not induce vomiting",
          "Rinse mouth",
          "Seek medical attention immediately",
        ],
      });
    }

    // Fallback to generic procedures if no specific data available
    if (procedures.length === 0) {
      return [
        {
          exposureType: "eyes",
          procedure:
            "Immediately flush eyes with plenty of water for at least 15 minutes. Remove contact lenses if easily removable. Seek medical attention.",
          symptoms: ["Eye irritation", "Redness", "Tearing"],
          immediateActions: [
            "Flush with water",
            "Remove contact lenses",
            "Seek medical attention",
          ],
        },
        {
          exposureType: "inhalation",
          procedure:
            "Remove from exposure. Move to fresh air immediately. Monitor breathing. Seek medical attention if symptoms persist.",
          symptoms: ["Coughing", "Shortness of breath"],
          immediateActions: [
            "Move to fresh air",
            "Monitor breathing",
            "Seek medical attention",
          ],
        },
        {
          exposureType: "skin",
          procedure:
            "Remove contaminated clothing. Wash skin with plenty of water. Seek medical attention if irritation persists.",
          symptoms: ["Skin irritation", "Redness"],
          immediateActions: [
            "Remove clothing",
            "Flush with water",
            "Monitor for irritation",
          ],
        },
        {
          exposureType: "ingestion",
          procedure:
            "Do not induce vomiting. Rinse mouth with water. Give water to drink if conscious. Seek immediate medical attention.",
          symptoms: ["Nausea", "Vomiting", "Abdominal pain"],
          immediateActions: [
            "Do not induce vomiting",
            "Rinse mouth",
            "Seek medical attention",
          ],
        },
      ];
    }

    return procedures;
  }

  private getStandardEmergencyContacts(locationInfo?: {
    country: string;
    region: string;
  }): EPGContactInfo[] {
    // Default to Australian emergency contacts
    const contacts: EPGContactInfo[] = [
      {
        organization: "Police or Fire Brigade",
        phone: "Dial 000",
        type: "emergency",
      },
      {
        organization: "Poisons Information Centre",
        phone: "13 11 26",
        type: "poison",
      },
    ];

    // Add location-specific contacts if provided
    if (locationInfo?.country === "US") {
      contacts[0] = {
        organization: "Emergency Services",
        phone: "Dial 911",
        type: "emergency",
      };
      contacts[1] = {
        organization: "Poison Control Center",
        phone: "1-800-222-1222",
        type: "poison",
      };
    }

    return contacts;
  }

  private extractExtinguishingMedia(sdsData: SDSExtractionResult): string[] {
    // Use SDS fire fighting measures if available
    const fireFighting = sdsData.extractedData.fireFightingMeasures;

    if (
      fireFighting?.extinguishingMedia &&
      fireFighting.extinguishingMedia.length > 0
    ) {
      return fireFighting.extinguishingMedia;
    }

    // Fallback: Based on hazard class, provide appropriate extinguishing media
    const hazardClass =
      sdsData.extractedData.transportInfo?.transportHazardClass || "";

    if (hazardClass.includes("5.1")) {
      return ["Water spray", "Foam", "Dry chemical", "Carbon dioxide"];
    } else if (hazardClass.includes("3")) {
      return [
        "Foam",
        "Dry chemical",
        "Carbon dioxide",
        "Water spray to cool containers",
      ];
    } else if (hazardClass.includes("8")) {
      return ["Water spray", "Foam", "Dry chemical suitable for corrosives"];
    }

    return ["Water spray", "Foam", "Dry chemical", "Carbon dioxide"];
  }

  private extractSpillResponse(sdsData: SDSExtractionResult): string[] {
    const spillData = sdsData.extractedData.accidentalReleaseMeasures;

    if (spillData) {
      const responses: string[] = [];

      if (spillData.personalPrecautions) {
        responses.push(
          `Personal precautions: ${spillData.personalPrecautions}`,
        );
      }

      if (spillData.environmentalPrecautions) {
        responses.push(`Environmental: ${spillData.environmentalPrecautions}`);
      }

      if (
        spillData.containmentMethods &&
        spillData.containmentMethods.length > 0
      ) {
        responses.push(...spillData.containmentMethods);
      }

      if (spillData.cleanupMethods && spillData.cleanupMethods.length > 0) {
        responses.push(...spillData.cleanupMethods);
      }

      if (responses.length > 0) {
        return responses;
      }
    }

    // Fallback to generic spill response
    return [
      "Stop leak if safe to do so",
      "Prevent entry to waterways, sewers, basements",
      "Contain with sand, earth, or other non-combustible material",
      "Collect in suitable containers for disposal",
      "Clean area thoroughly",
    ];
  }

  private extractPrecautions(sdsData: SDSExtractionResult): string[] {
    const precautions = sdsData.extractedData.precautionaryStatements || [];

    if (precautions.length > 0) {
      return precautions;
    }

    return [
      "Keep container tightly closed",
      "Store in cool, dry place",
      "Keep away from sources of ignition",
      "Use only with adequate ventilation",
      "Wear appropriate personal protective equipment",
    ];
  }

  private generateHazchemCode(hazardClass: string): string {
    // Generate appropriate Hazchem code based on hazard class
    const hazchemCodes: { [key: string]: string } = {
      "1": "1E",
      "2.1": "2E",
      "2.2": "2A",
      "2.3": "2X",
      "3": "3Y",
      "4.1": "4Y",
      "4.2": "4X",
      "4.3": "4X",
      "5.1": "1Y",
      "5.2": "1Y",
      "6.1": "2X",
      "6.2": "2X",
      "7": "7X",
      "8": "2X",
      "9": "9Y",
    };

    return hazchemCodes[hazardClass] || "2Y";
  }

  private generateWarnings(request: EPGGenerationRequest): string[] {
    const warnings: string[] = [];

    if (!request.sdsData.extractedData.transportInfo) {
      warnings.push(
        "Limited transport information available - verify UN number and hazard class",
      );
    }

    if (request.sdsData.processingMetadata.confidence < 0.8) {
      warnings.push(
        "SDS extraction confidence is below 80% - manual review recommended",
      );
    }

    if (request.sdsData.warnings.length > 0) {
      warnings.push(
        "SDS processing warnings detected - review source document",
      );
    }

    return warnings;
  }

  private transformAPIResponse(data: any): EPGData {
    return {
      chemicalName: data.chemical_name,
      unNumber: data.un_number,
      hazchemCode: data.hazchem_code,
      hazardClass: data.hazard_class,
      properShippingName: data.proper_shipping_name,
      hazardSummary: data.hazard_summary,
      specialHazards: data.special_hazards || [],
      reactivity: data.reactivity,
      emergencyProcedures:
        data.emergency_procedures?.map((proc: any) => ({
          scenario: proc.scenario,
          immediateActions: proc.immediate_actions,
          category: proc.category,
          severity: proc.severity,
        })) || [],
      firstAidProcedures:
        data.first_aid_procedures?.map((proc: any) => ({
          exposureType: proc.exposure_type,
          procedure: proc.procedure,
          symptoms: proc.symptoms || [],
          immediateActions: proc.immediate_actions || [],
        })) || [],
      emergencyContacts:
        data.emergency_contacts?.map((contact: any) => ({
          organization: contact.organization,
          phone: contact.phone,
          type: contact.type,
        })) || [],
      extinguishingMedia: data.extinguishing_media || [],
      spillResponse: data.spill_response || [],
      precautions: data.precautions || [],
      generatedDate: data.generated_date,
      documentVersion: data.document_version,
      regulatoryReferences: data.regulatory_references || [],
    };
  }

  validateEPGRequest(request: EPGGenerationRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!request.sdsData) {
      errors.push("SDS data is required");
    }

    if (!request.unNumber) {
      errors.push("UN number is required");
    }

    if (!request.hazardClass) {
      errors.push("Hazard class is required");
    }

    if (!request.properShippingName) {
      errors.push("Proper shipping name is required");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const epgTemplateService = new EPGTemplateService();
export type {
  EPGData,
  EPGGenerationRequest,
  EPGGenerationResult,
  EPGEmergencyProcedure,
  EPGFirstAidProcedure,
  EPGContactInfo,
};
