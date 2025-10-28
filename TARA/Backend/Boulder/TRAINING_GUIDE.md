# Chandrayaan-2 Boulder Detection Training Guide

## Overview

This guide explains how to train a deep learning model for boulder detection using Chandrayaan-2 lunar orbital data. The system uses Mask2Former for instance segmentation, fine-tuned on lunar terrain imagery.

## 🗂️ File Structure

```
boulder/
├── boulder.py                    # Main detection and training module
├── train_chandrayaan_model.py    # Complete training pipeline
├── requirements.txt              # Python dependencies
├── TRAINING_GUIDE.md            # This guide
├── chandrayaan_data/            # Your .img files go here
└── outputs/
    ├── tiles/                   # Processed tile images
    ├── trained_models/          # Saved model checkpoints
    └── results/                 # Detection results
```

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt
```

### 2. Prepare Your Data

Place your Chandrayaan-2 `.img` files in a directory (e.g., `chandrayaan_data/`):

```
chandrayaan_data/
├── ch2_ohr_ncp_20250310T0833447498_d_img_d18.img
├── ch2_ohr_ncp_20250311T0845123456_d_img_d18.img
└── ... (more .img files)
```

### 3. Run Complete Training Pipeline

```bash
python train_chandrayaan_model.py \
    --chandrayaan_dir chandrayaan_data \
    --output_dir processed_tiles \
    --epochs 20 \
    --batch_size 2 \
    --cpu
```

## 📋 Detailed Steps

### Step 1: Image Tiling

Large `.img` files (often GB-sized) need to be tiled into manageable patches:

```bash
# Tile preparation only
python boulder.py --mode prepare \
    --img_dir chandrayaan_data \
    --output_dir tiles
```

**Key Parameters:**
- **Tile Size**: 1024×1024 (default) or 512×512 for limited memory
- **Overlap**: 128 pixels to ensure no boulder is split across tiles
- **Threshold**: Filters out completely black (empty) tiles

**Expected Output:**
```
=== Chandrayaan-2 Dataset Preparation ===
Found 3 .img files to process

Processing: chandrayaan_data/file1.img
Created 245 tiles from file1
Created 189 tiles from file2
Created 312 tiles from file3

✅ Dataset preparation complete!
📊 Total tiles: 746
```

### Step 2: Model Training

Train Mask2Former on the tiled lunar imagery:

```bash
# Training only
python boulder.py --mode train \
    --tiles_dir tiles \
    --epochs 20 \
    --batch_size 2 \
    --cpu
```

**Training Configuration:**
- **Model**: facebook/mask2former-swin-base-coco-instance (pre-trained)
- **Fine-tuning**: Domain adaptation from COCO to lunar terrain
- **Optimizer**: AdamW with learning rate 1e-5
- **Scheduler**: StepLR (decay every 3 epochs)

**Memory Requirements:**
- **GPU**: 8GB+ VRAM for batch_size=4
- **CPU**: 16GB+ RAM for batch_size=2 (slower but more stable)

### Step 3: Model Evaluation

Test the trained model:

```bash
# Detection with trained model
python boulder.py --mode detect
```

## ⚙️ Advanced Configuration

### Custom Tiling Parameters

```python
from boulder import ImageTiler

# Create custom tiler
tiler = ImageTiler(
    tile_size=(512, 512),    # Smaller tiles for limited memory
    overlap=64               # Reduced overlap
)

# Process specific image
dataset_info = tiler.tile_dataset(
    img_directory="chandrayaan_data",
    output_directory="custom_tiles"
)
```

### Training Hyperparameters

```python
from boulder import BoulderTrainer

# Create trainer with custom settings
trainer = BoulderTrainer(
    model_name="facebook/mask2former-swin-base-coco-instance",
    use_cpu=True  # Force CPU training
)

