"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Plus,
  X,
  CheckCircle,
  AlertTriangle,
  Package,
  Truck,
  Shield,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  DangerousGood,
  useSearchDangerousGoods,
  useCheckCompatibility,
} from "@/hooks/useDangerousGoods";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "react-hot-toast";

interface SelectedDG {
  id: string;
  un_number: string;
  proper_shipping_name: string;
  hazard_class: string;
  packing_group?: string;
}

export default function DGCheckerPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDGs, setSelectedDGs] = useState<SelectedDG[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isCheckingCompatibility, setIsCheckingCompatibility] = useState(false);

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
  } = useSearchDangerousGoods(
    debouncedSearchTerm,
    debouncedSearchTerm.length >= 2,
  );

  const checkCompatibilityMutation = useCheckCompatibility();

  // Auto-check compatibility when items are added/removed
  useEffect(() => {
    if (selectedDGs.length >= 2) {
      setIsCheckingCompatibility(true);
      const unNumbers = selectedDGs.map((dg) => dg.un_number);

      checkCompatibilityMutation.mutate(
        { un_numbers: unNumbers },
        {
          onSuccess: () => {
            setIsCheckingCompatibility(false);
          },
          onError: (error: any) => {
            setIsCheckingCompatibility(false);
            toast.error(error.message || "Failed to check compatibility");
          },
        },
      );
    }
  }, [selectedDGs, checkCompatibilityMutation]);

  const addDangerousGood = (dg: DangerousGood) => {
    // Check if already added
    if (selectedDGs.some((selected) => selected.un_number === dg.un_number)) {
      toast.error("This dangerous good is already in your load");
      return;
    }

    const newDG: SelectedDG = {
      id: dg.id,
      un_number: dg.un_number,
      proper_shipping_name: dg.proper_shipping_name,
      hazard_class: dg.hazard_class,
      packing_group: dg.packing_group,
    };

    setSelectedDGs((prev) => [...prev, newDG]);
    setSearchTerm("");
    setShowSearchResults(false);
    toast.success(`Added ${dg.un_number} to your load`);
  };

  const removeDangerousGood = (unNumber: string) => {
    setSelectedDGs((prev) => prev.filter((dg) => dg.un_number !== unNumber));
    toast.success("Removed dangerous good from load");
  };

  const clearAll = () => {
    setSelectedDGs([]);
    toast.success("Load cleared");
  };

  const getHazardClassColor = (hazardClass: string) => {
    const classNum = hazardClass.split(".")[0];
    const colors: { [key: string]: string } = {
      "1": "bg-orange-100 text-orange-800 border-orange-200",
      "2": "bg-green-100 text-green-800 border-green-200",
      "3": "bg-red-100 text-red-800 border-red-200",
      "4": "bg-yellow-100 text-yellow-800 border-yellow-200",
      "5": "bg-blue-100 text-blue-800 border-blue-200",
      "6": "bg-purple-100 text-purple-800 border-purple-200",
      "7": "bg-pink-100 text-pink-800 border-pink-200",
      "8": "bg-gray-100 text-gray-800 border-gray-200",
      "9": "bg-indigo-100 text-indigo-800 border-indigo-200",
    };
    return colors[classNum] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const compatibilityData = checkCompatibilityMutation.data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Dangerous Goods Checker
            </h1>
            <p className="text-gray-600 mt-1">
              Build your shipment load and check for dangerous goods
              compatibility
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Package className="w-4 h-4" />
              <span>{selectedDGs.length} items in load</span>
            </div>
            {selectedDGs.length > 0 && (
              <Button variant="outline" onClick={clearAll}>
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: DG Item Selector */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Add Dangerous Goods
              </CardTitle>
              <CardDescription>
                Search by UN number or proper shipping name to add items to your
                load
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search UN number or shipping name..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSearchResults(e.target.value.length >= 2);
                  }}
                  onFocus={() => setShowSearchResults(searchTerm.length >= 2)}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 animate-spin" />
                )}
              </div>

              {/* Search Results */}
              {showSearchResults && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchError && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Failed to search: {searchError.message}
                      </AlertDescription>
                    </Alert>
                  )}

                  {searchResults?.length === 0 && !isSearching && (
                    <div className="text-center py-8 text-gray-500">
                      No dangerous goods found matching &quot;{searchTerm}&quot;
                    </div>
                  )}

                  {searchResults?.map((dg) => (
                    <div
                      key={dg.id}
                      className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => addDangerousGood(dg)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-semibold text-blue-600">
                              {dg.un_number}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getHazardClassColor(dg.hazard_class)}`}
                            >
                              Class {dg.hazard_class}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {dg.proper_shipping_name}
                          </p>
                          {dg.packing_group && (
                            <p className="text-xs text-gray-600">
                              Packing Group: {dg.packing_group}
                            </p>
                          )}
                        </div>
                        <Plus className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Current Load */}
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3">Current Load</h3>
                {selectedDGs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No dangerous goods added yet</p>
                    <p className="text-sm">
                      Search and select items to build your load
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDGs.map((dg) => (
                      <div
                        key={dg.un_number}
                        className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-semibold text-blue-600">
                              {dg.un_number}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getHazardClassColor(dg.hazard_class)}`}
                            >
                              Class {dg.hazard_class}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {dg.proper_shipping_name}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDangerousGood(dg.un_number)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Panel: Compatibility Results */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Compatibility Results
              </CardTitle>
              <CardDescription>
                Real-time compatibility check for your dangerous goods load
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDGs.length < 2 ? (
                <div className="text-center py-12">
                  <Truck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Add items to check compatibility
                  </h3>
                  <p className="text-gray-600">
                    You need at least 2 dangerous goods items to perform a
                    compatibility check
                  </p>
                </div>
              ) : isCheckingCompatibility ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-600 animate-spin" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Checking Compatibility...
                  </h3>
                  <p className="text-gray-600">
                    Analyzing {selectedDGs.length} dangerous goods for conflicts
                  </p>
                </div>
              ) : compatibilityData ? (
                <div className="space-y-4">
                  {/* Overall Status */}
                  <div
                    className={`p-4 rounded-lg border ${
                      compatibilityData.is_compatible
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {compatibilityData.is_compatible ? (
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                      )}
                      <div>
                        <h3
                          className={`text-lg font-semibold ${
                            compatibilityData.is_compatible
                              ? "text-green-900"
                              : "text-red-900"
                          }`}
                        >
                          {compatibilityData.is_compatible
                            ? "Load is Compliant"
                            : "Compatibility Issues Detected"}
                        </h3>
                        <p
                          className={`text-sm ${
                            compatibilityData.is_compatible
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {compatibilityData.is_compatible
                            ? "All dangerous goods in this load are compatible for transport"
                            : `${compatibilityData.conflicts.length} conflict${compatibilityData.conflicts.length > 1 ? "s" : ""} found`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Conflict Details */}
                  {!compatibilityData.is_compatible &&
                    compatibilityData.conflicts.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">
                          Conflict Details:
                        </h4>
                        {compatibilityData.conflicts.map((conflict, index) => (
                          <Alert
                            key={index}
                            className="border-red-200 bg-red-50"
                          >
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              <div className="font-medium mb-1">
                                {conflict.un_number_1} ↔ {conflict.un_number_2}
                              </div>
                              <div className="text-sm">{conflict.reason}</div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}

                  {/* Load Summary */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Load Summary
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Total Items: {selectedDGs.length}</div>
                      <div>
                        Hazard Classes:{" "}
                        {[
                          ...new Set(
                            selectedDGs.map(
                              (dg) => dg.hazard_class.split(".")[0],
                            ),
                          ),
                        ].join(", ")}
                      </div>
                      <div>
                        Status:{" "}
                        {compatibilityData.is_compatible
                          ? "✅ Ready for transport"
                          : "❌ Requires review"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
