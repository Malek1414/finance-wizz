CREATE TABLE IF NOT EXISTS finance_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  value DECIMAL(12,2) DEFAULT 0,
  parent_id UUID REFERENCES finance_nodes(id) ON DELETE CASCADE,
  is_editable BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(255),
  brand VARCHAR(255),
  colorway VARCHAR(255),
  estimated_price DECIMAL(10,2),
  target_price DECIMAL(10,2),
  priority VARCHAR(20) DEFAULT 'MEDIUM',
  status VARCHAR(20) DEFAULT 'WISHLIST',
  notes TEXT,
  last_price_fetch TIMESTAMP,
  current_best_price DECIMAL(10,2),
  product_link TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  merchant VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  auto_category VARCHAR(100),
  user_category VARCHAR(100),
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency VARCHAR(20),
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_pattern VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
