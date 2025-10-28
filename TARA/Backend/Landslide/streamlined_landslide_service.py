"""
Streamlined T.A.R.A. Landslide Detection Service
Uses Chandrayaan-2 satellite data for physics-based landslide detection and path planning
"""

import os
import sys
import yaml
import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, Dict, List, Tuple
import uvicorn
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

from data.chandrayaan_loader import ChandrayaanDataLoader
from detect.physics_based_detector import PhysicsBasedDetector
from planning.lunar_path_planner import LunarPathPlanner
from coordinate_utils.selenographic_converter import SelenographicConverter


class StreamlinedLandslideService:
    """Streamlined service for landslide detection using Chandrayaan-2 data"""
    
    def __init__(self, config_path: str = "configs/physics_based.yaml"):
        """Initialize the streamlined service"""
        self.config = self._load_config(config_path)
        self.detector = PhysicsBasedDetector(self.config)
        self.path_planner = LunarPathPlanner(self.config)
        self.coord_converter = SelenographicConverter()
        self.data_loader = ChandrayaanDataLoader()
        
        print("Streamlined T.A.R.A. Service initialized")
        print(f"Available Chandrayaan-2 observations: {len(self.data_loader.get_available_observations())}")
    
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from YAML file"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"Error loading config: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            'critical_slope': 30.0,
            'min_depth_change': 5.0,
            'max_depth_change': 100.0,
            'min_width': 20.0,
            'max_width': 500.0,
            'roughness_threshold_percentile': 75.0,
            'vulnerable_aspect_ranges': [[0, 45], [135, 225]],
            'detection_weights': {
                'slope': 0.3,
                'depth_change': 0.25,
                'width': 0.2,
                'roughness': 0.15,
                'aspect': 0.1
            },
            'detection_threshold': 0.6
        }
    
    def process_user_image(self, image_file: UploadFile) -> np.ndarray:
        """Process uploaded user image"""
        try:
            # Read image data
            image_data = image_file.file.read()
            
            # Convert to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise HTTPException(status_code=400, detail="Invalid image format")
            
            # Convert BGR to RGB
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            return image
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")
    
    def find_best_chandrayaan_observation(self, start_lon: float, start_lat: float, 
                                        end_lon: float, end_lat: float) -> Optional[str]:
        """Find the best Chandrayaan-2 observation for the given coordinates"""
        # Calculate region bounds with some buffer
        buffer = 0.1  # degrees
        min_lon = min(start_lon, end_lon) - buffer
        max_lon = max(start_lon, end_lon) + buffer
        min_lat = min(start_lat, end_lat) - buffer
        max_lat = max(start_lat, end_lat) + buffer
        
        # Find observations in the region
        matching_obs = self.data_loader.find_observations_in_region(
            min_lon, max_lon, min_lat, max_lat
        )
        
        if not matching_obs:
            return None
        
        # For now, return the first matching observation
        # In a more sophisticated system, we could rank by coverage, quality, etc.
        return matching_obs[0]
    
    def detect_landslides_and_plan_path(self, image: np.ndarray, start_lon: float, 
                                      start_lat: float, end_lon: float, end_lat: float) -> Dict:
        """Main function to detect landslides and plan path"""
        try:
            # Find best Chandrayaan-2 observation
            obs_id = self.find_best_chandrayaan_observation(start_lon, start_lat, end_lon, end_lat)
            
            if obs_id is None:
                return {
                    "status": "warning",
                    "message": "No Chandrayaan-2 data available for the specified region",
                    "detection_results": None,
                    "path_planning": None,
                    "chandrayaan_observation": None
                }
            
            # Load Chandrayaan-2 data
            chandrayaan_image = self.data_loader.load_observation_image(obs_id)
            coordinate_data = self.data_loader.load_coordinate_data(obs_id)
            metadata = self.data_loader.get_observation_metadata(obs_id)
            
            if chandrayaan_image is None or coordinate_data is None:
                return {
                    "status": "error",
                    "message": "Failed to load Chandrayaan-2 data",
                    "detection_results": None,
                    "path_planning": None,
                    "chandrayaan_observation": obs_id
                }
            
            # Perform physics-based landslide detection
            detection_results = self.detector.detect_landslides(chandrayaan_image)
            
            # Plan optimal path
            path_results = self.path_planner.plan_optimal_path(
                chandrayaan_image,
                detection_results['landslide_mask'],
                start_lon, start_lat, end_lon, end_lat
            )
            
            return {
                "status": "success",
                "message": "Landslide detection and path planning completed",
                "detection_results": {
                    "landslide_score": float(detection_results['landslide_score']),
                    "high_risk_pixels": int(detection_results['high_risk_pixels']),
                    "total_pixels": int(detection_results['total_pixels']),
                    "risk_percentage": float(detection_results['risk_percentage'])
                },
                "path_planning": {
                    "path_found": path_results['path_found'],
                    "path_length": float(path_results['path_length']) if path_results['path_found'] else None,
                    "path_coordinates": path_results['path_coordinates'] if path_results['path_found'] else None,
                    "risk_avoidance": path_results['risk_avoidance']
                },
                "chandrayaan_observation": {
                    "observation_id": obs_id,
                    "metadata": metadata,
                    "coordinate_bounds": self.data_loader.get_coordinate_bounds(obs_id),
                    "coordinate_data_points": len(coordinate_data)
                }
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error in detection and path planning: {str(e)}",
                "detection_results": None,
                "path_planning": None,
                "chandrayaan_observation": None
            }


