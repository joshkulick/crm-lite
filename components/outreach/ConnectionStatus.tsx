import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  if (!isConnected) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-yellow-50 border border-yellow-200 rounded-md">
        <WifiOff className="w-3 h-3 text-yellow-600" />
        <span className="text-yellow-700">Reconnecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-green-50 border border-green-200 rounded-md">
      <Wifi className="w-3 h-3 text-green-600" />
      <span className="text-green-700">Live updates</span>
    </div>
  );
};

export default ConnectionStatus; 