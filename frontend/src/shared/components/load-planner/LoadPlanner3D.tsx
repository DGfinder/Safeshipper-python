// components/load-planner/LoadPlanner3D.tsx
"use client";

import React, { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Text,
  Box,
  PerspectiveCamera,
  Environment,
  Grid,
} from "@react-three/drei";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Maximize,
  RotateCcw,
  ZoomIn,
  Package,
  Truck,
  BarChart3,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { type LoadPlan, type PlacedItem } from "@/shared/hooks/useLoadPlan";
import * as THREE from "three";

interface LoadPlanner3DProps {
  loadPlan: LoadPlan;
  onItemSelect?: (item: PlacedItem) => void;
  className?: string;
}

// Vehicle component - renders the truck container as wireframe
function Vehicle({
  dimensions,
}: {
  dimensions: { length: number; width: number; height: number };
}) {
  return (
    <group>
      {/* Vehicle wireframe */}
      <Box
        args={[dimensions.length, dimensions.height, dimensions.width]}
        position={[
          dimensions.length / 2,
          dimensions.height / 2,
          dimensions.width / 2,
        ]}
      >
        <meshBasicMaterial
          wireframe
          color="#666666"
          opacity={0.3}
          transparent
        />
      </Box>

      {/* Vehicle label */}
      <Text
        position={[
          dimensions.length / 2,
          dimensions.height + 0.5,
          dimensions.width / 2,
        ]}
        fontSize={0.3}
        color="#333333"
        anchorX="center"
        anchorY="middle"
      >
        Vehicle Container
      </Text>

      {/* Floor grid */}
      <Grid
        position={[dimensions.length / 2, 0.01, dimensions.width / 2]}
        args={[dimensions.length, dimensions.width]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#cccccc"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#999999"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid={false}
      />
    </group>
  );
}

// Item component - renders individual cargo items
function CargoItem({
  item,
  isSelected,
  onClick,
  showLabels,
}: {
  item: PlacedItem;
  isSelected: boolean;
  onClick: () => void;
  showLabels: boolean;
}) {
  const { dimensions, position, color, description, un_number } = item;

  // Calculate item center position
  const centerX = position.x + dimensions.length / 2;
  const centerY = position.y + dimensions.height / 2;
  const centerZ = position.z + dimensions.width / 2;

  return (
    <group>
      {/* Item box */}
      <Box
        args={[dimensions.length, dimensions.height, dimensions.width]}
        position={[centerX, centerY, centerZ]}
        onClick={onClick}
      >
        <meshStandardMaterial
          color={color || "#74b9ff"}
          opacity={isSelected ? 0.8 : 0.7}
          transparent
          roughness={0.3}
          metalness={0.1}
        />
      </Box>

      {/* Item border when selected */}
      {isSelected && (
        <Box
          args={[
            dimensions.length + 0.02,
            dimensions.height + 0.02,
            dimensions.width + 0.02,
          ]}
          position={[centerX, centerY, centerZ]}
        >
          <meshBasicMaterial
            color="#ffffff"
            wireframe
            opacity={0.8}
            transparent
          />
        </Box>
      )}

      {/* Item label */}
      {showLabels && (
        <Text
          position={[centerX, centerY + dimensions.height / 2 + 0.2, centerZ]}
          fontSize={0.15}
          color="#000000"
          anchorX="center"
          anchorY="bottom"
          maxWidth={dimensions.length}
        >
          {un_number || description.substring(0, 20)}
        </Text>
      )}
    </group>
  );
}

// Main 3D Scene component
function Scene({
  loadPlan,
  selectedItemId,
  onItemSelect,
  showLabels,
}: {
  loadPlan: LoadPlan;
  selectedItemId: string | null;
  onItemSelect: (item: PlacedItem) => void;
  showLabels: boolean;
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-10, 10, -5]} intensity={0.4} />

      {/* Environment */}
      <Environment preset="warehouse" />

      {/* Vehicle container */}
      <Vehicle dimensions={loadPlan.vehicle.dimensions} />

      {/* Cargo items */}
      {loadPlan.placed_items.map((item) => (
        <CargoItem
          key={item.id}
          item={item}
          isSelected={selectedItemId === item.id}
          onClick={() => onItemSelect(item)}
          showLabels={showLabels}
        />
      ))}
    </>
  );
}

