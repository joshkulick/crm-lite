import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';

interface CompanyNotesCardProps {
  companyId: number;
  isClaimed: boolean;
  claimedByUsername: string | undefined;
  currentUsername: string | undefined;
}

const CompanyNotesCard: React.FC<CompanyNotesCardProps> = ({
  companyId,
  isClaimed,
  claimedByUsername,
  currentUsername
}) => {
  const [companyNotes, setCompanyNotes] = useState<string>('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  // Load company notes
  const loadCompanyNotes = async () => {
    if (!isClaimed || claimedByUsername !== currentUsername) return;

    try {
      const response = await fetch(`/api/outreach/company-notes?company_id=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setCompanyNotes(data.notes || '');
      }
    } catch (error) {
      console.error('Failed to load company notes:', error);
    }
  };

  // Save company notes
  const saveCompanyNotes = async () => {
    if (!isClaimed || claimedByUsername !== currentUsername) return;

    setSavingNotes(true);
    
    try {
      const response = await fetch('/api/outreach/company-notes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          notes: companyNotes
        })
      });

      const result = await response.json();

      if (response.ok) {
        setEditingNotes(false);
      } else {
        console.error('Failed to save notes:', result.error);
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setSavingNotes(false);
    }
  };

  // Load notes when company changes
  useEffect(() => {
    if (isClaimed && claimedByUsername === currentUsername) {
      setCompanyNotes('');
      setEditingNotes(false);
      loadCompanyNotes();
    }
  }, [companyId, isClaimed, claimedByUsername, currentUsername]);

  // Show different content based on claim status
  if (!isClaimed) {
    return (
      <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-card-foreground">Company Notes</h2>
        </div>
        <div className="min-h-[100px] p-3 bg-accent/30 border border-border rounded-md">
          <p className="text-sm text-muted-foreground italic">
            Notes are available after claiming this company. Click the &quot;Claim Company&quot; button above to get started.
          </p>
        </div>
      </div>
    );
  }

  if (claimedByUsername !== currentUsername) {
    return null; // Don't show notes for companies claimed by other users
  }

  return (
    <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-card-foreground">Company Notes</h2>
        </div>
        <button
          onClick={() => {
            if (editingNotes) {
              setEditingNotes(false);
              loadCompanyNotes(); // Reset to original notes
            } else {
              setEditingNotes(true);
            }
          }}
          className="flex items-center space-x-2 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
        >
          <span>{editingNotes ? 'Cancel' : 'Edit'}</span>
        </button>
      </div>

      {!editingNotes ? (
        <div className="min-h-[100px] p-3 bg-accent/30 border border-border rounded-md">
          {companyNotes ? (
            <p className="text-sm text-card-foreground whitespace-pre-wrap">{companyNotes}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No notes added yet. Click Edit to add notes about this company.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <textarea
            value={companyNotes}
            onChange={(e) => setCompanyNotes(e.target.value)}
            placeholder="Add notes about this company, contact details, conversation history, or any other relevant information..."
            className="w-full min-h-[150px] px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
          />
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setEditingNotes(false);
                loadCompanyNotes();
              }}
              className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveCompanyNotes}
              disabled={savingNotes}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                savingNotes
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {savingNotes ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save Notes'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyNotesCard; 