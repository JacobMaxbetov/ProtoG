// backend/controllers/courseController.js
const db = require('../db');

const getAllCourses = (req, res) => {
  db.all('SELECT * FROM courses', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Ошибка получения курсов' });
    res.json(rows);
  });
};

const getCourseById = (req, res) => {
  db.get('SELECT * FROM courses WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Ошибка сервера' });
    if (!row) return res.status(404).json({ message: 'Курс не найден' });
    res.json(row);
  });
};

module.exports = { getAllCourses, getCourseById };