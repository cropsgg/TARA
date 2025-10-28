#!/usr/bin/env python3
"""
Selenographic Coordinate System Utilities
Handles conversion between image coordinates and lunar coordinates
"""

import numpy as np
import rasterio
from typing import Tuple, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class SelenographicConverter:
    """
    Converts between image coordinates and Selenographic coordinates
    Selenographic coordinates: longitude (-180° to +180°) and latitude (-90° to +90°)
    """
    
    def __init__(self, image_transform: rasterio.transform.Affine, 
                 image_crs: rasterio.crs.CRS, 
                 lunar_bounds: Optional[Dict] = None):
        """
        Initialize the coordinate converter
        
        Args:
            image_transform: Geospatial transform for the image
            image_crs: Coordinate reference system of the image
            lunar_bounds: Bounds of the lunar region in Selenographic coordinates
                         {'min_lon': -180, 'max_lon': 180, 'min_lat': -90, 'max_lat': 90}
        """
        self.image_transform = image_transform
        self.image_crs = image_crs
        
        # Default lunar bounds (entire Moon)
        self.lunar_bounds = lunar_bounds or {
            'min_lon': -180.0,
            'max_lon': 180.0,
            'min_lat': -90.0,
            'max_lat': 90.0
        }
        
        logger.info(f"Selenographic converter initialized with bounds: {self.lunar_bounds}")
    
    def image_to_selenographic(self, x: float, y: float) -> Tuple[float, float]:
        """
        Convert image coordinates to Selenographic coordinates
        
        Args:
            x, y: Image coordinates (meters or pixels)
            
        Returns:
            Tuple of (longitude, latitude) in degrees
        """
        # Convert image coordinates to world coordinates
        world_x, world_y = rasterio.transform.xy(self.image_transform, y, x)
        
        # Convert to Selenographic coordinates
        # Assuming the image is already in a lunar projection
        # If not, you might need additional transformation steps
        
        # For now, we'll assume a simple linear mapping
        # In practice, you'd use proper lunar projection transformations
        
        # Map world coordinates to lunar longitude/latitude
        lon = self._world_to_longitude(world_x)
        lat = self._world_to_latitude(world_y)
        
        return lon, lat
    
    def selenographic_to_image(self, lon: float, lat: float) -> Tuple[float, float]:
        """
        Convert Selenographic coordinates to image coordinates
        
        Args:
            lon: Longitude in degrees (-180 to +180)
            lat: Latitude in degrees (-90 to +90)
            
        Returns:
            Tuple of (x, y) image coordinates
        """
        # Convert Selenographic to world coordinates
        world_x = self._longitude_to_world(lon)
        world_y = self._latitude_to_world(lat)
        
        # Convert world coordinates to image coordinates
        col, row = rasterio.transform.rowcol(self.image_transform, world_x, world_y)
        
        return float(col), float(row)
    
    def _world_to_longitude(self, world_x: float) -> float:
        """Convert world X coordinate to longitude"""
        # Simple linear mapping - adjust based on your actual projection
        # This is a placeholder - you'd implement proper lunar projection math
        lon_range = self.lunar_bounds['max_lon'] - self.lunar_bounds['min_lon']
        # Assuming world coordinates are in meters, scale appropriately
        lon = self.lunar_bounds['min_lon'] + (world_x / 1000.0) * (lon_range / 1000.0)
        return np.clip(lon, self.lunar_bounds['min_lon'], self.lunar_bounds['max_lon'])
    
    def _world_to_latitude(self, world_y: float) -> float:
        """Convert world Y coordinate to latitude"""
        # Simple linear mapping - adjust based on your actual projection
        lat_range = self.lunar_bounds['max_lat'] - self.lunar_bounds['min_lat']
        # Assuming world coordinates are in meters, scale appropriately
        lat = self.lunar_bounds['min_lat'] + (world_y / 1000.0) * (lat_range / 1000.0)
        return np.clip(lat, self.lunar_bounds['min_lat'], self.lunar_bounds['max_lat'])
    
    def _longitude_to_world(self, lon: float) -> float:
        """Convert longitude to world X coordinate"""
        lon_range = self.lunar_bounds['max_lon'] - self.lunar_bounds['min_lon']
        # Reverse of the above mapping
        world_x = (lon - self.lunar_bounds['min_lon']) * (1000.0 / lon_range) * 1000.0
        return world_x
    
    def _latitude_to_world(self, lat: float) -> float:
        """Convert latitude to world Y coordinate"""
        lat_range = self.lunar_bounds['max_lat'] - self.lunar_bounds['min_lat']
        # Reverse of the above mapping
        world_y = (lat - self.lunar_bounds['min_lat']) * (1000.0 / lat_range) * 1000.0
        return world_y
    
    def validate_selenographic_coords(self, lon: float, lat: float) -> bool:
        """
        Validate Selenographic coordinates
        
        Args:
            lon: Longitude in degrees
            lat: Latitude in degrees
            
        Returns:
            True if coordinates are valid
        """
        return (
            self.lunar_bounds['min_lon'] <= lon <= self.lunar_bounds['max_lon'] and
            self.lunar_bounds['min_lat'] <= lat <= self.lunar_bounds['max_lat']
        )
    
    def get_lunar_region_info(self) -> Dict:
        """
        Get information about the lunar region
        
        Returns:
            Dictionary with lunar region information
        """
        return {
            'bounds': self.lunar_bounds,
            'longitude_range': self.lunar_bounds['max_lon'] - self.lunar_bounds['min_lon'],
            'latitude_range': self.lunar_bounds['max_lat'] - self.lunar_bounds['min_lat'],
            'center_lon': (self.lunar_bounds['max_lon'] + self.lunar_bounds['min_lon']) / 2.0,
            'center_lat': (self.lunar_bounds['max_lat'] + self.lunar_bounds['min_lat']) / 2.0
        }

