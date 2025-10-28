#!/usr/bin/env python3
"""
Optimal Path Planning System
Uses landslide detection results to find safe routes
"""

import numpy as np
import cv2
from pathlib import Path
import rasterio
import geopandas as gpd
from shapely.geometry import Point, LineString, Polygon
from shapely.ops import unary_union
import networkx as nx
from typing import Dict, List, Tuple, Optional
import logging
import json
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class PathPoint:
    """Represents a point in the optimal path"""
    x: float
    y: float
    elevation: float
    slope: float
    risk_score: float
    is_safe: bool

@dataclass
class PathSegment:
    """Represents a segment of the optimal path"""
    start_point: PathPoint
    end_point: PathPoint
    distance: float
    risk_score: float
    slope: float
    is_safe: bool

class OptimalPathPlanner:
    """
    Optimal path planner that avoids landslide-prone areas
    Uses A* algorithm with landslide risk as cost function
    """
    
    def __init__(self, config: Dict):
        """
        Initialize the path planner
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        
        # Path planning parameters
        self.max_slope = config.get('max_slope', 25.0)  # degrees
        self.max_risk_score = config.get('max_risk_score', 0.3)  # 0-1 scale
        self.step_size = config.get('step_size', 10.0)  # meters
        self.safety_margin = config.get('safety_margin', 50.0)  # meters from landslides
        
        # Cost function weights
        self.distance_weight = config.get('distance_weight', 1.0)
        self.risk_weight = config.get('risk_weight', 2.0)
        self.slope_weight = config.get('slope_weight', 1.5)
        
        logger.info(f"Path planner initialized with max slope: {self.max_slope}°")
    
    def load_terrain_data(self, data_paths: Dict[str, str]) -> Dict[str, np.ndarray]:
        """
        Load terrain data for path planning
        
        Args:
            data_paths: Dictionary with paths to terrain data
            
        Returns:
            Dictionary with loaded terrain data
        """
        terrain_data = {}
        
        for data_type, path in data_paths.items():
            if not Path(path).exists():
                logger.warning(f"Data file not found: {path}")
                continue
                
            try:
                with rasterio.open(path) as src:
                    terrain_data[data_type] = src.read(1).astype(np.float32)
                    terrain_data[f'{data_type}_transform'] = src.transform
                    terrain_data[f'{data_type}_crs'] = src.crs
                    terrain_data[f'{data_type}_shape'] = terrain_data[data_type].shape
                    logger.info(f"Loaded {data_type}: {terrain_data[data_type].shape}")
            except Exception as e:
                logger.error(f"Error loading {data_type} from {path}: {e}")
                continue
        
        return terrain_data
    
    def create_risk_map(self, landslide_mask: np.ndarray, dtm_map: np.ndarray, 
                       slope_map: np.ndarray) -> np.ndarray:
        """
        Create a comprehensive risk map for path planning
        
        Args:
            landslide_mask: Binary landslide detection mask
            dtm_map: Digital Terrain Model
            slope_map: Slope map in degrees
            
        Returns:
            Risk map (0-1 scale, higher = more dangerous)
        """
        logger.info("Creating comprehensive risk map...")
        
        # Initialize risk map
        risk_map = np.zeros_like(landslide_mask, dtype=np.float32)
        
        # 1. Direct landslide areas (highest risk)
        landslide_risk = landslide_mask.astype(np.float32)
        
        # 2. Distance-based risk (areas near landslides)
        # Create distance transform from landslide areas
        landslide_binary = (landslide_mask > 0).astype(np.uint8)
        distance_transform = cv2.distanceTransform(
            1 - landslide_binary, cv2.DIST_L2, 5
        )
        
        # Normalize distance transform to 0-1 scale
        max_distance = np.max(distance_transform)
        if max_distance > 0:
            distance_risk = 1.0 - (distance_transform / max_distance)
        else:
            distance_risk = np.zeros_like(distance_transform)
        
        # Apply safety margin
        safety_mask = distance_transform < (self.safety_margin / 10)  # Assuming 10m pixel size
        distance_risk[safety_mask] = 1.0
        
        # 3. Slope-based risk
        slope_risk = np.clip(slope_map / 45.0, 0, 1)  # Normalize to 0-1
        
        # 4. Elevation change risk (steep gradients)
        elevation_gradient = np.gradient(dtm_map)
        elevation_gradient_magnitude = np.sqrt(elevation_gradient[0]**2 + elevation_gradient[1]**2)
        elevation_risk = np.clip(elevation_gradient_magnitude / 50.0, 0, 1)  # Normalize
        
        # Combine risk factors
        risk_map = (
            0.4 * landslide_risk +      # Direct landslide areas
            0.3 * distance_risk +       # Proximity to landslides
            0.2 * slope_risk +          # Steep slopes
            0.1 * elevation_risk        # Elevation changes
        )
        
        # Ensure risk map is 0-1
        risk_map = np.clip(risk_map, 0, 1)
        
        logger.info(f"Risk map created: min={np.min(risk_map):.3f}, max={np.max(risk_map):.3f}")
        
        return risk_map
    
    def world_to_pixel(self, x: float, y: float, transform: rasterio.transform.Affine) -> Tuple[int, int]:
        """Convert world coordinates to pixel coordinates"""
        col, row = rasterio.transform.rowcol(transform, x, y)
        return int(col), int(row)
    
    def pixel_to_world(self, col: int, row: int, transform: rasterio.transform.Affine) -> Tuple[float, float]:
        """Convert pixel coordinates to world coordinates"""
        x, y = rasterio.transform.xy(transform, row, col)
        return float(x), float(y)
    
    def get_terrain_info(self, x: float, y: float, terrain_data: Dict[str, np.ndarray]) -> Dict:
        """
        Get terrain information at a specific location
        
        Args:
            x, y: World coordinates
            terrain_data: Loaded terrain data
            
        Returns:
            Dictionary with terrain information
        """
        transform = terrain_data.get('dtm_transform')
        if transform is None:
            return {}
        
        col, row = self.world_to_pixel(x, y, transform)
        shape = terrain_data.get('dtm_shape', (0, 0))
        
        # Check bounds
        if 0 <= row < shape[0] and 0 <= col < shape[1]:
            return {
                'elevation': float(terrain_data.get('dtm', np.zeros((1, 1)))[row, col]),
                'slope': float(terrain_data.get('slope', np.zeros((1, 1)))[row, col]),
                'risk': float(terrain_data.get('risk', np.zeros((1, 1)))[row, col])
            }
        else:
            return {
                'elevation': 0.0,
                'slope': 0.0,
                'risk': 1.0  # High risk for out-of-bounds
            }
    
    def is_safe_location(self, x: float, y: float, terrain_data: Dict[str, np.ndarray]) -> bool:
        """
        Check if a location is safe for traversal
        
        Args:
            x, y: World coordinates
            terrain_data: Loaded terrain data
            
        Returns:
            True if location is safe
        """
        terrain_info = self.get_terrain_info(x, y, terrain_data)
        
        if not terrain_info:
            return False
        
        # Check safety criteria
        is_safe = (
            terrain_info['slope'] <= self.max_slope and
            terrain_info['risk'] <= self.max_risk_score
        )
        
        return is_safe
    
    def calculate_cost(self, start: Tuple[float, float], end: Tuple[float, float], 
                      terrain_data: Dict[str, np.ndarray]) -> float:
        """
        Calculate cost for moving from start to end point
        
        Args:
            start: Start coordinates (x, y)
            end: End coordinates (x, y)
            terrain_data: Loaded terrain data
            
        Returns:
            Cost value (lower = better)
        """
        # Distance cost
        distance = np.sqrt((end[0] - start[0])**2 + (end[1] - start[1])**2)
        
        # Get terrain info for both points
        start_info = self.get_terrain_info(start[0], start[1], terrain_data)
        end_info = self.get_terrain_info(end[0], end[1], terrain_data)
        
        if not start_info or not end_info:
            return float('inf')  # Invalid location
        
        # Risk cost (average of start and end points)
        risk_cost = (start_info['risk'] + end_info['risk']) / 2.0
        
        # Slope cost (average of start and end points)
        slope_cost = (start_info['slope'] + end_info['slope']) / 2.0 / 45.0  # Normalize
        
        # Combined cost
        total_cost = (
            self.distance_weight * distance +
            self.risk_weight * risk_cost * 100 +  # Scale risk cost
            self.slope_weight * slope_cost * 50   # Scale slope cost
        )
        
        return total_cost
    
    def find_optimal_path(self, start: Tuple[float, float], end: Tuple[float, float],
                         terrain_data: Dict[str, np.ndarray]) -> List[PathPoint]:
        """
        Find optimal path from start to end using A* algorithm
        
        Args:
            start: Start coordinates (x, y)
            end: End coordinates (x, y)
            terrain_data: Loaded terrain data
            
        Returns:
            List of PathPoint objects representing the optimal path
        """
        logger.info(f"Finding optimal path from {start} to {end}")
        
        # Check if start and end are safe
        if not self.is_safe_location(start[0], start[1], terrain_data):
            logger.warning("Start location is not safe!")
            return []
        
        if not self.is_safe_location(end[0], end[1], terrain_data):
            logger.warning("End location is not safe!")
            return []
        
        # Create graph for pathfinding
        graph = nx.Graph()
        
        # Add nodes in a grid pattern
        transform = terrain_data.get('dtm_transform')
        shape = terrain_data.get('dtm_shape', (0, 0))
        
        if transform is None:
            logger.error("No transform available")
            return []
        
        # Create grid of potential waypoints
        step_size_pixels = int(self.step_size / 10)  # Assuming 10m pixel size
        
        for row in range(0, shape[0], step_size_pixels):
            for col in range(0, shape[1], step_size_pixels):
                x, y = self.pixel_to_world(col, row, transform)
                
                # Only add safe locations
                if self.is_safe_location(x, y, terrain_data):
                    terrain_info = self.get_terrain_info(x, y, terrain_data)
                    
                    graph.add_node(
                        (x, y),
                        elevation=terrain_info['elevation'],
                        slope=terrain_info['slope'],
                        risk=terrain_info['risk']
                    )
        
        # Add start and end points
        start_info = self.get_terrain_info(start[0], start[1], terrain_data)
        end_info = self.get_terrain_info(end[0], end[1], terrain_data)
        
        graph.add_node(start, elevation=start_info['elevation'], slope=start_info['slope'], risk=start_info['risk'])
        graph.add_node(end, elevation=end_info['elevation'], slope=end_info['slope'], risk=end_info['risk'])
        
        # Add edges between nearby nodes
        for node1 in graph.nodes():
            for node2 in graph.nodes():
                if node1 != node2:
                    distance = np.sqrt((node1[0] - node2[0])**2 + (node1[1] - node2[1])**2)
                    
                    # Connect nodes within step size
                    if distance <= self.step_size * 1.5:  # Allow some flexibility
                        cost = self.calculate_cost(node1, node2, terrain_data)
                        graph.add_edge(node1, node2, weight=cost)
        
        # Find shortest path using A*
        try:
            path_nodes = nx.astar_path(
                graph, start, end,
                heuristic=lambda n1, n2: np.sqrt((n1[0] - n2[0])**2 + (n1[1] - n2[1])**2),
                weight='weight'
            )
            
            # Convert to PathPoint objects
            path_points = []
            for i, (x, y) in enumerate(path_nodes):
                terrain_info = self.get_terrain_info(x, y, terrain_data)
                
                point = PathPoint(
                    x=x,
                    y=y,
                    elevation=terrain_info['elevation'],
                    slope=terrain_info['slope'],
                    risk_score=terrain_info['risk'],
                    is_safe=terrain_info['risk'] <= self.max_risk_score
                )
                path_points.append(point)
            
            logger.info(f"Found optimal path with {len(path_points)} points")
            return path_points
            
        except nx.NetworkXNoPath:
            logger.error("No safe path found between start and end points")
            return []
        except Exception as e:
            logger.error(f"Error finding path: {e}")
            return []
    
    def calculate_path_statistics(self, path_points: List[PathPoint]) -> Dict:
        """
        Calculate statistics for the optimal path
        
        Args:
            path_points: List of path points
            
        Returns:
            Dictionary with path statistics
        """
        if not path_points:
            return {}
        
        # Calculate distances
        total_distance = 0.0
        total_elevation_gain = 0.0
        total_elevation_loss = 0.0
        max_slope = 0.0
        avg_risk = 0.0
        
        for i in range(1, len(path_points)):
            prev_point = path_points[i-1]
            curr_point = path_points[i]
            
            # Distance
            distance = np.sqrt(
                (curr_point.x - prev_point.x)**2 + 
                (curr_point.y - prev_point.y)**2
            )
            total_distance += distance
            
            # Elevation change
            elevation_change = curr_point.elevation - prev_point.elevation
            if elevation_change > 0:
                total_elevation_gain += elevation_change
            else:
                total_elevation_loss += abs(elevation_change)
            
            # Slope
            if distance > 0:
                slope = abs(elevation_change) / distance * 100  # Percentage
                max_slope = max(max_slope, slope)
            
            # Risk
            avg_risk += curr_point.risk_score
        
        avg_risk /= len(path_points)
        
        # Count safe vs unsafe segments
        safe_segments = sum(1 for point in path_points if point.is_safe)
        unsafe_segments = len(path_points) - safe_segments
        
        return {
            'total_distance_m': total_distance,
            'total_distance_km': total_distance / 1000.0,
            'total_elevation_gain_m': total_elevation_gain,
            'total_elevation_loss_m': total_elevation_loss,
            'max_slope_percent': max_slope,
            'max_slope_degrees': np.arctan(max_slope / 100) * 180 / np.pi,
            'average_risk_score': avg_risk,
            'safe_segments': safe_segments,
            'unsafe_segments': unsafe_segments,
            'safety_percentage': (safe_segments / len(path_points)) * 100,
            'total_points': len(path_points)
        }
    
    def save_path(self, path_points: List[PathPoint], output_path: str, 
                 crs: rasterio.crs.CRS, statistics: Dict):
        """
        Save the optimal path to files
        
        Args:
            path_points: List of path points
            output_path: Output directory path
            crs: Coordinate reference system
            statistics: Path statistics
        """
        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        if not path_points:
            logger.warning("No path points to save")
            return
        
        # Create LineString geometry
        coordinates = [(point.x, point.y) for point in path_points]
        line_geometry = LineString(coordinates)
        
        # Create GeoDataFrame
        gdf = gpd.GeoDataFrame(
            [{'geometry': line_geometry, 'path_id': 1}],
            crs=crs
        )
        
        # Save as GeoJSON
        geojson_path = output_dir / "optimal_path.geojson"
        gdf.to_file(geojson_path, driver='GeoJSON')
        
        # Save detailed path points
        points_data = []
        for i, point in enumerate(path_points):
            points_data.append({
                'point_id': i,
                'x': point.x,
                'y': point.y,
                'elevation': point.elevation,
                'slope': point.slope,
                'risk_score': point.risk_score,
                'is_safe': point.is_safe
            })
        
        points_gdf = gpd.GeoDataFrame(
            points_data,
            geometry=[Point(point.x, point.y) for point in path_points],
            crs=crs
        )
        
        points_path = output_dir / "path_points.geojson"
        points_gdf.to_file(points_path, driver='GeoJSON')
        
        # Save statistics
        stats_path = output_dir / "path_statistics.json"
        with open(stats_path, 'w') as f:
            json.dump(statistics, f, indent=2)
        
        logger.info(f"Path saved to: {output_dir}")

def create_path_planning_config() -> Dict:
    """
    Create default configuration for path planning
    
    Returns:
        Configuration dictionary
    """
    return {
        # Safety parameters
        'max_slope': 25.0,  # degrees
        'max_risk_score': 0.3,  # 0-1 scale
        'safety_margin': 50.0,  # meters from landslides
        
        # Path planning parameters
        'step_size': 10.0,  # meters
        
        # Cost function weights
        'distance_weight': 1.0,
        'risk_weight': 2.0,
        'slope_weight': 1.5
    }

if __name__ == "__main__":
    # Example usage
    config = create_path_planning_config()
    planner = OptimalPathPlanner(config)
    
    # Example data paths
    data_paths = {
        'dtm': 'data/working/features/dtm.tif',
        'slope': 'data/working/features/slope.tif',
        'landslide_mask': 'outputs/physics_detection/landslide_mask.png'
    }
    
    # Load terrain data
    terrain_data = planner.load_terrain_data(data_paths)
    
    # Create risk map
    risk_map = planner.create_risk_map(
        terrain_data['landslide_mask'],
        terrain_data['dtm'],
        terrain_data['slope']
    )
    terrain_data['risk'] = risk_map
    
    # Define start and end points
    start_point = (1000.0, 1000.0)  # Example coordinates
    end_point = (2000.0, 2000.0)    # Example coordinates
    
    # Find optimal path
    path_points = planner.find_optimal_path(start_point, end_point, terrain_data)
    
    if path_points:
        # Calculate statistics
        statistics = planner.calculate_path_statistics(path_points)
        
        # Save path
        planner.save_path(path_points, 'outputs/optimal_path', 
                         terrain_data['dtm_crs'], statistics)
        
        print("Optimal path planning completed!")
        print(f"Path length: {statistics['total_distance_km']:.2f} km")
        print(f"Safety: {statistics['safety_percentage']:.1f}%")
    else:
        print("No safe path found!")
