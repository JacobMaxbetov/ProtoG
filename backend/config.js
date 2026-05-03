const dotenv = require('dotenv');
const path = require('path');

// Загружаем .env из папки backend
dotenv.config({
    path: path.resolve(__dirname, '../.env')   // __dirname — это папка, где лежит config.js
});

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'protoG-super-secret-key-2026',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Списки привилегий
  TEACHERS: process.env.TEACHERS ? process.env.TEACHERS.split(',').map(u => u.trim().toLowerCase()) : [],
  ADMINS: process.env.ADMINS ? process.env.ADMINS.split(',').map(u => u.trim().toLowerCase()) : [],

  // Для отладки
  YOOKASSA_SHOP_ID: process.env.YOOKASSA_SHOP_ID
};