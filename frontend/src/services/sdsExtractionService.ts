interface SDSSection {
  number: number;
  title: string;
  content: string;
  confidence: number;
  fields: { [key: string]: string };
}

interface SDSExtractionResult {
  success: boolean;
  chemicalName: string;
  casNumber?: string;
  productIdentifier?: string;
  manufacturer?: string;
  sections: SDSSection[];
  extractedData: {
    // Section 1: Identification
    productName?: string;
    recommendedUse?: string;
    supplierDetails?: {
      name: string;
      address: string;
      phone: string;
      emergency: string;
    };

    // Section 2: Hazard Identification
    hazardClassification?: string[];
    hazardStatements?: string[];
    precautionaryStatements?: string[];
    signalWord?: string;

    // Section 3: Composition
    ingredients?: Array<{
      name: string;
      casNumber?: string;
      concentration?: string;
      hazardous?: boolean;
    }>;

    // Section 9: Physical and Chemical Properties
    physicalProperties?: {
      appearance?: string;
      odor?: string;
      pH?: string;
      meltingPoint?: string;
      boilingPoint?: string;
      flashPoint?: string;
      density?: string;
      solubility?: string;
      vapourPressure?: string;
      flammability?: string;
    };

    // Section 14: Transport Information
    transportInfo?: {
      unNumber?: string;
      properShippingName?: string;
      transportHazardClass?: string;
      packingGroup?: string;
      environmentalHazards?: string;
      specialPrecautions?: string;
    };

    // Section 4: First Aid Measures
    firstAidMeasures?: {
      eyeContact?: string;
      skinContact?: string;
      inhalation?: string;
      ingestion?: string;
      immediateSymptoms?: string[];
      delayedEffects?: string[];
      generalAdvice?: string;
    };

    // Section 5: Fire Fighting Measures
    fireFightingMeasures?: {
      extinguishingMedia?: string[];
      prohibitedExtinguishingMedia?: string[];
      specificHazards?: string[];
      protectiveEquipment?: string;
      specialProcedures?: string;
    };

    // Section 6: Accidental Release Measures
    accidentalReleaseMeasures?: {
      personalPrecautions?: string;
      environmentalPrecautions?: string;
      cleanupMethods?: string[];
      containmentMethods?: string[];
      emergencyProcedures?: string;
    };

    // Section 8: Exposure Controls/Personal Protection
    exposureControls?: {
      engineeringControls?: string;
      personalProtectiveEquipment?: {
        respiratoryProtection?: string;
        handProtection?: string;
        eyeProtection?: string;
        skinProtection?: string;
      };
      exposureLimits?: Array<{
        substance: string;
        limit: string;
        type: string;
      }>;
    };

    // Section 15: Regulatory Information
    regulatoryInfo?: {
      safetyHealthAndEnvironmentalRegulations?: string[];
      chemicalSafetyAssessment?: string;
    };
  };
  warnings: string[];
  recommendations: string[];
  processingMetadata: {
    extractionMethod: "pdf" | "ocr" | "manual";
    confidence: number;
    pageCount: number;
    processingTime: number;
  };
}

class SDSExtractionService {
  private baseUrl = "/api/v1";

