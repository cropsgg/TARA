/**
 * React Hook for Zero-Knowledge Proof functionality
 * 
 * Provides ZKP operations for the TARA application including:
 * - Data integrity proofs
 * - Station authentication
 * - Transfer validation
 * - Mission completion proofs
 */

import { useState, useCallback, useEffect } from 'react';
import {
  zkpManager,
  DataIntegrityProof,
  StationAuthProof,
  TransferValidationProof,
  MissionCompletionProof,
  generateDataHash,
  generateStationSecret,
  generateRoverSecret,
  generateNonce
} from '@/utils/zkp';

export interface UseZKPReturn {
  // State
  isLoading: boolean;
  error: string | null;
  proofs: {
    dataIntegrity: DataIntegrityProof | null;
    stationAuth: StationAuthProof | null;
    transferValidation: TransferValidationProof | null;
    missionCompletion: MissionCompletionProof | null;
  };
  
  // Data Integrity Methods
  generateDataIntegrityProof: (data: string, stationId: string) => Promise<DataIntegrityProof | null>;
  verifyDataIntegrityProof: (proof: DataIntegrityProof) => Promise<boolean>;
  
  // Station Authentication Methods
  generateStationAuthProof: (stationId: string, credentials: string) => Promise<StationAuthProof | null>;
  verifyStationAuthProof: (proof: StationAuthProof) => Promise<boolean>;
  
  // Transfer Validation Methods
  generateTransferValidationProof: (
    transferId: string,
    dataSize: number,
    checksum: string,
    stationSecret: string
  ) => Promise<TransferValidationProof | null>;
  verifyTransferValidationProof: (proof: TransferValidationProof) => Promise<boolean>;
  
  // Mission Completion Methods
  generateMissionCompletionProof: (
    missionId: string,
    completionTime: number,
    successRate: number,
    dataIntegrity: boolean,
    roverSecret: string
  ) => Promise<MissionCompletionProof | null>;
  verifyMissionCompletionProof: (proof: MissionCompletionProof) => Promise<boolean>;
  
  // Utility Methods
  clearError: () => void;
  clearProofs: () => void;
  getProofStatus: () => {
    dataIntegrity: boolean;
    stationAuth: boolean;
    transferValidation: boolean;
    missionCompletion: boolean;
  };
}

export const useZKP = (): UseZKPReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofs, setProofs] = useState({
    dataIntegrity: null as DataIntegrityProof | null,
    stationAuth: null as StationAuthProof | null,
    transferValidation: null as TransferValidationProof | null,
    missionCompletion: null as MissionCompletionProof | null,
  });

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear all proofs
  const clearProofs = useCallback(() => {
    setProofs({
      dataIntegrity: null,
      stationAuth: null,
      transferValidation: null,
      missionCompletion: null,
    });
  }, []);

  // Get proof status
  const getProofStatus = useCallback(() => {
    return {
      dataIntegrity: proofs.dataIntegrity !== null,
      stationAuth: proofs.stationAuth !== null,
      transferValidation: proofs.transferValidation !== null,
      missionCompletion: proofs.missionCompletion !== null,
    };
  }, [proofs]);

  // Data Integrity Methods
  const generateDataIntegrityProof = useCallback(async (
    data: string,
    stationId: string
  ): Promise<DataIntegrityProof | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const timestamp = Date.now();
      const proof = await zkpManager.generateDataIntegrityProof(data, stationId, timestamp);
      
      setProofs(prev => ({
        ...prev,
        dataIntegrity: proof
      }));

      return proof;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate data integrity proof';
      setError(errorMessage);
      console.error('Error generating data integrity proof:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyDataIntegrityProof = useCallback(async (proof: DataIntegrityProof): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const isValid = await zkpManager.verifyDataIntegrityProof(proof);
      
      if (!isValid) {
        setError('Data integrity proof verification failed');
      }

      return isValid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify data integrity proof';
      setError(errorMessage);
      console.error('Error verifying data integrity proof:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Station Authentication Methods
  const generateStationAuthProof = useCallback(async (
    stationId: string,
    credentials: string
  ): Promise<StationAuthProof | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const timestamp = Date.now();
      const proof = await zkpManager.generateStationAuthProof(stationId, credentials, timestamp);
      
      setProofs(prev => ({
        ...prev,
        stationAuth: proof
      }));

      return proof;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate station auth proof';
      setError(errorMessage);
      console.error('Error generating station auth proof:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyStationAuthProof = useCallback(async (proof: StationAuthProof): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const isValid = await zkpManager.verifyStationAuthProof(proof);
      
      if (!isValid) {
        setError('Station auth proof verification failed');
      }

      return isValid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify station auth proof';
      setError(errorMessage);
      console.error('Error verifying station auth proof:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Transfer Validation Methods
  const generateTransferValidationProof = useCallback(async (
    transferId: string,
    dataSize: number,
    checksum: string,
    stationSecret: string
  ): Promise<TransferValidationProof | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const timestamp = Date.now();
      const proof = await zkpManager.generateTransferValidationProof(
        transferId,
        dataSize,
        checksum,
        timestamp,
        stationSecret
      );
      
      setProofs(prev => ({
        ...prev,
        transferValidation: proof
      }));

      return proof;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate transfer validation proof';
      setError(errorMessage);
      console.error('Error generating transfer validation proof:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyTransferValidationProof = useCallback(async (proof: TransferValidationProof): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const isValid = await zkpManager.verifyTransferValidationProof(proof);
      
      if (!isValid) {
        setError('Transfer validation proof verification failed');
      }

      return isValid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify transfer validation proof';
      setError(errorMessage);
      console.error('Error verifying transfer validation proof:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mission Completion Methods
  const generateMissionCompletionProof = useCallback(async (
    missionId: string,
    completionTime: number,
    successRate: number,
    dataIntegrity: boolean,
    roverSecret: string
  ): Promise<MissionCompletionProof | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const proof = await zkpManager.generateMissionCompletionProof(
        missionId,
        completionTime,
        successRate,
        dataIntegrity,
        roverSecret
      );
      
      setProofs(prev => ({
        ...prev,
        missionCompletion: proof
      }));

      return proof;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate mission completion proof';
      setError(errorMessage);
      console.error('Error generating mission completion proof:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyMissionCompletionProof = useCallback(async (proof: MissionCompletionProof): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const isValid = await zkpManager.verifyMissionCompletionProof(proof);
      
      if (!isValid) {
        setError('Mission completion proof verification failed');
      }

      return isValid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify mission completion proof';
      setError(errorMessage);
      console.error('Error verifying mission completion proof:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    isLoading,
    error,
    proofs,
    
    // Data Integrity Methods
    generateDataIntegrityProof,
    verifyDataIntegrityProof,
    
    // Station Authentication Methods
    generateStationAuthProof,
    verifyStationAuthProof,
    
    // Transfer Validation Methods
    generateTransferValidationProof,
    verifyTransferValidationProof,
    
    // Mission Completion Methods
    generateMissionCompletionProof,
    verifyMissionCompletionProof,
    
    // Utility Methods
    clearError,
    clearProofs,
    getProofStatus,
  };
};
