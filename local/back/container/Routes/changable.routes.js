// In your backend server (localhost:4000)
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Endpoint to trigger automatic update
router.post('/api/database/auto-update', async (req, res) => {
  try {
    console.log('🕐 Auto-update triggered at:', new Date());
    
    // Path to your database file
    const dbPath = path.join(process.cwd(), 'container', 'database', 'offline_pos.db');
    
    console.log('Looking for database at:', dbPath);
    
    // Check if file exists
    if (!fs.existsSync(dbPath)) {
      console.error('Database file not found at:', dbPath);
      return res.status(404).json({ 
        error: 'Database file not found',
        path: dbPath 
      });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(dbPath);
    console.log('Database file read successfully, size:', fileBuffer.length, 'bytes');

    // Create FormData properly
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Append the file buffer correctly
    formData.append('database', fileBuffer, {
      filename: 'offline_pos.db',
      contentType: 'application/octet-stream',
      knownLength: fileBuffer.length // Important: specify the length
    });

    // Get headers properly
    const headers = formData.getHeaders();
    
    // Upload to remote server using axios for better FormData handling
    console.log('Uploading to remote server...');
    
    // Use axios instead of fetch for better FormData support in Node.js
    const axios = require('axios');
    const uploadRes = await axios.post('https://superettejemai.onrender.com/api/change-db', formData, {
      headers: {
        ...headers,
        'Content-Length': formData.getLengthSync() // Important: set content length
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    if (uploadRes.status === 200) {
      console.log('✅ Database updated successfully on remote server');
      res.json({ 
        success: true, 
        message: 'Database updated successfully', 
        time: new Date().toISOString(),
        remoteResponse: uploadRes.data
      });
    } else {
      throw new Error(`Upload failed with status: ${uploadRes.status}`);
    }
  } catch (error) {
    console.error('❌ Auto-update error:', error);
    
    // More detailed error logging
    if (error.response) {
      console.error('Remote server response error:', error.response.data);
      console.error('Remote server status:', error.response.status);
    }
    
    res.status(500).json({ 
      error: 'Auto-update failed',
      details: error.message,
      stack: error.stack
    });
  }
});

// Endpoint to check if auto-update is working
router.get('/api/database/check-auto-update', (req, res) => {
  const dbPath = path.join(process.cwd(), 'container', 'database', 'offline_pos.db');
  const exists = fs.existsSync(dbPath);
  
  res.json({
    autoUpdateAvailable: true,
    databaseFileExists: exists,
    databasePath: dbPath,
    currentTime: new Date().toISOString()
  });
});

module.exports = router;