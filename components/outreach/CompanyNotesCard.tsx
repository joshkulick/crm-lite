import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

interface Note {
  id: number;
  lead_id: number;
  user_id: number;
  content: string;
  created_at: string;
}

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
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Load company notes
  const loadCompanyNotes = async () => {
    if (!isClaimed || claimedByUsername !== currentUsername) return;

    try {
      const response = await fetch(`/api/outreach/company-notes?company_id=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Failed to load company notes:', error);
    }
  };

  // Add a new note
  const addNote = async () => {
    if (!newNote.trim() || !isClaimed || claimedByUsername !== currentUsername) return;

    setAddingNote(true);
    
    try {
      const response = await fetch('/api/outreach/company-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          content: newNote.trim()
        })
      });

      const result = await response.json();

      if (response.ok) {
        setNotes(prev => [result.note, ...prev]);
        setNewNote('');
      } else {
        console.error('Failed to add note:', result.error);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setAddingNote(false);
    }
  };

  // Edit an existing note
  const editNote = async (noteId: number) => {
    if (!editingContent.trim()) return;

    setSavingEdit(true);
    
    try {
      const response = await fetch('/api/outreach/company-notes', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note_id: noteId,
          content: editingContent.trim()
        })
      });

      const result = await response.json();

      if (response.ok) {
        setNotes(prev => prev.map(note => 
          note.id === noteId ? result.note : note
        ));
        setEditingNoteId(null);
        setEditingContent('');
      } else {
        console.error('Failed to edit note:', result.error);
      }
    } catch (error) {
      console.error('Failed to edit note:', error);
    } finally {
      setSavingEdit(false);
    }
  };

  // Start editing a note
  const startEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent('');
  };

  // Load notes when company changes
  useEffect(() => {
    if (isClaimed && claimedByUsername === currentUsername) {
      setNotes([]);
      setNewNote('');
      setEditingNoteId(null);
      setEditingContent('');
      loadCompanyNotes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <span className="text-sm text-muted-foreground">
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Add new note */}
      <div className="mb-4">
        <div className="flex items-start space-x-2">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a new note about this company..."
            className="flex-1 min-h-[80px] px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
            disabled={addingNote}
          />
          <button
            onClick={addNote}
            disabled={addingNote || !newNote.trim()}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-1 ${
              addingNote || !newNote.trim()
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {addingNote ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
                <span>Adding...</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notes yet. Add your first note above.</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="border border-border rounded-md p-3 bg-accent/30">
              {editingNoteId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full min-h-[80px] px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
                    disabled={savingEdit}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={cancelEdit}
                      disabled={savingEdit}
                      className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => editNote(note.id)}
                      disabled={savingEdit || !editingContent.trim()}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        savingEdit || !editingContent.trim()
                          ? 'bg-muted text-muted-foreground cursor-not-allowed'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {savingEdit ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-card-foreground whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(note.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                      </p>
                    </div>
                    <button
                      onClick={() => startEditNote(note)}
                      className="ml-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CompanyNotesCard; 