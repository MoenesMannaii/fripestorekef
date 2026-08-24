const {
  Template,
  Order,
  OrderItem,
  Product,
  RestaurantTable,
  TableSession,
  User,
  Printer
} = require('../Models');

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const net = require('net'); // For direct TCP/IP printing
const { print } = require('pdf-to-printer');
const { SerialPort } = require('serialport');

// Helper function to consolidate duplicate items
const consolidateItems = (items) => {
  const consolidated = {};

  items.forEach(item => {
    let productName = 'Article inconnu';

    if (item.name) {
      productName = item.name;
    } else if (item.Product && item.Product.name) {
      productName = item.Product.name;
    } else if (item.product_name) {
      productName = item.product_name;
    } else if (item.Product && item.Product.id) {
      productName = `Produit #${item.Product.id}`;
    }

    const unitPrice = item.unit_price || item.price || 0;
    const originalPrice = item.original_unit_price || unitPrice;
    const remise = item.remise_percentage || 0;
    const quantity = item.quantity || 1;
    const total = item.total || (unitPrice * quantity);
    const notes = item.notes || '';

    const key = `${productName}_${unitPrice}_${originalPrice}_${notes}`;

    if (!consolidated[key]) {
      consolidated[key] = {
        name: productName,
        unitPrice: unitPrice,
        originalPrice: originalPrice,
        remise: remise,
        quantity: quantity,
        total: total,
        notes: notes
      };
    } else {
      consolidated[key].quantity += quantity;
      consolidated[key].total += total;
    }
  });

  return Object.values(consolidated);
};

// ========== DIRECT PRINTING FUNCTIONS ==========

// Get configured printer by type
const getPrinterByType = async (type) => {
  try {
    return await Printer.findOne({
      where: {
        printer_type: type,
        is_active: true
      }
    });
  } catch (error) {
    console.error(`Error getting ${type} printer:`, error);
    return null;
  }
};

// ESC/POS Commands for thermal printers
const ESCPOS_COMMANDS = {
  INIT: '\x1B\x40',               // Initialize printer
  ALIGN_LEFT: '\x1B\x61\x00',     // Left alignment
  ALIGN_CENTER: '\x1B\x61\x01',   // Center alignment
  ALIGN_RIGHT: '\x1B\x61\x02',    // Right alignment
  BOLD_ON: '\x1B\x45\x01',        // Bold on
  BOLD_OFF: '\x1B\x45\x00',       // Bold off
  UNDERLINE_ON: '\x1B\x2D\x01',   // Underline on
  UNDERLINE_OFF: '\x1B\x2D\x00',  // Underline off
  DOUBLE_HEIGHT_ON: '\x1D\x21\x10', // Double height on
  DOUBLE_WIDTH_ON: '\x1D\x21\x20',  // Double width on
  NORMAL_TEXT: '\x1D\x21\x00',    // Normal text size
  CUT_PAPER: '\x1D\x56\x00',      // Full cut
  FEED_LINE: '\x0A',              // Line feed
  FEED_N_LINES: (n) => `\x1B\x64${String.fromCharCode(n)}` // Feed n lines
};

// Function to send ESC/POS commands to thermal printer
const sendToThermalPrinter = async (printerConfig, commands) => {
  return new Promise((resolve, reject) => {
    const { ip_address, port = 9100 } = printerConfig;

    console.log(`🖨️ Connecting to printer at ${ip_address}:${port}...`);

    const socket = new net.Socket();
    let connectionTimeout;

    // Set connection timeout
    connectionTimeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Printer connection timeout'));
    }, 8000);

    socket.connect(port, ip_address, () => {
      console.log(`✅ Connected to printer: ${printerConfig.name}`);
      clearTimeout(connectionTimeout);

      // Convert commands string to a Latin-1 binary Buffer for reliable ESC/POS sending
      const buffer = Buffer.from(commands, 'binary');

      // Send commands
      socket.write(buffer, (err) => {
        if (err) {
          socket.destroy();
          reject(err);
          return;
        }

        // Wait for printer to fully process and print before closing
        // 3 seconds gives enough time for longer receipts with many items
        setTimeout(() => {
          socket.destroy();
          console.log(`✅ Print job sent to ${printerConfig.name}`);
          resolve({
            success: true,
            message: 'Print job sent successfully',
            printer: printerConfig.name,
            ip: ip_address
          });
        }, 3000);
      });
    });

    socket.on('error', (err) => {
      clearTimeout(connectionTimeout);
      socket.destroy();
      reject(err);
    });
  });
};

// Generate ESC/POS commands for customer receipt
const generateCustomerReceiptESC = (order, template, items) => {
  let commands = '';

  // Initialize printer
  commands += ESCPOS_COMMANDS.INIT;

  // Center alignment for header
  commands += ESCPOS_COMMANDS.ALIGN_CENTER;
  commands += ESCPOS_COMMANDS.BOLD_ON;
  commands += ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON;

  // Business name
  commands += (template.business_name || 'ÆVE') + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.BOLD_OFF;
  commands += ESCPOS_COMMANDS.NORMAL_TEXT;

  // Address / phone / tax from template
  if (template.address) {
    commands += toLatin1(template.address) + ESCPOS_COMMANDS.FEED_LINE;
  }
  if (template.phone) {
    commands += toLatin1(`Tél: ${template.phone}`) + ESCPOS_COMMANDS.FEED_LINE;
  }
  if (template.tax_number) {
    commands += toLatin1(template.tax_number) + ESCPOS_COMMANDS.FEED_LINE;
  }

  commands += ESCPOS_COMMANDS.ALIGN_LEFT;

  // Divider
  commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;

  // Order info
  commands += ESCPOS_COMMANDS.BOLD_ON;
  commands += `Ticket #${order.ticket_number || order.id}` + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.BOLD_OFF;

  const orderDate = new Date(order.createdAt || order.created_at);
  commands += `Heure: ${orderDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` + ESCPOS_COMMANDS.FEED_LINE;

  // Client info
  if (order.Client) {
    commands += toLatin1(`Client: ${order.Client.name}`) + ESCPOS_COMMANDS.FEED_LINE;
    if (order.Client.loyalty_points !== undefined) {
      commands += toLatin1(`Fidelite: ${order.Client.loyalty_points} pts`) + ESCPOS_COMMANDS.FEED_LINE;
    }
  }

  if (order.RestaurantTable) {
    commands += `Table: ${order.RestaurantTable.display_name}` + ESCPOS_COMMANDS.FEED_LINE;
  }

  if (order.TableSession) {
    commands += `Clients: ${order.TableSession.customer_count || 1}` + ESCPOS_COMMANDS.FEED_LINE;
  }

  // Order note
  if (order.note) {
    commands += ESCPOS_COMMANDS.FEED_LINE;
    commands += ESCPOS_COMMANDS.BOLD_ON;
    commands += 'NOTE:' + ESCPOS_COMMANDS.FEED_LINE;
    commands += ESCPOS_COMMANDS.BOLD_OFF;
    commands += order.note + ESCPOS_COMMANDS.FEED_LINE;
  }

  // Items header
  commands += ESCPOS_COMMANDS.BOLD_ON;
  commands += 'Qty Article                             Total' + ESCPOS_COMMANDS.FEED_LINE;
  commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.BOLD_OFF;

  // Items list
  let subtotal = 0;
  const consolidatedItems = consolidateItems(items);

  consolidatedItems.forEach((item) => {
    const quantity = item.quantity || 1;
    const total = item.total || (item.unitPrice * quantity);
    subtotal += total;

    // Format: "1 × sandwich 8.00 DT"
    const name = item.name.length > nameLimit ? item.name.substring(0, nameLimit - 3) + '...' : item.name.padEnd(nameLimit);
    commands += `${quantity.toString().padStart(2)} × ${name} ${total.toFixed(3).padStart(6)} DT` + ESCPOS_COMMANDS.FEED_LINE;

    // Item-level discount (Promotion)
    if (item.discount_amount > 0 || item.remise_percentage > 0) {
      let discountText = item.remise_percentage > 0 
        ? `  Promo: -${item.remise_percentage}%` 
        : `  Remise: -${(parseFloat(item.discount_amount) * quantity).toFixed(3)} DT`;
      commands += toLatin1(discountText) + ESCPOS_COMMANDS.FEED_LINE;
    }

    // Item notes
    if (item.notes) {
      commands += ESCPOS_COMMANDS.UNDERLINE_ON;
      commands += `  → ${item.notes}` + ESCPOS_COMMANDS.FEED_LINE;
      commands += ESCPOS_COMMANDS.UNDERLINE_OFF;
    }
  });

  // Divider
  commands += ESCPOS_COMMANDS.FEED_LINE;
  commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;

  // Totals
  const finalTotal = order.total || subtotal;
  const paidAmount = order.paid_amount || 0;
  const change = paidAmount - finalTotal;

  // Calculate total remise
  let totalRemise = 0;
  consolidatedItems.forEach(item => {
    if (item.originalPrice > item.unitPrice) {
      totalRemise += (item.originalPrice - item.unitPrice) * item.quantity;
    }
  });

  if (totalRemise > 0) {
    commands += toLatin1(`TOTAL REMISE: -${totalRemise.toFixed(3)} DT`) + ESCPOS_COMMANDS.FEED_LINE;
  }

  commands += ESCPOS_COMMANDS.BOLD_ON;
  commands += ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON;
  commands += `TOTAL NET: ${finalTotal.toFixed(3)} DT` + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.NORMAL_TEXT;
  commands += ESCPOS_COMMANDS.BOLD_OFF;

  // Payment info
  if (paidAmount > 0) {
    commands += ESCPOS_COMMANDS.FEED_LINE;
    commands += toLatin1(`PAYÉ: ${paidAmount.toFixed(3)} DT`) + ESCPOS_COMMANDS.FEED_LINE;

    if (change > 0) {
      commands += `MONNAIE: ${change.toFixed(3)} DT` + ESCPOS_COMMANDS.FEED_LINE;
    }
  }

  // Points info
  if (order.points_discount > 0) {
    commands += ESCPOS_COMMANDS.FEED_LINE;
    commands += toLatin1(`FIDÉLITÉ: -${parseFloat(order.points_discount).toFixed(3)} DT`) + ESCPOS_COMMANDS.FEED_LINE;
    commands += toLatin1(`POINTS UTILISÉS: ${order.points_spent}`) + ESCPOS_COMMANDS.FEED_LINE;
  }

  // Footer
  commands += ESCPOS_COMMANDS.FEED_LINE;
  commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;

  if (template.thank_you_message) {
    commands += ESCPOS_COMMANDS.BOLD_ON;
    commands += template.thank_you_message + ESCPOS_COMMANDS.FEED_LINE;
    commands += ESCPOS_COMMANDS.BOLD_OFF;
  }

  if (template.return_policy) {
    commands += ESCPOS_COMMANDS.FEED_LINE;
    commands += template.return_policy + ESCPOS_COMMANDS.FEED_LINE;
  }

  // Timestamp & Enhanced Branding
  commands += ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.ALIGN_CENTER;
  commands += toLatin1(`Généré: ${new Date().toLocaleString('fr-FR')}`) + ESCPOS_COMMANDS.FEED_LINE;
  
  commands += ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.BOLD_ON;
  commands += toLatin1('--- AEVE SOFTWARE ---') + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.BOLD_OFF;
  commands += toLatin1('SOLUTIONS POS PREMIUM') + ESCPOS_COMMANDS.FEED_LINE;

  // Cut paper with generous feed
  commands += ESCPOS_COMMANDS.FEED_N_LINES(6);
  commands += ESCPOS_COMMANDS.CUT_PAPER;

  return commands;
};

