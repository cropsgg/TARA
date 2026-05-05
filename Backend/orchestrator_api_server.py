#!/usr/bin/env python3
"""
FastAPI Server for Lunar Rover Orchestrator
Exposes orchestrator functionality via REST API for frontend integration
"""

import os
import sys
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Optional, Any
import logging
from datetime import datetime

# Add current directory to path for imports
sys.path.append(str(Path(__file__).parent))

# FastAPI imports
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel

# Import our orchestrator system
from lunar_rover_orchestrator import LunarRoverOrchestrator
from integrated_pathfinding_system import IntegratedPathfindingSystem

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Lunar Rover Orchestrator API",
    description="API for lunar rover pathfinding and mission management",
    version="1.0.0"
)

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:8081", "http://127.0.0.1:8080", "http://127.0.0.1:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global orchestrator instance
orchestrator: Optional[LunarRoverOrchestrator] = None
integrated_system: Optional[IntegratedPathfindingSystem] = None

# Pydantic models for API
class MissionRequest(BaseModel):
    name: str
    image_path: str
    csv_path: str
    start_lon: float
    start_lat: float
    end_lon: float
    end_lat: float

class MissionResponse(BaseModel):
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class StatusResponse(BaseModel):
    success: bool
    status: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class ObservationsResponse(BaseModel):
    success: bool
    observations: Optional[List[str]] = None
    error: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    """Initialize the orchestrator systems on startup"""
    global orchestrator, integrated_system
    
    try:
        logger.info("🚀 Initializing Lunar Rover Orchestrator API...")
        
        # Initialize orchestrator
        power_csv_path = "synthetic_rover_power_nomode.csv"
        orchestrator = LunarRoverOrchestrator(power_csv_path)
        
        # Initialize integrated system
        integrated_system = IntegratedPathfindingSystem()
        
        logger.info("✅ Orchestrator systems initialized successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize orchestrator: {e}")
        raise

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Lunar Rover Orchestrator API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "status": "/api/status",
            "observations": "/api/observations",
            "run_mission": "/api/run_mission",
            "run_integrated_mission": "/api/run_integrated_mission"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/status", response_model=StatusResponse)
async def get_status():
    """Get orchestrator status and statistics"""
    try:
        if orchestrator is None:
            raise HTTPException(status_code=500, detail="Orchestrator not initialized")
        
        # Get system statistics
        stats = orchestrator.stats
        
        # Get available observations
        available_observations = []
        if integrated_system:
            try:
                available_observations = integrated_system.data_loader.get_available_observations()
            except:
                available_observations = []
        
        # Get current battery status
        battery_status = {
            "battery_percent": 75.0,
            "solar_input_wm2": 300.0,
            "power_consumption_w": 150.0,
            "can_run_ml": True,
            "reason": "System operational",
            "power_efficiency_score": 0.8
        }
        
        status = {
            "is_running": True,
            "current_mission": None,  # Could track active missions
            "system_stats": stats,
            "available_observations": available_observations,
            "battery_status": battery_status
        }
        
        return StatusResponse(success=True, status=status)
        
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        return StatusResponse(success=False, error=str(e))

@app.get("/api/observations", response_model=ObservationsResponse)
async def get_observations():
    """Get available Chandrayaan-2 observations"""
    try:
        if integrated_system is None:
            raise HTTPException(status_code=500, detail="Integrated system not initialized")
        
        observations = integrated_system.data_loader.get_available_observations()
        return ObservationsResponse(success=True, observations=observations)
        
    except Exception as e:
        logger.error(f"Error getting observations: {e}")
        return ObservationsResponse(success=False, error=str(e))

