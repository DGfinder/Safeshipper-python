/**
 * Training Catalog Component
 * Advanced training program catalog with filtering, search, and dangerous goods integration
 */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Progress } from '@/shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  Search,
  Filter,
  Grid,
  List,
  Clock,
  Users,
  Award,
  Play,
  BookOpen,
  Star,
  AlertTriangle,
  Shield,
  Truck,
  Package,
  FileText,
  Video,
  Headphones,
  Monitor,
  Zap,
  CheckCircle,
  ArrowRight,
  Calendar,
  Target,
  Bookmark,
  Download,
  ExternalLink,
  ChevronRight,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { TrainingProgram, TrainingModule, TrainingCategory, HAZARD_CLASSES } from '@/shared/types/training';
import TrainingService from '@/shared/services/trainingService';

interface TrainingCatalogProps {
  userId?: string;
  userRole?: string;
  className?: string;
  onProgramSelect?: (program: TrainingProgram) => void;
  showEnrollButton?: boolean;
  compactMode?: boolean;
}

interface CatalogFilters {
  search: string;
  category: string;
  difficulty: string;
  deliveryMethod: string;
  hazardClass: string;
  duration: string;
  isMandatory: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-100 text-green-800 border-green-200',
  intermediate: 'bg-blue-100 text-blue-800 border-blue-200',
  advanced: 'bg-orange-100 text-orange-800 border-orange-200',
  expert: 'bg-red-100 text-red-800 border-red-200'
};

const DELIVERY_METHOD_ICONS = {
  online: Monitor,
  blended: Zap,
  hands_on: Users,
  virtual_reality: Headphones,
  self_paced: Clock
};

const HAZARD_CLASS_COLORS = {
  '1': 'bg-orange-100 text-orange-800 border-orange-200',
  '2': 'bg-teal-100 text-teal-800 border-teal-200',
  '3': 'bg-red-100 text-red-800 border-red-200',
  '4': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  '5': 'bg-blue-100 text-blue-800 border-blue-200',
  '6': 'bg-purple-100 text-purple-800 border-purple-200',
  '7': 'bg-pink-100 text-pink-800 border-pink-200',
  '8': 'bg-gray-100 text-gray-800 border-gray-200',
  '9': 'bg-indigo-100 text-indigo-800 border-indigo-200'
};

