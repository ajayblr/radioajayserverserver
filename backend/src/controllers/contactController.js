class ContactController {
  constructor(db) {
    this.db = db;
  }

  async submitContact(req, res) {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      this.db.addContactMessage({ name, email, subject, message });

      res.json({ success: true, message: 'Contact message received' });
    } catch (err) {
      console.error('Submit contact error:', err);
      res.status(500).json({ error: 'Failed to submit contact message' });
    }
  }

  async getMessages(req, res) {
    try {
      const messages = this.db.getAllContactMessages();
      res.json({ messages });
    } catch (err) {
      console.error('Get messages error:', err);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      this.db.markContactMessageRead(parseInt(id));
      res.json({ success: true });
    } catch (err) {
      console.error('Mark read error:', err);
      res.status(500).json({ error: 'Failed to mark message as read' });
    }
  }

  async deleteMessage(req, res) {
    try {
      const { id } = req.params;
      this.db.deleteContactMessage(parseInt(id));
      res.json({ success: true });
    } catch (err) {
      console.error('Delete message error:', err);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  }
}

module.exports = ContactController;
