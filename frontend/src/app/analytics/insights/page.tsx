"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useTheme } from "@/contexts/ThemeContext";
import { usePerformanceMonitoring } from "@/utils/performance";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Eye,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Users,
  Package,
  Truck,
  Shield,
  DollarSign,
  Percent,
  Calendar,
  Filter,
  Search,
  Download,
  RefreshCw,
  Settings,
  BookOpen,
  Star,
  Flag,
  Bookmark,
  Share2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Info,
  AlertCircle,
  CheckSquare,
  X,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Maximize2,
  Minimize2,
  RotateCw,
  Database,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Code,
  Terminal,
  HelpCircle,
  FileText,
  Image,
  Video,
  Mic,
  Camera,
  Map,
  MapPin,
  Navigation,
  Compass,
  Route,
  Mail,
  Phone,
  MessageSquare,
  Bell,
  Lock,
  Unlock,
  Key,
  Fingerprint,
  QrCode,
  Scan,
  CreditCard,
  Wallet,
  ShoppingCart,
  Gift,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Meh,
  Coffee,
  Home,
  Building,
  Factory,
  Warehouse,
  Store,
  School,
  Hospital,
  Hotel,
  Restaurant,
  Car,
  Bus,
  Train,
  Plane,
  Ship,
  Bike,
  Scooter,
  Fuel,
  Battery,
  Plug,
  Wifi,
  Bluetooth,
  Usb,
  Headphones,
  Speaker,
  Microphone,
  Radio,
  Tv,
  Laptop,
  Desktop,
  Tablet2,
  Watch,
  Gamepad2,
  Joystick,
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  Spade,
  Club,
  Heart2,
  Diamond,
  Crown,
  Award,
  Trophy,
  Medal,
  Ribbon,
  Rosette,
  Gem,
  Coins,
  Banknote,
  Receipt,
  Calculator,
  Abacus,
  Ruler,
  Scissors,
  Pen,
  Pencil,
  Eraser,
  Highlighter,
  Marker,
  Paintbrush,
  Palette,
  Pipette,
  Syringe,
  Pill,
  Thermometer,
  Stethoscope,
  Bandage,
  Dna,
  Microscope,
  TestTube,
  Beaker,
  FlaskConical,
  Atom,
  Magnet,
  Zap2,
  Flame,
  Snowflake,
  Droplet,
  Waves,
  Wind,
  Tornado,
  Umbrella,
  UmbrellaBeach,
  Sun,
  Moon,
  Star2,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudHail,
  CloudFog,
  Rainbow,
  Sunrise,
  Sunset,
  Mountain,
  MountainSnow,
  Volcano,
  Desert,
  Island,
  Forest,
  Trees,
  Tree,
  Leaf,
  Flower,
  Flower2,
  Seedling,
  Sprout,
  Cactus,
  Palmtree,
  Evergreen,
  Deciduous,
  Mushroom,
  Grass,
  Wheat,
  Corn,
  Carrot,
  Potato,
  Tomato,
  Eggplant,
  Pepper,
  Cucumber,
  Lettuce,
  Broccoli,
  Garlic,
  Onion,
  Lemon,
  Lime,
  Orange,
  Tangerine,
  Grapefruit,
  Banana,
  Pineapple,
  Mango,
  Papaya,
  Watermelon,
  Melon,
  Grapes,
  Strawberry,
  Blueberry,
  Raspberry,
  Blackberry,
  Cherry,
  Peach,
  Pear,
  Apple,
  GreenApple,
  Kiwi,
  Avocado,
  Coconut,
  Chestnut,
  Peanut,
  Honey,
  Milk,
  Butter,
  Cheese,
  Egg,
  Croissant,
  Bread,
  Bagel,
  Pretzel,
  Pancakes,
  Waffle,
  Bacon,
  Meat,
  Poultry,
  CookedRice,
  Ramen,
  Spaghetti,
  Curry,
  Sushi,
  Sandwich,
  Hamburger,
  Fries,
  Hotdog,
  Pizza,
  Burrito,
  Taco,
  Salad,
  Soup,
  Stew,
  Fondue,
  Lobster,
  Shrimp,
  Squid,
  Oyster,
  Icecream,
  Cake,
  Cupcake,
  Pie,
  Chocolate,
  Candy,
  Lollipop,
  Donut,
  Cookie,
  Popcorn,
  Nuts,
  Beverage,
  Soda,
  Juice,
  Smoothie,
  Milkshake,
  Beer,
  Wine,
  Cocktail,
  Sake,
  Teacup,
  Mug,
  Pot,
  Kettle,
  Bottle,
  GlassWater,
  Utensils,
  UtensilsKnife,
  Spoon,
  Chopsticks,
  PlateUtensils,
  Amphora,
  Hourglass,
  Mantelpiece,
  Bed,
  Couch,
  Chair,
  Desk,
  Toilet,
  Shower,
  Bathtub,
  Razor,
  Toothbrush,
  Sponge,
  Bucket,
  Broom,
  Basket,
  RollOfPaper,
  Soap,
  Lotion,
  Thread,
  Yarn,
  Knot,
  SafetyPin,
  Pushpin,
  Paperclip,
  Stapler,
  Scissors2,
  Ruler2,
  Triangular,
  Abacus2,
  Bookmark2,
  Label,
  Moneybag,
  Coin,
  Gem2,
  Scales,
  Wrench,
  Hammer,
  Axe,
  Pick,
  Shovel,
  Saw,
  Screwdriver,
  Bolt,
  Nut,
  Gear,
  Clamp,
  Balance,
  Probing,
  Link,
  Chains,
  Hook,
  Tent,
  Door,
  Window,
  Doorway,
  Placard,
  IdentificationCard,
  Ticket,
  PresentationChart,
  Chart,
  Presentation,
  Identification,
  Passport,
  Luggage,
  Umbrella2,
  Purse,
  Handbag,
  Briefcase,
  Schoolbag,
  Backpack,
  Clutch,
  Pouch,
  Shoe,
  Boot,
  Sandal,
  Socks,
  Gloves,
  Scarf,
  Hat,
  Beret,
  Crown2,
  Helmet,
  Goggles,
  Sunglasses,
  Glasses,
  Necktie,
  Shirt,
  Jeans,
  Dress,
  Coat,
  Socks2,
  Gloves2,
  Scarf2,
  Hat2,
  Beret2,
  Crown3,
  Helmet2,
  Goggles2,
  Sunglasses2,
  Glasses2,
  Necktie2,
  Shirt2,
  Jeans2,
  Dress2,
  Coat2,
  Kimono,
  Bikini,
  Sari,
  OnePiece,
  TwoHorizontal,
  Thong,
  Shorts,
  Briefs,
  Onepiece,
  Twopiece,
  Bikini2,
  Sari2,
  OnePiece2,
  TwoHorizontal2,
  Thong2,
  Shorts2,
  Briefs2,
  Onepiece2,
  Twopiece2,
  Bikini3,
  Sari3,
  OnePiece3,
  TwoHorizontal3,
  Thong3,
  Shorts3,
  Briefs3,
  Onepiece3,
  Twopiece3
} from "lucide-react";

