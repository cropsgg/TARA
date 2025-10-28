import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Shield,
  Network, 
  Server, 
  Building2, 
  Rocket, 
  Hash, 
  Key, 
  Users, 
  Eye, 
  EyeOff, 
  Play, 
  Square, 
  X, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3,
  FileText,
  Smartphone,
  Globe,
  CheckCircle
} from 'lucide-react';
import { useAvalancheSubnet } from '@/hooks/useAvalancheSubnet';
import { useSmartContracts } from '@/hooks/useSmartContracts';
import { DEPLOYED_CONTRACTS } from '@/utils/avalanche';

const DataTransfer: React.FC = () => {
  const {
    stationHealth,
    selectedStation,
    activeTransfers,
    transferProgress,
    isTransferring,
    showSensitiveData,
    startTransfer,
    stopTransfer,
    cancelTransfer,
    isStationHealthy,
    getTransferRoute,
    formatDataSize,
    formatTime,
    stations,
    setSelectedStation,
    setShowSensitiveData
  } = useAvalancheSubnet();

  const {
    contractStats,
    isLoading: contractsLoading,
    error: contractsError,
    setError: setContractsError,
    userBalance,
    stakeTokens,
    stakeAsValidator,
    claimRewards,
    initiateDataTransfer,
    completeDataTransfer,
    registerStation,
    addValidator,
    refreshStats,
    connectWallet,
    getUserBalance
  } = useSmartContracts();

  const [transferForm, setTransferForm] = useState({
    fromStation: 'bangalore',
    toStation: 'chennai',
    dataSize: 1024 * 1024 * 100, // 100MB
    priority: 'medium' as const,
    encryptionType: 'AES-256' as const
  });

  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [stakeAmount, setStakeAmount] = useState('1000');
  const [newStationAddress, setNewStationAddress] = useState('');
  const [newStationName, setNewStationName] = useState('');

  const handleTransfer = async () => {
    try {
      if (!walletConnected) {
        const address = await connectWallet();
        setWalletAddress(address);
        setWalletConnected(true);
      }

      // Use smart contract for data transfer
      const toAddress = stations[transferForm.toStation]?.validators[0] || '0x0000000000000000000000000000000000000000';
      const transferId = await initiateDataTransfer(
        toAddress,
        `Mission data from ${transferForm.fromStation} to ${transferForm.toStation}`,
        transferForm.dataSize
      );

      // Also start the UI transfer simulation
      startTransfer(
        transferForm.fromStation,
        transferForm.toStation,
        transferForm.dataSize,
        transferForm.priority
      );

      console.log(`Smart contract transfer initiated with ID: ${transferId}`);
    } catch (error) {
      console.error('Failed to initiate transfer:', error);
    }
  };

  const handleConnectWallet = async () => {
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      setWalletConnected(true);
      
      // Get user balance after connecting
      await getUserBalance();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleStakeTokens = async () => {
    try {
      const success = await stakeTokens(stakeAmount);
      if (success) {
        console.log(`Successfully staked ${stakeAmount} ISRO tokens`);
        await refreshStats();
        // Refresh user balance
        await getUserBalance();
      }
    } catch (error) {
      console.error('Failed to stake tokens:', error);
    }
  };

  const handleStakeAsValidator = async () => {
    try {
      const success = await stakeAsValidator(stakeAmount);
      if (success) {
        console.log(`Successfully staked ${stakeAmount} ISRO tokens as validator`);
        await refreshStats();
        // Refresh user balance
        await getUserBalance();
      }
    } catch (error) {
      console.error('Failed to stake as validator:', error);
    }
  };

  const handleClaimRewards = async () => {
    try {
      const success = await claimRewards();
      if (success) {
        console.log('Successfully claimed rewards');
        await refreshStats();
        // Refresh user balance
        await getUserBalance();
      }
    } catch (error) {
      console.error('Failed to claim rewards:', error);
    }
  };

  const handleRegisterStation = async () => {
    try {
      if (!newStationAddress || !newStationName) {
        alert('Please enter both station address and name');
        return;
      }
      
      const success = await registerStation(newStationAddress, newStationName);
      if (success) {
        console.log(`Successfully registered station: ${newStationName}`);
        setNewStationAddress('');
        setNewStationName('');
        await refreshStats();
      }
    } catch (error) {
      console.error('Failed to register station:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-purple-400 mr-4" />
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Avalanche Subnet Data Transfer
            </h1>
          </div>
          <p className="text-xl text-purple-200 max-w-4xl mx-auto">
            Secure, immutable data transmission through ISRO's private Avalanche subnet network.
            Military-grade encryption ensures data remains confidential within the closed network.
          </p>
          
          {/* Deployment Status */}
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-900/30 border border-green-500/30">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">
                Subnet Deployed on Avalanche Fuji Testnet
              </span>
            </div>
          </div>

          {/* Contract Status */}
          <div className="mt-4 flex justify-center space-x-4">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30">
              <CheckCircle className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-blue-400 text-xs">Smart Contracts Deployed</span>
            </div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/30">
              <CheckCircle className="w-4 h-4 text-purple-400 mr-2" />
              <span className="text-purple-400 text-xs">4 Validators Active</span>
            </div>
            {contractStats && (
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-900/30 border border-green-500/30">
                <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                <span className="text-green-400 text-xs">{contractStats.totalTransfers} Transfers</span>
              </div>
            )}
          </div>

          {/* Wallet Connection */}
          <div className="mt-6 flex flex-col items-center space-y-4">
            {!walletConnected ? (
              <div className="text-center max-w-md">
                <Button 
                  onClick={handleConnectWallet}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                  disabled={contractsLoading}
                >
                  {contractsLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Connect Wallet
                    </>
                  )}
                </Button>
                <p className="text-xs text-purple-300 mt-2">
                  Connect MetaMask or use demo wallet for testing
                </p>
                <div className="mt-3 text-xs text-purple-400 space-y-1">
                  <div>• Make sure MetaMask is installed</div>
                  <div>• Approve network switch to Fuji Testnet</div>
                  <div>• Approve wallet connection request</div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-900/30 border border-green-500/30">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  <span className="text-green-400 text-sm font-medium">
                    Wallet Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                </div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30">
                  <Globe className="w-3 h-3 text-blue-400 mr-2" />
                  <span className="text-blue-400 text-xs">Fuji Testnet (43113)</span>
                </div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/30">
                  <Hash className="w-3 h-3 text-purple-400 mr-2" />
                  <span className="text-purple-400 text-xs">Balance: {parseFloat(userBalance).toFixed(2)} ISRO</span>
                </div>
                <Button 
                  onClick={() => window.location.reload()}
                  size="sm"
                  variant="outline"
                  className="mt-2 border-green-500/30 text-green-200 hover:bg-green-900/30"
                >
                  Disconnect
                </Button>
              </div>
            )}
            
            {contractsError && (
              <div className="max-w-md p-4 bg-red-900/30 border border-red-500/30 rounded-lg text-red-200 text-sm">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="font-semibold">Connection Error</span>
                </div>
                <div className="mb-3 text-xs">
                  {contractsError}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => window.location.reload()} 
                    size="sm" 
                    variant="outline"
                    className="border-red-500/30 text-red-200 hover:bg-red-900/30"
                  >
                    Retry
                  </Button>
                  <Button 
                    onClick={() => setContractsError(null)} 
                    size="sm" 
                    variant="outline"
                    className="border-red-500/30 text-red-200 hover:bg-red-900/30"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
            
            {contractsLoading && (
              <div className="max-w-md p-3 bg-blue-900/30 border border-blue-500/30 rounded text-blue-200 text-sm text-center">
                <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full inline-block mr-2"></div>
                Loading contract data...
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-purple-900/30 border border-purple-500/30">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">Overview</TabsTrigger>
            <TabsTrigger value="transfer" className="data-[state=active]:bg-purple-600">Data Transfer</TabsTrigger>
            <TabsTrigger value="contracts" className="data-[state=active]:bg-purple-600">Smart Contracts</TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-purple-600">Monitoring</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* ISRO Stations Overview */}
            <Card className="bg-purple-900/20 border-purple-500/30">
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-purple-200">
                  <div className="flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    ISRO Ground Stations
                  </div>
                  <div className="flex items-center text-xs text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    Monitoring Active
                  </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(stations).map(([id, station]) => (
                    <div
                      key={id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedStation === id
                          ? 'border-purple-400 bg-purple-800/30'
                          : 'border-purple-500/30 bg-purple-800/20 hover:border-purple-400/50'
                      }`}
                      onClick={() => setSelectedStation(id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-purple-200 text-sm">{station.name}</h3>
                  <Badge
                          variant={isStationHealthy(id) ? 'default' : 'destructive'}
                          className={`text-xs ${isStationHealthy(id) ? 'bg-green-600' : 'bg-red-600'}`}
                  >
                          {isStationHealthy(id) ? 'Healthy' : 'Unhealthy'}
                  </Badge>
                </div>

                      <div className="text-xs text-purple-300 space-y-2">
                        <div className="break-all">
                          <span className="text-purple-400">Subnet ID:</span>
                          <div className="font-mono text-xs mt-1 break-all">
                            {station.subnetId.slice(0, 20)}...
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-400">Validators:</span>
                          <span className="text-white">{station.validators.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-400">Min Stake:</span>
                          <span className="text-white">{parseInt(station.minStake) / 1e18} AVAX</span>
                  </div>
                </div>

                      {selectedStation === id && (
                        <div className="mt-4 p-3 bg-purple-800/30 rounded border border-purple-500/30">
                          <div className="text-xs space-y-1">
                            <div className="break-all">
                              <span className="text-purple-400">Full Subnet ID:</span>
                              <div className="font-mono text-xs mt-1 break-all text-purple-200">
                                {station.subnetId}
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-purple-400">Chain ID:</span>
                              <span className="text-purple-200">{station.chainId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-purple-400">Last Block:</span>
                              <span className="text-purple-200">{station.lastBlock}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-purple-400">Network:</span>
                              <span className="text-purple-200">Avalanche Fuji Testnet</span>
                            </div>
                          </div>
                        </div>
                    )}
                  </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Avalanche Subnet Architecture */}
            <Card className="bg-purple-900/20 border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-200">
                  <Network className="w-5 h-5 mr-2" />
                  Subnet Architecture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Data Flow */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-purple-200">Data Flow</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Rocket className="w-5 h-5 text-blue-400" />
                        <span className="text-purple-300">Lunar Rover</span>
                        <span className="text-white">→</span>
                        <span className="text-purple-300">Satellite Relay</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Server className="w-5 h-5 text-green-400" />
                        <span className="text-purple-300">Satellite Relay</span>
                        <span className="text-white">→</span>
                        <span className="text-purple-300">ISRO Subnet</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Hash className="w-5 h-5 text-purple-400" />
                        <span className="text-purple-300">ISRO Subnet</span>
                        <span className="text-white">→</span>
                        <span className="text-purple-300">Immutable Storage</span>
                  </div>
                </div>
              </div>

                  {/* ISRO Network */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-purple-200">ISRO Network</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-purple-300">Network Type:</span>
                        <Badge variant="outline" className="border-purple-500/30 text-purple-200">
                          Private Subnet
                        </Badge>
                  </div>
                      <div className="flex items-center justify-between">
                        <span className="text-purple-300">Validators:</span>
                        <Badge variant="outline" className="border-purple-500/30 text-purple-200">
                          4 Active
                  </Badge>
                </div>
                      <div className="flex items-center justify-between">
                        <span className="text-purple-300">Consensus:</span>
                        <Badge variant="outline" className="border-purple-500/30 text-purple-200">
                          Avalanche
                        </Badge>
                  </div>
                </div>
                  </div>

                  {/* Subnet Details */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-purple-200">Subnet Configuration</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="flex flex-col">
                        <span className="text-purple-300">Network Type:</span>
                        <span className="text-white">Private Subnet</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-purple-300">Consensus:</span>
                        <span className="text-white">Avalanche</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-purple-300">Validators:</span>
                        <span className="text-white">4 Active</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-purple-300">Block Time:</span>
                        <span className="text-white">~2 seconds</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-purple-300">Finality:</span>
                        <span className="text-white">~3 seconds</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-purple-300">Status:</span>
                        <span className="text-green-400">Deployed</span>
                </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          {/* Data Transfer Tab */}
          <TabsContent value="transfer" className="space-y-6">
            {/* Transfer Control */}
            <Card className="bg-purple-900/20 border-purple-500/30">
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-purple-200">
                <div className="flex items-center">
                    <Rocket className="w-5 h-5 mr-2" />
                    Secure Data Transfer
                </div>
                  <div className="flex space-x-2">
                <Button
                      onClick={() => setShowSensitiveData(!showSensitiveData)}
                  size="sm"
                      variant="outline"
                      className="border-purple-500/30 text-purple-200"
                >
                      {showSensitiveData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                  </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div>
                    <Label htmlFor="fromStation" className="text-purple-300">From Station</Label>
                    <Select value={transferForm.fromStation} onValueChange={(value) => setTransferForm({...transferForm, fromStation: value})}>
                      <SelectTrigger className="bg-purple-800/30 border-purple-500/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-purple-800 border-purple-500">
                        {Object.entries(stations).map(([id, station]) => (
                          <SelectItem key={id} value={id} className="text-white">
                            {station.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="toStation" className="text-purple-300">To Station</Label>
                    <Select value={transferForm.toStation} onValueChange={(value) => setTransferForm({...transferForm, toStation: value})}>
                      <SelectTrigger className="bg-purple-800/30 border-purple-500/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-purple-800 border-purple-500">
                        {Object.entries(stations).map(([id, station]) => (
                          <SelectItem key={id} value={id} className="text-white">
                            {station.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                <div>
                    <Label htmlFor="dataSize" className="text-purple-300">Data Size (bytes)</Label>
                    <Input
                      id="dataSize"
                      type="number"
                      value={transferForm.dataSize}
                      onChange={(e) => setTransferForm({...transferForm, dataSize: parseInt(e.target.value)})}
                      className="bg-purple-800/30 border-purple-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority" className="text-purple-300">Priority</Label>
                    <Select value={transferForm.priority} onValueChange={(value: any) => setTransferForm({...transferForm, priority: value})}>
                      <SelectTrigger className="bg-purple-800/30 border-purple-500/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-purple-800 border-purple-500">
                        <SelectItem value="low" className="text-white">Low</SelectItem>
                        <SelectItem value="medium" className="text-white">Medium</SelectItem>
                        <SelectItem value="high" className="text-white">High</SelectItem>
                        <SelectItem value="critical" className="text-white">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                  <div>
                    <Label htmlFor="encryptionType" className="text-purple-300">Encryption</Label>
                    <Select value={transferForm.encryptionType} onValueChange={(value: any) => setTransferForm({...transferForm, encryptionType: value})}>
                      <SelectTrigger className="bg-purple-800/30 border-purple-500/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-purple-800 border-purple-500">
                        <SelectItem value="AES-256" className="text-white">AES-256</SelectItem>
                        <SelectItem value="ChaCha20-Poly1305" className="text-white">ChaCha20-Poly1305</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="route" className="text-purple-300">Route</Label>
                    <Input
                      id="route"
                      value={getTransferRoute(transferForm.fromStation, transferForm.toStation).join(" → ")}
                      readOnly
                      className="bg-purple-800/30 border-purple-500/30 text-white"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  {!isTransferring ? (
                    <Button onClick={handleTransfer} className="bg-purple-600 hover:bg-purple-700">
                      <Play className="w-4 h-4 mr-2" />
                      Start Transfer
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => stopTransfer("current")} variant="outline" className="border-purple-500/30 text-purple-200">
                        <Square className="w-4 h-4 mr-2" />
                        Pause
                      </Button>
                      <Button onClick={() => cancelTransfer("current")} variant="outline" className="border-red-500/30 text-red-200">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>

                {/* Transfer Progress */}
                {isTransferring && (
                  <>
                    <div className="mt-6">
                      <div className="flex justify-between text-sm text-purple-200 mb-2">
                        <span>Mission Data Package #{Math.floor(Math.random() * 10000)}</span>
                        <span>{transferProgress}%</span>
                      </div>
                      <Progress value={transferProgress} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                      <div>
                        <span className="text-purple-300">Size:</span>
                        <span className="text-white ml-2">{formatDataSize(transferForm.dataSize)}</span>
                      </div>
                      <div>
                        <span className="text-purple-300">Route:</span>
                        <span className="text-white ml-2">
                          {getTransferRoute(transferForm.fromStation, transferForm.toStation).join(" → ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-purple-300">ETA:</span>
                        <span className="text-white ml-2">Calculating...</span>
                      </div>
                      <div>
                        <span className="text-purple-300">Encryption:</span>
                        <span className="text-white ml-2">{transferForm.encryptionType}</span>
                </div>
              </div>
                  </>
                )}
            </CardContent>
          </Card>

            {/* Security Status */}
            <Card className="bg-purple-900/20 border-purple-500/30">
            <CardHeader>
                <CardTitle className="flex items-center text-purple-200">
                  <Shield className="w-5 h-5 mr-2" />
                Security Status
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-900/30 border border-green-500/30 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-200 font-semibold">Avalanche Subnet Verification</span>
                    </div>
                    <p className="text-sm text-green-300">All validators confirmed</p>
                </div>
                  <div className="p-4 bg-green-900/30 border border-green-500/30 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-200 font-semibold">Private Network Access</span>
                </div>
                    <p className="text-sm text-green-300">ISRO-only subnet</p>
                </div>
                  <div className="p-4 bg-green-900/30 border border-green-500/30 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-200 font-semibold">Validator Consensus</span>
                    </div>
                    <p className="text-sm text-green-300">4/4 validators active</p>
                  </div>
                  <div className="p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-200 font-semibold">Zero-Knowledge Proofs</span>
                    </div>
                    <p className="text-sm text-yellow-300">Implementation pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          {/* Smart Contracts Tab */}
          <TabsContent value="contracts" className="space-y-6">
            {/* Contract Overview */}
            <Card className="bg-purple-900/20 border-purple-500/30">
          <CardHeader>
                <CardTitle className="flex items-center text-purple-200">
                  <FileText className="w-5 h-5 mr-2" />
                  Deployed Smart Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* ISRO Token Contract */}
                  <div className="p-4 bg-purple-800/30 border border-purple-500/30 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <Hash className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-blue-200">ISRO Token Contract</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-purple-300">Address:</span>
                        <span className="text-white font-mono text-xs break-all">{DEPLOYED_CONTRACTS.isroToken}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Name:</span>
                        <span className="text-white">ISRO Lunar Mission Token</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Symbol:</span>
                        <span className="text-white">ISRO</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Supply:</span>
                        <span className="text-white">{contractStats?.totalStaked || '1,000,000,000'} ISRO</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Status:</span>
                        <Badge className="bg-green-600">Deployed</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Data Transfer Contract */}
                  <div className="p-4 bg-purple-800/30 border border-purple-500/30 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <Server className="w-5 h-5 text-green-400" />
                      <h3 className="text-lg font-semibold text-green-200">Data Transfer Contract</h3>
                    </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-purple-300">Address:</span>
                        <span className="text-white font-mono text-xs break-all">{DEPLOYED_CONTRACTS.isroDataTransfer}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Min Stake:</span>
                        <span className="text-white">2,000,000 AVAX</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Timeout:</span>
                        <span className="text-white">1 hour</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Max Data:</span>
                        <span className="text-white">100 GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Total Transfers:</span>
                        <span className="text-white">{contractStats?.totalTransfers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Status:</span>
                        <Badge className="bg-green-600">Deployed</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contract Functions */}
            <Card className="bg-purple-900/20 border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-200">
                  <Smartphone className="w-5 h-5 mr-2" />
                  Interactive Contract Functions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-purple-200 mb-3">Token Functions</h4>
                    <div className="space-y-4">
                      <div className="p-4 bg-purple-800/30 rounded border border-purple-500/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-purple-300 font-medium">Stake Tokens</span>
                          <Button 
                            onClick={handleStakeTokens}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                            disabled={!walletConnected || contractsLoading}
                          >
                            Stake
                          </Button>
                        </div>
                        <Input
                          type="number"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          placeholder="Amount to stake"
                          className="bg-purple-700/30 border-purple-500/30 text-white"
                        />
                      </div>
                      
                      <div className="p-4 bg-purple-800/30 rounded border border-purple-500/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-purple-300 font-medium">Stake as Validator</span>
                          <Button 
                            onClick={handleStakeAsValidator}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={!walletConnected || contractsLoading}
                          >
                            Stake as Validator
                          </Button>
                        </div>
                        <p className="text-xs text-purple-400">Minimum 10,000 ISRO tokens required</p>
                      </div>
                      
                      <div className="p-4 bg-purple-800/30 rounded border border-purple-500/30">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-300 font-medium">Claim Rewards</span>
                          <Button 
                            onClick={handleClaimRewards}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={!walletConnected || contractsLoading}
                          >
                            Claim
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-purple-200 mb-3">Transfer Functions</h4>
                    <div className="space-y-4">
                      <div className="p-4 bg-purple-800/30 rounded border border-purple-500/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-purple-300 font-medium">Initiate Transfer</span>
                          <Button 
                            onClick={handleTransfer}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                            disabled={!walletConnected || contractsLoading}
                          >
                            Start Transfer
                          </Button>
                        </div>
                        <p className="text-xs text-purple-400">Uses smart contract for data transfer</p>
                      </div>
                      
                      <div className="p-4 bg-purple-800/30 rounded border border-purple-500/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-purple-300 font-medium">Register Station</span>
                          <Button 
                            onClick={handleRegisterStation}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={!walletConnected || contractsLoading}
                          >
                            Register
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Input
                            type="text"
                            value={newStationAddress}
                            onChange={(e) => setNewStationAddress(e.target.value)}
                            placeholder="Station address (0x...)"
                            className="bg-purple-700/30 border-purple-500/30 text-white text-xs"
                          />
                          <Input
                            type="text"
                            value={newStationName}
                            onChange={(e) => setNewStationName(e.target.value)}
                            placeholder="Station name"
                            className="bg-purple-700/30 border-purple-500/30 text-white text-xs"
                          />
                        </div>
                        <p className="text-xs text-purple-400 mt-2">Add new ISRO station to the network</p>
                      </div>
                      
                      <div className="p-4 bg-purple-800/30 rounded border border-purple-500/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-purple-300 font-medium">Refresh Stats</span>
                          <Button 
                            onClick={refreshStats}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={contractsLoading}
                          >
                            Refresh
                          </Button>
                        </div>
                        <p className="text-xs text-purple-400">Update contract statistics</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {contractsError && (
                  <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded text-red-200 text-sm">
                    Error: {contractsError}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            {/* Network Health */}
            <Card className="bg-purple-900/20 border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-200">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Network Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(stationHealth).map(([stationId, health]) => (
                    <div key={stationId} className="p-4 bg-purple-800/30 border border-purple-500/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-purple-200">{stations[stationId].name}</h4>
                        <Badge
                          variant={health.uptime > 0.95 ? 'default' : 'destructive'}
                          className={health.uptime > 0.95 ? 'bg-green-600' : 'bg-red-600'}
                        >
                          {Math.round(health.uptime * 100)}%
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-purple-300">
                        <div>Consensus: {Math.round(health.consensusRate * 100)}%</div>
                        <div>Latency: {Math.round(health.networkLatency)}ms</div>
                        <div>Throughput: {Math.round(health.dataThroughput)} MB/s</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

            {/* Active Transfers */}
            <Card className="bg-purple-900/20 border-purple-500/30">
            <CardHeader>
                <CardTitle className="flex items-center text-purple-200">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Active Transfers
              </CardTitle>
            </CardHeader>
            <CardContent>
                {activeTransfers.length === 0 ? (
                  <div className="text-center py-8 text-purple-300">
                    <Rocket className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                    <p>No active transfers</p>
                    <p className="text-sm">Start a new transfer to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeTransfers.map((transfer) => (
                      <div key={transfer.requestId} className="p-4 bg-purple-800/30 border border-purple-500/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-purple-200 font-semibold">Transfer #{transfer.requestId.slice(0, 8)}</span>
                          <Badge
                            variant={transfer.status === 'completed' ? 'default' : 'secondary'}
                            className={transfer.status === 'completed' ? 'bg-green-600' : 'bg-purple-600'}
                          >
                            {transfer.status}
                          </Badge>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-purple-300">Route:</span>
                            <span className="text-white ml-2">{transfer.currentStation} → {transfer.nextStation}</span>
                </div>
                  <div>
                            <span className="text-purple-300">Progress:</span>
                            <span className="text-white ml-2">{transfer.progress}%</span>
                  </div>
                  <div>
                            <span className="text-purple-300">ETA:</span>
                            <span className="text-white ml-2">{formatTime(transfer.estimatedTime)}</span>
                          </div>
                        </div>
                        {transfer.status === 'failed' && transfer.error && (
                          <div className="mt-2 p-2 bg-red-900/30 border border-red-500/30 rounded text-red-200 text-sm">
                            Error: {transfer.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Subnet Connection Details */}
        <Card className="mt-8 bg-purple-900/20 border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center text-purple-200">
              <Globe className="w-5 h-5 mr-2" />
              Subnet Connection Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <span className="text-purple-300">Network:</span>
                <span className="text-white ml-2">Avalanche Fuji Testnet</span>
              </div>
              <div>
                <span className="text-purple-300">Chain ID:</span>
                <span className="text-white ml-2">43113</span>
              </div>
              <div>
                <span className="text-purple-300">RPC URL:</span>
                <span className="text-white ml-2">api.avax-test.network</span>
              </div>
              <div>
                <span className="text-purple-300">Explorer:</span>
                <span className="text-white ml-2">testnet.snowtrace.io</span>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Avalanche Subnet Details */}
        <Card className="mt-6 bg-purple-900/20 border-purple-500/30">
            <CardHeader>
            <CardTitle className="flex items-center text-purple-200">
              <Key className="w-5 h-5 mr-2" />
              Subnet Security Features
              </CardTitle>
            </CardHeader>
            <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-purple-200 mb-3">Network Isolation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-purple-300">Private validator set</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-purple-300">No external node access</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-purple-300">ISRO-only subnet</span>
                  </div>
                </div>
              </div>
                  <div>
                <h4 className="text-lg font-semibold text-purple-200 mb-3">Immutable Storage</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-purple-300">Avalanche consensus</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-purple-300">Cryptographic verification</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-purple-300">Tamper-proof records</span>
                  </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default DataTransfer;