const { sequelize, Product, Order, User } = require('../Models');

async function getInventoryAlerts(req, res) {
    try {
        const [salesData] = await sequelize.query(`
      SELECT 
        p.id, p.name, p.stock, p.price, p.category, p.barcode,
        COALESCE(SUM(oi.quantity), 0) as total_sold_30d,
        COALESCE(SUM(oi.quantity) / 30.0, 0) as avg_daily_sales
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= date('now', '-30 days')
      WHERE p.deleted_at IS NULL
      GROUP BY p.id
    `);

        const alerts = {
            reorder: [],
            deadStock: []
        };

        salesData.forEach(item => {
            if (item.avg_daily_sales > 0) {
                const daysUntilEmpty = item.stock / item.avg_daily_sales;
                if (daysUntilEmpty <= 7) {
                    alerts.reorder.push({
                        ...item,
                        daysUntilEmpty: Math.round(daysUntilEmpty * 10) / 10,
                        suggestion: Math.ceil(item.avg_daily_sales * 14)
                    });
                }
            }
            if (item.stock > 0 && item.total_sold_30d == 0) {
                alerts.deadStock.push({
                    ...item,
                    daysUnsold: '>30'
                });
            }
        });

        res.json({ success: true, data: alerts });
    } catch (err) {
        console.error('Inventory Alerts Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getAnomalyDetection(req, res) {
    try {
        const [stats] = await sequelize.query(`
      SELECT 
        AVG(total) as mean_val, 
        SUM((total - (SELECT AVG(total) FROM (SELECT total FROM orders ORDER BY id DESC LIMIT 1000))) * (total - (SELECT AVG(total) FROM (SELECT total FROM orders ORDER BY id DESC LIMIT 1000)))) / MAX(1, COUNT(total)-1) as variance 
      FROM (SELECT total FROM orders ORDER BY id DESC LIMIT 1000)
    `);

        const mean = stats[0].mean_val || 0;
        const stddev = Math.sqrt(stats[0].variance || 0);
        const threshold = mean + (2 * stddev);

        const safeThreshold = threshold > 0 ? threshold : 999999;

        const [highValueAnomalies] = await sequelize.query(`
      SELECT o.id, o.total, o.created_at, u.name as cashier_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.total > ${safeThreshold}
      ORDER BY o.created_at DESC
      LIMIT 20
    `);

        const orders = await Order.findAll({
            order: [['created_at', 'DESC']],
            limit: 100,
            include: [{ model: User, attributes: ['id', 'name'] }]
        });

        const rapidOrders = [];
        for (let i = 0; i < orders.length - 1; i++) {
            const o1 = orders[i];
            const o2 = orders[i + 1];
            if (o1.user_id === o2.user_id && o1.user_id !== null) {
                const diffMs = new Date(o1.created_at) - new Date(o2.created_at);
                if (diffMs > 0 && diffMs < 30000) {
                    rapidOrders.push({
                        order_id_1: o1.id,
                        order_id_2: o2.id,
                        cashier_name: o1.User?.name,
                        time_diff_seconds: Math.round(diffMs / 1000),
                        created_at: o1.created_at
                    });
                }
            }
        }

        res.json({ success: true, data: { highValue: highValueAnomalies, rapidOrders, stats: { mean, stddev, threshold: safeThreshold } } });
    } catch (err) {
        console.error('Anomaly Detection Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getSalesForecast(req, res) {
    try {
        const [dailySales] = await sequelize.query(`
       SELECT DATE(DATETIME(created_at, '+1 hour')) as day, SUM(total) as revenue
       FROM orders
       WHERE created_at >= date('now', '-30 days')
       GROUP BY DATE(DATETIME(created_at, '+1 hour'))
       ORDER BY day ASC
     `);

        const history = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dayStr = d.toISOString().split('T')[0];
            const record = dailySales.find(r => r.day === dayStr);
            const rev = record ? record.revenue : 0;
            history.push({ day: dayStr, revenue: rev });
        }

        const recent7Days = history.slice(-7);
        const recent7Avg = recent7Days.reduce((acc, r) => acc + r.revenue, 0) / 7;

        const forecast = [];
        for (let i = 1; i <= 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            const dayStr = d.toISOString().split('T')[0];
            const noise = 1 + (Math.random() * 0.1 - 0.05); // +/- 5% noise
            let predRev = recent7Avg * noise;
            forecast.push({ day: dayStr, predicted_revenue: parseFloat(predRev.toFixed(3)) });
        }

        res.json({ success: true, data: { history, forecast } });
    } catch (err) {
        console.error('Forecast Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getTopProducts(req, res) {
    try {
        const [topProducts] = await sequelize.query(`
            SELECT 
                p.id, p.name, p.category, p.price,
                COALESCE(SUM(oi.quantity), 0) as total_sold,
                COALESCE(SUM(oi.total), 0) as total_revenue
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= date('now', '-30 days')
            WHERE p.deleted_at IS NULL
            GROUP BY p.id
            ORDER BY total_sold DESC
            LIMIT 10
        `);
        res.json({ success: true, data: topProducts });
    } catch (err) {
        console.error('Top Products Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getDailyStats(req, res) {
    try {
        const [todayStats] = await sequelize.query(`
            SELECT 
                COALESCE(SUM(total), 0) as today_revenue,
                COUNT(*) as today_orders,
                COALESCE(AVG(total), 0) as avg_basket
            FROM orders
            WHERE DATE(created_at) = DATE('now')
        `);

        const [hourlyStats] = await sequelize.query(`
            SELECT 
                strftime('%H', created_at) as hour,
                COUNT(*) as order_count,
                COALESCE(SUM(total), 0) as revenue
            FROM orders
            WHERE DATE(created_at) = DATE('now')
            GROUP BY hour
            ORDER BY revenue DESC
            LIMIT 1
        `);

        const [weekStats] = await sequelize.query(`
            SELECT 
                COALESCE(SUM(total), 0) as week_revenue,
                COUNT(*) as week_orders
            FROM orders
            WHERE created_at >= date('now', '-7 days')
        `);

        const [monthStats] = await sequelize.query(`
            SELECT 
                COALESCE(SUM(total), 0) as month_revenue,
                COUNT(*) as month_orders
            FROM orders
            WHERE created_at >= date('now', '-30 days')
        `);

        const bestHour = hourlyStats[0];
        const bestHourLabel = bestHour ? `${bestHour.hour}h00 - ${String(parseInt(bestHour.hour) + 1).padStart(2,'0')}h00` : 'Pas encore de données';

        res.json({
            success: true,
            data: {
                today: {
                    revenue: parseFloat(todayStats[0]?.today_revenue || 0).toFixed(3),
                    orders: parseInt(todayStats[0]?.today_orders || 0),
                    avg_basket: parseFloat(todayStats[0]?.avg_basket || 0).toFixed(3)
                },
                best_hour: bestHourLabel,
                week: {
                    revenue: parseFloat(weekStats[0]?.week_revenue || 0).toFixed(3),
                    orders: parseInt(weekStats[0]?.week_orders || 0)
                },
                month: {
                    revenue: parseFloat(monthStats[0]?.month_revenue || 0).toFixed(3),
                    orders: parseInt(monthStats[0]?.month_orders || 0)
                }
            }
        });
    } catch (err) {
        console.error('Daily Stats Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    getInventoryAlerts,
    getAnomalyDetection,
    getSalesForecast,
    getTopProducts,
    getDailyStats
};
