"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Copy, Phone, Mail, Users, ExternalLink, Check, ChevronDown, ChevronUp, Link as LinkIcon, UserPlus, CheckCircle, Building2, MessageSquare, Contact } from 'lucide-react';

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

interface ContactMethodForm {
  point_of_contact: string;
  preferred_contact_method: 'call' | 'email' | 'text' | '';
  preferred_contact_value: string;
}

interface Lead {
  id: number;
  company: string;
  contact_name: string;
  point_of_contact: string | null;
  preferred_contact_method: string | null;
  preferred_contact_value: string | null;
  phone_numbers: string;
  emails: string;
  status: string;
  created_at: string;
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
  const [contactMethodForm, setContactMethodForm] = useState<ContactMethodForm>({
    point_of_contact: '',
    preferred_contact_method: '',
    preferred_contact_value: ''
  });
  const [editingContactMethod, setEditingContactMethod] = useState(false);
  const [savingContactMethod, setSavingContactMethod] = useState(false);
  
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

  // Load contact method data for claimed leads
  const loadLeadContactMethod = useCallback(async () => {
    if (!selectedCompany?.is_claimed || selectedCompany.claimed_by_username !== user?.username) {
      return;
    }

    try {
      const response = await fetch('/api/leads/contact-method');
      if (response.ok) {
        const data = await response.json();
        const lead = data.leads.find((l: Lead) => l.company === selectedCompany.company_name);
        if (lead && lead.point_of_contact) {
          setContactMethodForm({
            point_of_contact: lead.point_of_contact || '',
            preferred_contact_method: lead.preferred_contact_method || '',
            preferred_contact_value: lead.preferred_contact_value || ''
          });
        }
      }
    } catch (error) {
      console.error('Failed to load contact method:', error);
    }
  }, [selectedCompany?.company_name, selectedCompany?.is_claimed, selectedCompany?.claimed_by_username, user?.username]);

