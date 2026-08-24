// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./container/Models');
const errorHandler = require('./container/middlewares/error.middleware');
const { initializeDatabase } = require('./container/database/init');
const { initializeDefaultTemplate } = require('./container/Controllers/template.controller');

const authRoutes = require('./container/Routes/auth.routes');
const usersRoutes = require('./container/Routes/users.routes');
const productsRoutes = require('./container/Routes/products.routes');
const ordersRoutes = require('./container/Routes/orders.routes');
const reportsRoutes = require('./container/Routes/reports.routes');
const auditRoutes = require('./container/Routes/audit.routes');
const templateRoutes = require('./container/Routes/template.routes');
const statsRoutes = require('./container/Routes/stats.routes');
const printRoutes = require("./container/Routes/printRoutes");
const factureRoutes = require('./container/Routes/facture.routes');
const aiRoutes = require('./container/Routes/ai.routes');
const dbRoutes = require("./container/Routes/db.routes");
const deviceRoutes = require("./container/Routes/deviceCheck");
const changeRoutes = require("./container/Routes/changable.routes");
const creditRoutes = require('./container/Routes/credit.routes');
const shiftRoutes = require('./container/Routes/shift.routes');
// 🆕 Repartition & Printer routes
const tableRoutes = require('./container/Routes/tables.routes');
const printerRoutes = require('./container/Routes/printer.routes');
const printMultiRoutes = require('./container/Routes/print.routes');
const clientsRoutes = require('./container/Routes/clients.routes');
const suppliersRoutes = require('./container/Routes/suppliers.routes');
const promotionsRoutes = require('./container/Routes/promotions.routes');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/stats', statsRoutes);
app.use("/api", printRoutes);
app.use('/api/factures', factureRoutes);
app.use('/api/ai', aiRoutes);
app.use("/api", dbRoutes);
app.use("/api/device", deviceRoutes);
app.use("/", changeRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/shifts', shiftRoutes);
// 🆕 Repartition & Printer
app.use('/api/tables', tableRoutes);
app.use('/api/printers', printerRoutes);
app.use('/api/print', printMultiRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/promotions', promotionsRoutes);
app.get('/', (req, res) => res.json({ message: 'Offline POS Backend' }));

app.use(errorHandler);

const PORT = 4000;
(async () => {
  try {
    // Initialize database first
    await initializeDatabase();

    // Then connect with Sequelize
    await sequelize.authenticate();
    console.log('DB connected');

    // Sync database models
    await sequelize.sync({ force: false });

    // Initialize default template
    await initializeDefaultTemplate();

    app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  } catch (err) {
    console.error('Unable to start server:', err);
  }
})();