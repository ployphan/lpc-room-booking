const express = require('express');
const session = require('express-session');
const path = require('path');
const config = require('./config/app');

const app = express();

// EJS View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'app/views'));

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Session configuration
app.use(session({
    name: config.sessionName,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 2, // 2 hours session timeout
        secure: false // Set to true if running on HTTPS
    }
}));

// Expose session variables to EJS views
app.use((req, res, next) => {
    res.locals.appName = config.appName;
    res.locals.appUrl = config.appUrl;
    res.locals.session = req.session;
    res.locals.user = req.session ? req.session.user : null;
    next();
});

// Static files (Web Root)
app.use(express.static(path.join(__dirname, 'public')));

// Register Routes
app.use('/api', require('./routes/api'));
app.use('/', require('./routes/web'));

// 404 Handler
app.use((req, res) => {
    res.status(404).render('errors/404', { title: 'ไม่พบหน้านี้ - 404 Not Found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ (500 Internal Server Error)');
});

const { db } = require('./database/database');
const { seed } = require('./database/seeders');

// Auto initialize and seed empty database on startup
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (dbErr, row) => {
    if (dbErr) {
        console.error('Error checking database status:', dbErr.message);
    } else if (!row) {
        console.log('Database is empty or missing tables. Bootstrapping tables and seeding initial data...');
        seed().catch(seedErr => {
            console.error('Error auto-seeding database on start:', seedErr.message);
        });
    } else {
        console.log('Database verification successful. All tables present.');
    }
});

// Listen on configured port (Port 80)
const PORT = config.port || 80;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`==================================================`);
    console.log(`  LPC Meeting Room Booking System is running!`);
    console.log(`  Access URL: http://localhost/`);
    console.log(`  Port: ${PORT} (Standard HTTP - No port number needed)`);
    console.log(`==================================================`);
});
