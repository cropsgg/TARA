import { useState, useEffect } from "react";
import GalaxyBackground from "@/components/GalaxyBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOrchestrator } from "@/hooks/useOrchestrator";
import { MissionRequest, MissionResult, apiClient } from "@/lib/api-client";
import {
  Brain,
  Zap,
  Activity,
  Route,
  Target,
  Settings,
  ArrowRight,
  Battery,
  Cpu,
  BarChart3,
  Play,
  MapPin,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

export default function PathFinder() {
  const [mode, setMode] = useState<"heuristic" | "ml">("heuristic");
  const [isRunning, setIsRunning] = useState(false);
  const [missionResult, setMissionResult] = useState<MissionResult | null>(null);
  const [observations, setObservations] = useState<string[]>([]);
  const [selectedObservation, setSelectedObservation] = useState<string>("");
  
  // Mission parameters
  const [missionName, setMissionName] = useState("Lunar Pathfinding Mission");
  const [startLon, setStartLon] = useState(41.406);
  const [startLat, setStartLat] = useState(-19.694);
  const [endLon, setEndLon] = useState(41.450);
  const [endLat, setEndLat] = useState(-19.720);

  // Use orchestrator hook
  const {
    status,
    isLoading,
    error,
    isConnected,
    refreshStatus,
    runMission,
    runIntegratedMission,
    getObservations,
  } = useOrchestrator();

  // Load observations on mount
  useEffect(() => {
    const loadObservations = async () => {
      const obs = await getObservations();
      setObservations(obs);
      if (obs.length > 0) {
        setSelectedObservation(obs[0]);
      }
    };
    loadObservations();
  }, [getObservations]);

  // Get energy level from status
  const energyLevel = status?.battery_status?.battery_percent || 75;

  const handleRunMission = async () => {
    if (!selectedObservation) {
      alert("Please select an observation");
      return;
    }

    setIsRunning(true);
    setMissionResult(null);

    try {
      const mission: MissionRequest = {
        name: missionName,
        image_path: `chandrayaan-2/${selectedObservation}.png`,
        csv_path: `chandrayaan-2/${selectedObservation}.csv`,
        start_lon: startLon,
        start_lat: startLat,
        end_lon: endLon,
        end_lat: endLat,
      };

      let result: MissionResult | null = null;
      
      if (mode === "ml") {
        result = await runMission(mission);
      } else {
        result = await runIntegratedMission(mission);
      }

      if (result) {
        setMissionResult(result);
      }
    } catch (err) {
      console.error("Mission failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen relative pt-20">
      <GalaxyBackground />
      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Brain className="w-12 h-12 text-purple-400 mr-4" />
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Path Finder
            </h1>
          </div>
          <p className="text-xl text-purple-200 max-w-3xl mx-auto">
            Energy-aware dual-mode navigation system optimizing rover path
            planning through intelligent switching between heuristic algorithms
            and full machine learning models
          </p>
          
          {/* Connection Status */}
          <div className="mt-4">
            {isConnected ? (
              <Badge className="bg-green-600 text-white">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected to Orchestrator
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-500/50 bg-red-900/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Mode Selector */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <Battery className="w-6 h-6 text-green-400" />
                  <div>
                    <div className="text-sm text-purple-200 mb-1">
                      Energy Level
                    </div>
                    <Progress value={energyLevel} className="w-32" />
                    <div className="text-xs text-purple-300 mt-1">
                      {energyLevel}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <Button
                    variant={mode === "heuristic" ? "default" : "outline"}
                    onClick={() => setMode("heuristic")}
                    className={
                      mode === "heuristic"
                        ? "bg-purple-600 hover:bg-purple-700"
                        : "border-purple-400/30 text-purple-200"
                    }
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Heuristic Mode
                  </Button>

                  <div className="text-purple-400">⇄</div>

                  <Button
                    variant={mode === "ml" ? "default" : "outline"}
                    onClick={() => setMode("ml")}
                    className={
                      mode === "ml"
                        ? "bg-purple-600 hover:bg-purple-700"
                        : "border-purple-400/30 text-purple-200"
                    }
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Full ML Mode
                  </Button>
                </div>

                <Button
                  onClick={handleRunMission}
                  disabled={isRunning || !isConnected}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running Mission...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Mission
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mission Configuration */}
        <Card className="mb-8 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <MapPin className="w-5 h-5 mr-2 text-blue-400" />
              Mission Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="mission-name" className="text-purple-200">Mission Name</Label>
                  <Input
                    id="mission-name"
                    value={missionName}
                    onChange={(e) => setMissionName(e.target.value)}
                    className="bg-gray-800/50 border-purple-500/30 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="observation" className="text-purple-200">Chandrayaan-2 Observation</Label>
                  <select
                    id="observation"
                    value={selectedObservation}
                    onChange={(e) => setSelectedObservation(e.target.value)}
                    className="w-full p-2 bg-gray-800/50 border border-purple-500/30 rounded-md text-white"
                  >
                    {observations.map((obs) => (
                      <option key={obs} value={obs}>{obs}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-lon" className="text-purple-200">Start Longitude</Label>
                    <Input
                      id="start-lon"
                      type="number"
                      step="0.001"
                      value={startLon}
                      onChange={(e) => setStartLon(parseFloat(e.target.value))}
                      className="bg-gray-800/50 border-purple-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="start-lat" className="text-purple-200">Start Latitude</Label>
                    <Input
                      id="start-lat"
                      type="number"
                      step="0.001"
                      value={startLat}
                      onChange={(e) => setStartLat(parseFloat(e.target.value))}
                      className="bg-gray-800/50 border-purple-500/30 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="end-lon" className="text-purple-200">End Longitude</Label>
                    <Input
                      id="end-lon"
                      type="number"
                      step="0.001"
                      value={endLon}
                      onChange={(e) => setEndLon(parseFloat(e.target.value))}
                      className="bg-gray-800/50 border-purple-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-lat" className="text-purple-200">End Latitude</Label>
                    <Input
                      id="end-lat"
                      type="number"
                      step="0.001"
                      value={endLat}
                      onChange={(e) => setEndLat(parseFloat(e.target.value))}
                      className="bg-gray-800/50 border-purple-500/30 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mode Details */}
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "heuristic" | "ml")}
          className="mb-8"
        >
          <TabsList className="grid w-full grid-cols-2 bg-purple-900/40 border border-purple-500/20">
            <TabsTrigger
              value="heuristic"
              className="data-[state=active]:bg-purple-600"
            >
              Heuristic Mode
            </TabsTrigger>
            <TabsTrigger
              value="ml"
              className="data-[state=active]:bg-purple-600"
            >
              Full ML Mode
            </TabsTrigger>
          </TabsList>

          <TabsContent value="heuristic" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-b from-purple-900/40 to-indigo-900/40 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                    Energy Efficiency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-purple-200">Power Consumption</span>
                      <Badge
                        variant="outline"
                        className="border-green-500/30 text-green-400"
                      >
                        Low
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-200">Processing Speed</span>
                      <Badge
                        variant="outline"
                        className="border-blue-500/30 text-blue-400"
                      >
                        Fast
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-200">Accuracy</span>
                      <Badge
                        variant="outline"
                        className="border-orange-500/30 text-orange-400"
                      >
                        Good
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-b from-purple-900/40 to-indigo-900/40 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Settings className="w-5 h-5 mr-2 text-purple-400" />
                    Algorithm Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-purple-200">
                    <div>• A* pathfinding with terrain cost weights</div>
                    <div>• Dynamic obstacle avoidance</div>
                    <div>• Energy-based distance optimization</div>
                    <div>• Real-time constraint adaptation</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ml" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-b from-purple-900/40 to-indigo-900/40 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Cpu className="w-5 h-5 mr-2 text-blue-400" />
                    ML Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-purple-200">Power Consumption</span>
                      <Badge
                        variant="outline"
                        className="border-red-500/30 text-red-400"
                      >
                        High
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-200">Processing Speed</span>
                      <Badge
                        variant="outline"
                        className="border-orange-500/30 text-orange-400"
                      >
                        Moderate
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-200">Accuracy</span>
                      <Badge
                        variant="outline"
                        className="border-green-500/30 text-green-400"
                      >
                        Excellent
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-b from-purple-900/40 to-indigo-900/40 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Brain className="w-5 h-5 mr-2 text-pink-400" />
                    Neural Networks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-purple-200">
                    <div>• Deep reinforcement learning (DQN)</div>
                    <div>• Convolutional terrain analysis</div>
                    <div>• Predictive energy modeling</div>
                    <div>• Multi-objective optimization</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Metrics Dashboard */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-b from-purple-900/40 to-indigo-900/40 border-purple-500/20">
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <div className="text-3xl font-bold text-white mb-2">94.2%</div>
              <div className="text-purple-200">Path Efficiency</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-purple-900/40 to-indigo-900/40 border-purple-500/20">
            <CardContent className="p-6 text-center">
              <Battery className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <div className="text-3xl font-bold text-white mb-2">23.4</div>
              <div className="text-purple-200">Hours Remaining</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-purple-900/40 to-indigo-900/40 border-purple-500/20">
            <CardContent className="p-6 text-center">
              <Route className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <div className="text-3xl font-bold text-white mb-2">847m</div>
              <div className="text-purple-200">Distance Planned</div>
            </CardContent>
          </Card>
        </div>

        {/* Energy Management */}
        <Card className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Zap className="w-5 h-5 mr-2 text-yellow-400" />
              Intelligent Energy Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-purple-200 mb-4">
                  Adaptive Mode Switching
                </h4>
                <div className="space-y-3 text-purple-200">
                  <div>• Automatic switching based on energy levels</div>
                  <div>• Terrain complexity analysis</div>
                  <div>• Mission priority considerations</div>
                  <div>• Real-time performance monitoring</div>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-purple-200 mb-4">
                  Energy Optimization
                </h4>
                <div className="space-y-3 text-purple-200">
                  <div>• Slope-aware path planning</div>
                  <div>• Solar charging integration</div>
                  <div>• Predictive power modeling</div>
                  <div>• Emergency conservation modes</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mission Results */}
        {missionResult && (
          <Card className="mb-8 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                Mission Results: {missionResult.mission_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-green-200 mb-4">Mission Statistics</h4>
                  <div className="space-y-2 text-green-200">
                    <div className="flex justify-between">
                      <span>Model Type:</span>
                      <Badge className="bg-blue-600">{missionResult.model_type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Path Status:</span>
                      <Badge className={missionResult.statistics.path_found ? "bg-green-600" : "bg-red-600"}>
                        {missionResult.path_status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Path Length:</span>
                      <span>{missionResult.statistics.path_length_km.toFixed(2)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Safety:</span>
                      <span>{missionResult.statistics.safety_percentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing Time:</span>
                      <span>{missionResult.processing_time.toFixed(2)}s</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-green-200 mb-4">Obstacle Detection</h4>
                  <div className="space-y-2 text-green-200">
                    <div className="flex justify-between">
                      <span>Total Obstacles:</span>
                      <span>{missionResult.statistics.total_obstacles}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Boulders:</span>
                      <span>{missionResult.statistics.boulders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Landslides:</span>
                      <span>{missionResult.statistics.landslides}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Path Points:</span>
                      <span>{missionResult.statistics.path_points}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Battery Status */}
              <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
                <h4 className="text-lg font-semibold text-green-200 mb-3">Battery Status</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Battery Level:</span>
                    <div className="text-green-400 font-semibold">
                      {missionResult.battery_status.battery_percent.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Solar Input:</span>
                    <div className="text-yellow-400 font-semibold">
                      {missionResult.battery_status.solar_input_wm2.toFixed(1)} W/m²
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Power Consumption:</span>
                    <div className="text-red-400 font-semibold">
                      {missionResult.battery_status.power_consumption_w.toFixed(1)} W
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">ML Processing:</span>
                    <div className={missionResult.battery_status.can_run_ml ? "text-green-400" : "text-red-400"}>
                      {missionResult.battery_status.can_run_ml ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Map Link */}
              {missionResult.folium_map_html && (
                <div className="mt-6 text-center">
                  <Button
                    onClick={() => window.open(apiClient.getMissionResultUrl(missionResult.folium_map_html!), '_blank')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    View Interactive Map
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
