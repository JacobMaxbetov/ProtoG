// backend/controllers/purchaseController.js
const db = require('../db');

// backend/controllers/purchaseController.js

// backend/controllers/purchaseController.js

// backend/controllers/purchaseController.js

const purchaseCourse = (req, res) => {
  const userId = req.user.id;
  const { courseId } = req.body;

  if (!courseId) {
    return res.status(400).json({ message: 'Не указан ID курса' });
  }

  db.serialize(() => {
    const query = `
      SELECT 
        c.price AS course_price, 
        u.balance AS user_balance,
        u.name as user_name,
        c.title as course_title
      FROM courses c 
      CROSS JOIN users u 
      WHERE u.id = ? AND c.id = ?
    `;

    db.get(query, [userId, courseId], (err, row) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ message: 'Ошибка сервера' });
      }

      if (!row) {
        return res.status(404).json({ message: 'Курс не найден' });
      }

      const price = Number(row.course_price);   // сейчас цена в рублях!
      const priceInKopecks = Math.round(price * 100);
      const balanceInKopecks = Number(row.user_balance);

      if (balanceInKopecks < priceInKopecks) {
        return res.status(400).json({ 
          message: `Недостаточно средств. На балансе: ${(balanceInKopecks/100).toLocaleString('ru-RU')} ₽, нужно: ${price} ₽` 
        });
      }

      db.run('BEGIN TRANSACTION');

      db.run(
        'UPDATE users SET balance = balance - ? WHERE id = ?',
        [priceInKopecks, userId],
        function (err1) {
          if (err1 || this.changes === 0) {
            db.run('ROLLBACK');
            return res.status(500).json({ message: 'Ошибка списания баланса' });
          }

          db.run(
            'INSERT INTO user_courses (user_id, course_id) VALUES (?, ?)',
            [userId, courseId],
            function (err2) {
              if (err2) {
                db.run('ROLLBACK');
                if (err2.code === 'SQLITE_CONSTRAINT') {
                  return res.status(409).json({ message: 'Курс уже куплен' });
                }
                return res.status(500).json({ message: 'Ошибка при покупке курса' });
              }

              db.run('COMMIT', () => {
                console.log(`✅ Успешно куплен курс "${row.course_title}" за ${price} ₽`);

                res.json({
                  message: 'Курс успешно куплен!',
                  courseTitle: row.course_title,
                  newBalance: (balanceInKopecks - priceInKopecks) / 100,
                  purchaseId: this.lastID
                });
              });
            }
          );
        }
      );
    });
  });
};

const getMyCourses = (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Пользователь не авторизован' });
  }

  const query = `
    SELECT 
      c.*,
      uc.purchased_at,
      COUNT(DISTINCT l.id) as total_lessons,
      COUNT(DISTINCT ulp.lesson_id) as completed_lessons
    FROM user_courses uc
    JOIN courses c ON uc.course_id = c.id
    LEFT JOIN lessons l ON l.course_id = c.id
    LEFT JOIN user_lesson_progress ulp 
      ON ulp.lesson_id = l.id AND ulp.user_id = ?
    WHERE uc.user_id = ?
    GROUP BY c.id, uc.purchased_at
    ORDER BY uc.purchased_at DESC
  `;

  db.all(query, [userId, userId], (err, rows) => {
    if (err) {
      console.error('Get my courses error:', err);
      return res.status(500).json({ message: 'Ошибка получения купленных курсов' });
    }

    let globalCompletedLessons = 0;

    const result = rows.map(course => {
      const total = course.total_lessons || 0;
      const completed = course.completed_lessons || 0;
      
      globalCompletedLessons += completed;

      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        ...course,
        total_lessons: total,
        completed_lessons: completed,
        progress: progress,
        progress_text: total > 0 
          ? `${completed} из ${total} уроков (${progress}%)` 
          : "Уроки ещё не добавлены"
      };
    });

    // Обновляем глобальную статистику "Пройдено уроков"
    // (можно делать и на фронте, но здесь удобнее)
    res.json(result);
  });
};

module.exports = { purchaseCourse, getMyCourses };