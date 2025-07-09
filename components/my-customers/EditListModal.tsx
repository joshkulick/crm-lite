import React, { useEffect, useState } from 'react';
import { Edit, Trash2, X } from 'lucide-react';

interface Lead {
  id: number;
  company: string;
  contact_name: string;
}

interface EditListModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: { id: number; name: string; description: string | null } | null;
  customers: Lead[];
  onSave: (listId: number, listData: { name?: string; description?: string }) => Promise<void>;
  onAddCustomer: (listId: number, leadIds: number | number[]) => Promise<void>;
  onRemoveCustomer: (listId: number, leadIds: number | number[]) => Promise<void>;
  onDeleteList: (listId: number) => Promise<void>;
  onRefreshListCustomers: (listId: number) => Promise<void>;
  onRefreshLists: () => Promise<void>;
  listCustomers: Array<{ lead_id: number; company: string; contact_name: string }>;
}

const EditListModal: React.FC<EditListModalProps> = ({ 
  isOpen, 
  onClose, 
  list, 
  customers, 
  onSave, 
  onAddCustomer, 
  onRemoveCustomer, 
  onDeleteList,
  onRefreshListCustomers,
  onRefreshLists,
  listCustomers 
}) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());
  // Store the original state for comparison
  const [originalFormData, setOriginalFormData] = useState({ name: '', description: '' });
  const [originalSelectedCustomers, setOriginalSelectedCustomers] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (list) {
      const name = list.name;
      const description = list.description || '';
      setFormData({ name, description });
      setOriginalFormData({ name, description });
      const selected = new Set(listCustomers.map(c => c.lead_id));
      setSelectedCustomers(selected);
      setOriginalSelectedCustomers(new Set(selected));
    }
  }, [list, listCustomers]);

  // Helper to compare sets
  const setsAreEqual = (a: Set<number>, b: Set<number>) => {
    if (a.size !== b.size) return false;
    for (const val of a) if (!b.has(val)) return false;
    return true;
  };

  // Determine if anything has changed
  const hasChanges =
    formData.name.trim() !== originalFormData.name.trim() ||
    formData.description.trim() !== originalFormData.description.trim() ||
    !setsAreEqual(selectedCustomers, originalSelectedCustomers);

  // Unified confirm handler
  const handleUnifiedConfirm = async () => {
    if (!list) return;
    setIsSaving(true);
    try {
      // Update list details if changed
      if (
        formData.name.trim() !== originalFormData.name.trim() ||
        formData.description.trim() !== originalFormData.description.trim()
      ) {
        await onSave(list!.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined
        });
      }
      // Add/remove customers if changed
      if (!setsAreEqual(selectedCustomers, originalSelectedCustomers)) {
        const toAdd = Array.from(selectedCustomers).filter(
          (id) => !originalSelectedCustomers.has(id)
        );
        const toRemove = Array.from(originalSelectedCustomers).filter(
          (id) => !selectedCustomers.has(id)
        );
        if (toAdd.length > 0) {
          await onAddCustomer(list!.id, toAdd);
        }
        if (toRemove.length > 0) {
          await onRemoveCustomer(list!.id, toRemove);
        }
      }
      await onRefreshListCustomers(list!.id);
      await onRefreshLists();
      onClose();
    } catch (error) {
      console.error('Error updating list:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomerToggle = (customerId: number) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  if (!isOpen || !list) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Edit className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-card-foreground">
                Edit List: {list.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Select customers to add or remove from this list
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDeleteList(list.id)}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              title="Delete list"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Side - List Details */}
          <div className="w-80 border-r border-border p-6">
            <form onSubmit={e => e.preventDefault()} className="space-y-4">
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
              {/* Only show Confirm/Cancel if there are changes */}
              {hasChanges && (
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
                    type="button"
                    onClick={handleUnifiedConfirm}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating...
                      </>
                    ) : (
                      'Confirm Changes'
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Right Side - Customer Selection */}
          <div className="flex-1 flex flex-col">
            <div className="p-6 border-b border-border">
              <h3 className="font-semibold text-card-foreground mb-2">
                Select Customers ({selectedCustomers.size} selected)
              </h3>
              <p className="text-sm text-muted-foreground">
                Click on customer cards to add or remove them from this list
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerToggle(customer.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedCustomers.has(customer.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm text-card-foreground truncate">
                        {customer.company}
                      </h4>
                      {selectedCustomers.has(customer.id) && (
                        <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    {customer.contact_name && (
                      <p className="text-xs text-muted-foreground">
                        {customer.contact_name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditListModal; 