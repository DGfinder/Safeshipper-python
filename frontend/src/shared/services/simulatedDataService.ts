// simulatedDataService.ts
// Realistic simulation data for OutbackHaul Transport - Perth-based road train trucking company
// Serving Western Australia with 40 trucks and 45 drivers

// Note: date-fns is not available in this project, using native Date methods instead

// Company Information
export const COMPANY_INFO = {
  name: "OutbackHaul Transport Pty Ltd",
  abn: "54 123 456 789",
  address: "123 Great Eastern Highway, Perth WA 6000",
  phone: "+61 8 9234 5678",
  email: "dispatch@outbackhaul.com.au",
  emergencyContact: "000 or ChemAlert 1800 424 253",
  license: "WA Transport License #TL789456",
  specialization: "Road Train Freight & Dangerous Goods Transport",
  established: "1987",
  employees: 85,
  fleet_size: 40,
  driver_count: 45,
};

// Western Australian Routes and Locations
export const WA_LOCATIONS = {
  // Major Cities
  perth: { name: "Perth", lat: -31.9505, lng: 115.8605, population: 2100000 },
  fremantle: { name: "Fremantle", lat: -32.0569, lng: 115.7444, population: 30000 },
  
  // Pilbara Mining Region
  karratha: { name: "Karratha", lat: -20.7364, lng: 116.8460, population: 23000 },
  portHedland: { name: "Port Hedland", lat: -20.3099, lng: 118.6011, population: 15000 },
  newman: { name: "Newman", lat: -23.3585, lng: 119.7375, population: 5500 },
  tomPrice: { name: "Tom Price", lat: -22.6936, lng: 117.7893, population: 3200 },
  
  // Goldfields
  kalgoorlie: { name: "Kalgoorlie", lat: -30.7497, lng: 121.4680, population: 32000 },
  leonora: { name: "Leonora", lat: -28.8833, lng: 121.3167, population: 400 },
  
  // Regional Centers
  geraldton: { name: "Geraldton", lat: -28.7774, lng: 114.6142, population: 38000 },
  albany: { name: "Albany", lat: -35.0275, lng: 117.8840, population: 35000 },
  broome: { name: "Broome", lat: -17.9614, lng: 122.2359, population: 14000 },
  
  // Interstate
  adelaide: { name: "Adelaide", lat: -34.9285, lng: 138.6007, population: 1350000 },
  darwin: { name: "Darwin", lat: -12.4634, lng: 130.8456, population: 150000 },
  
  // Mining Sites
  mtGibson: { name: "Mt Gibson Iron", lat: -29.3667, lng: 117.2167, population: 0 },
  mtWhaleback: { name: "Mt Whaleback Mine", lat: -23.3583, lng: 119.7417, population: 0 },
  superPit: { name: "Super Pit Kalgoorlie", lat: -30.7833, lng: 121.5167, population: 0 },
};

// Realistic WA Routes
export const WA_ROUTES = [
  // Pilbara Mining Routes
  {
    id: "pilbara-1",
    name: "Perth to Port Hedland",
    origin: WA_LOCATIONS.perth,
    destination: WA_LOCATIONS.portHedland,
    distance: 1638,
    estimatedHours: 18,
    roadType: "Highway",
    restrictions: "Road Train Approved",
    fuelStops: ["Geraldton", "Carnarvon", "Onslow"],
    seasonalRisks: ["Cyclone season (Nov-Apr)"],
  },
  {
    id: "pilbara-2", 
    name: "Perth to Karratha",
    origin: WA_LOCATIONS.perth,
    destination: WA_LOCATIONS.karratha,
    distance: 1532,
    estimatedHours: 17,
    roadType: "Highway",
    restrictions: "Road Train Approved",
    fuelStops: ["Geraldton", "Carnarvon"],
    seasonalRisks: ["Cyclone season (Nov-Apr)"],
  },
  {
    id: "pilbara-3",
    name: "Perth to Newman",
    origin: WA_LOCATIONS.perth,
    destination: WA_LOCATIONS.newman,
    distance: 1186,
    estimatedHours: 13,
    roadType: "Highway",
    restrictions: "Road Train Approved",
    fuelStops: ["Geraldton", "Meekatharra"],
    seasonalRisks: ["Extreme heat (Dec-Feb)"],
  },
  
  // Goldfields Routes
  {
    id: "goldfields-1",
    name: "Perth to Kalgoorlie",
    origin: WA_LOCATIONS.perth,
    destination: WA_LOCATIONS.kalgoorlie,
    distance: 595,
    estimatedHours: 7,
    roadType: "Highway",
    restrictions: "Road Train Approved",
    fuelStops: ["Merredin", "Southern Cross"],
    seasonalRisks: ["Dust storms (summer)"],
  },
  
  // Regional Routes
  {
    id: "regional-1",
    name: "Perth to Albany",
    origin: WA_LOCATIONS.perth,
    destination: WA_LOCATIONS.albany,
    distance: 418,
    estimatedHours: 5,
    roadType: "Highway",
    restrictions: "B-Double approved",
    fuelStops: ["Bunbury", "Mount Barker"],
    seasonalRisks: ["Winter rain (Jun-Aug)"],
  },
  {
    id: "regional-2",
    name: "Perth to Geraldton",
    origin: WA_LOCATIONS.perth,
    destination: WA_LOCATIONS.geraldton,
    distance: 424,
    estimatedHours: 5,
    roadType: "Highway",
    restrictions: "Road Train Approved",
    fuelStops: ["Bindoon", "Dongara"],
    seasonalRisks: ["Strong winds (winter)"],
  },
  {
    id: "regional-3",
    name: "Perth to Broome",
    origin: WA_LOCATIONS.perth,
    destination: WA_LOCATIONS.broome,
    distance: 2231,
    estimatedHours: 26,
    roadType: "Highway",
    restrictions: "Road Train Approved",
    fuelStops: ["Geraldton", "Carnarvon", "Port Hedland"],
    seasonalRisks: ["Cyclone season (Nov-Apr)", "Wet season flooding"],
  },
  
  // Interstate Routes
  {
    id: "interstate-1",
    name: "Perth to Adelaide",
    origin: WA_LOCATIONS.perth,
    destination: WA_LOCATIONS.adelaide,
    distance: 2130,
    estimatedHours: 24,
    roadType: "Highway",
    restrictions: "Road Train Approved",
    fuelStops: ["Kalgoorlie", "Ceduna", "Port Augusta"],
    seasonalRisks: ["Nullarbor extreme weather"],
  },
  {
    id: "interstate-2",
    name: "Perth to Darwin",
    origin: WA_LOCATIONS.perth,
    destination: WA_LOCATIONS.darwin,
    distance: 4042,
    estimatedHours: 45,
    roadType: "Highway",
    restrictions: "Road Train Approved",
    fuelStops: ["Port Hedland", "Broome", "Kununurra", "Katherine"],
    seasonalRisks: ["Wet season (Nov-Apr)", "Road closures"],
  },
];

