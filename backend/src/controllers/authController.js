const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthController {
  constructor() {
    // Hash the admin password on startup
    this.adminPasswordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
  }

  async login(req, res) {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }

      const isValid = bcrypt.compareSync(password, this.adminPasswordHash);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      const token = jwt.sign(
        { role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      });

      res.json({ 
        success: true, 
        token,
        expiresIn: 24 * 60 * 60
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  async logout(req, res) {
    res.clearCookie('token');
    res.json({ success: true });
  }

  async verify(req, res) {
    res.json({ valid: true, user: req.user });
  }
}

module.exports = AuthController;
