const { RestaurantTable, TableSession, Order, User } = require('../Models');
const { logAudit } = require('../utils/audit.utils');

// Get all tables
async function getTables(req, res) {
  try {
    const tables = await RestaurantTable.findAll({
      include: [{
        model: TableSession,
        as: 'currentSession',
        where: { status: 'active' },
        required: false,
        include: [{
          model: User,
          as: 'waiter',
          attributes: ['id', 'name']
        }]
      }],
      order: [['table_number', 'ASC']]
    });
    
    res.json({ tables });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Create/update table
async function saveTable(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    
    let table;
    if (id) {
      table = await RestaurantTable.findByPk(id);
      if (!table) return res.status(404).json({ message: 'Table not found' });
      await table.update(data);
    } else {
      table = await RestaurantTable.create(data);
    }
    
    res.json({ table });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Open table (start session)
async function openTable(req, res) {
  try {
    const { id } = req.params;
    const { customer_count = 1, waiter_id } = req.body;
    
    const table = await RestaurantTable.findByPk(id);
    if (!table) return res.status(404).json({ message: 'Table not found' });
    
    // Check if already occupied
    if (table.status === 'occupied') {
      return res.status(400).json({ message: 'Table is already occupied' });
    }
    
    // Generate session number
    const sessionNumber = `${table.table_number}-${Date.now().toString().slice(-4)}`;
    
    // Create session
    const session = await TableSession.create({
      table_id: id,
      session_number: sessionNumber,
      customer_count,
      waiter_id: waiter_id || req.user.id,
      status: 'active'
    });
    
    // Update table status
    await table.update({ status: 'occupied' });
    
    res.json({ 
      success: true, 
      table: await table.reload(),
      session 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Close table (end session)
async function closeTable(req, res) {
  try {
    const { id } = req.params;
    
    const table = await RestaurantTable.findByPk(id);
    if (!table) return res.status(404).json({ message: 'Table not found' });
    
    // Find active session
    const session = await TableSession.findOne({
      where: { table_id: id, status: 'active' }
    });
    
    if (session) {
      await session.update({
        status: 'closed',
        ended_at: new Date()
      });
    }
    
    // Update table status
    await table.update({ status: 'available' });
    
    res.json({ 
      success: true, 
      table: await table.reload()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Get table details
async function getTableDetails(req, res) {
  try {
    const { id } = req.params;
    
    const table = await RestaurantTable.findByPk(id, {
      include: [{
        model: TableSession,
        as: 'sessions',
        limit: 10,
        order: [['started_at', 'DESC']],
        include: [{
          model: Order,
          include: ['order_items']
        }]
      }]
    });
    
    if (!table) return res.status(404).json({ message: 'Table not found' });
    
    // Get current session
    const currentSession = await TableSession.findOne({
      where: { table_id: id, status: 'active' }
    });
    
    res.json({
      table,
      currentSession
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Move table position
async function moveTable(req, res) {
  try {
    const { id } = req.params;
    const { x_position, y_position, section } = req.body;
    
    const table = await RestaurantTable.findByPk(id);
    if (!table) return res.status(404).json({ message: 'Table not found' });
    
    await table.update({
      x_position: x_position || table.x_position,
      y_position: y_position || table.y_position,
      section: section || table.section
    });
    
    res.json({ table });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Merge tables
async function mergeTables(req, res) {
  try {
    const { fromTableId, toTableId } = req.body;
    
    const fromTable = await RestaurantTable.findByPk(fromTableId);
    const toTable = await RestaurantTable.findByPk(toTableId);
    
    if (!fromTable || !toTable) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    // Get active session from source table
    const fromSession = await TableSession.findOne({
      where: { table_id: fromTableId, status: 'active' }
    });
    
    if (!fromSession) {
      return res.status(400).json({ message: 'Source table has no active session' });
    }
    
    // Get or create session on destination table
    let toSession = await TableSession.findOne({
      where: { table_id: toTableId, status: 'active' }
    });
    
    if (!toSession) {
      toSession = await TableSession.create({
        table_id: toTableId,
        session_number: `${toTable.table_number}-M${Date.now().toString().slice(-4)}`,
        customer_count: fromSession.customer_count,
        waiter_id: fromSession.waiter_id,
        status: 'active'
      });
      await toTable.update({ status: 'occupied' });
    }
    
    // Move all orders from source to destination
    await Order.update(
      { session_id: toSession.id, table_id: toTableId },
      { where: { session_id: fromSession.id } }
    );
    
    // Close source session
    await fromSession.update({
      status: 'merged',
      ended_at: new Date(),
      notes: `Merged to table ${toTable.table_number}`
    });
    
    // Free source table
    await fromTable.update({ status: 'available' });
    
    res.json({ 
      success: true,
      message: `Table ${fromTable.table_number} merged to ${toTable.table_number}`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
// DELETE /api/tables/:id
async function deleteTable(req, res) {
  try {
    const { id } = req.params;

    const table = await RestaurantTable.findByPk(id);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Check active session
    const activeSession = await TableSession.findOne({
      where: { table_id: id, status: 'active' }
    });

    if (activeSession) {
      return res.status(400).json({
        error: 'Cannot delete a table with an active session'
      });
    }

    // Delete all sessions for this table
    await TableSession.destroy({
      where: { table_id: id }
    });

    // Delete the table
    await RestaurantTable.destroy({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Table deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({
      error: 'Server error while deleting table'
    });
  }
}

module.exports = {
  getTables,
  saveTable,
  openTable,
  closeTable,
  getTableDetails,
  moveTable,
  mergeTables,
  deleteTable
};