// Mock data for AI insights
const mockInsights = [
  {
    id: "1",
    type: "predictive",
    title: "Shipment Volume Forecast",
    description: "Expected 15% increase in shipment volume next quarter based on seasonal trends and market analysis",
    confidence: 87,
    impact: "high",
    category: "operational",
    timeframe: "next_quarter",
    actionItems: [
      "Prepare additional fleet capacity",
      "Optimize warehouse space allocation",
      "Review staffing requirements"
    ],
    metrics: {
      current: 1250,
      predicted: 1438,
      variance: 188
    },
    lastUpdated: "2024-01-15T10:30:00Z"
  },
  {
    id: "2",
    type: "anomaly",
    title: "Route Efficiency Decline",
    description: "Route A-7 showing 12% efficiency decrease over the last 2 weeks due to construction delays",
    confidence: 92,
    impact: "medium",
    category: "operational",
    timeframe: "immediate",
    actionItems: [
      "Reroute shipments to alternative paths",
      "Negotiate with construction company for scheduling",
      "Implement temporary route optimization"
    ],
    metrics: {
      current: 88,
      baseline: 100,
      variance: -12
    },
    lastUpdated: "2024-01-15T09:15:00Z"
  },
  {
    id: "3",
    type: "optimization",
    title: "Cost Reduction Opportunity",
    description: "Consolidating DG shipments to Eastern region could reduce costs by $45K annually",
    confidence: 78,
    impact: "high",
    category: "financial",
    timeframe: "next_month",
    actionItems: [
      "Analyze customer delivery requirements",
      "Negotiate consolidated shipping rates",
      "Implement route consolidation pilot"
    ],
    metrics: {
      current: 180000,
      optimized: 135000,
      savings: 45000
    },
    lastUpdated: "2024-01-15T08:45:00Z"
  },
  {
    id: "4",
    type: "compliance",
    title: "Certification Renewal Alert",
    description: "23 drivers require DG certification renewal within 60 days to maintain compliance",
    confidence: 100,
    impact: "high",
    category: "compliance",
    timeframe: "immediate",
    actionItems: [
      "Schedule certification training sessions",
      "Notify drivers of renewal requirements",
      "Prepare backup driver assignments"
    ],
    metrics: {
      total: 150,
      expiring: 23,
      percentage: 15.3
    },
    lastUpdated: "2024-01-15T07:20:00Z"
  },
  {
    id: "5",
    type: "trend",
    title: "Customer Satisfaction Improvement",
    description: "Customer satisfaction scores increased by 8% following implementation of real-time tracking",
    confidence: 94,
    impact: "medium",
    category: "customer",
    timeframe: "ongoing",
    actionItems: [
      "Continue real-time tracking expansion",
      "Implement additional customer communication features",
      "Collect feedback for further improvements"
    ],
    metrics: {
      before: 82,
      after: 90,
      improvement: 8
    },
    lastUpdated: "2024-01-15T06:30:00Z"
  }
];

