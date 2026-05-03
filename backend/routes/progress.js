// routes/progress.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

router.post('/mark', authMiddleware, (req, res) => {
  const { lesson_id } = req.body;
  const userId = req.user.id;

  if (!lesson_id) return res.status(400).json({ message: "lesson_id обязателен" });

  // Проверяем, не пройден ли уже
  db.get(`SELECT 1 FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?`, 
    [userId, lesson_id], (err, exists) => {
    
    if (exists) {
      return res.json({ success: true, message: "Урок уже был отмечен как пройденный" });
    }

    db.run(`
      INSERT INTO user_lesson_progress (user_id, lesson_id)
      VALUES (?, ?)
    `, [userId, lesson_id], function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Ошибка сохранения прогресса" });
      }

      res.json({
        success: true,
        message: "✅ Урок успешно отмечен как пройденный!"
      });
    });
  });
});

module.exports = router;