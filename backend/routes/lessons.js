// routes/lessons.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Получить все уроки курса + прогресс пользователя
router.get('/course/:courseId', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const courseId = req.params.courseId;

  db.all(`
    SELECT 
      l.id,
      l.title,
      l.order_num,
      l.duration,
      uc.progress as course_progress,
      CASE WHEN EXISTS (
        SELECT 1 FROM user_courses uc2 
        WHERE uc2.user_id = ? AND uc2.course_id = l.course_id
      ) THEN 1 ELSE 0 END as is_purchased
    FROM lessons l
    LEFT JOIN user_courses uc ON uc.course_id = l.course_id AND uc.user_id = ?
    WHERE l.course_id = ?
    ORDER BY l.order_num ASC, l.id ASC
  `, [userId, userId, courseId], (err, lessons) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Ошибка загрузки уроков' });
    }
    res.json(lessons);
  });
});

// Получить следующий урок
router.get('/:lessonId/next', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const lessonId = req.params.lessonId;

  db.get(`
    SELECT l2.id as next_id, l2.title
    FROM lessons l1
    JOIN lessons l2 ON l2.course_id = l1.course_id 
                   AND l2.order_num > l1.order_num
    LEFT JOIN user_courses uc ON uc.course_id = l2.course_id AND uc.user_id = ?
    WHERE l1.id = ?
    ORDER BY l2.order_num ASC
    LIMIT 1
  `, [userId, lessonId], (err, row) => {
    if (err) return res.status(500).json({ message: 'Ошибка' });
    if (!row) return res.json({ hasNext: false, message: 'Это последний урок' });

    res.json({
      hasNext: true,
      nextLessonId: row.next_id,
      title: row.title,
      isPurchased: true // пока считаем, что если курс куплен — все уроки доступны
    });
  });
});

module.exports = router;