// Generate ESC/POS commands for kitchen/bar ticket
const generateKitchenTicketESC = (printerType, order, template, items) => {
  let commands = '';

  // Initialize printer
  commands += ESCPOS_COMMANDS.INIT;

  // Center alignment for header
  commands += ESCPOS_COMMANDS.ALIGN_CENTER;
  commands += ESCPOS_COMMANDS.BOLD_ON;
  commands += ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON;
  commands += ESCPOS_COMMANDS.DOUBLE_WIDTH_ON;

  // Section name
  const sectionName = printerType === 'kitchen' ? 'CUISINE' : 'BAR';
  commands += sectionName + ESCPOS_COMMANDS.FEED_LINE;

  commands += ESCPOS_COMMANDS.NORMAL_TEXT;
  commands += 'RAYHANA' + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.BOLD_OFF;

  // Divider
  commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.ALIGN_LEFT;

  // Order info
  commands += `Commande #${order.id}` + ESCPOS_COMMANDS.FEED_LINE;

  const orderDate = new Date(order.createdAt || order.created_at);
  commands += `Heure: ${orderDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` + ESCPOS_COMMANDS.FEED_LINE;

  if (order.RestaurantTable) {
    commands += `Table: ${order.RestaurantTable.display_name}` + ESCPOS_COMMANDS.FEED_LINE;
  }

  if (order.TableSession) {
    commands += `Clients: ${order.TableSession.customer_count || 1}` + ESCPOS_COMMANDS.FEED_LINE;
  }

  // Order note
  if (order.note) {
    commands += ESCPOS_COMMANDS.FEED_LINE;
    commands += ESCPOS_COMMANDS.BOLD_ON;
    commands += 'NOTE COMMANDE:' + ESCPOS_COMMANDS.FEED_LINE;
    commands += ESCPOS_COMMANDS.BOLD_OFF;
    commands += order.note + ESCPOS_COMMANDS.FEED_LINE;
  }

  // Items header
  commands += ESCPOS_COMMANDS.BOLD_ON;
  commands += 'Qty Article                             Total' + ESCPOS_COMMANDS.FEED_LINE;
  commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.BOLD_OFF;

  // Items list
  const consolidatedItems = consolidateItems(items);

  consolidatedItems.forEach((item) => {
    const quantity = item.quantity || 1;
    const name = item.name.length > 25 ? item.name.substring(0, 20) + '...' : item.name;

    commands += `${quantity.toString().padStart(2)} × ${name}` + ESCPOS_COMMANDS.FEED_LINE;

    // Item notes
    if (item.notes) {
      commands += ESCPOS_COMMANDS.UNDERLINE_ON;
      commands += `  → ${item.notes}` + ESCPOS_COMMANDS.FEED_LINE;
      commands += ESCPOS_COMMANDS.UNDERLINE_OFF;
    }
  });

  // Special instructions
  commands += ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.BOLD_ON;
  commands += 'INSTRUCTIONS:' + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.BOLD_OFF;
  commands += toLatin1('Préparer rapidement - Commande en attente') + ESCPOS_COMMANDS.FEED_LINE;

  // Footer
  commands += ESCPOS_COMMANDS.FEED_LINE;
  commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.ALIGN_CENTER;
  commands += ESCPOS_COMMANDS.BOLD_ON;
  commands += toLatin1('À PRÉPARER MAINTENANT') + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.BOLD_OFF;

  // Cut paper
  commands += ESCPOS_COMMANDS.FEED_N_LINES(3);
  commands += ESCPOS_COMMANDS.CUT_PAPER;

  return commands;
};

// ========== MAIN PRINT FUNCTIONS ==========

// Direct print function (NO PDF generation)
const printOrderDirect = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { type = 'customer', printerType } = req.query;

    console.log(`🖨️ Direct print requested for order ${orderId}, type: ${type}, printerType: ${printerType}`);

    // Get order with all details
    const order = await Order.findOne({
      where: { id: orderId },
      include: [
        {
          model: OrderItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'price']
          }]
        },
        {
          model: RestaurantTable
        },
        {
          model: TableSession,
          include: [{
            model: User,
            as: 'waiter',
            attributes: ['id', 'name', 'email']
          }]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Get current template
    let template = await Template.findOne({ where: { is_current: true } });
    if (!template) {
      template = await Template.findOne({ where: { is_default: true } });
    }

    // Group order items by printer
    const itemsByPrinter = {};
    if (order.OrderItems && order.OrderItems.length > 0) {
      order.OrderItems.forEach(item => {
        const printer = (item.Product && item.Product.printer) ? item.Product.printer : 'kitchen';
        if (!itemsByPrinter[printer]) {
          itemsByPrinter[printer] = [];
        }
        itemsByPrinter[printer].push(item);
      });
    }

    // Always include cashier for receipt
    if (!itemsByPrinter['cashier']) {
      itemsByPrinter['cashier'] = order.OrderItems || [];
    }

    const printResults = [];

    // Determine which printers to print to
    const printersToPrint = [];

    if (printerType) {
      // Specific printer type requested
      printersToPrint.push(printerType);
    } else if (type === 'customer') {
      printersToPrint.push('cashier');
    } else if (type === 'kitchen') {
      printersToPrint.push('kitchen');
    } else if (type === 'bar') {
      printersToPrint.push('bar');
    } else if (type === 'all') {
      // Print to all printers that have items
      if (itemsByPrinter['cashier'] && itemsByPrinter['cashier'].length > 0) {
        printersToPrint.push('cashier');
      }
      if (itemsByPrinter['kitchen'] && itemsByPrinter['kitchen'].length > 0) {
        printersToPrint.push('kitchen');
      }
      if (itemsByPrinter['bar'] && itemsByPrinter['bar'].length > 0) {
        printersToPrint.push('bar');
      }
    }

    console.log(`Printing to: ${printersToPrint.join(', ')}`);

    // Print to each configured printer
    for (const printerType of printersToPrint) {
      const printer = await getPrinterByType(printerType);

      if (!printer) {
        printResults.push({
          type: printerType,
          success: false,
          message: `Aucune imprimante ${printerType} configurée`
        });
        continue;
      }

      if (!itemsByPrinter[printerType] || itemsByPrinter[printerType].length === 0) {
        printResults.push({
          type: printerType,
          success: false,
          message: `Aucun article pour l'imprimante ${printerType}`
        });
        continue;
      }

      try {
        let escPosCommands;

        if (printerType === 'cashier') {
          escPosCommands = generateCustomerReceiptESC(order, template, itemsByPrinter[printerType]);
        } else {
          escPosCommands = generateKitchenTicketESC(printerType, order, template, itemsByPrinter[printerType]);
        }

        const result = await sendToThermalPrinter(printer, escPosCommands);

        printResults.push({
          type: printerType,
          success: true,
          printer: printer.name,
          ip: printer.ip_address,
          message: 'Imprimé avec succès'
        });

      } catch (error) {
        console.error(`Error printing to ${printerType}:`, error);
        printResults.push({
          type: printerType,
          success: false,
          printer: printer.name,
          ip: printer.ip_address,
          message: `Erreur: ${error.message}`
        });
      }
    }

    // Response
    const successfulPrints = printResults.filter(r => r.success);
    const failedPrints = printResults.filter(r => !r.success);

    res.json({
      success: successfulPrints.length > 0,
      message: successfulPrints.length > 0
        ? `Impression directe terminée (${successfulPrints.length} réussie(s), ${failedPrints.length} échouée(s))`
        : 'Échec de l\'impression directe',
      order_id: orderId,
      print_results: printResults,
      summary: {
        total: printResults.length,
        successful: successfulPrints.length,
        failed: failedPrints.length
      }
    });

  } catch (error) {
    console.error('Erreur dans printOrderDirect:', error);
    res.status(500).json({
      success: false,
      message: 'Échec de l\'impression directe',
      error: error.message
    });
  }
};

// Original printOrder function (unchanged, generates PDFs)
const printOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { type = 'customer', direct = 'false' } = req.query;

    // If direct=true, use direct printing
    if (direct === 'true') {
      return printOrderDirect(req, res);
    }

    // ... [rest of your existing printOrder function remains exactly the same]
    // Get order with all details - ensure Product is included properly
    const order = await Order.findOne({
      where: { id: orderId },
      include: [
        {
          model: OrderItem,
          include: [{
            model: Product,
            attributes: ['id', 'name', 'price', 'printer']
          }]
        },
        {
          model: RestaurantTable
        },
        {
          model: TableSession,
          include: [{
            model: User,
            as: 'waiter',
            attributes: ['id', 'name', 'email']
          }]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Debug: Log the order items to see if Product is properly loaded
    console.log('Order items:', order.OrderItems ? order.OrderItems.length : 0);
    if (order.OrderItems && order.OrderItems.length > 0) {
      order.OrderItems.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, {
          productId: item.product_id,
          productName: item.Product ? item.Product.name : 'No Product',
          product: item.Product
        });
      });
    }

    // Get current template
    let template = await Template.findOne({ where: { is_current: true } });
    if (!template) {
      template = await Template.findOne({ where: { is_default: true } });
    }

    // Group order items by printer
    const itemsByPrinter = {};
    if (order.OrderItems && order.OrderItems.length > 0) {
      order.OrderItems.forEach(item => {
        const printer = (item.Product && item.Product.printer) ? item.Product.printer : 'kitchen';
        if (!itemsByPrinter[printer]) {
          itemsByPrinter[printer] = [];
        }
        itemsByPrinter[printer].push(item);
      });
    }

    // Always include cashier for receipt
    if (!itemsByPrinter['cashier']) {
      itemsByPrinter['cashier'] = order.OrderItems || [];
    }

    console.log('🖨️ Génération des PDFs...');
    console.log('Type demandé:', type);

    // Create PDFs directory if it doesn't exist
    const pdfsDir = path.join(__dirname, '../../pdfs');
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }

    const generatedFiles = [];

    // Generate PDF based on type
    if (type === 'customer' || type === 'all') {
      const customerPdfPath = await generateCustomerReceiptPDF(order, template, itemsByPrinter);
      generatedFiles.push({
        type: 'facture_client',
        path: customerPdfPath,
        filename: `facture_${order.id}.pdf`
      });
    }

    if (type === 'kitchen' || type === 'all') {
      if (itemsByPrinter['kitchen'] && itemsByPrinter['kitchen'].length > 0) {
        const kitchenPdfPath = await generateKitchenTicketPDF('kitchen', order, template, itemsByPrinter['kitchen']);
        generatedFiles.push({
          type: 'bon_cuisine',
          path: kitchenPdfPath,
          filename: `cuisine_${order.id}.pdf`
        });
      }
    }

    if (type === 'bar' || type === 'all') {
      if (itemsByPrinter['bar'] && itemsByPrinter['bar'].length > 0) {
        const barPdfPath = await generateKitchenTicketPDF('bar', order, template, itemsByPrinter['bar']);
        generatedFiles.push({
          type: 'bon_bar',
          path: barPdfPath,
          filename: `bar_${order.id}.pdf`
        });
      }
    }

    // If client wants to download a specific PDF
    if (req.query.download) {
      const fileType = type === 'all' ? 'customer' : type;
      const file = generatedFiles.find(f => f.type.includes(fileType));
      if (file && fs.existsSync(file.path)) {
        return res.download(file.path, file.filename);
      }
    }

    // Send response with file info (French)
    res.json({
      success: true,
      message: 'PDFs générés avec succès',
      order_id: orderId,
      generated_files: generatedFiles.map(f => ({
        type: f.type,
        filename: f.filename,
        url: `/pdfs/${f.filename}`,
        path: f.path.replace(/.*[\\\/]pdfs[\\\/]/, 'pdfs/')
      }))
    });

  } catch (error) {
    console.error('Erreur dans printOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Échec de la génération PDF',
      error: error.message
    });
  }
};