// Australian Names for Drivers
export const AUSTRALIAN_NAMES = {
  male: [
    "Bruce Thompson", "Steve Mitchell", "Dave Wilson", "Tony Robertson", "Paul Anderson",
    "Mike Johnson", "Jim Clark", "Chris Taylor", "Mark Davis", "Shane Miller",
    "Brett Walker", "Dean Harris", "Luke Martin", "Adam White", "Ryan Jackson",
    "Nathan Brown", "Scott Lee", "Craig Thompson", "Jason Williams", "Darren Jones",
    "Glenn Edwards", "Wayne Phillips", "Matt Campbell", "Troy Parker", "Josh Evans",
  ],
  female: [
    "Sarah Kennedy", "Lisa McDonald", "Emma Watson", "Kate Thompson", "Amy Wilson",
    "Melissa Johnson", "Rachel Brown", "Joanne Smith", "Amanda Davis", "Nicole Taylor",
    "Stephanie Martin", "Michelle Wilson", "Jennifer Clark", "Rebecca Miller", "Danielle Lee",
    "Samantha Harris", "Natalie Jackson", "Leanne Thompson", "Kylie Anderson", "Tanya White",
  ],
};

// Realistic Truck Specifications
export const TRUCK_SPECIFICATIONS = {
  roadTrain: {
    type: "Road Train",
    configuration: "Prime Mover + 3 Trailers",
    maxLength: 53.5,
    maxWeight: 125000,
    axles: 19,
    makes: ["Kenworth T909", "Mack Trident", "Volvo FH16", "Scania R730"],
    engineSpecs: ["C15 600hp", "MP10 685hp", "D16G 750hp", "DC16 730hp"],
    gearbox: ["18-speed manual", "Automated manual"],
    suspension: ["Air ride", "Leaf spring"],
    fuel: ["Diesel", "B20 Biodiesel"],
    capacity: "120,000L+ cargo",
  },
  bDouble: {
    type: "B-Double",
    configuration: "Prime Mover + 2 Trailers",
    maxLength: 25.0,
    maxWeight: 68000,
    axles: 9,
    makes: ["Kenworth T409", "Mack Granite", "Volvo FH", "Scania R580"],
    engineSpecs: ["C13 480hp", "MP8 485hp", "D13K 540hp", "DC13 540hp"],
    gearbox: ["16-speed manual", "Automated manual"],
    suspension: ["Air ride", "Leaf spring"],
    fuel: ["Diesel", "B20 Biodiesel"],
    capacity: "80,000L cargo",
  },
  semiTrailer: {
    type: "Semi-Trailer",
    configuration: "Prime Mover + 1 Trailer",
    maxLength: 19.0,
    maxWeight: 42500,
    axles: 6,
    makes: ["Kenworth T360", "Mack Metro", "Volvo FE", "Scania P410"],
    engineSpecs: ["C9 370hp", "MP7 425hp", "D11K 450hp", "DC09 410hp"],
    gearbox: ["12-speed manual", "Automated manual"],
    suspension: ["Air ride", "Leaf spring"],
    fuel: ["Diesel", "CNG"],
    capacity: "40,000L cargo",
  },
  rigidTruck: {
    type: "Rigid Truck",
    configuration: "Single Unit",
    maxLength: 12.5,
    maxWeight: 26000,
    axles: 3,
    makes: ["Isuzu FVZ", "Hino 700", "Volvo FM", "Scania P280"],
    engineSpecs: ["4HK1 240hp", "A09C 350hp", "D9K 360hp", "DC09 280hp"],
    gearbox: ["9-speed manual", "Automated manual"],
    suspension: ["Leaf spring", "Air ride"],
    fuel: ["Diesel", "Electric"],
    capacity: "20,000L cargo",
  },
};

