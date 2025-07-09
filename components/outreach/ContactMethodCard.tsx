import React, { useState, useEffect } from 'react';
import { Contact } from 'lucide-react';
import { ContactMethodForm, Lead } from './types';

interface ContactMethodCardProps {
  companyName: string;
  isClaimed: boolean;
  claimedByUsername: string | undefined;
  currentUsername: string | undefined;
  phoneNumbers: Array<{ number: string }>;
  emails: Array<{ email: string }>;
}

const ContactMethodCard: React.FC<ContactMethodCardProps> = ({
  companyName,
  isClaimed,
  claimedByUsername,
  currentUsername,
  phoneNumbers,
  emails
}) => {
  const [contactMethodForm, setContactMethodForm] = useState<ContactMethodForm>({
    point_of_contact: '',
    preferred_contact_method: '',
    preferred_contact_value: '',
    custom_contact_value: ''
  });
  const [editingContactMethod, setEditingContactMethod] = useState(false);
  const [savingContactMethod, setSavingContactMethod] = useState(false);

  // Load contact method data for claimed leads
  const loadLeadContactMethod = async () => {
    if (!isClaimed || claimedByUsername !== currentUsername) {
      return;
    }

    try {
      const response = await fetch('/api/leads/contact-method');
      if (response.ok) {
        const data = await response.json();
        const lead = data.leads.find((l: Lead) => l.company === companyName);
        if (lead && lead.point_of_contact) {
          setContactMethodForm({
            point_of_contact: lead.point_of_contact || '',
            preferred_contact_method: lead.preferred_contact_method || '',
            preferred_contact_value: lead.preferred_contact_value || '',
            custom_contact_value: ''
          });
        }
      }
    } catch (error) {
      console.error('Failed to load contact method:', error);
    }
  };

  // Reset contact method form when company changes  
  useEffect(() => {
    if (isClaimed && claimedByUsername === currentUsername) {
      setContactMethodForm({
        point_of_contact: '',
        preferred_contact_method: '',
        preferred_contact_value: '',
        custom_contact_value: ''
      });
      setEditingContactMethod(false);
      loadLeadContactMethod();
    }
  }, [companyName, isClaimed, claimedByUsername, currentUsername]);

  const handleContactMethodChange = (method: 'call' | 'email' | 'text' | '') => {
    setContactMethodForm(prev => ({
      ...prev,
      preferred_contact_method: method,
      preferred_contact_value: '' // Reset value when method changes
    }));
  };

  const getFilteredContactValues = (): string[] => {
    if (!contactMethodForm.preferred_contact_method) return [];
    
    if (contactMethodForm.preferred_contact_method === 'call' || contactMethodForm.preferred_contact_method === 'text') {
      return phoneNumbers.map(phone => phone.number);
    } else if (contactMethodForm.preferred_contact_method === 'email') {
      return emails.map(email => email.email);
    }
    
    return [];
  };

  const saveContactMethod = async () => {
    if (!isClaimed || claimedByUsername !== currentUsername) {
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
      const lead = leadsData.leads.find((l: Lead) => l.company === companyName);
      
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
          contact_name: contactMethodForm.point_of_contact,
          point_of_contact: contactMethodForm.point_of_contact,
          preferred_contact_method: contactMethodForm.preferred_contact_method,
          preferred_contact_value: contactMethodForm.preferred_contact_value
        })
      });

      const result = await response.json();

      if (response.ok) {
        setEditingContactMethod(false);
      } else {
        console.error('Failed to update contact method:', result.error);
      }
    } catch (error) {
      console.error('Failed to save contact method:', error);
    } finally {
      setSavingContactMethod(false);
    }
  };

  // Only show for claimed leads by current user
  if (!isClaimed || claimedByUsername !== currentUsername) {
    return null;
  }

  return (
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
              <input
                type="text"
                value={contactMethodForm.point_of_contact}
                onChange={(e) => setContactMethodForm(prev => ({ ...prev, point_of_contact: e.target.value }))}
                placeholder="Enter contact person name"
                className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
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
              {contactMethodForm.preferred_contact_value === 'custom' ? (
                <input
                  type={contactMethodForm.preferred_contact_method === 'email' ? 'email' : 'tel'}
                  value={contactMethodForm.custom_contact_value || ''}
                  onChange={(e) => setContactMethodForm(prev => ({ 
                    ...prev, 
                    custom_contact_value: e.target.value,
                    preferred_contact_value: e.target.value 
                  }))}
                  placeholder={`Enter ${contactMethodForm.preferred_contact_method === 'email' ? 'email address' : 'phone number'}`}
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              ) : (
                <select
                  value={contactMethodForm.preferred_contact_value}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setContactMethodForm(prev => ({ 
                        ...prev, 
                        preferred_contact_value: 'custom',
                        custom_contact_value: ''
                      }));
                    } else {
                      setContactMethodForm(prev => ({ 
                        ...prev, 
                        preferred_contact_value: e.target.value,
                        custom_contact_value: ''
                      }));
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select {contactMethodForm.preferred_contact_method === 'email' ? 'email' : 'phone'}</option>
                  {getFilteredContactValues().map((value, index) => (
                    <option key={index} value={value}>{value}</option>
                  ))}
                  <option value="custom">+ Add New {contactMethodForm.preferred_contact_method === 'email' ? 'Email' : 'Phone Number'}</option>
                </select>
              )}
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
  );
};

export default ContactMethodCard; 