@app.post("/api/run_mission", response_model=MissionResponse)
async def run_mission(mission: MissionRequest, background_tasks: BackgroundTasks):
    """Run a single mission using the orchestrator"""
    try:
        if orchestrator is None:
            raise HTTPException(status_code=500, detail="Orchestrator not initialized")
        
        logger.info(f"🎯 Running mission: {mission.name}")
        
        # Run the mission
        result = orchestrator.run_mission(
            image_path=mission.image_path,
            csv_path=mission.csv_path,
            start_lon=mission.start_lon,
            start_lat=mission.start_lat,
            end_lon=mission.end_lon,
            end_lat=mission.end_lat,
            mission_name=mission.name
        )
        
        # Convert result to JSON-serializable format
        serializable_result = {
            "mission_name": result.get("mission_name", mission.name),
            "model_type": result.get("model_type", "Unknown"),
            "battery_status": result.get("battery_status", {}),
            "processing_time": float(result.get("processing_time", 0)),
            "path_status": result.get("path_status", "Unknown"),
            "timestamp": result.get("timestamp", datetime.now().isoformat()),
            "statistics": result.get("results", {}).get("statistics", {}),
            "obstacles": [],
            "path_points": []
        }
        
        # Add obstacles if available
        if "results" in result and "obstacles" in result["results"]:
            obstacles = result["results"]["obstacles"]
            serializable_result["obstacles"] = [
                {
                    "lon": getattr(obs, 'lon', 0), 
                    "lat": getattr(obs, 'lat', 0), 
                    "x": getattr(obs, 'x', 0), 
                    "y": getattr(obs, 'y', 0),
                    "obstacle_type": getattr(obs, 'obstacle_type', 'unknown'), 
                    "confidence": getattr(obs, 'confidence', 0),
                    "risk_level": getattr(obs, 'risk_level', 0), 
                    "size": getattr(obs, 'size', 0)
                } for obs in obstacles
            ]
        
        # Add path points if available
        if "results" in result and "path_points" in result["results"]:
            path_points = result["results"]["path_points"]
            serializable_result["path_points"] = [
                {
                    "lon": getattr(point, 'lon', 0), 
                    "lat": getattr(point, 'lat', 0), 
                    "x": getattr(point, 'x', 0), 
                    "y": getattr(point, 'y', 0),
                    "elevation": getattr(point, 'elevation', 0), 
                    "slope": getattr(point, 'slope', 0),
                    "risk_score": getattr(point, 'risk_score', 0), 
                    "is_safe": getattr(point, 'is_safe', False),
                    "distance_from_start": getattr(point, 'distance_from_start', 0)
                } for point in path_points
            ]
        
        # Save folium map if available
        if "results" in result and "folium_map" in result["results"]:
            map_path = f"mission_results/{mission.name.replace(' ', '_').lower()}_map.html"
            try:
                result["results"]["folium_map"].save(map_path)
                serializable_result["folium_map_html"] = map_path
            except Exception as e:
                logger.warning(f"Failed to save folium map: {e}")
        
        logger.info(f"✅ Mission completed: {mission.name}")
        return MissionResponse(success=True, result=serializable_result)
        
    except Exception as e:
        logger.error(f"Error running mission: {e}")
        return MissionResponse(success=False, error=str(e))