// Dangerous Goods Classifications for Australian Mining/Industrial
export const DANGEROUS_GOODS_CATALOG = {
  mining: [
    {
      unNumber: "0331",
      properShippingName: "EXPLOSIVE, BLASTING, TYPE B",
      hazardClass: "1.5",
      packingGroup: "",
      description: "Mining explosives for open cut operations",
      quantity: "25,000kg",
      commonFor: "Iron ore, gold mining",
      emergencyProcedures: "Evacuation zone 800m, no flames/sparks",
      compliance: "DANGEROUS_GOODS_LICENCE_REQUIRED",
    },
    {
      unNumber: "1791",
      properShippingName: "HYPOCHLORITE SOLUTION",
      hazardClass: "8",
      packingGroup: "III",
      description: "Industrial bleaching agent for mineral processing",
      quantity: "15,000L",
      commonFor: "Gold processing, water treatment",
      emergencyProcedures: "Corrosive - avoid skin contact",
      compliance: "COMPLIANT",
    },
    {
      unNumber: "1830",
      properShippingName: "SULPHURIC ACID",
      hazardClass: "8",
      packingGroup: "II",
      description: "Industrial acid for mineral processing",
      quantity: "20,000L",
      commonFor: "Copper, nickel processing",
      emergencyProcedures: "Extreme corrosive - full PPE required",
      compliance: "COMPLIANT",
    },
    {
      unNumber: "1202",
      properShippingName: "DIESEL FUEL",
      hazardClass: "3",
      packingGroup: "III",
      description: "Fuel for mining equipment",
      quantity: "40,000L",
      commonFor: "Remote mine sites",
      emergencyProcedures: "Flammable - no ignition sources",
      compliance: "COMPLIANT",
    },
  ],
  industrial: [
    {
      unNumber: "1005",
      properShippingName: "AMMONIA, ANHYDROUS",
      hazardClass: "2.3",
      packingGroup: "",
      description: "Industrial refrigerant and chemical feedstock",
      quantity: "5,000kg",
      commonFor: "Refrigeration, chemical plants",
      emergencyProcedures: "Toxic gas - evacuate downwind",
      compliance: "COMPLIANT",
    },
    {
      unNumber: "1017",
      properShippingName: "CHLORINE",
      hazardClass: "2.3",
      packingGroup: "",
      description: "Water treatment and chemical manufacturing",
      quantity: "2,000kg",
      commonFor: "Water treatment plants",
      emergencyProcedures: "Toxic gas - immediate evacuation",
      compliance: "COMPLIANT",
    },
    {
      unNumber: "1203",
      properShippingName: "GASOLINE",
      hazardClass: "3",
      packingGroup: "II",
      description: "Motor fuel for transportation",
      quantity: "35,000L",
      commonFor: "Fuel distribution",
      emergencyProcedures: "Highly flammable - no ignition",
      compliance: "COMPLIANT",
    },
  ],
  agricultural: [
    {
      unNumber: "2783",
      properShippingName: "ORGANOPHOSPHORUS PESTICIDE, SOLID, TOXIC",
      hazardClass: "6.1",
      packingGroup: "II",
      description: "Agricultural pesticide for crop protection",
      quantity: "500kg",
      commonFor: "Grain farming, horticulture",
      emergencyProcedures: "Toxic - avoid inhalation/skin contact",
      compliance: "COMPLIANT",
    },
    {
      unNumber: "1760",
      properShippingName: "CORROSIVE LIQUID, N.O.S.",
      hazardClass: "8",
      packingGroup: "III",
      description: "Liquid fertilizer concentrate",
      quantity: "8,000L",
      commonFor: "Broadacre farming",
      emergencyProcedures: "Corrosive - flush with water",
      compliance: "COMPLIANT",
    },
  ],
  medical: [
    {
      unNumber: "3373",
      properShippingName: "BIOLOGICAL SUBSTANCE, CATEGORY B",
      hazardClass: "6.2",
      packingGroup: "",
      description: "Medical specimens and samples",
      quantity: "50kg",
      commonFor: "Pathology, research",
      emergencyProcedures: "Biohazard - containment protocols",
      compliance: "COMPLIANT",
    },
    {
      unNumber: "1072",
      properShippingName: "OXYGEN, COMPRESSED",
      hazardClass: "2.2",
      packingGroup: "",
      description: "Medical oxygen for hospitals",
      quantity: "200 cylinders",
      commonFor: "Hospitals, aged care",
      emergencyProcedures: "Oxidizer - keep away from flames",
      compliance: "COMPLIANT",
    },
  ],
  manufacturing: [
    {
      unNumber: "1789",
      properShippingName: "HYDROCHLORIC ACID",
      hazardClass: "8",
      packingGroup: "II",
      description: "Industrial cleaning acid",
      quantity: "10,000L",
      commonFor: "Steel processing, chemical manufacturing",
      emergencyProcedures: "Corrosive - neutralize with lime",
      compliance: "COMPLIANT",
    },
    {
      unNumber: "1824",
      properShippingName: "SODIUM HYDROXIDE SOLUTION",
      hazardClass: "8",
      packingGroup: "II",
      description: "Caustic soda solution",
      quantity: "8,000L",
      commonFor: "Pulp and paper, petroleum refining",
      emergencyProcedures: "Caustic - dilute with water",
      compliance: "COMPLIANT",
    },
    {
      unNumber: "1993",
      properShippingName: "FLAMMABLE LIQUID, N.O.S.",
      hazardClass: "3",
      packingGroup: "III",
      description: "Industrial solvent",
      quantity: "12,000L",
      commonFor: "Manufacturing, cleaning",
      emergencyProcedures: "Flammable - eliminate ignition sources",
      compliance: "COMPLIANT",
    }
  ],
  farming: [
    {
      unNumber: "2758",
      properShippingName: "CARBAMATE PESTICIDE, LIQUID, TOXIC",
      hazardClass: "6.1",
      packingGroup: "III",
      description: "Agricultural pesticide",
      quantity: "2,000L",
      commonFor: "Crop protection",
      emergencyProcedures: "Toxic - avoid inhalation",
      compliance: "COMPLIANT",
    },
    {
      unNumber: "1760",
      properShippingName: "CORROSIVE LIQUID, N.O.S.",
      hazardClass: "8",
      packingGroup: "III",
      description: "Agricultural fertilizer component",
      quantity: "5,000L",
      commonFor: "Fertilizer production",
      emergencyProcedures: "Corrosive - flush with water",
      compliance: "COMPLIANT",
    }
  ],
  pharmaceutical: [
    {
      unNumber: "1170",
      properShippingName: "ETHANOL",
      hazardClass: "3",
      packingGroup: "II",
      description: "Medical grade ethanol",
      quantity: "500L",
      commonFor: "Hospital disinfection",
      emergencyProcedures: "Flammable - no ignition sources",
      compliance: "COMPLIANT",
    },
    {
      unNumber: "2811",
      properShippingName: "TOXIC SOLID, ORGANIC, N.O.S.",
      hazardClass: "6.1",
      packingGroup: "III",
      description: "Medical waste",
      quantity: "200kg",
      commonFor: "Hospital waste disposal",
      emergencyProcedures: "Toxic - PPE required",
      compliance: "COMPLIANT",
    }
  ],
  retail: [
    {
      unNumber: "1950",
      properShippingName: "AEROSOLS",
      hazardClass: "2.1",
      packingGroup: "",
      description: "Consumer aerosol products",
      quantity: "1,000 units",
      commonFor: "Retail distribution",
      emergencyProcedures: "Pressurized - avoid heat",
      compliance: "COMPLIANT",
    }
  ],
  nonCompliant: [
    {
      unNumber: "1203",
      properShippingName: "GASOLINE",
      hazardClass: "3",
      packingGroup: "II",
      description: "Motor fuel - EXPIRED DOCUMENTATION",
      quantity: "35,000L",
      commonFor: "Fuel distribution",
      emergencyProcedures: "Highly flammable - no ignition",
      compliance: "NON_COMPLIANT",
      issues: ["Expired dangerous goods license", "Missing placarding"],
    },
    {
      unNumber: "1831",
      properShippingName: "SULPHURIC ACID, FUMING",
      hazardClass: "8",
      packingGroup: "I",
      description: "Industrial acid - IMPROPER PACKAGING",
      quantity: "5,000L",
      commonFor: "Chemical processing",
      emergencyProcedures: "Extreme corrosive - full PPE required",
      compliance: "NON_COMPLIANT",
      issues: ["Improper packaging", "Driver not certified for Class 8"],
    },
  ],
};

// Australian Customer Companies
export const CUSTOMER_COMPANIES = {
  mining: [
    "BHP Billiton", "Rio Tinto", "Fortescue Metals Group", "Newcrest Mining",
    "Northern Star Resources", "Evolution Mining", "Mineral Resources",
    "Pilbara Minerals", "IGO Limited", "Sandfire Resources",
  ],
  industrial: [
    "Wesfarmers", "Alcoa Australia", "Chevron Australia", "Woodside Energy",
    "Santos", "Caltex Australia", "Viva Energy", "BP Australia",
    "ExxonMobil Australia", "Shell Australia",
  ],
  agricultural: [
    "Elders Limited", "Nutrien Ag Solutions", "Landmark", "Rural Co",
    "Nufarm Australia", "CSBP Limited", "Incitec Pivot", "Summit Fertilizers",
    "Farmers Centre", "Ruralco Holdings",
  ],
  medical: [
    "Pathwest", "Clinipath", "PathCare", "Australian Clinical Labs",
    "Healius", "Sonic Healthcare", "Ramsay Health Care", "Fiona Stanley Hospital",
    "Royal Perth Hospital", "Sir Charles Gairdner Hospital",
  ],
  retail: [
    "Woolworths", "Coles", "Bunnings Warehouse", "Kmart Australia",
    "Target Australia", "Big W", "Harvey Norman", "JB Hi-Fi",
    "Officeworks", "Supercheap Auto",
  ],
};

// Simple seeded random number generator for consistent data
let seed = 12345;
function seededRandom(): number {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

// Generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + seededRandom() * (end.getTime() - start.getTime()));
}

