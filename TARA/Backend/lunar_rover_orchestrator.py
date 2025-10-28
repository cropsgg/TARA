#!/usr/bin/env python3
"""
Lunar Rover Orchestration System
Manages battery levels and switches between ML and heuristic models for pathfinding
"""

import sys
import time
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import pandas as pd
import numpy as np

# Import our systems
from battery_manager import BatteryManager
from heuristic_detector import HeuristicPathfindingSystem
from efficient_pathfinding_system import EfficientPathfindingSystem, format_selenographic_coords

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class LunarRoverOrchestrator:
    """Main orchestration system for lunar rover pathfinding"""
    
    def __init__(self, power_csv_path: str):
        """Initialize the orchestration system"""
        self.battery_manager = BatteryManager(power_csv_path)
        self.ml_system = EfficientPathfindingSystem()
        self.heuristic_system = HeuristicPathfindingSystem()
        
        # Statistics tracking
        self.stats = {
            'total_missions': 0,
            'ml_missions': 0,
            'heuristic_missions': 0,
            'successful_paths': 0,
            'failed_paths': 0,
            'total_processing_time': 0.0,
            'total_power_saved': 0.0
        }
        
        logger.info("🚀 Lunar Rover Orchestration System initialized")
    
    def run_mission(self, image_path: str, csv_path: str, start_lon: float, start_lat: float, 
                   end_lon: float, end_lat: float, mission_name: str = "Mission") -> Dict:
        """Run a complete pathfinding mission with battery-aware model selection"""
        
        logger.info("=" * 60)
        logger.info(f"🎯 STARTING {mission_name.upper()}")
        logger.info("=" * 60)
        
        start_time = time.time()
        self.stats['total_missions'] += 1
        
        # Step 1: Check battery status
        battery_status = self.battery_manager.get_random_battery_status()
        can_run_ml, reason = self.battery_manager.can_run_ml_processing(battery_status)
        battery_report = self.battery_manager.log_battery_status(battery_status, (can_run_ml, reason))
        
        # Step 2: Select processing model
        if can_run_ml:
            logger.info("🧠 Using ML-based pathfinding system")
            self.stats['ml_missions'] += 1
            results = self._run_ml_pathfinding(image_path, csv_path, start_lon, start_lat, end_lon, end_lat)
            model_type = "ML"
        else:
            logger.info("⚡ Using heuristic fallback system (low power mode)")
            self.stats['heuristic_missions'] += 1
            results = self._run_heuristic_pathfinding(image_path, csv_path, start_lon, start_lat, end_lon, end_lat)
            model_type = "Heuristic"
        
        # Step 3: Calculate mission statistics
        processing_time = time.time() - start_time
        self.stats['total_processing_time'] += processing_time
        
        if results.get('statistics', {}).get('path_found', False):
            self.stats['successful_paths'] += 1
            path_status = "✅ SUCCESS"
        else:
            self.stats['failed_paths'] += 1
            path_status = "❌ FAILED"
        
        # Step 4: Calculate power savings
        if not can_run_ml:
            # Estimate power saved by using heuristic instead of ML
            ml_power_estimate = 200  # Watts
            heuristic_power_estimate = 50  # Watts
            power_saved = (ml_power_estimate - heuristic_power_estimate) * processing_time / 3600  # kWh
            self.stats['total_power_saved'] += power_saved
        
        # Step 5: Generate mission report
        mission_report = {
            'mission_name': mission_name,
            'model_type': model_type,
            'battery_status': battery_report,
            'processing_time': processing_time,
            'path_status': path_status,
            'results': results,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Step 6: Log mission summary
        self._log_mission_summary(mission_report)
        
        return mission_report
    
    def _run_ml_pathfinding(self, image_path: str, csv_path: str, start_lon: float, start_lat: float, 
                           end_lon: float, end_lat: float) -> Dict:
        """Run ML-based pathfinding"""
        logger.info("🧠 Executing ML-based obstacle detection and pathfinding...")
        
        try:
            results = self.ml_system.process_pathfinding(
                image_path, csv_path, start_lon, start_lat, end_lon, end_lat
            )
            
            if results.get('statistics', {}).get('path_found', False):
                logger.info("✅ ML pathfinding successful")
            else:
                logger.warning("⚠️ ML pathfinding failed to find a path")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ ML pathfinding error: {e}")
            return {'error': str(e), 'statistics': {'path_found': False}}
    
    def _run_heuristic_pathfinding(self, image_path: str, csv_path: str, start_lon: float, start_lat: float, 
                                  end_lon: float, end_lat: float) -> Dict:
        """Run heuristic-based pathfinding"""
        logger.info("⚡ Executing heuristic obstacle detection and pathfinding...")
        
        try:
            # Load image and coordinates
            import cv2
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image: {image_path}")
            
            coordinates = pd.read_csv(csv_path)
            
            # Convert start/end coordinates to image coordinates
            start_x, start_y = self.ml_system._selenographic_to_image(start_lon, start_lat, coordinates, image.shape[:2])
            end_x, end_y = self.ml_system._selenographic_to_image(end_lon, end_lat, coordinates, image.shape[:2])
            
            if start_x is None or start_y is None or end_x is None or end_y is None:
                raise ValueError("Could not convert coordinates to image coordinates")
            
            # Detect obstacles using heuristic methods
            obstacles = self.heuristic_system.detect_obstacles(image, start_x, start_y, end_x, end_y)
            
            # Convert to Selenographic coordinates
            converted_obstacles = self.heuristic_system.convert_to_selenographic(obstacles, coordinates, image.shape[:2])
            
            # Create obstacle points for pathfinding
            from efficient_pathfinding_system import ObstaclePoint
            obstacle_points = []
            for obs in converted_obstacles:
                obstacle_point = ObstaclePoint(
                    lon=obs['lon'], lat=obs['lat'], x=obs['x'], y=obs['y'],
                    obstacle_type=obs['obstacle_type'],
                    confidence=obs['confidence'],
                    risk_level=obs['confidence'],
                    size=obs['size']
                )
                obstacle_points.append(obstacle_point)
            
            # Find path using the ML system's pathfinding algorithm
            path_points = self.ml_system.find_optimal_path(
                start_lon, start_lat, end_lon, end_lat, 
                obstacle_points, coordinates, image.shape[:2]
            )
            
            # Generate statistics
            path_found = len(path_points) > 0
            path_length = 0.0
            if path_found:
                for i in range(1, len(path_points)):
                    # Calculate distance using simple Euclidean distance
                    dx = path_points[i].lon - path_points[i-1].lon
                    dy = path_points[i].lat - path_points[i-1].lat
                    path_length += np.sqrt(dx*dx + dy*dy) * 111.32  # Convert to km (rough approximation)
            
            # Create visualization
            folium_map = self.ml_system.create_folium_visualization(
                obstacle_points, path_points, start_lon, start_lat, end_lon, end_lat,
                "heuristic_mission", image_path, coordinates
            )
            
            # Count obstacles by type
            boulder_count = sum(1 for obs in converted_obstacles if obs['obstacle_type'] == 'boulder')
            landslide_count = sum(1 for obs in converted_obstacles if obs['obstacle_type'] == 'landslide')
            
            results = {
                'statistics': {
                    'path_found': path_found,
                    'path_length_km': path_length,
                    'safety_percentage': 100.0 if path_found else 0.0,
                    'total_obstacles': len(converted_obstacles),
                    'boulders': boulder_count,
                    'landslides': landslide_count
                },
                'path_points': path_points,
                'obstacles': converted_obstacles,
                'folium_map': folium_map,
                'model_type': 'heuristic'
            }
            
            if path_found:
                logger.info("✅ Heuristic pathfinding successful")
            else:
                logger.warning("⚠️ Heuristic pathfinding failed to find a path")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Heuristic pathfinding error: {e}")
            return {'error': str(e), 'statistics': {'path_found': False}}
    
    def _log_mission_summary(self, mission_report: Dict):
        """Log mission summary"""
        logger.info("=" * 60)
        logger.info("📊 MISSION SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Mission: {mission_report['mission_name']}")
        logger.info(f"Model: {mission_report['model_type']}")
        logger.info(f"Status: {mission_report['path_status']}")
        logger.info(f"Processing Time: {mission_report['processing_time']:.2f} seconds")
        
        if 'results' in mission_report and 'statistics' in mission_report['results']:
            stats = mission_report['results']['statistics']
            logger.info(f"Path Length: {stats.get('path_length_km', 0):.3f} km")
            logger.info(f"Obstacles: {stats.get('total_obstacles', 0)} total")
            logger.info(f"  - Boulders: {stats.get('boulders', 0)}")
            logger.info(f"  - Landslides: {stats.get('landslides', 0)}")
        
        logger.info("=" * 60)
    
    def run_multiple_missions(self, missions: List[Dict]) -> List[Dict]:
        """Run multiple missions and return results"""
        results = []
        
        logger.info(f"🚀 Starting {len(missions)} missions...")
        
        for i, mission in enumerate(missions, 1):
            mission_name = mission.get('name', f'Mission_{i}')
            
            result = self.run_mission(
                mission['image_path'],
                mission['csv_path'],
                mission['start_lon'],
                mission['start_lat'],
                mission['end_lon'],
                mission['end_lat'],
                mission_name
            )
            
            results.append(result)
            
            # Save individual mission results
            self._save_mission_results(result, i)
        
        # Generate overall statistics
        self._log_overall_statistics()
        
        return results
    
    def _save_mission_results(self, mission_report: Dict, mission_number: int):
        """Save mission results to files"""
        output_dir = Path("mission_results")
        output_dir.mkdir(exist_ok=True)
        
        # Create unique filename with timestamp
        import time
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        mission_name_clean = mission_report['mission_name'].lower().replace(' ', '_').replace('-', '_')
        
        # Save HTML map first (this is the most important part)
        if 'results' in mission_report and 'folium_map' in mission_report['results']:
            map_path = output_dir / f"{timestamp}_{mission_name_clean}.html"
            try:
                mission_report['results']['folium_map'].save(str(map_path))
                logger.info(f"🗺️ Map saved: {map_path}")
            except Exception as e:
                logger.error(f"Failed to save HTML map: {e}")
        
        # Save JSON report (simplified to avoid serialization issues)
        import json
        json_path = output_dir / f"{timestamp}_{mission_name_clean}_report.json"
        
        try:
            # Create a simplified serializable version of the report
            serializable_report = {
                'mission_name': mission_report.get('mission_name', 'Unknown'),
                'model_type': mission_report.get('model_type', 'Unknown'),
                'processing_time': float(mission_report.get('processing_time', 0)),
                'path_status': mission_report.get('path_status', 'Unknown'),
                'timestamp': mission_report.get('timestamp', 'Unknown'),
                'battery_status': mission_report.get('battery_status', {}),
                'statistics': mission_report.get('results', {}).get('statistics', {})
            }
            
            with open(json_path, 'w') as f:
                json.dump(serializable_report, f, indent=2)
            
            logger.info(f"📄 Report saved: {json_path}")
            
        except Exception as e:
            logger.error(f"Failed to save JSON report: {e}")
            # Still log the mission completion even if JSON fails
            logger.info(f"Mission {mission_number} completed successfully (HTML saved)")
    
    def _log_overall_statistics(self):
        """Log overall system statistics"""
        logger.info("=" * 60)
        logger.info("📈 OVERALL SYSTEM STATISTICS")
        logger.info("=" * 60)
        logger.info(f"Total Missions: {self.stats['total_missions']}")
        logger.info(f"ML Missions: {self.stats['ml_missions']} ({self.stats['ml_missions']/self.stats['total_missions']*100:.1f}%)")
        logger.info(f"Heuristic Missions: {self.stats['heuristic_missions']} ({self.stats['heuristic_missions']/self.stats['total_missions']*100:.1f}%)")
        logger.info(f"Successful Paths: {self.stats['successful_paths']} ({self.stats['successful_paths']/self.stats['total_missions']*100:.1f}%)")
        logger.info(f"Failed Paths: {self.stats['failed_paths']} ({self.stats['failed_paths']/self.stats['total_missions']*100:.1f}%)")
        logger.info(f"Total Processing Time: {self.stats['total_processing_time']:.2f} seconds")
        logger.info(f"Average Processing Time: {self.stats['total_processing_time']/self.stats['total_missions']:.2f} seconds")
        logger.info(f"Total Power Saved: {self.stats['total_power_saved']:.3f} kWh")
        logger.info("=" * 60)

def main():
    """Main function to run the orchestration system"""
    
    # Initialize orchestrator
    power_csv_path = "synthetic_rover_power_nomode.csv"
    orchestrator = LunarRoverOrchestrator(power_csv_path)
    
    # Define test missions
    missions = [
        {
            'name': 'Short Range Mission',
            'image_path': 'chandrayaan-2/ch2_ohr_ncp_20210331T2033243734_b_brw_d18.png',
            'csv_path': 'chandrayaan-2/ch2_ohr_ncp_20210331T2033243734_g_grd_d18.csv',
            'start_lon': 41.406, 'start_lat': -19.694,
            'end_lon': 41.420, 'end_lat': -19.700
        },
        {
            'name': 'Medium Range Mission',
            'image_path': 'chandrayaan-2/ch2_ohr_ncp_20210331T2033243734_b_brw_d18.png',
            'csv_path': 'chandrayaan-2/ch2_ohr_ncp_20210331T2033243734_g_grd_d18.csv',
            'start_lon': 41.406, 'start_lat': -19.694,
            'end_lon': 41.450, 'end_lat': -19.720
        },
        {
            'name': 'Long Range Mission',
            'image_path': 'chandrayaan-2/ch2_ohr_ncp_20210331T2033243734_b_brw_d18.png',
            'csv_path': 'chandrayaan-2/ch2_ohr_ncp_20210331T2033243734_g_grd_d18.csv',
            'start_lon': 41.406, 'start_lat': -19.694,
            'end_lon': 41.500, 'end_lat': -19.750
        }
    ]
    
    # Run missions
    results = orchestrator.run_multiple_missions(missions)
    
    logger.info("🎉 All missions completed!")
    logger.info("Check the 'mission_results' folder for detailed results and visualizations.")

if __name__ == "__main__":
    main()
