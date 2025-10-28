import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  healthMonitor, 
  transferManager, 
  encryptionManager,
  type TransferRequest, 
  type TransferStatus, 
  type SubnetHealth,
  type ISROSubnetConfig,
  ISRO_SUBNET_CONFIG
} from '@/utils/avalanche';

export interface UseAvalancheSubnetReturn {
  // Station management
  stations: Record<string, ISROSubnetConfig>;
  stationHealth: Map<string, SubnetHealth>;
  selectedStation: string;
  setSelectedStation: (stationId: string) => void;
  
  // Transfer management
  activeTransfers: TransferStatus[];
  transferProgress: number;
  isTransferring: boolean;
  
  // Actions
  startTransfer: (fromStation: string, toStation: string, dataSize: number, priority: TransferRequest['priority']) => Promise<string>;
  stopTransfer: (transferId: string) => boolean;
  cancelTransfer: (transferId: string) => boolean;
  
  // UI state
  showSensitiveData: boolean;
  setShowSensitiveData: (show: boolean) => void;
  
  // Utilities
  isStationHealthy: (stationId: string) => boolean;
  getTransferRoute: (fromStation: string, toStation: string) => string[];
  formatDataSize: (bytes: number) => string;
  formatTime: (seconds: number) => string;
}

export const useAvalancheSubnet = (): UseAvalancheSubnetReturn => {
  const [stationHealth, setStationHealth] = useState<Map<string, SubnetHealth>>(new Map());
  const [selectedStation, setSelectedStation] = useState<string>('bangalore');
  const [activeTransfers, setActiveTransfers] = useState<TransferStatus[]>([]);
  const [transferProgress, setTransferProgress] = useState(0);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  
  const healthUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const transferUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize health monitoring
  useEffect(() => {
    const updateHealthData = () => {
      const healthData = healthMonitor.getHealthData();
      setStationHealth(healthData);
    };

    // Initial update with delay to ensure health monitor is initialized
    const initialUpdate = setTimeout(() => {
      updateHealthData();
    }, 1000);

    // Set up periodic updates
    healthUpdateInterval.current = setInterval(updateHealthData, 5000); // Every 5 seconds

    return () => {
      clearTimeout(initialUpdate);
      if (healthUpdateInterval.current) {
        clearInterval(healthUpdateInterval.current);
      }
    };
  }, []);

  // Initialize transfer monitoring
  useEffect(() => {
    const updateTransferData = () => {
      const transfers = transferManager.getAllTransfers();
      setActiveTransfers(transfers);
      
      // Update overall transfer progress
      const activeTransfer = transfers.find(t => t.status === 'processing');
      if (activeTransfer) {
        setTransferProgress(activeTransfer.progress);
        setIsTransferring(true);
      } else {
        setIsTransferring(false);
        setTransferProgress(0);
      }
    };

    // Initial update
    updateTransferData();

    // Set up periodic updates
    transferUpdateInterval.current = setInterval(updateTransferData, 1000); // Every second

    return () => {
      if (transferUpdateInterval.current) {
        clearInterval(transferUpdateInterval.current);
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      healthMonitor.cleanup();
    };
  }, []);

  const startTransfer = useCallback(async (
    fromStation: string, 
    toStation: string, 
    dataSize: number, 
    priority: TransferRequest['priority']
  ): Promise<string> => {
    try {
      const request: TransferRequest = {
        id: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromStation,
        toStation,
        dataSize,
        priority,
        encryptionType: 'AES-256',
        timestamp: Date.now(),
        checksum: encryptionManager.generateChecksum(new ArrayBuffer(dataSize))
      };

      const transferId = await transferManager.initiateTransfer(request);
      setIsTransferring(true);
      setTransferProgress(0);
      
      return transferId;
    } catch (error) {
      console.error('Failed to start transfer:', error);
      throw error;
    }
  }, []);

  const stopTransfer = useCallback((transferId: string): boolean => {
    // For now, just mark as stopped - in real implementation, this would stop the actual transfer
    const transfer = activeTransfers.find(t => t.requestId === transferId);
    if (transfer && transfer.status === 'processing') {
      transfer.status = 'failed';
      transfer.error = 'Transfer stopped by user';
      setActiveTransfers([...activeTransfers]);
      setIsTransferring(false);
      setTransferProgress(0);
      return true;
    }
    return false;
  }, [activeTransfers]);

  const cancelTransfer = useCallback((transferId: string): boolean => {
    const cancelled = transferManager.cancelTransfer(transferId);
    if (cancelled) {
      setActiveTransfers([...transferManager.getAllTransfers()]);
    }
    return cancelled;
  }, []);

  const isStationHealthy = useCallback((stationId: string): boolean => {
    return healthMonitor.isStationHealthy(stationId);
  }, []);

  const getTransferRoute = useCallback((fromStation: string, toStation: string): string[] => {
    if (fromStation === toStation) return [fromStation];
    
    // Simple routing logic - in real implementation, this would use network topology
    if (fromStation === 'bangalore' || toStation === 'bangalore') {
      return [fromStation, toStation];
    }
    
    return [fromStation, 'bangalore', toStation];
  }, []);

  const formatDataSize = useCallback((bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${remainingMinutes}m`;
    }
  }, []);

  return {
    // Station management
    stations: ISRO_SUBNET_CONFIG,
    stationHealth,
    selectedStation,
    setSelectedStation,
    
    // Transfer management
    activeTransfers,
    transferProgress,
    isTransferring,
    
    // Actions
    startTransfer,
    stopTransfer,
    cancelTransfer,
    
    // UI state
    showSensitiveData,
    setShowSensitiveData,
    
    // Utilities
    isStationHealthy,
    getTransferRoute,
    formatDataSize,
    formatTime
  };
};