// Generate WA registration number (format: 1ABC123)
function generateWARegistration(): string {
  const digits = Math.floor(seededRandom() * 9) + 1;
  const letters = String.fromCharCode(65 + Math.floor(seededRandom() * 26)) +
                  String.fromCharCode(65 + Math.floor(seededRandom() * 26)) +
                  String.fromCharCode(65 + Math.floor(seededRandom() * 26));
  const numbers = Math.floor(seededRandom() * 900) + 100;
  return `${digits}${letters}${numbers}`;
}

// Simulation Data Generator Class
class SimulatedDataService {
  private drivers: any[] = [];
  private vehicles: any[] = [];
  private shipments: any[] = [];
  private initialized = false;

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    if (this.initialized) return;
    
    this.generateDrivers();
    this.generateVehicles();
    this.generateShipments();
    
    this.initialized = true;
  }

  private generateDrivers() {
    const allNames = [...AUSTRALIAN_NAMES.male, ...AUSTRALIAN_NAMES.female];
    const licenseTypes = ["MC", "HC", "HR"];
    const states = ["WA", "SA", "NT", "VIC"];
    
    for (let i = 0; i < 45; i++) {
      const name = allNames[Math.floor(seededRandom() * allNames.length)];
      const [firstName, lastName] = name.split(" ");
      
      this.drivers.push({
        id: `driver-${i + 1}`,
        name,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@outbackhaul.com.au`,
        phone: `+61 4${Math.floor(seededRandom() * 90000000) + 10000000}`,
        licenseNumber: `WA${Math.floor(seededRandom() * 9000000) + 1000000}`,
        licenseType: licenseTypes[Math.floor(seededRandom() * licenseTypes.length)],
        dangerousGoodsLicense: seededRandom() > 0.3,
        experience: Math.floor(seededRandom() * 25) + 2,
        status: seededRandom() > 0.7 ? "OFF_DUTY" : (seededRandom() > 0.5 ? "ON_DUTY" : "DRIVING"),
        homeBase: "Perth",
        emergencyContact: {
          name: `${firstName} Emergency Contact`,
          phone: `+61 8 9${Math.floor(seededRandom() * 9000000) + 1000000}`,
        },
        certifications: [
          "Heavy Vehicle License",
          "First Aid Certificate",
          ...(seededRandom() > 0.3 ? ["Dangerous Goods License"] : []),
          ...(seededRandom() > 0.7 ? ["Load Restraint Certificate"] : []),
        ],
        dateOfBirth: randomDate(new Date(1960, 0, 1), new Date(1990, 0, 1)).toISOString(),
        hireDate: randomDate(new Date(2010, 0, 1), new Date(2024, 0, 1)).toISOString(),
        address: `${Math.floor(seededRandom() * 999) + 1} ${["Main", "High", "Queen", "King", "George"][Math.floor(seededRandom() * 5)]} Street, ${["Perth", "Fremantle", "Mandurah", "Rockingham"][Math.floor(seededRandom() * 4)]} WA ${Math.floor(seededRandom() * 90) + 6000}`,
      });
    }
  }

  private generateVehicles() {
    const truckTypes = [
      { type: "roadTrain", count: 15 },
      { type: "bDouble", count: 12 },
      { type: "semiTrailer", count: 10 },
      { type: "rigidTruck", count: 3 },
    ];

    let vehicleId = 1;
    
    truckTypes.forEach(({ type, count }) => {
      const specs = TRUCK_SPECIFICATIONS[type as keyof typeof TRUCK_SPECIFICATIONS];
      
      for (let i = 0; i < count; i++) {
        const make = specs.makes[Math.floor(seededRandom() * specs.makes.length)];
        const year = Math.floor(seededRandom() * 10) + 2014;
        const assignedDriver = seededRandom() > 0.2 ? this.drivers[Math.floor(seededRandom() * this.drivers.length)] : null;
        
        const statuses = ["ACTIVE", "IN_TRANSIT", "MAINTENANCE", "AVAILABLE"];
        const status = assignedDriver ? 
          (seededRandom() > 0.4 ? "IN_TRANSIT" : "ACTIVE") : 
          (seededRandom() > 0.8 ? "MAINTENANCE" : "AVAILABLE");
        
        this.vehicles.push({
          id: `vehicle-${vehicleId}`,
          registration: generateWARegistration(),
          make,
          year,
          type: specs.type,
          configuration: specs.configuration,
          maxWeight: specs.maxWeight,
          maxLength: specs.maxLength,
          axles: specs.axles,
          engineSpec: specs.engineSpecs[Math.floor(seededRandom() * specs.engineSpecs.length)],
          gearbox: specs.gearbox[Math.floor(seededRandom() * specs.gearbox.length)],
          suspension: specs.suspension[Math.floor(seededRandom() * specs.suspension.length)],
          fuel: specs.fuel[Math.floor(seededRandom() * specs.fuel.length)],
          capacity: specs.capacity,
          status,
          location: this.getRandomLocation(),
          locationIsFresh: seededRandom() > 0.1,
          assignedDriver,
          activeShipment: status === "IN_TRANSIT" ? this.generateActiveShipment() : null,
          nextService: new Date(new Date('2024-01-31').getTime() + (Math.floor(seededRandom() * 90) + 30) * 24 * 60 * 60 * 1000),
          odometer: Math.floor(seededRandom() * 800000) + 200000,
          lastInspection: new Date(new Date('2024-01-31').getTime() - Math.floor(seededRandom() * 90) * 24 * 60 * 60 * 1000),
          insurance: {
            provider: "Suncorp Commercial",
            policyNumber: `SC${Math.floor(seededRandom() * 9000000) + 1000000}`,
            expires: new Date(new Date('2024-01-31').getTime() + (Math.floor(seededRandom() * 200) + 100) * 24 * 60 * 60 * 1000),
          },
          registration_expires: new Date(new Date('2024-01-31').getTime() + (Math.floor(seededRandom() * 200) + 100) * 24 * 60 * 60 * 1000),
          company: COMPANY_INFO,
        });
        
        vehicleId++;
      }
    });
  }

  private getRandomLocation() {
    const locations = Object.values(WA_LOCATIONS);
    const location = locations[Math.floor(seededRandom() * locations.length)];
    return {
      lat: location.lat + (seededRandom() - 0.5) * 0.1,
      lng: location.lng + (seededRandom() - 0.5) * 0.1,
      name: location.name,
    };
  }

  private generateActiveShipment() {
    const route = WA_ROUTES[Math.floor(seededRandom() * WA_ROUTES.length)];
    const dangGoods = this.selectDangerousGoods();
    // Use consistent ID pattern - this should be a sequential number for active shipment
    const activeShipmentId = `OH-${this.shipments.length + 1}-2024`;
    
    return {
      id: activeShipmentId,
      trackingNumber: `OH-2024-${(this.shipments.length + 1).toString().padStart(5, '0')}`,
      status: "IN_TRANSIT",
      origin: route.origin.name,
      destination: route.destination.name,
      route: `${route.origin.name} → ${route.destination.name}`,
      customerName: this.getRandomCustomer(),
      estimatedDelivery: new Date('2024-01-15T00:00:00Z').toISOString(), // Fixed demo date
      hasDangerousGoods: dangGoods.length > 0,
      dangerousGoods: dangGoods,
      emergencyContact: COMPANY_INFO.emergencyContact,
      specialInstructions: this.generateSpecialInstructions(dangGoods),
      progress: Math.floor(seededRandom() * 80) + 10,
      weight: `${Math.floor(seededRandom() * 40) + 10},${Math.floor(seededRandom() * 900) + 100} KG`,
      distance: `${route.distance} km`,
    };
  }

  private selectDangerousGoods() {
    const categories = Object.keys(DANGEROUS_GOODS_CATALOG);
    const selectedCategory = categories[Math.floor(seededRandom() * categories.length)] as keyof typeof DANGEROUS_GOODS_CATALOG;
    
    const goods = DANGEROUS_GOODS_CATALOG[selectedCategory];
    const count = Math.floor(seededRandom() * 3) + 1;
    
    return Array.from({ length: count }, () => {
      const good = goods[Math.floor(seededRandom() * goods.length)];
      return {
        class: good.hazardClass,
        count: Math.floor(seededRandom() * 20) + 5,
        unNumber: good.unNumber,
        properShippingName: good.properShippingName,
        packingGroup: good.packingGroup,
        quantity: good.quantity,
        compliance: good.compliance,
        issues: (good as any).issues || [],
      };
    });
  }

  private getRandomCustomer() {
    const categories = Object.keys(CUSTOMER_COMPANIES);
    const category = categories[Math.floor(seededRandom() * categories.length)] as keyof typeof CUSTOMER_COMPANIES;
    const companies = CUSTOMER_COMPANIES[category];
    return companies[Math.floor(seededRandom() * companies.length)];
  }

  private generateSpecialInstructions(dangerousGoods: any[]) {
    if (dangerousGoods.length === 0) return "Standard freight - no special requirements";
    
    const instructions = [
      "Dangerous goods shipment - certified driver required",
      "Maintain proper placarding at all times",
      "Emergency contact must be available 24/7",
      "Driver must carry emergency procedures card",
    ];
    
    return instructions.join(". ");
  }

  private generateShipments() {
    // Generate a mix of shipments in different states
    const shipmentCount = 150;
    const statuses = ["PLANNING", "READY_FOR_DISPATCH", "IN_TRANSIT", "DELIVERED"];
    
    for (let i = 0; i < shipmentCount; i++) {
      const route = WA_ROUTES[Math.floor(seededRandom() * WA_ROUTES.length)];
      const status = statuses[Math.floor(seededRandom() * statuses.length)];
      const dangGoods = seededRandom() > 0.3 ? this.selectDangerousGoods() : [];
      const isCompliant = seededRandom() > 0.1; // 10% non-compliant
      
      // If non-compliant, add some non-compliant goods
      if (!isCompliant && dangGoods.length > 0) {
        const nonCompliantGoods = DANGEROUS_GOODS_CATALOG.nonCompliant;
        const nonCompliantGood = nonCompliantGoods[Math.floor(seededRandom() * nonCompliantGoods.length)];
        dangGoods.push({
          class: nonCompliantGood.hazardClass,
          count: Math.floor(seededRandom() * 10) + 1,
          unNumber: nonCompliantGood.unNumber,
          properShippingName: nonCompliantGood.properShippingName,
          packingGroup: nonCompliantGood.packingGroup,
          quantity: nonCompliantGood.quantity,
          compliance: "NON_COMPLIANT",
          issues: (nonCompliantGood as any).issues || [],
        });
      }
      
      // Use deterministic date range - shipments created between Jan 1, 2024 and Jan 31, 2024
      const createdDate = randomDate(new Date('2024-01-01'), new Date('2024-01-31'));
      const estimatedDelivery = new Date(createdDate.getTime() + (route.estimatedHours + Math.floor(seededRandom() * 48)) * 60 * 60 * 1000);
      
      const client = this.getRandomCustomer();
      const demurrageData = this.generateDemurrageData(status, createdDate, estimatedDelivery, client);
      
      this.shipments.push({
        id: `OH-${i + 1}-2024`,
        trackingNumber: `OH-2024-${(i + 1).toString().padStart(5, '0')}`,
        client,
        route: `${route.origin.name} → ${route.destination.name}`,
        weight: `${Math.floor(seededRandom() * 40) + 10},${Math.floor(seededRandom() * 900) + 100} KG`,
        distance: `${route.distance} km`,
        status,
        dangerousGoods: dangGoods,
        progress: this.calculateProgress(status, createdDate, estimatedDelivery),
        estimatedDelivery: estimatedDelivery.toISOString(),
        driver: status === "IN_TRANSIT" || status === "DELIVERED" ? 
          this.drivers[Math.floor(seededRandom() * this.drivers.length)].name : null,
        vehicle: status === "IN_TRANSIT" || status === "DELIVERED" ? 
          this.vehicles[Math.floor(seededRandom() * this.vehicles.length)].registration : null,
        createdAt: createdDate.toISOString(),
        updatedAt: createdDate.toISOString(),
        customerReference: `REF-${Math.floor(seededRandom() * 100000)}`,
        specialInstructions: this.generateSpecialInstructions(dangGoods),
        emergencyContact: COMPANY_INFO.emergencyContact,
        isCompliant,
        complianceIssues: isCompliant ? [] : this.generateComplianceIssues(dangGoods),
        demurrage: demurrageData,
      });
    }
  }

  private calculateProgress(status: string, created: Date, estimated: Date): number {
    // Use fixed "current" time for consistent demo progress calculations
    const now = new Date('2024-01-31T12:00:00Z');
    const elapsed = now.getTime() - created.getTime();
    const total = estimated.getTime() - created.getTime();
    
    switch (status) {
      case "PLANNING":
        return Math.floor(seededRandom() * 20);
      case "READY_FOR_DISPATCH":
        return Math.floor(seededRandom() * 10);
      case "IN_TRANSIT":
        return Math.min(95, Math.max(20, Math.floor((elapsed / total) * 100)));
      case "DELIVERED":
        return 100;
      default:
        return 0;
    }
  }

  private generateComplianceIssues(dangerousGoods: any[]): string[] {
    const issues = [
      "Dangerous goods license expired",
      "Missing placarding documentation",
      "Driver not certified for hazard class",
      "Improper packaging certification",
      "Missing emergency procedures card",
      "Incorrect labeling on containers",
      "Route not approved for dangerous goods",
      "Missing segregation requirements",
    ];
    
    const issueCount = Math.floor(seededRandom() * 3) + 1;
    return Array.from({ length: issueCount }, () => 
      issues[Math.floor(seededRandom() * issues.length)]
    ).filter((issue, index, arr) => arr.indexOf(issue) === index);
  }

  // Generate demurrage data for shipments
  private generateDemurrageData(status: string, createdDate: Date, estimatedDelivery: Date, client: string) {
    const now = new Date('2024-01-31T12:00:00Z');
    
    // Get customer profile for demurrage terms
    const customerProfile = this.getCustomerProfiles().find(c => c.name === client);
    
    // Base demurrage rates (per day in AUD)
    const baseRates = {
      standard: 85,
      premium: 125,
      hazmat: 165,
      mining: 145,
    };
    
    // Determine rate based on customer type
    let dailyRate = baseRates.standard;
    if (customerProfile?.category === 'MINING') dailyRate = baseRates.mining;
    else if (customerProfile?.category === 'INDUSTRIAL') dailyRate = baseRates.hazmat;
    else if (customerProfile?.tier === 'PLATINUM') dailyRate = baseRates.premium;
    
    // Free time allowance (days)
    const freeTimeAllowance = customerProfile?.tier === 'PLATINUM' ? 3 : customerProfile?.tier === 'GOLD' ? 2 : 1;
    
    // Calculate scheduled pickup/delivery dates
    const scheduledPickup = new Date(createdDate);
    scheduledPickup.setDate(scheduledPickup.getDate() + 1); // Next day pickup
    
    const scheduledDelivery = new Date(estimatedDelivery);
    
    // Generate actual dates based on status
    let actualPickup = null;
    let actualDelivery = null;
    let pickupDelay = 0;
    let deliveryDelay = 0;
    
    if (status === 'IN_TRANSIT' || status === 'DELIVERED') {
      // Pickup occurred
      actualPickup = new Date(scheduledPickup);
      pickupDelay = Math.floor(seededRandom() * 3); // 0-2 days delay
      actualPickup.setDate(actualPickup.getDate() + pickupDelay);
      
      if (status === 'DELIVERED') {
        // Delivery occurred
        actualDelivery = new Date(scheduledDelivery);
        deliveryDelay = Math.floor(seededRandom() * 4); // 0-3 days delay
        actualDelivery.setDate(actualDelivery.getDate() + deliveryDelay);
      }
    }
    
    // Calculate demurrage days
    const pickupDemurrageDays = Math.max(0, pickupDelay - freeTimeAllowance);
    const deliveryDemurrageDays = Math.max(0, deliveryDelay - freeTimeAllowance);
    const totalDemurrageDays = pickupDemurrageDays + deliveryDemurrageDays;
    
    // Calculate costs
    const demurrageCost = totalDemurrageDays * dailyRate;
    const projectedCost = status === 'IN_TRANSIT' ? 
      (pickupDemurrageDays * dailyRate) + Math.max(0, Math.floor(seededRandom() * 2) * dailyRate) : 
      demurrageCost;
    
    // Determine status
    let demurrageStatus = 'within_free_time';
    if (totalDemurrageDays > 0) {
      demurrageStatus = status === 'DELIVERED' ? 'charges_applied' : 'accumulating';
    } else if (status === 'IN_TRANSIT' && pickupDelay >= freeTimeAllowance) {
      demurrageStatus = 'at_risk';
    }
    
    return {
      dailyRate,
      freeTimeAllowance,
      scheduledPickup: scheduledPickup.toISOString(),
      scheduledDelivery: scheduledDelivery.toISOString(),
      actualPickup: actualPickup?.toISOString() || null,
      actualDelivery: actualDelivery?.toISOString() || null,
      pickupDelay,
      deliveryDelay,
      demurrageDays: totalDemurrageDays,
      demurrageCost,
      projectedCost,
      status: demurrageStatus,
      lastCalculated: now.toISOString(),
      alerts: this.generateDemurrageAlerts(demurrageStatus, totalDemurrageDays, projectedCost),
    };
  }
  
  // Generate demurrage alerts
  private generateDemurrageAlerts(status: string, days: number, cost: number) {
    const alerts = [];
    
    if (status === 'at_risk') {
      alerts.push({
        type: 'warning',
        message: 'Approaching demurrage threshold - pickup delayed',
        priority: 'medium',
        actionRequired: 'Contact customer to expedite pickup',
      });
    } else if (status === 'accumulating') {
      alerts.push({
        type: 'error',
        message: `Demurrage charges accumulating: ${days} days @ $${cost} AUD`,
        priority: 'high',
        actionRequired: 'Notify customer and billing department',
      });
    } else if (status === 'charges_applied' && cost > 0) {
      alerts.push({
        type: 'info',
        message: `Demurrage charges applied: $${cost} AUD`,
        priority: 'low',
        actionRequired: 'Verify charges included in invoice',
      });
    }
    
    return alerts;
  }

  // Public methods to access data
  public getDrivers() {
    return this.drivers;
  }

  public getVehicles() {
    return this.vehicles;
  }

  public getShipments() {
    return this.shipments;
  }

  public getFleetStatus() {
    return {
      vehicles: this.vehicles.map(vehicle => ({
        ...vehicle,
        status: vehicle.status || "AVAILABLE",
        location_is_fresh: vehicle.locationIsFresh,
      })),
      total_vehicles: this.vehicles.length,
      timestamp: new Date('2024-01-31T12:00:00Z').toISOString(),
    };
  }

  public getDashboardStats() {
    // Use fixed dates for consistent demo data
    const now = new Date('2024-01-31T12:00:00Z');
    const thirtyDaysAgo = new Date('2024-01-01T12:00:00Z');
    
    const totalShipments = this.shipments.length;
    const activeShipments = this.shipments.filter(s => s.status === "IN_TRANSIT").length;
    const completedShipments = this.shipments.filter(s => s.status === "DELIVERED").length;
    const pendingReviews = this.shipments.filter(s => !s.isCompliant).length;
    const complianceRate = ((totalShipments - pendingReviews) / totalShipments) * 100;
    
    // Calculate demurrage statistics
    const demurrageStats = this.calculateDemurrageStats();
    
    return {
      totalShipments,
      activeShipments,
      completedShipments,
      pendingReviews,
      complianceRate: Math.round(complianceRate * 10) / 10,
      activeRoutes: WA_ROUTES.length,
      demurrage: demurrageStats,
      trends: {
        shipments_change: "+15.3%",
        weekly_shipments: Math.floor(totalShipments / 4),
        compliance_trend: "+2.4%",
        routes_change: "+8.1%",
        demurrage_trend: "+12.8%",
      },
      period: {
        start: thirtyDaysAgo.toISOString(),
        end: now.toISOString(),
        days: 30,
      },
      last_updated: now.toISOString(),
      note: "OutbackHaul Transport - Real-time operational data",
    };
  }
  
  // Calculate demurrage statistics for dashboard
  private calculateDemurrageStats() {
    const activeAlerts = this.shipments.filter(s => 
      s.demurrage && s.demurrage.alerts && s.demurrage.alerts.length > 0
    ).length;
    
    const totalDemurrageCost = this.shipments.reduce((sum, s) => 
      sum + (s.demurrage?.demurrageCost || 0), 0
    );
    
    const shipmentsWithCharges = this.shipments.filter(s => 
      s.demurrage && s.demurrage.demurrageCost > 0
    ).length;
    
    const averageDelay = this.shipments.reduce((sum, s) => 
      sum + (s.demurrage?.pickupDelay || 0) + (s.demurrage?.deliveryDelay || 0), 0
    ) / this.shipments.length;
    
    return {
      totalRevenue: Math.round(totalDemurrageCost),
      activeAlerts,
      shipmentsWithCharges,
      averageDelay: Math.round(averageDelay * 10) / 10,
      monthlyTrend: "+12.8%",
    };
  }
  
  // Get demurrage data for reporting
  public getDemurrageReport(period: { start: string; end: string }) {
    const start = new Date(period.start);
    const end = new Date(period.end);
    
    const periodShipments = this.shipments.filter(s => {
      const created = new Date(s.createdAt);
      return created >= start && created <= end;
    });
    
    const totalRevenue = periodShipments.reduce((sum, s) => 
      sum + (s.demurrage?.demurrageCost || 0), 0
    );
    
    const chargeBreakdown = periodShipments.reduce((acc, s) => {
      if (s.demurrage && s.demurrage.demurrageCost > 0) {
        const client = s.client;
        acc[client] = (acc[client] || 0) + s.demurrage.demurrageCost;
      }
      return acc;
    }, {} as Record<string, number>);
    
    return {
      period,
      totalRevenue,
      totalShipments: periodShipments.length,
      shipmentsWithCharges: periodShipments.filter(s => 
        s.demurrage && s.demurrage.demurrageCost > 0
      ).length,
      averageChargePerShipment: totalRevenue / periodShipments.length,
      clientBreakdown: chargeBreakdown,
      lastUpdated: new Date().toISOString(),
    };
  }

  public getRecentShipments(limit: number = 10) {
    const recent = this.shipments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map(shipment => ({
        id: shipment.id,
        identifier: shipment.trackingNumber,
        origin: shipment.route.split(" → ")[0],
        destination: shipment.route.split(" → ")[1],
        status: shipment.status,
        progress: shipment.progress,
        dangerous_goods: shipment.dangerousGoods.map((dg: any) => `Class ${dg.class}`),
        hazchem_code: shipment.dangerousGoods.length > 0 ? 
          shipment.dangerousGoods[0].hazardClass : "",
        created_at: shipment.createdAt,
      }));
    
    return {
      shipments: recent,
      total: recent.length,
      limit,
      last_updated: new Date('2024-01-31T12:00:00Z').toISOString(),
      note: "OutbackHaul Transport - Recent shipments",
    };
  }

  public getCompanyInfo() {
    return COMPANY_INFO;
  }

  public getRoutes() {
    return WA_ROUTES;
  }

  public getLocations() {
    return WA_LOCATIONS;
  }

  // New method to generate customer profiles from actual shipment data
  public getCustomerProfiles() {
    const shipments = this.getShipments();
    const customerMap = new Map();

    // First, collect all unique customers and their shipments
    shipments.forEach(shipment => {
      const customerName = shipment.client;
      if (!customerMap.has(customerName)) {
        customerMap.set(customerName, {
          name: customerName,
          shipments: [],
          totalValue: 0,
          totalShipments: 0,
          hasDangerousGoods: false,
          routes: new Set(),
          lastShipment: null,
          firstShipment: null,
        });
      }

      const customer = customerMap.get(customerName);
      customer.shipments.push(shipment);
      customer.totalShipments += 1;
      
      // Calculate total value (extract number from weight string as proxy)
      const weightMatch = shipment.weight.match(/[\d,]+/);
      const weightValue = weightMatch ? parseInt(weightMatch[0].replace(/,/g, '')) : 1000;
      customer.totalValue += weightValue * 100; // Convert to currency value
      
      if (shipment.dangerousGoods && shipment.dangerousGoods.length > 0) {
        customer.hasDangerousGoods = true;
      }
      
      customer.routes.add(shipment.route);
      
      // Track shipment dates
      const shipmentDate = new Date(shipment.createdAt);
      if (!customer.lastShipment || shipmentDate > new Date(customer.lastShipment)) {
        customer.lastShipment = shipment.createdAt;
      }
      if (!customer.firstShipment || shipmentDate < new Date(customer.firstShipment)) {
        customer.firstShipment = shipment.createdAt;
      }
    });

    // Convert to final customer format
    const customers: any[] = [];

    // Sort customer names for consistent processing order
    const sortedCustomerNames = Array.from(customerMap.keys()).sort();

    sortedCustomerNames.forEach((customerName) => {
      const customerData = customerMap.get(customerName);
      // Determine category based on company name
      let category = "RETAIL";
      let tier = "BRONZE";
      
      // Check which category this customer belongs to
      for (const [cat, companies] of Object.entries(CUSTOMER_COMPANIES)) {
        if (companies.includes(customerName)) {
          category = cat.toUpperCase();
          break;
        }
      }

      // Determine tier based on shipment volume
      if (customerData.totalShipments >= 50) tier = "PLATINUM";
      else if (customerData.totalShipments >= 30) tier = "GOLD";
      else if (customerData.totalShipments >= 15) tier = "SILVER";

      // Generate deterministic customer ID based on company name
      const cleanName = customerName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const customerId = `customer-${cleanName}`;
      const email = `logistics@${cleanName}.com.au`;
      const phone = "+61 8 9" + Math.floor(100000000 + seededRandom() * 900000000).toString().substring(0, 7);

      // Determine primary location based on category
      const locations = this.getLocations();
      let locationLat = locations.perth.lat;
      let locationLng = locations.perth.lng;
      let city = "Perth";

      if (category === "MINING") {
        const miningLocations = [locations.portHedland, locations.karratha, locations.newman, locations.kalgoorlie];
        const location = miningLocations[Math.floor(seededRandom() * miningLocations.length)];
        locationLat = location.lat;
        locationLng = location.lng;
        city = location.name;
      }

      // Calculate rating based on performance (simplified)
      const rating = Math.max(3.5, Math.min(5.0, 4.0 + (customerData.totalShipments / 100) + seededRandom() * 0.8));

      customers.push({
        id: customerId,
        name: customerName,
        email,
        phone,
        address: `Level ${Math.floor(seededRandom() * 20) + 1}, ${Math.floor(seededRandom() * 500) + 100} ${["St Georges Terrace", "Adelaide Terrace", "Murray Street", "Wellington Street", "Hay Street"][Math.floor(seededRandom() * 5)]}`,
        city,
        state: "WA",
        country: "Australia",
        status: customerData.totalShipments > 0 ? "ACTIVE" : "PENDING",
        tier,
        category,
        joinDate: customerData.firstShipment || "2020-01-01",
        totalShipments: customerData.totalShipments,
        totalValue: customerData.totalValue,
        lastShipment: customerData.lastShipment || new Date('2024-01-31T12:00:00Z').toISOString(),
        rating: Math.round(rating * 10) / 10,
        dangerousGoods: customerData.hasDangerousGoods,
        primaryRoutes: Array.from(customerData.routes).slice(0, 3),
        locationLat,
        locationLng,
        shipmentHistory: customerData.shipments,
        demurrageTerms: this.getCustomerDemurrageTerms(tier, category),
      });
    });

    return customers.sort((a, b) => b.totalShipments - a.totalShipments);
  }

  // Method to get shipments for a specific customer
  public getCustomerShipments(customerName: string) {
    return this.shipments.filter(shipment => shipment.client === customerName);
  }

  // Method to get customer by name
  public getCustomerByName(customerName: string) {
    const customers = this.getCustomerProfiles();
    return customers.find(customer => customer.name === customerName);
  }

  // Method to get customer compliance profile
  public getCustomerComplianceProfile(customerName: string) {
    const customer = this.getCustomerByName(customerName);
    const customerShipments = this.getCustomerShipments(customerName);
    
    if (!customer || !customerShipments.length) {
      return null;
    }

    // Calculate compliance metrics
    const totalShipments = customerShipments.length;
    const compliantShipments = customerShipments.filter(s => s.isCompliant).length;
    const dgShipments = customerShipments.filter(s => s.dangerousGoods && s.dangerousGoods.length > 0);
    const complianceRate = (compliantShipments / totalShipments) * 100;

    // Get dangerous goods authorizations based on customer type
    const authorizedGoods = this.getCustomerDGAuthorizations(customer.category);
    
    // Calculate violations
    const violations = customerShipments
      .filter(s => !s.isCompliant)
      .map((shipment, index) => ({
        id: `viol-${index + 1}`,
        shipmentId: shipment.id,
        type: shipment.complianceIssues?.[0] || "Documentation Missing",
        severity: seededRandom() > 0.7 ? "High" : seededRandom() > 0.4 ? "Medium" : "Low",
        date: shipment.createdAt,
        status: seededRandom() > 0.6 ? "Open" : "Resolved"
      }));

    return {
      customerId: customer.id,
      customerName: customer.name,
      complianceRate: Math.round(complianceRate * 10) / 10,
      totalShipments,
      compliantShipments,
      dgShipments: dgShipments.length,
      authorizedGoods,
      violations,
      lastInspection: new Date('2024-01-20').toISOString(),
      certificatesValid: Math.floor(authorizedGoods.length * 0.9), // 90% valid
      dgLicenseExpiry: new Date('2024-12-31').toISOString(),
      safetyRating: Math.max(3.5, Math.min(5.0, 4.0 + (complianceRate / 100) + seededRandom() * 0.5))
    };
  }

  // Method to get customer demurrage terms
  public getCustomerDemurrageTerms(tier: string, category: string) {
    // Base demurrage rates (per day in AUD)
    const baseRates = {
      standard: 85,
      premium: 125,
      hazmat: 165,
      mining: 145,
    };
    
    // Determine rate based on customer type and tier
    let dailyRate = baseRates.standard;
    if (category === 'MINING') dailyRate = baseRates.mining;
    else if (category === 'INDUSTRIAL') dailyRate = baseRates.hazmat;
    else if (tier === 'PLATINUM') dailyRate = baseRates.premium;
    
    // Free time allowance (days)
    const freeTimeAllowance = tier === 'PLATINUM' ? 3 : tier === 'GOLD' ? 2 : 1;
    
    // Initialize empty demurrage history to avoid circular reference
    const demurrageHistory: any[] = [];
    const totalDemurrageCost = 0;
    const averageDemurrageDays = 0;
    
    return {
      dailyRate,
      freeTimeAllowance,
      currency: 'AUD',
      terms: {
        pickup: {
          freeTime: freeTimeAllowance,
          rateAfterFreeTime: dailyRate,
        },
        delivery: {
          freeTime: freeTimeAllowance,
          rateAfterFreeTime: dailyRate,
        },
        calculation: 'Per calendar day',
        minimumCharge: dailyRate,
        gracePeriod: tier === 'PLATINUM' ? '4 hours' : '2 hours',
      },
      history: {
        totalCharges: totalDemurrageCost,
        totalIncidents: demurrageHistory.length,
        averageDaysPerIncident: Math.round(averageDemurrageDays * 10) / 10,
        lastIncident: demurrageHistory[0]?.date || null,
        recentCharges: demurrageHistory.slice(0, 5),
      },
      thresholds: {
        alertAfterDays: Math.max(1, freeTimeAllowance - 1),
        warningAfterDays: freeTimeAllowance,
        criticalAfterDays: freeTimeAllowance + 1,
      },
      disputeProcess: {
        timeLimit: '48 hours',
        contactEmail: 'billing@outbackhaul.com.au',
        requiresDocumentation: true,
      },
    };
  }
  
  // Method to get customer dangerous goods authorizations
  public getCustomerDGAuthorizations(category: string) {
    const allGoods = [
      ...DANGEROUS_GOODS_CATALOG.mining,
      ...DANGEROUS_GOODS_CATALOG.industrial,
      ...DANGEROUS_GOODS_CATALOG.agricultural,
      ...DANGEROUS_GOODS_CATALOG.medical,
      ...DANGEROUS_GOODS_CATALOG.retail
    ];

    // Filter authorizations based on customer category
    switch (category.toLowerCase()) {
      case 'mining':
        return DANGEROUS_GOODS_CATALOG.mining.slice(0, 8); // Mining companies get mining DG
      case 'industrial':
        return [...DANGEROUS_GOODS_CATALOG.industrial.slice(0, 6), ...DANGEROUS_GOODS_CATALOG.mining.slice(0, 3)];
      case 'agricultural':
        return DANGEROUS_GOODS_CATALOG.agricultural.slice(0, 5);
      case 'medical':
        return DANGEROUS_GOODS_CATALOG.medical.slice(0, 4);
      default:
        return allGoods.slice(0, 3); // Basic authorizations for retail
    }
  }

  // Method to get customer safety incidents
  public getCustomerSafetyIncidents(customerName: string) {
    const customer = this.getCustomerByName(customerName);
    if (!customer) return [];

    const incidentCount = Math.floor(seededRandom() * 3); // 0-2 incidents
    const incidents = [];

    for (let i = 0; i < incidentCount; i++) {
      const severity = seededRandom() > 0.8 ? 'High' : seededRandom() > 0.5 ? 'Medium' : 'Low';
      const types = ['Spill', 'Documentation Error', 'Transport Violation', 'Equipment Failure'];
      
      incidents.push({
        id: `incident-${i + 1}`,
        customerId: customer.id,
        type: types[Math.floor(seededRandom() * types.length)],
        severity,
        description: `Safety incident involving dangerous goods transport`,
        date: randomDate(new Date('2024-01-01'), new Date('2024-01-31')).toISOString(),
        status: seededRandom() > 0.3 ? 'Resolved' : 'Investigating',
        reportedBy: 'Operations Team',
        actions: severity === 'High' ? ['Immediate containment', 'Regulatory notification', 'Investigation launched'] : ['Documented', 'Corrective action taken']
      });
    }

    return incidents;
  }
}

// Export singleton instance
export const simulatedDataService = new SimulatedDataService();
export default simulatedDataService;