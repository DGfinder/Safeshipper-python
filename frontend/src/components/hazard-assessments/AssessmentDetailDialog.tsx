"use client";

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/contexts/PermissionContext';
import { 
  Eye, 
  MapPin, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Camera,
  MessageSquare,
  Shield,
  FileText,
  Calendar,
  Target,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface AssessmentDetailDialogProps {
  assessment: any;
  isOpen: boolean;
  onClose: () => void;
  onOverrideAction?: (assessmentId: string, action: 'approve' | 'deny', notes?: string) => void;
}

export function AssessmentDetailDialog({ 
  assessment, 
  isOpen, 
  onClose, 
  onOverrideAction 
}: AssessmentDetailDialogProps) {
  const { can } = usePermissions();
  const [overrideNotes, setOverrideNotes] = useState('');
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'approve' | 'deny' | null>(null);

  if (!assessment) return null;

  const handleOverrideAction = async (action: 'approve' | 'deny') => {
    if (!onOverrideAction) return;
    
    try {
      await onOverrideAction(assessment.id, action, overrideNotes);
      setShowOverrideForm(false);
      setOverrideNotes('');
      setPendingAction(null);
      onClose();
    } catch (error) {
      console.error('Failed to process override:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600';
      case 'FAILED': return 'text-red-600';
      case 'IN_PROGRESS': return 'text-yellow-600';
      case 'OVERRIDE_REQUESTED': return 'text-orange-600';
      case 'OVERRIDE_APPROVED': return 'text-green-600';
      case 'OVERRIDE_DENIED': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getAnswerIcon = (answer: any) => {
    const value = answer.answer_value?.toLowerCase();
    if (value === 'yes' || value === 'pass') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (value === 'no' || value === 'fail') {
      return <XCircle className="h-4 w-4 text-red-600" />;
    } else if (value === 'n/a') {
      return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
    return <FileText className="h-4 w-4 text-blue-600" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Assessment Details - {assessment.shipment_tracking}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assessment Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Assessment Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <Badge variant="outline" className={getStatusColor(assessment.status)}>
                    {assessment.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Overall Result</p>
                  <div className="flex items-center gap-1">
                    {assessment.overall_result === 'PASS' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={assessment.overall_result === 'PASS' ? 'text-green-600' : 'text-red-600'}>
                      {assessment.overall_result}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Template</p>
                  <p className="text-sm">{assessment.template_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed By</p>
                  <p className="text-sm">{assessment.completed_by_name || 'Not assigned'}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Started</p>
                    <p className="text-sm">{new Date(assessment.start_timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="text-sm">{assessment.completion_time_display}</p>
                  </div>
                </div>
                {assessment.is_suspiciously_fast && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-xs text-gray-500">Warning</p>
                      <p className="text-sm text-orange-600">Suspicious timing</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* GPS and Location Data */}
          {(assessment.start_gps_latitude || assessment.end_gps_latitude) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assessment.start_gps_latitude && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Start Location</p>
                      <p className="text-sm">
                        Lat: {assessment.start_gps_latitude}, Lng: {assessment.start_gps_longitude}
                      </p>
                      {assessment.start_location_accuracy && (
                        <p className="text-xs text-gray-500">
                          Accuracy: ±{assessment.start_location_accuracy}m
                        </p>
                      )}
                    </div>
                  )}
                  {assessment.end_gps_latitude && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">End Location</p>
                      <p className="text-sm">
                        Lat: {assessment.end_gps_latitude}, Lng: {assessment.end_gps_longitude}
                      </p>
                      {assessment.end_location_accuracy && (
                        <p className="text-xs text-gray-500">
                          Accuracy: ±{assessment.end_location_accuracy}m
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assessment Answers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Assessment Answers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assessment.answers?.map((answer: any, index: number) => (
                  <div key={answer.id || index} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      {getAnswerIcon(answer)}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{answer.question_text}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Section: {answer.section_title}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="mb-2">
                              {answer.answer_value}
                            </Badge>
                            {answer.is_override && (
                              <Badge variant="secondary" className="ml-2">
                                Override
                              </Badge>
                            )}
                          </div>
                        </div>

                        {answer.comment && (
                          <div className="mt-3 p-3 bg-gray-50 rounded">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-600">Comment</span>
                            </div>
                            <p className="text-sm">{answer.comment}</p>
                          </div>
                        )}

                        {answer.photo_url && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Camera className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-600">Photo Evidence</span>
                            </div>
                            <img 
                              src={answer.photo_url} 
                              alt="Assessment evidence"
                              className="max-w-xs rounded border"
                            />
                            {answer.photo_metadata && (
                              <p className="text-xs text-gray-500 mt-1">
                                Taken: {new Date(answer.photo_metadata.timestamp).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}

                        {answer.override_reason && (
                          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
                            <div className="flex items-center gap-2 mb-1">
                              <Shield className="h-4 w-4 text-orange-500" />
                              <span className="text-sm font-medium text-orange-700">Override Reason</span>
                            </div>
                            <p className="text-sm text-orange-700">{answer.override_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {(!assessment.answers || assessment.answers.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No answers recorded for this assessment.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Override Management */}
          {assessment.status === 'OVERRIDE_REQUESTED' && can('hazard.assessment.override.approve') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Override Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showOverrideForm ? (
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-600">
                      This assessment has override requests that require manager approval.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowOverrideForm(true);
                          setPendingAction('approve');
                        }}
                        className="text-green-700 border-green-300 hover:bg-green-50"
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Approve Override
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowOverrideForm(true);
                          setPendingAction('deny');
                        }}
                        className="text-red-700 border-red-300 hover:bg-red-50"
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Deny Override
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {pendingAction === 'approve' ? 'Approval' : 'Denial'} Notes
                      </label>
                      <Textarea
                        value={overrideNotes}
                        onChange={(e) => setOverrideNotes(e.target.value)}
                        placeholder={`Provide notes for this ${pendingAction}...`}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleOverrideAction(pendingAction!)}
                        variant={pendingAction === 'approve' ? 'default' : 'destructive'}
                      >
                        Confirm {pendingAction === 'approve' ? 'Approval' : 'Denial'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowOverrideForm(false);
                          setPendingAction(null);
                          setOverrideNotes('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Audit Trail */}
          {assessment.audit_trail && assessment.audit_trail.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assessment.audit_trail.map((entry: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0">
                      <div className="h-2 w-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entry.action}</p>
                        <p className="text-xs text-gray-500">
                          {entry.user} • {new Date(entry.timestamp).toLocaleString()}
                        </p>
                        {entry.notes && (
                          <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}