# Initialize FastAPI app
app = FastAPI(
    title="T.A.R.A. Streamlined Landslide Detection",
    description="Physics-based landslide detection using Chandrayaan-2 satellite data",
    version="2.0.0"
)

# Initialize service
service = StreamlinedLandslideService()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "T.A.R.A. Streamlined Landslide Detection",
        "version": "2.0.0",
        "status": "operational",
        "chandrayaan_observations": len(service.data_loader.get_available_observations())
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "T.A.R.A. Streamlined",
        "chandrayaan_data_available": len(service.data_loader.get_available_observations()) > 0
    }


@app.get("/observations")
async def list_observations():
    """List available Chandrayaan-2 observations"""
    observations = service.data_loader.get_available_observations()
    return {
        "total_observations": len(observations),
        "observations": observations[:10]  # Return first 10 for brevity
    }


@app.post("/detect-and-plan")
async def detect_and_plan_path(
    image: UploadFile = File(..., description="Terrain image (PNG, JPG, TIFF)"),
    start_longitude: float = Form(..., description="Start longitude (Selenographic)"),
    start_latitude: float = Form(..., description="Start latitude (Selenographic)"),
    end_longitude: float = Form(..., description="End longitude (Selenographic)"),
    end_latitude: float = Form(..., description="End latitude (Selenographic)")
):
    """
    Detect landslides and plan optimal path using Chandrayaan-2 data
    
    Args:
        image: Terrain image file
        start_longitude: Start longitude in Selenographic coordinates
        start_latitude: Start latitude in Selenographic coordinates  
        end_longitude: End longitude in Selenographic coordinates
        end_latitude: End latitude in Selenographic coordinates
    
    Returns:
        Detection results and optimal path
    """
    try:
        # Validate coordinates
        if not (-180 <= start_longitude <= 180) or not (-180 <= end_longitude <= 180):
            raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180 degrees")
        
        if not (-90 <= start_latitude <= 90) or not (-90 <= end_latitude <= 90):
            raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90 degrees")
        
        # Process uploaded image
        processed_image = service.process_user_image(image)
        
        # Perform detection and path planning
        results = service.detect_landslides_and_plan_path(
            processed_image,
            start_longitude, start_latitude,
            end_longitude, end_latitude
        )
        
        return JSONResponse(content=results)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/observation/{obs_id}")
async def get_observation_details(obs_id: str):
    """Get details about a specific Chandrayaan-2 observation"""
    if obs_id not in service.data_loader.get_available_observations():
        raise HTTPException(status_code=404, detail="Observation not found")
    
    metadata = service.data_loader.get_observation_metadata(obs_id)
    bounds = service.data_loader.get_coordinate_bounds(obs_id)
    
    return {
        "observation_id": obs_id,
        "metadata": metadata,
        "coordinate_bounds": bounds,
        "files_available": {
            "image": service.data_loader.observations[obs_id].get('img_file') is not None,
            "browse": service.data_loader.observations[obs_id].get('browse_png') is not None,
            "coordinates": service.data_loader.observations[obs_id].get('csv_file') is not None
        }
    }


if __name__ == "__main__":
    print("Starting T.A.R.A. Streamlined Landslide Detection Service...")
    print("Using Chandrayaan-2 satellite data for physics-based detection")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
