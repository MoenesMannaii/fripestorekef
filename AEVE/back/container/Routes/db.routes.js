const express = require("express");
const router = express.Router();
const dbController = require("../Controllers/db.controller");

router.post("/backup", dbController.backup);
router.post("/restore", dbController.restore);
router.post('/delete', dbController.deleteTables); 

module.exports = router;
