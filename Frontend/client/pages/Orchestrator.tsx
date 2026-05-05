import { useState, useEffect } from "react";
import GalaxyBackground from "@/components/GalaxyBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOrchestrator } from "@/hooks/useOrchestrator";
import {
  Activity,
  Battery,
  Cpu,
  BarChart3,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Zap,
  Brain,
  Target,
  Clock,
  MapPin,
} from "lucide-react";

export default function Orchestrator() {
  const {
    status,
    isLoading,
    error,
    isConnected,
    refreshStatus,
    getSystemStats,
  } = useOrchestrator();

  const [systemStats, setSystemStats] = useState<any>(null);

  // Load system stats
  useEffect(() => {
    const loadStats = async () => {
      const stats = await getSystemStats();
      if (stats && stats.success) {
        setSystemStats(stats.stats);
      }
    };
    loadStats();
  }, [getSystemStats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return (
    <div className="min-h-screen relative pt-20">
      <GalaxyBackground />
      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Activity className="w-12 h-12 text-blue-400 mr-4" />
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Orchestrator Dashboard
            </h1>
          </div>
          <p className="text-xl text-blue-200 max-w-3xl mx-auto">
            Real-time monitoring and control of the lunar rover pathfinding system
          </p>
          
          {/* Connection Status */}
          <div className="mt-4 flex items-center justify-center gap-4">
            {isConnected ? (
              <Badge className="bg-green-600 text-white">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                Disconnected
              </Badge>
            )}
            <Button
              onClick={refreshStatus}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="border-blue-400/30 text-blue-200"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
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

        {/* System Status Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-b from-blue-900/40 to-cyan-900/40 border-blue-500/20">
            <CardContent className="p-6 text-center">
              <Battery className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <div className="text-3xl font-bold text-white mb-2">
                {status?.battery_status?.battery_percent?.toFixed(1) || '--'}%
              </div>
              <div className="text-blue-200">Battery Level</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-blue-900/40 to-cyan-900/40 border-blue-500/20">
            <CardContent className="p-6 text-center">
              <Cpu className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <div className="text-3xl font-bold text-white mb-2">
                {status?.system_stats?.total_missions || 0}
              </div>
              <div className="text-blue-200">Total Missions</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-blue-900/40 to-cyan-900/40 border-blue-500/20">
            <CardContent className="p-6 text-center">
              <Brain className="w-12 h-12 text-pink-400 mx-auto mb-4" />
              <div className="text-3xl font-bold text-white mb-2">
                {status?.system_stats?.ml_missions || 0}
              </div>
              <div className="text-blue-200">ML Missions</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-blue-900/40 to-cyan-900/40 border-blue-500/20">
            <CardContent className="p-6 text-center">
              <Target className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <div className="text-3xl font-bold text-white mb-2">
                {status?.system_stats?.heuristic_missions || 0}
              </div>
              <div className="text-blue-200">Heuristic Missions</div>
            </CardContent>
          </Card>
        </div>

        {/* Battery Status */}
        {status?.battery_status && (
          <Card className="mb-8 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Battery className="w-5 h-5 mr-2 text-green-400" />
                Battery Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-200">Battery Level</span>
                    <span className="text-white font-semibold">
                      {status.battery_status.battery_percent.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={status.battery_status.battery_percent} 
                    className="mb-4"
                  />
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-200">Power Efficiency</span>
                    <span className="text-white font-semibold">
                      {status.battery_status.power_efficiency_score.toFixed(2)}
                    </span>
                  </div>
                  <Progress 
                    value={status.battery_status.power_efficiency_score * 100} 
                    className="mb-4"
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Solar Input</span>
                    <Badge className="bg-yellow-600">
                      {status.battery_status.solar_input_wm2.toFixed(1)} W/m²
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Power Consumption</span>
                    <Badge className="bg-red-600">
                      {status.battery_status.power_consumption_w.toFixed(1)} W
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">ML Processing</span>
                    <Badge className={status.battery_status.can_run_ml ? "bg-green-600" : "bg-red-600"}>
                      {status.battery_status.can_run_ml ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Reason</span>
                    <span className="text-white text-sm">{status.battery_status.reason}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Statistics */}
        {systemStats && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-gradient-to-b from-blue-900/40 to-cyan-900/40 border-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <BarChart3 className="w-5 h-5 mr-2 text-purple-400" />
                  Mission Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Success Rate</span>
                    <Badge className="bg-green-600">
                      {systemStats.success_percentage?.toFixed(1) || 0}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">ML Usage</span>
                    <Badge className="bg-pink-600">
                      {systemStats.ml_percentage?.toFixed(1) || 0}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Heuristic Usage</span>
                    <Badge className="bg-yellow-600">
                      {systemStats.heuristic_percentage?.toFixed(1) || 0}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Avg Processing Time</span>
                    <span className="text-white">
                      {systemStats.average_processing_time?.toFixed(2) || 0}s
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-b from-blue-900/40 to-cyan-900/40 border-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                  Power Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Total Power Saved</span>
                    <span className="text-white font-semibold">
                      {systemStats.total_power_saved?.toFixed(3) || 0} kWh
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Total Processing Time</span>
                    <span className="text-white">
                      {systemStats.total_processing_time?.toFixed(2) || 0}s
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Successful Paths</span>
                    <Badge className="bg-green-600">
                      {systemStats.successful_paths || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Failed Paths</span>
                    <Badge className="bg-red-600">
                      {systemStats.failed_paths || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Available Observations */}
        {status?.available_observations && status.available_observations.length > 0 && (
          <Card className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <MapPin className="w-5 h-5 mr-2 text-cyan-400" />
                Available Chandrayaan-2 Observations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {status.available_observations.map((obs, index) => (
                  <Badge key={index} variant="outline" className="border-cyan-400/30 text-cyan-200">
                    {obs}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
