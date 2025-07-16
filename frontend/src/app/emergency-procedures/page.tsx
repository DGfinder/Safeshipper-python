// app/emergency-procedures/page.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import {
  Shield,
  Search,
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Archive,
  RefreshCw,
  Eye,
  Edit,
  Zap,
  AlertCircle,
  Globe,
  BookOpen,
} from "lucide-react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import { EPGCreateForm } from "@/shared/components/epg/EPGCreateForm";
import { EPGEditForm } from "@/shared/components/epg/EPGEditForm";
import { EPGTemplateSelectionDialog } from "@/shared/components/epg/EPGTemplateSelectionDialog";
import { EPGBulkOperations } from "@/shared/components/epg/EPGBulkOperations";
import { EPGLiveStatistics } from "@/shared/components/epg/EPGLiveStatistics";
import {
  useEPGs,
  useEPGStatistics,
  useEPGsDueForReview,
  useActivateEPG,
  useArchiveEPG,
  useCreateEPGFromTemplate,
  type EmergencyProcedureGuide,
  type EPGSearchParams,
} from "@/shared/hooks/useEPG";

export default function EmergencyProceduresPage() {
  const [searchParams, setSearchParams] = useState<EPGSearchParams>({});
  const [selectedEPG, setSelectedEPG] =
    useState<EmergencyProcedureGuide | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingEPGId, setEditingEPGId] = useState<string | null>(null);
  const [selectedEPGs, setSelectedEPGs] = useState<string[]>([]);
  const [showBulkOperations, setShowBulkOperations] = useState(false);

  const {
    data: epgData,
    isLoading: epgLoading,
    refetch: refetchEPGs,
  } = useEPGs(searchParams);
  const { data: statistics } = useEPGStatistics();
  const { data: dueForReview } = useEPGsDueForReview(30);
  const activateEPG = useActivateEPG();
  const archiveEPG = useArchiveEPG();
  const createFromTemplate = useCreateEPGFromTemplate();

  const handleSearch = (newParams: Partial<EPGSearchParams>) => {
    setSearchParams((prev) => ({ ...prev, ...newParams }));
  };

  const handleActivate = (epgId: string) => {
    activateEPG.mutate(epgId);
  };

  const handleArchive = (epgId: string) => {
    archiveEPG.mutate(epgId);
  };

  const handleCreateFromTemplate = (hazardClass: string) => {
    createFromTemplate.mutate({ hazard_class: hazardClass });
    setShowTemplateDialog(false);
  };

  const handleTemplateSuccess = () => {
    setShowTemplateDialog(false);
    refetchEPGs();
  };

  const handleEditEPG = (epgId: string) => {
    setEditingEPGId(epgId);
    setShowEditForm(true);
  };

  const handleCreateSuccess = (epg: EmergencyProcedureGuide) => {
    setShowCreateForm(false);
    refetchEPGs();
  };

  const handleEditSuccess = (epg: EmergencyProcedureGuide) => {
    setShowEditForm(false);
    setEditingEPGId(null);
    refetchEPGs();
  };

  const handleCloseEdit = () => {
    setShowEditForm(false);
    setEditingEPGId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "DRAFT":
        return "bg-blue-100 text-blue-800";
      case "UNDER_REVIEW":
        return "bg-yellow-100 text-yellow-800";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
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

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Emergency Procedure Guides
            </h1>
            <p className="text-gray-600 mt-1">
              Manage emergency response procedures for dangerous goods
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => refetchEPGs()}
              variant="outline"
              disabled={epgLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${epgLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              onClick={() => setShowTemplateDialog(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              From Template
            </Button>
            <Button
              onClick={() => setShowBulkOperations(!showBulkOperations)}
              variant={showBulkOperations ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {showBulkOperations ? "Hide" : "Bulk"} Operations
            </Button>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create EPG
            </Button>
          </div>
        </div>

        {/* Live Statistics */}
        <EPGLiveStatistics refreshInterval={30000} showTrends={true} />

        {/* Due for Review Alert */}
        {dueForReview && dueForReview.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              You have {dueForReview.length} EPGs due for review within 30 days.
              <Button
                variant="link"
                className="p-0 h-auto text-yellow-700 underline ml-1"
              >
                View review queue
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="EPG number, title, UN number..."
                  value={searchParams.query || ""}
                  onChange={(e) => handleSearch({ query: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hazard Class</label>
                <select
                  value={searchParams.hazard_class || ""}
                  onChange={(e) =>
                    handleSearch({ hazard_class: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Classes</option>
                  <option value="1">Class 1 - Explosives</option>
                  <option value="2">Class 2 - Gases</option>
                  <option value="3">Class 3 - Flammable Liquids</option>
                  <option value="4">Class 4 - Flammable Solids</option>
                  <option value="5">Class 5 - Oxidizers</option>
                  <option value="6">Class 6 - Toxic/Infectious</option>
                  <option value="7">Class 7 - Radioactive</option>
                  <option value="8">Class 8 - Corrosives</option>
                  <option value="9">Class 9 - Miscellaneous</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={searchParams.status || ""}
                  onChange={(e) => handleSearch({ status: e.target.value })}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Severity</label>
                <select
                  value={searchParams.severity_level || ""}
                  onChange={(e) =>
                    handleSearch({ severity_level: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Levels</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <select
                  value={searchParams.country_code || ""}
                  onChange={(e) =>
                    handleSearch({ country_code: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Countries</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="MX">Mexico</option>
                  <option value="UK">United Kingdom</option>
                  <option value="DE">Germany</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Include Inactive</label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={searchParams.include_inactive || false}
                    onChange={(e) =>
                      handleSearch({ include_inactive: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm">Show inactive EPGs</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Operations */}
        {showBulkOperations && (
          <EPGBulkOperations
            epgs={epgData?.results || []}
            selectedEPGs={selectedEPGs}
            onSelectionChange={setSelectedEPGs}
            onRefresh={refetchEPGs}
          />
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="epgs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="epgs">EPG Library</TabsTrigger>
            <TabsTrigger value="review">Review Queue</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="epgs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Emergency Procedure Guides ({epgData?.count || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {epgLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-2">Loading EPGs...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {epgData?.results?.map((epg: EmergencyProcedureGuide) => (
                      <div
                        key={epg.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          {showBulkOperations && (
                            <Checkbox
                              checked={selectedEPGs.includes(epg.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedEPGs([...selectedEPGs, epg.id]);
                                } else {
                                  setSelectedEPGs(selectedEPGs.filter(id => id !== epg.id));
                                }
                              }}
                            />
                          )}
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Shield className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-lg">
                                {epg.epg_number}
                              </h3>
                              <Badge className={getStatusColor(epg.status)}>
                                {epg.status_display}
                              </Badge>
                              <Badge
                                className={getSeverityColor(epg.severity_level)}
                              >
                                {epg.severity_level_display}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-900 font-medium">
                              {epg.title}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                {epg.dangerous_good_display}
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                Class {epg.hazard_class}
                              </span>
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {epg.country_code}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm text-gray-600">
                            <p>Version {epg.version}</p>
                            <p>
                              {new Date(
                                epg.effective_date,
                              ).toLocaleDateString()}
                            </p>
                            {epg.is_due_for_review && (
                              <Badge className="bg-yellow-100 text-yellow-800 mt-1">
                                Review Due
                              </Badge>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedEPG(epg)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditEPG(epg.id)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            {epg.status === "DRAFT" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleActivate(epg.id)}
                                disabled={activateEPG.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Activate
                              </Button>
                            )}
                            {epg.status === "ACTIVE" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleArchive(epg.id)}
                                disabled={archiveEPG.isPending}
                              >
                                <Archive className="h-4 w-4 mr-1" />
                                Archive
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {epgData?.results?.length === 0 && (
                      <div className="text-center py-8">
                        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No EPGs Found
                        </h3>
                        <p className="text-gray-600">
                          Try adjusting your search criteria
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  EPGs Due for Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dueForReview && dueForReview.length > 0 ? (
                  <div className="space-y-4">
                    {dueForReview.map((epg: EmergencyProcedureGuide) => (
                      <div
                        key={epg.id}
                        className="flex items-center justify-between p-4 border border-yellow-200 bg-yellow-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <AlertTriangle className="h-6 w-6 text-yellow-600" />
                          <div>
                            <h3 className="font-medium">
                              {epg.epg_number} - {epg.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {epg.dangerous_good_display}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Review Due
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">
                            Due:{" "}
                            {epg.review_date
                              ? new Date(epg.review_date).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      All Up to Date!
                    </h3>
                    <p className="text-gray-600">
                      No EPGs require review at this time
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create EPG from Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
                    (hazardClass) => (
                      <Button
                        key={hazardClass}
                        variant="outline"
                        className="p-4 h-auto text-left"
                        onClick={() => handleCreateFromTemplate(hazardClass)}
                        disabled={createFromTemplate.isPending}
                      >
                        <div>
                          <h4 className="font-medium">Class {hazardClass}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {hazardClass === "1" && "Explosives"}
                            {hazardClass === "2" && "Gases"}
                            {hazardClass === "3" && "Flammable Liquids"}
                            {hazardClass === "4" && "Flammable Solids"}
                            {hazardClass === "5" && "Oxidizers"}
                            {hazardClass === "6" && "Toxic/Infectious"}
                            {hazardClass === "7" && "Radioactive"}
                            {hazardClass === "8" && "Corrosives"}
                            {hazardClass === "9" && "Miscellaneous"}
                          </p>
                        </div>
                      </Button>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {statistics && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>By Hazard Class</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(statistics.by_hazard_class).map(
                          ([hazardClass, count]) => (
                            <div
                              key={hazardClass}
                              className="flex justify-between items-center"
                            >
                              <span className="text-sm">
                                Class {hazardClass}
                              </span>
                              <Badge variant="outline">{count as number}</Badge>
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>By Severity Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(statistics.by_severity_level).map(
                          ([severity, count]) => (
                            <div
                              key={severity}
                              className="flex justify-between items-center"
                            >
                              <span className="text-sm capitalize">
                                {severity.toLowerCase()}
                              </span>
                              <Badge variant="outline">{count as number}</Badge>
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Recent Updates</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {statistics.recent_updates
                          .slice(0, 10)
                          .map((update: any) => (
                            <div
                              key={update.id}
                              className="flex justify-between items-center"
                            >
                              <div>
                                <span className="text-sm font-medium">
                                  {update.epg_number}
                                </span>
                                <p className="text-xs text-gray-500">
                                  {update.title}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline">{update.status}</Badge>
                                <p className="text-xs text-gray-500">
                                  {new Date(
                                    update.updated_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create EPG Dialog */}
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Emergency Procedure Guide</DialogTitle>
            </DialogHeader>
            <EPGCreateForm
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowCreateForm(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit EPG Dialog */}
        <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Emergency Procedure Guide</DialogTitle>
            </DialogHeader>
            {editingEPGId && (
              <EPGEditForm
                epgId={editingEPGId}
                onSuccess={handleEditSuccess}
                onCancel={handleCloseEdit}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Template Selection Dialog */}
        <EPGTemplateSelectionDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          onSuccess={handleTemplateSuccess}
        />
      </div>
    </AuthGuard>
  );
}
