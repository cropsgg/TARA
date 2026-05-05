#!/usr/bin/env python3
"""
Detectron2-based Boulder Detection Training

This module implements proper Detectron2 training for lunar boulder detection
with COCO dataset registration, training configuration, and evaluation metrics.
"""

import os
import json
import glob
import cv2
import numpy as np
from typing import List, Dict, Tuple
import torch
from pathlib import Path

# Detectron2 imports
import detectron2
from detectron2.utils.logger import setup_logger
from detectron2 import model_zoo
from detectron2.engine import DefaultPredictor, DefaultTrainer, launch
from detectron2.config import get_cfg
from detectron2.utils.visualizer import Visualizer
from detectron2.data import MetadataCatalog, DatasetCatalog, build_detection_test_loader
from detectron2.evaluation import COCOEvaluator, inference_on_dataset
from detectron2.structures import BoxMode
from detectron2.checkpoint import DetectionCheckpointer
from detectron2.modeling import build_model

# Setup logger
setup_logger()

class LunarBoulderDatasetGenerator:
    """Generates COCO-format annotations for lunar boulder dataset."""
    
    def __init__(self, tiles_dir: str, annotations_dir: str = "annotations"):
        """
        Initialize dataset generator.
        
        Args:
            tiles_dir: Directory containing tile images
            annotations_dir: Directory to save annotations
        """
        self.tiles_dir = tiles_dir
        self.annotations_dir = annotations_dir
        os.makedirs(annotations_dir, exist_ok=True)
        
        # Boulder class mapping
        self.classes = ["boulder"]
        self.class_to_id = {cls: idx for idx, cls in enumerate(self.classes)}
    
    def create_pseudo_annotations(self, detection_results: List[Dict] = None) -> str:
        """
        Create pseudo-annotations using existing detection results or synthetic data.
        This is a bootstrap approach until manual annotations are available.
        
        Args:
            detection_results: Pre-computed detection results for bootstrap
            
        Returns:
            Path to created annotation file
        """
        tile_paths = glob.glob(os.path.join(self.tiles_dir, "*.png"))
        
        coco_dataset = {
            "info": {
                "description": "Lunar Boulder Dataset",
                "version": "1.0",
                "year": 2025,
                "contributor": "Chandrayaan-2 Boulder Detection",
                "date_created": "2025-01-01"
            },
            "licenses": [{"id": 1, "name": "Custom", "url": ""}],
            "images": [],
            "annotations": [],
            "categories": [{"id": 0, "name": "boulder", "supercategory": "geological"}]
        }
        
        annotation_id = 0
        
        # Use existing boulder detector to create pseudo-annotations
        from boulder import BoulderDetector
        detector = BoulderDetector(confidence_threshold=0.7)
        
        print("🔍 Generating pseudo-annotations using existing detector...")
        
        for img_id, tile_path in enumerate(tile_paths):  # Process all tiles for full dataset
            # Load image to get dimensions
            image = cv2.imread(tile_path)
            if image is None:
                continue
                
            height, width = image.shape[:2]
            
            # Add image info
            coco_dataset["images"].append({
                "id": img_id,
                "file_name": os.path.basename(tile_path),
                "width": width,
                "height": height
            })
            
            # Generate pseudo-annotations using existing detector
            try:
                detected_boulders = detector.detect_boulders(image)
                
                for boulder in detected_boulders:
                    bbox = boulder['bbox']
                    x, y, x2, y2 = bbox
                    w = x2 - x
                    h = y2 - y
                    area = w * h
                    
                    # Only include reasonable-sized detections
                    if area > 100 and w > 10 and h > 10:
                        coco_dataset["annotations"].append({
                            "id": annotation_id,
                            "image_id": img_id,
                            "category_id": 0,  # boulder class
                            "bbox": [float(x), float(y), float(w), float(h)],
                            "area": float(area),
                            "iscrowd": 0,
                            "segmentation": [[float(x), float(y), float(x+w), float(y), 
                                           float(x+w), float(y+h), float(x), float(y+h)]]
                        })
                        annotation_id += 1
            except Exception as e:
                print(f"Warning: Detection failed for {tile_path}: {e}")
                continue
            
            if (img_id + 1) % 1000 == 0:
                print(f"   Processed {img_id + 1}/{len(tile_paths)} images, created {annotation_id} annotations")
        
        # If no annotations found, create some synthetic ones for demo
        if annotation_id == 0:
            print("⚠️ No detections found, creating synthetic annotations for demo...")
            
            for img_id in range(min(10, len(coco_dataset["images"]))):
                # Create 1-3 synthetic boulder annotations per image
                for _ in range(np.random.randint(1, 4)):
                    # Random boulder position and size
                    x = np.random.randint(50, width - 100)
                    y = np.random.randint(50, height - 100)
                    w = np.random.randint(20, 80)
                    h = np.random.randint(20, 80)
                    area = w * h
                    
                    coco_dataset["annotations"].append({
                        "id": annotation_id,
                        "image_id": img_id,
                        "category_id": 0,
                        "bbox": [float(x), float(y), float(w), float(h)],
                        "area": float(area),
                        "iscrowd": 0,
                        "segmentation": [[float(x), float(y), float(x+w), float(y), 
                                       float(x+w), float(y+h), float(x), float(y+h)]]
                    })
                    annotation_id += 1
        
        # Save annotation file
        annotation_file = os.path.join(self.annotations_dir, "lunar_boulders_train.json")
        with open(annotation_file, 'w') as f:
            json.dump(coco_dataset, f, indent=2)
        
        print(f"✅ Created pseudo-annotations: {annotation_file}")
        print(f"📊 Images: {len(coco_dataset['images'])}, Annotations: {len(coco_dataset['annotations'])}")
        
        return annotation_file
    
    def get_dataset_dicts(self, annotation_file: str) -> List[Dict]:
        """
        Convert COCO annotations to Detectron2 format.
        
        Args:
            annotation_file: Path to COCO annotation file
            
        Returns:
            List of dataset dictionaries in Detectron2 format
        """
        with open(annotation_file, 'r') as f:
            coco_data = json.load(f)
        
        # Create image_id to annotations mapping
        img_id_to_anns = {}
        for ann in coco_data['annotations']:
            img_id = ann['image_id']
            if img_id not in img_id_to_anns:
                img_id_to_anns[img_id] = []
            img_id_to_anns[img_id].append(ann)
        
        dataset_dicts = []
        
        for img_info in coco_data['images']:
            record = {}
            
            # Image information
            filename = os.path.join(self.tiles_dir, img_info['file_name'])
            record["file_name"] = filename
            record["image_id"] = img_info['id']
            record["height"] = img_info['height']
            record["width"] = img_info['width']
            
            # Annotations
            annotations = img_id_to_anns.get(img_info['id'], [])
            objs = []
            
            for ann in annotations:
                bbox = ann['bbox']
                obj = {
                    "bbox": bbox,
                    "bbox_mode": BoxMode.XYWH_ABS,
                    "category_id": ann['category_id'],
                    "iscrowd": ann['iscrowd']
                }
                
                # Add segmentation if available
                if 'segmentation' in ann:
                    obj["segmentation"] = ann['segmentation']
                
                objs.append(obj)
            
            record["annotations"] = objs
            dataset_dicts.append(record)
        
        return dataset_dicts

