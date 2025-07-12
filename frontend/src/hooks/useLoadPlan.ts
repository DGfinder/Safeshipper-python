// hooks/useLoadPlan.ts
import { useMutation, useQuery } from "@tanstack/react-query";

// Types
export interface PlacedItem {
  id: string;
  description: string;
  un_number?: string;
  dangerous_goods_class?: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  weight_kg: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  color?: string;
}

export interface VehicleDimensions {
  length: number;
  width: number;
  height: number;
  max_weight_kg: number;
}

export interface LoadPlan {
  id: string;
  vehicle: {
    id: string;
    registration_number: string;
    dimensions: VehicleDimensions;
  };
  placed_items: PlacedItem[];
  efficiency_stats: {
    volume_utilization: number;
    weight_utilization: number;
    total_items: number;
    remaining_capacity: number;
  };
  created_at: string;
}

// Mock data for demo purposes
const createMockLoadPlan = (
  shipmentId: string,
  vehicleIds: string[],
): LoadPlan => {
  // Mock vehicle dimensions (standard truck)
  const vehicleDimensions: VehicleDimensions = {
    length: 12.0, // 12 meters
    width: 2.5, // 2.5 meters
    height: 2.7, // 2.7 meters
    max_weight_kg: 26000,
  };

  // Mock dangerous goods classes with colors
  const dgColors: { [key: string]: string } = {
    "1": "#ff6b35", // Explosives - Orange
    "2": "#4ecdc4", // Gases - Teal
    "3": "#ff6b6b", // Flammable liquids - Red
    "4": "#feca57", // Flammable solids - Yellow
    "5": "#48dbfb", // Oxidizers - Light Blue
    "6": "#9c88ff", // Toxic substances - Purple
    "7": "#ff9ff3", // Radioactive - Pink
    "8": "#636e72", // Corrosives - Gray
    "9": "#a29bfe", // Miscellaneous - Light Purple
  };

  // Generate mock items with optimized 3D placement
  const mockItems: PlacedItem[] = [
    {
      id: "1",
      description: "Lithium Battery Pack",
      un_number: "UN3480",
      dangerous_goods_class: "9",
      dimensions: { length: 1.2, width: 0.8, height: 0.4 },
      weight_kg: 25,
      position: { x: 0, y: 0, z: 0 },
      color: dgColors["9"],
    },
    {
      id: "2",
      description: "Diesel Fuel Container",
      un_number: "UN1202",
      dangerous_goods_class: "3",
      dimensions: { length: 1.0, width: 1.0, height: 1.0 },
      weight_kg: 800,
      position: { x: 1.5, y: 0, z: 0 },
      color: dgColors["3"],
    },
    {
      id: "3",
      description: "Compressed Gas Cylinder",
      un_number: "UN1950",
      dangerous_goods_class: "2",
      dimensions: { length: 0.3, width: 0.3, height: 1.5 },
      weight_kg: 50,
      position: { x: 3.0, y: 0, z: 0 },
      color: dgColors["2"],
    },
    {
      id: "4",
      description: "Chemical Solvent Drums",
      un_number: "UN1263",
      dangerous_goods_class: "3",
      dimensions: { length: 0.6, width: 0.6, height: 0.9 },
      weight_kg: 180,
      position: { x: 0, y: 0, z: 1.2 },
      color: dgColors["3"],
    },
    {
      id: "5",
      description: "Oxidizing Agent Box",
      un_number: "UN1479",
      dangerous_goods_class: "5",
      dimensions: { length: 0.8, width: 0.6, height: 0.3 },
      weight_kg: 40,
      position: { x: 4.0, y: 0, z: 0 },
      color: dgColors["5"],
    },
    {
      id: "6",
      description: "Corrosive Material Container",
      un_number: "UN1789",
      dangerous_goods_class: "8",
      dimensions: { length: 1.0, width: 0.8, height: 0.6 },
      weight_kg: 120,
      position: { x: 1.5, y: 0, z: 1.2 },
      color: dgColors["8"],
    },
    {
      id: "7",
      description: "Medical Equipment",
      dangerous_goods_class: "GENERAL",
      dimensions: { length: 1.5, width: 1.0, height: 0.8 },
      weight_kg: 200,
      position: { x: 6.0, y: 0, z: 0 },
      color: "#74b9ff",
    },
    {
      id: "8",
      description: "Flammable Solid Packages",
      un_number: "UN1325",
      dangerous_goods_class: "4",
      dimensions: { length: 0.4, width: 0.4, height: 0.6 },
      weight_kg: 30,
      position: { x: 3.5, y: 0, z: 0 },
      color: dgColors["4"],
    },
  ];

  // Calculate efficiency stats
  const totalVolume =
    vehicleDimensions.length *
    vehicleDimensions.width *
    vehicleDimensions.height;
  const usedVolume = mockItems.reduce(
    (sum, item) =>
      sum +
      item.dimensions.length * item.dimensions.width * item.dimensions.height,
    0,
  );
  const totalWeight = mockItems.reduce((sum, item) => sum + item.weight_kg, 0);

  return {
    id: `load-plan-${shipmentId}`,
    vehicle: {
      id: vehicleIds[0] || "vehicle-1",
      registration_number: "TRK-001",
      dimensions: vehicleDimensions,
    },
    placed_items: mockItems,
    efficiency_stats: {
      volume_utilization: (usedVolume / totalVolume) * 100,
      weight_utilization: (totalWeight / vehicleDimensions.max_weight_kg) * 100,
      total_items: mockItems.length,
      remaining_capacity: vehicleDimensions.max_weight_kg - totalWeight,
    },
    created_at: new Date().toISOString(),
  };
};

// Mock API functions
async function generateLoadPlan(
  shipmentId: string,
  vehicleIds: string[],
): Promise<LoadPlan> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Return mock data
  return createMockLoadPlan(shipmentId, vehicleIds);
}

async function saveLoadPlan(
  shipmentId: string,
  loadPlan: LoadPlan,
): Promise<{ message: string; load_plan_id: string }> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    message: "Load plan saved successfully",
    load_plan_id: loadPlan.id,
  };
}

// Hooks
export function useGenerateLoadPlan() {
  return useMutation({
    mutationFn: ({
      shipmentId,
      vehicleIds,
    }: {
      shipmentId: string;
      vehicleIds: string[];
    }) => {
      return generateLoadPlan(shipmentId, vehicleIds);
    },
  });
}

export function useSaveLoadPlan() {
  return useMutation({
    mutationFn: ({
      shipmentId,
      loadPlan,
    }: {
      shipmentId: string;
      loadPlan: LoadPlan;
    }) => {
      return saveLoadPlan(shipmentId, loadPlan);
    },
  });
}

export function useLoadPlan(loadPlanId: string | null) {
  return useQuery({
    queryKey: ["load-plan", loadPlanId],
    queryFn: () => {
      // Mock returning existing load plan
      if (!loadPlanId) throw new Error("No load plan ID");
      return createMockLoadPlan("demo-shipment", ["demo-vehicle"]);
    },
    enabled: !!loadPlanId,
  });
}
