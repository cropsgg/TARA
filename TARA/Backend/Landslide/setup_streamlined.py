"""
Setup script for the streamlined T.A.R.A. system
Verifies dependencies and Chandrayaan-2 data availability
"""

import os
import sys
import subprocess
from pathlib import Path


def check_python_version():
    """Check if Python version is compatible"""
    print("🐍 Checking Python version...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ required")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
    return True


def check_dependencies():
    """Check if required packages are installed"""
    print("\n📦 Checking dependencies...")
    
    required_packages = [
        'fastapi', 'uvicorn', 'pydantic', 'opencv-python', 'numpy',
        'rasterio', 'shapely', 'geopandas', 'pandas', 'PyYAML', 'tqdm',
        'python-multipart', 'requests'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            if package == 'opencv-python':
                import cv2
            elif package == 'PyYAML':
                import yaml
            else:
                __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package}")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n⚠️  Missing packages: {', '.join(missing_packages)}")
        print("Install with: pip install -r requirements.txt")
        return False
    
    return True


def check_chandrayaan_data():
    """Check if Chandrayaan-2 data is available"""
    print("\n🛰️  Checking Chandrayaan-2 data...")
    
    chandrayaan_dir = Path("../chandrayaan-2")
    
    if not chandrayaan_dir.exists():
        print(f"❌ Chandrayaan-2 data directory not found: {chandrayaan_dir}")
        print("   Please ensure Chandrayaan-2 data is placed in the correct location")
        return False
    
    # Count files
    img_files = list(chandrayaan_dir.glob("*.img"))
    csv_files = list(chandrayaan_dir.glob("*.csv"))
    png_files = list(chandrayaan_dir.glob("*.png"))
    
    print(f"✅ Found {len(img_files)} IMG files")
    print(f"✅ Found {len(csv_files)} CSV files")
    print(f"✅ Found {len(png_files)} PNG files")
    
    if len(img_files) == 0:
        print("❌ No IMG files found")
        return False
    
    if len(csv_files) == 0:
        print("❌ No CSV coordinate files found")
        return False
    
    return True


def test_data_loader():
    """Test the Chandrayaan data loader"""
    print("\n🔧 Testing Chandrayaan data loader...")
    
    try:
        sys.path.append(str(Path(__file__).parent / "src"))
        from data.chandrayaan_loader import ChandrayaanDataLoader
        
        loader = ChandrayaanDataLoader()
        observations = loader.get_available_observations()
        
        print(f"✅ Data loader working")
        print(f"✅ Found {len(observations)} observations")
        
        if observations:
            # Test loading one observation
            test_obs = observations[0]
            print(f"✅ Testing observation: {test_obs}")
            
            # Test coordinate data
            coord_data = loader.load_coordinate_data(test_obs)
            if coord_data is not None:
                print(f"✅ Coordinate data loaded: {len(coord_data)} points")
            else:
                print("⚠️  Could not load coordinate data")
            
            # Test image data
            image_data = loader.load_observation_image(test_obs)
            if image_data is not None:
                print(f"✅ Image data loaded: {image_data.shape}")
            else:
                print("⚠️  Could not load image data")
        
        return True
        
    except Exception as e:
        print(f"❌ Data loader test failed: {e}")
        return False


def create_startup_scripts():
    """Create startup scripts"""
    print("\n📝 Creating startup scripts...")
    
    # Create start service script
    start_script = """#!/bin/bash
echo "🚀 Starting T.A.R.A. Streamlined Landslide Detection Service..."
echo "Using Chandrayaan-2 satellite data for physics-based detection"
python streamlined_landslide_service.py
"""
    
    with open("start_streamlined_service.sh", "w", encoding="utf-8") as f:
        f.write(start_script)
    
    # Create demo script
    demo_script = """#!/bin/bash
echo "🎯 Running T.A.R.A. Streamlined System Demo..."
python demo_streamlined_system.py
"""
    
    with open("run_demo.sh", "w", encoding="utf-8") as f:
        f.write(demo_script)
    
    print("✅ Created start_streamlined_service.sh")
    print("✅ Created run_demo.sh")


def main():
    """Main setup function"""
    print("🌙 T.A.R.A. Streamlined System Setup")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        return False
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Setup failed: Missing dependencies")
        return False
    
    # Check Chandrayaan-2 data
    if not check_chandrayaan_data():
        print("\n❌ Setup failed: Chandrayaan-2 data not available")
        return False
    
    # Test data loader
    if not test_data_loader():
        print("\n❌ Setup failed: Data loader test failed")
        return False
    
    # Create startup scripts
    create_startup_scripts()
    
    print("\n" + "=" * 50)
    print("🎉 T.A.R.A. Streamlined System Setup Complete!")
    print("\nNext steps:")
    print("1. Start the service: python streamlined_landslide_service.py")
    print("2. Run the demo: python demo_streamlined_system.py")
    print("3. Or use the scripts: ./start_streamlined_service.sh")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