// PDF Generation Functions
async function generateCustomerReceiptPDF(order, template, itemsByPrinter) {
  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  const path = require('path');

  return new Promise((resolve, reject) => {
    try {
      const fileName = `receipt_${order.id}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../../pdfs', fileName);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // Extract the cashier items (or fall back to all items)
      let allItems = [];
      if (itemsByPrinter && typeof itemsByPrinter === 'object' && !Array.isArray(itemsByPrinter)) {
        allItems = itemsByPrinter['cashier'] || Object.values(itemsByPrinter).flat();
      } else if (Array.isArray(itemsByPrinter)) {
        allItems = itemsByPrinter;
      }

      // Consolidate duplicate items
      const receiptItems = consolidateItems(allItems);

      const PAPER_WIDTH = 226; // 80mm in points
      const MARGIN = 15;
      const CONTENT_WIDTH = PAPER_WIDTH - MARGIN * 2;

      // Estimate dynamic height generously to avoid clipping
      let estimatedHeight = 200; // base header
      if (template) {
        if (template.address) estimatedHeight += 20;
        if (template.phone) estimatedHeight += 20;
        if (template.tax_number) estimatedHeight += 20;
      }
      estimatedHeight += 80; // ticket/date/table info
      estimatedHeight += receiptItems.length * 25; // items (generous per-item)
      if (order.note) estimatedHeight += 50;
      estimatedHeight += 120; // totals + footer
      if (template && template.thank_you_message) estimatedHeight += 30;
      if (template && template.return_policy) estimatedHeight += 50;
      const PAPER_HEIGHT = Math.max(600, estimatedHeight);

      const doc = new PDFDocument({
        size: [PAPER_WIDTH, PAPER_HEIGHT],
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN }
      });
      doc.pipe(fs.createWriteStream(filePath).on('finish', () => resolve(filePath)));

      let y = MARGIN;

      // ===== HEADER =====
      // Business name
      doc.fontSize(16).font('Helvetica-Bold')
        .text(template?.business_name || 'ÆVE', MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 20;

      // Address
      if (template?.address) {
        doc.fontSize(9).font('Helvetica')
          .text(template.address, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
        y += 13;
      }

      // Phone
      if (template?.phone) {
        doc.fontSize(9).font('Helvetica')
          .text(`Tél: ${template.phone}`, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
        y += 13;
      }

      // Tax number
      if (template?.tax_number) {
        doc.fontSize(9).font('Helvetica')
          .text(template.tax_number, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
        y += 13;
      }

      // Separator
      doc.moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).lineWidth(0.5).stroke();
      y += 8;

      // Ticket / order info
      doc.fontSize(10).font('Helvetica-Bold')
        .text(`Ticket #${order.ticket_number || order.id}`, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 13;

      const orderDate = new Date(order.created_at || order.createdAt);
      doc.fontSize(9).font('Helvetica')
        .text(`Date: ${orderDate.toLocaleString('fr-FR')}`, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 13;

      if (order.RestaurantTable) {
        doc.fontSize(9).text(`Table: ${order.RestaurantTable.display_name}`, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
        y += 13;
      }

      if (order.note) {
        y += 4;
        doc.fontSize(9).font('Helvetica-Bold').text('Note:', MARGIN, y);
        y += 11;
        doc.fontSize(9).font('Helvetica').text(order.note, MARGIN, y, { width: CONTENT_WIDTH });
        y += 18;
      }

      // Separator
      doc.moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).lineWidth(0.5).stroke();
      y += 8;

      // Column headers
      doc.fontSize(9).font('Helvetica-Bold')
        .text('Article', MARGIN, y, { width: 110 })
        .text('Qté', MARGIN + 115, y, { width: 25, align: 'right' })
        .text('Prix', MARGIN + 145, y, { width: 45, align: 'right' });
      y += 12;
      doc.moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).lineWidth(0.3).stroke();
      y += 6;

      // ===== ITEMS =====
      let subtotal = 0;
      doc.font('Helvetica').fontSize(9);
      receiptItems.forEach(item => {
        const qty = item.quantity || 1;
        const price = item.unitPrice || item.unit_price || item.price || 0;
        const name = item.name || item.Product?.name || 'Article';
        const itemTotal = item.total || price * qty;
        subtotal += itemTotal;

        doc.text(name.length > 20 ? name.substring(0, 15) + '..' : name, MARGIN, y, { width: 110 });
        doc.text(String(qty), MARGIN + 115, y, { width: 25, align: 'right' });
        doc.text(`${itemTotal.toFixed(3)} DT`, MARGIN + 145, y, { width: 45, align: 'right' });
        y += 14;

        if (item.notes) {
          doc.fontSize(8).font('Helvetica-Oblique')
            .text(`  → ${item.notes}`, MARGIN + 5, y, { width: CONTENT_WIDTH - 5 });
          y += 10;
          doc.fontSize(9).font('Helvetica');
        }
      });

      // Separator
      y += 4;
      doc.moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).lineWidth(0.5).stroke();
      y += 8;

      // ===== TOTALS =====
      const finalTotal = order.total || subtotal;

      if (order.points_discount > 0) {
        doc.fontSize(9).font('Helvetica')
          .text('FIDÉLITÉ:', MARGIN, y, { width: 100 })
          .text(`-${parseFloat(order.points_discount).toFixed(3)} DT`, MARGIN + 100, y, { width: 90, align: 'right' });
        y += 13;
      }

      doc.fontSize(13).font('Helvetica-Bold')
        .text('TOTAL:', MARGIN, y, { width: 100 })
        .text(`${finalTotal.toFixed(3)} DT`, MARGIN + 100, y, { width: 90, align: 'right' });
      y += 20;

      // ===== FOOTER =====
      if (template?.thank_you_message) {
        doc.fontSize(8).font('Helvetica-Oblique')
          .text(template.thank_you_message, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
        y += 14;
      }

      if (template?.return_policy) {
        doc.fontSize(8).font('Helvetica')
          .text(template.return_policy, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
        y += 20;
      }

      doc.fontSize(7).font('Helvetica')
        .text('AEVE Software ', MARGIN, y, { align: 'center', width: CONTENT_WIDTH });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function generateKitchenTicketPDF(printerType, order, template, items) {
  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  const path = require('path');

  return new Promise((resolve, reject) => {
    try {
      const typeLabel = printerType === 'kitchen' ? 'CUISINE' : 'BAR';
      const fileName = `${printerType}_${order.id}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../../pdfs', fileName);

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const PAPER_WIDTH = 227;
      const LEFT_MARGIN = 15;
      const RIGHT_MARGIN = PAPER_WIDTH - LEFT_MARGIN;

      const itemHeight = items.length * 20;
      const receiptHeight = Math.max(300, 150 + itemHeight + (order.note ? 40 : 0));

      const doc = new PDFDocument({
        size: [PAPER_WIDTH, receiptHeight],
        margins: { top: 10, bottom: 25, left: LEFT_MARGIN, right: LEFT_MARGIN }
      });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      let y = 10;

      // Header
      doc.fontSize(16).font('Helvetica-Bold').text(typeLabel, 0, y, { align: 'center', width: PAPER_WIDTH });
      y += 20;

      doc.fontSize(12).font('Helvetica-Bold').text(`Commande #${order.id}`, 0, y, { align: 'center', width: PAPER_WIDTH });
      y += 15;

      const orderDate = new Date(order.created_at || order.createdAt);
      doc.fontSize(10).font('Helvetica').text(`Heure: ${orderDate.toLocaleTimeString('fr-FR')}`, 0, y, { align: 'center', width: PAPER_WIDTH });
      y += 15;

      if (order.RestaurantTable) {
        doc.fontSize(12).font('Helvetica-Bold').text(`TABLE: ${order.RestaurantTable.display_name}`, LEFT_MARGIN, y);
        y += 15;
      }

      y += 5;
      doc.lineWidth(1).moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
      y += 10;

      // Items
      items.forEach(item => {
        const qty = item.quantity || 1;
        const name = item.name || item.Product?.name || 'Article';

        doc.fontSize(11).font('Helvetica-Bold').text(`${qty} x ${name}`, LEFT_MARGIN, y);
        y += 15;

        if (item.notes) {
          doc.fontSize(10).font('Helvetica-Oblique').text(`  → ${item.notes}`, LEFT_MARGIN + 10, y);
          y += 12;
        }
        y += 3;
      });

      y += 10;
      doc.fontSize(10).font('Helvetica-Bold').text('--------------------------', 0, y, { align: 'center', width: PAPER_WIDTH });

      doc.end();
      stream.on('finish', () => resolve(filePath));
    } catch (err) {
      reject(err);
    }
  });
}

async function generateSessionSummaryPDF(session, template, orders, items) {
  // Basic implementation to avoid crash
  if (orders && orders[0]) return generateCustomerReceiptPDF(orders[0], template, items);
  return null;
}

// Update getPrintOptions to include direct printing
const getPrintOptions = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get order
    const order = await Order.findOne({
      where: { id: orderId },
      include: [RestaurantTable]
    });

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Get current template
    let template = await Template.findOne({ where: { is_current: true } });
    if (!template) {
      template = await Template.findOne({ where: { is_default: true } });
    }

    // Get printer status
    const printerStatus = {};
    const printerTypes = ['cashier', 'kitchen', 'bar'];

    for (const type of printerTypes) {
      const printer = await getPrinterByType(type);
      printerStatus[type] = printer ? {
        configured: true,
        name: printer.name,
        ip: printer.ip_address,
        active: printer.is_active
      } : {
        configured: false,
        message: `Aucune imprimante ${type} configurée`
      };
    }

    res.json({
      success: true,
      order_id: orderId,
      table_name: order.RestaurantTable ? order.RestaurantTable.display_name : 'N/A',
      business_name: template.business_name,
      printers: printerStatus,
      print_options: [
        {
          type: 'customer',
          name: 'Facture Client',
          description: 'Générer PDF de la facture',
          url: `/api/print/order/${orderId}?type=customer`,
          direct_print_url: `/api/print/order/${orderId}/direct?printerType=cashier`
        },
        {
          type: 'kitchen',
          name: 'Bon de Cuisine',
          description: 'Générer PDF pour la cuisine',
          url: `/api/print/order/${orderId}?type=kitchen`,
          direct_print_url: `/api/print/order/${orderId}/direct?printerType=kitchen`
        },
        {
          type: 'bar',
          name: 'Bon de Bar',
          description: 'Générer PDF pour le bar',
          url: `/api/print/order/${orderId}?type=bar`,
          direct_print_url: `/api/print/order/${orderId}/direct?printerType=bar`
        },
        {
          type: 'all_pdf',
          name: 'Tous les PDFs',
          description: 'Générer tous les PDFs',
          url: `/api/print/order/${orderId}?type=all`
        },
        {
          type: 'all_direct',
          name: 'Imprimer directement tout',
          description: 'Imprimer directement sur toutes les imprimantes',
          url: `/api/print/order/${orderId}/direct?type=all`
        },
        {
          type: 'direct_cashier',
          name: 'Imprimer directement (Caisse)',
          description: 'Impression directe sans PDF',
          url: `/api/print/order/${orderId}/direct?printerType=cashier`,
          printer_available: printerStatus.cashier.configured
        },
        {
          type: 'direct_kitchen',
          name: 'Imprimer directement (Cuisine)',
          description: 'Impression directe sans PDF',
          url: `/api/print/order/${orderId}/direct?printerType=kitchen`,
          printer_available: printerStatus.kitchen.configured
        },
        {
          type: 'direct_bar',
          name: 'Imprimer directement (Bar)',
          description: 'Impression directe sans PDF',
          url: `/api/print/order/${orderId}/direct?printerType=bar`,
          printer_available: printerStatus.bar.configured
        },
        {
          type: 'pdf_view',
          name: 'Voir PDF',
          description: 'Voir la facture dans le navigateur',
          url: `/api/print/order/${orderId}/pdf`
        },
        {
          type: 'session',
          name: 'Résumé Table',
          description: 'Imprimer le résumé de la table/session',
          url: `/api/print/table/${order.RestaurantTable.id}/summary`
        }
      ]
    });

  } catch (error) {
    console.error('Erreur d\'options d\'impression:', error);
    res.status(500).json({
      success: false,
      message: 'Échec de la récupération des options',
      error: error.message
    });
  }
};

// Test printer connection directly
const testPrinterDirect = async (req, res) => {
  try {
    const { printerType = 'cashier' } = req.query;

    console.log(`🖨️ Test direct de l'imprimante ${printerType}...`);

    // Get printer configuration
    const printer = await getPrinterByType(printerType);
    if (!printer) {
      return res.status(404).json({
        success: false,
        message: `Aucune imprimante ${printerType} configurée`
      });
    }

    // Generate test page ESC/POS commands
    let testCommands = '';
    testCommands += ESCPOS_COMMANDS.INIT;
    testCommands += ESCPOS_COMMANDS.ALIGN_CENTER;
    testCommands += ESCPOS_COMMANDS.BOLD_ON;
    testCommands += ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON;
    testCommands += 'PAGE DE TEST' + ESCPOS_COMMANDS.FEED_LINE;
    testCommands += ESCPOS_COMMANDS.BOLD_OFF;
    testCommands += ESCPOS_COMMANDS.NORMAL_TEXT;
    testCommands += '------------------------' + ESCPOS_COMMANDS.FEED_LINE;
    testCommands += ESCPOS_COMMANDS.ALIGN_LEFT;
    testCommands += `Imprimante: ${printer.name}` + ESCPOS_COMMANDS.FEED_LINE;
    testCommands += `Type: ${printer.printer_type}` + ESCPOS_COMMANDS.FEED_LINE;
    testCommands += `IP: ${printer.ip_address}` + ESCPOS_COMMANDS.FEED_LINE;
    testCommands += `Port: ${printer.port}` + ESCPOS_COMMANDS.FEED_LINE;
    testCommands += `Date: ${new Date().toLocaleString('fr-FR')}` + ESCPOS_COMMANDS.FEED_LINE;
    testCommands += '------------------------' + ESCPOS_COMMANDS.FEED_LINE;
    testCommands += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + ESCPOS_COMMANDS.FEED_LINE;
    testCommands += 'abcdefghijklmnopqrstuvwxyz' + ESCPOS_COMMANDS.FEED_LINE;
    testCommands += '1234567890' + ESCPOS_COMMANDS.FEED_LINE;
    testCommands += '!@#$%^&*()_+-=[]{}|;:,.<>?' + ESCPOS_COMMANDS.FEED_LINE;
    testCommands += '------------------------' + ESCPOS_COMMANDS.FEED_LINE;
    testCommands += ESCPOS_COMMANDS.ALIGN_CENTER;
    testCommands += ESCPOS_COMMANDS.BOLD_ON;
    testCommands += 'TEST REUSSI ✓' + ESCPOS_COMMANDS.FEED_LINE;
    testCommands += ESCPOS_COMMANDS.BOLD_OFF;
    testCommands += ESCPOS_COMMANDS.FEED_N_LINES(3);
    testCommands += ESCPOS_COMMANDS.CUT_PAPER;

    // Send to printer
    const result = await sendToThermalPrinter(printer, testCommands);

    res.json({
      success: true,
      message: `Page de test envoyée à ${printer.name}`,
      printer: {
        name: printer.name,
        ip: printer.ip_address,
        port: printer.port,
        type: printer.printer_type,
        status: 'connecté'
      },
      print_result: result
    });

  } catch (error) {
    console.error('Erreur de test imprimante:', error);
    res.status(500).json({
      success: false,
      message: 'Échec de l\'impression de la page de test',
      error: error.message
    });
  }
};

// Get printer status from database
const getPrinterStatus = async (req, res) => {
  try {
    const printers = await Printer.findAll();

    // Test connection for each printer
    const printersWithStatus = [];

    for (const printer of printers) {
      let status = 'unknown';
      let lastTest = null;

      try {
        // Try to connect to printer
        const socket = new net.Socket();

        const connectionPromise = new Promise((resolve) => {
          socket.setTimeout(2000);

          socket.connect(printer.port || 9100, printer.ip_address, () => {
            status = 'online';
            socket.destroy();
            resolve();
          });

          socket.on('timeout', () => {
            status = 'offline';
            socket.destroy();
            resolve();
          });

          socket.on('error', () => {
            status = 'offline';
            socket.destroy();
            resolve();
          });
        });

        await connectionPromise;
        lastTest = new Date();

      } catch (error) {
        status = 'error';
      }

      printersWithStatus.push({
        ...printer.toJSON(),
        status: status,
        last_test: lastTest
      });
    }

    res.json({
      success: true,
      printers: printersWithStatus,
      total_printers: printersWithStatus.length,
      online_printers: printersWithStatus.filter(p => p.status === 'online').length,
      offline_printers: printersWithStatus.filter(p => p.status === 'offline').length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur de statut imprimante:', error);
    res.status(500).json({
      success: false,
      message: 'Échec de la vérification du statut',
      error: error.message
    });
  }
};
// Directly print session summary
const printSessionSummaryDirect = async (req, res) => {
  try {
    const { tableId } = req.params;
    // Fetch table details first
    const table = await RestaurantTable.findByPk(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table introuvable'
      });
    }

    // Find the latest or current session for this table
    const session = await TableSession.findOne({
      where: {
        table_id: tableId,
        status: 'active' // or find the latest closed session
      },
      order: [['started_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'waiter',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Order,
          include: [
            {
              model: OrderItem,
              include: [
                {
                  model: Product,
                  attributes: ['id', 'name', 'price']
                }
              ]
            },
            {
              model: RestaurantTable,
              attributes: ['id', 'display_name']
            }
          ]
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Aucune session active trouvée pour cette table'
      });
    }

    // Get template
    let template = await Template.findOne({ where: { is_current: true } });
    if (!template) {
      template = await Template.findOne({ where: { is_default: true } });
    }

    // Build summary ESC/POS commands
    let commands = '';
    commands += ESCPOS_COMMANDS.INIT;

    // HEADER
    commands += ESCPOS_COMMANDS.ALIGN_CENTER;
    commands += ESCPOS_COMMANDS.BOLD_ON;
    commands += ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON;
    commands += toLatin1(template.business_name || 'ÆVE SOFTWARE') + ESCPOS_COMMANDS.FEED_LINE;
    commands += ESCPOS_COMMANDS.NORMAL_TEXT;
    commands += ESCPOS_COMMANDS.BOLD_OFF;

    if (template.address) {
      commands += toLatin1(template.address) + ESCPOS_COMMANDS.FEED_LINE;
    }
    if (template.phone) {
      commands += toLatin1(`Tél: ${template.phone}`) + ESCPOS_COMMANDS.FEED_LINE;
    }
    if (template.tax_number) {
      commands += toLatin1(template.tax_number) + ESCPOS_COMMANDS.FEED_LINE;
    }

    // Use ASCII dashes for reliable printing
    commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;

    // SESSION TITLE
    commands += ESCPOS_COMMANDS.BOLD_ON;
    commands += ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON;
    commands += toLatin1('RÉSUMÉ DE SESSION') + ESCPOS_COMMANDS.FEED_LINE;
    commands += ESCPOS_COMMANDS.NORMAL_TEXT;
    commands += ESCPOS_COMMANDS.BOLD_OFF;

    commands += ESCPOS_COMMANDS.ALIGN_LEFT;
    commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;

    // SESSION DETAILS
    commands += toLatin1(`Table: ${table.display_name}`) + ESCPOS_COMMANDS.FEED_LINE;
    commands += toLatin1(`Session: #${session.id}`) + ESCPOS_COMMANDS.FEED_LINE;
    const startTime = new Date(session.started_at);
    commands += toLatin1(`Ouverture: ${startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`) + ESCPOS_COMMANDS.FEED_LINE;
    // ❌ REMOVED: Fermeture line

/*     commands += toLatin1(`Durée: ${calculateDuration(session.started_at, session.ended_at)}`) + ESCPOS_COMMANDS.FEED_LINE;
 */    commands += toLatin1(`Clients: ${session.customer_count || 1}`) + ESCPOS_COMMANDS.FEED_LINE;
    if (session.waiter) {
      commands += toLatin1(`Serveur: ${session.waiter.name}`) + ESCPOS_COMMANDS.FEED_LINE;
    }
    // FOOTER
    commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;
    commands += ESCPOS_COMMANDS.FEED_LINE;

    // ========== ORDERS & ITEMS ==========
    let grandTotal = 0;
    let totalItems = 0;

    if (session.Orders && session.Orders.length > 0) {
      let allOrderItems = [];
      session.Orders.forEach(order => {
        if (order.OrderItems) {
          order.OrderItems.forEach(item => {
            allOrderItems.push({
              name: item.Product ? item.Product.name : 'Article inconnu',
              quantity: item.quantity || 1,
              unitPrice: item.unit_price || item.Product?.price || 0,
              total: item.total || (item.quantity * (item.unit_price || item.Product?.price || 0)),
              notes: item.notes || ''
            });
          });
        }
        grandTotal += order.total || 0;
      });

      const consolidatedItems = consolidateItems(allOrderItems);
      totalItems = consolidatedItems.reduce((sum, item) => sum + item.quantity, 0);

      // ❌ REMOVED: "Commandes: X" and "Articles: Y" lines
      // ❌ REMOVED: Entire "Détail des commandes" section

      // Consolidated items list
      commands += ESCPOS_COMMANDS.UNDERLINE_ON;
      commands += toLatin1('Articles consommés:') + ESCPOS_COMMANDS.FEED_LINE;
      commands += ESCPOS_COMMANDS.UNDERLINE_OFF;
      commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;

      consolidatedItems.forEach(item => {
        const nameLimit = 30;
        const name = item.name.length > nameLimit ? item.name.substring(0, nameLimit - 3) + '...' : item.name.padEnd(nameLimit);
        const qtyStr = item.quantity.toString().padStart(2);
        const totalStr = item.total.toFixed(3).padStart(6);
        commands += toLatin1(`${qtyStr} × ${name} ${totalStr} DT`) + ESCPOS_COMMANDS.FEED_LINE;
        if (item.notes) {
          commands += toLatin1(`    → ${item.notes}`) + ESCPOS_COMMANDS.FEED_LINE;
        }
      });

      commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;

      // Grand totals
      commands += ESCPOS_COMMANDS.ALIGN_CENTER;
      commands += ESCPOS_COMMANDS.BOLD_ON;
      commands += ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON;
      commands += toLatin1('TOTAL DE LA SESSION') + ESCPOS_COMMANDS.FEED_LINE;
      commands += ESCPOS_COMMANDS.NORMAL_TEXT;
      commands += toLatin1(`Articles: ${totalItems}`) + ESCPOS_COMMANDS.FEED_LINE;
      commands += ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON;
      commands += toLatin1(`${grandTotal.toFixed(3).padStart(15)} DT`) + ESCPOS_COMMANDS.FEED_LINE;
      commands += ESCPOS_COMMANDS.NORMAL_TEXT;
      commands += ESCPOS_COMMANDS.BOLD_OFF;
    } else {
      commands += ESCPOS_COMMANDS.ALIGN_CENTER;
      commands += toLatin1('⚠️ Aucune commande pour cette session') + ESCPOS_COMMANDS.FEED_LINE;
    }

    // FOOTER
    commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;
    commands += ESCPOS_COMMANDS.ALIGN_CENTER;

    if (template.thank_you_message) {
      commands += ESCPOS_COMMANDS.BOLD_ON;
      commands += toLatin1(template.thank_you_message) + ESCPOS_COMMANDS.FEED_LINE;
      commands += ESCPOS_COMMANDS.BOLD_OFF;
    }

    if (template.return_policy) {
      const policyLines = splitText(template.return_policy, 42);
      policyLines.forEach(line => {
        commands += toLatin1(line) + ESCPOS_COMMANDS.FEED_LINE;
      });
    }

    commands += ESCPOS_COMMANDS.UNDERLINE_ON;
    commands += toLatin1(`Imprimé: ${new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`) + ESCPOS_COMMANDS.FEED_LINE;
    commands += ESCPOS_COMMANDS.UNDERLINE_OFF;
    commands += toLatin1('AEVE Software ') + ESCPOS_COMMANDS.FEED_LINE;

    // Final cut
    commands += ESCPOS_COMMANDS.FEED_N_LINES(4);
    commands += ESCPOS_COMMANDS.CUT_PAPER;

    // Send to printer
    const printer = await getPrinterByType('cashier');
    if (!printer) {
      return res.status(404).json({
        success: false,
        message: 'Aucune imprimante configurée pour le résumé'
      });
    }

    const result = await sendToThermalPrinter(printer, commands);
    res.json({
      success: true,
      message: 'Résumé de session imprimé avec succès',
      table_id: tableId,
      session_id: session.id,
      items_count: totalItems,
      total_amount: grandTotal,
      printer: printer.name,
      business_name: template.business_name,
      print_result: result
    });

  } catch (error) {
    console.error('Erreur impression résumé de session:', error);
    res.status(500).json({
      success: false,
      message: 'Échec de l\'impression du résumé de session',
      error: error.message
    });
  }
};
// ========== HELPER FUNCTIONS ==========

// Helper function to calculate duration
function calculateDuration(startTime, endTime = new Date()) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  } else {
    return `${minutes}min`;
  }
}

// Helper function to split text into lines for thermal printer
function splitText(text, maxLength) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// Convert UTF-8 string to Latin-1 (ISO-8859-1) for thermal printer compatibility
function toLatin1(str) {
  return str
    .replace(/é/g, '\x82')
    .replace(/è/g, '\x85')
    .replace(/ê/g, '\x88')
    .replace(/ë/g, '\x91')
    .replace(/É/g, '\x90')
    .replace(/à/g, '\x85')
    .replace(/â/g, '\x83')
    .replace(/ä/g, '\x84')
    .replace(/À/g, '\x8f')
    .replace(/ç/g, '\x87')
    .replace(/Ç/g, '\x80')
    .replace(/ù/g, '\x97')
    .replace(/û/g, '\x96')
    .replace(/ü/g, '\x98')
    .replace(/ô/g, '\x93')
    .replace(/ö/g, '\x94')
    .replace(/î/g, '\x8c')
    .replace(/ï/g, '\x8b')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/«/g, '"')
    .replace(/»/g, '"')
    .replace(/[^\x20-\x7E\x80-\xFF]/g, '?'); // fallback for unknown chars
}

// Helper function for better ESC/POS formatting
function formatThermalText(text, options = {}) {
  let formatted = '';

  if (options.align === 'center') {
    formatted += ESCPOS_COMMANDS.ALIGN_CENTER;
  } else if (options.align === 'right') {
    formatted += ESCPOS_COMMANDS.ALIGN_RIGHT;
  } else {
    formatted += ESCPOS_COMMANDS.ALIGN_LEFT;
  }

  if (options.bold) {
    formatted += ESCPOS_COMMANDS.BOLD_ON;
  }

  if (options.doubleHeight) {
    formatted += ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON;
  }

  if (options.doubleWidth) {
    formatted += ESCPOS_COMMANDS.DOUBLE_WIDTH_ON;
  }

  if (options.underline) {
    formatted += ESCPOS_COMMANDS.UNDERLINE_ON;
  }

  formatted += text + ESCPOS_COMMANDS.FEED_LINE;

  // Reset formatting
  if (options.underline) {
    formatted += ESCPOS_COMMANDS.UNDERLINE_OFF;
  }

  if (options.doubleWidth) {
    formatted += ESCPOS_COMMANDS.NORMAL_TEXT;
  }

  if (options.doubleHeight) {
    formatted += ESCPOS_COMMANDS.NORMAL_TEXT;
  }

  if (options.bold) {
    formatted += ESCPOS_COMMANDS.BOLD_OFF;
  }

  return formatted;
}
// Add new direct print route


// Keep all your existing routes
// ... [all existing routes]
// Add this function to your existing print controller
const printProductBreakdown = async (req, res) => {
  try {
    const { startDate, endDate, category, productName, userIds, forcePDF } = req.body;

    console.log('📊 Printing product breakdown:', { startDate, endDate, category, productName, userIds, forcePDF });

    // First, fetch the product breakdown data from stats
    const statsService = require('../services/stats.service');
    const filters = {
      startDate,
      endDate,
      category,
      productName,
      userIds: userIds ? userIds.split(',') : []
    };

    // Get product breakdown data
    const statsData = await statsService.getProductStats(filters);

    if (!statsData || !statsData.productBreakdown || statsData.productBreakdown.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucun produit trouvé pour cette période'
      });
    }

    const { productBreakdown, period, totalRevenue, totalProfit, totalQuantitySold } = statsData;

    // If forcePDF is true OR we're not trying to print to thermal
    if (forcePDF) {
      // Generate PDF in memory and send directly
      const pdfBuffer = await generateProductBreakdownPDFBuffer(
        productBreakdown,
        period,
        { category, productName },
        totalRevenue,
        totalProfit,
        totalQuantitySold
      );

      // Generate filename
      const filename = `rapport_produits_${period.startDate}_${period.endDate}.pdf`;

      // Set headers to force download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Send PDF buffer directly
      res.send(pdfBuffer);
      return;

    } else {
      // Try to print directly to thermal printer first
      try {
        const printer = await getPrinterByType('cashier');

        if (!printer) {
          throw new Error('Aucune imprimante configurée');
        }

        // Generate ESC/POS commands for product breakdown
        const commands = generateProductBreakdownESC(productBreakdown, period, {
          category,
          productName
        }, totalRevenue, totalProfit, totalQuantitySold);

        // Send to printer
        const printResult = await sendToThermalPrinter(printer, commands);

        return res.json({
          success: true,
          message: 'Rapport des produits imprimé avec succès',
          print_type: 'thermal',
          printer: printer.name,
          period: {
            startDate: period.startDate,
            endDate: period.endDate
          },
          summary: {
            totalProducts: productBreakdown.length,
            totalRevenue,
            totalProfit,
            totalQuantitySold
          },
          print_result: printResult
        });

      } catch (printError) {
        console.log('❌ Échec impression directe, génération PDF en mémoire:', printError.message);

        // Fallback to PDF generation in memory
        const pdfBuffer = await generateProductBreakdownPDFBuffer(
          productBreakdown,
          period,
          { category, productName },
          totalRevenue,
          totalProfit,
          totalQuantitySold
        );

        // Generate filename
        const filename = `rapport_produits_${period.startDate}_${period.endDate}.pdf`;

        // Set headers to force download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Send PDF buffer directly
        res.send(pdfBuffer);
        return;
      }
    }

  } catch (error) {
    console.error('❌ Erreur impression rapport produits:', error);
    res.status(500).json({
      success: false,
      message: 'Échec de la génération du rapport',
      error: error.message
    });
  }
};

