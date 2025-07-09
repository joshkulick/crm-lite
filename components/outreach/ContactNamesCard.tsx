import React from 'react';
import { Users } from 'lucide-react';

interface ContactNamesCardProps {
  contactNames: string[];
}

const ContactNamesCard: React.FC<ContactNamesCardProps> = ({ contactNames }) => {
  if (contactNames.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center space-x-2 mb-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-card-foreground">Contacts</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {contactNames.map((name, index) => (
          <span 
            key={`contact-${index}`}
            className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ContactNamesCard; 