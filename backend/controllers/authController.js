// backend/controllers/authController.js
const db = require('../db');
const { hashPassword, comparePassword } = require('../utils/hash');
const jwt = require('jsonwebtoken');
const config = require('../config');

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Все поля обязательны' });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ message: 'Имя должно содержать минимум 2 символа' });
  }

  const trimmedName = name.trim();

  try {
    // === ПРОВЕРКА УНИКАЛЬНОСТИ ИМЕНИ ===
    const nameExists = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE name = ?', [trimmedName], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (nameExists) {
      return res.status(409).json({ 
        message: 'Это имя уже занято. Пожалуйста, выберите другое имя.' 
      });
    }

    // === ПРОВЕРКА EMAIL (оставляем как было) ===
    const emailExists = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (emailExists) {
      return res.status(409).json({ message: 'Пользователь с таким email уже существует' });
    }

    // Хешируем пароль
    const hashed = await hashPassword(password);

    // Создаём пользователя
    db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [trimmedName, email, hashed],
      function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Ошибка сервера при создании пользователя' });
        }

        const token = jwt.sign(
          { id: this.lastID, email }, 
          config.JWT_SECRET, 
          { expiresIn: '7d' }
        );

        res.status(201).json({
          message: 'Регистрация успешна',
          token,
          user: { 
            id: this.lastID, 
            name: trimmedName, 
            email 
          }
        });
      }
    );

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при регистрации' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      config.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Успешный вход',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email 
      }
    });
  });
};

module.exports = { register, login };