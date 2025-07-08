"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Copy, ChevronLeft, ChevronRight, Building2, User, Phone, Mail, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface Lead {
  id: number;
  company: string;
  contact_name: string;
  point_of_contact: string | null;
  preferred_contact_method: string | null;
  preferred_contact_value: string | null;
  phone_numbers: string[];
  emails: string[];
  status: string;
  next_follow_up: string | null;
  pipeline: string;
  created_at: string;
  notes?: string;
}

interface Task {
  id: number;
  company: string;
  contact_name: string;
  pipeline: string;
  next_follow_up: string;
  primary_contact: string;
}

const MyTasksPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch leads when user is authenticated
  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads/contact-method');
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      } else {
        console.error('Failed to fetch leads');
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoadingLeads(false);
    }
  };

  const getPrimaryContactInfo = (lead: Lead) => {
    if (lead.preferred_contact_value) {
      return `${lead.preferred_contact_method}: ${lead.preferred_contact_value}`;
    }
    
    if (lead.phone_numbers && lead.phone_numbers.length > 0) {
      return `Phone: ${lead.phone_numbers[0]}`;
    }
    
    if (lead.emails && lead.emails.length > 0) {
      return `Email: ${lead.emails[0]}`;
    }
    
    return 'No contact info';
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleSaveFollowUp = async (leadId: number, date: Date | null) => {
    try {
      const response = await fetch('/api/leads/follow-up', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          next_follow_up: date ? date.toISOString() : null
        })
      });

      if (response.ok) {
        // Update the leads state with the new follow-up date
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId 
              ? { ...lead, next_follow_up: date ? date.toISOString() : null } 
              : lead
          )
        );
      } else {
        console.error('Failed to save follow-up date');
      }
    } catch (error) {
      console.error('Error saving follow-up date:', error);
    }
  };

  const getTasksForDate = (date: Date): Task[] => {
    return leads
      .filter(lead => {
        if (!lead.next_follow_up) return false;
        const followUpDate = new Date(lead.next_follow_up);
        return isSameDay(followUpDate, date);
      })
      .map(lead => ({
        id: lead.id,
        company: lead.company,
        contact_name: lead.contact_name || 'N/A',
        pipeline: lead.pipeline || 'Not Outreached',
        next_follow_up: lead.next_follow_up!,
        primary_contact: getPrimaryContactInfo(lead)
      }));
  };

  const getCalendarDays = () => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('application/json', JSON.stringify(task));
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const taskData = e.dataTransfer.getData('application/json');
    if (taskData) {
      const task: Task = JSON.parse(taskData);
      const newDate = new Date(targetDate);
      newDate.setHours(9, 0, 0, 0); // Set to 9 AM
      handleSaveFollowUp(task.id, newDate);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getPipelineColor = (pipeline: string) => {
    switch (pipeline) {
      case 'Not Outreached':
        return 'bg-gray-100 text-gray-800';
      case 'Outreached':
        return 'bg-blue-100 text-blue-800';
      case 'Sent Info':
        return 'bg-yellow-100 text-yellow-800';
      case 'Demo':
        return 'bg-purple-100 text-purple-800';
      case 'Trial':
        return 'bg-orange-100 text-orange-800';
      case 'Customer':
        return 'bg-green-100 text-green-800';
      case 'Not Interested':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  const calendarDays = getCalendarDays();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-card-foreground">My Tasks</h1>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'week' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'month' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Month
              </button>
            </div>
            <button
              onClick={() => {
                setLoadingLeads(true);
                fetchLeads();
              }}
              disabled={loadingLeads}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-md hover:bg-accent disabled:opacity-50"
            >
              {loadingLeads ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-md hover:bg-accent"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Calendar Navigation */}
      <div className="bg-card border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentDate(viewMode === 'week' ? subDays(currentDate, 7) : subDays(currentDate, 30))}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-semibold text-card-foreground">
              {viewMode === 'week' 
                ? `${format(calendarDays[0], 'MMM dd')} - ${format(calendarDays[6], 'MMM dd, yyyy')}`
                : format(currentDate, 'MMMM yyyy')
              }
            </h2>
            <button
              onClick={() => setCurrentDate(viewMode === 'week' ? addDays(currentDate, 7) : addDays(currentDate, 30))}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-md hover:bg-accent"
          >
            Today
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {loadingLeads ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-border">
              {/* Day Headers */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="bg-muted/50 p-3 text-center">
                  <span className="text-sm font-medium text-muted-foreground">{day}</span>
                </div>
              ))}
              
              {/* Calendar Days */}
              {calendarDays.map((day) => {
                const tasks = getTasksForDate(day);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[120px] p-3 bg-background ${
                      isToday ? 'bg-primary/5 border-2 border-primary' : ''
                    }`}
                    onDrop={(e) => handleDrop(e, day)}
                    onDragOver={handleDragOver}
                  >
                    {/* Date Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${
                        isToday ? 'text-primary font-bold' : 'text-muted-foreground'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      {tasks.length > 0 && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                          {tasks.length}
                        </span>
                      )}
                    </div>
                    
                    {/* Tasks */}
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <HoverCard key={task.id}>
                          <HoverCardTrigger asChild>
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, task)}
                              className="group cursor-move bg-card border border-border rounded-md p-2 hover:shadow-md transition-all duration-200"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-foreground truncate">
                                    {task.company}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {task.contact_name}
                                  </div>
                                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getPipelineColor(task.pipeline)}`}>
                                    {task.pipeline}
                                  </div>
                                </div>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(task.primary_contact);
                                        }}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Copy primary contact</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80 p-4">
                            <div className="space-y-3">
                              {/* Header */}
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <h4 className="font-semibold text-foreground">{task.company}</h4>
                              </div>
                              
                              {/* Contact Information */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm text-foreground">{task.contact_name}</span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {task.primary_contact.startsWith('Phone:') ? (
                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                  ) : task.primary_contact.startsWith('Email:') ? (
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span className="text-sm text-muted-foreground">{task.primary_contact}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 ml-auto"
                                    onClick={() => copyToClipboard(task.primary_contact)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Pipeline Status */}
                              <div className="flex items-center gap-2">
                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPipelineColor(task.pipeline)}`}>
                                  {task.pipeline}
                                </div>
                              </div>
                              
                              {/* Scheduled Time */}
                              <div className="flex items-center gap-2 pt-2 border-t border-border">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  Scheduled for {format(new Date(task.next_follow_up), 'MMM dd, yyyy')}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(task.next_follow_up), 'h:mm a')}
                                </span>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTasksPage; 