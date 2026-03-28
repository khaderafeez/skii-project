import React from 'react';
import { Bluetooth, BluetoothOff } from 'lucide-react';
interface BluetoothStatusProps {
  isConnected: boolean;
}
export function BluetoothStatus({ isConnected }: BluetoothStatusProps) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-full border ${isConnected ? 'bg-medical-cyan/10 border-medical-cyan text-medical-cyan' : 'bg-medical-red/10 border-medical-red text-medical-red'}`}>
      
      {isConnected ?
      <>
          <Bluetooth className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-mono font-semibold">CONNECTED</span>
        </> :

      <>
          <BluetoothOff className="w-4 h-4" />
          <span className="text-xs font-mono font-semibold">DISCONNECTED</span>
        </>
      }
    </div>);

}