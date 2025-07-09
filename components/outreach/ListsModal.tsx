"use client";

import React, { useEffect, useState } from 'react';
import { X, Plus, Edit, Trash2, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface List {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  item_count: number;
}

interface ListItem {
  id: number;
  lead_id: number;
  added_at: string;
  company: string;
  contact_name: string;
  phone_numbers: string[];
  emails: string[];
  pipeline: string;
  status: string;
}

interface ListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: number;
  customerName?: string;
  onAddToList?: (listId: number) => Promise<void>;
  onRemoveFromList?: (listId: number) => Promise<void>;
}

const ListsModal: React.FC<ListsModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  onAddToList,
  onRemoveFromList
}) => {
  const [lists, setLists] = useState<List[]>([]);
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<{ isOpen: boolean; list: List | null }>({ isOpen: false, list: null });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; list: List | null }>({ isOpen: false, list: null });
  const [newListData, setNewListData] = useState({ name: '', description: '' });
  const [editListData, setEditListData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLists();
    }
  }, [isOpen]);

  const fetchLists = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leads/lists');
      if (response.ok) {
        const data = await response.json();
        setLists(data.lists || []);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchListItems = async (listId: number) => {
    try {
      const response = await fetch(`/api/leads/lists?list_id=${listId}`);
      if (response.ok) {
        const data = await response.json();
        setListItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching list items:', error);
    }
  };

  const handleCreateList = async () => {
    if (!newListData.name.trim()) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/leads/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newListData)
      });

      if (response.ok) {
        const data = await response.json();
        setLists(prev => [data.list, ...prev]);
        setNewListData({ name: '', description: '' });
        setCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating list:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateList = async () => {
    if (!editModal.list || !editListData.name.trim()) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/leads/lists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id: editModal.list.id,
          ...editListData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLists(prev => prev.map(list => 
          list.id === editModal.list!.id ? data.list : list
        ));
        setEditModal({ isOpen: false, list: null });
        setEditListData({ name: '', description: '' });
      }
    } catch (error) {
      console.error('Error updating list:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteList = async () => {
    if (!deleteModal.list) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/leads/lists?list_id=${deleteModal.list.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setLists(prev => prev.filter(list => list.id !== deleteModal.list!.id));
        if (selectedList?.id === deleteModal.list.id) {
          setSelectedList(null);
          setListItems([]);
        }
        setDeleteModal({ isOpen: false, list: null });
      }
    } catch (error) {
      console.error('Error deleting list:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddToList = async (listId: number) => {
    if (!customerId || !onAddToList) return;
    
    try {
      await onAddToList(listId);
      // Refresh lists to update item count
      fetchLists();
    } catch (error) {
      console.error('Error adding to list:', error);
    }
  };

  const handleRemoveFromList = async (listId: number) => {
    if (!customerId || !onRemoveFromList) return;
    
    try {
      await onRemoveFromList(listId);
      // Refresh lists to update item count
      fetchLists();
    } catch (error) {
      console.error('Error removing from list:', error);
    }
  };

  const isCustomerInList = (listId: number) => {
    return listItems.some(item => item.lead_id === customerId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-card-foreground">
                Customer Lists
              </h2>
              {customerName && (
                <p className="text-sm text-muted-foreground">
                  Managing lists for {customerName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Sidebar - Lists */}
          <div className="w-80 border-r border-border flex flex-col">
            {/* Lists Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-card-foreground">My Lists</h3>
              <button
                onClick={() => setCreateModal(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New List
              </button>
            </div>

            {/* Lists */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-xs text-muted-foreground mt-2">Loading lists...</p>
                </div>
              ) : lists.length === 0 ? (
                <div className="p-4 text-center">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No lists yet</p>
                  <button
                    onClick={() => setCreateModal(true)}
                    className="text-xs text-primary hover:text-primary/80 mt-2"
                  >
                    Create your first list
                  </button>
                </div>
              ) : (
                lists.map((list) => (
                  <div
                    key={list.id}
                    className={`p-4 border-b border-border cursor-pointer transition-colors hover:bg-accent/50 ${
                      selectedList?.id === list.id ? 'bg-accent border-l-2 border-l-primary' : ''
                    }`}
                    onClick={() => {
                      setSelectedList(list);
                      fetchListItems(list.id);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm text-card-foreground truncate flex-1">
                        {list.name}
                      </h4>
                      <div className="flex items-center gap-1">
                        {customerId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isCustomerInList(list.id)) {
                                handleRemoveFromList(list.id);
                              } else {
                                handleAddToList(list.id);
                              }
                            }}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              isCustomerInList(list.id)
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {isCustomerInList(list.id) ? 'Remove' : 'Add'}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditModal({ isOpen: true, list });
                            setEditListData({ name: list.name, description: list.description || '' });
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ isOpen: true, list });
                          }}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    
                    {list.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {list.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{list.item_count} customer{list.item_count !== 1 ? 's' : ''}</span>
                      <span>{format(new Date(list.updated_at), 'MMM dd')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Side - List Items */}
          <div className="flex-1 flex flex-col">
            {selectedList ? (
              <>
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-card-foreground mb-1">
                    {selectedList.name}
                  </h3>
                  {selectedList.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedList.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {listItems.length} customer{listItems.length !== 1 ? 's' : ''} in this list
                  </p>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {listItems.map((item) => (
                    <div key={item.id} className="p-4 border-b border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm text-card-foreground">
                          {item.company}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.pipeline === 'Customer' 
                            ? 'bg-green-100 text-green-800' 
                            : item.pipeline === 'Trial'
                            ? 'bg-blue-100 text-blue-800'
                            : item.pipeline === 'Demo'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.pipeline}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        {item.contact_name && (
                          <div className="flex items-center space-x-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {item.contact_name}
                            </span>
                          </div>
                        )}
                        
                        {item.phone_numbers && item.phone_numbers.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {item.phone_numbers.length} phone{item.phone_numbers.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        
                        {item.emails && item.emails.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {item.emails.length} email{item.emails.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-card-foreground mb-2">
                    No List Selected
                  </h3>
                  <p className="text-muted-foreground">
                    Select a list from the sidebar to view its customers
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create List Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-card-foreground">Create New List</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  List Name *
                </label>
                <input
                  type="text"
                  value={newListData.name}
                  onChange={(e) => setNewListData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter list name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={newListData.description}
                  onChange={(e) => setNewListData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Enter list description (optional)"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setCreateModal(false)}
                disabled={saving}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateList}
                disabled={saving || !newListData.name.trim()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
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
      )}

      {/* Edit List Modal */}
      {editModal.isOpen && editModal.list && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-2 mb-4">
              <Edit className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-card-foreground">Edit List</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  List Name *
                </label>
                <input
                  type="text"
                  value={editListData.name}
                  onChange={(e) => setEditListData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter list name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={editListData.description}
                  onChange={(e) => setEditListData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Enter list description (optional)"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditModal({ isOpen: false, list: null })}
                disabled={saving}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateList}
                disabled={saving || !editListData.name.trim()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.list && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-semibold text-card-foreground">Delete List</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete <strong>{deleteModal.list.name}</strong>? This action cannot be undone and will remove all customers from this list.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, list: null })}
                disabled={saving}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteList}
                disabled={saving}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete List'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListsModal; 