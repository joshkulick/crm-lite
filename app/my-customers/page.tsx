"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { StickyNote, Calendar } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

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

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  currentNotes: string;
  onSave: (notes: string) => void;
}



const NotesModal: React.FC<NotesModalProps> = ({ 
  isOpen, 
  onClose, 
  companyName, 
  currentNotes, 
  onSave 
}) => {
  const [notes, setNotes] = useState(currentNotes);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNotes(currentNotes);
  }, [currentNotes]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(notes);
      onClose();
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-2 mb-4">
          <StickyNote className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">
            Notes for {companyName}
          </h3>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full h-32 p-3 border border-border rounded-md bg-background text-foreground resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Enter notes about this customer..."
        />
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface FollowUpPopoverProps {
  companyName: string;
  currentDate: Date | null;
  onSave: (date: Date | null) => void;
  children: React.ReactNode;
}

const FollowUpPopover: React.FC<FollowUpPopoverProps> = ({ 
  companyName, 
  currentDate, 
  onSave,
  children
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(currentDate);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSelectedDate(currentDate);
  }, [currentDate]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(selectedDate);
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving follow-up date:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedDate(currentDate);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" sideOffset={5}>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">
              Schedule Follow-up for {companyName}
            </h3>
          </div>
          <div className="mb-4">
            <CalendarComponent
              mode="single"
              selected={selectedDate || undefined}
              onSelect={(date) => setSelectedDate(date || null)}
              className="rounded-md border"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface PipelineDropdownProps {
  currentPipeline: string;
  onSave: (pipeline: string) => void;
  children: React.ReactNode;
}

const PipelineDropdown: React.FC<PipelineDropdownProps> = ({ 
  currentPipeline, 
  onSave,
  children
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handlePipelineChange = async (pipeline: string) => {
    setIsSaving(true);
    try {
      await onSave(pipeline);
    } catch (error) {
      console.error('Error saving pipeline status:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const pipelineOptions = [
    'Not Outreached',
    'Outreached',
    'Sent Info',
    'Demo',
    'Trial',
    'Customer',
    'Not Interested'
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {pipelineOptions.map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => handlePipelineChange(option)}
            disabled={isSaving}
            className={option === currentPipeline ? "bg-accent" : ""}
          >
            {option}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const MyCustomersPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [notesModal, setNotesModal] = useState<{
    isOpen: boolean;
    leadId: number;
    companyName: string;
    currentNotes: string;
  }>({
    isOpen: false,
    leadId: 0,
    companyName: '',
    currentNotes: ''
  });



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

  // Refresh leads when page comes into focus (e.g., after unclaiming from outreach page)
  useEffect(() => {
    const handleFocus = () => {
      if (user && !loadingLeads) {
        fetchLeads();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, loadingLeads]);

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

  const handleSaveNotes = async (notes: string) => {
    try {
      const response = await fetch('/api/leads/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: notesModal.leadId,
          notes: notes
        })
      });

      if (response.ok) {
        // Update the leads state with the new notes
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === notesModal.leadId 
              ? { ...lead, notes } 
              : lead
          )
        );
      } else {
        console.error('Failed to save notes');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
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

  const handleSavePipeline = async (leadId: number, pipeline: string) => {
    try {
      const response = await fetch('/api/leads/pipeline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          pipeline: pipeline
        })
      });

      if (response.ok) {
        // Update the leads state with the new pipeline status
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId 
              ? { ...lead, pipeline } 
              : lead
          )
        );
      } else {
        console.error('Failed to save pipeline status');
      }
    } catch (error) {
      console.error('Error saving pipeline status:', error);
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

  const getNotesButton = (lead: Lead) => {
    const hasNotes = lead.notes && lead.notes.trim().length > 0;
    
    return (
      <button
        onClick={() => setNotesModal({
          isOpen: true,
          leadId: lead.id,
          companyName: lead.company,
          currentNotes: lead.notes || ''
        })}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: hasNotes ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted) / 0.3)',
          color: hasNotes ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
          border: hasNotes ? '1px solid hsl(var(--primary) / 0.2)' : '1px solid hsl(var(--border))'
        }}
        title={hasNotes ? 'View/Edit Notes' : 'Add Notes'}
      >
        <StickyNote className="h-4 w-4" />
      </button>
    );
  };

  const getFollowUpButton = (lead: Lead) => {
    const hasFollowUp = lead.next_follow_up;
    const followUpDate = hasFollowUp && lead.next_follow_up ? new Date(lead.next_follow_up) : null;
    
    const buttonElement = (
      <button
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: hasFollowUp ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted) / 0.3)',
          color: hasFollowUp ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
          border: hasFollowUp ? '1px solid hsl(var(--primary) / 0.2)' : '1px solid hsl(var(--border))'
        }}
        title={hasFollowUp && followUpDate ? `Follow-up scheduled for ${format(followUpDate, 'MMM dd, yyyy')}` : 'Schedule Follow-up'}
      >
        <Calendar className="h-4 w-4" />
        {hasFollowUp && followUpDate && (
          <span className="hidden sm:inline text-xs">
            {format(followUpDate, 'MMM dd')}
          </span>
        )}
      </button>
    );

    return (
      <FollowUpPopover
        companyName={lead.company}
        currentDate={followUpDate}
        onSave={(date) => handleSaveFollowUp(lead.id, date)}
      >
        {buttonElement}
      </FollowUpPopover>
    );
  };

  const getPipelineButton = (lead: Lead) => {
    return (
      <PipelineDropdown
        currentPipeline={lead.pipeline || 'Not Outreached'}
        onSave={(pipeline) => handleSavePipeline(lead.id, pipeline)}
      >
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all duration-200 hover:scale-105 bg-muted/30 text-muted-foreground border border-border hover:bg-muted/50"
          title={`Current: ${lead.pipeline || 'Not Outreached'}`}
        >
          <span className="hidden sm:inline text-xs">
            {lead.pipeline || 'Not Outreached'}
          </span>
        </button>
      </PipelineDropdown>
    );
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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-card-foreground">My Customers</h1>
          <div className="flex items-center space-x-3">
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

      {/* Main Content */}
      <div className="p-6">
        {loadingLeads ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading customers...</p>
            </div>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No customers found.</p>
            <p className="text-muted-foreground text-sm mt-2">Your customers will appear here once you have leads assigned to you.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-left p-4 font-medium text-muted-foreground">Company</TableHead>
                    <TableHead className="text-left p-4 font-medium text-muted-foreground">Contact Name</TableHead>
                    <TableHead className="text-left p-4 font-medium text-muted-foreground">Primary Contact</TableHead>
                    <TableHead className="text-left p-4 font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="text-left p-4 font-medium text-muted-foreground">Pipeline</TableHead>
                    <TableHead className="text-left p-4 font-medium text-muted-foreground">Next Follow-up</TableHead>
                    <TableHead className="text-left p-4 font-medium text-muted-foreground">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} className="border-t border-border hover:bg-muted/30">
                      <TableCell className="p-4 text-foreground font-medium">
                        {lead.company}
                      </TableCell>
                      <TableCell className="p-4 text-foreground">
                        {lead.contact_name || 'N/A'}
                      </TableCell>
                      <TableCell className="p-4 text-foreground">
                        {getPrimaryContactInfo(lead)}
                      </TableCell>
                      <TableCell className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          lead.status === 'new' 
                            ? 'bg-blue-100 text-blue-800' 
                            : lead.status === 'contacted'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {lead.status}
                        </span>
                      </TableCell>
                      <TableCell className="p-4">
                        {getPipelineButton(lead)}
                      </TableCell>
                      <TableCell className="p-4">
                        {getFollowUpButton(lead)}
                      </TableCell>
                      <TableCell className="p-4">
                        {getNotesButton(lead)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Notes Modal */}
      <NotesModal
        isOpen={notesModal.isOpen}
        onClose={() => setNotesModal(prev => ({ ...prev, isOpen: false }))}
        companyName={notesModal.companyName}
        currentNotes={notesModal.currentNotes}
        onSave={handleSaveNotes}
      />


    </div>
  );
};

export default MyCustomersPage; 