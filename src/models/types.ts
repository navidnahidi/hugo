// Application record type
export interface ApplicationRecord {
  id: string;
  status: string;
  data: string | null; // JSON string of application data
  submitted_at: string | null;
  quote_price: number | null;
  created_at: string;
  updated_at: string;
}
