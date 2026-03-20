const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'hackathon_secret_key_123';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  console.log('--- Auth: POST /register ---');
  console.log('Body:', JSON.stringify(req.body));
  try {
    const { email, password, name, familyContact } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    const newUser = new User({
      email: normalizedEmail,
      password,
      name: name.trim(),
      familyContact: familyContact || '',
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        familyContact: newUser.familyContact || '',
        emergencyContacts: newUser.emergencyContacts || [],
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  console.log('--- Auth: POST /login ---');
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        familyContact: user.familyContact || '',
        emergencyContacts: user.emergencyContacts || [],
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        familyContact: user.familyContact || '',
        emergencyContacts: user.emergencyContacts || [],
      },
    });
  } catch (error) {
    console.error('Me route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router;