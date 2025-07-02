// Mock API service for development
export const mockData = {
  vehicles: [
    {
      id: '1',
      registration_number: 'WA123ABC',
      vehicle_type: 'SEMI',
      make: 'Volvo',
      model: 'FH540',
      year: 2020,
      status: 'AVAILABLE',
      capacity_kg: 16500,
      assigned_depot: 'Perth Depot',
      owning_company: 'SafeShipper Transport',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      registration_number: 'WA456DEF',
      vehicle_type: 'RIGID',
      make: 'Mercedes',
      model: 'Actros',
      year: 2019,
      status: 'IN_USE',
      capacity_kg: 12000,
      assigned_depot: 'Fremantle Depot',
      owning_company: 'SafeShipper Transport',
      created_at: '2024-01-02T00:00:00Z'
    }
  ],
  shipments: [
    {
      id: '1',
      tracking_number: 'SS240001',
      reference_number: 'REF001',
      status: 'IN_TRANSIT',
      origin_location: 'Perth',
      destination_location: 'Melbourne',
      items: [
        {
          id: '1',
          description: 'Dangerous Goods - Class 3',
          quantity: 2,
          is_dangerous_good: true,
          dangerous_good_entry: {
            un_number: 'UN1203',
            proper_shipping_name: 'Gasoline',
            hazard_class: '3'
          }
        }
      ],
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      tracking_number: 'SS240002',
      reference_number: 'REF002',
      status: 'DELIVERED',
      origin_location: 'Sydney',
      destination_location: 'Brisbane',
      items: [
        {
          id: '2',
          description: 'General Freight',
          quantity: 5,
          is_dangerous_good: false
        }
      ],
      created_at: '2024-01-02T00:00:00Z'
    }
  ]
}

export const mockApiService = {
  vehicles: {
    getAll: () => Promise.resolve({ data: mockData.vehicles }),
    getById: (id: string) => Promise.resolve({ data: mockData.vehicles.find(v => v.id === id) }),
    create: (data: any) => Promise.resolve({ data: { ...data, id: Date.now().toString() } }),
    update: (id: string, data: any) => Promise.resolve({ data: { ...data, id } }),
    delete: (id: string) => Promise.resolve({ data: { success: true } }),
  },
  shipments: {
    getAll: () => Promise.resolve({ data: mockData.shipments }),
    getById: (id: string) => Promise.resolve({ data: mockData.shipments.find(s => s.id === id) }),
    create: (data: any) => Promise.resolve({ data: { ...data, id: Date.now().toString() } }),
    update: (id: string, data: any) => Promise.resolve({ data: { ...data, id } }),
    delete: (id: string) => Promise.resolve({ data: { success: true } }),
  },
  dangerousGoods: {
    getAll: () => Promise.resolve({ data: [] }),
    getById: (id: string) => Promise.resolve({ data: null }),
    search: (query: string) => Promise.resolve({ data: [] }),
  },
  users: {
    getAll: () => Promise.resolve({ data: [] }),
    getById: (id: string) => Promise.resolve({ data: null }),
    create: (data: any) => Promise.resolve({ data: { ...data, id: Date.now().toString() } }),
    update: (id: string, data: any) => Promise.resolve({ data: { ...data, id } }),
    delete: (id: string) => Promise.resolve({ data: { success: true } }),
    getCurrentUser: () => Promise.resolve({ data: null }),
  }
} 