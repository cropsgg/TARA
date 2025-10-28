#!/usr/bin/env python3
"""
Physics-Based Landslide Detection System
Uses slope, depth, and width criteria to detect landslides without training labels
"""

import numpy as np
import cv2
from pathlib import Path
import rasterio
from rasterio.features import shapes
import geopandas as gpd
from shapely.geometry import shape
import json
import logging
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PhysicsBasedLandslideDetector:
    """
    Physics-based landslide detector using slope, depth, and width criteria
    No training labels required - uses physical principles
    """
    
    def __init__(self, config: Dict):
        """
        Initialize the physics-based detector
        
        Args:
            config: Configuration dictionary with detection parameters
        """
        self.config = config
        
        # Physical criteria thresholds
        self.critical_slope = config.get('critical_slope', 30.0)  # degrees
        self.min_depth_change = config.get('min_depth_change', 5.0)  # meters
        self.max_depth_change = config.get('max_depth_change', 100.0)  # meters
        self.min_width = config.get('min_width', 20.0)  # meters
        self.max_width = config.get('max_width', 500.0)  # meters
        self.min_roughness = config.get('min_roughness', 0.1)  # relative units
        self.max_roughness = config.get('max_roughness', 2.0)  # relative units
        
        # Detection weights
        self.slope_weight = config.get('slope_weight', 0.4)
        self.depth_weight = config.get('depth_weight', 0.3)
        self.width_weight = config.get('width_weight', 0.2)
        self.roughness_weight = config.get('roughness_weight', 0.1)
        
        # Detection threshold
        self.detection_threshold = config.get('detection_threshold', 0.6)
        
        logger.info(f"Physics-based detector initialized with slope threshold: {self.critical_slope}°")
    
    def load_terrain_data(self, data_paths: Dict[str, str]) -> Dict[str, np.ndarray]:
        """
        Load all required terrain data
        
        Args:
            data_paths: Dictionary with paths to different data types
            
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
                    logger.info(f"Loaded {data_type}: {terrain_data[data_type].shape}")
            except Exception as e:
                logger.error(f"Error loading {data_type} from {path}: {e}")
                continue
        
        return terrain_data
    
    def calculate_slope_criteria(self, slope_map: np.ndarray) -> np.ndarray:
        """
        Calculate slope-based landslide criteria
        
        Args:
            slope_map: Slope map in degrees
            
        Returns:
            Binary mask for critical slopes
        """
        # Rule 1: Critical slope threshold
        critical_slope_mask = slope_map > self.critical_slope
        
        # Rule 2: Slope gradient analysis (steep changes)
        slope_gradient = np.gradient(slope_map)
        slope_gradient_magnitude = np.sqrt(slope_gradient[0]**2 + slope_gradient[1]**2)
        high_gradient = slope_gradient_magnitude > np.percentile(slope_gradient_magnitude, 90)
        
        # Combine slope criteria
        slope_criteria = critical_slope_mask & high_gradient
        
        logger.info(f"Critical slopes (>30°): {np.sum(critical_slope_mask)} pixels")
        logger.info(f"High gradient slopes: {np.sum(high_gradient)} pixels")
        
        return slope_criteria.astype(np.float32)
    
    def calculate_depth_criteria(self, dtm_map: np.ndarray) -> np.ndarray:
        """
        Calculate depth-based landslide criteria
        
        Args:
            dtm_map: Digital Terrain Model elevation data
            
        Returns:
            Binary mask for significant depth changes
        """
        # Rule 1: Elevation change analysis
        elevation_gradient = np.gradient(dtm_map)
        elevation_gradient_magnitude = np.sqrt(elevation_gradient[0]**2 + elevation_gradient[1]**2)
        
        # Rule 2: Local elevation differences
        kernel_size = 5
        kernel = np.ones((kernel_size, kernel_size), np.float32) / (kernel_size * kernel_size)
        local_mean = cv2.filter2D(dtm_map, -1, kernel)
        local_elevation_diff = np.abs(dtm_map - local_mean)
        
        # Rule 3: Depth change thresholds
        significant_depth_change = (
            (elevation_gradient_magnitude > self.min_depth_change) &
            (elevation_gradient_magnitude < self.max_depth_change) &
            (local_elevation_diff > self.min_depth_change)
        )
        
        logger.info(f"Significant depth changes: {np.sum(significant_depth_change)} pixels")
        
        return significant_depth_change.astype(np.float32)
    
    def calculate_width_criteria(self, feature_mask: np.ndarray, pixel_size: float) -> np.ndarray:
        """
        Calculate width-based landslide criteria
        
        Args:
            feature_mask: Binary mask of potential landslide features
            pixel_size: Size of each pixel in meters
            
        Returns:
            Binary mask for valid width features
        """
        # Find connected components
        num_labels, labels = cv2.connectedComponents(feature_mask.astype(np.uint8))
        
        valid_width_mask = np.zeros_like(feature_mask, dtype=np.float32)
        
        for label in range(1, num_labels):
            component_mask = (labels == label)
            
            # Calculate component dimensions
            rows, cols = np.where(component_mask)
            if len(rows) == 0:
                continue
                
            # Calculate width and height in meters
            width_meters = (cols.max() - cols.min()) * pixel_size
            height_meters = (rows.max() - rows.min()) * pixel_size
            
            # Check width criteria
            if self.min_width <= width_meters <= self.max_width:
                valid_width_mask[component_mask] = 1.0
        
        logger.info(f"Valid width features: {np.sum(valid_width_mask)} pixels")
        
        return valid_width_mask
    
    def calculate_roughness_criteria(self, roughness_map: np.ndarray) -> np.ndarray:
        """
        Calculate roughness-based landslide criteria
        
        Args:
            roughness_map: Terrain roughness map
            
        Returns:
            Binary mask for high roughness areas
        """
        # Rule 1: High roughness threshold
        roughness_threshold = np.percentile(roughness_map, 85)  # Top 15%
        high_roughness = roughness_map > roughness_threshold
        
        # Rule 2: Roughness gradient (landslides create rough terrain)
        roughness_gradient = np.gradient(roughness_map)
        roughness_gradient_magnitude = np.sqrt(roughness_gradient[0]**2 + roughness_gradient[1]**2)
        high_roughness_gradient = roughness_gradient_magnitude > np.percentile(roughness_gradient_magnitude, 80)
        
        # Combine roughness criteria
        roughness_criteria = high_roughness & high_roughness_gradient
        
        logger.info(f"High roughness areas: {np.sum(roughness_criteria)} pixels")
        
        return roughness_criteria.astype(np.float32)
    
    def calculate_aspect_criteria(self, dtm_map: np.ndarray) -> np.ndarray:
        """
        Calculate aspect-based landslide criteria
        
        Args:
            dtm_map: Digital Terrain Model elevation data
            
        Returns:
            Binary mask for vulnerable aspects
        """
        # Calculate aspect (direction of steepest slope)
        grad_y, grad_x = np.gradient(dtm_map)
        aspect = np.arctan2(grad_y, grad_x) * 180 / np.pi
        aspect = (aspect + 360) % 360  # Convert to 0-360 degrees
        
        # Landslides often occur on south-facing slopes (180-270°)
        # and east-facing slopes (90-180°) due to solar heating and weathering
        vulnerable_aspects = (
            ((aspect >= 180) & (aspect <= 270)) |  # South-facing
            ((aspect >= 90) & (aspect <= 180))     # East-facing
        )
        
        logger.info(f"Vulnerable aspects: {np.sum(vulnerable_aspects)} pixels")
        
        return vulnerable_aspects.astype(np.float32)
    
    def detect_landslides(self, terrain_data: Dict[str, np.ndarray]) -> Dict[str, np.ndarray]:
        """
        Main landslide detection function using physics-based criteria
        
        Args:
            terrain_data: Dictionary with loaded terrain data
            
        Returns:
            Dictionary with detection results
        """
        logger.info("Starting physics-based landslide detection...")
        
        # Extract required data
        slope_map = terrain_data.get('slope')
        dtm_map = terrain_data.get('dtm')
        roughness_map = terrain_data.get('roughness')
        
        if slope_map is None or dtm_map is None:
            raise ValueError("Required terrain data (slope, dtm) not available")
        
        # Calculate individual criteria
        slope_criteria = self.calculate_slope_criteria(slope_map)
        depth_criteria = self.calculate_depth_criteria(dtm_map)
        roughness_criteria = self.calculate_roughness_criteria(roughness_map) if roughness_map is not None else np.zeros_like(slope_map)
        aspect_criteria = self.calculate_aspect_criteria(dtm_map)
        
        # Calculate width criteria based on slope criteria
        pixel_size = 1.0  # Assume 1 meter per pixel (adjust based on actual data)
        width_criteria = self.calculate_width_criteria(slope_criteria, pixel_size)
        
        # Combine all criteria with weights
        landslide_score = (
            self.slope_weight * slope_criteria +
            self.depth_weight * depth_criteria +
            self.width_weight * width_criteria +
            self.roughness_weight * roughness_criteria +
            0.1 * aspect_criteria  # Aspect as additional factor
        )
        
        # Apply detection threshold
        landslide_mask = landslide_score > self.detection_threshold
        
        # Post-processing: morphological operations
        kernel = np.ones((3, 3), np.uint8)
        landslide_mask = cv2.morphologyEx(landslide_mask.astype(np.uint8), cv2.MORPH_CLOSE, kernel)
        landslide_mask = cv2.morphologyEx(landslide_mask, cv2.MORPH_OPEN, kernel)
        
        # Calculate statistics
        total_pixels = landslide_mask.size
        landslide_pixels = np.sum(landslide_mask)
        landslide_percentage = (landslide_pixels / total_pixels) * 100
        
        logger.info(f"Detection complete:")
        logger.info(f"  Total pixels: {total_pixels:,}")
        logger.info(f"  Landslide pixels: {landslide_pixels:,}")
        logger.info(f"  Landslide percentage: {landslide_percentage:.2f}%")
        
        return {
            'landslide_mask': landslide_mask.astype(np.uint8),
            'landslide_score': landslide_score,
            'slope_criteria': slope_criteria,
            'depth_criteria': depth_criteria,
            'width_criteria': width_criteria,
            'roughness_criteria': roughness_criteria,
            'aspect_criteria': aspect_criteria,
            'statistics': {
                'total_pixels': total_pixels,
                'landslide_pixels': landslide_pixels,
                'landslide_percentage': landslide_percentage
            }
        }
    
    def save_results(self, results: Dict[str, np.ndarray], output_dir: str, 
                    transform: rasterio.transform.Affine, crs: rasterio.crs.CRS):
        """
        Save detection results to files
        
        Args:
            results: Detection results dictionary
            output_dir: Output directory path
            transform: Geospatial transform
            crs: Coordinate reference system
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Save binary mask
        mask_path = output_path / "landslide_mask.png"
        cv2.imwrite(str(mask_path), results['landslide_mask'] * 255)
        
        # Save score map
        score_path = output_path / "landslide_score.tif"
        with rasterio.open(
            score_path, 'w',
            driver='GTiff',
            height=results['landslide_score'].shape[0],
            width=results['landslide_score'].shape[1],
            count=1,
            dtype=results['landslide_score'].dtype,
            crs=crs,
            transform=transform
        ) as dst:
            dst.write(results['landslide_score'], 1)
        
        # Save individual criteria
        for criteria_name, criteria_data in results.items():
            if criteria_name.endswith('_criteria'):
                criteria_path = output_path / f"{criteria_name}.tif"
                with rasterio.open(
                    criteria_path, 'w',
                    driver='GTiff',
                    height=criteria_data.shape[0],
                    width=criteria_data.shape[1],
                    count=1,
                    dtype=criteria_data.dtype,
                    crs=crs,
                    transform=transform
                ) as dst:
                    dst.write(criteria_data, 1)
        
        # Save statistics
        stats_path = output_path / "detection_statistics.json"
        with open(stats_path, 'w') as f:
            json.dump(results['statistics'], f, indent=2)
        
        logger.info(f"Results saved to: {output_path}")
    
    def generate_polygons(self, landslide_mask: np.ndarray, transform: rasterio.transform.Affine, 
                         crs: rasterio.crs.CRS) -> gpd.GeoDataFrame:
        """
        Generate polygon features from landslide mask
        
        Args:
            landslide_mask: Binary landslide mask
            transform: Geospatial transform
            crs: Coordinate reference system
            
        Returns:
            GeoDataFrame with landslide polygons
        """
        # Convert mask to polygons
        mask_uint8 = (landslide_mask * 255).astype(np.uint8)
        polygons = []
        
        for geom, value in shapes(mask_uint8, mask=mask_uint8, transform=transform):
            if value > 0:  # Only landslide areas
                polygons.append({
                    'geometry': shape(geom),
                    'landslide_id': len(polygons) + 1,
                    'area_m2': shape(geom).area,
                    'confidence': 1.0  # Physics-based detection confidence
                })
        
        if not polygons:
            logger.warning("No landslide polygons generated")
            return gpd.GeoDataFrame(columns=['geometry', 'landslide_id', 'area_m2', 'confidence'])
        
        gdf = gpd.GeoDataFrame(polygons, crs=crs)
        
        # Calculate additional attributes
        gdf['area_km2'] = gdf['area_m2'] / 1e6
        gdf['perimeter_m'] = gdf.geometry.boundary.length
        gdf['compactness'] = 4 * np.pi * gdf['area_m2'] / (gdf['perimeter_m'] ** 2)
        
        logger.info(f"Generated {len(gdf)} landslide polygons")
        
        return gdf

