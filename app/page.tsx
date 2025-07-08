"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const CRMDashboard = () => {
  const { user, loading, signout } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

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
      {/* Header with user info and signout */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-card-foreground">
            Welcome, {user.username}
          </h2>
          <div className="flex items-center space-x-4">
            <Link
              href="/admin"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-md hover:bg-accent"
            >
              Admin
            </Link>
            <button
              onClick={signout}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-md hover:bg-accent"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main CRM Content */}
      <div className="flex items-center justify-center p-8" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="text-center space-y-12">
          {/* Main Title */}
          <h1 className="text-5xl font-bold text-foreground tracking-tight">
            Casafy CRM
          </h1>
          
          {/* Navigation Grid */}
          <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
            <Link 
              href="/new-signups" 
              className="group relative overflow-hidden bg-card border border-border rounded-lg p-8 hover:bg-accent transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold text-card-foreground group-hover:text-accent-foreground transition-colors">
                  New Signups
                </h3>
                <p className="text-sm text-muted-foreground mt-2 group-hover:text-accent-foreground/80 transition-colors">
                  Fresh leads
                </p>
              </div>
            </Link>
            
            <Link 
              href="/my-customers" 
              className="group relative overflow-hidden bg-card border border-border rounded-lg p-8 hover:bg-accent transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold text-card-foreground group-hover:text-accent-foreground transition-colors">
                  My Customers
                </h3>
                <p className="text-sm text-muted-foreground mt-2 group-hover:text-accent-foreground/80 transition-colors">
                  View your leads
                </p>
              </div>
            </Link>
            
            <Link 
              href="/my-tasks" 
              className="group relative overflow-hidden bg-card border border-border rounded-lg p-8 hover:bg-accent transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold text-card-foreground group-hover:text-accent-foreground transition-colors">
                  My Tasks
                </h3>
                <p className="text-sm text-muted-foreground mt-2 group-hover:text-accent-foreground/80 transition-colors">
                  To-do items
                </p>
              </div>
            </Link>
            
            <Link 
              href="/outreach" 
              className="group relative overflow-hidden bg-card border border-border rounded-lg p-8 hover:bg-accent transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold text-card-foreground group-hover:text-accent-foreground transition-colors">
                  Outreach
                </h3>
                <p className="text-sm text-muted-foreground mt-2 group-hover:text-accent-foreground/80 transition-colors">
                  Communication
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;