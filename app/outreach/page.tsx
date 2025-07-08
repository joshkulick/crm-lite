"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Copy, Phone, Mail, Building, Users, ExternalLink, Check, ChevronDown, ChevronUp, Link as LinkIcon, UserPlus, CheckCircle, Building2 } from 'lucide-react';

interface PhoneNumber {
  number: string;
  associated_deal_urls: string[];
}

interface Email {
  email: string;
  associated_deal_urls: string[];
}

interface Company {
  id: number;
  company_name: string;
  contact_names: string[];
  deal_urls: string[];
  phone_numbers: PhoneNumber[];
  emails: Email[];
  created_at: string;
  unique_key?: string;
  is_claimed?: boolean;
  claimed_by_username?: string;
}

const OutreachPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedDropdowns, setExpandedDropdowns] = useState<Set<string>>(new Set());
  const [claimingCompany, setClaimingCompany] = useState<number | null>(null);
  const [unclaimingCompany, setUnclaimingCompany] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Array<{id: string, message: string, type: 'success' | 'error'}>>([]);
  
  const listRef = useRef<HTMLDivElement>(null);

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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

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
  }, [loadingCompanies, hasMore]);

  const loadCompanies = async (pageNum: number, reset: boolean = false) => {
    try {
      setLoadingCompanies(true);
      const response = await fetch(`/api/outreach/companies?page=${pageNum}&limit=50`);
      
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
        const existingIds = new Set(companies.map(c => c.id));
        const newCompanies = data.companies.filter((company: Company) => !existingIds.has(company.id));
        setCompanies(prev => [...prev, ...newCompanies]);
      }
      
      setHasMore(data.has_more);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadMoreCompanies = () => {
    if (!loadingCompanies && hasMore) {
      loadCompanies(page + 1, false);
    }
  };

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
        // Update the company in the local state to show it's claimed
        setCompanies(prev => prev.map(c => 
          c.id === company.id ? { ...c, is_claimed: true, claimed_by_username: user?.username } : c
        ));
        
        // Update selected company if it's the one we just claimed
        if (selectedCompany?.id === company.id) {
          setSelectedCompany(prev => prev ? { ...prev, is_claimed: true, claimed_by_username: user?.username } : null);
        }

        showToast(`Successfully claimed "${company.company_name}" as your lead!`, 'success');
      } else {
        showToast(`Failed to claim company: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error claiming company:', error);
      showToast('Error claiming company. Please try again.', 'error');
    } finally {
      setClaimingCompany(null);
    }
  };

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
        // Update the company in the local state to show it's unclaimed
        setCompanies(prev => prev.map(c => 
          c.id === company.id ? { ...c, is_claimed: false, claimed_by_username: undefined } : c
        ));
        
        // Update selected company if it's the one we just unclaimed
        if (selectedCompany?.id === company.id) {
          setSelectedCompany(prev => prev ? { ...prev, is_claimed: false, claimed_by_username: undefined } : null);
        }

        showToast(`Successfully removed "${company.company_name}" from your leads.`, 'success');
      } else {
        showToast(`Failed to remove company: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error unclaiming company:', error);
      showToast('Error removing company. Please try again.', 'error');
    } finally {
      setUnclaimingCompany(null);
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleDropdown = (dropdownId: string) => {
    const newExpanded = new Set(expandedDropdowns);
    if (newExpanded.has(dropdownId)) {
      newExpanded.delete(dropdownId);
    } else {
      newExpanded.add(dropdownId);
    }
    setExpandedDropdowns(newExpanded);
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if redirecting
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center space-x-4">
          <Link 
            href="/"
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to CRM</span>
          </Link>
          <div className="h-4 w-px bg-border"></div>
          <h1 className="text-lg font-semibold text-card-foreground">
            Outreach
          </h1>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Company List */}
        <div className="w-80 border-r border-border bg-card">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-card-foreground">
              Companies ({companies.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Select a company to view details
            </p>
          </div>
          
          <div 
            ref={listRef}
            className="h-full overflow-y-auto"
          >
            {companies.map((company) => (
              <div
                key={company.unique_key || `company-${company.id}`}
                onClick={() => setSelectedCompany(company)}
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

                <div className="text-xs text-muted-foreground mt-2">
                  {formatDate(company.created_at)}
                </div>

                {/* Owner Card - Bottom Right */}
                {company.is_claimed && company.claimed_by_username && (
                  <div className="absolute bottom-2 right-2 bg-muted/80 backdrop-blur-sm border border-border rounded px-1.5 py-1">
                    <span className="text-xs text-muted-foreground font-medium">
                      {company.claimed_by_username}
                    </span>
                  </div>
                )}
              </div>
            ))}
            
            {loadingCompanies && (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-xs text-muted-foreground">Loading more...</p>
              </div>
            )}
            
            {!hasMore && companies.length > 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No more companies to load
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Company Details */}
        <div className="flex-1 overflow-y-auto">
          {selectedCompany ? (
            <div className="p-6">
              {/* Company Header with Improved Compact Button */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <h1 className="text-xl font-semibold text-card-foreground">
                    {selectedCompany.company_name}
                  </h1>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!selectedCompany.is_claimed ? (
                    <button
                      onClick={() => claimCompany(selectedCompany)}
                      disabled={claimingCompany === selectedCompany.id}
                      className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md border transition-all duration-200 ${
                        claimingCompany === selectedCompany.id
                          ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 hover:text-emerald-800'
                      }`}
                    >
                      {claimingCompany === selectedCompany.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
                          <span>Claiming...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>Claim Lead</span>
                        </>
                      )}
                    </button>
                  ) : selectedCompany.claimed_by_username === user?.username ? (
                    <button
                      onClick={() => unclaimCompany(selectedCompany)}
                      disabled={unclaimingCompany === selectedCompany.id}
                      className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md border transition-all duration-200 ${
                        unclaimingCompany === selectedCompany.id
                          ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300 hover:text-red-800'
                      }`}
                    >
                      {unclaimingCompany === selectedCompany.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
                          <span>Removing...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3 rotate-45" />
                          <span>Remove Lead</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-muted/50 border border-border rounded-md">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-muted-foreground">Claimed by {selectedCompany.claimed_by_username}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Names */}
              {selectedCompany.contact_names.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-card-foreground">Contacts</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCompany.contact_names.map((name, index) => (
                      <span 
                        key={`${selectedCompany.id}-contact-${index}`}
                        className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Phone Numbers */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Phone className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-semibold text-card-foreground">
                      Phone Numbers ({selectedCompany.phone_numbers.length})
                    </h2>
                  </div>
                  
                  {selectedCompany.phone_numbers.length > 0 ? (
                    <div className="space-y-3">
                      {selectedCompany.phone_numbers.map((phone, index) => (
                        <div key={`${selectedCompany.id}-phone-${index}`} className="group">
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <span className="font-mono text-sm text-green-800">{phone.number}</span>
                            <button
                              onClick={() => copyToClipboard(phone.number, `phone-${selectedCompany.id}-${index}`)}
                              className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              {copiedField === `phone-${selectedCompany.id}-${index}` ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          
                          {phone.associated_deal_urls && phone.associated_deal_urls.length > 0 && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleDropdown(`phone-deals-${selectedCompany.id}-${index}`)}
                                className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground"
                              >
                                {expandedDropdowns.has(`phone-deals-${selectedCompany.id}-${index}`) ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                                <span>{phone.associated_deal_urls.length} associated deal{phone.associated_deal_urls.length !== 1 ? 's' : ''}</span>
                              </button>
                              
                              {expandedDropdowns.has(`phone-deals-${selectedCompany.id}-${index}`) && (
                                <div className="mt-2 space-y-1 pl-4">
                                  {phone.associated_deal_urls.map((url, urlIndex) => (
                                    <a
                                      key={`${selectedCompany.id}-phone-${index}-deal-${urlIndex}`}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center space-x-2 text-xs text-blue-600 hover:text-blue-800"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span className="truncate">{url}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No phone numbers available</p>
                  )}
                </div>

                {/* Email Addresses */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-card-foreground">
                      Emails ({selectedCompany.emails.length})
                    </h2>
                  </div>
                  
                  {selectedCompany.emails.length > 0 ? (
                    <div className="space-y-3">
                      {selectedCompany.emails.map((email, index) => (
                        <div key={`${selectedCompany.id}-email-${index}`} className="group">
                          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <span className="font-mono text-sm text-blue-800">{email.email}</span>
                            <button
                              onClick={() => copyToClipboard(email.email, `email-${selectedCompany.id}-${index}`)}
                              className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              {copiedField === `email-${selectedCompany.id}-${index}` ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          
                          {email.associated_deal_urls && email.associated_deal_urls.length > 0 && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleDropdown(`email-deals-${selectedCompany.id}-${index}`)}
                                className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground"
                              >
                                {expandedDropdowns.has(`email-deals-${selectedCompany.id}-${index}`) ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                                <span>{email.associated_deal_urls.length} associated deal{email.associated_deal_urls.length !== 1 ? 's' : ''}</span>
                              </button>
                              
                              {expandedDropdowns.has(`email-deals-${selectedCompany.id}-${index}`) && (
                                <div className="mt-2 space-y-1 pl-4">
                                  {email.associated_deal_urls.map((url, urlIndex) => (
                                    <a
                                      key={`${selectedCompany.id}-email-${index}-deal-${urlIndex}`}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center space-x-2 text-xs text-blue-600 hover:text-blue-800"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span className="truncate">{url}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No email addresses available</p>
                  )}
                </div>
              </div>

              {/* Deal URLs */}
              {selectedCompany.deal_urls && selectedCompany.deal_urls.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <LinkIcon className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold text-card-foreground">
                      Deal URLs ({selectedCompany.deal_urls.length})
                    </h2>
                  </div>
                  
                  <div className="space-y-2">
                    {selectedCompany.deal_urls.map((url, index) => (
                      <a
                        key={`${selectedCompany.id}-deal-${index}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg border hover:bg-purple-100 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-purple-800 truncate">{url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-card-foreground mb-2">
                  Select a Company
                </h2>
                <p className="text-muted-foreground">
                  Choose a company from the list to view contact details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center justify-between p-4 rounded-lg shadow-lg border backdrop-blur-sm animate-in slide-in-from-right-full duration-300 ${
              toast.type === 'success' 
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' 
                : 'bg-red-50/90 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {toast.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <ExternalLink className="w-4 h-4 text-red-600 rotate-45" />
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 text-current hover:opacity-70 transition-opacity"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OutreachPage;