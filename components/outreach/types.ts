export interface PhoneNumber {
  number: string;
  associated_deal_urls: string[];
}

export interface Email {
  email: string;
  associated_deal_urls: string[];
}

export interface Company {
  id: number;
  company_name: string;
  contact_names: string[];
  deal_urls: string[];
  phone_numbers: PhoneNumber[];
  emails: Email[];
  created_at: string;
  unique_key?: string;
  is_claimed?: boolean;
  claimed_by_username?: string;
  notes?: string;
}

export interface ContactMethodForm {
  point_of_contact: string;
  preferred_contact_method: 'call' | 'email' | 'text' | '';
  preferred_contact_value: string;
  custom_contact_value?: string;
}

export interface Lead {
  id: number;
  company: string;
  contact_name: string;
  point_of_contact: string | null;
  preferred_contact_method: string | null;
  preferred_contact_value: string | null;
  phone_numbers: string;
  emails: string;
  status: string;
  created_at: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
} 