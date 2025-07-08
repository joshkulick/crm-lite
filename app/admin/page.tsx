"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Upload } from 'lucide-react';

interface UserWithLeads {
  id: number;
  username: string;
  created_at: string;
  lead_count: number;
}

interface ImportStats {
  total_companies: number;
  companies_with_phones: number;
  companies_with_emails: number;
  last_import_date: string | null;
}

const AdminPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithLeads[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [importStats, setImportStats] = useState<ImportStats>({
    total_companies: 0,
    companies_with_phones: 0,
    companies_with_emails: 0,
    last_import_date: null
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [clearingOwnership, setClearingOwnership] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch users and their lead counts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users');
        
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        setUsers(data.users);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        // Fallback to empty array on error
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    const fetchImportStats = async () => {
      try {
        const response = await fetch('/api/admin/import-stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch import stats');
        }
        
        const data = await response.json();
        setImportStats(data);
      } catch (error) {
        console.error('Failed to fetch import stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (user) {
      fetchUsers();
      fetchImportStats();
    }
  }, [user]);

  const handleClearOwnership = async () => {
    if (!confirm('Are you sure you want to clear ALL ownership data? This will make all companies unclaimed again.')) {
      return;
    }

    setClearingOwnership(true);
    
    try {
      const response = await fetch('/api/admin/clear-ownership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Successfully cleared ownership for ${result.cleared_count} companies!`);
        // Refresh the stats
        const statsResponse = await fetch('/api/admin/import-stats');
        if (statsResponse.ok) {
          const newStats = await statsResponse.json();
          setImportStats(newStats);
        }
      } else {
        alert(`Failed to clear ownership: ${result.error}`);
      }
    } catch (error) {
      console.error('Error clearing ownership:', error);
      alert('Error clearing ownership. Please try again.');
    } finally {
      setClearingOwnership(false);
    }
  };

  const handleUploadLeads = async (file?: File) => {
    if (!file) {
      // If no file provided, trigger the file input
      document.getElementById('file-upload')?.click();
      return;
    }

    console.log('Uploading file:', file.name);
    setUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          console.log('File parsed successfully:', {
            consolidation_stats: data.consolidation_stats,
            company_count: data.consolidated_data?.length || 0
          });
          
          // Call the upload API
          const response = await fetch('/api/admin/upload-investor-lift', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
          });

          const result = await response.json();

          if (response.ok) {
            alert(`Upload successful! Inserted ${result.stats.successfully_inserted} companies.`);
            // Refresh the stats
            const statsResponse = await fetch('/api/admin/import-stats');
            if (statsResponse.ok) {
              const newStats = await statsResponse.json();
              setImportStats(newStats);
            }
          } else {
            alert(`Upload failed: ${result.error}`);
          }
          
        } catch (parseError) {
          console.error('Invalid JSON file:', parseError);
          alert('Invalid JSON file format');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('File reading error:', error);
      alert('Error reading file');
      setUploading(false);
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
        <div className="flex items-center justify-between">
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
              Admin Dashboard
            </h1>
          </div>
          
          <button
            onClick={() => handleUploadLeads()}
            className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Leads</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Investor Lift Scrape Section */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-card-foreground">
              Investor Lift Scrape Data
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Consolidated company data from InvestorLift platform scraping
            </p>
          </div>
          
          <div className="p-6">
            {/* Import Stats */}
            {loadingStats ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading stats...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-card-foreground">{importStats.total_companies.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Companies</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-card-foreground">{importStats.companies_with_phones.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">With Phones</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-card-foreground">{importStats.companies_with_emails.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">With Emails</p>
                </div>
              </div>
            )}
            
            {/* Last Import Info */}
            {!loadingStats && importStats.last_import_date && (
              <div className="bg-muted/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground">
                  Last import: {formatDate(importStats.last_import_date)}
                </p>
              </div>
            )}
            
            {/* Upload Area */}
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-card-foreground mb-2">
                Upload Investor Lift Data
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload consolidated JSON files from your data provider
              </p>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && !uploading) {
                    handleUploadLeads(file);
                  }
                }}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  uploading 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Uploading...' : 'Choose JSON File'}</span>
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                Supports JSON files up to 50MB
              </p>
            </div>
          </div>
        </div>

        {/* Ownership Management Section */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-card-foreground">
              Ownership Management
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage lead ownership and claims
            </p>
          </div>
          
          <div className="p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    Warning: Destructive Action
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    This will remove ALL ownership claims from ALL companies, making them available for claiming again.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleClearOwnership}
              disabled={clearingOwnership}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                clearingOwnership 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {clearingOwnership ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Clearing Ownership...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Clear ALL Ownership</span>
                </>
              )}
            </button>
            
            <p className="text-xs text-muted-foreground mt-2">
              This action cannot be undone. All users will lose their claimed leads.
            </p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-card-foreground">
              Users & Lead Counts
            </h2>
          </div>
          
          {loadingUsers ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Lead Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Joined Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-card-foreground">
                        {userItem.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-primary">
                              {userItem.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm text-card-foreground">
                            {userItem.username}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {userItem.lead_count} leads
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(userItem.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {!loadingUsers && users.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-card-foreground">
                {users.length > 0 ? Math.round(users.reduce((sum, u) => sum + u.lead_count, 0) / users.length) : 0}
              </p>
              <p className="text-sm text-muted-foreground">Avg Leads/User</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;