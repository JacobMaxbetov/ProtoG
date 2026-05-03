const express = require('express');
const router = express.Router();

const { getAllCourses } = require('../controllers/courseController');
const { purchaseCourse, getMyCourses } = require('../controllers/purchaseController');
const authenticateToken = require('../middleware/auth');

// Новый контроллер (создадим ниже)
const { getCourseLessons } = require('../controllers/lessonController');

console.log('=== COURSES ROUTES LOADED ===');

// Публичные
router.get('/', getAllCourses);

// Защищённые
router.get('/my', authenticateToken, getMyCourses);
router.post('/purchase', authenticateToken, purchaseCourse);
router.get('/:courseId/lessons', authenticateToken, getCourseLessons);

console.log('   GET /api/courses/ - OK');
console.log('   GET /api/courses/my - OK');
console.log('   POST /api/courses/purchase - OK');
console.log('   GET /api/courses/:courseId/lessons - OK');  // ← добавлено

module.exports = router;