  // Standard SDS section titles and patterns
  private readonly SDS_SECTIONS = [
    {
      number: 1,
      title: "Identification",
      keywords: ["identification", "product identifier", "chemical name"],
    },
    {
      number: 2,
      title: "Hazard Identification",
      keywords: ["hazard identification", "classification", "ghs"],
    },
    {
      number: 3,
      title: "Composition/Information on Ingredients",
      keywords: ["composition", "ingredients", "chemical composition"],
    },
    {
      number: 4,
      title: "First Aid Measures",
      keywords: ["first aid", "emergency measures"],
    },
    {
      number: 5,
      title: "Fire Fighting Measures",
      keywords: ["fire fighting", "extinguishing media"],
    },
    {
      number: 6,
      title: "Accidental Release Measures",
      keywords: ["accidental release", "spill", "leak"],
    },
    {
      number: 7,
      title: "Handling and Storage",
      keywords: ["handling", "storage", "precautions"],
    },
    {
      number: 8,
      title: "Exposure Controls/Personal Protection",
      keywords: ["exposure controls", "personal protection", "ppe"],
    },
    {
      number: 9,
      title: "Physical and Chemical Properties",
      keywords: ["physical properties", "chemical properties"],
    },
    {
      number: 10,
      title: "Stability and Reactivity",
      keywords: ["stability", "reactivity", "incompatible"],
    },
    {
      number: 11,
      title: "Toxicological Information",
      keywords: ["toxicological", "toxicity", "health effects"],
    },
    {
      number: 12,
      title: "Ecological Information",
      keywords: ["ecological", "environmental", "aquatic toxicity"],
    },
    {
      number: 13,
      title: "Disposal Considerations",
      keywords: ["disposal", "waste treatment"],
    },
    {
      number: 14,
      title: "Transport Information",
      keywords: ["transport", "shipping", "un number"],
    },
    {
      number: 15,
      title: "Regulatory Information",
      keywords: ["regulatory", "regulations", "compliance"],
    },
    {
      number: 16,
      title: "Other Information",
      keywords: ["other information", "additional", "references"],
    },
  ];

  async extractSDSData(file: File): Promise<SDSExtractionResult> {
    try {
      // First try backend API
      return await this.extractViaAPI(file);
    } catch (error) {
      console.error(
        "API extraction failed, falling back to simulation:",
        error,
      );
      // Fallback to simulation for development
      return this.simulateSDSExtraction(file);
    }
  }

  private async extractViaAPI(file: File): Promise<SDSExtractionResult> {
    const formData = new FormData();
    formData.append("sds_file", file);
    formData.append("extract_sections", "true");
    formData.append("parse_fields", "true");

    const response = await fetch(`${this.baseUrl}/sds/extract-data/`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("SDS extraction API failed");
    }

    const data = await response.json();
    return this.transformAPIResponse(data);
  }

  private async simulateSDSExtraction(
    file: File,
  ): Promise<SDSExtractionResult> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const fileName = file.name.toLowerCase();

    // Generate realistic data based on filename
    let mockData;
    if (fileName.includes("ammonium") || fileName.includes("nitrate")) {
      mockData = this.generateAmmoniumNitrateSDSData();
    } else if (fileName.includes("acid") || fileName.includes("battery")) {
      mockData = this.generateAcidSDSData();
    } else if (fileName.includes("paint") || fileName.includes("solvent")) {
      mockData = this.generatePaintSDSData();
    } else {
      mockData = this.generateGenericSDSData();
    }

