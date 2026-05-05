# Label Studio Setup Guide for Lunar Surface Feature Labeling

This guide will walk you through setting up Label Studio to annotate lunar surface images for boulder and landslide detection.

## Prerequisites

Before you begin, ensure you have:
- Python 3.12 installed on your system
- Access to this repository's files
- A web browser (Chrome, Firefox, or Edge recommended)

## Installation Steps

### 1. Install Python 3.12

If you don't have Python 3.12 installed:
- **Windows**: Download from [python.org](https://www.python.org/downloads/)
- **macOS**: Download from [python.org](https://www.python.org/downloads/) or use `brew install python@3.12`
- **Linux**: Use your package manager (e.g., `sudo apt install python3.12`)

Verify installation:
```bash
python --version
# or
py -3.12 --version
```

### 2. Install Label Studio

Open a terminal/command prompt and run:
```bash
pip install label-studio
```

Or if you're on Windows with multiple Python versions:
```bash
py -3.12 -m pip install label-studio
```

### 3. Navigate to the LabelStudio Directory

```bash
cd Backend/LabelStudio
```

Or using the full path from the repository root:
```bash
cd TARA/Backend/LabelStudio
```

## Starting Label Studio

### 4. Launch Label Studio Server

Run the following command to start a local Label Studio instance:

**Windows:**
```bash
py -3.12 -m label_studio.server start --port 8080
```

**macOS/Linux:**
```bash
python3.12 -m label_studio.server start --port 8080
```

You should see output indicating the server has started. Label Studio will be accessible at `http://localhost:8080`

### 5. Create Your Account

1. Open your web browser and navigate to `http://localhost:8080`
2. You'll be prompted to create an account
3. Enter your email and password (this is stored locally, no internet connection required)
4. Click "Sign Up" or "Create Account"

## Setting Up Your Labeling Project

### 6. Create a New Project

1. Click "Create Project" on the main dashboard
2. Give your project a name 
3. Add an optional description

### 7. Import Dataset Images

1. In your project, go to the **"Data Import"** tab
2. Click **"Upload Files"**
3. Navigate to `Backend/dataset/` (or `HACKAura-master/Backend/dataset/`) in this repository
4. Select all PNG images in the dataset folder. Upload only the images you're going to label: which should be 91 images.
5. Click **"Import"** to upload them to your project

### 8. Configure Labeling Interface

1. Go to the **"Settings"** tab in your project
2. Select **"Labeling Interface"**
3. Click on **"Code"** view (if not already selected)
4. **Delete any existing configuration**
5. Copy and paste the following configuration from `label_config.xml`:

```xml
<View>
  <Header value="Lunar Surface Feature Detection"/>
  <Text name="instruction" value="Draw bounding boxes around boulders and landslides"/>
  
  <Image name="image" value="$image" zoom="true" zoomControl="true" rotateControl="true"/>
  
  <RectangleLabels name="label" toName="image" strokeWidth="3">
    <Label value="boulder" background="red"/>
    <Label value="landslide" background="blue"/>
  </RectangleLabels>
  
  <Choices name="quality" toName="image" choice="single">
    <Choice value="high_quality"/>
    <Choice value="medium_quality"/>
    <Choice value="low_quality"/>
  </Choices>
  
  <TextArea name="notes" toName="image" 
            placeholder="Additional notes about the image..."
            rows="3"/>
</View>
```

6. Click **"Save"** to apply the configuration

## Labeling Instructions

### 9. Begin Labeling

1. Go to the main project page
2. Click on any image to start annotating
3. Use the labeling tools:
   - **Boulder (Red)**: Draw bounding boxes around individual boulders
   - **Landslide (Blue)**: Draw bounding boxes around landslide regions
   - Use **zoom** and **rotate** controls as needed for better visibility
4. Select the **image quality** rating:
   - `high_quality`: Clear, well-defined features
   - `medium_quality`: Moderately clear features
   - `low_quality`: Unclear or ambiguous features
5. Add any **additional notes** in the text area if needed
6. Click **"Submit"** when done with an image
7. The next image will load automatically

### What to look for when labeling

#### Boulders (label: boulder)
- Appearance: High-albedo rock with a distinct dark shadow cast in the Sun-facing direction; often sub-circular to irregular, isolated or in small clusters.
- Lighting cues: Shadow length varies with Sun angle. Expect a bright-lit face and a crisp shadow boundary; avoid labeling shadows alone as boulders.
- Context: Common near fresh crater rims, along ejecta rays, or at the toes of small slopes. Can occur on otherwise smooth mare surfaces as isolated bright spots with shadows.
- Size/scale: Label only resolvable rocks. If the “boulder” is a single pixel or smaller than the box tool can meaningfully enclose, skip or note low_quality.
- Surface interaction: May show a small downslope wake or faint scour marks and local slope disturbances around the rock.
- Pitfalls to avoid:
  - Dark pits, secondary craters, or compression artifacts mistaken as rocks.
  - Shadow-only features without a corresponding bright lit body.
  - Bright albedo patches without a consistent shadow under the current illumination.
  - Linear outcrops or blocky bedrock that form continuous ridges (don’t box long continuous outcrops as a single boulder).

Bounding boxes for boulders:
- Enclose the rock body with a small margin; do not include long shadows unless the shadow helps disambiguate the object’s extent.
- For clusters, label clearly separable rocks individually; if unresolved, use one box and add a note that it’s a cluster.

#### Landslides (label: landslide)
- Appearance: Downslope movement features with a source “scar” upslope and a depositional “toe” downslope; texture looks disturbed relative to surroundings.
- Texture and tone: Smoother, streaked, or flow-like surfaces; tonal contrast relative to adjacent terrain due to freshly exposed material.
- Morphology: Track-like or lobate bodies, levees along margins, transverse ridges near the toe, and subtle flow lines aligned with slope direction.
- Context: Found on crater walls, rim terraces, central peak flanks, pit edges, or steep scarps. Often initiates below over-steepened rims or fractured bedrock.
- Illumination awareness: Features should remain coherent when mentally inverting lighting; avoid confusing downslope streaks caused purely by shadows.
- Pitfalls to avoid:
  - Ejecta rays or wind-like streaks unrelated to mass wasting.
  - Albedo variations from imaging seams, sensor striping, or compression.
  - Talus/boulder trains alone without clear evidence of bulk movement; if only boulders are visible, label boulders instead and add a note.

Bounding boxes for landslides:
- Enclose the entire extent from the head scarp to the toe, including levees if visible.
- If the source area is ambiguous but the flow is clear, prioritize enclosing the continuous disturbed region; add a note about uncertain head scarp.

General best practices:
- Always check Sun direction; confirm object-plus-shadow pairing for boulders and avoid shadow-only labels.
- Use multiple zoom levels to verify texture changes and edges.
- If uncertain between classes, choose the best fit, set quality to low_quality, and leave a brief note.

## Exporting Annotations

### 10. Export Your Labeled Data

Once you've completed labeling all images (or a batch):

1. Return to your project dashboard
2. Click on the **"Export"** button in the top-right corner
3. Select **"JSON"** as the export format
4. Click **"Export"** to download the file
5. Save the exported JSON file (e.g., `annotations.json`)

The exported JSON will contain:
- Image references
- Bounding box coordinates
- Labels (boulder/landslide)
- Quality ratings
- Notes

## Project Structure

```
Backend/
├── LabelStudio/
│   ├── Label_Studio.md        # This file
│   └── label_config.xml       # Labeling interface configuration
└── dataset/
    └── *.png                  # Lunar surface images to label
```

## Troubleshooting

### Port Already in Use
If port 8080 is already in use, try a different port:
```bash
py -3.12 -m label_studio.server start --port 8081
```

### Label Studio Won't Start
- Ensure Python 3.12 is properly installed
- Try reinstalling Label Studio: `pip uninstall label-studio && pip install label-studio`
- Check for firewall issues blocking localhost

### Images Not Loading
- Verify images are in the correct format (PNG, JPG)
- Check file permissions
- Try re-importing the images

### Can't See Labeling Interface
- Clear your browser cache
- Try a different browser
- Verify the label_config.xml was pasted correctly

## Stopping Label Studio

To stop the Label Studio server:
1. Go to the terminal where it's running
2. Press `Ctrl+C` (Windows/Linux) or `Cmd+C` (macOS)

## Restarting Your Session

To resume labeling later:
1. Navigate to `Backend/LabelStudio` directory
2. Run the start command again:
   ```bash
   py -3.12 -m label_studio.server start --port 8080
   ```
3. Open `http://localhost:8080` in your browser
4. Log in with your existing credentials
5. Your project and progress will be saved

## Additional Resources

- [Label Studio Documentation](https://labelstud.io/guide/)
- [Label Studio GitHub](https://github.com/heartexlabs/label-studio)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Label Studio logs in the terminal
3. Consult the Label Studio documentation
4. Check this repository's issues section

---

**Happy Labeling! 🚀🌙**
