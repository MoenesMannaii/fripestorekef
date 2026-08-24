const { sequelize, CreditSale, Product, Order, OrderItem } = require('../Models');
const { logAudit } = require('../utils/audit.utils');
const path = require('path');

// Create a new credit sale (deducts stock like a regular order)
async function createCreditSale(req, res) {
  const t = await sequelize.transaction();
  try {
    const { client_name, client_phone, items, amount_paid = 0, due_date, notes } = req.body;

    if (!client_name || !client_name.trim()) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Le nom du client est requis' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'La commande est vide' });
    }

    let total_amount = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Produit ${item.product_id} introuvable` });
      }

      const qty = parseFloat(item.quantity) || 1;
      if (product.stock - qty < 0) {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Stock insuffisant pour ${product.name}` });
      }

      const unit_price = parseFloat(item.unit_price || product.price);
      const line_total = unit_price * qty;
      total_amount += line_total;

      await product.update({ stock: product.stock - qty }, { transaction: t });

      processedItems.push({
        product_id: product.id,
        name: item.name || product.name,
        quantity: qty,
        unit_price,
        total: line_total
      });
    }

    const paid = parseFloat(amount_paid) || 0;
    const remaining = Math.max(0, total_amount - paid);
    let status = 'pending';
    if (paid >= total_amount) status = 'paid';
    else if (paid > 0) status = 'partial';

    // 1. Create the Order (for Rapports and AI)
    let order;
    try {
      order = await Order.create({
        user_id: req.user?.id || null,
        total: total_amount,
        paid_amount: paid,
        payment_method: 'other',
        note: `Crédit pour ${client_name}${notes ? ': ' + notes : ''}`
      }, { transaction: t });
    } catch (orderErr) {
      console.error('Order creation failed specifically:', orderErr);
      const fs = require('fs');
      fs.appendFileSync(path.join(__dirname, '../../error.log'), `[${new Date().toISOString()}] ORDER_CREATE_FAILED: ${orderErr.name} - ${orderErr.message}\nDetail: ${JSON.stringify(orderErr.errors || orderErr)}\n`);
      throw orderErr;
    }

    // 2. Create the OrderItems
    for (const item of processedItems) {
      await OrderItem.create({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total
      }, { transaction: t });
    }

    // 3. Create the CreditSale linked to the Order
    const creditSale = await CreditSale.create({
      client_name: client_name.trim(),
      client_phone: client_phone?.trim() || null,
      total_amount,
      amount_paid: paid,
      remaining_amount: remaining,
      status,
      items: processedItems,
      due_date: due_date || null,
      notes: notes?.trim() || null,
      created_by: req.user?.id || null,
      order_id: order.id // Link it
    }, { transaction: t });

    await t.commit();

    await logAudit({
      actor_id: req.user?.id,
      actor_role: req.user?.role,
      action: 'CREATE_CREDIT_SALE',
      details: `Vente à crédit #${creditSale.id} pour ${client_name} — ${total_amount.toFixed(3)} DT`
    });

    res.status(201).json({ success: true, creditSale });
  } catch (err) {
    await t.rollback();
    console.error('Credit sale creation failed:', err);
    // Log to a file we can read
    const fs = require('fs');
    const logPath = path.join(__dirname, '../../error.log');
    let errorDetail = err.stack;
    if (err.name === 'SequelizeValidationError') {
      errorDetail += '\nValidation Errors: ' + JSON.stringify(err.errors, null, 2);
    }
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${errorDetail}\n`);
    res.status(500).json({ success: false, message: err.message, stack: err.stack, details: err.errors });
  }
}

// List all credit sales
async function getCreditSales(req, res) {
  try {
    const { status, search } = req.query;
    const where = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    let creditSales = await CreditSale.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    // Client-side search filter
    if (search) {
      const q = search.toLowerCase();
      creditSales = creditSales.filter(cs =>
        cs.client_name.toLowerCase().includes(q) ||
        (cs.client_phone && cs.client_phone.includes(q))
      );
    }

    // Summary stats
    const summary = {
      total_pending: 0,
      total_clients: new Set(),
      total_recovered: 0
    };
    creditSales.forEach(cs => {
      if (cs.status !== 'paid') summary.total_pending += cs.remaining_amount;
      summary.total_clients.add(cs.client_phone || cs.client_name);
      summary.total_recovered += cs.amount_paid;
    });
    summary.total_clients = summary.total_clients.size;

    res.json({ success: true, creditSales, summary });
  } catch (err) {
    console.error('Error listing credit sales:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get a single credit sale
async function getCreditSaleById(req, res) {
  try {
    const sale = await CreditSale.findByPk(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Vente à crédit introuvable' });
    res.json({ success: true, creditSale: sale });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Register a payment (partial or full)
async function registerPayment(req, res) {
  try {
    const { amount } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Montant invalide' });
    }

    const sale = await CreditSale.findByPk(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Vente à crédit introuvable' });
    if (sale.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Cette vente est déjà soldée' });
    }

    const paymentAmount = Math.min(parseFloat(amount), sale.remaining_amount);
    const new_amount_paid = sale.amount_paid + paymentAmount;
    const new_remaining = Math.max(0, sale.total_amount - new_amount_paid);
    let new_status = 'partial';
    if (new_remaining <= 0) new_status = 'paid';

    await sale.update({
      amount_paid: new_amount_paid,
      remaining_amount: new_remaining,
      status: new_status
    });

    await logAudit({
      actor_id: req.user?.id,
      actor_role: req.user?.role,
      action: 'CREDIT_PAYMENT',
      details: `Paiement de ${paymentAmount.toFixed(3)} DT sur vente #${sale.id} (${sale.client_name})`
    });

    res.json({ success: true, creditSale: sale });
  } catch (err) {
    console.error('Payment registration failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// Register payment for all pending credits of a client
async function payAllClientCredits(req, res) {
  const t = await sequelize.transaction();
  try {
    const { name } = req.params;
    const client_name = decodeURIComponent(name);

    if (!client_name) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Nom du client invalide' });
    }

    const pendingSales = await CreditSale.findAll({
      where: {
        client_name,
        status: ['pending', 'partial']
      },
      transaction: t
    });

    if (pendingSales.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Aucun crédit en attente pour ce client' });
    }

    let totalPaid = 0;

    for (const sale of pendingSales) {
      const paymentAmount = sale.remaining_amount;
      const new_amount_paid = sale.amount_paid + paymentAmount;
      
      await sale.update({
        amount_paid: new_amount_paid,
        remaining_amount: 0,
        status: 'paid'
      }, { transaction: t });

      totalPaid += paymentAmount;
    }

    await t.commit();

    await logAudit({
      actor_id: req.user?.id,
      actor_role: req.user?.role,
      action: 'CREDIT_PAYMENT_ALL',
      details: `Paiement total de ${totalPaid.toFixed(3)} DT pour les crédits de ${client_name}`
    });

    res.json({ success: true, message: 'Tous les crédits ont été soldés avec succès', totalPaid, totalUpdated: pendingSales.length });
  } catch (err) {
    await t.rollback();
    console.error('Pay all client credits failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { createCreditSale, getCreditSales, getCreditSaleById, registerPayment, payAllClientCredits };
