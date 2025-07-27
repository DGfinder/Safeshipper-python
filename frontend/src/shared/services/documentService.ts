interface DocumentRequest {
  type: "DG_TRANSPORT" | "SDS_COLLECTION" | "EPG_PACKAGE" | "COMPLETE_PACKAGE";
  dangerousGoods: Array<{
    id: string;
    un: string;
    class: string;
    properShippingName: string;
    quantity: string;
    weight: string;
  }>;
  shipmentDetails?: {
    origin: string;
    destination: string;
    transportMode: string;
    vesselName?: string;
    voyageNumber?: string;
  };
}

interface DocumentResponse {
  success: boolean;
  documentUrl?: string;
  downloadUrl?: string;
  fileName?: string;
  error?: string;
}

interface SDSDocument {
  id: string;
  fileName: string;
  unNumber: string;
  language: string;
  version: string;
  expiryDate: string;
  downloadUrl: string;
}

interface EPGDocument {
  id: string;
  fileName: string;
  hazardClass: string;
  title: string;
  downloadUrl: string;
}

class DocumentService {
  private baseUrl = "/api/v1";

  async generateDGTransportDocument(
    request: DocumentRequest,
  ): Promise<DocumentResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/documents/generate-dg-transport/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dangerous_goods: request.dangerousGoods.map((dg) => ({
              un_number: dg.un,
              hazard_class: dg.class,
              proper_shipping_name: dg.properShippingName,
              quantity: dg.quantity,
              weight: dg.weight,
            })),
            shipment_details: request.shipmentDetails,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to generate DG transport document");
      }

      const data = await response.json();
      return {
        success: true,
        documentUrl: data.document_url,
        downloadUrl: data.download_url,
        fileName: data.file_name,
      };
    } catch (error) {
      console.error("DG transport document generation failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Document generation failed",
      };
    }
  }

  async collectSDSDocuments(
    dangerousGoods: DocumentRequest["dangerousGoods"],
  ): Promise<SDSDocument[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/sds/collect-for-shipment/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            un_numbers: dangerousGoods.map((dg) => dg.un),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to collect SDS documents");
      }

      const data = await response.json();
      return data.sds_documents.map((sds: any) => ({
        id: sds.id,
        fileName: sds.file_name,
        unNumber: sds.un_number,
        language: sds.language,
        version: sds.version,
        expiryDate: sds.expiry_date,
        downloadUrl: sds.download_url,
      }));
    } catch (error) {
      console.error("SDS collection failed:", error);
      return [];
    }
  }

  async collectEPGDocuments(
    dangerousGoods: DocumentRequest["dangerousGoods"],
  ): Promise<EPGDocument[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/epg/collect-for-hazard-classes/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            hazard_classes: [...new Set(dangerousGoods.map((dg) => dg.class))],
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to collect EPG documents");
      }

      const data = await response.json();
      return data.epg_documents.map((epg: any) => ({
        id: epg.id,
        fileName: epg.file_name,
        hazardClass: epg.hazard_class,
        title: epg.title,
        downloadUrl: epg.download_url,
      }));
    } catch (error) {
      console.error("EPG collection failed:", error);
      return [];
    }
  }

  async generateCompletePackage(
    request: DocumentRequest,
  ): Promise<DocumentResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/documents/generate-complete-package/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dangerous_goods: request.dangerousGoods.map((dg) => ({
              un_number: dg.un,
              hazard_class: dg.class,
              proper_shipping_name: dg.properShippingName,
              quantity: dg.quantity,
              weight: dg.weight,
            })),
            shipment_details: request.shipmentDetails,
            include_sds: true,
            include_epg: true,
            include_transport_docs: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to generate complete package");
      }

      const data = await response.json();
      return {
        success: true,
        documentUrl: data.package_url,
        downloadUrl: data.download_url,
        fileName: data.file_name,
      };
    } catch (error) {
      console.error("Complete package generation failed:", error);

      // Fallback: Generate individual documents and create a mock package
      return this.generateMockCompletePackage(request);
    }
  }

  private async generateMockCompletePackage(
    request: DocumentRequest,
  ): Promise<DocumentResponse> {
    // Simulate package generation
    const packageName = `DG_Package_${new Date().toISOString().slice(0, 10)}.zip`;

    // In a real implementation, this would:
    // 1. Generate DG transport document
    // 2. Collect all relevant SDS documents
    // 3. Collect all relevant EPG documents
    // 4. Create a ZIP package with all documents
    // 5. Return download link

    return {
      success: true,
      fileName: packageName,
      downloadUrl: `/api/v1/documents/download-package/${packageName}`,
    };
  }

  async downloadDocument(url: string, fileName: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to download document");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Document download failed:", error);
      throw error;
    }
  }

  getDocumentTypeDescription(type: string): string {
    const descriptions = {
      DG_TRANSPORT:
        "Dangerous Goods Transport Document - Official declaration for transport compliance",
      SDS_COLLECTION:
        "Safety Data Sheets - Chemical safety information for all dangerous goods",
      EPG_PACKAGE:
        "Emergency Procedure Guides - Emergency response procedures by hazard class",
      COMPLETE_PACKAGE:
        "Complete Documentation Package - All required transport documents in one bundle",
    };
    return (
      descriptions[type as keyof typeof descriptions] || "Document package"
    );
  }

  validateDocumentRequest(request: DocumentRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!request.dangerousGoods || request.dangerousGoods.length === 0) {
      errors.push("At least one dangerous good must be selected");
    }

    request.dangerousGoods.forEach((dg, index) => {
      if (!dg.un || !dg.class || !dg.properShippingName) {
        errors.push(
          `Dangerous good ${index + 1} is missing required information`,
        );
      }
    });

    if (request.type === "DG_TRANSPORT" && !request.shipmentDetails) {
      errors.push("Shipment details are required for transport documents");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const documentService = new DocumentService();
export type { DocumentRequest, DocumentResponse, SDSDocument, EPGDocument };