// Loading fallback for Suspense
function SceneLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <Package className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-bounce" />
        <p className="text-gray-600">Loading 3D scene...</p>
      </div>
    </div>
  );
}

export function LoadPlanner3D({
  loadPlan,
  onItemSelect,
  className,
}: LoadPlanner3DProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [cameraReset, setCameraReset] = useState(0);

  const handleItemSelect = (item: PlacedItem) => {
    setSelectedItemId(item.id);
    onItemSelect?.(item);
  };

  const resetCamera = () => {
    setCameraReset((prev) => prev + 1);
  };

  const selectedItem = selectedItemId
    ? loadPlan.placed_items.find((item) => item.id === selectedItemId)
    : null;

  // Calculate optimal camera position based on vehicle dimensions
  const { length, width, height } = loadPlan.vehicle.dimensions;
  const maxDimension = Math.max(length, width, height);
  const cameraDistance = maxDimension * 2;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            3D Load Plan Visualization
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLabels(!showLabels)}
            >
              {showLabels ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {showLabels ? "Hide Labels" : "Show Labels"}
            </Button>

            <Button variant="outline" size="sm" onClick={resetCamera}>
              <RotateCcw className="h-4 w-4" />
              Reset View
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* 3D Canvas */}
        <div className="h-96 w-full relative bg-gray-50">
          <Canvas
            shadows
            key={cameraReset} // Force camera reset
            camera={{
              position: [cameraDistance, cameraDistance * 0.7, cameraDistance],
              fov: 50,
            }}
          >
            <Suspense fallback={null}>
              <Scene
                loadPlan={loadPlan}
                selectedItemId={selectedItemId}
                onItemSelect={handleItemSelect}
                showLabels={showLabels}
              />
              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={5}
                maxDistance={cameraDistance * 2}
                target={[length / 2, height / 2, width / 2]}
              />
            </Suspense>
          </Canvas>

          {/* Loading overlay */}
          <Suspense fallback={<SceneLoader />}>
            <div />
          </Suspense>
        </div>

        {/* Controls info */}
        <div className="p-4 bg-gray-50 border-t flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ZoomIn className="h-3 w-3" />
              Scroll to zoom
            </span>
            <span className="flex items-center gap-1">
              <RotateCcw className="h-3 w-3" />
              Drag to rotate
            </span>
            <span className="flex items-center gap-1">
              <Maximize className="h-3 w-3" />
              Right-click drag to pan
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>Vehicle: {loadPlan.vehicle.registration_number}</span>
            <Badge variant="outline" className="text-xs">
              {loadPlan.placed_items.length} items
            </Badge>
          </div>
        </div>

        {/* Selected item info */}
        {selectedItem && (
          <div className="p-4 border-t bg-blue-50">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Selected Item Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p>
                  <span className="font-medium">Description:</span>{" "}
                  {selectedItem.description}
                </p>
                {selectedItem.un_number && (
                  <p>
                    <span className="font-medium">UN Number:</span>{" "}
                    {selectedItem.un_number}
                  </p>
                )}
                {selectedItem.dangerous_goods_class && (
                  <p>
                    <span className="font-medium">DG Class:</span>{" "}
                    {selectedItem.dangerous_goods_class}
                  </p>
                )}
              </div>
              <div>
                <p>
                  <span className="font-medium">Dimensions:</span>{" "}
                  {selectedItem.dimensions.length}×
                  {selectedItem.dimensions.width}×
                  {selectedItem.dimensions.height}m
                </p>
                <p>
                  <span className="font-medium">Weight:</span>{" "}
                  {selectedItem.weight_kg} kg
                </p>
                <p>
                  <span className="font-medium">Position:</span> (
                  {selectedItem.position.x.toFixed(1)},{" "}
                  {selectedItem.position.y.toFixed(1)},{" "}
                  {selectedItem.position.z.toFixed(1)})
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LoadPlanner3D;
