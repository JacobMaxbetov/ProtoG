const db = require('../db');

// Получить всех студентов + их купленные курсы
const getStudents = (req, res) => {
  const query = `
    SELECT u.id, u.name, u.email, u.balance,
           COUNT(uc.course_id) as courses_count,
           SUM(uc.progress) as total_progress
    FROM users u
    LEFT JOIN user_courses uc ON u.id = uc.user_id
    GROUP BY u.id, u.name, u.email, u.balance
    ORDER BY u.name
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Ошибка получения студентов' });
    }
    res.json(rows);
  });
};

// Получить все курсы с количеством студентов
const getCoursesWithStats = (req, res) => {
  const query = `
    SELECT c.*, 
           COUNT(uc.user_id) as students_count
    FROM courses c
    LEFT JOIN user_courses uc ON c.id = uc.course_id
    GROUP BY c.id
    ORDER BY c.title
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Ошибка получения курсов' });
    }
    res.json(rows);
  });
};

// Создать новый курс
const createCourse = (req, res) => {
  const { title, description, price, duration, level, image } = req.body;

  if (!title || price === undefined) {
    return res.status(400).json({ message: 'Название и цена обязательны' });
  }

  const query = `
    INSERT INTO courses (title, description, price, duration, level, image)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [title, description, price, duration, level, image], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Ошибка создания курса' });
    }

    res.status(201).json({
      message: 'Курс успешно создан',
      courseId: this.lastID,
      course: { 
        id: this.lastID, 
        title, 
        description, 
        price, 
        duration, 
        level, 
        image 
      }
    });
  });
};

// Обновить курс
const updateCourse = (req, res) => {
  const { id } = req.params;
  const { title, description, price, duration, level, image } = req.body;

  if (!title || price === undefined) {
    return res.status(400).json({ message: 'Название и цена обязательны' });
  }

  const query = `
    UPDATE courses 
    SET title = ?, description = ?, price = ?, duration = ?, level = ?, image = ?
    WHERE id = ?
  `;

  db.run(query, [title, description, price, duration, level, image, id], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Ошибка обновления курса' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Курс не найден' });
    }

    res.json({ message: 'Курс успешно обновлён' });
  });
};

// Удалить курс
const deleteCourse = (req, res) => {
  const { id } = req.params;

  // Проверяем, есть ли студенты, купившие этот курс
  db.get('SELECT COUNT(*) as count FROM user_courses WHERE course_id = ?', [id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Ошибка проверки курса' });
    }

    if (row.count > 0) {
      return res.status(400).json({ 
        message: 'Нельзя удалить курс, у которого уже есть покупатели' 
      });
    }

    db.run('DELETE FROM courses WHERE id = ?', [id], function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Ошибка удаления курса' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Курс не найден' });
      }

      res.json({ message: 'Курс успешно удалён' });
    });
  });
};

/// ====================== РАСПИСАНИЕ ======================

const createScheduleEvent = (req, res) => {
  const { title, description, event_type = 'stream', course_id, start_time, end_time } = req.body;

  if (!title || !start_time) {
    return res.status(400).json({ message: 'Название и время начала обязательны' });
  }

  const query = `
    INSERT INTO schedule_events (title, description, event_type, course_id, start_time, end_time, teacher_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    title,
    description || null,
    event_type,
    course_id || null,
    start_time,
    end_time || null,
    req.user?.name || 'Преподаватель'
  ], function(err) {
    if (err) {
      console.error('Ошибка создания события:', err);
      return res.status(500).json({ message: 'Ошибка создания события в расписании' });
    }

    res.status(201).json({
      message: 'Событие успешно добавлено',
      eventId: this.lastID
    });
  });
};

const getTeacherSchedule = (req, res) => {
  db.all(`
    SELECT s.*, c.title as course_title 
    FROM schedule_events s
    LEFT JOIN courses c ON s.course_id = c.id
    ORDER BY s.start_time DESC
  `, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Ошибка загрузки расписания' });
    }
    res.json(rows || []);
  });
};

// Обновить событие расписания
const updateScheduleEvent = (req, res) => {
    const { id } = req.params;
    const { title, description, event_type, course_id, start_time, end_time } = req.body;

    if (!title || !start_time) {
        return res.status(400).json({ message: 'Название и время начала обязательны' });
    }

    const query = `
        UPDATE schedule_events 
        SET title = ?,
            description = ?,
            event_type = ?,
            course_id = ?,
            start_time = ?,
            end_time = ?,
            teacher_name = ?
        WHERE id = ?
    `;

    db.run(query, [
        title,
        description || null,
        event_type || 'stream',
        course_id || null,
        start_time,
        end_time || null,
        req.user?.name || 'Преподаватель',
        id
    ], function(err) {
        if (err) {
            console.error('Ошибка обновления события:', err);
            return res.status(500).json({ message: 'Ошибка обновления события' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: 'Событие не найдено' });
        }

        res.json({ message: 'Занятие успешно обновлено' });
    });
};

// Удалить событие расписания
const deleteScheduleEvent = (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM schedule_events WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Ошибка удаления события:', err);
            return res.status(500).json({ message: 'Ошибка удаления события' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: 'Событие не найдено' });
        }

        res.json({ message: 'Занятие успешно удалено' });
    });
};

module.exports = { 
  getStudents, 
  getCoursesWithStats, 
  createCourse, 
  updateCourse, 
  deleteCourse,
  createScheduleEvent,
  getTeacherSchedule,
  updateScheduleEvent,
  deleteScheduleEvent
};