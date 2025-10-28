"""
Demo script for the streamlined T.A.R.A. system
Demonstrates landslide detection and path planning using Chandrayaan-2 data
"""

import requests
import json
from pathlib import Path
import numpy as np
import cv2


def create_sample_terrain_image():
    """Create a sample terrain image for testing"""
    # Create a 512x512 terrain-like image
    height, width = 512, 512
    
    # Create base terrain with some variation
    terrain = np.random.rand(height, width) * 100
    
    # Add some slope variation
    x = np.linspace(0, 1, width)
    y = np.linspace(0, 1, height)
    X, Y = np.meshgrid(x, y)
    
    # Add elevation changes
    terrain += np.sin(X * 4 * np.pi) * 20
    terrain += np.cos(Y * 3 * np.pi) * 15
    
    # Add some high-risk areas (steep slopes)
    terrain[200:300, 150:250] += 50  # High elevation area
    terrain[400:450, 300:400] += 40  # Another high area
    
    # Normalize to 0-255 range
    terrain = ((terrain - terrain.min()) / (terrain.max() - terrain.min()) * 255).astype(np.uint8)
    
    # Convert to 3-channel image
    terrain_rgb = cv2.cvtColor(terrain, cv2.COLOR_GRAY2RGB)
    
    return terrain_rgb


def save_test_image(image, filename="test_terrain.png"):
    """Save test image to file"""
    cv2.imwrite(filename, cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
    return filename


def test_streamlined_service():
    """Test the streamlined service"""
    print("🚀 Testing T.A.R.A. Streamlined Landslide Detection Service")
    print("=" * 60)
    
    # Service URL
    base_url = "http://localhost:8000"
    
    # Test 1: Health check
    print("\n1. Testing health check...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Service is healthy")
            print(f"   Chandrayaan-2 data available: {response.json().get('chandrayaan_data_available', False)}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to service. Make sure it's running on localhost:8000")
        return
    
    # Test 2: List available observations
    print("\n2. Checking available Chandrayaan-2 observations...")
    try:
        response = requests.get(f"{base_url}/observations")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data['total_observations']} Chandrayaan-2 observations")
            if data['observations']:
                print(f"   Sample observations: {data['observations'][:3]}")
        else:
            print(f"❌ Failed to get observations: {response.status_code}")
    except Exception as e:
        print(f"❌ Error getting observations: {e}")
    
    # Test 3: Create and upload test image
    print("\n3. Creating test terrain image...")
    test_image = create_sample_terrain_image()
    image_filename = save_test_image(test_image)
    print(f"✅ Created test image: {image_filename}")
    
    # Test 4: Test landslide detection and path planning
    print("\n4. Testing landslide detection and path planning...")
    
    # Test coordinates (Selenographic)
    test_cases = [
        {
            "name": "Equatorial region",
            "start_lon": 0.0, "start_lat": 0.0,
            "end_lon": 1.0, "end_lat": 1.0
        },
        {
            "name": "Highland region", 
            "start_lon": 45.0, "start_lat": 30.0,
            "end_lon": 46.0, "end_lat": 31.0
        },
        {
            "name": "Mare region",
            "start_lon": -30.0, "start_lat": -20.0,
            "end_lon": -29.0, "end_lat": -19.0
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n   Test {i}: {test_case['name']}")
        print(f"   Route: ({test_case['start_lon']:.1f}°, {test_case['start_lat']:.1f}°) → "
              f"({test_case['end_lon']:.1f}°, {test_case['end_lat']:.1f}°)")
        
        try:
            with open(image_filename, 'rb') as f:
                files = {'image': f}
                data = {
                    'start_longitude': test_case['start_lon'],
                    'start_latitude': test_case['start_lat'],
                    'end_longitude': test_case['end_lon'],
                    'end_latitude': test_case['end_lat']
                }
                
                response = requests.post(f"{base_url}/detect-and-plan", files=files, data=data)
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"   ✅ Status: {result['status']}")
                    print(f"   📊 Message: {result['message']}")
                    
                    if result['detection_results']:
                        det = result['detection_results']
                        print(f"   🎯 Landslide Score: {det['landslide_score']:.3f}")
                        print(f"   ⚠️  Risk Percentage: {det['risk_percentage']:.1f}%")
                        print(f"   📍 High Risk Pixels: {det['high_risk_pixels']:,}")
                    
                    if result['path_planning']:
                        path = result['path_planning']
                        if path['path_found']:
                            print(f"   🛣️  Path Found: Yes")
                            print(f"   📏 Path Length: {path['path_length']:.2f} units")
                            print(f"   🛡️  Risk Avoidance: {path['risk_avoidance']:.1f}%")
                        else:
                            print(f"   🛣️  Path Found: No")
                    
                    if result['chandrayaan_observation']:
                        obs = result['chandrayaan_observation']
                        print(f"   🛰️  Chandrayaan Observation: {obs['observation_id']}")
                        if obs['coordinate_bounds']:
                            bounds = obs['coordinate_bounds']
                            print(f"   📍 Coverage: ({bounds[0]:.2f}° to {bounds[1]:.2f}° lon, "
                                  f"{bounds[2]:.2f}° to {bounds[3]:.2f}° lat)")
                        print(f"   📊 Coordinate Points: {obs['coordinate_data_points']:,}")
                
                else:
                    print(f"   ❌ Request failed: {response.status_code}")
                    print(f"   Error: {response.text}")
        
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Cleanup
    print(f"\n5. Cleaning up...")
    try:
        Path(image_filename).unlink()
        print(f"✅ Removed test image: {image_filename}")
    except:
        pass
    
    print("\n" + "=" * 60)
    print("🎉 Streamlined T.A.R.A. system test completed!")
    print("\nTo use the system:")
    print("1. Start the service: python streamlined_landslide_service.py")
    print("2. Upload your terrain image with start/end coordinates")
    print("3. Get landslide detection and optimal path results")


if __name__ == "__main__":
    test_streamlined_service()
