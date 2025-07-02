import { apiService } from './api'

export interface DangerousGood {
  id: number
  un_number: string
  proper_shipping_name: string
  simplified_name?: string
  hazard_class: string
  subsidiary_risks?: string
  packing_group?: string
  packing_group_display?: string
  hazard_labels_required?: string
  erg_guide_number?: string
  special_provisions?: string
  qty_ltd_passenger_aircraft?: string
  packing_instruction_passenger_aircraft?: string
  qty_ltd_cargo_aircraft?: string
  packing_instruction_cargo_aircraft?: string
  description_notes?: string
  is_marine_pollutant: boolean
  is_environmentally_hazardous: boolean
  created_at: string
  updated_at: string
}

export interface DGProductSynonym {
  id: number
  dangerous_good: number
  dangerous_good_un_number: string
  synonym: string
  source: string
  source_display: string
  created_at: string
  updated_at: string
}

export interface SegregationGroup {
  id: number
  code: string
  name: string
  description?: string
  dangerous_goods_uris: number[]
}

export interface SegregationRule {
  id: number
  rule_type: string
  rule_type_display: string
  primary_hazard_class?: string
  secondary_hazard_class?: string
  primary_segregation_group?: number
  primary_segregation_group_details?: SegregationGroup
  secondary_segregation_group?: number
  secondary_segregation_group_details?: SegregationGroup
  compatibility_status: string
  compatibility_status_display: string
  notes?: string
}

export interface DangerousGoodsListParams {
  page?: number
  page_size?: number
  search?: string
  un_number?: string
  hazard_class?: string
  packing_group?: string
  is_marine_pollutant?: boolean
  is_environmentally_hazardous?: boolean
}

export interface DGProductSynonymsListParams {
  page?: number
  page_size?: number
  search?: string
  dangerous_good__un_number?: string
  source?: string
}

export interface SegregationGroupsListParams {
  page?: number
  page_size?: number
  search?: string
  code?: string
}

export interface SegregationRulesListParams {
  page?: number
  page_size?: number
  search?: string
  rule_type?: string
  compatibility_status?: string
  primary_hazard_class?: string
  secondary_hazard_class?: string
}

export interface CompatibilityCheckParams {
  un_number1: string
  un_number2: string
}

// Dangerous Goods API
export const dangerousGoodsApi = {
  // Get all dangerous goods (for keyword matching)
  getAllDangerousGoods: () => apiService.get<DangerousGood[]>('/dangerous-goods/'),

  // Get dangerous goods with pagination and filters
  getDangerousGoods: (params?: DangerousGoodsListParams) => 
    apiService.get<{ results: DangerousGood[], count: number }>('/dangerous-goods/', params),

  // Get a single dangerous good by ID
  getDangerousGood: (id: number) => 
    apiService.get<DangerousGood>(`/dangerous-goods/${id}/`),

  // Lookup dangerous good by synonym
  lookupBySynonym: (query: string) => 
    apiService.get<DangerousGood>('/dangerous-goods/lookup-by-synonym/', { query }),

  // Create a new dangerous good
  createDangerousGood: (data: Partial<DangerousGood>) => 
    apiService.post<DangerousGood>('/dangerous-goods/', data),

  // Update a dangerous good
  updateDangerousGood: (id: number, data: Partial<DangerousGood>) => 
    apiService.put<DangerousGood>(`/dangerous-goods/${id}/`, data),

  // Delete a dangerous good
  deleteDangerousGood: (id: number) => 
    apiService.delete<void>(`/dangerous-goods/${id}/`),
}

// DG Product Synonyms API
export const dgSynonymsApi = {
  // Get DG product synonyms
  getSynonyms: (params?: DGProductSynonymsListParams) => 
    apiService.get<{ results: DGProductSynonym[], count: number }>('/dg-synonyms/', params),

  // Get a single synonym by ID
  getSynonym: (id: number) => 
    apiService.get<DGProductSynonym>(`/dg-synonyms/${id}/`),

  // Create a new synonym
  createSynonym: (data: Partial<DGProductSynonym>) => 
    apiService.post<DGProductSynonym>('/dg-synonyms/', data),

  // Update a synonym
  updateSynonym: (id: number, data: Partial<DGProductSynonym>) => 
    apiService.put<DGProductSynonym>(`/dg-synonyms/${id}/`, data),

  // Delete a synonym
  deleteSynonym: (id: number) => 
    apiService.delete<void>(`/dg-synonyms/${id}/`),
}

// Segregation Groups API
export const segregationGroupsApi = {
  // Get segregation groups
  getGroups: (params?: SegregationGroupsListParams) => 
    apiService.get<{ results: SegregationGroup[], count: number }>('/segregation-groups/', params),

  // Get a single group by ID
  getGroup: (id: number) => 
    apiService.get<SegregationGroup>(`/segregation-groups/${id}/`),

  // Create a new group
  createGroup: (data: Partial<SegregationGroup>) => 
    apiService.post<SegregationGroup>('/segregation-groups/', data),

  // Update a group
  updateGroup: (id: number, data: Partial<SegregationGroup>) => 
    apiService.put<SegregationGroup>(`/segregation-groups/${id}/`, data),

  // Delete a group
  deleteGroup: (id: number) => 
    apiService.delete<void>(`/segregation-groups/${id}/`),
}

// Segregation Rules API
export const segregationRulesApi = {
  // Get segregation rules
  getRules: (params?: SegregationRulesListParams) => 
    apiService.get<{ results: SegregationRule[], count: number }>('/segregation-rules/', params),

  // Get a single rule by ID
  getRule: (id: number) => 
    apiService.get<SegregationRule>(`/segregation-rules/${id}/`),

  // Create a new rule
  createRule: (data: Partial<SegregationRule>) => 
    apiService.post<SegregationRule>('/segregation-rules/', data),

  // Update a rule
  updateRule: (id: number, data: Partial<SegregationRule>) => 
    apiService.put<SegregationRule>(`/segregation-rules/${id}/`, data),

  // Delete a rule
  deleteRule: (id: number) => 
    apiService.delete<void>(`/segregation-rules/${id}/`),

  // Check compatibility between two dangerous goods
  checkCompatibility: (params: CompatibilityCheckParams) => 
    apiService.post<any>('/segregation-rules/check-compatibility/', params),
} 