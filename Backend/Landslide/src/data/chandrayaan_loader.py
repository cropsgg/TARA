"""
Chandrayaan-2 Data Loader
Handles loading of Chandrayaan-2 satellite images and coordinate data
"""

import os
import pandas as pd
import numpy as np
import cv2
from typing import Dict, List, Tuple, Optional
import xml.etree.ElementTree as ET
from pathlib import Path


class ChandrayaanDataLoader:
    """Loader for Chandrayaan-2 satellite data"""
    
    def __init__(self, data_dir: str = "../chandrayaan-2"):
        """
        Initialize the Chandrayaan-2 data loader
        
        Args:
            data_dir: Path to the Chandrayaan-2 data directory
        """
        self.data_dir = Path(data_dir)
        self.observations = self._discover_observations()
    
    def _discover_observations(self) -> Dict[str, Dict]:
        """Discover all available Chandrayaan-2 observations"""
        observations = {}
        
        if not self.data_dir.exists():
            print(f"Warning: Chandrayaan-2 data directory not found: {self.data_dir}")
            return observations
        
        # Find all observation directories/files
        for file_path in self.data_dir.glob("*.img"):
            # Extract observation ID from filename
            # Format: ch2_ohr_ncp_20240425T1603031918_d_img_d18.img
            filename = file_path.stem
            parts = filename.split('_')
            if len(parts) >= 4:
                obs_id = '_'.join(parts[:4])  # ch2_ohr_ncp_20240425T1603031918
                
                if obs_id not in observations:
                    observations[obs_id] = {}
                
                # Store file paths
                observations[obs_id]['img_file'] = file_path
                observations[obs_id]['img_xml'] = file_path.with_suffix('.xml')
                observations[obs_id]['browse_png'] = file_path.with_suffix('.png')
                browse_xml_path = file_path.with_suffix('.xml')
                observations[obs_id]['browse_xml'] = browse_xml_path.parent / browse_xml_path.name.replace('_d_img_', '_b_brw_')
                
                # Look for corresponding CSV file
                csv_pattern = f"{obs_id}_g_grd_*.csv"
                csv_files = list(self.data_dir.glob(csv_pattern))
                if csv_files:
                    observations[obs_id]['csv_file'] = csv_files[0]
                    observations[obs_id]['csv_xml'] = csv_files[0].with_suffix('.xml')
        
        print(f"Discovered {len(observations)} Chandrayaan-2 observations")
        return observations
    
    def get_available_observations(self) -> List[str]:
        """Get list of available observation IDs"""
        return list(self.observations.keys())
    
    def load_observation_image(self, obs_id: str) -> Optional[np.ndarray]:
        """
        Load the main image data for an observation
        
        Args:
            obs_id: Observation ID
            
        Returns:
            Image array or None if not found
        """
        if obs_id not in self.observations:
            print(f"Observation {obs_id} not found")
            return None
        
        img_file = self.observations[obs_id].get('img_file')
        if not img_file or not img_file.exists():
            print(f"Image file not found for observation {obs_id}")
            return None
        
        try:
            # Try to load as IMG file (binary format)
            # For now, we'll use the browse PNG if available
            browse_png = self.observations[obs_id].get('browse_png')
            if browse_png and browse_png.exists():
                image = cv2.imread(str(browse_png))
                if image is not None:
                    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            print(f"Could not load image for observation {obs_id}")
            return None
            
        except Exception as e:
            print(f"Error loading image for observation {obs_id}: {e}")
            return None
    
    def load_coordinate_data(self, obs_id: str) -> Optional[pd.DataFrame]:
        """
        Load coordinate data from CSV file
        
        Args:
            obs_id: Observation ID
            
        Returns:
            DataFrame with coordinate data or None if not found
        """
        if obs_id not in self.observations:
            print(f"Observation {obs_id} not found")
            return None
        
        csv_file = self.observations[obs_id].get('csv_file')
        if not csv_file or not csv_file.exists():
            print(f"CSV file not found for observation {obs_id}")
            return None
        
        try:
            df = pd.read_csv(csv_file)
            print(f"Loaded coordinate data: {len(df)} points for observation {obs_id}")
            return df
        except Exception as e:
            print(f"Error loading CSV for observation {obs_id}: {e}")
            return None
    
    def get_observation_metadata(self, obs_id: str) -> Optional[Dict]:
        """
        Get metadata for an observation from XML files
        
        Args:
            obs_id: Observation ID
            
        Returns:
            Dictionary with metadata or None if not found
        """
        if obs_id not in self.observations:
            return None
        
        metadata = {}
        
        # Try to parse image XML
        img_xml = self.observations[obs_id].get('img_xml')
        if img_xml and img_xml.exists():
            try:
                tree = ET.parse(img_xml)
                root = tree.getroot()
                
                # Extract basic metadata
                for elem in root.iter():
                    if elem.tag.endswith('start_date_time'):
                        metadata['start_time'] = elem.text
                    elif elem.tag.endswith('stop_date_time'):
                        metadata['stop_time'] = elem.text
                    elif elem.tag.endswith('title'):
                        metadata['title'] = elem.text
                        
            except Exception as e:
                print(f"Error parsing XML for observation {obs_id}: {e}")
        
        return metadata
    
    def find_observations_in_region(self, min_lon: float, max_lon: float, 
                                  min_lat: float, max_lat: float) -> List[str]:
        """
        Find observations that cover a specific geographic region
        
        Args:
            min_lon, max_lon: Longitude range
            min_lat, max_lat: Latitude range
            
        Returns:
            List of observation IDs that cover the region
        """
        matching_observations = []
        
        for obs_id in self.observations:
            df = self.load_coordinate_data(obs_id)
            if df is not None and not df.empty:
                # Check if any coordinates fall within the region
                lon_in_range = (df['Longitude'] >= min_lon) & (df['Longitude'] <= max_lon)
                lat_in_range = (df['Latitude'] >= min_lat) & (df['Latitude'] <= max_lat)
                
                if (lon_in_range & lat_in_range).any():
                    matching_observations.append(obs_id)
        
        return matching_observations
    
    def get_coordinate_bounds(self, obs_id: str) -> Optional[Tuple[float, float, float, float]]:
        """
        Get coordinate bounds for an observation
        
        Args:
            obs_id: Observation ID
            
        Returns:
            Tuple of (min_lon, max_lon, min_lat, max_lat) or None
        """
        df = self.load_coordinate_data(obs_id)
        if df is None or df.empty:
            return None
        
        return (
            df['Longitude'].min(),
            df['Longitude'].max(),
            df['Latitude'].min(),
            df['Latitude'].max()
        )
