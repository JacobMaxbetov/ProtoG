const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

const getCurrentUser = (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Не авторизован' });
  }

  db.get(`
    SELECT id, name, email, balance 
    FROM users 
    WHERE id = ?
  `, [userId], (err, row) => {
    if (err) {
      console.error('Ошибка базы данных в /users/me:', err.message);
      return res.status(500).json({ message: 'Ошибка сервера' });
    }

    if (!row) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      balance: row.balance || 0
    });
  });
};

router.get('/me', auth, getCurrentUser);

module.exports = router;