import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";

// Types
export interface DangerousGood {
  id: string;
  un_number: string;
  proper_shipping_name: string;
  simplified_name?: string;
  hazard_class: string;
  subsidiary_risks?: string;
  packing_group?: string;
  packing_group_display?: string;
  hazard_labels_required?: string;
  erg_guide_number?: string;
  special_provisions?: string;
  qty_ltd_passenger_aircraft?: string;
  packing_instruction_passenger_aircraft?: string;
  qty_ltd_cargo_aircraft?: string;
  packing_instruction_cargo_aircraft?: string;
  description_notes?: string;
  is_marine_pollutant: boolean;
  is_environmentally_hazardous: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompatibilityConflict {
  un_number_1: string;
  un_number_2: string;
  reason: string;
}

export interface CompatibilityCheckRequest {
  un_numbers: string[];
}

export interface CompatibilityCheckResponse {
  is_compatible: boolean;
  conflicts: CompatibilityConflict[];
}

// API functions
const fetchDangerousGoods = async (
  token: string,
  search?: string,
): Promise<DangerousGood[]> => {
  const url = new URL("/api/v1/dangerous-goods/", window.location.origin);

  if (search) {
    url.searchParams.append("search", search);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to fetch dangerous goods" }));
    throw new Error(error.message || "Failed to fetch dangerous goods");
  }

  const data = await response.json();
  return data.results || data; // Handle both paginated and non-paginated responses
};

const checkCompatibility = async (
  request: CompatibilityCheckRequest,
  token: string,
): Promise<CompatibilityCheckResponse> => {
  const response = await fetch("/api/v1/dangerous-goods/check-compatibility/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to check compatibility" }));
    throw new Error(error.message || "Failed to check compatibility");
  }

  return response.json();
};

const lookupBySynonym = async (
  query: string,
  token: string,
): Promise<DangerousGood | null> => {
  const url = new URL(
    "/api/v1/dangerous-goods/lookup-by-synonym/",
    window.location.origin,
  );
  url.searchParams.append("query", query);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return null; // No match found
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to lookup synonym" }));
    throw new Error(error.message || "Failed to lookup synonym");
  }

  return response.json();
};

// Custom hooks
export const useDangerousGoods = (search?: string) => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ["dangerous-goods", search],
    queryFn: () => fetchDangerousGoods(token!, search),
    enabled: !!token,
    staleTime: 10 * 60 * 1000, // 10 minutes - DG data doesn't change often
    select: (data) => {
      // Sort by UN number for better UX
      return data.sort((a, b) => a.un_number.localeCompare(b.un_number));
    },
  });
};

export const useCheckCompatibility = () => {
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: (request: CompatibilityCheckRequest) =>
      checkCompatibility(request, token!),
  });
};

export const useLookupBySynonym = () => {
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: (query: string) => lookupBySynonym(query, token!),
  });
};

// Hook for searching dangerous goods with debouncing
export const useSearchDangerousGoods = (searchTerm: string, enabled = true) => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ["dangerous-goods-search", searchTerm],
    queryFn: () => fetchDangerousGoods(token!, searchTerm),
    enabled: !!token && enabled && searchTerm.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => {
      // Limit results for search dropdown and sort by relevance
      return data
        .sort((a, b) => {
          // Prioritize UN number matches
          const aUnMatch = a.un_number
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
          const bUnMatch = b.un_number
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

          if (aUnMatch && !bUnMatch) return -1;
          if (!aUnMatch && bUnMatch) return 1;

          // Then by proper shipping name matches
          const aNameMatch = a.proper_shipping_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
          const bNameMatch = b.proper_shipping_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

          if (aNameMatch && !bNameMatch) return -1;
          if (!aNameMatch && bNameMatch) return 1;

          // Finally by UN number
          return a.un_number.localeCompare(b.un_number);
        })
        .slice(0, 20); // Limit to 20 results for performance
    },
  });
};