const mockTrends = [
  {
    id: "1",
    title: "Dangerous Goods Volume",
    value: 15234,
    change: 12.3,
    trend: "up",
    period: "month",
    category: "volume"
  },
  {
    id: "2",
    title: "Average Delivery Time",
    value: 2.8,
    change: -5.2,
    trend: "down",
    period: "week",
    category: "performance"
  },
  {
    id: "3",
    title: "Fleet Utilization",
    value: 87.5,
    change: 3.1,
    trend: "up",
    period: "month",
    category: "efficiency"
  },
  {
    id: "4",
    title: "Compliance Score",
    value: 94.2,
    change: 1.8,
    trend: "up",
    period: "quarter",
    category: "compliance"
  }
];

const mockRecommendations = [
  {
    id: "1",
    title: "Optimize Route Planning",
    description: "Implement AI-powered route optimization to reduce fuel costs by 15%",
    priority: "high",
    estimatedSavings: 75000,
    timeToImplement: "2 weeks",
    category: "operational"
  },
  {
    id: "2",
    title: "Preventive Maintenance Schedule",
    description: "Adjust maintenance intervals based on usage patterns to reduce downtime by 20%",
    priority: "medium",
    estimatedSavings: 35000,
    timeToImplement: "1 month",
    category: "maintenance"
  },
  {
    id: "3",
    title: "Customer Communication Enhancement",
    description: "Implement proactive notifications to improve customer satisfaction by 12%",
    priority: "medium",
    estimatedSavings: 25000,
    timeToImplement: "3 weeks",
    category: "customer"
  },
  {
    id: "4",
    title: "Inventory Optimization",
    description: "Reduce inventory holding costs through improved demand forecasting",
    priority: "low",
    estimatedSavings: 18000,
    timeToImplement: "6 weeks",
    category: "inventory"
  }
];

