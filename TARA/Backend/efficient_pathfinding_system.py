#!/usr/bin/env python3
"""
Efficient Pathfinding System for Lunar Rover
ML-based obstacle detection and pathfinding using A* algorithm
"""

import cv2
import numpy as np
import pandas as pd
import folium
from typing import List, Dict, Tuple, Optional
import logging
from dataclasses import dataclass
import heapq

logger = logging.getLogger(__name__)

@dataclass
class ObstaclePoint:
    """Represents an obstacle point in the terrain"""
    lon: float
    lat: float
    x: int
    y: int
    obstacle_type: str
    confidence: float
    risk_level: float
    size: float

@dataclass
class PathPoint:
    """Represents a point in the planned path"""
    lon: float
    lat: float
    x: int
    y: int
    elevation: float
    slope: float
    risk_score: float
    is_safe: bool
    distance_from_start: float

class EfficientPathfindingSystem:
    """ML-based pathfinding system with A* algorithm"""
    
    def __init__(self):
        """Initialize the pathfinding system"""
        self.obstacle_detection_threshold = 0.5
        self.safety_margin = 15  # pixels
        logger.info("🧠 Efficient Pathfinding System initialized")
    
    def process_pathfinding(self, image_path: str, csv_path: str, start_lon: float, 
                          start_lat: float, end_lon: float, end_lat: float) -> Dict:
        """Process complete pathfinding mission"""
        logger.info("🎯 Starting ML-based pathfinding mission...")
        
        try:
            # Load image and coordinates
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image: {image_path}")
            
            coordinates = pd.read_csv(csv_path)
            
            # Convert coordinates to image space
            start_x, start_y = self._selenographic_to_image(start_lon, start_lat, coordinates, image.shape[:2])
            end_x, end_y = self._selenographic_to_image(end_lon, end_lat, coordinates, image.shape[:2])
            
            if start_x is None or start_y is None or end_x is None or end_y is None:
                raise ValueError("Could not convert coordinates to image coordinates")
            
            # Detect obstacles using ML simulation
            obstacles = self._detect_obstacles_ml(image, start_x, start_y, end_x, end_y)
            
            # Convert obstacles to Selenographic coordinates
            selenographic_obstacles = self._convert_obstacles_to_selenographic(obstacles, coordinates, image.shape[:2])
            
            # Find optimal path
            path_points = self.find_optimal_path(start_lon, start_lat, end_lon, end_lat, 
                                               selenographic_obstacles, coordinates, image.shape[:2])
            
            # Calculate statistics
            statistics = self._calculate_statistics(path_points, selenographic_obstacles)
            
            # Create visualization
            folium_map = self.create_folium_visualization(selenographic_obstacles, path_points, 
                                                         start_lon, start_lat, end_lon, end_lat,
                                                         "ml_mission", image_path, coordinates)
            
            result = {
                'statistics': statistics,
                'obstacles': selenographic_obstacles,
                'path_points': path_points,
                'folium_map': folium_map,
                'model_type': 'ML'
            }
            
            logger.info("✅ ML pathfinding completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"❌ ML pathfinding error: {e}")
            return {'error': str(e), 'statistics': {'path_found': False}}
    
    def _detect_obstacles_ml(self, image: np.ndarray, start_x: int, start_y: int, 
                            end_x: int, end_y: int) -> List[Dict]:
        """Simulate ML-based obstacle detection"""
        logger.info("🔍 Running ML obstacle detection...")
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply edge detection
        edges = cv2.Canny(gray, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        obstacles = []
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            if area > 50:  # Filter small contours
                x, y, w, h = cv2.boundingRect(contour)
                center_x = x + w // 2
                center_y = y + h // 2
                
                # Simulate ML confidence
                confidence = min(0.95, area / 2000 + np.random.uniform(0, 0.3))
                
                # Classify obstacle type
                aspect_ratio = w / h if h > 0 else 1
                obstacle_type = 'boulder' if aspect_ratio < 2 else 'landslide'
                
                # Calculate risk level
                dist_to_path = self._distance_to_line(center_x, center_y, start_x, start_y, end_x, end_y)
                risk_level = max(0.1, min(0.9, 1.0 - dist_to_path / 100))
                
                obstacle = {
                    'x': center_x,
                    'y': center_y,
                    'width': w,
                    'height': h,
                    'area': area,
                    'obstacle_type': obstacle_type,
                    'confidence': confidence,
                    'risk_level': risk_level,
                    'size': max(w, h)
                }
                
                obstacles.append(obstacle)
        
        logger.info(f"🎯 ML detected {len(obstacles)} obstacles")
        return obstacles
    
    def _distance_to_line(self, px: int, py: int, x1: int, y1: int, x2: int, y2: int) -> float:
        """Calculate distance from point to line"""
        if x1 == x2 and y1 == y2:
            return np.sqrt((px - x1)**2 + (py - y1)**2)
        
        A = y2 - y1
        B = x1 - x2
        C = x2 * y1 - x1 * y2
        
        return abs(A * px + B * py + C) / np.sqrt(A**2 + B**2)
    
    def _convert_obstacles_to_selenographic(self, obstacles: List[Dict], coordinates: pd.DataFrame, 
                                          image_shape: Tuple[int, int]) -> List[ObstaclePoint]:
        """Convert obstacles to Selenographic coordinates"""
        selenographic_obstacles = []
        
        for obstacle in obstacles:
            lon, lat = self._image_to_selenographic(obstacle['x'], obstacle['y'], coordinates, image_shape)
            
            if lon is not None and lat is not None:
                obstacle_point = ObstaclePoint(
                    lon=lon,
                    lat=lat,
                    x=obstacle['x'],
                    y=obstacle['y'],
                    obstacle_type=obstacle['obstacle_type'],
                    confidence=obstacle['confidence'],
                    risk_level=obstacle['risk_level'],
                    size=obstacle['size']
                )
                selenographic_obstacles.append(obstacle_point)
        
        return selenographic_obstacles
    
    def _image_to_selenographic(self, x: int, y: int, coordinates: pd.DataFrame, 
                               image_shape: Tuple[int, int]) -> Tuple[float, float]:
        """Convert image coordinates to Selenographic coordinates"""
        try:
            height, width = image_shape[:2]
            
            # Normalize coordinates
            norm_x = x / width
            norm_y = y / height
            
            # Interpolate from coordinate data
            lon_min, lon_max = coordinates['longitude'].min(), coordinates['longitude'].max()
            lat_min, lat_max = coordinates['latitude'].min(), coordinates['latitude'].max()
            
            lon = lon_min + norm_x * (lon_max - lon_min)
            lat = lat_min + norm_y * (lat_max - lat_min)
            
            return lon, lat
            
        except Exception as e:
            logger.warning(f"Error converting coordinates: {e}")
            return None, None
    
    def find_optimal_path(self, start_lon: float, start_lat: float, end_lon: float, end_lat: float,
                         obstacles: List[ObstaclePoint], coordinates: pd.DataFrame, 
                         image_shape: Tuple[int, int]) -> List[PathPoint]:
        """Find optimal path using A* algorithm"""
        logger.info("🛣️ Finding optimal path using A* algorithm...")
        
        # Convert start/end to image coordinates
        start_x, start_y = self._selenographic_to_image(start_lon, start_lat, coordinates, image_shape)
        end_x, end_y = self._selenographic_to_image(end_lon, end_lat, coordinates, image_shape)
        
        if start_x is None or start_y is None or end_x is None or end_y is None:
            return []
        
        # Create obstacle grid
        height, width = image_shape[:2]
        obstacle_grid = self._create_obstacle_grid(obstacles, width, height)
        
        # Run A* algorithm
        path = self._astar(start_x, start_y, end_x, end_y, obstacle_grid)
        
        # Convert path to PathPoint objects
        path_points = []
        for i, (x, y) in enumerate(path):
            lon, lat = self._image_to_selenographic(x, y, coordinates, image_shape)
            if lon is not None and lat is not None:
                # Calculate distance from start
                if i == 0:
                    distance = 0.0
                else:
                    prev_lon, prev_lat = self._image_to_selenographic(path[i-1][0], path[i-1][1], coordinates, image_shape)
                    if prev_lon is not None and prev_lat is not None:
                        distance = self._calculate_distance(prev_lon, prev_lat, lon, lat)
                    else:
                        distance = 0.0
                
                path_point = PathPoint(
                    lon=lon,
                    lat=lat,
                    x=x,
                    y=y,
                    elevation=0.0,  # Would need elevation data
                    slope=0.0,      # Would need slope data
                    risk_score=self._calculate_risk_score(x, y, obstacles),
                    is_safe=self._is_point_safe(x, y, obstacles),
                    distance_from_start=distance
                )
                path_points.append(path_point)
        
        logger.info(f"✅ Found path with {len(path_points)} points")
        return path_points
    
    def _create_obstacle_grid(self, obstacles: List[ObstaclePoint], width: int, height: int) -> np.ndarray:
        """Create binary obstacle grid"""
        grid = np.zeros((height, width), dtype=bool)
        
        for obstacle in obstacles:
            x, y = obstacle.x, obstacle.y
            size = int(obstacle.size) + self.safety_margin
            
            # Mark obstacle area
            for dx in range(-size, size + 1):
                for dy in range(-size, size + 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < width and 0 <= ny < height:
                        if dx*dx + dy*dy <= size*size:
                            grid[ny, nx] = True
        
        return grid
    
    def _astar(self, start_x: int, start_y: int, end_x: int, end_y: int, 
              obstacle_grid: np.ndarray) -> List[Tuple[int, int]]:
        """A* pathfinding algorithm"""
        height, width = obstacle_grid.shape
        
        # Priority queue: (f_score, g_score, x, y, parent)
        open_set = [(0, 0, start_x, start_y, None)]
        closed_set = set()
        came_from = {}
        
        g_score = {(start_x, start_y): 0}
        f_score = {(start_x, start_y): self._heuristic(start_x, start_y, end_x, end_y)}
        
        while open_set:
            current_f, current_g, x, y, parent = heapq.heappop(open_set)
            
            if (x, y) in closed_set:
                continue
            
            closed_set.add((x, y))
            came_from[(x, y)] = parent
            
            if x == end_x and y == end_y:
                # Reconstruct path
                path = []
                while (x, y) is not None:
                    path.append((x, y))
                    x, y = came_from.get((x, y), (None, None))
                return path[::-1]
            
            # Check neighbors
            for dx, dy in [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]:
                nx, ny = x + dx, y + dy
                
                if (0 <= nx < width and 0 <= ny < height and 
                    not obstacle_grid[ny, nx] and (nx, ny) not in closed_set):
                    
                    tentative_g = current_g + self._distance(x, y, nx, ny)
                    
                    if (nx, ny) not in g_score or tentative_g < g_score[(nx, ny)]:
                        g_score[(nx, ny)] = tentative_g
                        f_score[(nx, ny)] = tentative_g + self._heuristic(nx, ny, end_x, end_y)
                        heapq.heappush(open_set, (f_score[(nx, ny)], tentative_g, nx, ny, (x, y)))
        
        return []  # No path found
    
    def _heuristic(self, x1: int, y1: int, x2: int, y2: int) -> float:
        """Heuristic function for A* (Euclidean distance)"""
        return np.sqrt((x1 - x2)**2 + (y1 - y2)**2)
    
    def _distance(self, x1: int, y1: int, x2: int, y2: int) -> float:
        """Distance between two points"""
        return np.sqrt((x1 - x2)**2 + (y1 - y2)**2)
    
    def _calculate_risk_score(self, x: int, y: int, obstacles: List[ObstaclePoint]) -> float:
        """Calculate risk score for a point"""
        min_risk = 1.0
        for obstacle in obstacles:
            dist = np.sqrt((x - obstacle.x)**2 + (y - obstacle.y)**2)
            risk = obstacle.risk_level * max(0, 1 - dist / 100)
            min_risk = min(min_risk, risk)
        return min_risk
    
    def _is_point_safe(self, x: int, y: int, obstacles: List[ObstaclePoint]) -> bool:
        """Check if a point is safe from obstacles"""
        for obstacle in obstacles:
            dist = np.sqrt((x - obstacle.x)**2 + (y - obstacle.y)**2)
            if dist < obstacle.size + self.safety_margin:
                return False
        return True
    
    def _calculate_distance(self, lon1: float, lat1: float, lon2: float, lat2: float) -> float:
        """Calculate distance between two Selenographic coordinates (km)"""
        # Simple approximation for lunar coordinates
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        return np.sqrt(dlon**2 + dlat**2) * 111.32  # Rough conversion to km
    
    def _calculate_statistics(self, path_points: List[PathPoint], obstacles: List[ObstaclePoint]) -> Dict:
        """Calculate mission statistics"""
        path_found = len(path_points) > 0
        
        path_length = 0.0
        if len(path_points) > 1:
            for i in range(1, len(path_points)):
                path_length += self._calculate_distance(
                    path_points[i-1].lon, path_points[i-1].lat,
                    path_points[i].lon, path_points[i].lat
                )
        
        safety_percentage = 100.0
        if path_points:
            safe_points = sum(1 for p in path_points if p.is_safe)
            safety_percentage = (safe_points / len(path_points)) * 100
        
        boulder_count = sum(1 for obs in obstacles if obs.obstacle_type == 'boulder')
        landslide_count = sum(1 for obs in obstacles if obs.obstacle_type == 'landslide')
        
        return {
            'path_found': path_found,
            'path_length_km': path_length,
            'safety_percentage': safety_percentage,
            'total_obstacles': len(obstacles),
            'boulders': boulder_count,
            'landslides': landslide_count,
            'path_points': len(path_points)
        }
    
    def create_folium_visualization(self, obstacles: List[ObstaclePoint], path_points: List[PathPoint],
                                  start_lon: float, start_lat: float, end_lon: float, end_lat: float,
                                  mission_name: str, image_path: str, coordinates: pd.DataFrame) -> folium.Map:
        """Create interactive Folium map visualization"""
        logger.info("🗺️ Creating interactive map visualization...")
        
        # Calculate map center
        center_lat = (start_lat + end_lat) / 2
        center_lon = (start_lon + end_lon) / 2
        
        # Create map
        m = folium.Map(
            location=[center_lat, center_lon],
            zoom_start=15,
            tiles='OpenStreetMap'
        )
        
        # Add start marker
        folium.Marker(
            [start_lat, start_lon],
            popup=f"Start: {mission_name}",
            icon=folium.Icon(color='green', icon='play')
        ).add_to(m)
        
        # Add end marker
        folium.Marker(
            [end_lat, end_lon],
            popup=f"End: {mission_name}",
            icon=folium.Icon(color='red', icon='stop')
        ).add_to(m)
        
        # Add path
        if path_points:
            path_coords = [[p.lat, p.lon] for p in path_points]
            folium.PolyLine(
                path_coords,
                color='blue',
                weight=3,
                opacity=0.8,
                popup=f"Path: {mission_name}"
            ).add_to(m)
        
        # Add obstacles
        for obstacle in obstacles:
            color = 'orange' if obstacle.obstacle_type == 'boulder' else 'red'
            folium.CircleMarker(
                [obstacle.lat, obstacle.lon],
                radius=obstacle.size / 10,
                popup=f"{obstacle.obstacle_type.title()}: {obstacle.confidence:.2f}",
                color=color,
                fill=True,
                fillOpacity=0.6
            ).add_to(m)
        
        logger.info("✅ Interactive map created successfully")
        return m
    
    def _selenographic_to_image(self, lon: float, lat: float, coordinates: pd.DataFrame, 
                               image_shape: Tuple[int, int]) -> Tuple[Optional[int], Optional[int]]:
        """Convert Selenographic coordinates to image coordinates"""
        try:
            height, width = image_shape[:2]
            
            # Find bounds
            lon_min, lon_max = coordinates['longitude'].min(), coordinates['longitude'].max()
            lat_min, lat_max = coordinates['latitude'].min(), coordinates['latitude'].max()
            
            # Normalize coordinates
            norm_x = (lon - lon_min) / (lon_max - lon_min)
            norm_y = (lat - lat_min) / (lat_max - lat_min)
            
            # Convert to image coordinates
            x = int(norm_x * width)
            y = int(norm_y * height)
            
            # Clamp to image bounds
            x = max(0, min(width - 1, x))
            y = max(0, min(height - 1, y))
            
            return x, y
            
        except Exception as e:
            logger.warning(f"Error converting Selenographic coordinates: {e}")
            return None, None

def format_selenographic_coords(lon: float, lat: float) -> str:
    """Format Selenographic coordinates for display"""
    return f"Lon: {lon:.6f}°, Lat: {lat:.6f}°"