@app.post("/api/run_integrated_mission", response_model=MissionResponse)
async def run_integrated_mission(mission: MissionRequest, background_tasks: BackgroundTasks):
    """Run a mission using the integrated pathfinding system"""
    try:
        if integrated_system is None:
            raise HTTPException(status_code=500, detail="Integrated system not initialized")
        
        logger.info(f"🎯 Running integrated mission: {mission.name}")
        
        # Use the first available observation if not specified
        observations = integrated_system.data_loader.get_available_observations()
        if not observations:
            raise HTTPException(status_code=400, detail="No observations available")
        
        obs_id = observations[0]  # Use first observation
        
        # Run integrated pathfinding
        result = integrated_system.process_complete_pathfinding(
            obs_id=obs_id,
            start_lon=mission.start_lon,
            start_lat=mission.start_lat,
            end_lon=mission.end_lon,
            end_lat=mission.end_lat
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        # Convert result to API format
        serializable_result = {
            "mission_name": mission.name,
            "model_type": "Integrated",
            "battery_status": {
                "battery_percent": 75.0,  # Default values for integrated system
                "solar_input_wm2": 300.0,
                "power_consumption_w": 150.0,
                "can_run_ml": True,
                "reason": "Integrated system",
                "power_efficiency_score": 0.8
            },
            "processing_time": 0.0,  # Would need to track this
            "path_status": "✅ SUCCESS" if result["statistics"]["path_found"] else "❌ FAILED",
            "timestamp": datetime.now().isoformat(),
            "statistics": result["statistics"],
            "obstacles": [
                {
                    "lon": getattr(obs, 'lon', 0), 
                    "lat": getattr(obs, 'lat', 0), 
                    "x": getattr(obs, 'x', 0), 
                    "y": getattr(obs, 'y', 0),
                    "obstacle_type": getattr(obs, 'obstacle_type', 'unknown'), 
                    "confidence": getattr(obs, 'confidence', 0),
                    "risk_level": getattr(obs, 'risk_level', 0), 
                    "size": getattr(obs, 'size', 0)
                } for obs in result["obstacles"]
            ],
            "path_points": [
                {
                    "lon": getattr(point, 'lon', 0), 
                    "lat": getattr(point, 'lat', 0), 
                    "x": getattr(point, 'x', 0), 
                    "y": getattr(point, 'y', 0),
                    "elevation": getattr(point, 'elevation', 0), 
                    "slope": getattr(point, 'slope', 0),
                    "risk_score": getattr(point, 'risk_score', 0), 
                    "is_safe": getattr(point, 'is_safe', False),
                    "distance_from_start": getattr(point, 'distance_from_start', 0)
                } for point in result["path_points"]
            ]
        }
        
        # Save folium map
        map_path = f"mission_results/{mission.name.replace(' ', '_').lower()}_integrated_map.html"
        try:
            result["folium_map"].save(map_path)
            serializable_result["folium_map_html"] = map_path
        except Exception as e:
            logger.warning(f"Failed to save folium map: {e}")
        
        logger.info(f"✅ Integrated mission completed: {mission.name}")
        return MissionResponse(success=True, result=serializable_result)
        
    except Exception as e:
        logger.error(f"Error running integrated mission: {e}")
        return MissionResponse(success=False, error=str(e))

@app.get("/api/mission_results/{filename}")
async def get_mission_result(filename: str):
    """Serve mission result files (HTML maps, etc.)"""
    file_path = Path("mission_results") / filename
    if file_path.exists():
        return FileResponse(file_path)
    else:
        raise HTTPException(status_code=404, detail="File not found")

@app.get("/api/system_stats")
async def get_system_stats():
    """Get detailed system statistics"""
    try:
        if orchestrator is None:
            raise HTTPException(status_code=500, detail="Orchestrator not initialized")
        
        stats = orchestrator.stats
        
        # Calculate percentages
        total_missions = stats["total_missions"]
        ml_percentage = (stats["ml_missions"] / total_missions * 100) if total_missions > 0 else 0
        heuristic_percentage = (stats["heuristic_missions"] / total_missions * 100) if total_missions > 0 else 0
        success_percentage = (stats["successful_paths"] / total_missions * 100) if total_missions > 0 else 0
        
        return {
            "success": True,
            "stats": {
                **stats,
                "ml_percentage": ml_percentage,
                "heuristic_percentage": heuristic_percentage,
                "success_percentage": success_percentage,
                "average_processing_time": stats["total_processing_time"] / total_missions if total_missions > 0 else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        return {"success": False, "error": str(e)}

@app.get("/status")
async def get_status_simple():
    """Simple status endpoint for health checks"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "orchestrator_initialized": orchestrator is not None,
        "integrated_system_initialized": integrated_system is not None
    }

@app.get("/observations")
async def get_observations_simple():
    """Simple observations endpoint"""
    try:
        if integrated_system is None:
            return {"observations": []}
        
        observations = integrated_system.data_loader.get_available_observations()
        return {"observations": observations}
        
    except Exception as e:
        logger.error(f"Error getting observations: {e}")
        return {"observations": []}

if __name__ == "__main__":
    import uvicorn
    
    # Create mission_results directory
    Path("mission_results").mkdir(exist_ok=True)
    
    # Run the server
    uvicorn.run(
        "orchestrator_api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
