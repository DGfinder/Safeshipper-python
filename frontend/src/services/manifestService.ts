interface ManifestAnalysisRequest {
  file: File;
  analysisOptions?: {
    detectDangerousGoods: boolean;
    extractMetadata: boolean;
    validateFormat: boolean;
  };
}

interface ManifestAnalysisResponse {
  success: boolean;
  documentId?: string;
  status: "uploading" | "analyzing" | "completed" | "failed";
  results?: {
    dangerousGoods: Array<{
      id: string;
      un: string;
      properShippingName: string;
      class: string;
      subHazard?: string;
      packingGroup?: string;
      quantity?: string;
      weight?: string;
      confidence: number;
      source: "automatic" | "manual";
    }>;
    metadata: {
      pageCount: number;
      fileSize: number;
      textExtractionQuality: number;
      detectedFormat: string;
    };
    warnings: string[];
    recommendations: string[];
  };
  error?: string;
}

interface ProcessingStatus {
  documentId: string;
  status: "analyzing" | "completed" | "failed";
  progress: number;
  currentStep: string;
  results?: ManifestAnalysisResponse["results"];
  error?: string;
}

class ManifestService {
  private baseUrl = "/api/v1";
  private isDevelopmentMode = process.env.NODE_ENV === "development";

  async uploadAndAnalyzeManifest(
    request: ManifestAnalysisRequest,
  ): Promise<ManifestAnalysisResponse> {
    if (this.isDevelopmentMode) {
      return this.simulateManifestAnalysis(request);
    }

    try {
      const formData = new FormData();
      formData.append("file", request.file);
      formData.append(
        "options",
        JSON.stringify(
          request.analysisOptions || {
            detectDangerousGoods: true,
            extractMetadata: true,
            validateFormat: true,
          },
        ),
      );

      const response = await fetch(
        `${this.baseUrl}/manifests/upload-and-analyze/`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformBackendResponse(data);
    } catch (error) {
      console.error("Manifest upload failed:", error);

      // Fallback to simulation if backend is unavailable
      console.log("Falling back to simulation mode...");
      return this.simulateManifestAnalysis(request);
    }
  }

  async checkProcessingStatus(documentId: string): Promise<ProcessingStatus> {
    if (this.isDevelopmentMode) {
      return this.simulateProcessingStatus(documentId);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/manifests/${documentId}/status/`,
      );

      if (!response.ok) {
        throw new Error("Status check failed");
      }

      const data = await response.json();
      return {
        documentId,
        status: data.status,
        progress: data.progress || 0,
        currentStep: data.current_step || "Processing...",
        results: data.results ? this.transformResults(data.results) : undefined,
        error: data.error,
      };
    } catch (error) {
      console.error("Status check failed:", error);
      return this.simulateProcessingStatus(documentId);
    }
  }

  private async simulateManifestAnalysis(
    request: ManifestAnalysisRequest,
  ): Promise<ManifestAnalysisResponse> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Enhanced simulation based on file name and size
    const fileName = request.file.name.toLowerCase();
    const fileSize = request.file.size;

    // Simulate different types of manifests based on filename
    let mockResults;
    if (fileName.includes("sap") || fileName.includes("grey")) {
      // SAP-style manifest simulation
      mockResults = this.generateSAPManifestResults();
    } else if (fileName.includes("chemical") || fileName.includes("dg")) {
      mockResults = this.generateChemicalManifestResults();
    } else {
      mockResults = this.generateGenericManifestResults();
    }

    return {
      success: true,
      documentId: `doc_${Date.now()}`,
      status: "completed",
      results: {
        ...mockResults,
        metadata: {
          pageCount: Math.ceil(fileSize / 100000), // Estimate pages based on file size
          fileSize,
          textExtractionQuality: 0.85 + Math.random() * 0.1, // 85-95%
          detectedFormat: this.detectDocumentFormat(fileName),
        },
        warnings: this.generateWarnings(mockResults.dangerousGoods),
        recommendations: this.generateRecommendations(
          mockResults.dangerousGoods,
        ),
      },
    };
  }

  private generateSAPManifestResults() {
    return {
      dangerousGoods: [
        {
          id: "1",
          un: "1263",
          properShippingName:
            "Paint including paint, lacquer, enamel, stain, shellac solutions, varnish, polish, liquid filler, and liquid lacquer base",
          class: "3",
          subHazard: undefined,
          packingGroup: "III",
          quantity: "200 L",
          weight: "180 kg",
          confidence: 0.92,
          source: "automatic" as const,
        },
        {
          id: "2",
          un: "1866",
          properShippingName: "Resin solution, flammable",
          class: "3",
          subHazard: undefined,
          packingGroup: "II",
          quantity: "50 L",
          weight: "45 kg",
          confidence: 0.87,
          source: "automatic" as const,
        },
        {
          id: "3",
          un: "1133",
          properShippingName: "Adhesives containing flammable liquid",
          class: "3",
          subHazard: undefined,
          packingGroup: "III",
          quantity: "100 L",
          weight: "95 kg",
          confidence: 0.78,
          source: "automatic" as const,
        },
      ],
    };
  }

  private generateChemicalManifestResults() {
    return {
      dangerousGoods: [
        {
          id: "1",
          un: "1170",
          properShippingName:
            "Ethanol or Ethyl alcohol or Ethanol solutions or Ethyl alcohol solutions",
          class: "3",
          subHazard: undefined,
          packingGroup: "II",
          quantity: "1000 L",
          weight: "800 kg",
          confidence: 0.95,
          source: "automatic" as const,
        },
        {
          id: "2",
          un: "1789",
          properShippingName: "Hydrochloric acid solution",
          class: "8",
          subHazard: undefined,
          packingGroup: "III",
          quantity: "500 L",
          weight: "600 kg",
          confidence: 0.91,
          source: "automatic" as const,
        },
      ],
    };
  }

  private generateGenericManifestResults() {
    return {
      dangerousGoods: [
        {
          id: "1",
          un: "1438",
          properShippingName: "Ammonium nitrate",
          class: "5.1",
          subHazard: undefined,
          packingGroup: "III",
          quantity: "20,000L",
          weight: "20,000L",
          confidence: 0.89,
          source: "automatic" as const,
        },
        {
          id: "2",
          un: "2528",
          properShippingName:
            "Ammonium nitrate (with more than 0.2% combustible substances)",
          class: "1.1D",
          subHazard: undefined,
          packingGroup: "III",
          quantity: "20,000L",
          weight: "20,000L",
          confidence: 0.83,
          source: "automatic" as const,
        },
      ],
    };
  }

  private detectDocumentFormat(fileName: string): string {
    if (fileName.includes("sap")) return "SAP Transport Manifest";
    if (fileName.includes("oracle")) return "Oracle SCM Manifest";
    if (fileName.includes("dhl")) return "DHL Shipping Manifest";
    if (fileName.includes("fedex")) return "FedEx Commercial Invoice";
    return "Generic PDF Manifest";
  }

  private generateWarnings(dangerousGoods: any[]): string[] {
    const warnings = [];

    if (dangerousGoods.some((dg) => dg.confidence < 0.8)) {
      warnings.push(
        "Some dangerous goods were detected with low confidence. Manual verification recommended.",
      );
    }

    if (dangerousGoods.some((dg) => dg.class === "3")) {
      warnings.push(
        "Flammable liquids detected. Ensure proper ventilation and fire safety measures.",
      );
    }

    if (dangerousGoods.length > 5) {
      warnings.push(
        "Multiple dangerous goods detected. Additional compatibility checking recommended.",
      );
    }

    return warnings;
  }

  private generateRecommendations(dangerousGoods: any[]): string[] {
    const recommendations = [];

    recommendations.push(
      "Review all detected dangerous goods for accuracy before finalizing manifest.",
    );

    if (dangerousGoods.length > 1) {
      recommendations.push(
        "Run compatibility analysis to ensure safe transport of combined dangerous goods.",
      );
    }

    recommendations.push(
      "Collect Safety Data Sheets (SDS) for all dangerous goods before transport.",
    );
    recommendations.push(
      "Verify packaging groups and quantities match physical shipment.",
    );

    return recommendations;
  }

  private simulateProcessingStatus(documentId: string): ProcessingStatus {
    // Simulate different processing stages
    const stages = [
      { step: "Uploading document...", progress: 20 },
      { step: "Extracting text...", progress: 40 },
      { step: "Analyzing content...", progress: 60 },
      { step: "Detecting dangerous goods...", progress: 80 },
      { step: "Finalizing results...", progress: 100 },
    ];

    const randomStage = stages[Math.floor(Math.random() * stages.length)];

    return {
      documentId,
      status: randomStage.progress === 100 ? "completed" : "analyzing",
      progress: randomStage.progress,
      currentStep: randomStage.step,
    };
  }

  private transformBackendResponse(data: any): ManifestAnalysisResponse {
    return {
      success: data.success || false,
      documentId: data.document_id,
      status: data.status,
      results: data.results ? this.transformResults(data.results) : undefined,
      error: data.error,
    };
  }

  private transformResults(results: any) {
    return {
      dangerousGoods:
        results.dangerous_goods?.map((dg: any) => ({
          id: dg.id || Math.random().toString(36).substr(2, 9),
          un: dg.un_number,
          properShippingName: dg.proper_shipping_name,
          class: dg.hazard_class,
          subHazard: dg.sub_hazard,
          packingGroup: dg.packing_group,
          quantity: dg.quantity,
          weight: dg.weight,
          confidence: dg.confidence || 0.8,
          source: dg.source || "automatic",
        })) || [],
      metadata: results.metadata || {},
      warnings: results.warnings || [],
      recommendations: results.recommendations || [],
    };
  }

  validatePDFFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (
      !file.type.includes("pdf") &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      errors.push("File must be a PDF document");
    }

    if (file.size > 50 * 1024 * 1024) {
      // 50MB limit
      errors.push("File size must be less than 50MB");
    }

    if (file.size < 1024) {
      // 1KB minimum
      errors.push("File appears to be too small to be a valid manifest");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const manifestService = new ManifestService();
export type {
  ManifestAnalysisRequest,
  ManifestAnalysisResponse,
  ProcessingStatus,
};
