const { 
  User, Product, ProductImage, Order, OrderItem, Facture, FactureItem, Template, AuditLog,
  CreditSale, Shift, Client, Supplier, Promotion, PromotionBundleItem, 
  Printer, RestaurantTable, TableSession, sequelize
} = require("../Models");

// Map of models for easy access
const modelsMap = { 
  users: User, 
  products: Product, 
  product_images: ProductImage, 
  orders: Order, 
  order_items: OrderItem, 
  factures: Facture, 
  facture_items: FactureItem, 
  templates: Template, 
  audit_logs: AuditLog,
  credit_sales: CreditSale,
  shifts: Shift,
  clients: Client,
  suppliers: Supplier,
  promotions: Promotion,
  promotion_bundle_items: PromotionBundleItem,
  printers: Printer,
  restaurant_tables: RestaurantTable,
  table_sessions: TableSession
};

const RESTRICTED_ALL = ['orders', 'order_items', 'factures', 'facture_items', 'audit_logs', 'shifts', 'table_sessions'];
const RESTRICTED_DELETE_ONLY = ['users'];

// Define table relationships for automatic backup
const relationships = {
  users: ["orders", "factures", "shifts", "table_sessions"],
  products: ["product_images", "order_items", "facture_items", "promotions", "promotion_bundle_items"],
  orders: ["order_items"],
  factures: ["facture_items"],
  clients: ["orders", "credit_sales"],
  suppliers: ["factures"],
  promotions: ["promotion_bundle_items"],
  restaurant_tables: ["table_sessions", "orders"],
  table_sessions: ["orders"],
  shifts: ["orders"],
  templates: [],
  audit_logs: [],
  product_images: [],
  order_items: [],
  facture_items: [],
  credit_sales: [],
  promotion_bundle_items: [],
  printers: []
};

// ---------------- BACKUP ----------------
exports.backup = async (req, res) => {
  try {
    const { tables } = req.body;
    if (!tables || !tables.length) return res.status(400).json({ error: "Aucune table sélectionnée." });

    const backupData = {};
    const visited = new Set();

    // Recursively collect tables and dependencies
    const collectTables = (table) => {
      if (visited.has(table)) return;
      visited.add(table);

      // First add dependencies
      const deps = relationships[table] || [];
      deps.forEach(dep => collectTables(dep));
    };

    tables.forEach(t => {
      if (!RESTRICTED_ALL.includes(t)) {
        collectTables(t);
      }
    });

    // Final filter to be absolutely safe
    const allowedTables = Array.from(visited).filter(t => !RESTRICTED_ALL.includes(t));

    // Fetch data for all collected tables
    for (let table of allowedTables) {
      if (!modelsMap[table]) continue;
      backupData[table] = await modelsMap[table].findAll({ raw: true });
    }

    res.json(backupData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la sauvegarde." });
  }
};

// ---------------- RESTORE ----------------
exports.restore = async (req, res) => {
  const { data } = req.body;

  try {
    if (!data || typeof data !== "object") 
      return res.status(400).json({ error: "Données invalides pour la restauration." });

    // Smart restore order: parents first, then children
    const restoreOrder = [
      "users",
      "products",
      "templates",
      "credit_sales",
      "shifts",
      "clients",
      "suppliers",
      "promotions",
      "promotion_bundle_items",
      "printers",
      "restaurant_tables",
      "table_sessions",
      "product_images"
    ].filter(t => !RESTRICTED_ALL.includes(t));

    // Disable foreign keys for SQLite during restoration
    await sequelize.query('PRAGMA foreign_keys = OFF');
    console.log("Starting restoration...");

    try {
      for (let table of restoreOrder) {
        if (!data[table] || !Array.isArray(data[table]) || !modelsMap[table]) continue;
        console.log(`Restoring table: ${table} (${data[table].length} rows)`);
        for (let row of data[table]) {
          await modelsMap[table].upsert(row); // preserves IDs
        }
      }
      console.log("Restoration completed successfully.");
    } finally {
      // Re-enable foreign keys
      await sequelize.query('PRAGMA foreign_keys = ON');
    }

    res.json({ message: "Restauration terminée avec succès." });
  } catch (err) {
    console.error("Erreur restore:", err);
    res.status(500).json({ error: "Erreur lors de la restauration." });
  }
};

// ---------------- DELETE ----------------
exports.deleteTables = async (req, res) => {
  const { tables } = req.body;

  try {
    if (!tables || !tables.length) return res.status(400).json({ error: "Aucune table sélectionnée." });

    const allTablesToDelete = new Set();

    const collectDependencies = (table) => {
      if (allTablesToDelete.has(table)) return;
      allTablesToDelete.add(table);
      const deps = relationships[table] || [];
      deps.forEach(dep => collectDependencies(dep));
    };

    tables.forEach(t => {
      if (!RESTRICTED_ALL.includes(t) && !RESTRICTED_DELETE_ONLY.includes(t)) {
        collectDependencies(t);
      }
    });

    // Delete in reverse dependency order, always excluding restricted tables
    const deletionOrder = Array.from(allTablesToDelete)
      .filter(t => !RESTRICTED_ALL.includes(t) && !RESTRICTED_DELETE_ONLY.includes(t))
      .reverse();

    // Disable foreign keys for SQLite during deletion
    await sequelize.query('PRAGMA foreign_keys = OFF');

    try {
      for (let table of deletionOrder) {
        if (!modelsMap[table]) continue;
        // Use DELETE instead of TRUNCATE for SQLite compatibility with foreign keys
        await modelsMap[table].destroy({ where: {}, force: true });
      }
    } finally {
      // Re-enable foreign keys
      await sequelize.query('PRAGMA foreign_keys = ON');
    }

    res.json({ message: "Suppression terminée avec succès." });
  } catch (err) {
    console.error("Erreur delete:", err);
    res.status(500).json({ error: "Erreur lors de la suppression." });
  }
};
