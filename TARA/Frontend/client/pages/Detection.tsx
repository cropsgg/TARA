import { useState } from "react";
import GalaxyBackground from "@/components/GalaxyBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Radar,
  Mountain,
  AlertTriangle,
  Eye,
  Camera,
  BarChart3,
  Target,
  Layers,
  Scan,
  CheckCircle,
  Clock,
  TrendingUp,
  Zap,
} from "lucide-react";

export default function Detection() {
  const [selectedModel, setSelectedModel] = useState<"landslide" | "boulder">(
    "landslide",
  );
  const [isScanning, setIsScanning] = useState(false);

  const modelMetrics = {
    landslide: {
      accuracy: 94.2,
      precision: 91.8,
      recall: 96.1,
      f1Score: 93.9,
      inferenceTime: "0.24s",
      confidence: 87.3,
    },
    boulder: {
      accuracy: 97.6,
      precision: 95.4,
      recall: 98.2,
      f1Score: 96.8,
      inferenceTime: "0.18s",
      confidence: 92.1,
    },
  };

  const detectionPipeline = [
    { step: 1, name: "Image Acquisition", status: "completed", time: "0.05s" },
    { step: 2, name: "Preprocessing", status: "completed", time: "0.12s" },
    { step: 3, name: "Feature Extraction", status: "completed", time: "0.31s" },
    { step: 4, name: "Object Detection", status: "processing", time: "0.24s" },
    { step: 5, name: "Classification", status: "pending", time: "0.18s" },
    { step: 6, name: "Post-processing", status: "pending", time: "0.09s" },
  ];

  return (
    <div className="min-h-screen relative pt-20">
      <GalaxyBackground />
      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Radar className="w-12 h-12 text-purple-400 mr-4" />
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Detection Approach
            </h1>
          </div>
          <p className="text-xl text-purple-200 max-w-3xl mx-auto">
            Advanced computer vision models for real-time landslide and boulder
            detection, ensuring safe navigation through complex lunar terrain
          </p>
        </div>

        {/* Model Selector */}
        <div className="mb-8">
          <Tabs
            value={selectedModel}
            onValueChange={(v) =>
              setSelectedModel(v as "landslide" | "boulder")
            }
          >
            <TabsList className="grid w-full grid-cols-2 bg-purple-900/40 border border-purple-500/20 mb-6">
              <TabsTrigger
                value="landslide"
                className="data-[state=active]:bg-purple-600"
              >
                <Mountain className="w-4 h-4 mr-2" />
                Landslide Detection
              </TabsTrigger>
              <TabsTrigger
                value="boulder"
                className="data-[state=active]:bg-purple-600"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Boulder Detection
              </TabsTrigger>
            </TabsList>

            <TabsContent value="landslide">
              <Card className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    <div className="flex items-center">
                      <Mountain className="w-5 h-5 mr-2 text-orange-400" />
                      Landslide Detection Model
                    </div>
                    <Badge
                      variant="outline"
                      className="border-orange-500/30 text-orange-400"
                    >
                      YOLOv8-Large
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-purple-200">
                        Model Architecture
                      </h4>
                      <div className="text-sm text-purple-300 space-y-1">
                        <div>• Backbone: CSPDarknet53</div>
                        <div>• Neck: PANet + FPN</div>
                        <div>• Head: YOLO Detection</div>
                        <div>• Input: 640x640 RGB</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-purple-200">
                        Training Data
                      </h4>
                      <div className="text-sm text-purple-300 space-y-1">
                        <div>• 47,892 annotated images</div>
                        <div>• Lunar terrain simulation</div>
                        <div>• Real Mars rover data</div>
                        <div>• Synthetic augmentation</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-purple-200">
                        Detection Classes
                      </h4>
                      <div className="text-sm text-purple-300 space-y-1">
                        <div>• Active landslide areas</div>
                        <div>• Unstable terrain</div>
                        <div>• Debris flows</div>
                        <div>• Slope instability</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="boulder">
              <Card className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    <div className="flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
                      Boulder Detection Model
                    </div>
                    <Badge
                      variant="outline"
                      className="border-red-500/30 text-red-400"
                    >
                      EfficientDet-D4
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-purple-200">
                        Model Architecture
                      </h4>
                      <div className="text-sm text-purple-300 space-y-1">
                        <div>• Backbone: EfficientNet-B4</div>
                        <div>• Neck: BiFPN</div>
                        <div>• Head: Class + Box</div>
                        <div>• Input: 512x512 RGB</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-purple-200">
                        Training Data
                      </h4>
                      <div className="text-sm text-purple-300 space-y-1">
                        <div>• 63,247 boulder images</div>
                        <div>• Various sizes & shapes</div>
                        <div>• Multi-lighting conditions</div>
                        <div>• Shadow augmentation</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-purple-200">
                        Detection Classes
                      </h4>
                      <div className="text-sm text-purple-300 space-y-1">
                        <div>• Large boulders (&gt;2m)</div>
                        <div>• Medium rocks (0.5-2m)</div>
                        <div>• Small obstacles (&lt;0.5m)</div>
                        <div>• Clustered formations</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Performance Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-b from-purple-900/40 to-indigo-900/40 border-purple-500/20">
            <CardContent className="p-6 text-center">
              <Target className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <div className="text-3xl font-bold text-white mb-2">
                {modelMetrics[selectedModel].accuracy}%
              </div>
              <div className="text-purple-200">Accuracy</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-purple-900/40 to-indigo-900/40 border-purple-500/20">
            <CardContent className="p-6 text-center">
              <Eye className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <div className="text-3xl font-bold text-white mb-2">
                {modelMetrics[selectedModel].precision}%
              </div>
              <div className="text-purple-200">Precision</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-purple-900/40 to-indigo-900/40 border-purple-500/20">
            <CardContent className="p-6 text-center">
              <Scan className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <div className="text-3xl font-bold text-white mb-2">
                {modelMetrics[selectedModel].recall}%
              </div>
              <div className="text-purple-200">Recall</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-purple-900/40 to-indigo-900/40 border-purple-500/20">
            <CardContent className="p-6 text-center">
              <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <div className="text-3xl font-bold text-white mb-2">
                {modelMetrics[selectedModel].inferenceTime}
              </div>
              <div className="text-purple-200">Inference Time</div>
            </CardContent>
          </Card>
        </div>

        {/* Detection Pipeline */}
        <Card className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500/20 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center">
                <Layers className="w-5 h-5 mr-2 text-blue-400" />
                Real-time Detection Pipeline
              </div>
              <Button
                onClick={() => setIsScanning(!isScanning)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {isScanning ? "Stop Scan" : "Start Scan"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-6 gap-4">
              {detectionPipeline.map((stage) => (
                <div
                  key={stage.step}
                  className={`p-4 rounded-lg border text-center transition-all ${
                    stage.status === "completed"
                      ? "border-green-500/30 bg-green-900/20"
                      : stage.status === "processing"
                        ? "border-blue-500/30 bg-blue-900/20 animate-pulse"
                        : "border-purple-500/20 bg-purple-900/20"
                  }`}
                >
                  <div className="text-2xl font-bold text-white mb-2">
                    {stage.step}
                  </div>
                  <div className="text-sm font-medium text-purple-200 mb-2">
                    {stage.name}
                  </div>
                  <div className="text-xs text-purple-300 mb-2">
                    {stage.time}
                  </div>
                  <div className="flex justify-center">
                    {stage.status === "completed" && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                    {stage.status === "processing" && (
                      <Clock className="w-5 h-5 text-blue-400 animate-spin" />
                    )}
                    {stage.status === "pending" && (
                      <Clock className="w-5 h-5 text-purple-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Detection Results */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-b from-purple-900/40 to-indigo-900/40 border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Camera className="w-5 h-5 mr-2 text-green-400" />
                Live Detection Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-black/50 rounded-lg border border-purple-500/20 flex items-center justify-center mb-4">
                <div className="text-center">
                  <Camera className="w-12 h-12 text-purple-400 mx-auto mb-2" />
                  <div className="text-purple-200">Camera Feed</div>
                  <div className="text-sm text-purple-300">
                    Resolution: 1920x1080
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-300">Objects Detected:</span>
                  <span className="text-white">
                    7 boulders, 2 landslide areas
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300">Processing FPS:</span>
                  <span className="text-white">24.3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300">Confidence:</span>
                  <span className="text-white">
                    {modelMetrics[selectedModel].confidence}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-purple-900/40 to-indigo-900/40 border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <BarChart3 className="w-5 h-5 mr-2 text-purple-400" />
                Detection Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-purple-200 mb-2">
                    <span>Model Confidence</span>
                    <span>{modelMetrics[selectedModel].confidence}%</span>
                  </div>
                  <Progress
                    value={modelMetrics[selectedModel].confidence}
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm text-purple-200 mb-2">
                    <span>F1 Score</span>
                    <span>{modelMetrics[selectedModel].f1Score}%</span>
                  </div>
                  <Progress
                    value={modelMetrics[selectedModel].f1Score}
                    className="h-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-purple-500/20">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">2,847</div>
                    <div className="text-xs text-purple-300">
                      Total Detections
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">99.2%</div>
                    <div className="text-xs text-purple-300">Success Rate</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Model Comparison */}
        <Card className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
              Model Performance Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-500/20">
                    <th className="text-left text-purple-200 pb-3">Metric</th>
                    <th className="text-center text-purple-200 pb-3">
                      Landslide Model
                    </th>
                    <th className="text-center text-purple-200 pb-3">
                      Boulder Model
                    </th>
                    <th className="text-center text-purple-200 pb-3">
                      Improvement
                    </th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  <tr className="border-b border-purple-500/10">
                    <td className="py-3">Accuracy</td>
                    <td className="text-center">
                      {modelMetrics.landslide.accuracy}%
                    </td>
                    <td className="text-center">
                      {modelMetrics.boulder.accuracy}%
                    </td>
                    <td className="text-center text-green-400">+3.4%</td>
                  </tr>
                  <tr className="border-b border-purple-500/10">
                    <td className="py-3">Precision</td>
                    <td className="text-center">
                      {modelMetrics.landslide.precision}%
                    </td>
                    <td className="text-center">
                      {modelMetrics.boulder.precision}%
                    </td>
                    <td className="text-center text-green-400">+3.6%</td>
                  </tr>
                  <tr className="border-b border-purple-500/10">
                    <td className="py-3">Recall</td>
                    <td className="text-center">
                      {modelMetrics.landslide.recall}%
                    </td>
                    <td className="text-center">
                      {modelMetrics.boulder.recall}%
                    </td>
                    <td className="text-center text-green-400">+2.1%</td>
                  </tr>
                  <tr>
                    <td className="py-3">Inference Time</td>
                    <td className="text-center">
                      {modelMetrics.landslide.inferenceTime}
                    </td>
                    <td className="text-center">
                      {modelMetrics.boulder.inferenceTime}
                    </td>
                    <td className="text-center text-green-400">-25%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
