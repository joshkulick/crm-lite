import React, { useState } from 'react';
import { LinkIcon, ChevronDown, ChevronUp, ExternalLink, Copy, Check } from 'lucide-react';

interface DealUrlsCardProps {
  dealUrls: string[];
  companyId: number;
}

const DealUrlsCard: React.FC<DealUrlsCardProps> = ({ dealUrls, companyId }) => {
  const [expandedDropdowns, setExpandedDropdowns] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const toggleDropdown = (dropdownId: string) => {
    setExpandedDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dropdownId)) {
        newSet.delete(dropdownId);
      } else {
        newSet.add(dropdownId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (dealUrls.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center space-x-2 mb-2">
        <LinkIcon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-card-foreground">Deal URLs</span>
      </div>
      <div className="bg-card border border-border rounded-lg p-4">
        <button
          onClick={() => toggleDropdown(`deal-urls-${companyId}`)}
          className="flex items-center justify-between w-full text-left text-sm text-muted-foreground hover:text-card-foreground"
        >
          <span>{dealUrls.length} deal URL{dealUrls.length !== 1 ? 's' : ''}</span>
          {expandedDropdowns.has(`deal-urls-${companyId}`) ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        
        {expandedDropdowns.has(`deal-urls-${companyId}`) && (
          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
            {dealUrls.map((url, index) => (
              <div
                key={`${companyId}-deal-${index}`}
                className="flex items-center justify-between p-2 bg-accent/50 rounded-md"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 truncate flex-1"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{url}</span>
                </a>
                <button
                  onClick={() => copyToClipboard(url, `Deal URL ${index + 1}`)}
                  className="ml-2 p-1 text-muted-foreground hover:text-card-foreground transition-colors"
                >
                  {copiedField === `Deal URL ${index + 1}` ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealUrlsCard; 