// Generate PDF buffer in memory (returns Buffer instead of file path)
const generateProductBreakdownPDFBuffer = async (breakdown, period, filter, totalRevenue, totalProfit, totalQuantity) => {
  return new Promise((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit');
      const chunks = [];

      const doc = new PDFDocument({
        size: 'A4',
        margin: 20
      });

      // Collect PDF chunks
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('RAPPORT DES VENTES PAR PRODUIT', { align: 'center' });
      doc.moveDown(0.5);

      // Period
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);

      if (period.isSingleDay) {
        doc.fontSize(12).text(`Date: ${startDate.toLocaleDateString('fr-FR')}`, { align: 'center' });
      } else {
        doc.fontSize(12).text(`Période: ${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`, { align: 'center' });
      }

      // Filter info
      if (filter.category) {
        doc.fontSize(12).text(`Catégorie: ${filter.category}`, { align: 'center' });
      } else if (filter.productName) {
        doc.fontSize(12).text(`Produit: ${filter.productName}`, { align: 'center' });
      }

      doc.moveDown(1);

      // Summary box
      const summaryTop = doc.y;
      doc.rect(50, summaryTop, 500, 80).stroke();

      doc.fontSize(14).font('Helvetica-Bold').text('RÉSUMÉ', 60, summaryTop + 10);
      doc.fontSize(12).font('Helvetica');

      doc.text(`Total Produits: ${breakdown.length}`, 60, summaryTop + 35);
      doc.text(`Total Quantité: ${totalQuantity}`, 60, summaryTop + 55);

      doc.text(`Total Revenu: ${totalRevenue.toFixed(3)} DT`, 300, summaryTop + 35);
      doc.text(`Total Profit: ${totalProfit.toFixed(3)} DT`, 300, summaryTop + 55);

      doc.moveDown(2);

      // Table header
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 350;
      const col3 = 450;
      const col4 = 500;

      doc.font('Helvetica-Bold');
      doc.text('Produit', col1, tableTop);
      doc.text('Catégorie', col2, tableTop);
      doc.text('Qty', col3, tableTop);
      doc.text('Total', col4, tableTop);

      doc.moveDown(1);
      doc.font('Helvetica');

      // Product rows
      let currentY = doc.y;
      breakdown.forEach((product, index) => {
        if (currentY > 700) { // New page if needed
          doc.addPage();
          currentY = 50;
        }

        doc.text(product.productName, col1, currentY, { width: 250 });
        doc.text(product.category, col2, currentY, { width: 80 });
        doc.text(product.quantitySold.toString(), col3, currentY);
        doc.text(`${product.revenue.toFixed(3)} DT`, col4, currentY);

        currentY += 25;
      });

      // Footer
      doc.moveDown(2);
      const footerY = doc.page.height - 100;
      doc.fontSize(10).text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 50, footerY);
      doc.text('AEVE Software ', { align: 'center' });
      doc.text('Système POS - Rapport Automatique', { align: 'center' });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

// Generate ESC/POS commands for product breakdown (80mm)
const generateProductBreakdownESC = (breakdown, period, filter, totalRevenue, totalProfit, totalQuantity) => {
  let commands = '';

  // Initialize printer
  commands += ESCPOS_COMMANDS.INIT;

  // Header - centered
  commands += ESCPOS_COMMANDS.ALIGN_CENTER;
  commands += ESCPOS_COMMANDS.BOLD_ON;
  commands += ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON;
  commands += 'VENTES PAR PRODUIT' + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.NORMAL_TEXT;
  commands += ESCPOS_COMMANDS.BOLD_OFF;

  // Period
  const startDate = new Date(period.startDate);
  const endDate = new Date(period.endDate);

  if (period.isSingleDay) {
    commands += toLatin1(startDate.toLocaleDateString('fr-FR')) + ESCPOS_COMMANDS.FEED_LINE;
  } else {
    commands += toLatin1(`${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`) + ESCPOS_COMMANDS.FEED_LINE;
  }

  commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;

  // Filter info
  if (filter.category) {
    commands += toLatin1(`Catégorie: ${filter.category}`) + ESCPOS_COMMANDS.FEED_LINE;
  } else if (filter.productName) {
    commands += toLatin1(`Produit: ${filter.productName}`) + ESCPOS_COMMANDS.FEED_LINE;
  }

  commands += ESCPOS_COMMANDS.FEED_LINE;

  // Table header
  commands += ESCPOS_COMMANDS.BOLD_ON;
  commands += 'Produit             Qty  Total' + ESCPOS_COMMANDS.FEED_LINE;
  commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.BOLD_OFF;

  // Product rows
  breakdown.forEach((product, index) => {
    if (index > 20) return; // Limit to 20 products for thermal printer

    // Truncate product name to fit 80mm
    const productName = product.productName.length > 18
      ? product.productName.substring(0, 15) + '...'
      : product.productName.padEnd(18);

    const quantity = product.quantitySold.toString().padStart(3);
    const revenue = product.revenue.toFixed(3).padStart(6);

    commands += toLatin1(`${productName} ${quantity} ${revenue} DT`) + ESCPOS_COMMANDS.FEED_LINE;
  });

  commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.FEED_LINE;

  // Totals
  commands += ESCPOS_COMMANDS.BOLD_ON;
  commands += toLatin1(`Total Quantité: ${totalQuantity}`) + ESCPOS_COMMANDS.FEED_LINE;
  commands += toLatin1(`Total Revenu: ${totalRevenue.toFixed(3)} DT`) + ESCPOS_COMMANDS.FEED_LINE;
  commands += toLatin1(`Total Profit: ${totalProfit.toFixed(3)} DT`) + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.BOLD_OFF;

  commands += ESCPOS_COMMANDS.FEED_LINE;
  commands += '------------------------------------------' + ESCPOS_COMMANDS.FEED_LINE;

  // Footer
  commands += ESCPOS_COMMANDS.ALIGN_CENTER;
  commands += ESCPOS_COMMANDS.UNDERLINE_ON;
  commands += toLatin1(`Généré: ${new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })}`) + ESCPOS_COMMANDS.FEED_LINE;
  commands += ESCPOS_COMMANDS.UNDERLINE_OFF;
  commands += toLatin1('AEVE Software ') + ESCPOS_COMMANDS.FEED_LINE;

  // Cut paper
  commands += ESCPOS_COMMANDS.FEED_N_LINES(4);
  commands += ESCPOS_COMMANDS.CUT_PAPER;

  return commands;
};

// Generate PDF for product breakdown (fallback)
const generateProductBreakdownPDF = async (breakdown, period, filter, totalRevenue, totalProfit, totalQuantity) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary file path
      const tempPath = path.join(__dirname, `../../temp_product_report_${Date.now()}.pdf`);

      const doc = new PDFDocument({
        size: 'A4',
        margin: 20
      });

      const writeStream = fs.createWriteStream(tempPath);
      doc.pipe(writeStream);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('RAPPORT DES VENTES PAR PRODUIT', { align: 'center' });
      doc.moveDown(0.5);

      // Period
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);

      if (period.isSingleDay) {
        doc.fontSize(12).text(`Date: ${startDate.toLocaleDateString('fr-FR')}`, { align: 'center' });
      } else {
        doc.fontSize(12).text(`Période: ${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`, { align: 'center' });
      }

      // Filter info
      if (filter.category) {
        doc.fontSize(12).text(`Catégorie: ${filter.category}`, { align: 'center' });
      } else if (filter.productName) {
        doc.fontSize(12).text(`Produit: ${filter.productName}`, { align: 'center' });
      }

      doc.moveDown(1);

      // Summary box
      const summaryTop = doc.y;
      doc.rect(50, summaryTop, 500, 80).stroke();

      doc.fontSize(14).font('Helvetica-Bold').text('RÉSUMÉ', 60, summaryTop + 10);
      doc.fontSize(12).font('Helvetica');

      doc.text(`Total Produits: ${breakdown.length}`, 60, summaryTop + 35);
      doc.text(`Total Quantité: ${totalQuantity}`, 60, summaryTop + 55);

      doc.text(`Total Revenu: ${totalRevenue.toFixed(3)} DT`, 300, summaryTop + 35);
      doc.text(`Total Profit: ${totalProfit.toFixed(3)} DT`, 300, summaryTop + 55);

      doc.moveDown(2);

      // Table header
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 350;
      const col3 = 450;
      const col4 = 500;

      doc.font('Helvetica-Bold');
      doc.text('Produit', col1, tableTop);
      doc.text('Catégorie', col2, tableTop);
      doc.text('Qty', col3, tableTop);
      doc.text('Total', col4, tableTop);

      doc.moveDown(1);
      doc.font('Helvetica');

      // Product rows
      let currentY = doc.y;
      breakdown.forEach((product, index) => {
        if (currentY > 700) { // New page if needed
          doc.addPage();
          currentY = 50;
        }

        doc.text(product.productName, col1, currentY, { width: 250 });
        doc.text(product.category, col2, currentY, { width: 80 });
        doc.text(product.quantitySold.toString(), col3, currentY);
        doc.text(`${product.revenue.toFixed(3)} DT`, col4, currentY);

        currentY += 25;
      });

      // Footer
      doc.moveDown(2);
      const footerY = doc.page.height - 100;
      doc.fontSize(10).text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 50, footerY);
      doc.text('AEVE Software ', { align: 'center' });
      doc.text('Système POS - Rapport Automatique', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve(tempPath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
};

// === Cash Drawer Function ===
async function tryPort(portName) {
  return new Promise((resolve, reject) => {
    const port = new SerialPort({
      path: portName,
      baudRate: 9600,
      autoOpen: false,
    });
    port.open((err) => {
      if (err) return reject(err);
      // Command: ESC p m t1 t2  → open cash drawer pulse
      const command = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);
      port.write(command, (err) => {
        port.close();
        if (err) reject(err);
        else resolve(true);
      });
    });
  });
}

