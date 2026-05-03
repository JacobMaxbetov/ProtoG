// backend/routes/teacher.js
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const isTeacher = require('../middleware/isTeacher');

const { 
  getStudents, 
  getCoursesWithStats,
  createCourse,
  updateCourse,
  deleteCourse,
  createScheduleEvent,
  getTeacherSchedule,
  updateScheduleEvent,
  deleteScheduleEvent
} = require('../controllers/teacherController');

// Импортируем новые контроллеры для модулей и уроков
const {
  createModule,
  getModules,
  createLesson,
  getLessons,
  saveLessonContent,
  deleteLesson,

  
} = require('../controllers/lessonController');


// === Основные роуты панели учителя ===
router.get('/', authMiddleware, isTeacher, (req, res) => {
  res.json({
    success: true,
    isTeacher: true,
    isAdmin: req.isAdmin || false,
    message: "Панель учителя",
    user: req.user
  });
});

router.get('/students', authMiddleware, isTeacher, getStudents);
router.get('/courses', authMiddleware, isTeacher, getCoursesWithStats);

router.post('/courses', authMiddleware, isTeacher, createCourse);
router.put('/courses/:id', authMiddleware, isTeacher, updateCourse);
router.delete('/courses/:id', authMiddleware, isTeacher, deleteCourse);


// === Новые роуты для модулей и уроков ===
router.get('/modules', authMiddleware, isTeacher, getModules);
router.post('/modules', authMiddleware, isTeacher, createModule);

router.get('/lessons', authMiddleware, isTeacher, getLessons);
router.post('/lessons', authMiddleware, isTeacher, createLesson);
router.post('/lessons/:id/content', authMiddleware, isTeacher, saveLessonContent);
router.delete('/lessons/:id', authMiddleware, isTeacher, deleteLesson);

// === РАСПИСАНИЕ ===
router.post('/schedule', authMiddleware, isTeacher, createScheduleEvent);
router.get('/schedule', authMiddleware, isTeacher, getTeacherSchedule);
router.put('/schedule/:id', authMiddleware, isTeacher, updateScheduleEvent);   // ← новое
router.delete('/schedule/:id', authMiddleware, isTeacher, deleteScheduleEvent); // ← новое

module.exports = router;