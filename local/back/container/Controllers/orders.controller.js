// container/Controllers/orders.controller.js
const { sequelize, Order, OrderItem, Product, Shift, RestaurantTable, TableSession, Client, Template, Promotion, PromotionBundleItem, PromotionPrincipalItem, User } = require('../Models');

const { buildReceipt } = require('../utils/printerSimulator');
const { logAudit } = require('../utils/audit.utils');

async function createOrder(req, res) {
  const t = await sequelize.transaction();
  try {
    const {
      items,
      paid_amount,
      payment_method = 'cash',
      note,
      table_id,
      session_id,
      order_type = 'dine_in',
      type = 'sale',
      client_id,
      original_order_id,
      points_earned = 0,
      points_spent: req_points_spent = 0,
      use_points = false
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'No items in order' });
    }

    // Validate table if it's a dine-in order
    if (order_type === 'dine_in' && table_id) {
      const table = await RestaurantTable.findOne({
        where: { id: table_id, status: 'occupied' },
        transaction: t
      });

      if (!table) {
        await t.rollback();
        return res.status(400).json({
          message: `Table ${table_id} is not occupied or doesn't exist`
        });
      }
    }

    // Compute totals and reduce stock
    let total = 0;
    let hasRemise = false;
    const orderItemsData = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, {
        transaction: t
      });

      if (!product) {
        await t.rollback();
        return res.status(400).json({ message: `Product ${item.product_id} not found` });
      }

      // We support fractional quantities directly!
      const qty = parseFloat(item.quantity) || 1; // Change to parseFloat for fractional deductions like (1/24)

      // Calculate effective price. If selling a piece from a carton, the cart logic already passes 
      // the divided unit_price! So lineTotal works the same mathematically.
      // Calculate effective price with remise_percentage
      const basePrice = parseFloat(product.price);
      const discount = (parseFloat(product.remise_percentage) || 0) / 100;
      const discountedPrice = basePrice * (1 - discount);

      // Use item.unit_price if provided (e.g. from frontend), else fallback to discountedPrice
      const unitPriceToUse = parseFloat(item.unit_price) || discountedPrice;

      if (discount > 0 || (unitPriceToUse < (basePrice - 0.001))) {
        hasRemise = true;
      }

      const lineTotal = type === 'return' ? -Math.abs(unitPriceToUse * qty) : unitPriceToUse * qty;
      total += lineTotal;

      orderItemsData.push({
        product_id: product.id,
        name: product.name,
        unit_price: unitPriceToUse,
        original_unit_price: basePrice,
        discount_amount: (basePrice - unitPriceToUse) * qty,
        remise_percentage: parseFloat(product.remise_percentage) || 0,
        quantity: qty,
        total: lineTotal,
      });

      // Stock management: Decrement for sale, Increment for return
      if (type === 'return') {
        await product.update({
          stock: parseFloat(product.stock) + qty
        }, { transaction: t });
      } else {
        if (parseFloat(product.stock) - qty < 0) {
          await t.rollback();
          return res.status(400).json({
            message: `Stock insuffisant pour ${product.name}. Stock disponible: ${product.stock}`
          });
        }
        await product.update({
          stock: parseFloat(product.stock) - qty
        }, { transaction: t });
      }
    }

    // 🆕 Global Bundle Promotion Logic
    if (type !== 'return') {
      const activeBundles = await Promotion.findAll({
        where: { type: 'bundle', is_active: true },
        include: [
          { model: PromotionPrincipalItem, as: 'PrincipalItems' },
          { model: PromotionBundleItem, as: 'BundleItems' }
        ],
        transaction: t
      });

      // Map current order items for easy lookup
      const orderItemMap = {};
      items.forEach(item => {
        orderItemMap[item.product_id] = (orderItemMap[item.product_id] || 0) + (parseFloat(item.quantity) || 0);
      });

      for (const promo of activeBundles) {
        if (!promo.PrincipalItems || promo.PrincipalItems.length === 0) continue;

        let multiplicity = Number.MAX_SAFE_INTEGER;
        let satisfied = true;

        for (const pItem of promo.PrincipalItems) {
          const orderedQty = orderItemMap[pItem.product_id] || 0;
          if (orderedQty < pItem.quantity) {
            satisfied = false;
            break;
          }
          multiplicity = Math.min(multiplicity, Math.floor(orderedQty / pItem.quantity));
        }

        if (satisfied && multiplicity > 0) {
          hasRemise = true;

          // Tag principal items for transparency on ticket
          for (const pItem of promo.PrincipalItems) {
            const principalOrderItem = orderItemsData.find(oi => oi.product_id === pItem.product_id && !oi.name.startsWith('[PRINCP]'));
            if (principalOrderItem) {
              principalOrderItem.name = `[PRINCP] ${principalOrderItem.name}`;
            }
          }

          for (const bItem of promo.BundleItems) {
            const freeProduct = await Product.findByPk(bItem.product_id, { transaction: t });
            const requiredQty = bItem.quantity * multiplicity;

            if (!freeProduct || parseFloat(freeProduct.stock) < requiredQty) {
              await t.rollback();
              return res.status(400).json({
                message: `Stock insuffisant pour l'article gratuit ${freeProduct?.name || 'inconnu'} dans la promotion "${promo.name}".`
              });
            }

            // Deduct free item stock
            await freeProduct.update({
              stock: parseFloat(freeProduct.stock) - requiredQty
            }, { transaction: t });

            // Add to order items
            orderItemsData.push({
              product_id: freeProduct.id,
              name: `[OFFERT] ${freeProduct.name}`,
              unit_price: 0,
              original_unit_price: parseFloat(freeProduct.price),
              discount_amount: parseFloat(freeProduct.price) * requiredQty,
              remise_percentage: 100,
              quantity: requiredQty,
              total: 0,
            });
          }
        }
      }
    }

    let final_points_spent = 0;
    let final_points_discount = 0;

    // 🆕 PRE-ORDER Loyalty points handling (to calculate change correctly)
    if (client_id && type === 'sale') {
      const client = await Client.findByPk(client_id, { transaction: t });
      if (client) {
        const template = await Template.findOne({ where: { is_current: true }, transaction: t });

        if (use_points) {
          const minPoints = template?.loyalty_min_points || 100;
          const pointsValue = parseFloat(template?.loyalty_points_value) || 30.00;

          if (client.loyalty_points >= minPoints) {
            final_points_spent = minPoints;
            final_points_discount = Math.min(total, pointsValue);
          }
        }
      }
    }

    const paidAmount = parseFloat(paid_amount) || (total - final_points_discount);
    // Change is calculated on (Cash Paid + Points Discount) - Total
    const change_amount = Math.max(0, (paidAmount + final_points_discount) - total);

    // Resolve userId and shift_id (shift may or may not be active)
    const userId = req.user?.id || null;
    let shift_id = null;
    if (userId) {
      const activeShift = await Shift.findOne({
        where: { user_id: userId, status: 'active' }
      });
      if (activeShift) shift_id = activeShift.id;
    }

    // 🆕 Ticket number handling
    let ticket_number = 1;
    const currentTemplate = await Template.findOne({ where: { is_current: true }, transaction: t });
    if (currentTemplate) {
      const resetPeriod = currentTemplate.ticket_reset_period || 'none';
      const lastReset = currentTemplate.last_ticket_reset ? new Date(currentTemplate.last_ticket_reset) : null;
      const now = new Date();
      let shouldReset = false;

      if (lastReset && resetPeriod !== 'none') {
        if (resetPeriod === 'weekly') {
          const getWeek = (d) => {
            const date = new Date(d.getTime());
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            const week1 = new Date(date.getFullYear(), 0, 4);
            return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
          };
          if (getWeek(now) !== getWeek(lastReset) || now.getFullYear() !== lastReset.getFullYear()) {
            shouldReset = true;
          }
        } else if (resetPeriod === 'monthly') {
          if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
            shouldReset = true;
          }
        }
      } else if (!lastReset && resetPeriod !== 'none') {
        shouldReset = true;
      }

      if (shouldReset) {
        ticket_number = 1;
        await currentTemplate.update({ last_ticket_reset: now }, { transaction: t });
      } else {
        const lastOrder = await Order.findOne({
          order: [['id', 'DESC']],
          transaction: t
        });
        ticket_number = (lastOrder?.ticket_number || 0) + 1;
      }
    }

    const order = await Order.create(
      {
        user_id: userId,
        shift_id,
        table_id,
        session_id,
        order_type,
        total,
        tax: 0,
        paid_amount: paidAmount,
        change_amount: change_amount,
        payment_method,
        note,
        type,
        client_id: client_id || null,
        original_order_id: original_order_id || null,
        has_remise: hasRemise,
        points_spent: final_points_spent,
        points_discount: final_points_discount,
        ticket_number: ticket_number
      },
      { transaction: t }
    );

    // 🆕 POST-ORDER Client points update
    if (client_id && type === 'sale') {
      const client = await Client.findByPk(client_id, { transaction: t });
      if (client) {
        const template = await Template.findOne({ where: { is_current: true }, transaction: t });
        const ratio = template?.loyalty_ratio || 10;

        // Earn points on the portion NOT paid by points
        const amountForPoints = Math.max(0, total - final_points_discount);
        const earnedPoints = Math.floor(amountForPoints / ratio);

        const netPoints = earnedPoints - final_points_spent - (parseInt(req_points_spent) || 0);
        await client.update({
          loyalty_points: Math.max(0, client.loyalty_points + netPoints),
          total_spent: parseFloat(client.total_spent) + total
        }, { transaction: t });
      }
    }

    console.log('Order created with ID:', order.id);

    // Create order items
    for (const oi of orderItemsData) {
      await OrderItem.create({
        order_id: order.id,
        ...oi
      }, {
        transaction: t
      });
    }

    // Update table last activity
    if (table_id) {
      await RestaurantTable.update(
        { updated_at: new Date() },
        { where: { id: table_id } },
        { transaction: t }
      );
    }

    await t.commit();
    console.log('Transaction committed successfully');

    // Log return of products if type is return
    if (type === 'return') {
      try {
        for (const oi of orderItemsData) {
          await logAudit({
            actor_id: userId,
            actor_role: req.user?.role || 'worker',
            action: 'refund',
            details: `Retour de produit: ${oi.quantity} x "${oi.name}" a été retourné.`
          });
        }
      } catch (auditErr) {
        console.error('Failed to log return audit:', auditErr);
      }
    }

    // Prepare receipt
    const itemsFromDb = await OrderItem.findAll({
      where: { order_id: order.id }
    });

    const receipt = buildReceipt(order, itemsFromDb);

    const orderWithDetails = await Order.findByPk(order.id, {
      include: [
        {
          model: User,
          attributes: ['name'],
          required: false
        },
        {
          model: Client,
          required: false
        },
        {
          model: OrderItem,
          include: [{ model: Product, attributes: ['id', 'name', 'price'] }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      order: orderWithDetails,
      receipt,
      message: 'Order created successfully'
    });

  } catch (err) {
    await t.rollback();
    console.error('Order creation failed:', err);
    res.status(500).json({
      success: false,
      message: 'Order creation failed',
      error: err.message,
      details: err.toString()
    });
  }
}

async function getOrders(req, res) {
  try {
    const { table_id, order_type, date } = req.query;

    let where = {};

    // Filter by table
    if (table_id) {
      where.table_id = table_id;
    }

    // Filter by order type
    if (order_type) {
      where.order_type = order_type;
    }

    // Filter by date
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      where.created_at = {
        [sequelize.Op.between]: [startDate, endDate]
      };
    }

    const orders = await Order.findAll({
      where,
      include: [
        {
          model: RestaurantTable,
          attributes: ['id', 'table_number', 'display_name'],
          required: false
        },
        {
          model: TableSession,
          attributes: ['id', 'session_number', 'customer_count'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 1500
    });

    res.json({
      success: true,
      orders
    });


  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

async function getOrderItems(req, res) {
  try {
    const { orderId } = req.params;

    console.log('Fetching order items for order ID:', orderId);

    // First, verify the order exists
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get order items with product information
    const orderItems = await OrderItem.findAll({
      where: { order_id: orderId },
      include: [{
        model: Product,
        attributes: ['id', 'name', 'barcode', 'category'],
        required: false // Use left join in case product is deleted
      }],
      raw: true,
      nest: true
    });

    console.log('Found order items:', orderItems.length);

    if (!orderItems || orderItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No items found for this order'
      });
    }

    // Transform the data to include product information
    const itemsWithProductInfo = orderItems.map(item => {
      // Use the name from OrderItem (saved at time of order) as fallback
      const productName = item.name || (item.Product ? item.Product.name : 'Product Not Found');

      return {
        id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        original_unit_price: parseFloat(item.original_unit_price || item.unit_price),
        discount_amount: parseFloat(item.discount_amount || 0),
        remise_percentage: parseFloat(item.remise_percentage || 0),
        total_price: parseFloat(item.total),
        product_name: productName,
        product_barcode: item.Product ? item.Product.barcode : null,
        product_category: item.Product ? item.Product.category : null,
        product_printer: item.Product ? item.Product.printer : null
      };
    });

    res.json({
      success: true,
      items: itemsWithProductInfo
    });

  } catch (err) {
    console.error('Error fetching order items:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching order items',
      error: err.message
    });
  }
}

async function getTableOrders(req, res) {
  try {
    const { table_id } = req.params;

    const orders = await Order.findAll({
      where: { table_id },
      include: [
        {
          model: OrderItem,
          include: [{ model: Product }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      orders
    });
  } catch (err) {
    console.error('Error fetching table orders:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

async function getActiveTableOrders(req, res) {
  try {
    const { table_id } = req.params;

    // Find active session for table
    const activeSession = await TableSession.findOne({
      where: {
        table_id: table_id,
        status: 'active'
      }
    });

    if (!activeSession) {
      return res.json({
        success: true,
        orders: [],
        session: null
      });
    }

    const orders = await Order.findAll({
      where: {
        table_id: table_id,
        session_id: activeSession.id
      },
      include: [
        {
          model: OrderItem,
          include: [{ model: Product }]
        }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json({
      success: true,
      orders,
      session: activeSession
    });
  } catch (err) {
    console.error('Error fetching active table orders:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

async function getSessionOrders(req, res) {
  try {
    const { sessionId } = req.params;

    const orders = await Order.findAll({
      where: { session_id: sessionId },
      include: [
        {
          model: OrderItem,
          include: [{ model: Product }]
        },
        {
          model: RestaurantTable,
          attributes: ['id', 'table_number', 'display_name']
        }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json({
      success: true,
      orders
    });
  } catch (err) {
    console.error('Error fetching session orders:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

module.exports = {
  createOrder,
  getOrders,
  getOrderItems,
  getTableOrders,
  getActiveTableOrders,
  getSessionOrders
};