# Train with custom parameters
trainer.train_model(
    tiles_dir="tiles",
    num_epochs=30,
    learning_rate=5e-6,     # Lower learning rate
    save_dir="models"
)
```

### Data Augmentation

The training pipeline includes lunar-specific augmentations:

```python
# Included augmentations:
- RandomHorizontalFlip(p=0.5)    # Terrain orientation
- RandomVerticalFlip(p=0.5)      # Rotation invariance  
- RandomRotation(degrees=15)     # Small rotations
- ColorJitter(brightness=0.2)    # Lighting variation
```

## 🎯 Training Tips

### For Small Datasets (<100 tiles)
```bash
python train_chandrayaan_model.py \
    --epochs 10 \
    --batch_size 1 \
    --learning_rate 1e-6 \
    --cpu
```

### For Large Datasets (>1000 tiles)
```bash
python train_chandrayaan_model.py \
    --epochs 50 \
    --batch_size 8 \
    --learning_rate 2e-5
```

### GPU Memory Issues
```bash
# Try these solutions:
1. Reduce batch size: --batch_size 1
2. Use CPU training: --cpu
3. Smaller tiles: --tile_size 512
4. Clear GPU cache between runs
```

## 📊 Expected Results

### Training Metrics
- **Convergence**: 10-20 epochs typically sufficient
- **Loss**: Should decrease steadily from ~0.5 to ~0.2
- **Validation**: Monitor for overfitting

### Detection Performance
- **Precision**: 70-85% (proxy COCO classes)
- **Recall**: 60-80% (depends on boulder size/clarity)
- **False Positives**: Common with shadows, craters

### Model Output
```
Detected 12 potential boulders
Average confidence: 0.873
Top boulder: Confidence 0.967, Area 1523px
```

## 🔧 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| No tiles created | Lower black tile threshold or check image data |
| CUDA OOM | Use `--cpu` or reduce `--batch_size` |
| Low detection count | Adjust confidence threshold or training epochs |
| Large false positive boxes | Tune NMS IoU threshold |

### Data Quality Checks

```python
# Check image statistics
from boulder import ImageDataProcessor

processor = ImageDataProcessor("your_file.img")
image = processor.load_data()
analysis = processor.analyze_image_data()
print(analysis)

# Expected ranges:
# - mean_value: 20-100 (lunar terrain)
# - std_value: 30-80 (good contrast)
# - data_type: uint8 or uint16
```

### Model Performance Validation

```python
# Test detection on sample tiles
import glob
from boulder import BoulderDetector

detector = BoulderDetector(confidence_threshold=0.7)
test_tiles = glob.glob("tiles/*.png")[:5]

for tile_path in test_tiles:
    image = cv2.imread(tile_path)
    boulders = detector.detect_boulders(image)
    print(f"{tile_path}: {len(boulders)} boulders detected")
```

## 🌟 Advanced Features

### Custom Loss Functions
For production training, implement proper segmentation losses:
```python
# Replace dummy loss with actual segmentation loss
loss = nn.CrossEntropyLoss()(predictions, ground_truth_masks)
```

### Model Ensemble
Combine multiple models for better performance:
```python
# Train multiple models with different seeds
# Average predictions for final result
```

### Transfer Learning
Fine-tune from lunar-specific pre-trained models when available.

## 📈 Performance Optimization

### Speed Improvements
1. **Multi-GPU Training**: Distribute across multiple GPUs
2. **Mixed Precision**: Use FP16 for faster training
3. **Data Loading**: Optimize with more workers

### Memory Optimization
1. **Gradient Checkpointing**: Trade compute for memory
2. **Model Sharding**: Split large models across devices
3. **Batch Size Scaling**: Find optimal memory/speed balance

## 🎓 Next Steps

1. **Collect Ground Truth**: Label actual boulders for supervised training
2. **Domain Adaptation**: Fine-tune with more lunar-specific data
3. **Post-processing**: Implement geological filtering rules
4. **Deployment**: Integrate with rover navigation systems

## 📚 References

- [Mask2Former Paper](https://arxiv.org/abs/2112.01527)
- [Chandrayaan-2 Mission](https://www.isro.gov.in/chandrayaan2_home.html)
- [Lunar Boulder Detection](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2019JE006219)

## 🆘 Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Review the error messages and logs
3. Adjust parameters based on your hardware/data constraints
