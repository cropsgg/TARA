import { useState, useEffect, useCallback } from 'react';
import { apiClient, MissionRequest, MissionResult, OrchestratorStatus } from '@/lib/api-client';

interface UseOrchestratorReturn {
  // State
  status: OrchestratorStatus | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  
  // Actions
  refreshStatus: () => Promise<void>;
  runMission: (mission: MissionRequest) => Promise<MissionResult | null>;
  runIntegratedMission: (mission: MissionRequest) => Promise<MissionResult | null>;
  getObservations: () => Promise<string[]>;
  getSystemStats: () => Promise<any>;
}

export function useOrchestrator(): UseOrchestratorReturn {
  const [status, setStatus] = useState<OrchestratorStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Check connection and get initial status
  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First check if API is reachable
      await apiClient.healthCheck();
      setIsConnected(true);
      
      // Get orchestrator status
      const statusResponse = await apiClient.getStatus();
      if (statusResponse.success && statusResponse.status) {
        setStatus(statusResponse.status);
      } else {
        throw new Error(statusResponse.error || 'Failed to get status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setIsConnected(false);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run a mission using the orchestrator
  const runMission = useCallback(async (mission: MissionRequest): Promise<MissionResult | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.runMission(mission);
      if (response.success && response.result) {
        return response.result;
      } else {
        throw new Error(response.error || 'Mission failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run a mission using the integrated system
  const runIntegratedMission = useCallback(async (mission: MissionRequest): Promise<MissionResult | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.runIntegratedMission(mission);
      if (response.success && response.result) {
        return response.result;
      } else {
        throw new Error(response.error || 'Integrated mission failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get available observations
  const getObservations = useCallback(async (): Promise<string[]> => {
    try {
      const response = await apiClient.getObservations();
      if (response.success && response.observations) {
        return response.observations;
      } else {
        throw new Error(response.error || 'Failed to get observations');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return [];
    }
  }, []);

  // Get system statistics
  const getSystemStats = useCallback(async () => {
    try {
      const stats = await apiClient.getSystemStats();
      return stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    }
  }, []);

  // Auto-refresh status on mount
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return {
    status,
    isLoading,
    error,
    isConnected,
    refreshStatus,
    runMission,
    runIntegratedMission,
    getObservations,
    getSystemStats,
  };
}
