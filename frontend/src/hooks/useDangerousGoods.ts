import { useQuery } from '@tanstack/react-query'
import { 
  dangerousGoodsApi, 
  dgSynonymsApi, 
  segregationGroupsApi, 
  segregationRulesApi,
  DangerousGood,
  DGProductSynonym,
  SegregationGroup,
  SegregationRule,
  DangerousGoodsListParams,
  DGProductSynonymsListParams,
  SegregationGroupsListParams,
  SegregationRulesListParams
} from '@/services/dangerous-goods'

// Re-export types for convenience
export type {
  DangerousGood,
  DGProductSynonym,
  SegregationGroup,
  SegregationRule,
  DangerousGoodsListParams,
  DGProductSynonymsListParams,
  SegregationGroupsListParams,
  SegregationRulesListParams
}

// Fetch all dangerous goods for keyword matching
export function useDangerousGoodsList() {
  return useQuery({
    queryKey: ['dangerous-goods', 'list'],
    queryFn: () => dangerousGoodsApi.getAllDangerousGoods(),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Fetch dangerous goods with pagination and filters
export function useDangerousGoods(params?: DangerousGoodsListParams) {
  return useQuery({
    queryKey: ['dangerous-goods', params],
    queryFn: () => dangerousGoodsApi.getDangerousGoods(params),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch a single dangerous good by ID
export function useDangerousGood(id: number) {
  return useQuery({
    queryKey: ['dangerous-goods', id],
    queryFn: () => dangerousGoodsApi.getDangerousGood(id),
    select: (data) => data.data,
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Lookup dangerous good by synonym
export function useDangerousGoodBySynonym(query: string) {
  return useQuery({
    queryKey: ['dangerous-goods', 'synonym', query],
    queryFn: () => dangerousGoodsApi.lookupBySynonym(query),
    select: (data) => data.data,
    enabled: !!query && query.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Fetch DG product synonyms
export function useDGProductSynonyms(params?: DGProductSynonymsListParams) {
  return useQuery({
    queryKey: ['dg-synonyms', params],
    queryFn: () => dgSynonymsApi.getSynonyms(params),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Fetch segregation groups
export function useSegregationGroups(params?: SegregationGroupsListParams) {
  return useQuery({
    queryKey: ['segregation-groups', params],
    queryFn: () => segregationGroupsApi.getGroups(params),
    select: (data) => data.data,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Fetch segregation rules
export function useSegregationRules(params?: SegregationRulesListParams) {
  return useQuery({
    queryKey: ['segregation-rules', params],
    queryFn: () => segregationRulesApi.getRules(params),
    select: (data) => data.data,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Check compatibility between two dangerous goods
export async function checkDGCompatibility(unNumber1: string, unNumber2: string) {
  const response = await segregationRulesApi.checkCompatibility({
    un_number1: unNumber1,
    un_number2: unNumber2
  })
  return response.data
} 