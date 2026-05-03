// db.js — работа с базой данных
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'protog.db'), (err) => {
  if (err) console.error('Ошибка подключения к БД:', err);
  else console.log('✅ SQLite подключена');
});

// Создаём таблицы
db.serialize(() => {
  // Обновляем таблицу users с добавлением UNIQUE для name
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,           -- ← Добавили UNIQUE
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      balance INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
  if (err) console.error('Ошибка создания users:', err);
  else console.log('✅ Таблица users готова (name UNIQUE)');
});

  // Добавляем колонку balance, если её ещё нет (для уже существующих БД)
  db.run(`ALTER TABLE users ADD COLUMN balance INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Ошибка добавления balance:', err.message);
    } else if (!err) {
      console.log('✅ Колонка balance добавлена');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      duration TEXT,
      level TEXT,
      image TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      progress INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (course_id) REFERENCES courses(id),
      UNIQUE(user_id, course_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      yookassa_id TEXT UNIQUE NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  // === МОДУЛИ КУРСА ===
  db.run(`
    CREATE TABLE IF NOT EXISTS course_modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      order_num INTEGER DEFAULT 0,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('Ошибка создания course_modules:', err);
    else console.log('✅ Таблица course_modules готова');
  });

  // === УРОКИ ===
  db.run(`
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      module_id INTEGER,
      title TEXT NOT NULL,
      content_path TEXT,           -- путь к файлу /content/lessons/{id}.html
      video_url TEXT,
      duration INTEGER DEFAULT 0,
      order_num INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('Ошибка создания lessons:', err);
    else console.log('✅ Таблица lessons готова');
  });
  // === ПРОГРЕСС ПО КОНКРЕТНЫМ УРОКАМ ===
  db.run(`
    CREATE TABLE IF NOT EXISTS user_lesson_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      lesson_id INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (lesson_id) REFERENCES lessons(id),
      UNIQUE(user_id, lesson_id)
    )
  `, (err) => {
    if (err) console.error('Ошибка создания user_lesson_progress:', err);
    else console.log('✅ Таблица user_lesson_progress готова');
  });
  // === РАСПИСАНИЕ ЗАНЯТИЙ ===
  db.run(`
    CREATE TABLE IF NOT EXISTS schedule_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT DEFAULT 'stream', -- stream, lesson, webinar
      course_id INTEGER,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      teacher_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('Ошибка создания schedule_events:', err);
    else console.log('✅ Таблица расписания готова');
  });

  console.log('✅ Все таблицы готовы');
  console.log('✅ Все таблицы готовы');
});

module.exports = db;