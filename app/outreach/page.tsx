"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Copy, Phone, Mail, Building, Users, ExternalLink, Check, ChevronDown, ChevronUp, Link as LinkIcon, UserPlus, CheckCircle } from 'lucide-react';

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
  
  const listRef = useRef<HTMLDivElement>(null);

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
          c.id === company.id ? { ...c, is_claimed: true } : c
        ));
        
        // Update selected company if it's the one we just claimed
        if (selectedCompany?.id === company.id) {
          setSelectedCompany(prev => prev ? { ...prev, is_claimed: true } : null);
        }

        alert(`Successfully claimed "${company.company_name}" as your lead!`);
      } else {
        alert(`Failed to claim company: ${result.error}`);
      }
    } catch (error) {
      console.error('Error claiming company:', error);
      alert('Error claiming company. Please try again.');
    } finally {
      setClaimingCompany(null);
    }
  };

  const getUniqueUrlCount = (company: Company) => {
    const allUrls = new Set();
    
    // Add URLs from phone numbers
    company.phone_numbers.forEach(phone => {
      phone.associated_deal_urls.forEach(url => allUrls.add(url));
    });
    
    // Add URLs from emails
    company.emails.forEach(email => {
      email.associated_deal_urls.forEach(url => allUrls.add(url));
    });
    
    // Add main deal URLs
    company.deal_urls.forEach(url => allUrls.add(url));
    
    return allUrls.size;
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

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
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
                className={`p-4 border-b border-border cursor-pointer transition-colors hover:bg-accent/50 ${
                  selectedCompany?.id === company.id ? 'bg-accent border-l-2 border-l-primary' : ''
                } ${company.is_claimed ? 'opacity-75' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-card-foreground text-sm line-clamp-2">
                      {company.company_name}
                    </h3>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{company.phone_numbers.length}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{company.emails.length}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <LinkIcon className="w-3 h-3" />
                        <span>{getUniqueUrlCount(company)}</span>
                      </span>
                    </div>
                    {company.is_claimed && (
                      <div className="mt-2 text-xs text-green-600 font-medium">
                        Owned by {company.claimed_by_username || 'Unknown'}
                      </div>
                    )}
                  </div>
                  {company.is_claimed && (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
                  )}
                </div>
              </div>
            ))}
            
            {loadingCompanies && (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-xs text-muted-foreground">Loading more...</p>
              </div>
            )}
            
            {!hasMore && companies.length > 0 && (
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground">No more companies</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Company Details */}
        <div className="flex-1 overflow-y-auto">
          {selectedCompany ? (
            <div className="p-6">
              {/* Company Header */}
              <div className="bg-card border border-border rounded-lg p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h1 className="text-2xl font-bold text-card-foreground">
                        {selectedCompany.company_name}
                      </h1>
                      {selectedCompany.is_claimed && (
                        <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          <span>Claimed by {selectedCompany.claimed_by_username || 'Unknown'}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Added on {formatDate(selectedCompany.created_at)}
                    </p>
                  </div>
                  <Building className="w-8 h-8 text-muted-foreground" />
                </div>

                {/* Claim Button */}
                {!selectedCompany.is_claimed && (
                  <div className="pt-4 border-t border-border">
                    <button
                      onClick={() => claimCompany(selectedCompany)}
                      disabled={claimingCompany === selectedCompany.id}
                      className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                    >
                      {claimingCompany === selectedCompany.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Claiming Lead...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-5 h-5" />
                          <span>Claim This Lead</span>
                        </>
                      )}
                    </button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Add this company to your personal leads for follow-up
                    </p>
                  </div>
                )}

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
              </div>

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
                        <div key={`${selectedCompany.id}-phone-${index}`} className="p-3 bg-green-50 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-lg text-green-800">
                              {phone.number}
                            </span>
                            <button
                              onClick={() => copyToClipboard(phone.number, `phone-${selectedCompany.id}-${index}`)}
                              className="p-1 hover:bg-green-200 rounded transition-colors"
                            >
                              {copiedField === `phone-${selectedCompany.id}-${index}` ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-green-600" />
                              )}
                            </button>
                          </div>
                          {phone.associated_deal_urls.length > 0 && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleDropdown(`phone-${selectedCompany.id}-${index}`)}
                                className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <span>Found on {phone.associated_deal_urls.length} source{phone.associated_deal_urls.length > 1 ? 's' : ''}</span>
                                {expandedDropdowns.has(`phone-${selectedCompany.id}-${index}`) ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                              {expandedDropdowns.has(`phone-${selectedCompany.id}-${index}`) && (
                                <div className="mt-2 space-y-1 pl-2 border-l-2 border-green-200">
                                  {phone.associated_deal_urls.map((url, urlIndex) => (
                                    <a
                                      key={`${selectedCompany.id}-phone-${index}-url-${urlIndex}`}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 break-all"
                                    >
                                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
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
                    <p className="text-muted-foreground">No phone numbers available</p>
                  )}
                </div>

                {/* Email Addresses */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-card-foreground">
                      Email Addresses ({selectedCompany.emails.length})
                    </h2>
                  </div>
                  
                  {selectedCompany.emails.length > 0 ? (
                    <div className="space-y-3">
                      {selectedCompany.emails.map((email, index) => (
                        <div key={`${selectedCompany.id}-email-${index}`} className="p-3 bg-blue-50 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm text-blue-800">
                              {email.email}
                            </span>
                            <button
                              onClick={() => copyToClipboard(email.email, `email-${selectedCompany.id}-${index}`)}
                              className="p-1 hover:bg-blue-200 rounded transition-colors"
                            >
                              {copiedField === `email-${selectedCompany.id}-${index}` ? (
                                <Check className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-blue-600" />
                              )}
                            </button>
                          </div>
                          {email.associated_deal_urls.length > 0 && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleDropdown(`email-${selectedCompany.id}-${index}`)}
                                className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <span>Found on {email.associated_deal_urls.length} source{email.associated_deal_urls.length > 1 ? 's' : ''}</span>
                                {expandedDropdowns.has(`email-${selectedCompany.id}-${index}`) ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                              {expandedDropdowns.has(`email-${selectedCompany.id}-${index}`) && (
                                <div className="mt-2 space-y-1 pl-2 border-l-2 border-blue-200">
                                  {email.associated_deal_urls.map((url, urlIndex) => (
                                    <a
                                      key={`${selectedCompany.id}-email-${index}-url-${urlIndex}`}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 break-all"
                                    >
                                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
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
                    <p className="text-muted-foreground">No email addresses available</p>
                  )}
                </div>
              </div>

              {/* Deal URLs */}
              {selectedCompany.deal_urls.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <ExternalLink className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold text-card-foreground">
                      Source Deal URLs ({selectedCompany.deal_urls.length})
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
    </div>
  );
};

export default OutreachPage;