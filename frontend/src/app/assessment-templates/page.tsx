"use client";

import React, { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Copy, Edit, Trash2, Settings } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TemplateBuilderDialog } from '@/components/hazard-assessments/TemplateBuilderDialog';
import { useAssessmentTemplates } from '@/hooks/useAssessmentTemplates';

export default function AssessmentTemplatesPage() {
  const { can } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  const { 
    templates, 
    isLoading, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate, 
    cloneTemplate 
  } = useAssessmentTemplates();

  // Check permissions
  if (!can('hazard.template.view')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view assessment templates.</p>
        </div>
      </div>
    );
  }

  const filteredTemplates = templates?.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setIsBuilderOpen(true);
  };

  const handleEditTemplate = (template: any) => {
    setSelectedTemplate(template);
    setIsBuilderOpen(true);
  };

  const handleCloneTemplate = async (template: any) => {
    try {
      await cloneTemplate(template.id, `${template.name} (Copy)`);
    } catch (error) {
      console.error('Failed to clone template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      try {
        await deleteTemplate(templateId);
      } catch (error) {
        console.error('Failed to delete template:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assessment Templates</h1>
          <p className="text-gray-500">
            Create and manage hazard assessment templates for your organization
          </p>
        </div>
        
        {can('hazard.template.create') && (
          <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            <Settings className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery ? 'No templates match your search criteria.' : 'Get started by creating your first assessment template.'}
          </p>
          {can('hazard.template.create') && !searchQuery && (
            <Button onClick={handleCreateTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Version {template.version} • {template.sections_count} sections
                    </CardDescription>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {can('hazard.template.edit') && (
                        <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {can('hazard.template.create') && (
                        <DropdownMenuItem onClick={() => handleCloneTemplate(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Clone
                        </DropdownMenuItem>
                      )}
                      {can('hazard.template.delete') && (
                        <DropdownMenuItem 
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {template.description || 'No description provided'}
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {template.is_default && (
                      <Badge variant="outline">Default</Badge>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    <div className="flex justify-between">
                      <span>{template.questions_count} questions</span>
                      <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Builder Dialog */}
      {isBuilderOpen && (
        <TemplateBuilderDialog
          template={selectedTemplate}
          isOpen={isBuilderOpen}
          onClose={() => {
            setIsBuilderOpen(false);
            setSelectedTemplate(null);
          }}
          onSave={async (templateData) => {
            try {
              if (selectedTemplate) {
                await updateTemplate(selectedTemplate.id, templateData);
              } else {
                await createTemplate(templateData);
              }
              setIsBuilderOpen(false);
              setSelectedTemplate(null);
            } catch (error) {
              console.error('Failed to save template:', error);
            }
          }}
        />
      )}
    </div>
  );
}