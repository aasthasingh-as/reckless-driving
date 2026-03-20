require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const tripRoutes = require('./routes/tripRoutes');
const eventRoutes = require('./routes/eventRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const alertRoutes = require('./routes/alertRoutes');

// Global Error Prevention
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 5001;

// Diagnostic Log
console.log('--- Initializing Server ---');
console.log('Time:', new Date().toISOString());

// Middleware
app.use(cors());
app.use(express.json());

// IDENTITY ROUTE
app.get('/', (req, res) => {
  res.send('YOU HIT THE HARSH DRIVING SERVER ENTRY POINT');
});

// TEST ROUTE
app.get('/api/test-direct', (req, res) => {
  res.json({ success: true, message: 'Direct route works!' });
});

// Database Connection
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/harsh_driving';

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Setup Routes
app.use('/api/trips', tripRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/alerts', alertRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is healthy', timestamp: new Date() });
});

// Final Catch-all for 404
app.use((req, res) => {
  console.log(`404 at ${req.method} ${req.url}`);
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.url} not found on this server` 
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});