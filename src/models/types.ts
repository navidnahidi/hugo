// Application record type
export interface ApplicationRecord {
  id: string;
  primary_driver_id: string | null;
  mailing_address_id: string | null;
  garaging_address_id: string | null;
  status: string;
  submitted_at: string | null;
  quote_price: number | null;
  created_at: string;
  updated_at: string;
}

// Primary driver record type
export interface PrimaryDriverRecord {
  id: string;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  drivers_license_number: string | null;
  drivers_license_state: string | null;
  created_at: string;
  updated_at: string;
}

// Mailing address record type
export interface MailingAddressRecord {
  id: string;
  application_id: string;
  street: string | null;
  unit: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  created_at: string;
  updated_at: string;
}

// Garaging address record type
export interface GaragingAddressRecord {
  id: string;
  application_id: string;
  street: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  created_at: string;
  updated_at: string;
}

// Vehicle record type
export interface VehicleRecord {
  id: string;
  application_id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  created_at: string;
  updated_at: string;
}

// Additional driver record type
export interface AdditionalDriverRecord {
  id: string;
  application_id: string;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  relationship: string | null;
  created_at: string;
  updated_at: string;
}
