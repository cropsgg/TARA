# T.A.R.A. - Streamlined Physics-Based Lunar Landslide Detection System

## Overview
T.A.R.A. (Terrain Analysis and Risk Assessment) is a streamlined physics-based landslide detection system that integrates Chandrayaan-2 satellite data for lunar terrain analysis. The system uses user-provided images and Selenographic coordinates to detect landslide-prone areas and plan safe navigation paths using real Chandrayaan-2 observations.

## Key Features
- **Chandrayaan-2 Integration**: Uses real Chandrayaan-2 satellite images and coordinate data
- **Physics-Based Detection**: Uses physical criteria (slope, depth, width, roughness, aspect) instead of machine learning
- **Image Input Processing**: Accepts terrain images (PNG, JPG, TIFF) for analysis
- **Selenographic Coordinates**: Uses lunar-specific coordinate system for navigation
- **Automatic Data Matching**: Finds the best Chandrayaan-2 observation for your region
- **Optimal Path Planning**: A* algorithm for safe route planning

## System Components

### Core Files
- `streamlined_landslide_service.py` - Main FastAPI service with Chandrayaan-2 integration
- `demo_streamlined_system.py` - Demonstration script
- `src/data/chandrayaan_loader.py` - Chandrayaan-2 data loader
- `src/detect/physics_based_detector.py` - Physics-based detection logic
- `src/planning/lunar_path_planner.py` - Path planning with Selenographic coordinates
- `src/coordinate_utils/selenographic_converter.py` - Coordinate conversion utilities
- `configs/physics_based.yaml` - Configuration parameters

### Data Files
- `sample_coordinates.csv` - Sample longitude/latitude data
- `requirements.txt` - Python dependencies
- `chandrayaan-2/` - Chandrayaan-2 satellite data directory

## Quick Start

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Ensure Chandrayaan-2 Data**: Place Chandrayaan-2 data in `../chandrayaan-2/` directory

3. **Start the Service**:
   ```bash
   python streamlined_landslide_service.py
   ```

4. **Run Demo**:
   ```bash
   python demo_streamlined_system.py
   ```

## API Usage

### Upload Image and Get Path with Chandrayaan-2 Data
```bash
curl -X POST "http://localhost:8000/detect-and-plan" \
  -F "image=@terrain_image.png" \
  -F "start_longitude=0.0" \
  -F "start_latitude=0.0" \
  -F "end_longitude=45.0" \
  -F "end_latitude=30.0"
```

### Check Available Chandrayaan-2 Observations
```bash
curl "http://localhost:8000/observations"
```

## Physics-Based Detection Criteria
- **Slope**: Areas with slope > 30° are considered high risk
- **Depth Changes**: 5-100m depth variations indicate potential landslides
- **Feature Width**: 20-500m width range for landslide features
- **Roughness**: High surface roughness increases risk
- **Aspect**: East/South facing slopes are more vulnerable

## Configuration
Edit `configs/physics_based.yaml` to adjust detection parameters:
- `critical_slope`: Slope threshold (default: 30°)
- `min_depth_change`: Minimum depth change (default: 5m)
- `max_depth_change`: Maximum depth change (default: 100m)
- `min_width`: Minimum feature width (default: 20m)
- `max_width`: Maximum feature width (default: 500m)

## Coordinate System
The system uses Selenographic coordinates:
- **Longitude**: -180° to +180° (positive = East, negative = West)
- **Latitude**: -90° to +90° (positive = North, negative = South)

## No Synthetic Data Policy
This system strictly uses real terrain data and physics-based analysis. No synthetic or artificially generated data is used in the detection process.
