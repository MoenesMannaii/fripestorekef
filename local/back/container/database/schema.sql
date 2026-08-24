PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin','worker')) NOT NULL DEFAULT 'worker',
  pin TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1
);

-- Products table with soft delete support
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cost_price DECIMAL(10,2) DEFAULT 0.00,
  stock INTEGER DEFAULT 0,
  barcode TEXT,
  description TEXT,
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
);

-- Product images
CREATE TABLE product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  url TEXT,
  is_primary BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Orders
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax DECIMAL(12,2) DEFAULT 0.00,
  paid_amount DECIMAL(12,2) DEFAULT 0.00,
  change_amount DECIMAL(12,2) DEFAULT 0.00,
  payment_method TEXT CHECK(payment_method IN ('cash','card','other')) DEFAULT 'cash',
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Order items
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  name TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Factures (Invoices)
CREATE TABLE factures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_number TEXT NOT NULL UNIQUE,
  supplier_name TEXT NOT NULL,
  supplier_info TEXT,
  supplier_phone TEXT,
  supplier_email TEXT,
  supplier_address TEXT,
  facture_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  comment TEXT,
  status TEXT CHECK(status IN ('draft','confirmed','cancelled')) DEFAULT 'draft',
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Facture items
CREATE TABLE facture_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_cost DECIMAL(12,2) NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (facture_id) REFERENCES factures(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Audit logs
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  actor_role TEXT CHECK(actor_role IN ('admin','worker')),
  action TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Templates for receipts and business info
CREATE TABLE templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT DEFAULT 'Receiptify Corp.',
  address TEXT DEFAULT '123 Main St, Anytown, CA 90210',
  phone TEXT DEFAULT '(555) 123-4567',
  email TEXT DEFAULT 'support@receiptify.com',
  website TEXT DEFAULT 'www.receiptify.com',
  tax_number TEXT DEFAULT 'TAX-ID: 987654321',
  logo_path TEXT,
  thank_you_message TEXT DEFAULT 'Merci pour votre achat !',
  return_policy TEXT DEFAULT 'Retours acceptés dans un délai d''un jour avec le reçu original. Certaines exclusions s''appliquent.',
  is_default BOOLEAN DEFAULT 0,
  is_current BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_deleted ON products(deleted_at);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_factures_number ON factures(facture_number);
CREATE INDEX idx_factures_status ON factures(status);
CREATE INDEX idx_factures_created_by ON factures(created_by);
CREATE INDEX idx_facture_items_facture_id ON facture_items(facture_id);
CREATE INDEX idx_facture_items_product_id ON facture_items(product_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, actor_role);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_users_timestamp 
AFTER UPDATE ON users 
FOR EACH ROW 
BEGIN 
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
END;

CREATE TRIGGER update_products_timestamp 
AFTER UPDATE ON products 
FOR EACH ROW 
BEGIN 
  UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
END;

CREATE TRIGGER update_factures_timestamp 
AFTER UPDATE ON factures 
FOR EACH ROW 
BEGIN 
  UPDATE factures SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
END;

CREATE TRIGGER update_templates_timestamp 
AFTER UPDATE ON templates 
FOR EACH ROW 
BEGIN 
  UPDATE templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
END;

-- Trigger to update product stock when facture items are added (for confirmed factures)
CREATE TRIGGER update_stock_on_facture_confirmation
AFTER UPDATE ON factures
FOR EACH ROW
WHEN NEW.status = 'confirmed' AND OLD.status != 'confirmed'
BEGIN
  UPDATE products 
  SET stock = stock + (
    SELECT quantity FROM facture_items 
    WHERE facture_id = NEW.id AND product_id = products.id
  ),
  cost_price = (
    SELECT unit_cost FROM facture_items 
    WHERE facture_id = NEW.id AND product_id = products.id 
    ORDER BY created_at DESC LIMIT 1
  ),
  updated_at = CURRENT_TIMESTAMP
  WHERE id IN (SELECT product_id FROM facture_items WHERE facture_id = NEW.id);
END;

-- Trigger to prevent deletion of active users with orders
CREATE TRIGGER prevent_user_deletion
BEFORE DELETE ON users
FOR EACH ROW
WHEN (SELECT COUNT(*) FROM orders WHERE user_id = OLD.id) > 0
BEGIN
  SELECT RAISE(ABORT, 'Cannot delete user with associated orders');
END;

-- Insert default template
INSERT INTO templates (business_name, address, phone, email, website, tax_number, thank_you_message, return_policy, is_default, is_current) 
VALUES (
  'ÆVE POS System',
  'Votre adresse ici',
  'Votre téléphone ici',
  'votre@email.com',
  'www.votresite.com',
  'TAX-ID: À DÉFINIR',
  'Merci pour votre achat ! Nous vous remercions de votre confiance.',
  'Retours acceptés dans les 7 jours avec le reçu original. Produts non ouverts uniquement.',
  1, 
  1
);

-- Insert default admin user (password: admin123)
INSERT INTO users (name, email, password_hash, role, is_active) 
VALUES (
  'Wassim', 
  'admin@aeve.com', 
  '$2a$10$EfPK833TmTpu.XCGV02w6.BoUmq4zAjtF7s25tajQ7UpBWPvY7yFW', -- password: admin2K25
  'admin', 
  1
);