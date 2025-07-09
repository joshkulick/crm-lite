"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Phone, Mail, Calendar, StickyNote, Filter, Plus, Trash2, List, RefreshCw } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import ListsModal from '@/components/outreach/ListsModal';
import EditListModal from '@/components/my-customers/EditListModal';

interface Note {
  id: number;
  lead_id: number;
  user_id: number;
  content: string;
  created_at: string;
}

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
  notes?: Note[];
}

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  onSave: (note: string) => void;
}

const NotesModal: React.FC<NotesModalProps> = ({ 
  isOpen, 
  onClose, 
  companyName, 
  onSave 
}) => {
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!note.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(note.trim());
      setNote('');
      onClose();
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNote('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-2 mb-4">
          <StickyNote className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">
            Add Note for {companyName}
          </h3>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full h-32 p-3 border border-border rounded-md bg-background text-foreground resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Enter a new note about this customer..."
        />
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !note.trim()}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              'Add Note'
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

// Customer List Component
interface CustomerListProps {
  customers: Lead[];
  selectedCustomer: Lead | null;
  onSelectCustomer: (customer: Lead) => void;
  loadingCustomers: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  pipelineFilter: string;
  onPipelineFilterChange: (filter: string) => void;
  selectedList: number | null;
  lists: Array<{ id: number; name: string; description: string | null; item_count: number }>;
  onClearSelectedList: () => void;
  listCustomers: Array<{ lead_id: number; company: string; contact_name: string }>;
}

const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  selectedCustomer,
  onSelectCustomer,
  loadingCustomers,
  searchQuery,
  onSearchChange,
  onClearSearch,
  pipelineFilter,
  onPipelineFilterChange,
  selectedList,
  lists,
  onClearSelectedList,
  listCustomers
}) => {
  const pipelineOptions = [
    'All',
    'Not Outreached',
    'Outreached',
    'Sent Info',
    'Demo',
    'Trial',
    'Customer',
    'Not Interested'
  ];

    return (
    <div className="w-80 border-r border-border bg-card flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="relative">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={onClearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={pipelineFilter}
            onChange={(e) => onPipelineFilterChange(e.target.value)}
            className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {pipelineOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-card-foreground">
            {selectedList 
              ? lists.find(l => l.id === selectedList)?.name || 'Selected List'
              : 'My Customers'
            } ({selectedList ? listCustomers.length : customers.length})
          </h2>
          {selectedList && (
            <button
              onClick={onClearSelectedList}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {searchQuery 
            ? `${customers.length} result${customers.length !== 1 ? 's' : ''} for &quot;${searchQuery}&quot;`
            : selectedList 
              ? 'Customers in this list'
              : 'Select a customer to view details'
          }
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {customers.map((customer) => (
          <div
            key={customer.id}
            onClick={() => onSelectCustomer(customer)}
            className={`relative p-4 border-b border-border cursor-pointer transition-colors hover:bg-accent/50 ${
              selectedCustomer?.id === customer.id ? 'bg-accent border-l-2 border-l-primary' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm text-card-foreground truncate flex-1">
                {customer.company}
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                customer.pipeline === 'Customer' 
                  ? 'bg-green-100 text-green-800' 
                  : customer.pipeline === 'Trial'
                  ? 'bg-blue-100 text-blue-800'
                  : customer.pipeline === 'Demo'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {customer.pipeline}
              </span>
            </div>
            
            <div className="space-y-1">
              {customer.contact_name && (
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {customer.contact_name}
                  </span>
                </div>
              )}
              
              {customer.phone_numbers && Array.isArray(customer.phone_numbers) && customer.phone_numbers.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {customer.phone_numbers.length} phone{customer.phone_numbers.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              
              {customer.emails && Array.isArray(customer.emails) && customer.emails.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {customer.emails.length} email{customer.emails.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {customer.next_follow_up && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Follow-up: {format(new Date(customer.next_follow_up), 'MMM dd')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {loadingCustomers && (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-xs text-muted-foreground mt-2">Loading customers...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Customer Details Component
interface CustomerDetailsProps {
  customer: Lead | null;
  onSaveNotes: (notes: string) => Promise<void>;
  onSaveFollowUp: (date: Date | null) => Promise<void>;
  onSavePipeline: (pipeline: string) => Promise<void>;
  user: { id: number; username: string } | null;
  setEditModal: (modal: { isOpen: boolean; note: Note | null }) => void;
  setDeleteModal: (modal: { isOpen: boolean; customer: Lead | null }) => void;
  setListsModal: (modal: { isOpen: boolean; customer: Lead | null }) => void;
}

const CustomerDetails: React.FC<CustomerDetailsProps> = ({
  customer,
  onSaveNotes,
  onSaveFollowUp,
  onSavePipeline,
  user,
  setEditModal,
  setDeleteModal,
  setListsModal
}) => {
  const [notesModal, setNotesModal] = useState<{
    isOpen: boolean;
    currentNotes: string;
  }>({
    isOpen: false,
    currentNotes: ''
  });

  useEffect(() => {
    setNotesModal({
      isOpen: false,
      currentNotes: ''
    });
  }, [customer]);

  if (!customer) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-card-foreground mb-2">
            No Customer Selected
          </h3>
          <p className="text-muted-foreground">
            Select a customer from the list to view their details
          </p>
        </div>
      </div>
    );
  }

  const getPrimaryContactInfo = () => {
    if (customer.preferred_contact_value) {
      return `${customer.preferred_contact_method}: ${customer.preferred_contact_value}`;
    }
    
    if (customer.phone_numbers && customer.phone_numbers.length > 0) {
      return `Phone: ${customer.phone_numbers[0]}`;
    }
    
    if (customer.emails && customer.emails.length > 0) {
      return `Email: ${customer.emails[0]}`;
    }
    
    return 'No contact info';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-6 overflow-y-auto flex-1">
        {/* Customer Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground mb-2">
              {customer.company}
            </h1>
            <p className="text-sm text-muted-foreground">
              Added on {new Date(customer.created_at).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
              customer.pipeline === 'Customer' 
                ? 'bg-green-100 text-green-800' 
                : customer.pipeline === 'Trial'
                ? 'bg-blue-100 text-blue-800'
                : customer.pipeline === 'Demo'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {customer.pipeline}
            </span>
            <button
              onClick={() => setListsModal({ isOpen: true, customer })}
              className="p-2 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-md transition-colors"
              title="Manage lists"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleteModal({ isOpen: true, customer })}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              title="Delete customer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-card-foreground mb-3">Contact Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact Name</label>
                <p className="text-foreground">{customer.contact_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Primary Contact</label>
                <p className="text-foreground">{getPrimaryContactInfo()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  customer.status === 'new' 
                    ? 'bg-blue-100 text-blue-800' 
                    : customer.status === 'contacted'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {customer.status}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-card-foreground mb-3">Pipeline & Follow-up</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Pipeline Stage</label>
                <PipelineDropdown
                  currentPipeline={customer.pipeline || 'Not Outreached'}
                  onSave={(pipeline) => onSavePipeline(pipeline)}
                >
                  <button className="w-full text-left px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground hover:bg-accent/50 transition-colors">
                    {customer.pipeline || 'Not Outreached'}
                  </button>
                </PipelineDropdown>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Next Follow-up</label>
                <FollowUpPopover
                  companyName={customer.company}
                  currentDate={customer.next_follow_up ? new Date(customer.next_follow_up) : null}
                  onSave={(date) => onSaveFollowUp(date)}
                >
                  <button className="w-full text-left px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground hover:bg-accent/50 transition-colors flex items-center justify-between">
                    <span>
                      {customer.next_follow_up 
                        ? format(new Date(customer.next_follow_up), 'MMM dd, yyyy')
                        : 'Schedule follow-up'
                      }
                    </span>
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </button>
                </FollowUpPopover>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {customer.phone_numbers && Array.isArray(customer.phone_numbers) && customer.phone_numbers.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-card-foreground mb-3">Phone Numbers</h3>
              <div className="grid grid-cols-2 gap-2">
                {customer.phone_numbers.map((phone, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground text-sm truncate">
                      {typeof phone === 'string' ? phone : (phone as {number: string}).number || JSON.stringify(phone)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customer.emails && Array.isArray(customer.emails) && customer.emails.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-card-foreground mb-3">Email Addresses</h3>
              <div className="grid grid-cols-2 gap-2">
                {customer.emails.map((email, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground text-sm truncate">
                      {typeof email === 'string' ? email : (email as {email: string}).email || JSON.stringify(email)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-card-foreground">Notes Trail</h3>
            <button
              onClick={() => setNotesModal({
                isOpen: true,
                currentNotes: ''
              })}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all duration-200 hover:scale-105 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
            >
              <StickyNote className="h-4 w-4" />
              Add Note
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {customer.notes && Array.isArray(customer.notes) && customer.notes.length > 0 ? (
              customer.notes.map((note, index) => (
                <div key={note.id || index} className="bg-muted/30 rounded-md p-3 border-l-4 border-l-primary">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.created_at), 'MMM dd, yyyy - h:mm a')}
                    </span>
                    {user && note.user_id === user.id && (
                      <button
                        className="text-xs text-primary underline ml-2"
                        onClick={() => setEditModal({ isOpen: true, note })}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                </div>
              ))
            ) : (
              <div className="bg-muted/30 rounded-md p-3 min-h-[100px] flex items-center justify-center">
                <p className="text-muted-foreground italic">No notes yet. Click &quot;Add Note&quot; to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes Modal */}
      <NotesModal
        isOpen={notesModal.isOpen}
        onClose={() => setNotesModal(prev => ({ ...prev, isOpen: false }))}
        companyName={customer.company}
        onSave={onSaveNotes}
      />
      {/* EditNoteModal is now passed as a prop */}
    </div>
  );
};

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customerData: {
    company: string;
    contact_name?: string;
    phone_numbers: string[];
    emails: string[];
    point_of_contact?: string;
    preferred_contact_method?: 'call' | 'email' | 'text';
    preferred_contact_value?: string;
    pipeline?: string;
    next_follow_up?: string;
  }) => Promise<void>;
}

const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    company: '',
    contact_name: '',
    phone_numbers: [''],
    emails: [''],
    point_of_contact: '',
    preferred_contact_method: 'call' as 'call' | 'email' | 'text',
    preferred_contact_value: '',
    pipeline: 'Not Outreached' as string,
    next_follow_up: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company.trim()) return;
    
    setIsSaving(true);
    try {
      // Filter out empty phone numbers and emails
      const phoneNumbers = formData.phone_numbers.filter(phone => phone.trim() !== '');
      const emails = formData.emails.filter(email => email.trim() !== '');
      
      await onSave({
        ...formData,
        phone_numbers: phoneNumbers,
        emails: emails
      });
      
      // Reset form
      setFormData({
        company: '',
        contact_name: '',
        phone_numbers: [''],
        emails: [''],
        point_of_contact: '',
        preferred_contact_method: 'call',
        preferred_contact_value: '',
        pipeline: 'Not Outreached',
        next_follow_up: ''
      });
      onClose();
    } catch (error) {
      console.error('Error creating customer:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addPhoneNumber = () => {
    setFormData(prev => ({
      ...prev,
      phone_numbers: [...prev.phone_numbers, '']
    }));
  };

  const removePhoneNumber = (index: number) => {
    setFormData(prev => ({
      ...prev,
      phone_numbers: prev.phone_numbers.filter((_, i) => i !== index)
    }));
  };

  const updatePhoneNumber = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      phone_numbers: prev.phone_numbers.map((phone, i) => i === index ? value : phone)
    }));
  };

  const addEmail = () => {
    setFormData(prev => ({
      ...prev,
      emails: [...prev.emails, '']
    }));
  };

  const removeEmail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index)
    }));
  };

  const updateEmail = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.map((email, i) => i === index ? value : email)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-6">
          <Plus className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Add New Customer</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter company name"
              required
            />
          </div>

          {/* Contact Name */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Contact Name
            </label>
            <input
              type="text"
              value={formData.contact_name}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter contact name"
            />
          </div>

          {/* Phone Numbers */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Phone Numbers
            </label>
            {formData.phone_numbers.map((phone, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => updatePhoneNumber(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter phone number"
                />
                {formData.phone_numbers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhoneNumber(index)}
                    className="px-3 py-2 text-red-500 hover:text-red-700 transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addPhoneNumber}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              + Add Phone Number
            </button>
          </div>

          {/* Email Addresses */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Email Addresses
            </label>
            {formData.emails.map((email, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter email address"
                />
                {formData.emails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEmail(index)}
                    className="px-3 py-2 text-red-500 hover:text-red-700 transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addEmail}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              + Add Email Address
            </button>
          </div>

          {/* Preferred Contact Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Preferred Contact Method
              </label>
              <select
                value={formData.preferred_contact_method}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  preferred_contact_method: e.target.value as 'call' | 'email' | 'text' 
                }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="text">Text</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Contact Value
              </label>
              <input
                type="text"
                value={formData.preferred_contact_value}
                onChange={(e) => setFormData(prev => ({ ...prev, preferred_contact_value: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter contact value"
              />
            </div>
          </div>

          {/* Pipeline Status */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Pipeline Status
            </label>
            <select
              value={formData.pipeline}
              onChange={(e) => setFormData(prev => ({ ...prev, pipeline: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="Not Outreached">Not Outreached</option>
              <option value="Outreached">Outreached</option>
              <option value="Sent Info">Sent Info</option>
              <option value="Demo">Demo</option>
              <option value="Trial">Trial</option>
              <option value="Customer">Customer</option>
              <option value="Not Interested">Not Interested</option>
            </select>
          </div>

          {/* Next Follow-up */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Next Follow-up Date
            </label>
            <input
              type="date"
              value={formData.next_follow_up}
              onChange={(e) => setFormData(prev => ({ ...prev, next_follow_up: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !formData.company.trim()}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                'Create Customer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  onConfirm: () => Promise<void>;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  customerName, 
  onConfirm 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting customer:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold text-card-foreground">
            Delete Customer
          </h3>
        </div>
        <p className="text-muted-foreground mb-6">
          Are you sure you want to delete <strong>{customerName}</strong>? This action cannot be undone and will permanently remove all associated notes and data.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Deleting...
              </>
            ) : (
              'Delete Customer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  onSave: (noteId: number, content: string) => void;
}

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (listData: { name: string; description?: string }) => Promise<void>;
}

const EditNoteModal: React.FC<EditNoteModalProps> = ({ isOpen, onClose, note, onSave }) => {
  const [content, setContent] = useState(note?.content || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContent(note?.content || '');
  }, [note]);

  const handleSave = async () => {
    if (!note || !content.trim()) return;
    setIsSaving(true);
    try {
      await onSave(note.id, content.trim());
      onClose();
    } catch {
      // handle error
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !note) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-2 mb-4">
          <StickyNote className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Edit Note</h3>
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full h-32 p-3 border border-border rounded-md bg-background text-foreground resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <div className="flex justify-end space-x-3 mt-4">
          <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={handleSave} disabled={isSaving || !content.trim()} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
            {isSaving ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Saving...</>) : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateListModal: React.FC<CreateListModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined
      });
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating list:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Create New List</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              List Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter list name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={3}
              placeholder="Enter list description (optional)"
            />
          </div>
        </form>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !formData.name.trim()}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              'Create List'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const MyCustomersPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<Lead[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Lead[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Lead | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pipelineFilter, setPipelineFilter] = useState('All');
  const [editModal, setEditModal] = useState<{ isOpen: boolean; note: Note | null }>({ isOpen: false, note: null });
  const [createModal, setCreateModal] = useState<{ isOpen: boolean }>({ isOpen: false });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; customer: Lead | null }>({ isOpen: false, customer: null });
  const [listsModal, setListsModal] = useState<{ isOpen: boolean; customer: Lead | null }>({ isOpen: false, customer: null });
  const [lists, setLists] = useState<Array<{ id: number; name: string; description: string | null; item_count: number }>>([]);
  const [selectedList, setSelectedList] = useState<number | null>(null);
  const [loadingLists, setLoadingLists] = useState(false);
  const [createListModal, setCreateListModal] = useState(false);
  const [editListModal, setEditListModal] = useState<{ isOpen: boolean; list: { id: number; name: string; description: string | null } | null }>({ isOpen: false, list: null });
  const [listCustomers, setListCustomers] = useState<Array<{ lead_id: number; company: string; contact_name: string }>>([]);
  // Add a loading state for the edit list modal
  const [editListModalLoading, setEditListModalLoading] = useState(false);

  // Helper to open EditListModal and ensure listCustomers is loaded
  const handleOpenEditListModal = async (list: { id: number; name: string; description: string | null }) => {
    setEditListModalLoading(true);
    await fetchListCustomers(list.id);
    setEditListModal({ isOpen: true, list });
    setEditListModalLoading(false);
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch customers when user is authenticated
  useEffect(() => {
    if (user) {
      fetchCustomers();
      fetchLists();
    }
  }, [user]);

  // Refresh customers when page comes into focus
  useEffect(() => {
    const handleFocus = () => {
      if (user && !loadingCustomers) {
        fetchCustomers();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, loadingCustomers]);

  // Fetch list customers when a list is selected
  useEffect(() => {
    if (selectedList) {
      fetchListCustomers(selectedList);
    } else {
      setListCustomers([]);
    }
  }, [selectedList]);

  // Filter customers based on search, pipeline filter, and selected list
  useEffect(() => {
    let filtered = customers;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(customer =>
        customer.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.contact_name && customer.contact_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply pipeline filter
    if (pipelineFilter !== 'All') {
      filtered = filtered.filter(customer => customer.pipeline === pipelineFilter);
    }

    // Apply list filter if a list is selected
    if (selectedList) {
      // Filter to show only customers in the selected list
      const listCustomerIds = listCustomers.map(c => c.lead_id);
      filtered = filtered.filter(customer => listCustomerIds.includes(customer.id));
    }

    setFilteredCustomers(filtered);
  }, [customers, searchQuery, pipelineFilter, selectedList, listCustomers]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/leads/contact-method');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.leads || []);
      } else {
        console.error('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchLists = async () => {
    setLoadingLists(true);
    try {
      const response = await fetch('/api/leads/lists');
      if (response.ok) {
        const data = await response.json();
        setLists(data.lists || []);
      } else {
        console.error('Failed to fetch lists');
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setLoadingLists(false);
    }
  };

  const handleCreateList = async (listData: { name: string; description?: string }) => {
    try {
      const response = await fetch('/api/leads/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listData)
      });

      if (response.ok) {
        const data = await response.json();
        setLists(prev => [data.list, ...prev]);
        setSelectedList(data.list.id);
        setCreateListModal(false);
        // Refresh lists to get updated counts
        await fetchLists();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create list');
      }
    } catch (error) {
      console.error('Error creating list:', error);
      throw error;
    }
  };

  const fetchListCustomers = async (listId: number) => {
    try {
      const response = await fetch(`/api/leads/lists?list_id=${listId}`);
      if (response.ok) {
        const data = await response.json();
        setListCustomers(data.items || []);
      } else {
        console.error('Failed to fetch list customers');
      }
    } catch (error) {
      console.error('Error fetching list customers:', error);
    }
  };

  const handleUpdateList = async (listId: number, listData: { name?: string; description?: string }) => {
    try {
      const response = await fetch('/api/leads/lists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id: listId,
          ...listData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLists(prev => prev.map(list => 
          list.id === listId ? { ...list, ...data.list } : list
        ));
        // Refresh lists to get updated counts
        await fetchLists();
        setEditListModal({ isOpen: false, list: null });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update list');
      }
    } catch (error) {
      console.error('Error updating list:', error);
      throw error;
    }
  };

  const handleDeleteList = async (listId: number) => {
    console.log('Attempting to delete list:', listId);
    try {
      const response = await fetch(`/api/leads/lists?list_id=${listId}`, {
        method: 'DELETE'
      });

      console.log('Delete response status:', response.status);
      
      if (response.ok) {
        console.log('List deleted successfully');
        setLists(prev => prev.filter(list => list.id !== listId));
        if (selectedList === listId) {
          setSelectedList(null);
          setListCustomers([]);
        }
        // Refresh lists to get updated counts
        await fetchLists();
      } else {
        const errorData = await response.json();
        console.error('Delete list error response:', errorData);
        throw new Error(errorData.error || 'Failed to delete list');
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      throw error;
    }
  };

  const handleSaveNotes = async (noteContent: string) => {
    if (!selectedCustomer) return;
    
    try {
      const response = await fetch('/api/leads/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedCustomer.id,
          content: noteContent
        })
      });

      if (response.ok) {
        const newNote = await response.json();
        
        // Update the customers state with the new note
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => 
            customer.id === selectedCustomer.id 
              ? { 
                  ...customer, 
                  notes: [...(customer.notes || []), newNote.note]
                } 
              : customer
          )
        );
        // Update selected customer
        setSelectedCustomer(prev => prev ? { 
          ...prev, 
          notes: [...(prev.notes || []), newNote.note]
        } : null);
      } else {
        console.error('Failed to save note');
      }
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleSaveFollowUp = async (date: Date | null) => {
    if (!selectedCustomer) return;
    
    try {
      const response = await fetch('/api/leads/follow-up', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedCustomer.id,
          next_follow_up: date ? date.toISOString() : null
        })
      });

      if (response.ok) {
        // Update the customers state with the new follow-up date
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => 
            customer.id === selectedCustomer.id 
              ? { ...customer, next_follow_up: date ? date.toISOString() : null } 
              : customer
          )
        );
        // Update selected customer
        setSelectedCustomer(prev => prev ? { ...prev, next_follow_up: date ? date.toISOString() : null } : null);
      } else {
        console.error('Failed to save follow-up date');
      }
    } catch (error) {
      console.error('Error saving follow-up date:', error);
    }
  };

  const handleSavePipeline = async (pipeline: string) => {
    if (!selectedCustomer) return;
    
    try {
      const response = await fetch('/api/leads/pipeline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedCustomer.id,
          pipeline: pipeline
        })
      });

      if (response.ok) {
        // Update the customers state with the new pipeline status
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => 
            customer.id === selectedCustomer.id 
              ? { ...customer, pipeline } 
              : customer
          )
        );
        // Update selected customer
        setSelectedCustomer(prev => prev ? { ...prev, pipeline } : null);
      } else {
        console.error('Failed to save pipeline status');
      }
    } catch (error) {
      console.error('Error saving pipeline status:', error);
    }
  };

  const handleEditNote = async (noteId: number, content: string) => {
    if (!selectedCustomer) return;
    try {
      const response = await fetch('/api/leads/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_id: noteId, content })
      });
      if (response.ok) {
        const { note: updatedNote } = await response.json();
        setCustomers(prevCustomers => prevCustomers.map(c =>
          c.id === selectedCustomer.id
            ? { ...c, notes: (c.notes || []).map(n => n.id === noteId ? updatedNote : n) }
            : c
        ));
        setSelectedCustomer(prev => prev ? {
          ...prev,
          notes: (prev.notes || []).map(n => n.id === noteId ? updatedNote : n)
        } : null);
      }
    } catch {
      // handle error
    }
  };

  const handleCreateCustomer = async (customerData: {
    company: string;
    contact_name?: string;
    phone_numbers: string[];
    emails: string[];
    point_of_contact?: string;
    preferred_contact_method?: 'call' | 'email' | 'text';
    preferred_contact_value?: string;
    pipeline?: string;
    next_follow_up?: string;
  }) => {
    try {
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });

      if (response.ok) {
        const { lead } = await response.json();
        
        // Add the new customer to the list
        setCustomers(prevCustomers => [lead, ...prevCustomers]);
        
        // Select the new customer
        setSelectedCustomer(lead);
        
        // Clear search and filters to show the new customer
        setSearchQuery('');
        setPipelineFilter('All');
      } else {
        const errorData = await response.json();
        console.error('Failed to create customer:', errorData.error);
        throw new Error(errorData.error || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteModal.customer) return;
    
    try {
      const response = await fetch('/api/leads/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: deleteModal.customer.id })
      });

      if (response.ok) {
        // Remove the customer from the list
        setCustomers(prevCustomers => 
          prevCustomers.filter(customer => customer.id !== deleteModal.customer!.id)
        );
        
        // Clear selection if the deleted customer was selected
        if (selectedCustomer?.id === deleteModal.customer.id) {
          setSelectedCustomer(null);
        }
        
        // Close the modal
        setDeleteModal({ isOpen: false, customer: null });
      } else {
        const errorData = await response.json();
        console.error('Failed to delete customer:', errorData.error);
        throw new Error(errorData.error || 'Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  };

  const handleAddToList = async (listId: number, leadIds?: number | number[]) => {
    let customerIds: number[] = [];
    if (Array.isArray(leadIds)) {
      customerIds = leadIds;
    } else if (typeof leadIds === 'number') {
      customerIds = [leadIds];
    } else if (listsModal.customer?.id) {
      customerIds = [listsModal.customer.id];
    }
    if (customerIds.length === 0) return;
    try {
      const response = await fetch('/api/leads/lists/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id: listId,
          lead_ids: customerIds
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || 'Failed to add customer(s) to list');
      }
      // Optionally handle response.results for bulk
      return await response.json();
    } catch (error) {
      console.error('Error adding customer(s) to list:', error);
      throw error;
    }
  };

  const handleRemoveFromList = async (listId: number, leadIds?: number | number[]) => {
    let customerIds: number[] = [];
    if (Array.isArray(leadIds)) {
      customerIds = leadIds;
    } else if (typeof leadIds === 'number') {
      customerIds = [leadIds];
    } else if (listsModal.customer?.id) {
      customerIds = [listsModal.customer.id];
    }
    if (customerIds.length === 0) return;
    try {
      const response = await fetch('/api/leads/lists/items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id: listId,
          lead_ids: customerIds
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || 'Failed to remove customer(s) from list');
      }
      // Optionally handle response.results for bulk
      return await response.json();
    } catch (error) {
      console.error('Error removing customer(s) from list:', error);
      throw error;
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

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="text-muted-foreground hover:text-card-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-card-foreground">
              My Customers
            </h1>
          </div>
          
          {/* List Tabs */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-muted/30 rounded-lg p-1">
              {loadingLists ? (
                <div className="px-3 py-1.5 text-sm text-muted-foreground flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                  Loading lists...
                </div>
              ) : (
                <>
                                {lists.map((list) => (
                <div key={list.id} className="relative">
                  <button
                    onClick={() => setSelectedList(selectedList === list.id ? null : list.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleOpenEditListModal(list);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${
                      selectedList === list.id
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="truncate max-w-24">{list.name}</span>
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {list.item_count}
                    </span>
                  </button>
                </div>
              ))}
                  
                  {/* Add List Button */}
                  <button
                    onClick={() => setCreateListModal(true)}
                    className="px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="Create new list"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => setCreateModal({ isOpen: true })}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                title="Add customer"
              >
                <Users className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setLoadingCustomers(true);
                  fetchCustomers();
                }}
                disabled={loadingCustomers}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors disabled:opacity-50"
                title="Refresh customers"
              >
                <RefreshCw className={`h-4 w-4 ${loadingCustomers ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Customer List */}
        <CustomerList
          customers={filteredCustomers}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
          loadingCustomers={loadingCustomers}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          pipelineFilter={pipelineFilter}
          onPipelineFilterChange={setPipelineFilter}
          selectedList={selectedList}
          lists={lists}
          onClearSelectedList={() => setSelectedList(null)}
          listCustomers={listCustomers}
        />

        {/* Main Content - Customer Details */}
        <CustomerDetails
          customer={selectedCustomer}
          onSaveNotes={handleSaveNotes}
          onSaveFollowUp={handleSaveFollowUp}
          onSavePipeline={handleSavePipeline}
          user={user}
          setEditModal={setEditModal}
          setDeleteModal={setDeleteModal}
          setListsModal={setListsModal}
        />
      </div>
      <EditNoteModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, note: null })}
        note={editModal.note}
        onSave={handleEditNote}
      />
      <CreateCustomerModal
        isOpen={createModal.isOpen}
        onClose={() => setCreateModal({ isOpen: false })}
        onSave={handleCreateCustomer}
      />
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, customer: null })}
        customerName={deleteModal.customer?.company || ''}
        onConfirm={handleDeleteCustomer}
      />
      <ListsModal
        isOpen={listsModal.isOpen}
        onClose={() => setListsModal({ isOpen: false, customer: null })}
        customerId={listsModal.customer?.id}
        customerName={listsModal.customer?.company}
        onAddToList={handleAddToList}
        onRemoveFromList={handleRemoveFromList}
      />
      <CreateListModal
        isOpen={createListModal}
        onClose={() => setCreateListModal(false)}
        onSave={handleCreateList}
      />
      {editListModal.isOpen && (
        editListModalLoading ? (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4 flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading list customers...</p>
            </div>
          </div>
        ) : (
          <EditListModal
            isOpen={editListModal.isOpen}
            onClose={() => setEditListModal({ isOpen: false, list: null })}
            list={editListModal.list}
            customers={customers}
            onSave={handleUpdateList}
            onAddCustomer={handleAddToList}
            onRemoveCustomer={handleRemoveFromList}
            onDeleteList={handleDeleteList}
            onRefreshListCustomers={fetchListCustomers}
            onRefreshLists={fetchLists}
            listCustomers={listCustomers}
          />
        )
      )}
    </div>
  );
};

export default MyCustomersPage; 