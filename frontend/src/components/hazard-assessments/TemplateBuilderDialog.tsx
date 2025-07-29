"use client";

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  GripVertical, 
  Edit, 
  Trash2, 
  Save, 
  X,
  ChevronDown,
  ChevronRight,
  Camera,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TemplateBuilderDialogProps {
  template?: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: any) => Promise<void>;
}

interface Question {
  id: string;
  text: string;
  question_type: 'YES_NO_NA' | 'PASS_FAIL_NA' | 'TEXT' | 'NUMERIC';
  order: number;
  is_photo_required_on_fail: boolean;
  is_comment_required_on_fail: boolean;
  is_critical_failure: boolean;
  is_required: boolean;
  help_text: string;
}

interface Section {
  id: string;
  title: string;
  description: string;
  order: number;
  is_required: boolean;
  questions: Question[];
  isExpanded?: boolean;
}

interface TemplateData {
  name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  sections: Section[];
}

// Sortable Section Component
function SortableSection({ 
  section, 
  onUpdateSection, 
  onDeleteSection, 
  onToggleExpanded 
}: {
  section: Section;
  onUpdateSection: (section: Section) => void;
  onDeleteSection: (sectionId: string) => void;
  onToggleExpanded: (sectionId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `question-${Date.now()}`,
      text: 'New question',
      question_type: 'YES_NO_NA',
      order: section.questions.length + 1,
      is_photo_required_on_fail: false,
      is_comment_required_on_fail: false,
      is_critical_failure: false,
      is_required: true,
      help_text: ''
    };

    onUpdateSection({
      ...section,
      questions: [...section.questions, newQuestion]
    });
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    const updatedQuestions = section.questions.map(q =>
      q.id === questionId ? { ...q, ...updates } : q
    );
    onUpdateSection({ ...section, questions: updatedQuestions });
  };

  const deleteQuestion = (questionId: string) => {
    const updatedQuestions = section.questions.filter(q => q.id !== questionId);
    onUpdateSection({ ...section, questions: updatedQuestions });
  };

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    const updatedQuestions = arrayMove(section.questions, fromIndex, toIndex);
    updatedQuestions.forEach((question, index) => {
      question.order = index + 1;
    });
    onUpdateSection({ ...section, questions: updatedQuestions });
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div {...listeners} {...attributes} className="cursor-grab">
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
            
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={section.title}
                    onChange={(e) => onUpdateSection({ ...section, title: e.target.value })}
                    placeholder="Section title"
                  />
                  <Textarea
                    value={section.description}
                    onChange={(e) => onUpdateSection({ ...section, description: e.target.value })}
                    placeholder="Section description"
                    rows={2}
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={section.is_required}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, is_required: checked })}
                    />
                    <Label className="text-sm">Required section</Label>
                  </div>
                </div>
              ) : (
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <button
                      onClick={() => onToggleExpanded(section.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {section.isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {section.title}
                    <Badge variant="outline" className="text-xs">
                      {section.questions.length} questions
                    </Badge>
                    {section.is_required && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                  </CardTitle>
                  {section.description && (
                    <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteSection(section.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        {section.isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              {section.questions.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-3 bg-gray-50">
                  {editingQuestion === question.id ? (
                    <QuestionEditor
                      question={question}
                      onSave={(updates) => {
                        updateQuestion(question.id, updates);
                        setEditingQuestion(null);
                      }}
                      onCancel={() => setEditingQuestion(null)}
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="text-sm font-medium text-gray-500 mt-1">
                        Q{question.order}
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-sm font-medium">{question.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {question.question_type.replace('_', ' ')}
                          </Badge>
                          {question.is_photo_required_on_fail && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Camera className="h-3 w-3" />
                              Photo
                            </Badge>
                          )}
                          {question.is_comment_required_on_fail && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              Comment
                            </Badge>
                          )}
                          {question.is_critical_failure && (
                            <Badge variant="destructive" className="text-xs flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Critical
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingQuestion(question.id)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteQuestion(question.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addQuestion}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Question Editor Component
function QuestionEditor({ 
  question, 
  onSave, 
  onCancel 
}: {
  question: Question;
  onSave: (updates: Partial<Question>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(question);

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm">Question Text</Label>
        <Textarea
          value={formData.text}
          onChange={(e) => setFormData({ ...formData, text: e.target.value })}
          placeholder="Enter question text"
          rows={2}
        />
      </div>

      <div>
        <Label className="text-sm">Question Type</Label>
        <Select
          value={formData.question_type}
          onValueChange={(value: any) => setFormData({ ...formData, question_type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="YES_NO_NA">Yes / No / N/A</SelectItem>
            <SelectItem value="PASS_FAIL_NA">Pass / Fail / N/A</SelectItem>
            <SelectItem value="TEXT">Text Input</SelectItem>
            <SelectItem value="NUMERIC">Numeric Input</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm">Help Text (Optional)</Label>
        <Input
          value={formData.help_text}
          onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
          placeholder="Additional guidance for this question"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.is_required}
            onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
          />
          <Label className="text-sm">Required</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.is_critical_failure}
            onCheckedChange={(checked) => setFormData({ ...formData, is_critical_failure: checked })}
          />
          <Label className="text-sm">Critical Failure</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.is_photo_required_on_fail}
            onCheckedChange={(checked) => setFormData({ ...formData, is_photo_required_on_fail: checked })}
          />
          <Label className="text-sm">Photo on Fail</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.is_comment_required_on_fail}
            onCheckedChange={(checked) => setFormData({ ...formData, is_comment_required_on_fail: checked })}
          />
          <Label className="text-sm">Comment on Fail</Label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(formData)}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function TemplateBuilderDialog({ 
  template, 
  isOpen, 
  onClose, 
  onSave 
}: TemplateBuilderDialogProps) {
  const [templateData, setTemplateData] = useState<TemplateData>({
    name: '',
    description: '',
    is_active: true,
    is_default: false,
    sections: []
  });

  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (template) {
      setTemplateData({
        name: template.name || '',
        description: template.description || '',
        is_active: template.is_active ?? true,
        is_default: template.is_default ?? false,
        sections: template.sections?.map((section: any) => ({
          ...section,
          isExpanded: true
        })) || []
      });
    } else {
      setTemplateData({
        name: '',
        description: '',
        is_active: true,
        is_default: false,
        sections: []
      });
    }
  }, [template, isOpen]);

  const addSection = () => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      description: '',
      order: templateData.sections.length + 1,
      is_required: true,
      questions: [],
      isExpanded: true
    };

    setTemplateData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const updateSection = (updatedSection: Section) => {
    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === updatedSection.id ? updatedSection : section
      )
    }));
  };

  const deleteSection = (sectionId: string) => {
    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId 
          ? { ...section, isExpanded: !section.isExpanded }
          : section
      )
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = templateData.sections.findIndex(section => section.id === active.id);
      const newIndex = templateData.sections.findIndex(section => section.id === over.id);

      const newSections = arrayMove(templateData.sections, oldIndex, newIndex);
      newSections.forEach((section, index) => {
        section.order = index + 1;
      });

      setTemplateData(prev => ({
        ...prev,
        sections: newSections
      }));
    }
  };

  const handleSave = async () => {
    if (!templateData.name.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (templateData.sections.length === 0) {
      alert('Please add at least one section');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(templateData);
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Template Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={templateData.name}
                onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={templateData.is_active}
                  onCheckedChange={(checked) => setTemplateData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={templateData.is_default}
                  onCheckedChange={(checked) => setTemplateData(prev => ({ ...prev, is_default: checked }))}
                />
                <Label>Default Template</Label>
              </div>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={templateData.description}
              onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter template description"
              rows={3}
            />
          </div>

          {/* Sections */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg font-medium">Sections</Label>
              <Button onClick={addSection} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={templateData.sections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {templateData.sections.map((section) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    onUpdateSection={updateSection}
                    onDeleteSection={deleteSection}
                    onToggleExpanded={toggleSectionExpanded}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {templateData.sections.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 mb-4">No sections added yet</p>
                <Button onClick={addSection} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Section
                </Button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}