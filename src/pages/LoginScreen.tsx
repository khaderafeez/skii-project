import React, { useState } from 'react';
import { Activity } from 'lucide-react';
interface LoginScreenProps {
  onLogin: () => void;
}
export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [orgId, setOrgId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!orgId || !password) {
      setError('Please enter organization ID and password');
      return;
    }
    setIsLoading(true);
    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1000);
  };
  return (
    <div className="min-h-screen w-full ecg-grid-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo/Branding */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 rounded-full bg-medical-cyan/10 border-2 border-medical-cyan flex items-center justify-center mb-4">
            <Activity className="w-8 h-8 text-medical-cyan" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-medical-cyan font-mono">
            HRV ADAPTIVE RHYTHM
          </h1>
          <p className="text-sm text-gray-500 mt-1">Medical Grade HRV System</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="orgId"
              className="block text-sm font-medium text-gray-400 mb-2">
              
              Organization ID
            </label>
            <input
              id="orgId"
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full px-4 py-3 bg-medical-bg-secondary border border-medical-grid rounded-lg text-medical-cyan font-mono focus:outline-none focus:border-medical-cyan transition-colors"
              placeholder="ORG-XXXX"
              disabled={isLoading} />
            
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-400 mb-2">
              
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-medical-bg-secondary border border-medical-grid rounded-lg text-medical-cyan font-mono focus:outline-none focus:border-medical-cyan transition-colors"
              placeholder="••••••••"
              disabled={isLoading} />
            
          </div>

          {error &&
          <div className="p-3 bg-medical-red/10 border border-medical-red rounded-lg">
              <p className="text-sm text-medical-red font-mono">{error}</p>
            </div>
          }

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-medical-cyan text-medical-bg font-mono font-bold rounded-lg hover:bg-medical-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            
            {isLoading ? 'AUTHENTICATING...' : 'LOGIN'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-8">
          Medical Device Class II • FDA Approved
        </p>
      </div>
    </div>);

}