import React from 'react';
import { Users, Phone, Mail, CheckCircle } from 'lucide-react';
import { Company } from './types';
import SearchBar from './SearchBar';
import FilterBar, { FilterOptions } from './FilterBar';

interface CompanyListProps {
  companies: Company[];
  selectedCompany: Company | null;
  onSelectCompany: (company: Company) => void;
  loadingCompanies: boolean;
  hasMore: boolean;
  listRef: React.RefObject<HTMLDivElement | null>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onPhoneSearch?: (query: string) => void;
  onClearSearch: () => void;
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

const CompanyList: React.FC<CompanyListProps> = ({
  companies,
  selectedCompany,
  onSelectCompany,
  loadingCompanies,
  hasMore,
  listRef,
  searchQuery,
  onSearchChange,
  onPhoneSearch,
  onClearSearch,
  filters,
  onFilterChange
}) => {
  return (
    <div className="w-80 border-r border-border bg-card">
      {/* Search Bar */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onPhoneSearch={onPhoneSearch}
        onClearSearch={onClearSearch}
        isSearching={loadingCompanies}
      />
      
      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={onFilterChange}
      />
      
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-card-foreground">
          Companies ({companies.length})
        </h2>
        <p className="text-xs text-muted-foreground">
          {searchQuery 
            ? `${companies.length} result${companies.length !== 1 ? 's' : ''} for "${searchQuery}"`
            : 'Select a company to view details'
          }
        </p>
      </div>
      
      <div 
        ref={listRef}
        className="h-full overflow-y-auto"
      >
        {companies.map((company) => (
          <div
            key={company.unique_key || `company-${company.id}`}
            onClick={() => onSelectCompany(company)}
            className={`relative p-4 border-b border-border cursor-pointer transition-colors hover:bg-accent/50 ${
              selectedCompany?.id === company.id ? 'bg-accent border-l-2 border-l-primary' : ''
            } ${company.is_claimed ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm text-card-foreground truncate flex-1">
                {company.company_name}
              </h3>
              {company.is_claimed && (
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
              )}
            </div>
            
            <div className="space-y-1">
              {company.contact_names.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {company.contact_names.length} contact{company.contact_names.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              
              {company.phone_numbers.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {company.phone_numbers.length} phone{company.phone_numbers.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              
              {company.emails.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {company.emails.length} email{company.emails.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {loadingCompanies && (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-xs text-muted-foreground mt-2">Loading more companies...</p>
          </div>
        )}
        
        {/* End of list indicator */}
        {!hasMore && companies.length > 0 && (
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground">No more companies to load</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyList; 