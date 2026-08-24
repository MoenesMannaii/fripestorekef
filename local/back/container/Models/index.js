// container/Models/index.js
const Sequelize = require('sequelize');
const sequelize = require('../config/db');

const User = require('./user.model')(sequelize, Sequelize.DataTypes);
const Product = require('./product.model')(sequelize, Sequelize.DataTypes);
const ProductImage = require('./productImage.model')(sequelize, Sequelize.DataTypes);
const Order = require('./order.model')(sequelize, Sequelize.DataTypes);
const OrderItem = require('./orderItem.model')(sequelize, Sequelize.DataTypes);
const AuditLog = require('./audit.model')(sequelize, Sequelize.DataTypes);
const Template = require('./template.model')(sequelize, Sequelize.DataTypes);
const Facture = require('./facture.model')(sequelize, Sequelize.DataTypes);
const FactureItem = require('./factureItem.model')(sequelize, Sequelize.DataTypes);
const CreditSale = require('./credit.model')(sequelize, Sequelize.DataTypes);
const Shift = require('./shift.model')(sequelize, Sequelize.DataTypes);
const Client = require('./client.model')(sequelize, Sequelize.DataTypes);
const Supplier = require('./supplier.model')(sequelize, Sequelize.DataTypes);
const Promotion = require('./promotion.model')(sequelize, Sequelize.DataTypes);
const PromotionBundleItem = require('./promotionBundleItem.model')(sequelize, Sequelize.DataTypes);
const PromotionPrincipalItem = require('./promotionPrincipalItem.model')(sequelize, Sequelize.DataTypes);

// 🆕 Repartition & Printer Models
const Printer = require('./printer.model')(sequelize, Sequelize.DataTypes);
const RestaurantTable = require('./restaurantTable.model')(sequelize, Sequelize.DataTypes);
const TableSession = require('./tableSession.model')(sequelize, Sequelize.DataTypes);

// Existing Associations
User.hasMany(Order, { foreignKey: 'user_id' });
Order.belongsTo(User, { foreignKey: 'user_id' });

Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'ProductImages' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

