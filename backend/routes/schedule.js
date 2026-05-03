// routes/schedule.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Получить расписание (для авторизованных — персонализированное)
router.get('/', (req, res, next) => {
  // Пытаемся применить middleware, но не падаем жёстко
  authMiddleware(req, res, (err) => {
    if (err) {
      // Если не авторизован — возвращаем общие события
      return getPublicSchedule(req, res);
    }
    next();
  });
}, (req, res) => {
  const userId = req.user?.id;
  getPersonalizedSchedule(userId, res);
});

function getPublicSchedule(req, res) {
  db.all(`
    SELECT s.*, c.title as course_title
    FROM schedule_events s
    LEFT JOIN courses c ON s.course_id = c.id
    ORDER BY s.start_time ASC
    LIMIT 10
  `, [], (err, events) => {
    if (err) return res.status(500).json({ message: 'Ошибка загрузки расписания' });
    res.json(events || []);
  });
}

function getPersonalizedSchedule(userId, res) {
  db.all(`
    SELECT s.*, c.title as course_title
    FROM schedule_events s
    LEFT JOIN courses c ON s.course_id = c.id
    WHERE s.course_id IS NULL 
       OR s.course_id IN (SELECT course_id FROM user_courses WHERE user_id = ?)
    ORDER BY s.start_time ASC
    LIMIT 15
  `, [userId], (err, events) => {
    if (err) return res.status(500).json({ message: 'Ошибка загрузки расписания' });
    res.json(events || []);
  });
}

module.exports = router;