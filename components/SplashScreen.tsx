import React from 'react';
import { ShieldCheck } from 'lucide-react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center">
        <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-200 animate-bounce">
          <ShieldCheck className="w-14 h-14 text-white" />
        </div>
        <div className="text-center space-y-2 animate-pulse">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Street Burger</h1>
          <p className="text-xl font-medium text-slate-500">Issue Tracker</p>
        </div>
      </div>
      
      <div className="absolute bottom-16 flex flex-col items-center space-y-4 w-48">
        {/* Loading Progress Bar */}
        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 rounded-full"
            style={{
              animation: 'fillBar 4.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
            }}
          />
        </div>

        <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
          Initializing System...
        </span>
      </div>
      
      <div className="absolute bottom-4 text-[10px] text-slate-300">
        v1.0.0
      </div>

      <style>{`
        @keyframes fillBar {
          0% { width: 0%; }
          10% { width: 10%; }
          50% { width: 60%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;