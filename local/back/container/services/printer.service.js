const net = require('net');
const dns = require('dns');
const ping = require('ping');

class PrinterService {
  constructor() {
    this.thermalPrinterPort = 9100; // Standard port for thermal printers
  }

  // SIMPLE TEST: Just check if port 9100 is open
  async testPortOpen(ip, port = 9100, timeout = 2000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve({
          success: true,
          ip,
          port,
          message: `Port ${port} is open on ${ip}`,
          connected: true
        });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          success: false,
          ip,
          port,
          message: `Connection timeout to ${ip}:${port}`,
          connected: false
        });
      });
      
      socket.on('error', (err) => {
        socket.destroy();
        resolve({
          success: false,
          ip,
          port,
          message: `Connection error: ${err.message}`,
          connected: false,
          error: err.message
        });
      });
      
      socket.connect(port, ip);
    });
  }

  // SIMPLIFIED SCAN for your network 192.168.100.x
  async scanNetworkForPrinters() {
    const foundPrinters = [];
    
    console.log(`🔍 Scanning network 192.168.100.1 to 192.168.100.254 for printers...`);
    
    // Common printer IPs in restaurants/shops
    const commonPrinterIPs = [
      '192.168.100.33',
      '192.168.100.34',
      '192.168.100.100',
      '192.168.100.101',
      '192.168.100.102',
      '192.168.100.200',
      '192.168.100.201',
      '192.168.100.10',
      '192.168.100.20',
      '192.168.100.30',
      '192.168.100.40',
      '192.168.100.50'
    ];
    
    // First check common IPs
    for (const ip of commonPrinterIPs) {
      console.log(`Checking ${ip}:9100...`);
      const result = await this.testPortOpen(ip, 9100, 1000);
      
      if (result.connected) {
        console.log(`✅ Found device with open port 9100 at ${ip}`);
        foundPrinters.push({
          ip: ip,
          port: 9100,
          type: 'thermal',
          message: 'Port 9100 open - likely a thermal printer'
        });
      }
    }
    
    // If no printers found in common IPs, scan a smaller range
    if (foundPrinters.length === 0) {
      console.log('Scanning range 192.168.100.1 to 192.168.100.50...');
      
      // Only scan 1-50 to save time
      for (let i = 1; i <= 50; i++) {
        const ip = `192.168.100.${i}`;
        
        // Skip already checked IPs
        if (commonPrinterIPs.includes(ip)) continue;
        
        // Skip our own server IP (usually .1 is router, .2-.10 are servers)
        if (i <= 10) continue;
        
        const result = await this.testPortOpen(ip, 9100, 500); // Faster timeout
        
        if (result.connected) {
          console.log(`✅ Found device with open port 9100 at ${ip}`);
          foundPrinters.push({
            ip: ip,
            port: 9100,
            type: 'thermal',
            message: 'Port 9100 open - likely a thermal printer'
          });
        }
        
        // Show progress
        if (i % 10 === 0) {
          console.log(`Scanned ${i}/50 IPs...`);
        }
      }
    }
    
    console.log(`✅ Scan complete. Found ${foundPrinters.length} devices with open port 9100`);
    return foundPrinters;
  }

  // Test specific printer (192.168.100.33)
  async testSpecificPrinter(ip = '192.168.100.33', port = 9100) {
    console.log(`Testing printer at ${ip}:${port}...`);
    
    // First check if port is open
    const portCheck = await this.testPortOpen(ip, port, 3000);
    
    if (!portCheck.connected) {
      return {
        success: false,
        message: `Cannot connect to ${ip}:${port}`,
        details: portCheck,
        suggestion: [
          '1. Check printer power and network cable',
          '2. Verify IP address is correct',
          '3. Check if firewall is blocking port 9100',
          '4. Try pinging the IP: ping 192.168.100.33'
        ]
      };
    }
    
    // If port is open, try to send a simple test command
    try {
      const testResult = await this.sendSimpleTestCommand(ip, port);
      return {
        success: true,
        message: `Printer at ${ip}:${port} is ready`,
        details: portCheck,
        test_command_result: testResult
      };
    } catch (error) {
      return {
        success: true, // Port is open, so technically successful
        message: `Port ${port} is open at ${ip} but printing test failed`,
        details: portCheck,
        warning: 'Device accepts connections but may not be a thermal printer',
        error: error.message
      };
    }
  }

  // Send simple test command
  async sendSimpleTestCommand(ip, port) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let timeout;
      
      socket.setTimeout(3000);
      
      socket.connect(port, ip, () => {
        console.log(`Connected to ${ip}:${port}, sending test command...`);
        
        // Send a simple initialize command
        const initCommand = Buffer.from('\x1B\x40', 'binary');
        socket.write(initCommand);
        
        // Give it a moment
        setTimeout(() => {
          socket.destroy();
          resolve({
            success: true,
            message: 'Test command sent successfully',
            command: 'ESC @ (Initialize)'
          });
        }, 500);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
      
      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });
    });
  }

  // Send full ESC/POS commands
  async sendToThermalPrinter(ip, port, commands) {
    return new Promise((resolve, reject) => {
      console.log(`🖨️ Printing to ${ip}:${port}...`);
      
      const socket = new net.Socket();
      let timeout;
      
      socket.setTimeout(5000);
      
      socket.connect(port, ip, () => {
        console.log(`✅ Connected to ${ip}:${port}`);
        clearTimeout(timeout);
        
        // Convert string commands to buffer
        const buffer = Buffer.from(commands, 'binary');
        
        socket.write(buffer, (err) => {
          if (err) {
            socket.destroy();
            reject(new Error(`Write error: ${err.message}`));
            return;
          }
          
          console.log(`✅ Data sent to printer (${buffer.length} bytes)`);
          
          // Wait for printer to process
          setTimeout(() => {
            socket.destroy();
            resolve({ 
              success: true, 
              message: 'Print job completed',
              bytes_sent: buffer.length
            });
          }, 2000);
        });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
      
      socket.on('error', (err) => {
        clearTimeout(timeout);
        socket.destroy();
        reject(new Error(`Connection error: ${err.message}`));
      });
    });
  }

  // Generate ESC/POS commands for receipt
  generateEscPosReceipt(content) {
    let commands = '';
    
    // Initialize
    commands += '\x1B\x40';
    
    // Center alignment for header
    commands += '\x1B\x61\x01';
    commands += '\x1B\x45\x01'; // Bold
    commands += 'TEST RECEIPT\n';
    commands += '\x1B\x45\x00'; // Bold off
    
    // Left alignment for content
    commands += '\x1B\x61\x00';
    commands += '======================\n';
    
    // Add the content
    commands += content + '\n';
    
    commands += '======================\n';
    commands += '\x1B\x61\x01'; // Center
    commands += '\x1B\x45\x01'; // Bold
    commands += 'MERCI!\n';
    commands += '\x1B\x45\x00'; // Bold off
    
    // Cut paper
    commands += '\x1D\x56\x41\x00'; // Partial cut
    
    return commands;
  }

  // Simple test print
  async printSimpleTest(ip, port = 9100) {
    const testContent = [
      'Date: ' + new Date().toLocaleString(),
      'IP: ' + ip,
      'Port: ' + port,
      '',
      'This is a test print from',
      'POS System'
    ].join('\n');
    
    const commands = this.generateEscPosReceipt(testContent);
    
    try {
      const result = await this.sendToThermalPrinter(ip, port, commands);
      return {
        success: true,
        message: 'Test printed successfully',
        details: result
      };
    } catch (error) {
      return {
        success: false,
        message: `Print failed: ${error.message}`,
        error: error.message
      };
    }
  }
}

module.exports = new PrinterService();