def create_physics_based_config() -> Dict:
    """
    Create default configuration for physics-based detection
    
    Returns:
        Configuration dictionary
    """
    return {
        # Physical criteria thresholds
        'critical_slope': 30.0,  # degrees
        'min_depth_change': 5.0,  # meters
        'max_depth_change': 100.0,  # meters
        'min_width': 20.0,  # meters
        'max_width': 500.0,  # meters
        'min_roughness': 0.1,  # relative units
        'max_roughness': 2.0,  # relative units
        
        # Detection weights
        'slope_weight': 0.4,
        'depth_weight': 0.3,
        'width_weight': 0.2,
        'roughness_weight': 0.1,
        
        # Detection threshold
        'detection_threshold': 0.6
    }

if __name__ == "__main__":
    # Example usage
    config = create_physics_based_config()
    detector = PhysicsBasedLandslideDetector(config)
    
    # Example data paths (adjust based on your data structure)
    data_paths = {
        'slope': 'data/working/features/slope.tif',
        'dtm': 'data/working/features/dtm.tif',
        'roughness': 'data/working/features/roughness.tif'
    }
    
    # Load terrain data
    terrain_data = detector.load_terrain_data(data_paths)
    
    # Detect landslides
    results = detector.detect_landslides(terrain_data)
    
    # Save results
    detector.save_results(results, 'outputs/physics_based_detection', 
                         terrain_data['slope_transform'], terrain_data['slope_crs'])
    
    # Generate polygons
    polygons = detector.generate_polygons(results['landslide_mask'], 
                                        terrain_data['slope_transform'], 
                                        terrain_data['slope_crs'])
    
    # Save polygons
    polygons.to_file('outputs/physics_based_detection/landslide_polygons.geojson', driver='GeoJSON')
    
    print("Physics-based landslide detection completed!")
