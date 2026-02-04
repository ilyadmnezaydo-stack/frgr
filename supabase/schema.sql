-- Reset schema (Caution: Deletes data)
DROP TABLE IF EXISTS contact_emails;
DROP TABLE IF EXISTS contact_phones;
DROP TABLE IF EXISTS contacts;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core Identity
  full_name TEXT,
  company TEXT,
  position TEXT,
  
  -- Contact Details
  email TEXT,
  phone TEXT,
  linkedin TEXT,
  telegram TEXT,
  website TEXT,
  
  -- Meta / Custom Fields
  country TEXT,
  rating TEXT,
  network TEXT,
  birth_date TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable simple searching
CREATE INDEX idx_contacts_full_name ON contacts(full_name);
CREATE INDEX idx_contacts_company ON contacts(company);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
