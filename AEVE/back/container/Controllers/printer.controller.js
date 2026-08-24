const { Printer } = require('../Models');
const PrinterService = require('../services/printer.service');
const fs = require('fs');
const path = require('path');

const PrinterController = {
  // Get all printers
  async getAllPrinters(req, res) {
    try {
      const printers = await Printer.findAll({
        order: [['printer_type', 'ASC'], ['name', 'ASC']]
      });
      
      // SIMPLIFIED: Just check if port is open
      const printersWithStatus = await Promise.all(
        printers.map(async (printer) => {
          try {
            const result = await PrinterService.testPortOpen(
              printer.ip_address, 
              printer.port || 9100
            );
            
            return {
              ...printer.toJSON(),
              status: result.connected ? 'online' : 'offline',
              status_details: result
            };
          } catch (error) {
            return {
              ...printer.toJSON(),
              status: 'error',
              status_details: { error: error.message }
            };
          }
        })
      );

      res.json({
        success: true,
        printers: printersWithStatus,
        count: printersWithStatus.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch printers',
        error: error.message
      });
    }
  },

  // SIMPLE: Create new printer (NO connection test required)
  async createPrinter(req, res) {
    try {
      const { name, ip_address, port, printer_type, is_active, is_default } = req.body;

      // Basic validation
      if (!name || !ip_address || !printer_type) {
        return res.status(400).json({
          success: false,
          message: 'Name, IP address, and printer type are required'
        });
      }

      // Simple IP validation
      const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
      if (!ipRegex.test(ip_address)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid IP address format. Example: 192.168.100.33'
        });
      }

      // If setting as default, unset other defaults of same type
      if (is_default) {
        await Printer.update(
          { is_default: false },
          { where: { printer_type } }
        );
      }

      // Create printer without testing connection
      const printer = await Printer.create({
        name,
        ip_address,
        port: port || 9100,
        printer_type,
        is_active: is_active !== undefined ? is_active : true,
        is_default: is_default || false
      });

      // Test connection in background (optional)
      try {
        const testResult = await PrinterService.testPortOpen(ip_address, port || 9100);
        console.log(`Printer ${ip_address} test:`, testResult.connected ? 'OK' : 'Not reachable');
      } catch (testError) {
        console.log(`Background test failed for ${ip_address}:`, testError.message);
      }

      res.status(201).json({
        success: true,
        message: 'Printer created successfully',
        printer,
        note: 'Printer connection will be tested when used'
      });
    } catch (error) {
      console.error('Error creating printer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create printer',
        error: error.message,
        details: error.errors ? error.errors.map(e => e.message) : null
      });
    }
  },

  // SIMPLE: Update printer
  async updatePrinter(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const printer = await Printer.findByPk(id);
      if (!printer) {
        return res.status(404).json({
          success: false,
          message: 'Printer not found'
        });
      }

      // If setting as default, unset other defaults of same type
      if (updates.is_default) {
        await Printer.update(
          { is_default: false },
          { 
            where: { 
              printer_type: updates.printer_type || printer.printer_type,
              id: { [Sequelize.Op.ne]: id }
            }
          }
        );
      }

      await printer.update(updates);

      res.json({
        success: true,
        message: 'Printer updated successfully',
        printer
      });
    } catch (error) {
      console.error('Error updating printer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update printer',
        error: error.message
      });
    }
  },

  // Delete printer
  async deletePrinter(req, res) {
    try {
      const { id } = req.params;

      const printer = await Printer.findByPk(id);
      if (!printer) {
        return res.status(404).json({
          success: false,
          message: 'Printer not found'
        });
      }

      await printer.destroy();

      res.json({
        success: true,
        message: 'Printer deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting printer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete printer',
        error: error.message
      });
    }
  },

  // SIMPLE: Scan network
  async scanNetwork(req, res) {
    try {
      console.log('🔍 Starting simple network scan...');
      
      const foundDevices = await PrinterService.scanNetworkForPrinters();

      console.log(`✅ Found ${foundDevices.length} devices with open port 9100`);

      res.json({
        success: true,
        scan_completed: true,
        found_devices: foundDevices,
        count: foundDevices.length,
        note: 'These devices have port 9100 open, which is commonly used by thermal printers'
      });
    } catch (error) {
      console.error('Network scan failed:', error);
      res.status(500).json({
        success: false,
        message: 'Network scan failed',
        error: error.message
      });
    }
  },

  // SIMPLE: Test specific printer
  async testPrinter(req, res) {
    try {
      const { id } = req.params;

      const printer = await Printer.findByPk(id);
      if (!printer) {
        return res.status(404).json({
          success: false,
          message: 'Printer not found'
        });
      }

      console.log(`Testing printer: ${printer.name} (${printer.ip_address}:${printer.port || 9100})`);

      // Simple port check
      const connectionTest = await PrinterService.testPortOpen(
        printer.ip_address,
        printer.port || 9100
      );

      // Try to print test page if port is open
      let testPageResult = null;
      if (connectionTest.connected) {
        try {
          testPageResult = await PrinterService.printSimpleTest(
            printer.ip_address,
            printer.port || 9100
          );
        } catch (printError) {
          testPageResult = {
            success: false,
            message: `Print test failed: ${printError.message}`
          };
        }
      }

      res.json({
        success: connectionTest.connected,
        message: connectionTest.connected 
          ? `Printer ${printer.name} is reachable` 
          : `Cannot connect to printer ${printer.name}`,
        printer: printer.toJSON(),
        connection_test: connectionTest,
        test_page: testPageResult,
        overall_status: connectionTest.connected ? 'online' : 'offline',
        suggestions: connectionTest.connected ? [
          'Printer is reachable! You can now use it for printing.',
          'Test by printing an order or receipt.'
        ] : [
          '1. Check if printer is powered ON',
          `2. Verify IP address: ${printer.ip_address}`,
          `3. Check network connection to ${printer.ip_address}`,
          '4. Try: telnet ' + printer.ip_address + ' ' + (printer.port || 9100),
          '5. Check firewall settings on server'
        ]
      });
    } catch (error) {
      console.error('Printer test failed:', error);
      res.status(500).json({
        success: false,
        message: 'Printer test failed',
        error: error.message
      });
    }
  },

  // Quick test for specific IP
  async testPrinterQuick(req, res) {
    try {
      const { ip = '192.168.100.33', port = 9100 } = req.query;
      
      console.log(`Quick test for ${ip}:${port}`);
      
      const result = await PrinterService.testPortOpen(ip, port);
      
      res.json({
        success: result.connected,
        message: result.connected 
          ? `✅ Device at ${ip}:${port} is reachable!` 
          : `❌ Cannot connect to ${ip}:${port}`,
        details: result,
        next_steps: result.connected ? [
          '1. Add this printer in the settings',
          `2. Configure as type: cashier/kitchen/bar`,
          '3. Test printing'
        ] : [
          '1. Check printer power',
          '2. Check network cable/WiFi',
          '3. Verify IP address on printer',
          '4. Try: ping ' + ip,
          '5. Check firewall settings'
        ]
      });
      
    } catch (error) {
      console.error('Quick test error:', error);
      res.status(500).json({
        success: false,
        message: 'Quick test error',
        error: error.message
      });
    }
  },

  // Simple test print
  async testPrintSimple(req, res) {
    try {
      const { ip = '192.168.100.33', port = 9100 } = req.query;
      
      console.log(`Test printing to ${ip}:${port}`);
      
      const result = await PrinterService.printSimpleTest(ip, port);
      
      res.json({
        success: result.success,
        message: result.message,
        ip,
        port,
        details: result.details
      });
      
    } catch (error) {
      console.error('Print test error:', error);
      res.status(500).json({
        success: false,
        message: 'Print test error',
        error: error.message
      });
    }
  },

  // Get printer statistics
  async getPrinterStats(req, res) {
    try {
      const printers = await Printer.findAll();
      
      const stats = {
        total: printers.length,
        by_type: {
          cashier: printers.filter(p => p.printer_type === 'cashier').length,
          kitchen: printers.filter(p => p.printer_type === 'kitchen').length,
          bar: printers.filter(p => p.printer_type === 'bar').length,
          other: printers.filter(p => p.printer_type === 'other').length
        },
        active: printers.filter(p => p.is_active).length,
        defaults: printers.filter(p => p.is_default).length
      };

      // Check status of each printer
      const statusChecks = await Promise.all(
        printers.map(async (printer) => {
          try {
            const result = await PrinterService.testPortOpen(
              printer.ip_address, 
              printer.port || 9100
            );
            return result.connected ? 'online' : 'offline';
          } catch (error) {
            return 'error';
          }
        })
      );

      stats.online = statusChecks.filter(s => s === 'online').length;
      stats.offline = statusChecks.filter(s => s === 'offline').length;
      stats.error = statusChecks.filter(s => s === 'error').length;

      res.json({
        success: true,
        stats,
        last_updated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting printer stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get printer statistics',
        error: error.message
      });
    }
  },

  // Quick add printer from scan
  async addPrinterFromScan(req, res) {
    try {
      const { ip, port = 9100, name = `Printer ${ip}`, printer_type = 'cashier' } = req.body;

      if (!ip) {
        return res.status(400).json({
          success: false,
          message: 'IP address is required'
        });
      }

      // Check if printer already exists
      const existing = await Printer.findOne({ where: { ip_address: ip } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Printer with this IP already exists',
          printer: existing
        });
      }

      // Create printer
      const printer = await Printer.create({
        name,
        ip_address: ip,
        port,
        printer_type,
        is_active: true,
        is_default: false
      });

      res.status(201).json({
        success: true,
        message: 'Printer added successfully',
        printer
      });
    } catch (error) {
      console.error('Error adding printer from scan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add printer',
        error: error.message
      });
    }
  }
};

module.exports = PrinterController;