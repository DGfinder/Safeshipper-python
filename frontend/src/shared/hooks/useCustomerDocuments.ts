// hooks/useCustomerDocuments.ts
// Customer document access and management system

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useCustomerAccess } from "@/shared/hooks/useCustomerProfile";
import { simulatedDataService } from "@/shared/services/simulatedDataService";
import { getEnvironmentConfig } from "@/shared/config/environment";

// Document types available to customers
export interface CustomerDocument {
  id: string;
  type: "sds" | "compliance_certificate" | "inspection_report" | "manifest" | "invoice" | "pod";
  title: string;
  description: string;
  shipmentId?: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  expiryDate?: string;
  status: "available" | "pending" | "expired" | "restricted";
  downloadUrl?: string;
  previewUrl?: string;
  category: "safety" | "compliance" | "operational" | "financial";
  classification: "public" | "customer_only" | "restricted";
  metadata: {
    unNumber?: string;
    hazardClass?: string;
    inspectionType?: string;
    certificateType?: string;
    regulatory?: string[];
  };
}

export interface DocumentSearchFilters {
  type?: string;
  category?: string;
  shipmentId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

const API_BASE_URL = "/api/v1";

// API Functions
async function fetchCustomerDocuments(
  customerId: string, 
  token: string, 
  filters?: DocumentSearchFilters
): Promise<CustomerDocument[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.append("type", filters.type);
  if (filters?.category) params.append("category", filters.category);
  if (filters?.shipmentId) params.append("shipment_id", filters.shipmentId);
  if (filters?.dateFrom) params.append("date_from", filters.dateFrom);
  if (filters?.dateTo) params.append("date_to", filters.dateTo);
  if (filters?.status) params.append("status", filters.status);

  const response = await fetch(`${API_BASE_URL}/customers/${customerId}/documents/?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch customer documents");
  }

  return response.json();
}

async function downloadCustomerDocument(
  documentId: string,
  token: string
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to download document");
  }

  return response.blob();
}

// Simulated document generation based on customer shipments
function generateCustomerDocuments(customerId: string): CustomerDocument[] {
  const customerProfile = simulatedDataService.getCustomerByName(
    simulatedDataService.getCustomerProfiles().find(c => c.id === customerId)?.name || ""
  );
  
  if (!customerProfile) return [];

  const customerShipments = simulatedDataService.getCustomerShipments(customerProfile.name);
  const documents: CustomerDocument[] = [];

  // Generate documents for each shipment
  customerShipments.forEach((shipment, index) => {
    const shipmentDate = new Date(shipment.createdAt);
    const hasHazmat = shipment.dangerousGoods && shipment.dangerousGoods.length > 0;

    // SDS Documents for dangerous goods shipments
    if (hasHazmat) {
      shipment.dangerousGoods.forEach((dg, dgIndex) => {
        documents.push({
          id: `sds-${shipment.id}-${dgIndex}`,
          type: "sds",
          title: `SDS - ${dg.properShippingName}`,
          description: `Safety Data Sheet for UN${dg.unNumber} - ${dg.properShippingName}`,
          shipmentId: shipment.id,
          fileName: `SDS_UN${dg.unNumber}_${dg.properShippingName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          fileSize: "2.3 MB",
          uploadDate: new Date(shipmentDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          expiryDate: new Date(shipmentDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          status: "available",
          downloadUrl: `/api/v1/documents/sds-${shipment.id}-${dgIndex}/download/`,
          previewUrl: `/api/v1/documents/sds-${shipment.id}-${dgIndex}/preview/`,
          category: "safety",
          classification: "customer_only",
          metadata: {
            unNumber: dg.unNumber,
            hazardClass: dg.class,
            regulatory: ["ADG", "IMDG", "ICAO"]
          }
        });
      });

      // Compliance Certificate for DG shipments
      documents.push({
        id: `cert-${shipment.id}`,
        type: "compliance_certificate",
        title: `DG Compliance Certificate - ${shipment.trackingNumber}`,
        description: `Dangerous Goods Transport Compliance Certificate`,
        shipmentId: shipment.id,
        fileName: `DG_Certificate_${shipment.trackingNumber}.pdf`,
        fileSize: "1.1 MB",
        uploadDate: shipmentDate.toISOString(),
        status: "available",
        downloadUrl: `/api/v1/documents/cert-${shipment.id}/download/`,
        category: "compliance",
        classification: "customer_only",
        metadata: {
          certificateType: "DG_TRANSPORT",
          regulatory: ["ADG", "Work_Health_Safety"]
        }
      });
    }

    // Shipping Manifest (all shipments)
    documents.push({
      id: `manifest-${shipment.id}`,
      type: "manifest",
      title: `Shipping Manifest - ${shipment.trackingNumber}`,
      description: `Complete shipping manifest and load details`,
      shipmentId: shipment.id,
      fileName: `Manifest_${shipment.trackingNumber}.pdf`,
      fileSize: "856 KB",
      uploadDate: shipmentDate.toISOString(),
      status: "available",
      downloadUrl: `/api/v1/documents/manifest-${shipment.id}/download/`,
      category: "operational",
      classification: "customer_only",
      metadata: {}
    });