Order.hasMany(OrderItem, { foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

Product.hasMany(OrderItem, { foreignKey: 'product_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });

// New Facture Associations
Facture.hasMany(FactureItem, { foreignKey: 'facture_id' });
FactureItem.belongsTo(Facture, { foreignKey: 'facture_id' });

Product.hasMany(FactureItem, { foreignKey: 'product_id' });
FactureItem.belongsTo(Product, { foreignKey: 'product_id' });

User.hasMany(Facture, { foreignKey: 'created_by' });
Facture.belongsTo(User, { foreignKey: 'created_by' });

// Shift Associations
User.hasMany(Shift, { foreignKey: 'user_id' });
Shift.belongsTo(User, { foreignKey: 'user_id' });

Shift.hasMany(Order, { foreignKey: 'shift_id' });
Order.belongsTo(Shift, { foreignKey: 'shift_id' });

// 🆕 Repartition Table & Session Associations
RestaurantTable.hasMany(TableSession, { foreignKey: 'table_id' });
TableSession.belongsTo(RestaurantTable, { foreignKey: 'table_id' });

RestaurantTable.hasMany(Order, { foreignKey: 'table_id' });
Order.belongsTo(RestaurantTable, { foreignKey: 'table_id' });

TableSession.hasMany(Order, { foreignKey: 'session_id' });
Order.belongsTo(TableSession, { foreignKey: 'session_id' });

User.hasMany(TableSession, { foreignKey: 'waiter_id', as: 'waiter_sessions' });
TableSession.belongsTo(User, { foreignKey: 'waiter_id', as: 'waiter' });

// 🆕 Client & Supplier Associations
Client.hasMany(Order, { foreignKey: 'client_id' });
Order.belongsTo(Client, { foreignKey: 'client_id' });

Client.hasMany(CreditSale, { foreignKey: 'client_id' });
CreditSale.belongsTo(Client, { foreignKey: 'client_id' });

Supplier.hasMany(Facture, { foreignKey: 'supplier_id' });
Facture.belongsTo(Supplier, { foreignKey: 'supplier_id' });

// Product Variant Association (Self-reference)
Product.hasMany(Product, { as: 'Variants', foreignKey: 'parent_id' });
Product.belongsTo(Product, { as: 'Parent', foreignKey: 'parent_id' });

// Order Returns Association
Order.hasMany(Order, { as: 'Returns', foreignKey: 'original_order_id' });
Order.belongsTo(Order, { as: 'OriginalOrder', foreignKey: 'original_order_id' });

// 🆕 Promotion Associations
Product.hasMany(Promotion, { foreignKey: 'product_id' });
Promotion.belongsTo(Product, { as: 'MainProduct', foreignKey: 'product_id' });

Promotion.hasMany(PromotionBundleItem, { foreignKey: 'promotion_id', as: 'BundleItems' });
PromotionBundleItem.belongsTo(Promotion, { foreignKey: 'promotion_id' });

PromotionBundleItem.belongsTo(Product, { as: 'FreeProduct', foreignKey: 'product_id' });
Product.hasMany(PromotionBundleItem, { foreignKey: 'product_id' });

Promotion.hasMany(PromotionPrincipalItem, { foreignKey: 'promotion_id', as: 'PrincipalItems' });
PromotionPrincipalItem.belongsTo(Promotion, { foreignKey: 'promotion_id' });

PromotionPrincipalItem.belongsTo(Product, { as: 'Product', foreignKey: 'product_id' });
Product.hasMany(PromotionPrincipalItem, { foreignKey: 'product_id' });

// Current active session alias
RestaurantTable.hasOne(TableSession, {
  foreignKey: 'table_id',
  as: 'currentSession',
  scope: { status: 'active' }
});

// Auto-sync new models (creates tables if they don't exist)
Client.sync({ alter: false }).catch(err => console.warn('Client sync:', err.message));
Supplier.sync({ alter: false }).catch(err => console.warn('Supplier sync:', err.message));
Shift.sync({ alter: false }).catch(err => console.warn('Shift sync:', err.message));
CreditSale.sync({ alter: false }).catch(err => console.warn('CreditSale sync:', err.message));
Printer.sync({ alter: false }).catch(err => console.warn('Printer sync:', err.message));
RestaurantTable.sync({ alter: false }).catch(err => console.warn('RestaurantTable sync:', err.message));
TableSession.sync({ alter: false }).catch(err => console.warn('TableSession sync:', err.message));
Order.sync({ alter: false }).catch(err => console.warn('Order sync:', err.message));
OrderItem.sync({ alter: false }).catch(err => console.warn('OrderItem sync:', err.message));
Product.sync({ alter: false }).catch(err => console.warn('Product sync:', err.message));
Facture.sync({ alter: false }).catch(err => console.warn('Facture sync:', err.message));
Template.sync({ alter: false }).catch(err => console.warn('Template sync:', err.message));
Promotion.sync({ alter: false }).catch(err => console.warn('Promotion sync:', err.message));
PromotionBundleItem.sync({ alter: false }).catch(err => console.warn('PromotionBundleItem sync:', err.message));
PromotionPrincipalItem.sync({ alter: false }).catch(err => console.warn('PromotionPrincipalItem sync:', err.message));
AuditLog.sync({ alter: false }).catch(err => console.warn('AuditLog sync:', err.message));

module.exports = {
  sequelize,
  Sequelize,
  User, 
  Product, 
  ProductImage, 
  Order, 
  OrderItem, 
  AuditLog, 
  Template,
  Facture,
  FactureItem,
  CreditSale,
  Shift,
  // 🆕 Repartition & Printer
  Printer,
  RestaurantTable,
  TableSession,
  Client,
  Supplier,
  Promotion,
  PromotionBundleItem,
  PromotionPrincipalItem
};