import React, { useState, useEffect } from 'react';
import { getCacheStats } from '@/lib/storage';

export const PerformanceMonitor = () => {
  const [stats, setStats] = useState({ size: 0, expired: 0, valid: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setStats(getCacheStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={() => setIsVisible(true)}
      >
        <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-sm">
          📊 Performance
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 max-w-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">Performance Stats</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>URL Cache:</span>
          <span className="text-green-600">{stats.valid} valid</span>
        </div>
        <div className="flex justify-between">
          <span>Expired:</span>
          <span className="text-orange-600">{stats.expired}</span>
        </div>
        <div className="flex justify-between">
          <span>Total:</span>
          <span>{stats.size}</span>
        </div>
        <div className="text-green-600 text-center mt-2">
          {stats.valid > 0 ? `${((stats.valid / (stats.valid + stats.expired || 1)) * 100).toFixed(0)}% cache hit rate` : 'No cache data'}
        </div>
      </div>
    </div>
  );
};