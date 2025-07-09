import React, { useState } from 'react';
import { Phone, Mail, Copy, Check, ChevronDown, ChevronUp, ExternalLink, MessageSquare } from 'lucide-react';
import { PhoneNumber, Email } from './types';

interface ContactInfoCardProps {
  phoneNumbers: PhoneNumber[];
  emails: Email[];
  companyId: number;
}

const ContactInfoCard: React.FC<ContactInfoCardProps> = ({
  phoneNumbers,
  emails,
  companyId
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedDropdowns, setExpandedDropdowns] = useState<Set<string>>(new Set());

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Phone Numbers */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Phone className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-card-foreground">
            Phone Numbers ({phoneNumbers.length})
          </h2>
        </div>
        
        {phoneNumbers.length > 0 ? (
          <div className="space-y-3">
            {phoneNumbers.map((phone, index) => (
              <div 
                key={`${companyId}-phone-${index}`}
                className="border border-border rounded-lg p-3 bg-accent/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-card-foreground">{phone.number}</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => copyToClipboard(phone.number, `Phone ${index + 1}`)}
                      className="p-1 text-muted-foreground hover:text-card-foreground transition-colors"
                    >
                      {copiedField === `Phone ${index + 1}` ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <a
                      href={`tel:${phone.number}`}
                      className="p-1 text-green-600 hover:text-green-700 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                    </a>
                    <a
                      href={`sms:${phone.number}`}
                      className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                
                {phone.associated_deal_urls.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleDropdown(`phone-deals-${companyId}-${index}`)}
                      className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-card-foreground transition-colors"
                    >
                      {expandedDropdowns.has(`phone-deals-${companyId}-${index}`) ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      <span>{phone.associated_deal_urls.length} associated deal{phone.associated_deal_urls.length !== 1 ? 's' : ''}</span>
                    </button>
                    
                    {expandedDropdowns.has(`phone-deals-${companyId}-${index}`) && (
                      <div className="mt-2 space-y-1 pl-4 max-h-32 overflow-y-auto">
                        {phone.associated_deal_urls.map((url, urlIndex) => (
                          <a
                            key={`${companyId}-phone-${index}-deal-${urlIndex}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-xs text-blue-600 hover:text-blue-800 truncate"
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{url}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No phone numbers available</p>
        )}
      </div>

      {/* Email Addresses */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Mail className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-card-foreground">
            Emails ({emails.length})
          </h2>
        </div>
        
        {emails.length > 0 ? (
          <div className="space-y-3">
            {emails.map((email, index) => (
              <div 
                key={`${companyId}-email-${index}`}
                className="border border-border rounded-lg p-3 bg-accent/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-card-foreground break-all">{email.email}</span>
                  <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => copyToClipboard(email.email, `Email ${index + 1}`)}
                      className="p-1 text-muted-foreground hover:text-card-foreground transition-colors"
                    >
                      {copiedField === `Email ${index + 1}` ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <a
                      href={`mailto:${email.email}`}
                      className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Mail className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                
                {email.associated_deal_urls.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleDropdown(`email-deals-${companyId}-${index}`)}
                      className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-card-foreground transition-colors"
                    >
                      {expandedDropdowns.has(`email-deals-${companyId}-${index}`) ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      <span>{email.associated_deal_urls.length} associated deal{email.associated_deal_urls.length !== 1 ? 's' : ''}</span>
                    </button>
                    
                    {expandedDropdowns.has(`email-deals-${companyId}-${index}`) && (
                      <div className="mt-2 space-y-1 pl-4 max-h-32 overflow-y-auto">
                        {email.associated_deal_urls.map((url, urlIndex) => (
                          <a
                            key={`${companyId}-email-${index}-deal-${urlIndex}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-xs text-blue-600 hover:text-blue-800 truncate"
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{url}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No email addresses available</p>
        )}
      </div>
    </div>
  );
};

export default ContactInfoCard; 