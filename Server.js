const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Use environment variable for MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/starid';
mongoose.connect(MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.log('MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
  starid: { type: String, unique: true },
  email: { type: String, unique: true },
  password: String,
  profile: {
    name: String
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Generate StarID
function generateStarID() {
  return 'STAR-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// 1. Health Check
app.get('/', (req, res) => {
  res.json({ 
    message: 'StarID Backend is running!',
    version: '1.0.0',
    endpoints: ['/api/register', '/api/login', '/api/profile']
  });
});

// 2. User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const starid = generateStarID();

    const user = new User({
      starid,
      email,
      password: hashedPassword,
      profile: { name }
    });

    await user.save();

    res.json({
      success: true,
      starid,
      message: 'StarID created successfully'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { starid: user.starid, email: user.email },
      'starid-secret-key-2024',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      starid: user.starid,
      user: {
        name: user.profile.name,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`StarID Server running on port ${PORT}`);
});
