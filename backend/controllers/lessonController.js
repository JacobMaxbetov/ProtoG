// backend/controllers/lessonController.js
const db = require('../db');
const fs = require('fs').promises;
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '../../content/lessons');

// Создание директории при первом использовании
const ensureContentDir = async () => {
  await fs.mkdir(CONTENT_DIR, { recursive: true });
};

// ==================== МОДУЛИ ====================
const createModule = (req, res) => {
  const { course_id, title } = req.body;

  if (!course_id || !title) {
    return res.status(400).json({ message: 'course_id и title обязательны' });
  }

  db.run(
    'INSERT INTO course_modules (course_id, title, order_num) VALUES (?, ?, ?)',
    [course_id, title, Date.now()],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Ошибка создания модуля' });
      }
      res.json({ id: this.lastID, course_id, title, order_num: Date.now() });
    }
  );
};

const getModules = (req, res) => {
  db.all('SELECT * FROM course_modules ORDER BY order_num ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Ошибка получения модулей' });
    res.json(rows || []);
  });
};

// ==================== УРОКИ ====================
const createLesson = (req, res) => {
  const { course_id, module_id, title } = req.body;

  if (!course_id || !title) {
    return res.status(400).json({ message: 'course_id и title обязательны' });
  }

  db.run(
    'INSERT INTO lessons (course_id, module_id, title, order_num) VALUES (?, ?, ?, ?)',
    [course_id, module_id || null, title, Date.now()],
    async function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Ошибка создания урока' });
      }

      const lessonId = this.lastID;

      // Создаём пустой HTML-файл
      try {
        await ensureContentDir();
        const filePath = path.join(CONTENT_DIR, `${lessonId}.html`);
        await fs.writeFile(filePath, `<h2>${title}</h2>\n<p>Начните редактировать материал урока...</p>`, 'utf8');
      } catch (fileErr) {
        console.error('Не удалось создать файл урока:', fileErr);
      }

      res.json({ id: lessonId, course_id, module_id, title });
    }
  );
};

const getLessons = (req, res) => {
  db.all('SELECT * FROM lessons ORDER BY order_num ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Ошибка получения уроков' });
    res.json(rows || []);
  });
};

// Сохранение контента урока в файл
const saveLessonContent = async (req, res) => {
  const lessonId = req.params.id;
  const { content } = req.body;

  if (!lessonId || content === undefined) {
    return res.status(400).json({ message: 'lessonId и content обязательны' });
  }

  try {
    await ensureContentDir();
    const filePath = path.join(CONTENT_DIR, `${lessonId}.html`);
    await fs.writeFile(filePath, content, 'utf8');

    res.json({ message: 'Контент урока успешно сохранён', lessonId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сохранения контента' });
  }
};

// Удаление урока
const deleteLesson = (req, res) => {
  const lessonId = req.params.id;

  db.run('DELETE FROM lessons WHERE id = ?', [lessonId], async function(err) {
    if (err) return res.status(500).json({ message: 'Ошибка удаления урока' });
    if (this.changes === 0) return res.status(404).json({ message: 'Урок не найден' });

    // Удаляем файл контента
    try {
      const filePath = path.join(CONTENT_DIR, `${lessonId}.html`);
      await fs.unlink(filePath);
    } catch (e) {
      // файл мог не существовать
    }

    res.json({ message: 'Урок удалён' });
  });
};

// Получить уроки конкретного курса (только если куплен)
// Получить уроки конкретного курса (только если куплен)
const getCourseLessons = (req, res) => {
  const { courseId } = req.params;
  const userId = req.user?.id;

  console.log(`[getCourseLessons] Запрос: courseId=${courseId}, userId=${userId}`);

  if (!courseId || !userId) {
    return res.status(400).json({ message: 'Нет courseId или userId' });
  }

  db.get(
    `SELECT 1 FROM user_courses WHERE user_id = ? AND course_id = ?`,
    [userId, courseId],
    (err, row) => {
      if (err) {
        console.error('Ошибка проверки покупки:', err);
        return res.status(500).json({ message: 'Ошибка проверки доступа' });
      }

      if (!row) {
        return res.status(403).json({ message: 'Курс не куплен' });
      }

      // Самая безопасная версия — только колонки, которые 100% существуют
      db.all(
        `SELECT id, 
                title, 
                duration, 
                video_url, 
                order_num,
                content_path   -- может отсутствовать в старой таблице
         FROM lessons 
         WHERE course_id = ? 
         ORDER BY order_num ASC`,
        [courseId],
        (err, lessons) => {
          if (err) {
            // Если content_path всё ещё ругается — убираем его
            if (err.message.includes('content_path')) {
              console.log('Колонка content_path отсутствует, пробуем без неё...');
              
              return db.all(
                `SELECT id, title, duration, video_url, order_num 
                 FROM lessons 
                 WHERE course_id = ? 
                 ORDER BY order_num ASC`,
                [courseId],
                (err2, lessons2) => {
                  if (err2) {
                    console.error('Ошибка получения уроков:', err2);
                    return res.status(500).json({ message: 'Ошибка загрузки уроков' });
                  }
                  console.log(`Успешно возвращено ${lessons2.length} уроков (без content_path)`);
                  res.json(lessons2 || []);
                }
              );
            }

            console.error('Ошибка получения уроков:', err);
            return res.status(500).json({ message: 'Ошибка загрузки уроков' });
          }

          console.log(`[getCourseLessons] Успешно возвращено ${lessons.length} уроков`);
          res.json(lessons || []);
        }
      );
    }
  );
};

module.exports = {
  createModule,
  getModules,
  createLesson,
  getLessons,
  getCourseLessons,
  saveLessonContent,
  deleteLesson
};