export default function BusinessIntelligenceInsightsPage() {
  const { loadTime } = usePerformanceMonitoring('BusinessIntelligenceInsightsPage');
  const { isDark } = useTheme();
  const [selectedInsight, setSelectedInsight] = useState<typeof mockInsights[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterImpact, setFilterImpact] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState("30d");

  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const filteredInsights = mockInsights.filter(insight => {
    const matchesSearch = insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         insight.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || insight.type === filterType;
    const matchesImpact = filterImpact === "all" || insight.impact === filterImpact;
    const matchesCategory = filterCategory === "all" || insight.category === filterCategory;
    return matchesSearch && matchesType && matchesImpact && matchesCategory;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "predictive":
        return <Brain className="h-4 w-4 text-purple-600" />;
      case "anomaly":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "optimization":
        return <Target className="h-4 w-4 text-blue-600" />;
      case "compliance":
        return <Shield className="h-4 w-4 text-green-600" />;
      case "trend":
        return <TrendingUp className="h-4 w-4 text-orange-600" />;
      default:
        return <Lightbulb className="h-4 w-4 text-gray-600" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Business Intelligence Insights</h1>
              <p className="text-gray-600">
                AI-powered analytics and recommendations for your dangerous goods logistics
                {loadTime && (
                  <span className="ml-2 text-xs text-gray-400">
                    (Loaded in {loadTime.toFixed(0)}ms)
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleRefreshData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* AI Status Banner */}
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              AI analysis is active. Last update: {formatTimestamp(new Date().toISOString())}
              <Button variant="link" size="sm" className="ml-2 p-0 h-auto">
                View AI model details
              </Button>
            </AlertDescription>
          </Alert>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockTrends.map((trend) => (
              <Card key={trend.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">{trend.title}</div>
                    <div className={`flex items-center gap-1 text-xs ${
                      trend.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trend.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(trend.change)}%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {trend.category === 'volume' ? trend.value.toLocaleString() : 
                     trend.category === 'performance' ? `${trend.value} days` :
                     `${trend.value}%`}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">vs last {trend.period}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content */}
          <Tabs defaultValue="insights" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Insights
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Recommendations
              </TabsTrigger>
              <TabsTrigger value="predictions" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Predictions
              </TabsTrigger>
            </TabsList>

            {/* AI Insights Tab */}
            <TabsContent value="insights" className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search insights..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="predictive">Predictive</SelectItem>
                    <SelectItem value="anomaly">Anomaly</SelectItem>
                    <SelectItem value="optimization">Optimization</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="trend">Trend</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterImpact} onValueChange={setFilterImpact}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Impact</SelectItem>
                    <SelectItem value="high">High Impact</SelectItem>
                    <SelectItem value="medium">Medium Impact</SelectItem>
                    <SelectItem value="low">Low Impact</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Insights List */}
              <div className="space-y-4">
                {filteredInsights.map((insight) => (
                  <Card key={insight.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getTypeIcon(insight.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{insight.title}</h3>
                              <Badge className={getImpactColor(insight.impact)}>
                                {insight.impact} impact
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>Confidence: {insight.confidence}%</span>
                              <span>Category: {insight.category}</span>
                              <span>Timeframe: {insight.timeframe.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right text-sm">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-green-600">{insight.confidence}%</span>
                            </div>
                            <div className="text-xs text-gray-500">confidence</div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedInsight(insight)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-2">Confidence Score</div>
                        <Progress value={insight.confidence} className="h-2" />
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-2">Recommended Actions</div>
                        <div className="space-y-1">
                          {insight.actionItems.slice(0, 2).map((action, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span>{action}</span>
                            </div>
                          ))}
                          {insight.actionItems.length > 2 && (
                            <div className="text-sm text-gray-500">
                              +{insight.actionItems.length - 2} more actions
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-4">
              <div className="grid gap-4">
                {mockRecommendations.map((recommendation) => (
                  <Card key={recommendation.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Target className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{recommendation.title}</h3>
                              <Badge className={getPriorityColor(recommendation.priority)}>
                                {recommendation.priority} priority
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>Category: {recommendation.category}</span>
                              <span>Implementation: {recommendation.timeToImplement}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(recommendation.estimatedSavings)}
                          </div>
                          <div className="text-xs text-gray-500">potential savings</div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex gap-2">
                        <Button size="sm">
                          Implement
                        </Button>
                        <Button variant="outline" size="sm">
                          Learn More
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Bookmark className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Predictions Tab */}
            <TabsContent value="predictions" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Shipment Volume Forecast
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Volume prediction chart would go here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Revenue Projection
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Revenue projection chart would go here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Customer Demand Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Q1 2024</span>
                        <span className="text-sm font-semibold">+15%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Q2 2024</span>
                        <span className="text-sm font-semibold">+8%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Q3 2024</span>
                        <span className="text-sm font-semibold">+12%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Q4 2024</span>
                        <span className="text-sm font-semibold">+18%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Risk Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Operational Risk</span>
                        <Badge className="bg-green-50 text-green-700 border-green-200">Low</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Financial Risk</span>
                        <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Medium</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Compliance Risk</span>
                        <Badge className="bg-green-50 text-green-700 border-green-200">Low</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Market Risk</span>
                        <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Medium</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
      </div>
    </DashboardLayout>
  );
}