/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Lunar Rover Orchestrator API Types
 */

export interface MissionRequest {
  name: string;
  image_path: string;
  csv_path: string;
  start_lon: number;
  start_lat: number;
  end_lon: number;
  end_lat: number;
}

export interface BatteryStatus {
  battery_percent: number;
  solar_input_wm2: number;
  power_consumption_w: number;
  can_run_ml: boolean;
  reason: string;
  power_efficiency_score: number;
}

export interface ObstaclePoint {
  lon: number;
  lat: number;
  x: number;
  y: number;
  obstacle_type: 'boulder' | 'landslide';
  confidence: number;
  risk_level: number;
  size: number;
}

export interface PathPoint {
  lon: number;
  lat: number;
  x: number;
  y: number;
  elevation: number;
  slope: number;
  risk_score: number;
  is_safe: boolean;
  distance_from_start: number;
}

export interface MissionStatistics {
  path_found: boolean;
  path_length_km: number;
  safety_percentage: number;
  total_obstacles: number;
  boulders: number;
  landslides: number;
  path_points: number;
}

export interface MissionResult {
  mission_name: string;
  model_type: 'ML' | 'Heuristic';
  battery_status: BatteryStatus;
  processing_time: number;
  path_status: string;
  statistics: MissionStatistics;
  obstacles: ObstaclePoint[];
  path_points: PathPoint[];
  folium_map_html?: string;
  timestamp: string;
}

export interface SystemStats {
  total_missions: number;
  ml_missions: number;
  heuristic_missions: number;
  successful_paths: number;
  failed_paths: number;
  total_processing_time: number;
  total_power_saved: number;
}

export interface OrchestratorStatus {
  is_running: boolean;
  current_mission?: string;
  system_stats: SystemStats;
  available_observations: string[];
}

// API Response Types
export interface MissionResponse {
  success: boolean;
  result?: MissionResult;
  error?: string;
}

export interface StatusResponse {
  success: boolean;
  status?: OrchestratorStatus;
  error?: string;
}

export interface ObservationsResponse {
  success: boolean;
  observations?: string[];
  error?: string;
}