  // Reset contact method form when company changes  
  useEffect(() => {
    if (selectedCompany) {
      setContactMethodForm({
        point_of_contact: '',
        preferred_contact_method: '',
        preferred_contact_value: ''
      });
      setEditingContactMethod(false);
      
      // Only load contact method for claimed leads by current user
      if (selectedCompany.is_claimed && selectedCompany.claimed_by_username === user?.username) {
        loadLeadContactMethod();
      }
    }
  }, [selectedCompany?.id, user?.username]); // Only depend on ID, not the whole object

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load initial companies
  const loadCompanies = useCallback(async (pageNum: number, reset: boolean = false) => {
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
  }, [user]); // Removed loadCompanies from dependencies

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
          // Remove contact method fields for now - can be set later via edit
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

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      showToast(`${fieldName} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const toggleDropdown = (dropdownId: string) => {
    setExpandedDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dropdownId)) {
        newSet.delete(dropdownId);
      } else {
        newSet.add(dropdownId);
      }
      return newSet;
    });
  };

  const handleContactMethodChange = (method: 'call' | 'email' | 'text' | '') => {
    setContactMethodForm(prev => ({
      ...prev,
      preferred_contact_method: method,
      preferred_contact_value: '' // Reset value when method changes
    }));
  };

  const getFilteredContactValues = (): string[] => {
    if (!selectedCompany || !contactMethodForm.preferred_contact_method) return [];
    
    if (contactMethodForm.preferred_contact_method === 'call' || contactMethodForm.preferred_contact_method === 'text') {
      return selectedCompany.phone_numbers.map(phone => phone.number);
    } else if (contactMethodForm.preferred_contact_method === 'email') {
      return selectedCompany.emails.map(email => email.email);
    }
    
    return [];
  };

  const saveContactMethod = async () => {
    if (!selectedCompany?.is_claimed || selectedCompany.claimed_by_username !== user?.username) {
      return;
    }

    setSavingContactMethod(true);
    
    try {
      // First get the lead ID
      const leadsResponse = await fetch('/api/leads/contact-method');
      if (!leadsResponse.ok) {
        throw new Error('Failed to fetch leads');
      }
      
      const leadsData = await leadsResponse.json();
      const lead = leadsData.leads.find((l: Lead) => l.company === selectedCompany.company_name);
      
      if (!lead) {
        throw new Error('Lead not found');
      }

      const response = await fetch('/api/leads/contact-method', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: lead.id,
          point_of_contact: contactMethodForm.point_of_contact,
          preferred_contact_method: contactMethodForm.preferred_contact_method,
          preferred_contact_value: contactMethodForm.preferred_contact_value
        })
      });

      const result = await response.json();

      if (response.ok) {
        showToast('Contact method updated successfully!');
        setEditingContactMethod(false);
      } else {
        showToast(result.error || 'Failed to update contact method', 'error');
      }
    } catch (error) {
      console.error('Failed to save contact method:', error);
      showToast('Failed to save contact method', 'error');
    } finally {
      setSavingContactMethod(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-md shadow-lg text-sm font-medium cursor-pointer ${
              toast.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
            onClick={() => removeToast(toast.id)}
          >
            <div className="flex items-center space-x-2">
              {toast.type === 'success' ? (
                <Check className="w-4 h-4" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="text-muted-foreground hover:text-card-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
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

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedCompany ? (
            <div className="p-6">
              {/* Company Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-card-foreground mb-2">
                    {selectedCompany.company_name}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Added on {new Date(selectedCompany.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Claim/Unclaim Button */}
                  {!selectedCompany.is_claimed || selectedCompany.claimed_by_username === user?.username ? (
                    selectedCompany.is_claimed ? (
                      <button
                        onClick={() => unclaimCompany(selectedCompany)}
                        disabled={unclaimingCompany === selectedCompany.id}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
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
                      <button
                        onClick={() => claimCompany(selectedCompany)}
                        disabled={claimingCompany === selectedCompany.id}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                          claimingCompany === selectedCompany.id
                            ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                            : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
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
                    )
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
                <div className="mb-6">
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
                {/* Contact Method Card - Only for claimed leads by current user */}
                {selectedCompany.is_claimed && selectedCompany.claimed_by_username === user?.username && (
                  <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Contact className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-card-foreground">Contact Method</h2>
                      </div>
                      <button
                        onClick={() => {
                          if (editingContactMethod) {
                            setEditingContactMethod(false);
                            loadLeadContactMethod();
                          } else {
                            setEditingContactMethod(true);
                          }
                        }}
                        className="flex items-center space-x-2 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
                      >
                        <span>{editingContactMethod ? 'Cancel' : 'Edit'}</span>
                      </button>
                    </div>

                    {!editingContactMethod ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Contact Person</span>
                          <p className="text-sm text-card-foreground mt-1">{contactMethodForm.point_of_contact || 'Not set'}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Preferred Method</span>
                          <p className="text-sm text-card-foreground mt-1 capitalize">{contactMethodForm.preferred_contact_method || 'Not set'}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Contact Info</span>
                          <p className="text-sm text-card-foreground mt-1">{contactMethodForm.preferred_contact_value || 'Not set'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Contact Person</label>
                            <select
                              value={contactMethodForm.point_of_contact}
                              onChange={(e) => setContactMethodForm(prev => ({ ...prev, point_of_contact: e.target.value }))}
                              className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                              <option value="">Select contact person</option>
                              {selectedCompany.contact_names.map((name, index) => (
                                <option key={index} value={name}>{name}</option>
                              ))}
                              <option value="General">General Contact</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Preferred Method</label>
                            <select
                              value={contactMethodForm.preferred_contact_method}
                              onChange={(e) => handleContactMethodChange(e.target.value as 'call' | 'email' | 'text' | '')}
                              className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                              <option value="">Select method</option>
                              <option value="call">Call</option>
                              <option value="email">Email</option>
                              <option value="text">Text</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              {contactMethodForm.preferred_contact_method === 'email' ? 'Email Address' : 'Phone Number'}
                            </label>
                            <select
                              value={contactMethodForm.preferred_contact_value}
                              onChange={(e) => setContactMethodForm(prev => ({ ...prev, preferred_contact_value: e.target.value }))}
                              className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                              <option value="">Select {contactMethodForm.preferred_contact_method === 'email' ? 'email' : 'phone'}</option>
                              {getFilteredContactValues().map((value, index) => (
                                <option key={index} value={value}>{value}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div className="flex justify-end">
                          <button
                            onClick={saveContactMethod}
                            disabled={savingContactMethod || !contactMethodForm.point_of_contact || !contactMethodForm.preferred_contact_method || !contactMethodForm.preferred_contact_value}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                              savingContactMethod || !contactMethodForm.point_of_contact || !contactMethodForm.preferred_contact_method || !contactMethodForm.preferred_contact_value
                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            }`}
                          >
                            {savingContactMethod ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
                                <span>Saving...</span>
                              </div>
                            ) : (
                              'Save Contact Method'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                        <div 
                          key={`${selectedCompany.id}-phone-${index}`}
                          className="border border-border rounded-lg p-3 bg-accent/30"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-card-foreground">{phone.number}</span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => copyToClipboard(phone.number, `Phone ${index + 1}`)}
                                className="p-1 text-muted-foreground hover:text-card-foreground transition-colors"
                              >
                                {copiedField === `Phone ${index + 1}` ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <a
                                href={`tel:${phone.number}`}
                                className="p-1 text-green-600 hover:text-green-700 transition-colors"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                              <a
                                href={`sms:${phone.number}`}
                                className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                          
                          {phone.associated_deal_urls.length > 0 && (
                            <div>
                              <button
                                onClick={() => toggleDropdown(`phone-deals-${selectedCompany.id}-${index}`)}
                                className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-card-foreground transition-colors"
                              >
                                {expandedDropdowns.has(`phone-deals-${selectedCompany.id}-${index}`) ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                                <span>{phone.associated_deal_urls.length} associated deal{phone.associated_deal_urls.length !== 1 ? 's' : ''}</span>
                              </button>
                              
                              {expandedDropdowns.has(`phone-deals-${selectedCompany.id}-${index}`) && (
                                <div className="mt-2 space-y-1 pl-4 max-h-32 overflow-y-auto">
                                  {phone.associated_deal_urls.map((url, urlIndex) => (
                                    <a
                                      key={`${selectedCompany.id}-phone-${index}-deal-${urlIndex}`}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center space-x-2 text-xs text-blue-600 hover:text-blue-800 truncate"
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
                        <div 
                          key={`${selectedCompany.id}-email-${index}`}
                          className="border border-border rounded-lg p-3 bg-accent/30"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-card-foreground break-all">{email.email}</span>
                            <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                              <button
                                onClick={() => copyToClipboard(email.email, `Email ${index + 1}`)}
                                className="p-1 text-muted-foreground hover:text-card-foreground transition-colors"
                              >
                                {copiedField === `Email ${index + 1}` ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <a
                                href={`mailto:${email.email}`}
                                className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                              >
                                <Mail className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                          
                          {email.associated_deal_urls.length > 0 && (
                            <div>
                              <button
                                onClick={() => toggleDropdown(`email-deals-${selectedCompany.id}-${index}`)}
                                className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-card-foreground transition-colors"
                              >
                                {expandedDropdowns.has(`email-deals-${selectedCompany.id}-${index}`) ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                                <span>{email.associated_deal_urls.length} associated deal{email.associated_deal_urls.length !== 1 ? 's' : ''}</span>
                              </button>
                              
                              {expandedDropdowns.has(`email-deals-${selectedCompany.id}-${index}`) && (
                                <div className="mt-2 space-y-1 pl-4 max-h-32 overflow-y-auto">
                                  {email.associated_deal_urls.map((url, urlIndex) => (
                                    <a
                                      key={`${selectedCompany.id}-email-${index}-deal-${urlIndex}`}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center space-x-2 text-xs text-blue-600 hover:text-blue-800 truncate"
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
                    <p className="text-muted-foreground text-sm">No email addresses available</p>
                  )}
                </div>
              </div>

              {/* Deal URLs - Moved to bottom */}
              {selectedCompany.deal_urls.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <LinkIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-card-foreground">Deal URLs</span>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <button
                      onClick={() => toggleDropdown(`deal-urls-${selectedCompany.id}`)}
                      className="flex items-center justify-between w-full text-left text-sm text-muted-foreground hover:text-card-foreground"
                    >
                      <span>{selectedCompany.deal_urls.length} deal URL{selectedCompany.deal_urls.length !== 1 ? 's' : ''}</span>
                      {expandedDropdowns.has(`deal-urls-${selectedCompany.id}`) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    
                    {expandedDropdowns.has(`deal-urls-${selectedCompany.id}`) && (
                      <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                        {selectedCompany.deal_urls.map((url, index) => (
                          <div
                            key={`${selectedCompany.id}-deal-${index}`}
                            className="flex items-center justify-between p-2 bg-accent/50 rounded-md"
                          >
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 truncate flex-1"
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{url}</span>
                            </a>
                            <button
                              onClick={() => copyToClipboard(url, `Deal URL ${index + 1}`)}
                              className="ml-2 p-1 text-muted-foreground hover:text-card-foreground transition-colors"
                            >
                              {copiedField === `Deal URL ${index + 1}` ? (
                                <Check className="w-3 h-3 text-green-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-card-foreground mb-2">No Company Selected</p>
                <p className="text-sm text-muted-foreground">Choose a company from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutreachPage;