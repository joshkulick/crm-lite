import React, { useState } from 'react';
import { Filter, Phone, Mail, Link, UserCheck, UserX, ChevronDown, ChevronUp } from 'lucide-react';

export interface FilterOptions {
  myClaims: boolean;
  unclaimed: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasDeals: boolean;
}

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleFilter = (key: keyof FilterOptions) => {
    onFilterChange({
      ...filters,
      [key]: !filters[key]
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(Boolean).length;
  };

  const clearAllFilters = () => {
    onFilterChange({
      myClaims: false,
      unclaimed: false,
      hasPhone: false,
      hasEmail: false,
      hasDeals: false
    });
  };

  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-card-foreground">Filters</span>
          {getActiveFiltersCount() > 0 && (
            <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {getActiveFiltersCount()}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {getActiveFiltersCount() > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-card-foreground transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-muted-foreground hover:text-card-foreground transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
        {/* My Claims Filter */}
        <button
          onClick={() => toggleFilter('myClaims')}
          className={`flex items-center space-x-1 px-3 py-1.5 text-xs rounded-md border transition-colors ${
            filters.myClaims
              ? 'bg-blue-100 text-blue-800 border-blue-300 font-medium'
              : 'bg-background text-muted-foreground border-border hover:bg-accent'
          }`}
        >
          <UserCheck className="w-3 h-3" />
          <span>My Claims</span>
        </button>

        {/* Unclaimed Filter */}
        <button
          onClick={() => toggleFilter('unclaimed')}
          className={`flex items-center space-x-1 px-3 py-1.5 text-xs rounded-md border transition-colors ${
            filters.unclaimed
              ? 'bg-green-100 text-green-800 border-green-300 font-medium'
              : 'bg-background text-muted-foreground border-border hover:bg-accent'
          }`}
        >
          <UserX className="w-3 h-3" />
          <span>Unclaimed</span>
        </button>

        {/* Has Phone Filter */}
        <button
          onClick={() => toggleFilter('hasPhone')}
          className={`flex items-center space-x-1 px-3 py-1.5 text-xs rounded-md border transition-colors ${
            filters.hasPhone
              ? 'bg-green-100 text-green-800 border-green-300 font-medium'
              : 'bg-background text-muted-foreground border-border hover:bg-accent'
          }`}
        >
          <Phone className="w-3 h-3" />
          <span>Has Phone</span>
        </button>

        {/* Has Email Filter */}
        <button
          onClick={() => toggleFilter('hasEmail')}
          className={`flex items-center space-x-1 px-3 py-1.5 text-xs rounded-md border transition-colors ${
            filters.hasEmail
              ? 'bg-blue-100 text-blue-800 border-blue-300 font-medium'
              : 'bg-background text-muted-foreground border-border hover:bg-accent'
          }`}
        >
          <Mail className="w-3 h-3" />
          <span>Has Email</span>
        </button>

        {/* Has Deals Filter */}
        <button
          onClick={() => toggleFilter('hasDeals')}
          className={`flex items-center space-x-1 px-3 py-1.5 text-xs rounded-md border transition-colors ${
            filters.hasDeals
              ? 'bg-purple-100 text-purple-800 border-purple-300 font-medium'
              : 'bg-background text-muted-foreground border-border hover:bg-accent'
          }`}
        >
          <Link className="w-3 h-3" />
          <span>Has Deals</span>
        </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar; 