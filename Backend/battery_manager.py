#!/usr/bin/env python3
"""
Battery Management System for Lunar Rover
Manages power levels and determines when ML processing can be used
"""

import pandas as pd
import numpy as np
import random
from pathlib import Path
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)

class BatteryManager:
    """Manages rover battery status and power consumption decisions"""
    
    def __init__(self, power_csv_path: str):
        """Initialize battery manager with power data"""
        self.power_data = self._load_power_data(power_csv_path)
        self.current_battery = 100.0  # Start with full battery
        
    def _load_power_data(self, csv_path: str) -> pd.DataFrame:
        """Load power consumption data from CSV"""
        try:
            if csv_path and Path(csv_path).exists():
                return pd.read_csv(csv_path)
            else:
                # Create synthetic power data if file doesn't exist
                logger.warning(f"Power data file not found: {csv_path}. Using synthetic data.")
                return self._create_synthetic_power_data()
        except Exception as e:
            logger.warning(f"Error loading power data: {e}. Using synthetic data.")
            return self._create_synthetic_power_data()
    
    def _create_synthetic_power_data(self) -> pd.DataFrame:
        """Create synthetic power consumption data"""
        data = {
            'timestamp': pd.date_range('2024-01-01', periods=1000, freq='1min'),
            'battery_percent': np.random.uniform(20, 100, 1000),
            'solar_input_wm2': np.random.uniform(200, 400, 1000),
            'power_consumption_w': np.random.uniform(50, 200, 1000),
            'temperature_c': np.random.uniform(-50, 50, 1000)
        }
        return pd.DataFrame(data)
    
    def get_random_battery_status(self) -> Dict:
        """Get a random battery status for simulation"""
        # Simulate realistic battery behavior
        battery_percent = max(20, min(100, self.current_battery + random.uniform(-5, 2)))
        self.current_battery = battery_percent
        
        solar_input = random.uniform(200, 400)  # W/m²
        power_consumption = random.uniform(50, 200)  # W
        
        # Calculate power efficiency score
        power_efficiency = min(1.0, (solar_input / 300) * (battery_percent / 100))
        
        return {
            'battery_percent': battery_percent,
            'solar_input_wm2': solar_input,
            'power_consumption_w': power_consumption,
            'power_efficiency_score': power_efficiency,
            'temperature_c': random.uniform(-50, 50)
        }
    
    def can_run_ml_processing(self, battery_status: Dict) -> Tuple[bool, str]:
        """Determine if ML processing can be run based on battery status"""
        battery_percent = battery_status['battery_percent']
        power_efficiency = battery_status['power_efficiency_score']
        
        # ML processing requires higher battery and good power efficiency
        if battery_percent < 30:
            return False, "Battery too low for ML processing"
        elif power_efficiency < 0.6:
            return False, "Power efficiency too low for ML processing"
        elif battery_percent < 50 and power_efficiency < 0.8:
            return False, "Insufficient power for ML processing"
        else:
            return True, "ML processing available"
    
    def log_battery_status(self, battery_status: Dict, ml_decision: Tuple[bool, str]) -> Dict:
        """Log and format battery status information"""
        can_run_ml, reason = ml_decision
        
        status = {
            'battery_percent': battery_status['battery_percent'],
            'solar_input_wm2': battery_status['solar_input_wm2'],
            'power_consumption_w': battery_status['power_consumption_w'],
            'can_run_ml': can_run_ml,
            'reason': reason,
            'power_efficiency_score': battery_status['power_efficiency_score']
        }
        
        logger.info(f"🔋 Battery: {battery_status['battery_percent']:.1f}% | "
                   f"Solar: {battery_status['solar_input_wm2']:.1f} W/m² | "
                   f"Power: {battery_status['power_consumption_w']:.1f} W | "
                   f"ML: {'✅' if can_run_ml else '❌'} ({reason})")
        
        return status
    
    def update_battery_after_mission(self, mission_type: str, processing_time: float):
        """Update battery level after a mission"""
        if mission_type == "ML":
            # ML missions consume more power
            power_consumed = processing_time * 0.5  # 0.5% per second
        else:
            # Heuristic missions consume less power
            power_consumed = processing_time * 0.1  # 0.1% per second
        
        self.current_battery = max(20, self.current_battery - power_consumed)
        logger.info(f"🔋 Battery updated: {self.current_battery:.1f}% (consumed {power_consumed:.2f}%)")
