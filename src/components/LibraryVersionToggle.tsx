import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const LibraryVersionToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isV2 = location.pathname === '/library-v2';
  
  const switchToV1 = () => {
    navigate('/library');
  };
  
  const switchToV2 = () => {
    navigate('/library-v2');
  };
  
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-900 rounded-lg border border-gray-700">
      <span className="text-sm text-gray-400">Library Version:</span>
      
      <Button
        variant={!isV2 ? "default" : "outline"}
        size="sm"
        onClick={switchToV1}
        className="text-xs"
      >
        V1
        {!isV2 && <Badge variant="secondary" className="ml-1 text-xs">Current</Badge>}
      </Button>
      
      <Button
        variant={isV2 ? "default" : "outline"}
        size="sm"
        onClick={switchToV2}
        className="text-xs"
      >
        V2
        {isV2 && <Badge variant="secondary" className="ml-1 text-xs">New</Badge>}
      </Button>
    </div>
  );
};

export default LibraryVersionToggle; 