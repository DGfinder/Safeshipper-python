"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Label } from "@/shared/components/ui/label";
import {
  MessageSquare,
  CheckCircle,
  Clock,
  User,
  Package,
  Loader2,
  AlertCircle,
  Star,
} from "lucide-react";

interface CustomerFeedbackFormProps {
  trackingNumber: string;
  existingFeedback?: {
    feedback_id: string;
    submitted_at: string;
    was_on_time: boolean;
    was_complete_and_undamaged: boolean;
    was_driver_professional: boolean;
    feedback_notes: string;
    delivery_success_score: number;
    feedback_summary: string;
  } | null;
  onFeedbackSubmitted?: (feedback: FeedbackResponse) => void;
}

interface FeedbackData {
  was_on_time: boolean | null;
  was_complete_and_undamaged: boolean | null;
  was_driver_professional: boolean | null;
  feedback_notes: string;
}

interface FeedbackResponse {
  message: string;
  feedback_id: string;
  submitted_at: string;
  delivery_success_score: number;
  feedback_summary: string;
  tracking_number: string;
}

const CustomerFeedbackForm: React.FC<CustomerFeedbackFormProps> = ({
  trackingNumber,
  existingFeedback,
  onFeedbackSubmitted,
}) => {
  const [feedback, setFeedback] = useState<FeedbackData>({
    was_on_time: null,
    was_complete_and_undamaged: null,
    was_driver_professional: null,
    feedback_notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResponse, setSubmissionResponse] = useState<FeedbackResponse | null>(null);

  const handleRadioChange = (
    field: keyof Pick<FeedbackData, 'was_on_time' | 'was_complete_and_undamaged' | 'was_driver_professional'>,
    value: string
  ) => {
    setFeedback(prev => ({
      ...prev,
      [field]: value === 'true',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (
      feedback.was_on_time === null ||
      feedback.was_complete_and_undamaged === null ||
      feedback.was_driver_professional === null
    ) {
      setSubmitError("Please answer all three questions");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/v1/tracking/public/${trackingNumber}/feedback/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          was_on_time: feedback.was_on_time,
          was_complete_and_undamaged: feedback.was_complete_and_undamaged,
          was_driver_professional: feedback.was_driver_professional,
          feedback_notes: feedback.feedback_notes.trim(),
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to submit feedback');
      }

      setSubmissionResponse(responseData);
      setIsSubmitted(true);
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(responseData);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = 
    feedback.was_on_time !== null &&
    feedback.was_complete_and_undamaged !== null &&
    feedback.was_driver_professional !== null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  // Show existing feedback if already submitted
  if (existingFeedback) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <CheckCircle className="h-5 w-5" />
            Thank You - Feedback Already Submitted
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              You have already provided feedback for this delivery. Thank you for helping us improve our service!
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">Your Delivery Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(existingFeedback.delivery_success_score)}`}>
                {existingFeedback.delivery_success_score}%
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Overall Rating</p>
              <p className="text-lg font-semibold text-gray-900">
                {existingFeedback.feedback_summary}
              </p>
            </div>
          </div>

          {/* Show your responses */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm text-gray-700">Your Responses:</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  On-time delivery
                </span>
                <Badge variant={existingFeedback.was_on_time ? "default" : "secondary"}>
                  {existingFeedback.was_on_time ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  Complete & undamaged
                </span>
                <Badge variant={existingFeedback.was_complete_and_undamaged ? "default" : "secondary"}>
                  {existingFeedback.was_complete_and_undamaged ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  Professional driver
                </span>
                <Badge variant={existingFeedback.was_driver_professional ? "default" : "secondary"}>
                  {existingFeedback.was_driver_professional ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
            
            {existingFeedback.feedback_notes && (
              <div className="mt-3 pt-3 border-t">
                <p className="font-medium text-sm text-gray-700 mb-1">Your Comments:</p>
                <p className="text-sm text-gray-600 italic">"{existingFeedback.feedback_notes}"</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            Submitted on {new Date(existingFeedback.submitted_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isSubmitted && submissionResponse) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            Thank You for Your Feedback!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your feedback has been successfully submitted and will help us improve our service.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">Delivery Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(submissionResponse.delivery_success_score)}`}>
                {submissionResponse.delivery_success_score}%
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Overall Rating</p>
              <p className="text-lg font-semibold text-gray-900">
                {submissionResponse.feedback_summary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            Submitted on {new Date(submissionResponse.submitted_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          How Was Your Delivery Experience?
        </CardTitle>
        <p className="text-sm text-gray-600">
          Help us improve our service by sharing your feedback about this delivery.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question 1: On Time Delivery */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium">
                Was your shipment delivered on time?
              </Label>
            </div>
            <RadioGroup
              value={feedback.was_on_time === null ? "" : feedback.was_on_time.toString()}
              onValueChange={(value) => handleRadioChange('was_on_time', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="on-time-yes" />
                <Label htmlFor="on-time-yes" className="text-sm">Yes, it was on time</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="on-time-no" />
                <Label htmlFor="on-time-no" className="text-sm">No, it was late</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Question 2: Complete and Undamaged */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium">
                Was your shipment complete and undamaged?
              </Label>
            </div>
            <RadioGroup
              value={feedback.was_complete_and_undamaged === null ? "" : feedback.was_complete_and_undamaged.toString()}
              onValueChange={(value) => handleRadioChange('was_complete_and_undamaged', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="complete-yes" />
                <Label htmlFor="complete-yes" className="text-sm">Yes, everything was perfect</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="complete-no" />
                <Label htmlFor="complete-no" className="text-sm">No, there were issues</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Question 3: Driver Professional */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium">
                Was the delivery driver professional and courteous?
              </Label>
            </div>
            <RadioGroup
              value={feedback.was_driver_professional === null ? "" : feedback.was_driver_professional.toString()}
              onValueChange={(value) => handleRadioChange('was_driver_professional', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="professional-yes" />
                <Label htmlFor="professional-yes" className="text-sm">Yes, very professional</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="professional-no" />
                <Label htmlFor="professional-no" className="text-sm">No, there were concerns</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Optional Comments */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Additional Comments (Optional)
            </Label>
            <Textarea
              placeholder="Share any additional thoughts about your delivery experience..."
              value={feedback.feedback_notes}
              onChange={(e) => setFeedback(prev => ({ ...prev, feedback_notes: e.target.value }))}
              maxLength={1000}
              className="resize-none"
              rows={3}
            />
            <p className="text-xs text-gray-500">
              {feedback.feedback_notes.length}/1000 characters
            </p>
          </div>

          {/* Error Display */}
          {submitError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {submitError}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting Feedback...
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomerFeedbackForm;