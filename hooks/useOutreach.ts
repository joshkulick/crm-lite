import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Company, Toast } from '@/components/outreach/types';
import { FilterOptions } from '@/components/outreach/FilterBar';

export const useOutreach = () => {
  const { user, loading } = useAuth();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [claimingCompany, setClaimingCompany] = useState<number | null>(null);
  const [unclaimingCompany, setUnclaimingCompany] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    myClaims: false,
    unclaimed: false,
    hasPhone: false,
    hasEmail: false,
    hasDeals: false
  });
  
  const listRef = useRef<HTMLDivElement>(null);

  // Server-side search - no client-side filtering needed
  const filteredCompanies = companies;

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    // Reset to first page when searching
    if (query.trim() !== searchQuery.trim()) {
      setPage(1);
      // Trigger new search after a short delay to avoid too many requests
      setTimeout(() => {
        loadCompanies(1, true);
      }, 300);
    }
  };

  const handlePhoneSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    // Trigger phone-only search immediately
    setTimeout(() => {
      loadCompaniesWithPhoneSearch(1, true, query);
    }, 100);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setPage(1);
    // Reload companies without search
    loadCompanies(1, true);
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setPage(1);
    // Trigger new load with filters immediately using the new filters
    setTimeout(() => {
      loadCompaniesWithFilters(1, true, newFilters);
    }, 100);
  };

  // Separate function to load companies with phone-only search
  const loadCompaniesWithPhoneSearch = useCallback(async (pageNum: number, reset: boolean = false, phoneQuery?: string) => {
    try {
      setLoadingCompanies(true);
      
      // Build URL with phone-only search
      const url = new URL('/api/outreach/companies', window.location.origin);
      url.searchParams.set('page', pageNum.toString());
      url.searchParams.set('limit', '50');
      if (phoneQuery?.trim()) {
        url.searchParams.set('search', phoneQuery.trim());
        url.searchParams.set('phoneOnly', 'true');
      }
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      
      const data = await response.json();
      
      if (reset) {
        setCompanies(data.companies);
        if (data.companies.length > 0) {
          setSelectedCompany(data.companies[0]);
        }
      } else {
        // Use a Map to ensure uniqueness by company ID
        setCompanies(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newCompanies = data.companies.filter((company: Company) => !existingIds.has(company.id));
          return [...prev, ...newCompanies];
        });
      }
      
      setHasMore(data.has_more);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  // Separate function to load companies with specific filters
  const loadCompaniesWithFilters = useCallback(async (pageNum: number, reset: boolean = false, filterOptions?: FilterOptions) => {
    try {
      setLoadingCompanies(true);
      
      // Build URL with search and filter parameters
      const url = new URL('/api/outreach/companies', window.location.origin);
      url.searchParams.set('page', pageNum.toString());
      url.searchParams.set('limit', '50');
      if (searchQuery.trim()) {
        url.searchParams.set('search', searchQuery.trim());
      }
      
      // Use provided filters or current filters
      const currentFilters = filterOptions || filters;
      
      // Add filter parameters
      if (currentFilters.myClaims) url.searchParams.set('myClaims', 'true');
      if (currentFilters.unclaimed) url.searchParams.set('unclaimed', 'true');
      if (currentFilters.hasPhone) url.searchParams.set('hasPhone', 'true');
      if (currentFilters.hasEmail) url.searchParams.set('hasEmail', 'true');
      if (currentFilters.hasDeals) url.searchParams.set('hasDeals', 'true');
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      
      const data = await response.json();
      
      if (reset) {
        setCompanies(data.companies);
        if (data.companies.length > 0) {
          setSelectedCompany(data.companies[0]);
        }
      } else {
        // Use a Map to ensure uniqueness by company ID
        setCompanies(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newCompanies = data.companies.filter((company: Company) => !existingIds.has(company.id));
          return [...prev, ...newCompanies];
        });
      }
      
      setHasMore(data.has_more);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  }, [searchQuery, filters]);

  // Toast notification system
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Load companies
  const loadCompanies = useCallback(async (pageNum: number, reset: boolean = false) => {
    return loadCompaniesWithFilters(pageNum, reset);
  }, [loadCompaniesWithFilters]);

  const loadMoreCompanies = useCallback(() => {
    if (!loadingCompanies && hasMore) {
      loadCompanies(page + 1, false);
    }
  }, [loadingCompanies, hasMore, page, loadCompanies]);

  // Load initial companies
  useEffect(() => {
    if (user) {
      loadCompanies(1, true);
    }
  }, [user]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (!listRef.current || loadingCompanies || !hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMoreCompanies();
      }
    };

    const listElement = listRef.current;
    if (listElement) {
      listElement.addEventListener('scroll', handleScroll);
      return () => listElement.removeEventListener('scroll', handleScroll);
    }
  }, [loadingCompanies, hasMore, loadMoreCompanies]);

  // Claim company
  const claimCompany = async (company: Company) => {
    if (!company || claimingCompany === company.id) return;
    
    setClaimingCompany(company.id);
    
    try {
      const response = await fetch('/api/outreach/claim-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: company.id,
          company_name: company.company_name,
          contact_names: company.contact_names,
          deal_urls: company.deal_urls,
          phone_numbers: company.phone_numbers,
          emails: company.emails
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Create the updated company object
        const updatedCompany = { 
          ...company, 
          is_claimed: true, 
          claimed_by_username: user?.username 
        };
        
        // Update the company in the local state to show it's claimed
        setCompanies(prev => prev.map(c => 
          c.id === company.id ? updatedCompany : c
        ));
        
        // IMPORTANT: Also update the selectedCompany if it's the same company
        if (selectedCompany?.id === company.id) {
          setSelectedCompany(updatedCompany);
        }
        
        showToast('Company claimed successfully! You can set contact preferences in the Contact Method section.');
      } else {
        showToast(result.error || 'Failed to claim company', 'error');
      }
    } catch (error) {
      console.error('Failed to claim company:', error);
      showToast('Failed to claim company', 'error');
    } finally {
      setClaimingCompany(null);
    }
  };

  // Unclaim company
  const unclaimCompany = async (company: Company) => {
    if (!company || unclaimingCompany === company.id) return;
    
    setUnclaimingCompany(company.id);
    
    try {
      const response = await fetch('/api/outreach/unclaim-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: company.id,
          company_name: company.company_name
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Create the updated company object
        const updatedCompany = { 
          ...company, 
          is_claimed: false, 
          claimed_by_username: undefined 
        };
        
        // Update the company in the local state to show it's unclaimed
        setCompanies(prev => prev.map(c => 
          c.id === company.id ? updatedCompany : c
        ));
        
        // IMPORTANT: Also update the selectedCompany if it's the same company
        if (selectedCompany?.id === company.id) {
          setSelectedCompany(updatedCompany);
        }
        
        showToast('Company removed from your leads!');
      } else {
        showToast(result.error || 'Failed to remove company', 'error');
      }
    } catch (error) {
      console.error('Failed to unclaim company:', error);
      showToast('Failed to remove company', 'error');
    } finally {
      setUnclaimingCompany(null);
    }
  };

  return {
    // State
    companies,
    filteredCompanies,
    selectedCompany,
    loadingCompanies,
    hasMore,
    claimingCompany,
    unclaimingCompany,
    toasts,
    listRef,
    user,
    loading,
    searchQuery,
    filters,
    
    // Actions
    setSelectedCompany,
    claimCompany,
    unclaimCompany,
    showToast,
    removeToast,
    handleSearchChange,
    handlePhoneSearch,
    clearSearch,
    handleFilterChange
  };
}; 