    // Inspection Report (for high-value or DG shipments)
    if (hasHazmat || Math.random() > 0.7) {
      documents.push({
        id: `inspection-${shipment.id}`,
        type: "inspection_report",
        title: `Pre-Transport Inspection - ${shipment.trackingNumber}`,
        description: `${hasHazmat ? 'Dangerous goods' : 'General'} pre-transport inspection report`,
        shipmentId: shipment.id,
        fileName: `Inspection_${shipment.trackingNumber}.pdf`,
        fileSize: "3.2 MB",
        uploadDate: new Date(shipmentDate.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        status: "available",
        downloadUrl: `/api/v1/documents/inspection-${shipment.id}/download/`,
        category: "safety",
        classification: "customer_only",
        metadata: {
          inspectionType: hasHazmat ? "DG_PRE_TRANSPORT" : "GENERAL_PRE_TRANSPORT",
          regulatory: hasHazmat ? ["ADG", "Work_Health_Safety"] : ["Transport_Standards"]
        }
      });
    }

    // POD for delivered shipments
    if (shipment.status === "DELIVERED") {
      documents.push({
        id: `pod-${shipment.id}`,
        type: "pod",
        title: `Proof of Delivery - ${shipment.trackingNumber}`,
        description: `Delivery receipt with signature and photos`,
        shipmentId: shipment.id,
        fileName: `POD_${shipment.trackingNumber}.pdf`,
        fileSize: "1.8 MB",
        uploadDate: shipment.estimatedDelivery,
        status: "available",
        downloadUrl: `/api/v1/documents/pod-${shipment.id}/download/`,
        category: "operational",
        classification: "customer_only",
        metadata: {}
      });
    }
  });

  // Add general compliance documents for the customer
  const complianceProfile = simulatedDataService.getCustomerComplianceProfile(customerProfile.name);
  if (complianceProfile) {
    // Annual compliance certificate
    documents.push({
      id: `annual-cert-${customerId}`,
      type: "compliance_certificate",
      title: `Annual Compliance Certificate - ${customerProfile.name}`,
      description: `Annual dangerous goods transport compliance certificate`,
      fileName: `Annual_DG_Certificate_${customerProfile.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      fileSize: "2.1 MB",
      uploadDate: "2024-01-01T00:00:00Z",
      expiryDate: "2024-12-31T23:59:59Z",
      status: "available",
      downloadUrl: `/api/v1/documents/annual-cert-${customerId}/download/`,
      category: "compliance",
      classification: "customer_only",
      metadata: {
        certificateType: "ANNUAL_DG_COMPLIANCE",
        regulatory: ["ADG", "Work_Health_Safety", "Transport_Licensing"]
      }
    });
  }

  return documents.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
}

// Hooks
export function useCustomerDocuments(filters?: DocumentSearchFilters) {
  const { getToken } = useAuthStore();
  const { data: customerAccess } = useCustomerAccess();
  const config = getEnvironmentConfig();

  return useQuery({
    queryKey: ["customer-documents", customerAccess?.customerId, filters],
    queryFn: async () => {
      if (!customerAccess?.customerId) {
        throw new Error("No customer access");
      }

      if (config.apiMode === "demo") {
        return generateCustomerDocuments(customerAccess.customerId);
      }

      if (config.apiMode === "hybrid") {
        const token = getToken();
        if (token) {
          try {
            return await fetchCustomerDocuments(customerAccess.customerId, token, filters);
          } catch (error) {
            console.warn("API failed, falling back to simulated data:", error);
            return generateCustomerDocuments(customerAccess.customerId);
          }
        } else {
          return generateCustomerDocuments(customerAccess.customerId);
        }
      }

      // Production mode
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return await fetchCustomerDocuments(customerAccess.customerId, token, filters);
    },
    enabled: !!customerAccess?.customerId,
  });
}

export function useCustomerDocumentsByShipment(shipmentId: string) {
  const documentsQuery = useCustomerDocuments({ shipmentId });
  
  return {
    ...documentsQuery,
    data: documentsQuery.data?.filter(doc => doc.shipmentId === shipmentId) || []
  };
}

export function useDownloadCustomerDocument() {
  const { getToken } = useAuthStore();
  const config = getEnvironmentConfig();

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (config.apiMode === "demo") {
        // Generate mock PDF blob for demo
        const mockPdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Demo Document - ${documentId}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000015 00000 n 
0000000066 00000 n 
0000000123 00000 n 
0000000213 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
308
%%EOF`;
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate download delay
        return new Blob([mockPdfContent], { type: "application/pdf" });
      }

      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return await downloadCustomerDocument(documentId, token);
    },
    onSuccess: (blob, documentId) => {
      // Auto-download the file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `document-${documentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useDocumentCategories() {
  const { data: documents } = useCustomerDocuments();
  
  const categories = documents?.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = 0;
    }
    acc[doc.category]++;
    return acc;
  }, {} as Record<string, number>) || {};

  return categories;
}

export function useDocumentTypes() {
  const { data: documents } = useCustomerDocuments();
  
  const types = documents?.reduce((acc, doc) => {
    if (!acc[doc.type]) {
      acc[doc.type] = 0;
    }
    acc[doc.type]++;
    return acc;
  }, {} as Record<string, number>) || {};

  return types;
}