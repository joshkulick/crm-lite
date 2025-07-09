import React from 'react';
import { Search, X, Phone } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  onPhoneSearch?: (query: string) => void;
  placeholder?: string;
  isSearching?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  onClearSearch,
  onPhoneSearch,
  placeholder = "Search by company name, phone, or email...",
  isSearching = false
}) => {
  const handlePhoneSearch = () => {
    if (onPhoneSearch && searchQuery.trim()) {
      onPhoneSearch(searchQuery.trim());
    }
  };

  return (
    <div className="p-4 border-b border-border bg-card">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-12 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          {searchQuery && onPhoneSearch && (
            <button
              onClick={handlePhoneSearch}
              className="p-1 mr-1 text-muted-foreground hover:text-green-600 transition-colors"
              title="Search phone numbers only"
            >
              <Phone className="h-4 w-4" />
            </button>
          )}
          {searchQuery && (
            <button
              onClick={onClearSearch}
              className="p-1 text-muted-foreground hover:text-card-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar; 