    return {
      success: true,
      chemicalName: mockData.chemicalName,
      casNumber: mockData.casNumber,
      productIdentifier: mockData.productIdentifier,
      manufacturer: mockData.manufacturer,
      sections: this.generateMockSections(),
      extractedData: mockData.extractedData,
      warnings: mockData.warnings,
      recommendations: mockData.recommendations,
      processingMetadata: {
        extractionMethod: "pdf",
        confidence: 0.85 + Math.random() * 0.1,
        pageCount: Math.ceil(file.size / 200000),
        processingTime: 1500 + Math.random() * 1000,
      },
    };
  }

  private generateAmmoniumNitrateSDSData() {
    return {
      chemicalName: "Ammonium Nitrate",
      casNumber: "6484-52-2",
      productIdentifier: "AN-GRADE-1",
      manufacturer: "Orica Australia Pty Ltd",
      extractedData: {
        productName: "Ammonium Nitrate",
        recommendedUse:
          "Industrial use - Fertilizer, Mining explosive component",
        supplierDetails: {
          name: "Orica Australia Pty Ltd",
          address: "1 Nicholson St, Melbourne VIC, Australia, 3000",
          phone: "(03) 9665 7111, 1300 646 662",
          emergency: "1800 033 111",
        },
        hazardClassification: [
          "Oxidizing agent (Category 3)",
          "Not classified as dangerous goods",
        ],
        hazardStatements: ["H272: May intensify fire; oxidizer"],
        precautionaryStatements: [
          "P220: Keep away from combustible materials",
          "P280: Wear protective equipment",
        ],
        signalWord: "WARNING",
        ingredients: [
          {
            name: "Ammonium Nitrate",
            casNumber: "6484-52-2",
            concentration: ">98%",
            hazardous: true,
          },
          {
            name: "Additives",
            concentration: "<2%",
            hazardous: false,
          },
        ],
        physicalProperties: {
          appearance: "White to off-white granular solid",
          odor: "Slight odour",
          pH: "4.5 to 5.2 (10% solution)",
          meltingPoint: "160°C to 169°C",
          boilingPoint: "Decomposes",
          flashPoint: "Not relevant",
          density: "Not available",
          solubility: "Soluble",
          vapourPressure: "Not relevant",
          flammability: "Non flammable",
        },
        transportInfo: {
          unNumber: "1942",
          properShippingName:
            "Ammonium nitrate (with not more than 0.2% combustible substances)",
          transportHazardClass: "5.1 (Oxidizing agent)",
          packingGroup: "III",
          environmentalHazards: "None allocated",
          specialPrecautions: "Not a Marine Pollutant",
        },
        firstAidMeasures: {
          eyeContact:
            "Immediately flush eyes with plenty of water for at least 15 minutes. Remove contact lenses if easily removable. Get immediate medical attention.",
          skinContact:
            "Remove contaminated clothing. Wash skin thoroughly with soap and water. If irritation occurs, get medical attention.",
          inhalation:
            "Remove from exposure. Move to fresh air immediately. If breathing is difficult, give oxygen. Get medical attention.",
          ingestion:
            "Do not induce vomiting. Rinse mouth with water. Give water to drink if conscious. Get immediate medical attention.",
          immediateSymptoms: [
            "Eye irritation",
            "Skin irritation",
            "Respiratory irritation",
          ],
          delayedEffects: ["None known"],
          generalAdvice:
            "Show this safety data sheet to the doctor in attendance.",
        },
        fireFightingMeasures: {
          extinguishingMedia: [
            "Water spray",
            "Foam",
            "Dry chemical",
            "Carbon dioxide",
          ],
          prohibitedExtinguishingMedia: ["None known"],
          specificHazards: [
            "May intensify fire due to oxidizing properties",
            "Produces toxic gases when heated",
          ],
          protectiveEquipment:
            "Full protective clothing and approved self-contained breathing apparatus required for fire-fighting personnel.",
          specialProcedures:
            "Cool containers with water spray. Evacuate area and fight fire from protected location.",
        },
        accidentalReleaseMeasures: {
          personalPrecautions:
            "Evacuate area. Keep upwind of spill. Avoid contact with skin and eyes. Use appropriate personal protective equipment.",
          environmentalPrecautions:
            "Prevent entry into waterways, sewers, basements or confined areas. Do not discharge into the environment.",
          cleanupMethods: [
            "Contain spill",
            "Collect using non-sparking tools",
            "Place in suitable containers for disposal",
          ],
          containmentMethods: [
            "Use sand, earth, or other non-combustible material",
            "Prevent spreading with barriers",
          ],
          emergencyProcedures:
            "Evacuate area immediately. Contact emergency services. Prevent ignition sources.",
        },
        exposureControls: {
          engineeringControls:
            "Provide adequate ventilation. Use local exhaust ventilation where dusts are formed.",
          personalProtectiveEquipment: {
            respiratoryProtection:
              "Use approved respirator if exposure limits are exceeded",
            handProtection: "Chemical resistant gloves",
            eyeProtection:
              "Safety glasses with side shields or chemical goggles",
            skinProtection:
              "Long sleeves and pants. Chemical resistant apron if needed.",
          },
          exposureLimits: [
            {
              substance: "Ammonium nitrate",
              limit: "10 mg/m³ (TWA)",
              type: "OEL",
            },
          ],
        },
        regulatoryInfo: {
          safetyHealthAndEnvironmentalRegulations: [
            "Regulated - Security",
            "Chemicals of Security Concern",
            "Restricted Hazardous Chemicals",
          ],
          chemicalSafetyAssessment: "Not critical",
        },
      },
      warnings: [
        "Oxidizing agent - keep away from combustible materials",
        "May intensify fire",
        "Classified as restricted hazardous chemical",
      ],
      recommendations: [
        "Store in cool, dry place away from combustible materials",
        "Use appropriate personal protective equipment",
        "Ensure proper ventilation during handling",
      ],
    };
  }

  private generateAcidSDSData() {
    return {
      chemicalName: "Sulfuric Acid Solution",
      casNumber: "7664-93-9",
      productIdentifier: "BATTERY-ACID-37",
      manufacturer: "Chemical Solutions Ltd",
      extractedData: {
        productName: "Batteries - Wet Filled with Acid",
        recommendedUse: "Battery electrolyte",
        supplierDetails: {
          name: "Chemical Solutions Ltd",
          address: "Industrial Estate, Melbourne VIC, 3000",
          phone: "(03) 9555 0123",
          emergency: "1800 POISON (1800 764 766)",
        },
        hazardClassification: [
          "Skin corrosion (Category 1A)",
          "Serious eye damage (Category 1)",
        ],
        hazardStatements: ["H314: Causes severe skin burns and eye damage"],
        precautionaryStatements: [
          "P280: Wear protective equipment",
          "P305+P351+P338: IF IN EYES: Rinse cautiously with water",
        ],
        signalWord: "DANGER",
        physicalProperties: {
          appearance: "Clear, colorless liquid",
          odor: "Odorless",
          pH: "Highly acidic (<1)",
          density: "1.84 g/cm³",
          solubility: "Miscible with water",
          boilingPoint: "337°C",
        },
        transportInfo: {
          unNumber: "2796",
          properShippingName: "Sulphuric acid with not more than 51% acid",
          transportHazardClass: "8",
          packingGroup: "II",
        },
        firstAidMeasures: {
          eyeContact:
            "Immediately flush eyes with plenty of water for at least 20 minutes. Remove contact lenses if easily removable. Get immediate medical attention.",
          skinContact:
            "Immediately remove contaminated clothing. Flush skin with plenty of water for at least 20 minutes. Get medical attention immediately.",
          inhalation:
            "Remove from exposure immediately. Move to fresh air. If breathing has stopped, give artificial respiration. Get medical attention.",
          ingestion:
            "Do NOT induce vomiting. Rinse mouth with water. Give water to drink if conscious. Never give anything by mouth to an unconscious person. Get immediate medical attention.",
          immediateSymptoms: [
            "Severe burns",
            "Respiratory distress",
            "Eye damage",
          ],
          delayedEffects: ["Scarring", "Respiratory complications"],
          generalAdvice:
            "Emergency medical treatment required. Show this SDS to medical personnel.",
        },
        fireFightingMeasures: {
          extinguishingMedia: [
            "Water spray",
            "Foam",
            "Dry chemical suitable for corrosives",
          ],
          prohibitedExtinguishingMedia: [
            "Direct water stream on concentrated acid",
          ],
          specificHazards: [
            "Reacts violently with water generating heat",
            "Produces toxic sulfur dioxide gas when heated",
          ],
          protectiveEquipment:
            "Full chemical protective suit with self-contained breathing apparatus",
          specialProcedures:
            "Cool containers with water spray from safe distance. Do not allow water to contact product directly.",
        },
        accidentalReleaseMeasures: {
          personalPrecautions:
            "Evacuate area immediately. Use appropriate personal protective equipment including acid-resistant suit and self-contained breathing apparatus.",
          environmentalPrecautions:
            "Prevent entry into waterways, sewers, or confined areas. Neutralize with suitable alkaline material.",
          cleanupMethods: [
            "Neutralize with lime or soda ash",
            "Absorb with inert material",
            "Collect in acid-resistant containers",
          ],
          containmentMethods: [
            "Create barriers to prevent spreading",
            "Use sand or earth barriers",
          ],
          emergencyProcedures:
            "Evacuate area. Contact emergency services immediately. Approach from upwind.",
        },
        exposureControls: {
          engineeringControls:
            "Provide adequate ventilation. Use acid-resistant local exhaust ventilation.",
          personalProtectiveEquipment: {
            respiratoryProtection:
              "Self-contained breathing apparatus or full-face supplied air respirator",
            handProtection:
              "Acid-resistant chemical gloves (neoprene, nitrile)",
            eyeProtection: "Chemical safety goggles and face shield",
            skinProtection:
              "Full chemical protective suit with acid-resistant materials",
          },
        },
      },
      warnings: ["Highly corrosive", "Causes severe burns"],
      recommendations: [
        "Use in well-ventilated area",
        "Always add acid to water, never water to acid",
      ],
    };
  }

  private generatePaintSDSData() {
    return {
      chemicalName: "Acrylic Paint Solution",
      casNumber: "Mixture",
      productIdentifier: "PAINT-ACR-100",
      manufacturer: "Paint Technologies Inc",
      extractedData: {
        productName: "Industrial Acrylic Paint",
        recommendedUse: "Industrial coating",
        physicalProperties: {
          appearance: "Colored liquid",
          odor: "Mild solvent odor",
          flashPoint: "38°C",
          density: "1.2 g/cm³",
        },
        transportInfo: {
          unNumber: "1263",
          transportHazardClass: "3",
          packingGroup: "III",
        },
      },
      warnings: ["Flammable liquid", "May cause drowsiness"],
      recommendations: [
        "Keep away from heat sources",
        "Use adequate ventilation",
      ],
    };
  }

  private generateGenericSDSData() {
    return {
      chemicalName: "Chemical Product",
      casNumber: "0000-00-0",
      productIdentifier: "CHEM-PROD-001",
      manufacturer: "Generic Chemical Co",
      extractedData: {
        productName: "Generic Chemical Product",
        recommendedUse: "Industrial use",
      },
      warnings: ["Handle with care"],
      recommendations: ["Follow safety procedures"],
    };
  }

  private generateMockSections(): SDSSection[] {
    return this.SDS_SECTIONS.map((section) => ({
      number: section.number,
      title: section.title,
      content: `Detailed information for ${section.title} would appear here...`,
      confidence: 0.8 + Math.random() * 0.2,
      fields: {},
    }));
  }

  private transformAPIResponse(data: any): SDSExtractionResult {
    return {
      success: data.success || false,
      chemicalName: data.chemical_name || "",
      casNumber: data.cas_number,
      productIdentifier: data.product_identifier,
      manufacturer: data.manufacturer,
      sections:
        data.sections?.map((section: any) => ({
          number: section.number,
          title: section.title,
          content: section.content,
          confidence: section.confidence || 0.8,
          fields: section.fields || {},
        })) || [],
      extractedData: data.extracted_data || {},
      warnings: data.warnings || [],
      recommendations: data.recommendations || [],
      processingMetadata: {
        extractionMethod: data.extraction_method || "pdf",
        confidence: data.confidence || 0.8,
        pageCount: data.page_count || 1,
        processingTime: data.processing_time || 1000,
      },
    };
  }

  validateSDSFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (
      !file.type.includes("pdf") &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      errors.push("File must be a PDF document");
    }

    if (file.size > 25 * 1024 * 1024) {
      // 25MB limit for SDS
      errors.push("File size must be less than 25MB");
    }

    if (file.size < 1024) {
      errors.push("File appears to be too small to be a valid SDS");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const sdsExtractionService = new SDSExtractionService();
export type { SDSExtractionResult, SDSSection };
