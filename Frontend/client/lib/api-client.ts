import {
  MissionRequest,
  MissionResult,
  MissionResponse,
  StatusResponse,
  ObservationsResponse,
  OrchestratorStatus,
} from '../../shared/api';

class ApiClient {
  private baseUrl: string;

  constructor() {
    // Use environment variable or default to localhost
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-production-api.com' 
      : 'http://localhost:8000';
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async getStatus(): Promise<StatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        status: data,
      };
    } catch (error) {
      console.error('Failed to get status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async runMission(mission: MissionRequest): Promise<MissionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/run-mission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mission),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        result: data,
      };
    } catch (error) {
      console.error('Failed to run mission:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async runIntegratedMission(mission: MissionRequest): Promise<MissionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/run-integrated-mission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mission),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        result: data,
      };
    } catch (error) {
      console.error('Failed to run integrated mission:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getObservations(): Promise<ObservationsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/observations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        observations: data.observations || data,
      };
    } catch (error) {
      console.error('Failed to get observations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getSystemStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/system-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get system stats:', error);
      throw error;
    }
  }

  getMissionResultUrl(foliumMapHtml: string): string {
    // Create a data URL for the folium map HTML
    const blob = new Blob([foliumMapHtml], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Re-export types for convenience
export type {
  MissionRequest,
  MissionResult,
  MissionResponse,
  StatusResponse,
  ObservationsResponse,
  OrchestratorStatus,
} from '../../shared/api';
