export interface ReliabilityMetrics {
  reliability_score: number;
  reliability_grade: string;
  is_operational: boolean;
  metrics_breakdown?: {
    uptime_history_pct: number;
    fault_score: number;
    user_rating_avg: number;
    days_since_maintenance: number;
  };
}

export interface EVStation {
  id: string;
  name: string;
  operator: string;
  address: string;
  lat: number;
  lng: number;
  distance_km: number;
  max_power_kw: number;
  connector_types: string[];
  total_slots: number;
  available_slots: number;
  occupied_slots: number;
  parking_spots: {
    total: number;
    available: number;
  };
  cost_per_kwh: number;
  currency?: string;
  currency_symbol?: string;
  reliability: ReliabilityMetrics;
}

export interface BatteryDegradationInfo {
  c_rate: number;
  dod_ratio: number;
  temperature_c: number;
  estimated_capacity_loss_pct: number;
  degradation_penalty_score: number;
  degradation_impact_level: string;
  preservation_advice: string[];
}

export interface FeatureContribution {
  feature: string;
  score: number;
  value: string;
  impact: 'Positive' | 'Caution' | 'Neutral';
}

export interface XAIExplanation {
  rank: number;
  composite_score: number;
  narrative_explanation: string;
  highlights: string[];
  feature_contributions: FeatureContribution[];
  user_profile_applied: string;
}

export interface StationRecommendation {
  rank: number;
  composite_score: number;
  station: EVStation;
  travel_time_min: number;
  total_delay_min: number;
  battery_degradation: BatteryDegradationInfo;
  xai_explanation: XAIExplanation;
}

export interface RecommendationResponse {
  emergency_rescue_active: boolean;
  current_soc_pct: number;
  target_soc_pct: number;
  battery_temp_c: number;
  user_profile_applied: string;
  applied_weights: Record<string, number>;
  total_stations_evaluated: number;
  recommendations: StationRecommendation[];
  spatial_graph?: SpatialGraphSummary;
}

export interface SpatialGraphSummary {
  proximity_radius_km: number;
  node_count: number;
  edge_count: number;
  direct_ev_connections: number;
  connected_station_count: number;
  station_metrics: Record<string, {
    hops_from_ev: number | null;
    degree: number;
    distance_from_ev_km: number;
  }>;
  edges: Array<{ source: string; target: string; distance_km: number }>;
  attention_available: boolean;
  attention_status: string;
}

export interface UserProfile {
  id: string;
  name: string;
  description: string;
  weights: {
    travel_time: number;
    wait_time: number;
    cost: number;
    reliability: number;
    battery_preservation: number;
  };
}