class Detectron2BoulderTrainer(DefaultTrainer):
    """Custom trainer for lunar boulder detection."""
    
    @classmethod
    def build_evaluator(cls, cfg, dataset_name, output_folder=None):
        """Build evaluator for lunar boulder detection."""
        if output_folder is None:
            output_folder = os.path.join(cfg.OUTPUT_DIR, "inference")
        return COCOEvaluator(dataset_name, cfg, True, output_folder)
    
    @classmethod
    def test_with_TTA(cls, cfg, model):
        """Test with Test Time Augmentation."""
        # Can be implemented for more robust evaluation
        pass

def register_lunar_boulder_dataset(tiles_dir: str, dataset_name: str = "lunar_boulders"):
    """
    Register lunar boulder dataset with Detectron2.
    
    Args:
        tiles_dir: Directory containing tile images
        dataset_name: Name for the registered dataset
    """
    
    # Check if annotations already exist
    annotation_file = os.path.join("annotations", "lunar_boulders_train.json")
    if not os.path.exists(annotation_file):
        print("Creating new annotations...")
        generator = LunarBoulderDatasetGenerator(tiles_dir)
        annotation_file = generator.create_pseudo_annotations()
    else:
        print(f"Using existing annotations: {annotation_file}")
        # Still need to create generator for dataset dicts
        generator = LunarBoulderDatasetGenerator(tiles_dir)
    
    # Verify annotation file exists
    if not os.path.exists(annotation_file):
        raise FileNotFoundError(f"Annotation file not found: {annotation_file}")
    
    # Verify tiles directory exists
    if not os.path.exists(tiles_dir):
        raise FileNotFoundError(f"Tiles directory not found: {tiles_dir}")
    
    print(f"📁 Using annotation file: {annotation_file}")
    print(f"📁 Using tiles directory: {tiles_dir}")
    
    # Define dataset function
    def get_lunar_boulder_dicts():
        return generator.get_dataset_dicts(annotation_file)
    
    # Create train/val split
    all_dicts = get_lunar_boulder_dicts()
    if len(all_dicts) == 0:
        raise ValueError("No valid dataset entries found!")
    
    # Split 80/20 for train/val
    split_idx = int(0.8 * len(all_dicts))
    train_dicts = all_dicts[:split_idx]
    val_dicts = all_dicts[split_idx:]
    
    print(f"📊 Dataset split: {len(train_dicts)} train, {len(val_dicts)} val")
    
    # Define split functions
    def get_train_dicts():
        return train_dicts
    
    def get_val_dicts():
        return val_dicts
    
    # Register datasets
    DatasetCatalog.register(f"{dataset_name}_train", get_train_dicts)
    MetadataCatalog.get(f"{dataset_name}_train").set(
        thing_classes=["boulder"],
        evaluator_type="coco",
        json_file=annotation_file,
        image_root=tiles_dir
    )
    
    DatasetCatalog.register(f"{dataset_name}_val", get_val_dicts)
    MetadataCatalog.get(f"{dataset_name}_val").set(
        thing_classes=["boulder"],
        evaluator_type="coco",
        json_file=annotation_file,
        image_root=tiles_dir
    )
    
    print(f"✅ Registered dataset: {dataset_name}")
    return f"{dataset_name}_train", f"{dataset_name}_val"

