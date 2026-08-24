const express = require('express');
const router = express.Router();
const tablesController = require('../Controllers/tables.controller');
const  authenticate  = require('../middlewares/auth.middleware');

router.get('/', authenticate, tablesController.getTables);
router.post('/', authenticate, tablesController.saveTable);
router.put('/:id', authenticate, tablesController.saveTable);
router.post('/:id/open', authenticate, tablesController.openTable);
router.post('/:id/close', authenticate, tablesController.closeTable);
router.put('/:id/move', authenticate, tablesController.moveTable);
router.get('/:id', authenticate, tablesController.getTableDetails);
router.post('/merge', authenticate, tablesController.mergeTables);
router.delete('/:id', authenticate, tablesController.deleteTable);
module.exports = router;