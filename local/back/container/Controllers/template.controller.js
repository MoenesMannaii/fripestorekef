const { Template, AuditLog, sequelize } = require('../Models');
const fs = require('fs');
const path = require('path');
const secrets = require('../config/secrets');

// Default template data
const DEFAULT_TEMPLATE = {
  business_name: 'X Restaurant | Superette',
  address: 'Kef Ouest',
  phone: '+216 28-888-XXX',
  email: '',
  website: '',
  tax_number: '',
  thank_you_message: 'Merci pour votre achat !',
  return_policy: 'Retours acceptés dans un délai d\'un jour avec le reçu original.',
  is_default: true,
  is_current: true,
  loyalty_ratio: 10,
  loyalty_min_points: 100,
  loyalty_points_value: 30.00
};

// Initialize default template - CALL THIS ON APP STARTUP
exports.initializeDefaultTemplate = async () => {
  try {
    const existingDefault = await Template.findOne({ where: { is_default: true } });
    if (!existingDefault) {
      await Template.create(DEFAULT_TEMPLATE);
      console.log('✅ Default template initialized');
    } else {
      console.log('✅ Default template already exists');
    }
    
    // Ensure there's always a current template
    const existingCurrent = await Template.findOne({ where: { is_current: true } });
    if (!existingCurrent) {
      await Template.update({ is_current: true }, { 
        where: { is_default: true } 
      });
      console.log('✅ Current template set to default');
    }
  } catch (error) {
    console.error('❌ Error initializing default template:', error);
  }
};

// Get current template
exports.getCurrentTemplate = async (req, res) => {
  try {
    let template = await Template.findOne({ where: { is_current: true } });
    
    // If no current template, use default
    if (!template) {
      template = await Template.findOne({ where: { is_default: true } });
      if (template) {
        // Set default as current
        await template.update({ is_current: true });
      }
    }

    // If still no template, create one immediately
    if (!template) {
      console.log('⚠️ No template found, creating default...');
      template = await Template.create(DEFAULT_TEMPLATE);
    }

    // Convert to plain object and add full logo URL if exists
    const templateData = template.toJSON();
    if (templateData.logo_path) {
      templateData.logo_url = `http://localhost:4000/${templateData.logo_path}`;
    }

    res.json(templateData);
  } catch (error) {
    console.error('Get template error:', error);
    // Return default template data even if database fails
    res.json(DEFAULT_TEMPLATE);
  }
};

// Get hardcoded deletion authorization codes
exports.getDeletionCodes = async (req, res) => {
  try {
    res.json({
      deletion_barcodes: secrets.DELETION_BARCODES || []
    });
  } catch (error) {
    console.error('Get deletion codes error:', error);
    res.status(500).json({ message: 'Failed to fetch deletion codes' });
  }
};

// Save current template
exports.saveCurrentTemplate = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      business_name,
      address,
      phone,
      email,
      website,
      tax_number,
      thank_you_message,
      return_policy,
      loyalty_ratio,
      loyalty_min_points,
      loyalty_points_value,
      ticket_reset_period,
      product_fields_config,
      logo_deleted
    } = req.body;

    console.log('--- SAVE TEMPLATE DEBUG ---');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file ? 'File present' : 'No file');
    console.log('loyalty_min_points:', loyalty_min_points);
    console.log('loyalty_points_value:', loyalty_points_value);
    console.log('ticket_reset_period:', ticket_reset_period);

    let logo_path = null;
    if (req.file) {
      // Store the path with the template directory
      logo_path = `uploads/template/${req.file.filename}`;
      
      console.log('Logo uploaded:', {
        originalName: req.file.originalname,
        savedAs: req.file.filename,
        path: logo_path,
        size: req.file.size
      });
    }

    // Get current template
    let currentTemplate = await Template.findOne({ 
      where: { is_current: true },
      transaction 
    });

    if (currentTemplate) {
      // If updating and there's a new logo OR it was deleted, handle old logo file
      if ((req.file || logo_deleted === 'true') && currentTemplate.logo_path) {
        const oldLogoPath = path.join(__dirname, '../../', currentTemplate.logo_path);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
          console.log('Deleted old logo:', oldLogoPath);
        }
      }

      // Update existing current template
      await currentTemplate.update({
        business_name,
        address,
        phone,
        email,
        website,
        tax_number,
        logo_path: req.file ? logo_path : (logo_deleted === 'true' ? null : currentTemplate.logo_path),
        thank_you_message,
        return_policy,
        loyalty_ratio: loyalty_ratio || currentTemplate.loyalty_ratio,
        loyalty_min_points: loyalty_min_points || currentTemplate.loyalty_min_points,
        loyalty_points_value: loyalty_points_value || currentTemplate.loyalty_points_value,
        ticket_reset_period: ticket_reset_period || currentTemplate.ticket_reset_period,
        product_fields_config: product_fields_config ? (typeof product_fields_config === 'string' ? JSON.parse(product_fields_config) : product_fields_config) : currentTemplate.product_fields_config
      }, { transaction });
    } else {
      // Create new current template
      currentTemplate = await Template.create({
        business_name,
        address,
        phone,
        email,
        website,
        tax_number,
        logo_path,
        thank_you_message,
        return_policy,
        is_current: true,
        loyalty_ratio: loyalty_ratio || 10,
        loyalty_min_points: loyalty_min_points || 100,
        loyalty_points_value: loyalty_points_value || 30.00,
        ticket_reset_period: ticket_reset_period || 'none',
        product_fields_config: product_fields_config ? (typeof product_fields_config === 'string' ? JSON.parse(product_fields_config) : product_fields_config) : null
      }, { transaction });
    }

    // Audit log
    if (req.user) {
      await AuditLog.create({
        actor_id: req.user.id,
        actor_role: req.user.role,
        action: 'save_template',
        details: `Template saved by ${req.user.name}`
      }, { transaction });
    }

    await transaction.commit();

    // Add logo URL to response
    const responseTemplate = currentTemplate.toJSON();
    if (responseTemplate.logo_path) {
      responseTemplate.logo_url = `http://localhost:4000/${responseTemplate.logo_path}`;
    }

    res.status(200).json({ 
      message: 'Template saved successfully', 
      template: responseTemplate 
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Save template error:', error);
    res.status(500).json({ 
      message: 'Failed to save template', 
      error: error.message 
    });
  }
};