"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useOutreach } from '@/hooks/useOutreach';
import CompanyList from '@/components/outreach/CompanyList';
import CompanyHeader from '@/components/outreach/CompanyHeader';
import ContactNamesCard from '@/components/outreach/ContactNamesCard';
import ContactMethodCard from '@/components/outreach/ContactMethodCard';
import CompanyNotesCard from '@/components/outreach/CompanyNotesCard';
import ContactInfoCard from '@/components/outreach/ContactInfoCard';
import DealUrlsCard from '@/components/outreach/DealUrlsCard';
import ToastNotifications from '@/components/outreach/ToastNotifications';
import EmptyState from '@/components/outreach/EmptyState';
import ConnectionStatus from '@/components/outreach/ConnectionStatus';


const OutreachPage = () => {
  const router = useRouter();
  const {
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
    setSelectedCompany,
    claimCompany,
    unclaimCompany,
    removeToast,
    handleSearchChange,
    handlePhoneSearch,
    clearSearch,
    handleFilterChange,
    isConnected
  } = useOutreach();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

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
      <ToastNotifications toasts={toasts} onRemoveToast={removeToast} />

      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-muted-foreground hover:text-card-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold text-card-foreground">
              Outreach
            </h1>
          </div>
          <ConnectionStatus isConnected={isConnected} />
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Company List */}
        <CompanyList
          companies={filteredCompanies}
          selectedCompany={selectedCompany}
          onSelectCompany={setSelectedCompany}
          loadingCompanies={loadingCompanies}
          hasMore={hasMore}
          listRef={listRef}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onPhoneSearch={handlePhoneSearch}
          onClearSearch={clearSearch}
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedCompany ? (
            <div className="p-6">
              {/* Company Header */}
              <CompanyHeader
                company={selectedCompany}
                currentUsername={user?.username}
                claimingCompany={claimingCompany}
                unclaimingCompany={unclaimingCompany}
                onClaimCompany={claimCompany}
                onUnclaimCompany={unclaimCompany}
              />

              {/* Contact Names */}
              <ContactNamesCard contactNames={selectedCompany.contact_names} />

              {/* Contact Method Card - Only for claimed leads by current user */}
              <ContactMethodCard
                companyName={selectedCompany.company_name}
                isClaimed={selectedCompany.is_claimed || false}
                claimedByUsername={selectedCompany.claimed_by_username}
                currentUsername={user?.username}
                phoneNumbers={selectedCompany.phone_numbers}
                emails={selectedCompany.emails}
              />

              {/* Company Notes Section */}
              <CompanyNotesCard
                companyId={selectedCompany.id}
                isClaimed={selectedCompany.is_claimed || false}
                claimedByUsername={selectedCompany.claimed_by_username}
                currentUsername={user?.username}
              />

              {/* Contact Information */}
              <ContactInfoCard
                phoneNumbers={selectedCompany.phone_numbers}
                emails={selectedCompany.emails}
                companyId={selectedCompany.id}
              />

              {/* Deal URLs */}
              <DealUrlsCard
                dealUrls={selectedCompany.deal_urls}
                companyId={selectedCompany.id}
              />
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
};

export default OutreachPage;