async function openDrawer() {
  console.log("🔍 Searching for cash drawer port/printer...");
  let opened = false;

  // 1. Try Serial Ports COM1-COM20
  for (let i = 1; i <= 20; i++) {
    const portName = `COM${i}`;
    try {
      await tryPort(portName);
      console.log(`✅ Drawer opened on ${portName}!`);
      opened = true;
      break;
    } catch {
      // Not on this COM port
    }
  }

  // 2. Try network thermal printers if registered in database
  if (!opened) {
    try {
      const printers = await Printer.findAll();
      for (const printer of printers) {
        if (printer.ip_address) {
          try {
            await new Promise((resolve, reject) => {
              const socket = new net.Socket();
              socket.setTimeout(1500);
              socket.connect(printer.port || 9100, printer.ip_address, () => {
                const drawerCmd = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);
                socket.write(drawerCmd, (err) => {
                  socket.destroy();
                  if (err) reject(err);
                  else resolve(true);
                });
              });
              socket.on('error', (err) => { socket.destroy(); reject(err); });
              socket.on('timeout', () => { socket.destroy(); reject(new Error('timeout')); });
            });
            console.log(`✅ Drawer opened via Network Printer at ${printer.ip_address}`);
            opened = true;
            break;
          } catch (netErr) {
            // Printer offline or error
          }
        }
      }
    } catch (dbErr) {
      console.error('Printer DB lookup error:', dbErr);
    }
  }

  if (!opened) {
    console.log("⚠️ No working cash drawer port or printer connection found.");
  }
  return opened;
}