def setup_training_config(
    train_dataset: str,
    val_dataset: str,
    output_dir: str = "detectron2_output",
    num_classes: int = 1,
    max_iter: int = 10000,  # Increased for full dataset
    batch_size: int = 4,    # Increased for GPU
    learning_rate: float = 0.00025
) -> object:
    """
    Setup Detectron2 training configuration.
    
    Args:
        train_dataset: Name of training dataset
        val_dataset: Name of validation dataset
        output_dir: Output directory for models and logs
        num_classes: Number of classes (1 for boulder)
        max_iter: Maximum training iterations
        batch_size: Training batch size
        learning_rate: Learning rate
        
    Returns:
        Configured detectron2 config object
    """
    cfg = get_cfg()
    
    # Base model configuration - using Mask R-CNN as it's more stable than Mask2Former
    cfg.merge_from_file(model_zoo.get_config_file("COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml"))
    cfg.MODEL.WEIGHTS = model_zoo.get_checkpoint_url("COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml")
    
    # Alternative: Use Mask2Former if available
    # cfg.merge_from_file(model_zoo.get_config_file("COCO-InstanceSegmentation/mask2former_R50_FPN_bs16_50ep.yaml"))
    # cfg.MODEL.WEIGHTS = model_zoo.get_checkpoint_url("COCO-InstanceSegmentation/mask2former_R50_FPN_bs16_50ep.yaml")
    
    # Dataset configuration
    cfg.DATASETS.TRAIN = (train_dataset,)
    cfg.DATASETS.TEST = (val_dataset,)
    cfg.DATALOADER.NUM_WORKERS = 2
    
    # Training configuration
    cfg.SOLVER.IMS_PER_BATCH = batch_size
    cfg.SOLVER.BASE_LR = learning_rate
    cfg.SOLVER.MAX_ITER = max_iter
    cfg.SOLVER.STEPS = (int(max_iter * 0.7), int(max_iter * 0.9))  # Learning rate decay
    cfg.SOLVER.GAMMA = 0.1
    cfg.SOLVER.WARMUP_ITERS = min(100, max_iter // 10)
    cfg.SOLVER.CHECKPOINT_PERIOD = max_iter // 10
    
    # Model configuration
    cfg.MODEL.ROI_HEADS.NUM_CLASSES = num_classes
    cfg.MODEL.ROI_HEADS.BATCH_SIZE_PER_IMAGE = 128
    cfg.MODEL.ROI_HEADS.POSITIVE_FRACTION = 0.25
    
    # Input configuration
    cfg.INPUT.MIN_SIZE_TRAIN = (400, 500, 600, 700, 800)
    cfg.INPUT.MAX_SIZE_TRAIN = 1333
    cfg.INPUT.MIN_SIZE_TEST = 800
    cfg.INPUT.MAX_SIZE_TEST = 1333
    
    # Output configuration
    cfg.OUTPUT_DIR = output_dir
    os.makedirs(cfg.OUTPUT_DIR, exist_ok=True)
    
    # Test configuration - enable evaluation during training
    cfg.TEST.EVAL_PERIOD = max(50, max_iter // 4)  # Evaluate 4 times during training
    cfg.TEST.DETECTIONS_PER_IMAGE = 100
    
    # Optimize for full dataset training
    cfg.SOLVER.CHECKPOINT_PERIOD = max(500, max_iter // 10)  # More frequent checkpoints for large dataset
    cfg.SOLVER.MAX_CHECKPOINTS_TO_KEEP = 5  # Keep more checkpoints for large dataset
    
    # GPU memory optimization for full dataset
    cfg.MODEL.ROI_HEADS.BATCH_SIZE_PER_IMAGE = 512  # Increased for better performance
    cfg.MODEL.RPN.BATCH_SIZE_PER_IMAGE = 512  # Increased for better performance
    
    # Learning rate schedule for large dataset
    cfg.SOLVER.STEPS = (max_iter * 6 // 10, max_iter * 8 // 10)  # LR decay at 60% and 80%
    cfg.SOLVER.WARMUP_ITERS = max(100, max_iter // 20)  # Warmup for large dataset
    
    # Device configuration - Force GPU usage
    cfg.MODEL.DEVICE = "cuda"
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is not available! Please install CUDA-enabled PyTorch.")
    
    return cfg

def train_boulder_detection_model(
    tiles_dir: str,
    output_dir: str = "detectron2_boulder_model",
    max_iter: int = 1000,
    batch_size: int = 2,
    learning_rate: float = 0.00025,
    resume: bool = False
) -> str:
    """
    Train boulder detection model using Detectron2.
    
    Args:
        tiles_dir: Directory containing training tiles
        output_dir: Output directory for trained model
        max_iter: Maximum training iterations
        batch_size: Training batch size
        learning_rate: Learning rate
        resume: Whether to resume from checkpoint
        
    Returns:
        Path to the best trained model
    """
    print("🚀 Starting Detectron2 Boulder Detection Training")
    print("=" * 60)
    
    # Step 1: Register dataset
    print("\n📋 Step 1: Registering dataset...")
    train_dataset, val_dataset = register_lunar_boulder_dataset(tiles_dir)
    
    # Step 2: Setup configuration
    print("\n⚙️ Step 2: Setting up training configuration...")
    cfg = setup_training_config(
        train_dataset=train_dataset,
        val_dataset=val_dataset,
        output_dir=output_dir,
        max_iter=max_iter,
        batch_size=batch_size,
        learning_rate=learning_rate
    )
    
    print(f"   • Model: {cfg.MODEL.WEIGHTS.split('/')[-1]}")
    print(f"   • Device: {cfg.MODEL.DEVICE}")
    print(f"   • Batch size: {batch_size}")
    print(f"   • Learning rate: {learning_rate}")
    print(f"   • Max iterations: {max_iter}")
    
    # Step 3: Create trainer and train
    print("\n🧠 Step 3: Training model...")
    
    # Force GPU usage
    if torch.cuda.is_available():
        torch.cuda.set_device(0)  # Use first GPU
        print(f"🚀 Using GPU: {torch.cuda.get_device_name(0)}")
        print(f"💾 GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    else:
        raise RuntimeError("CUDA is not available! Cannot train on GPU.")
    
    trainer = Detectron2BoulderTrainer(cfg)
    trainer.resume_or_load(resume=resume)
    
    try:
        trainer.train()
        print("✅ Training completed successfully!")
    except Exception as e:
        print(f"❌ Training failed: {e}")
        print("💡 Try reducing batch size or using CPU training")
        return None
    
    # Step 4: Evaluation
    print("\n📊 Step 4: Evaluating trained model...")
    
    # Check if model was trained successfully
    model_path = os.path.join(cfg.OUTPUT_DIR, "model_final.pth")
    if not os.path.exists(model_path):
        print(f"❌ Model file not found: {model_path}")
        print("   Training may have failed or incomplete")
        return None
    
    # Load trained model for evaluation
    cfg.MODEL.WEIGHTS = model_path
    cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = 0.5
    
    try:
        # Create fresh model for evaluation
        model = build_model(cfg)
        model.eval()
        
        # Load trained weights
        checkpointer = DetectionCheckpointer(model)
        checkpointer.load(cfg.MODEL.WEIGHTS)
        
        # Setup evaluator
        evaluator = COCOEvaluator(val_dataset, cfg, False, output_dir=cfg.OUTPUT_DIR)
        val_loader = build_detection_test_loader(cfg, val_dataset)
        
        print(f"🔍 Running evaluation on {len(val_loader)} validation samples...")
        
        # Run evaluation
        evaluation_results = inference_on_dataset(model, val_loader, evaluator)
        
        print("\n📈 EVALUATION RESULTS:")
        print("-" * 40)
        
        # Extract key metrics
        if "bbox" in evaluation_results:
            bbox_results = evaluation_results["bbox"]
            print(f"📦 Bounding Box Detection:")
            print(f"   • AP (IoU=0.50:0.95): {bbox_results.get('AP', 0.0):.3f}")
            print(f"   • AP50 (IoU=0.50)   : {bbox_results.get('AP50', 0.0):.3f}")
            print(f"   • AP75 (IoU=0.75)   : {bbox_results.get('AP75', 0.0):.3f}")
            print(f"   • APs (small)       : {bbox_results.get('APs', 0.0):.3f}")
            print(f"   • APm (medium)      : {bbox_results.get('APm', 0.0):.3f}")
            print(f"   • APl (large)       : {bbox_results.get('APl', 0.0):.3f}")
        
        if "segm" in evaluation_results:
            segm_results = evaluation_results["segm"]
            print(f"\n🎭 Instance Segmentation:")
            print(f"   • AP (IoU=0.50:0.95): {segm_results.get('AP', 0.0):.3f}")
            print(f"   • AP50 (IoU=0.50)   : {segm_results.get('AP50', 0.0):.3f}")
            print(f"   • AP75 (IoU=0.75)   : {segm_results.get('AP75', 0.0):.3f}")
        
        # Save evaluation results
        eval_file = os.path.join(cfg.OUTPUT_DIR, "evaluation_results.json")
        import json
        with open(eval_file, 'w') as f:
            json.dump(evaluation_results, f, indent=2)
        print(f"\n💾 Evaluation results saved to: {eval_file}")
        
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
        print("   This might be due to annotation format issues")
        print("   Check that annotations are in proper COCO format")
        evaluation_results = {}
    
    print(f"\n✅ TRAINING & EVALUATION COMPLETE!")
    print(f"📁 Model saved to: {model_path}")
    print(f"📊 Logs and metrics: {cfg.OUTPUT_DIR}")
    print(f"📋 TensorBoard: tensorboard --logdir {cfg.OUTPUT_DIR}")
    
    return model_path

def test_detectron2_boulder_detection(
    model_path: str,
    test_image_path: str,
    output_path: str = "test_detection_result.jpg",
    confidence_threshold: float = 0.5
) -> None:
    """
    Test trained boulder detection model on a sample image.
    
    Args:
        model_path: Path to trained model
        test_image_path: Path to test image
        output_path: Path to save detection result
        confidence_threshold: Confidence threshold for detections
    """
    print(f"🔍 Testing boulder detection model...")
    
    # Setup configuration for inference
    cfg = get_cfg()
    cfg.merge_from_file(model_zoo.get_config_file("COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml"))
    cfg.MODEL.WEIGHTS = model_path
    cfg.MODEL.ROI_HEADS.NUM_CLASSES = 1
    cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = confidence_threshold
    cfg.MODEL.DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Create predictor
    predictor = DefaultPredictor(cfg)
    
    # Load test image
    test_image = cv2.imread(test_image_path)
    if test_image is None:
        print(f"❌ Could not load test image: {test_image_path}")
        return
    
    # Run inference
    outputs = predictor(test_image)
    
    # Visualize results
    v = Visualizer(
        test_image[:, :, ::-1],
        metadata=MetadataCatalog.get("lunar_boulders_train"),
        scale=1.0
    )
    out = v.draw_instance_predictions(outputs["instances"].to("cpu"))
    
    # Save result
    result_image = out.get_image()[:, :, ::-1]
    cv2.imwrite(output_path, result_image)
    
    # Print detection statistics
    instances = outputs["instances"].to("cpu")
    num_detections = len(instances)
    if num_detections > 0:
        scores = instances.scores.numpy()
        print(f"   • Detected {num_detections} boulders")
        print(f"   • Confidence range: {scores.min():.3f} - {scores.max():.3f}")
        print(f"   • Average confidence: {scores.mean():.3f}")
    else:
        print("   • No boulders detected")
    
    print(f"   • Result saved to: {output_path}")

def main():
    """Main training entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Detectron2 Lunar Boulder Detection Training')
    parser.add_argument('--tiles_dir', type=str, required=True,
                       help='Directory containing training tiles')
    parser.add_argument('--output_dir', type=str, default='detectron2_boulder_model',
                       help='Output directory for trained model')
    parser.add_argument('--max_iter', type=int, default=1000,
                       help='Maximum training iterations')
    parser.add_argument('--batch_size', type=int, default=2,
                       help='Training batch size')
    parser.add_argument('--learning_rate', type=float, default=0.00025,
                       help='Learning rate')
    parser.add_argument('--resume', action='store_true',
                       help='Resume training from checkpoint')
    parser.add_argument('--test_image', type=str,
                       help='Test image path for inference demo')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.tiles_dir):
        print(f"❌ Error: Tiles directory not found: {args.tiles_dir}")
        return
    
    # Train model
    model_path = train_boulder_detection_model(
        tiles_dir=args.tiles_dir,
        output_dir=args.output_dir,
        max_iter=args.max_iter,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        resume=args.resume
    )
    
    # Test model if test image provided
    if args.test_image and model_path and os.path.exists(model_path):
        test_detectron2_boulder_detection(
            model_path=model_path,
            test_image_path=args.test_image,
            output_path="detectron2_detection_result.jpg"
        )

if __name__ == "__main__":
    main()
