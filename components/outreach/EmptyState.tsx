import React from 'react';
import { Building2 } from 'lucide-react';

const EmptyState: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium text-card-foreground mb-2">No Company Selected</p>
        <p className="text-sm text-muted-foreground">Choose a company from the list to view details</p>
      </div>
    </div>
  );
};

export default EmptyState; 