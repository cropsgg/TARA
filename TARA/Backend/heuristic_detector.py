#!/usr/bin/env python3
"""
Heuristic Pathfinding System for Lunar Rover
Low-power alternative to ML-based pathfinding
"""

import cv2
import numpy as np
import pandas as pd
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)

class HeuristicPathfindingSystem:
    """Heuristic-based obstacle detection and pathfinding system"""
    
    def __init__(self):
        """Initialize the heuristic system"""
        self.obstacle_threshold = 0.3  # Threshold for obstacle detection
        self.min_obstacle_size = 10    # Minimum obstacle size in pixels
        logger.info("⚡ Heuristic Pathfinding System initialized")
    
    def detect_obstacles(self, image: np.ndarray, start_x: int, start_y: int, 
                        end_x: int, end_y: int) -> List[Dict]:
        """Detect obstacles using heuristic methods"""
        logger.info("🔍 Running heuristic obstacle detection...")
        
        # Convert to grayscale for processing
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Detect edges using Canny
        edges = cv2.Canny(blurred, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        obstacles = []
        
        for contour in contours:
            # Calculate contour area
            area = cv2.contourArea(contour)
            
            if area > self.min_obstacle_size:
                # Get bounding rectangle
                x, y, w, h = cv2.boundingRect(contour)
                
                # Calculate center point
                center_x = x + w // 2
                center_y = y + h // 2
                
                # Determine obstacle type based on shape and size
                aspect_ratio = w / h if h > 0 else 1
                obstacle_type = self._classify_obstacle(area, aspect_ratio, w, h)
                
                # Calculate confidence based on area and shape
                confidence = min(1.0, area / 1000)  # Normalize confidence
                
                # Calculate risk level
                risk_level = self._calculate_risk_level(area, center_x, center_y, 
                                                      start_x, start_y, end_x, end_y)
                
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
        
        logger.info(f"🎯 Detected {len(obstacles)} obstacles using heuristic methods")
        return obstacles
    
    def _classify_obstacle(self, area: float, aspect_ratio: float, width: int, height: int) -> str:
        """Classify obstacle type based on shape and size"""
        if area > 500:  # Large obstacles
            if aspect_ratio > 2 or aspect_ratio < 0.5:  # Elongated shapes
                return 'landslide'
            else:
                return 'boulder'
        elif area > 100:  # Medium obstacles
            return 'boulder'
        else:  # Small obstacles
            return 'boulder'
    
    def _calculate_risk_level(self, area: float, center_x: int, center_y: int,
                            start_x: int, start_y: int, end_x: int, end_y: int) -> float:
        """Calculate risk level based on obstacle position and size"""
        # Calculate distance from start and end points
        dist_from_start = np.sqrt((center_x - start_x)**2 + (center_y - start_y)**2)
        dist_from_end = np.sqrt((center_x - end_x)**2 + (center_y - end_y)**2)
        
        # Calculate distance from the direct path
        line_dist = self._point_to_line_distance(center_x, center_y, start_x, start_y, end_x, end_y)
        
        # Risk increases with area and proximity to path
        area_risk = min(1.0, area / 1000)
        proximity_risk = max(0, 1.0 - line_dist / 100)  # Higher risk if closer to path
        
        return min(1.0, (area_risk + proximity_risk) / 2)
    
    def _point_to_line_distance(self, px: int, py: int, x1: int, y1: int, x2: int, y2: int) -> float:
        """Calculate distance from point to line"""
        if x1 == x2 and y1 == y2:
            return np.sqrt((px - x1)**2 + (py - y1)**2)
        
        # Calculate distance using line equation
        A = y2 - y1
        B = x1 - x2
        C = x2 * y1 - x1 * y2
        
        distance = abs(A * px + B * py + C) / np.sqrt(A**2 + B**2)
        return distance
    
    def convert_to_selenographic(self, obstacles: List[Dict], coordinates: pd.DataFrame, 
                                image_shape: Tuple[int, int]) -> List[Dict]:
        """Convert obstacle coordinates to Selenographic coordinates"""
        logger.info("🌙 Converting obstacles to Selenographic coordinates...")
        
        height, width = image_shape[:2]
        converted_obstacles = []
        
        for obstacle in obstacles:
            # Convert image coordinates to Selenographic coordinates
            lon, lat = self._image_to_selenographic(
                obstacle['x'], obstacle['y'], coordinates, image_shape
            )
            
            if lon is not None and lat is not None:
                converted_obstacle = {
                    'lon': lon,
                    'lat': lat,
                    'x': obstacle['x'],
                    'y': obstacle['y'],
                    'obstacle_type': obstacle['obstacle_type'],
                    'confidence': obstacle['confidence'],
                    'risk_level': obstacle['risk_level'],
                    'size': obstacle['size']
                }
                converted_obstacles.append(converted_obstacle)
        
        logger.info(f"✅ Converted {len(converted_obstacles)} obstacles to Selenographic coordinates")
        return converted_obstacles
    
    def _image_to_selenographic(self, x: int, y: int, coordinates: pd.DataFrame, 
                               image_shape: Tuple[int, int]) -> Tuple[float, float]:
        """Convert image coordinates to Selenographic coordinates"""
        try:
            height, width = image_shape[:2]
            
            # Normalize coordinates to [0, 1]
            norm_x = x / width
            norm_y = y / height
            
            # Find the corresponding coordinate in the CSV
            if len(coordinates) == 0:
                return None, None
            
            # Simple linear interpolation
            lon_min, lon_max = coordinates['longitude'].min(), coordinates['longitude'].max()
            lat_min, lat_max = coordinates['latitude'].min(), coordinates['latitude'].max()
            
            lon = lon_min + norm_x * (lon_max - lon_min)
            lat = lat_min + norm_y * (lat_max - lat_min)
            
            return lon, lat
            
        except Exception as e:
            logger.warning(f"Error converting coordinates: {e}")
            return None, None
    
    def find_simple_path(self, start_x: int, start_y: int, end_x: int, end_y: int,
                        obstacles: List[Dict]) -> List[Tuple[int, int]]:
        """Find a simple path avoiding obstacles"""
        logger.info("🛣️ Finding heuristic path...")
        
        # Simple straight-line path with basic obstacle avoidance
        path = []
        
        # Calculate direction vector
        dx = end_x - start_x
        dy = end_y - start_y
        distance = np.sqrt(dx**2 + dy**2)
        
        if distance == 0:
            return [(start_x, start_y)]
        
        # Normalize direction
        dx_norm = dx / distance
        dy_norm = dy / distance
        
        # Create path points
        num_points = max(10, int(distance / 20))  # At least 10 points, one every 20 pixels
        
        for i in range(num_points + 1):
            t = i / num_points
            x = int(start_x + t * dx)
            y = int(start_y + t * dy)
            
            # Check for obstacles near this point
            if not self._point_has_obstacle(x, y, obstacles):
                path.append((x, y))
            else:
                # Try to avoid obstacle by going around it
                offset_x, offset_y = self._avoid_obstacle(x, y, obstacles)
                path.append((x + offset_x, y + offset_y))
        
        # Ensure end point is included
        if (end_x, end_y) not in path:
            path.append((end_x, end_y))
        
        logger.info(f"✅ Found heuristic path with {len(path)} points")
        return path
    
    def _point_has_obstacle(self, x: int, y: int, obstacles: List[Dict], 
                           safety_margin: int = 20) -> bool:
        """Check if a point is too close to any obstacle"""
        for obstacle in obstacles:
            dist = np.sqrt((x - obstacle['x'])**2 + (y - obstacle['y'])**2)
            if dist < obstacle['size'] + safety_margin:
                return True
        return False
    
    def _avoid_obstacle(self, x: int, y: int, obstacles: List[Dict]) -> Tuple[int, int]:
        """Calculate offset to avoid nearby obstacles"""
        for obstacle in obstacles:
            dist = np.sqrt((x - obstacle['x'])**2 + (y - obstacle['y'])**2)
            if dist < obstacle['size'] + 30:  # Within avoidance range
                # Calculate perpendicular offset
                dx = x - obstacle['x']
                dy = y - obstacle['y']
                if dx != 0 or dy != 0:
                    # Normalize and rotate 90 degrees
                    length = np.sqrt(dx**2 + dy**2)
                    offset_x = int(-dy / length * 30)  # Perpendicular offset
                    offset_y = int(dx / length * 30)
                    return offset_x, offset_y
        
        return 0, 0