def create_selenographic_converter_from_image(image_path: str, 
                                            lunar_bounds: Optional[Dict] = None) -> SelenographicConverter:
    """
    Create a Selenographic converter from an image file
    
    Args:
        image_path: Path to the image file
        lunar_bounds: Optional lunar bounds
        
    Returns:
        SelenographicConverter instance
    """
    with rasterio.open(image_path) as src:
        return SelenographicConverter(src.transform, src.crs, lunar_bounds)

def format_selenographic_coords(lon: float, lat: float) -> str:
    """
    Format Selenographic coordinates for display
    
    Args:
        lon: Longitude in degrees
        lat: Latitude in degrees
        
    Returns:
        Formatted coordinate string
    """
    lon_dir = "E" if lon >= 0 else "W"
    lat_dir = "N" if lat >= 0 else "S"
    
    return f"{abs(lat):.6f}°{lat_dir}, {abs(lon):.6f}°{lon_dir}"

def parse_selenographic_coords(coord_string: str) -> Tuple[float, float]:
    """
    Parse Selenographic coordinate string
    
    Args:
        coord_string: String like "25.5°N, 45.2°E" or "25.5, 45.2"
        
    Returns:
        Tuple of (longitude, latitude) in degrees
    """
    try:
        # Remove spaces and split by comma
        parts = coord_string.replace(" ", "").split(",")
        
        if len(parts) != 2:
            raise ValueError("Invalid coordinate format")
        
        # Parse latitude
        lat_str = parts[0].upper()
        if "°N" in lat_str:
            lat = float(lat_str.replace("°N", ""))
        elif "°S" in lat_str:
            lat = -float(lat_str.replace("°S", ""))
        else:
            lat = float(lat_str)
        
        # Parse longitude
        lon_str = parts[1].upper()
        if "°E" in lon_str:
            lon = float(lon_str.replace("°E", ""))
        elif "°W" in lon_str:
            lon = -float(lon_str.replace("°W", ""))
        else:
            lon = float(lon_str)
        
        return lon, lat
        
    except Exception as e:
        raise ValueError(f"Failed to parse coordinates: {e}")

if __name__ == "__main__":
    # Example usage
    from rasterio.transform import from_bounds
    
    # Create a sample transform (adjust based on your actual data)
    transform = from_bounds(0, 0, 1000, 1000, 100, 100)
    
    # Create converter
    converter = SelenographicConverter(transform, rasterio.crs.CRS.from_epsg(4326))
    
    # Test conversions
    test_lon, test_lat = 45.0, 25.0  # Example Selenographic coordinates
    x, y = converter.selenographic_to_image(test_lon, test_lat)
    back_lon, back_lat = converter.image_to_selenographic(x, y)
    
    print(f"Original: {test_lon:.2f}°, {test_lat:.2f}°")
    print(f"Image coords: ({x:.2f}, {y:.2f})")
    print(f"Converted back: {back_lon:.2f}°, {back_lat:.2f}°")
    print(f"Formatted: {format_selenographic_coords(test_lon, test_lat)}")