// === Legacy Receipt Printing (PDF-based) ===
const printReceipt = async (req, res) => {
  const outputPath = path.join(process.cwd(), `80mm-auto-print.pdf`);
  try {
    let { order, cartItems } = req.body;

    // Use order.id to fetch the definitive items from database instead of relying on frontend payload
    if (order && order.id) {
      const dbItems = await OrderItem.findAll({
        where: { order_id: order.id },
        include: [{ model: Product, attributes: ['id', 'name', 'price'] }]
      });
      if (dbItems && dbItems.length > 0) {
        cartItems = dbItems.map(item => {
          const plain = item.get({ plain: true });
          return {
            ...plain,
            price: plain.unit_price, // Normalize for PDF logic
            name: plain.name // Use tagged name
          };
        });
      }
    }
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error('No cart items provided for printing');
    }

    const template = await Template.findOne({ where: { is_current: true } }) ||
      await Template.findOne({ where: { is_default: true } });

    const PAPER_WIDTH = 226; // 80mm
    const MARGIN = 15;
    const CONTENT_WIDTH = PAPER_WIDTH - MARGIN * 2;

    // Calculate receipt height generously
    let estimatedHeight = 200; // base header
    if (template?.address) estimatedHeight += 16;
    if (template?.phone) estimatedHeight += 16;
    if (template?.tax_number) estimatedHeight += 16;
    estimatedHeight += 60; // ticket info / separator
    estimatedHeight += cartItems.length * 28; // items (allow for discount line)
    if (order?.Client) estimatedHeight += 20; // client info
    estimatedHeight += 90; // total block (allow for points discount)
    if (template?.thank_you_message) estimatedHeight += 25;
    if (template?.return_policy) estimatedHeight += 40;
    const PAPER_HEIGHT = Math.max(500, estimatedHeight);

    const doc = new PDFDocument({
      size: [PAPER_WIDTH, PAPER_HEIGHT],
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    let y = MARGIN;

    // ===== LOGO =====
    if (template?.logo_path) {
      try {
        const logoPath = path.join(__dirname, '../../', template.logo_path);
        if (fs.existsSync(logoPath)) {
          const logoSize = 65;
          doc.image(logoPath, (PAPER_WIDTH - logoSize) / 2, y, { width: logoSize, height: logoSize });
          y += logoSize + 8;
        }
      } catch (e) { }
    }

    // ===== HEADER =====
    doc.fontSize(16).font('Helvetica-Bold')
      .text(template?.business_name || 'ÆVE', MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
    y += 20;

    if (template?.address) {
      doc.fontSize(9).font('Helvetica')
        .text(template.address, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 13;
    }

    if (template?.phone) {
      doc.fontSize(9).font('Helvetica')
        .text(`Tél: ${template.phone}`, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 13;
    }

    if (template?.tax_number) {
      doc.fontSize(9).font('Helvetica')
        .text(template.tax_number, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 13;
    }

    // Separator
    y += 4;
    doc.lineWidth(0.5).moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).stroke();
    y += 10;

    // Ticket number & date
    if (order?.ticket_number || order?.id) {
      doc.fontSize(10).font('Helvetica-Bold')
        .text(`Ticket #${order.ticket_number || order.id}`, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 14;
    }

    const now = new Date();
    const caissierName = order?.cashier_name || order?.user?.name || order?.User?.name || order?.seller_name || '';
    const dateLine = caissierName
      ? `${now.toLocaleString('fr-FR')}   Caissier: ${caissierName}`
      : now.toLocaleString('fr-FR');
    doc.fontSize(9).font('Helvetica')
      .text(dateLine, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
    y += 14;
    
    // ===== CLIENT INFO =====
    if (order?.Client) {
      doc.fontSize(10).font('Helvetica-Bold')
        .text(`Client: ${order.Client.name}`, MARGIN, y, { width: 140 });
      if (order.Client.loyalty_points !== undefined) {
        doc.fontSize(9).font('Helvetica')
          .text(`${order.Client.loyalty_points} pts`, MARGIN + 140, y, { align: 'right', width: 57 });
      }
      y += 14;
    }

    // Separator
    doc.lineWidth(0.5).moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).stroke();
    y += 8;

    // ===== COLUMN HEADERS =====
    doc.fontSize(9).font('Helvetica-Bold')
      .text('Article', MARGIN, y, { width: 110 })
      .text('Qté', MARGIN + 115, y, { width: 25, align: 'right' })
      .text('Prix', MARGIN + 145, y, { width: 45, align: 'right' });
    y += 12;
    doc.lineWidth(0.3).moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).stroke();
    y += 6;

    // ===== ITEMS =====
    let total = 0;
    doc.fontSize(9).font('Helvetica');
    cartItems.forEach((item) => {
      const qty = item.quantity || 1;
      const price = item.price || 0;
      const itemTotal = price * qty;
      total += itemTotal;

      const name = (item.name || 'Article').length > 20
        ? (item.name || 'Article').substring(0, 35)
        : (item.name || 'Article');

      doc.text(name, MARGIN, y, { width: 110 });
      doc.text(String(qty), MARGIN + 115, y, { width: 25, align: 'right' });
      doc.text(`${itemTotal.toFixed(3)} DT`, MARGIN + 145, y, { width: 45, align: 'right' });
      y += 14;

      // Item-level discount (Promotion)
      if (item.discount_amount > 0 || item.remise_percentage > 0) {
        let discountText = '';
        if (item.remise_percentage > 0) {
           discountText = `Promo: -${item.remise_percentage}%`;
        } else {
           discountText = `Remise: -${(parseFloat(item.discount_amount) * qty).toFixed(3)} DT`;
        }
        doc.fontSize(8).font('Helvetica-Oblique')
          .text(discountText, MARGIN + 5, y, { width: 150 });
        y += 11;
        doc.font('Helvetica'); // Reset
      }
    });

    y += 5;
    doc.lineWidth(0.5).moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).stroke();
    y += 10;

    // ===== TOTAL =====
    doc.fontSize(13).font('Helvetica-Bold')
      .text('TOTAL :', MARGIN, y, { width: 100 })
      .text(`${total.toFixed(3)} DT`, MARGIN + 100, y, { width: 90, align: 'right' });
    y += 18;

    // Points Discount (Fidelity)
    if (order?.points_discount > 0) {
      doc.fontSize(10).font('Helvetica-Bold')
        .text('REMISE FIDÉLITÉ:', MARGIN, y, { width: 120 })
        .text(`-${parseFloat(order.points_discount).toFixed(3)} DT`, MARGIN + 120, y, { width: 70, align: 'right' });
      y += 15;
    }

    // Payment details
    const paidAmount = order?.paid_amount || order?.montant_recu || 0;
    const change = paidAmount > 0 ? paidAmount - total : 0;

    doc.fontSize(9).font('Helvetica');
    if (paidAmount > 0) {
      doc.text('Montant Reçu :', MARGIN, y, { width: 110 })
        .text(`${paidAmount.toFixed(3)} DT`, MARGIN + 110, y, { width: 80, align: 'right' });
      y += 13;
      doc.text('Monnaie Rendue :', MARGIN, y, { width: 110 })
        .text(`${Math.max(0, change).toFixed(3)} DT`, MARGIN + 110, y, { width: 80, align: 'right' });
      y += 16;
    } else {
      doc.text('Montant Reçu :', MARGIN, y, { width: 110 })
        .text('---', MARGIN + 110, y, { width: 80, align: 'right' });
      y += 13;
      doc.text('Monnaie Rendue :', MARGIN, y, { width: 110 })
        .text('---', MARGIN + 110, y, { width: 80, align: 'right' });
      y += 16;
    }


    // ===== FOOTER =====
    if (template?.thank_you_message) {
      doc.fontSize(8).font('Helvetica-Oblique')
        .text(template.thank_you_message, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 18;
    }

    if (template?.return_policy) {
      // Thin divider between thank-you and return policy
      doc.lineWidth(0.3).moveTo(MARGIN + 20, y).lineTo(PAPER_WIDTH - MARGIN - 20, y).stroke();
      y += 10;
      doc.fontSize(8).font('Helvetica')
        .text(template.return_policy, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 22;
    }

    // Enhanced Branding Footer
    y += 25;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#444444')
      .text('ÆVE SOFTWARE', MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
    
    y += 10;
    doc.fontSize(6).font('Helvetica-Oblique').fillColor('#000000')
      .text('SOLUTIONS DE GESTION POS PREMIUM', MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
    
    // Reset color for good measure
    doc.fillColor('black');

    y += 15;
    // Light dotted line as a cutter guide
    doc.lineWidth(0.2).dash(2, { space: 4 }).moveTo(MARGIN + 60, y).lineTo(PAPER_WIDTH - MARGIN - 60, y).stroke().undash();

    y += 100; // Even more trailing space to ensure it's well beyond the cutter

    doc.end();
    await new Promise((resolve, reject) => { stream.on('finish', resolve); stream.on('error', reject); });
    await print(outputPath, { paperSize: '80mm', copies: 1 });
    await openDrawer();
    res.json({ success: true, message: 'Receipt printed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    setTimeout(() => { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); }, 5000);
  }
};

// === Sales Report Printing ===
const printSalesReport = async (req, res) => {
  const outputPath = path.join(process.cwd(), `sales_report_${Date.now()}.pdf`);
  try {
    const { reportData } = req.body;
    const template = await Template.findOne({ where: { is_current: true } }) ||
      await Template.findOne({ where: { is_default: true } });

    const PAPER_WIDTH = 215;
    const itemHeight = (reportData.products?.length || 0) * 18;
    const receiptHeight = Math.max(550, 420 + itemHeight);

    const doc = new PDFDocument({ size: [PAPER_WIDTH, receiptHeight], margins: { top: 10, bottom: 25, left: 15, right: 15 } });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    let y = 10;
    const MARGIN = 15;
    const CONTENT_WIDTH = PAPER_WIDTH - (MARGIN * 2);

    // 1. Logo
    if (template.logo_path) {
      try {
        const logoPath = path.join(__dirname, '../../', template.logo_path);
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, (PAPER_WIDTH - 50) / 2, y, { width: 50 });
          y += 55;
        }
      } catch (e) { }
    }

    // 2. Header
    doc.fontSize(12).font('Helvetica-Bold').text('RAPPORT DE VENTE', 0, y, { align: 'center', width: PAPER_WIDTH });
    y += 15;
    doc.fontSize(10).font('Helvetica-Bold').text(template.business_name || 'ÆVE Software', 0, y, { align: 'center', width: PAPER_WIDTH });
    y += 12;
    
    doc.fontSize(8).font('Helvetica').fillColor('#444444');
    if (template.address) {
      doc.text(template.address, 0, y, { align: 'center', width: PAPER_WIDTH });
      y += 10;
    }
    if (template.phone) {
      doc.text(`Tél: ${template.phone}`, 0, y, { align: 'center', width: PAPER_WIDTH });
      y += 12;
    }
    doc.fillColor('black');
    
    doc.lineWidth(0.5).moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).stroke();
    y += 10;

    // 3. Period
    doc.fontSize(9).font('Helvetica-Bold').text('PÉRIODE DU RAPPORT', MARGIN, y);
    y += 11;
    const startDateFormatted = reportData.period?.startDate ? new Date(reportData.period.startDate).toLocaleDateString('fr-FR') : 'N/A';
    const endDateFormatted = reportData.period?.endDate ? new Date(reportData.period.endDate).toLocaleDateString('fr-FR') : 'N/A';
    const periodText = reportData.period?.isSingleDay ? `Date: ${startDateFormatted}` : `Du: ${startDateFormatted} au: ${endDateFormatted}`;
    doc.fontSize(9).font('Helvetica').text(periodText, MARGIN, y);
    y += 18;

    // 4. Cashier
    doc.fontSize(9).font('Helvetica-Bold').text('CAISSIER', MARGIN, y);
    y += 11;
    const cashierName = reportData.cashier?.name || reportData.shiftInfo?.user_name || 'Non spécifié';
    doc.fontSize(9).font('Helvetica').text(`Nom: ${cashierName}`, MARGIN, y);
    y += 12;
    
    doc.lineWidth(0.5).moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).stroke();
    y += 12;

    // 5. Résumé des Ventes
    doc.fontSize(10).font('Helvetica-Bold').text('RÉSUMÉ DES VENTES', MARGIN, y);
    y += 14;

    const summaryItems = [
      { label: 'Total Commandes:', value: `${reportData.summary.totalOrders || 0}` },
      { label: 'Produits Vendus:', value: `${reportData.summary.totalQuantitySold || 0}` },
      { label: 'Chiffre d\'Affaires:', value: `${parseFloat(reportData.summary.totalRevenue || 0).toFixed(3)} DT` },
      { label: 'Coût Total:', value: `${parseFloat(reportData.summary.totalCost || 0).toFixed(3)} DT` },
      { label: 'Bénéfice Net:', value: `${parseFloat(reportData.summary.totalProfit || 0).toFixed(3)} DT` }
    ];

    summaryItems.forEach(item => {
      doc.fontSize(9).font('Helvetica-Bold').text(item.label, MARGIN, y);
      doc.fontSize(9).font('Helvetica').text(item.value, MARGIN, y, { align: 'right', width: CONTENT_WIDTH });
      y += 13;
    });

    y += 8;
    doc.lineWidth(0.8).dash(2, { space: 2 }).moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).stroke().undash();
    y += 12;

    // 6. Détail des Produits
    doc.fontSize(10).font('Helvetica-Bold').text('DÉTAIL DES PRODUITS', MARGIN, y);
    y += 14;

    // Table Header
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Produit', MARGIN, y);
    doc.text('Qté', MARGIN + 110, y, { width: 30, align: 'center' });
    doc.text('Total', MARGIN + 145, y, { width: 50, align: 'center' });
    y += 10;
    doc.lineWidth(0.5).moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).stroke();
    y += 8;

    // Product Rows
    if (reportData.products && reportData.products.length > 0) {
      doc.fontSize(8).font('Helvetica');
      reportData.products.forEach((p) => {
        const pName = p.product_name.length > 25 ? p.product_name.substring(0, 20) + '..' : p.product_name;
        doc.text(pName, MARGIN, y, { width: 110 });
        doc.text(String(p.total_quantity), MARGIN + 110, y, { width: 30, align: 'center' });
        doc.text(`${parseFloat(p.total_revenue).toFixed(3)} DT`, MARGIN + 140, y, { width: 55, align: 'center' });
        y += 14;

        // Check for page break if y is too high (though we have dynamic size, it's good safety)
        if (y > receiptHeight - 100) {
           // We keep it on one page for now since it's a receipt style, 
           // but we might need to adjust receiptHeight dynamically more accurately.
        }
      });
    }

    y += 15;
    doc.lineWidth(0.8).dash(2, { space: 2 }).moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).stroke().undash();
    y += 15;

    // 7. Footer
    const now = new Date();
    const generationDate = now.toLocaleDateString('fr-FR');
    const generationTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    doc.fontSize(8).font('Helvetica').text(`Rapport généré le ${generationDate} à ${generationTime}`, 0, y, { align: 'center', width: PAPER_WIDTH });
    y += 20;

    if (template.thank_you_message) {
       doc.fontSize(7).font('Helvetica-Oblique').text(template.thank_you_message, MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
       y += 15;
    }

    doc.fontSize(7).font('Helvetica-Bold').text('ÆVE SOFTWARE', 0, y, { align: 'center', width: PAPER_WIDTH });
    doc.fontSize(6).font('Helvetica').text('SOLUTIONS POS PREMIUM', 0, y + 8, { align: 'center', width: PAPER_WIDTH });

    doc.end();
    await new Promise((resolve, reject) => { stream.on("finish", resolve); stream.on("error", reject); });
    await print(outputPath, { paperSize: "80mm", copies: 1 });
    res.json({ success: true, message: "Sales report printed" });
  } catch (err) {
    console.error('Print Sales Report Error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    setTimeout(() => { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); }, 1000);
  }
};

// Download endpoint for PDF reports
const downloadProductReportPDF = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, `../../pdfs/${filename}`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé'
      });
    }

    // These headers should force the browser to show "Save As" dialog
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fs.statSync(filePath).size);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Read and send the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur de téléchargement',
      error: error.message
    });
  }
};
// === Audit Logs Report Printing ===
const printAuditLogs = async (req, res) => {
  const outputPath = path.join(process.cwd(), `audit_log_${Date.now()}.pdf`);
  try {
    const { logs, title } = req.body;

    if (!logs || logs.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun log à imprimer' });
    }

    const template = await Template.findOne({ where: { is_current: true } }) ||
      await Template.findOne({ where: { is_default: true } });

    const PAPER_WIDTH = 215;
    const rowHeight = 28;
    const headerHeight = 220;
    const receiptHeight = Math.max(500, headerHeight + logs.length * rowHeight + 100);

    const doc = new PDFDocument({ size: [PAPER_WIDTH, receiptHeight], margins: { top: 10, bottom: 25, left: 10, right: 10 } });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    let y = 10;
    const MARGIN = 10;
    const CONTENT_WIDTH = PAPER_WIDTH - MARGIN * 2;

    // Logo
    if (template?.logo_path) {
      try {
        const logoPath = path.join(__dirname, '../../', template.logo_path);
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, (PAPER_WIDTH - 45) / 2, y, { width: 45 });
          y += 50;
        }
      } catch (e) {}
    }

    // Header
    doc.fontSize(11).font('Helvetica-Bold')
      .text(title || 'RAPPORT DES OPÉRATIONS', 0, y, { align: 'center', width: PAPER_WIDTH });
    y += 14;
    doc.fontSize(9).font('Helvetica-Bold')
      .text(template?.business_name || 'ÆVE Software', 0, y, { align: 'center', width: PAPER_WIDTH });
    y += 12;
    if (template?.address) {
      doc.fontSize(7).font('Helvetica').fillColor('#444444')
        .text(template.address, 0, y, { align: 'center', width: PAPER_WIDTH });
      y += 9;
    }
    doc.fillColor('black');

    // Date generated
    const now = new Date();
    doc.fontSize(7).font('Helvetica')
      .text(`Imprimé le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 0, y, { align: 'center', width: PAPER_WIDTH });
    y += 8;
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#333333')
      .text(`${logs.length} entrée(s)`, 0, y, { align: 'center', width: PAPER_WIDTH });
    doc.fillColor('black');
    y += 12;

    doc.lineWidth(0.8).moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).stroke();
    y += 8;

    // Log rows
    doc.fontSize(8).font('Helvetica');
    logs.forEach((log, i) => {
      // Alternating row background
      if (i % 2 === 0) {
        doc.rect(MARGIN, y - 2, CONTENT_WIDTH, rowHeight - 2).fillOpacity(0.04).fill('#000000').fillOpacity(1);
      }

      const logDate = new Date(log.created_at);
      const dateLine = `${logDate.toLocaleDateString('fr-FR')} ${logDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      const actionLabel = log.action === 'refund' ? 'Remboursement' : log.action === 'product_deletion' ? 'Suppression Produit' : log.action;
      const roleLabel = log.actor_role === 'admin' ? 'Admin' : 'Caissier';

      doc.fillColor('#888888').font('Helvetica').fontSize(6.5)
        .text(`${dateLine}  |  ${roleLabel}  |  ${actionLabel}`, MARGIN, y, { width: CONTENT_WIDTH });
      y += 10;

      const detailText = (log.details || '').length > 90
        ? (log.details || '').substring(0, 88) + '...'
        : (log.details || '');
      doc.fillColor('#111111').font('Helvetica-Bold').fontSize(7.5)
        .text(detailText, MARGIN + 3, y, { width: CONTENT_WIDTH - 3 });
      y += 12;

      doc.lineWidth(0.2).moveTo(MARGIN, y + 2).lineTo(PAPER_WIDTH - MARGIN, y + 2).stroke();
      y += 6;
    });

    // Footer
    y += 10;
    doc.lineWidth(0.8).moveTo(MARGIN, y).lineTo(PAPER_WIDTH - MARGIN, y).stroke();
    y += 8;
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#444444')
      .text('ÆVE SOFTWARE', 0, y, { align: 'center', width: PAPER_WIDTH });
    y += 8;
    doc.fontSize(6).font('Helvetica-Oblique').fillColor('#000000')
      .text('SOLUTIONS DE GESTION POS PREMIUM', 0, y, { align: 'center', width: PAPER_WIDTH });

    doc.end();
    await new Promise((resolve, reject) => { stream.on('finish', resolve); stream.on('error', reject); });
    await print(outputPath, { paperSize: '80mm', copies: 1 });
    res.json({ success: true, message: 'Rapport imprimé avec succès' });
  } catch (err) {
    console.error('Print Audit Logs Error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    setTimeout(() => { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); }, 3000);
  }
};

// EXPORT ALL FUNCTIONS
module.exports = {
  printOrder,
  printOrderDirect, // Add direct print function
  printProductBreakdown,        // Add this
  downloadProductReportPDF,     // Add this
  getPrintOptions,
  testPrinter: testPrinterDirect, // Override with direct test
  getPrinterStatus,
  printSessionSummaryDirect,
  printReceipt,
  printSalesReport,
  openDrawer,
  printAuditLogs,
  // Export direct print helpers
  getPrinterByType,
  sendToThermalPrinter,
  generateCustomerReceiptESC,
  generateKitchenTicketESC
};