export const TrainingCatalog: React.FC<TrainingCatalogProps> = ({
  userId,
  userRole,
  className = '',
  onProgramSelect,
  showEnrollButton = true,
  compactMode = false
}) => {
  // State management
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [recommendedPrograms, setRecommendedPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [showProgramDetails, setShowProgramDetails] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<CatalogFilters>({
    search: '',
    category: 'all',
    difficulty: 'all',
    deliveryMethod: 'all',
    hazardClass: 'all',
    duration: 'all',
    isMandatory: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Load data
  useEffect(() => {
    loadCatalogData();
  }, [userId, userRole]);

  const loadCatalogData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [programsResponse, categoriesData, recommendedData] = await Promise.all([
        TrainingService.getTrainingPrograms({}, 1, 100),
        TrainingService.getTrainingCategories(),
        userId ? TrainingService.getRecommendedPrograms(userId, userRole) : Promise.resolve([])
      ]);

      setPrograms(programsResponse.results);
      setCategories(categoriesData);
      setRecommendedPrograms(recommendedData);
    } catch (err) {
      console.error('Error loading catalog data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load training catalog');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort programs
  const filteredPrograms = useMemo(() => {
    let filtered = programs.filter(program => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          program.name.toLowerCase().includes(searchLower) ||
          program.description.toLowerCase().includes(searchLower) ||
          program.category.name.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category !== 'all' && program.category.id !== filters.category) {
        return false;
      }

      // Difficulty filter
      if (filters.difficulty !== 'all' && program.difficulty_level !== filters.difficulty) {
        return false;
      }

      // Delivery method filter
      if (filters.deliveryMethod !== 'all' && program.delivery_method !== filters.deliveryMethod) {
        return false;
      }

      // Duration filter
      if (filters.duration !== 'all') {
        const duration = program.duration_hours;
        switch (filters.duration) {
          case 'short':
            if (duration > 4) return false;
            break;
          case 'medium':
            if (duration <= 4 || duration > 12) return false;
            break;
          case 'long':
            if (duration <= 12) return false;
            break;
        }
      }

      // Mandatory filter
      if (filters.isMandatory !== 'all') {
        const isMandatory = filters.isMandatory === 'true';
        if (program.is_mandatory !== isMandatory) return false;
      }

      return true;
    });

    // Sort programs
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'duration':
          comparison = a.duration_hours - b.duration_hours;
          break;
        case 'difficulty':
          const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
          comparison = difficultyOrder[a.difficulty_level] - difficultyOrder[b.difficulty_level];
          break;
        case 'category':
          comparison = a.category.name.localeCompare(b.category.name);
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [programs, filters]);

  const handleFilterChange = (key: keyof CatalogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleProgramClick = (program: TrainingProgram) => {
    setSelectedProgram(program);
    if (onProgramSelect) {
      onProgramSelect(program);
    } else {
      setShowProgramDetails(true);
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return <Target className="h-4 w-4" />;
      case 'intermediate': return <ArrowRight className="h-4 w-4" />;
      case 'advanced': return <Zap className="h-4 w-4" />;
      case 'expert': return <Star className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getDeliveryMethodIcon = (method: string) => {
    const IconComponent = DELIVERY_METHOD_ICONS[method as keyof typeof DELIVERY_METHOD_ICONS] || Monitor;
    return <IconComponent className="h-4 w-4" />;
  };

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    if (hours === 1) return '1 hour';
    return `${hours} hours`;
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3">Loading training catalog...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Catalog</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadCatalogData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Training Catalog</h2>
          <p className="text-gray-600">
            {filteredPrograms.length} training program{filteredPrograms.length !== 1 ? 's' : ''} available
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Recommended Programs */}
      {recommendedPrograms.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Star className="h-5 w-5" />
              Recommended for You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedPrograms.slice(0, 3).map((program) => (
                <div
                  key={program.id}
                  className="p-3 bg-white rounded-lg border border-blue-200 cursor-pointer hover:border-blue-300 transition-colors"
                  onClick={() => handleProgramClick(program)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={DIFFICULTY_COLORS[program.difficulty_level]}>
                      {program.difficulty_level}
                    </Badge>
                    {program.is_mandatory && (
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        Mandatory
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-medium text-blue-900 mb-1">{program.name}</h4>
                  <div className="flex items-center gap-3 text-xs text-blue-700">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(program.duration_hours)}
                    </span>
                    <span>{program.category.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="xl:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search programs..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <Label>Category</Label>
              <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty */}
            <div>
              <Label>Difficulty</Label>
              <Select value={filters.difficulty} onValueChange={(value) => handleFilterChange('difficulty', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Delivery Method */}
            <div>
              <Label>Delivery</Label>
              <Select value={filters.deliveryMethod} onValueChange={(value) => handleFilterChange('deliveryMethod', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="blended">Blended</SelectItem>
                  <SelectItem value="hands_on">Hands-on</SelectItem>
                  <SelectItem value="virtual_reality">VR Training</SelectItem>
                  <SelectItem value="self_paced">Self-paced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div>
              <Label>Sort By</Label>
              <div className="flex gap-1">
                <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                    <SelectItem value="difficulty">Difficulty</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2"
                >
                  {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Programs Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {filteredPrograms.map((program) => (
          <Card
            key={program.id}
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              viewMode === 'list' ? 'flex-row' : ''
            }`}
            onClick={() => handleProgramClick(program)}
          >
            <CardHeader className={viewMode === 'list' ? 'pb-2' : ''}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={DIFFICULTY_COLORS[program.difficulty_level]}>
                      {getDifficultyIcon(program.difficulty_level)}
                      <span className="ml-1">{program.difficulty_level}</span>
                    </Badge>
                    {program.is_mandatory && (
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        Mandatory
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{program.name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{program.category.name}</p>
                </div>
                {getDeliveryMethodIcon(program.delivery_method)}
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {program.description}
              </p>
              
              <div className="space-y-3">
                {/* Program Stats */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(program.duration_hours)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Award className="h-4 w-4" />
                    <span>{program.passing_score}% pass</span>
                  </div>
                </div>

                {/* Prerequisites */}
                {program.prerequisite_programs.length > 0 && (
                  <div className="text-xs text-orange-600">
                    {program.prerequisite_programs.length} prerequisite(s) required
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProgramClick(program);
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  {showEnrollButton && (
                    <Button size="sm" variant="outline">
                      Enroll
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredPrograms.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Programs Found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your filters or search terms to find training programs.
            </p>
            <Button onClick={() => setFilters({
              search: '',
              category: 'all',
              difficulty: 'all',
              deliveryMethod: 'all',
              hazardClass: 'all',
              duration: 'all',
              isMandatory: 'all',
              sortBy: 'name',
              sortOrder: 'asc'
            })}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Program Details Dialog */}
      <Dialog open={showProgramDetails} onOpenChange={setShowProgramDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Training Program Details</DialogTitle>
          </DialogHeader>
          
          {selectedProgram && (
            <div className="space-y-6">
              {/* Program Header */}
              <div className="border-b pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold">{selectedProgram.name}</h2>
                  <Badge className={DIFFICULTY_COLORS[selectedProgram.difficulty_level]}>
                    {selectedProgram.difficulty_level}
                  </Badge>
                  {selectedProgram.is_mandatory && (
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      Mandatory
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600">{selectedProgram.description}</p>
              </div>

              {/* Program Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Program Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span>{selectedProgram.category.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span>{formatDuration(selectedProgram.duration_hours)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Method:</span>
                      <span className="capitalize">{selectedProgram.delivery_method.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Passing Score:</span>
                      <span>{selectedProgram.passing_score}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Requirements</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mandatory:</span>
                      <span>{selectedProgram.is_mandatory ? 'Yes' : 'No'}</span>
                    </div>
                    {selectedProgram.certificate_validity_months && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Certificate Valid:</span>
                        <span>{selectedProgram.certificate_validity_months} months</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prerequisites:</span>
                      <span>{selectedProgram.prerequisite_programs.length}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Applicable Roles</h3>
                  <div className="space-y-1">
                    {selectedProgram.applicable_roles.map((role, index) => (
                      <Badge key={index} variant="outline" className="mr-1 mb-1">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowProgramDetails(false)}>
                  Close
                </Button>
                {showEnrollButton && (
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Play className="h-4 w-4 mr-2" />
                    Enroll in Program
                  </Button>
                )}
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainingCatalog;