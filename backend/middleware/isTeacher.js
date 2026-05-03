const config = require('../config');

const isTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Не авторизован' });
  }

  const user = req.user;
  let username = '';

  // Улучшенная логика извлечения имени
  if (user.email) {
    username = user.email.split('@')[0].toLowerCase().trim();
  } else if (user.username) {
    username = user.username.toLowerCase().trim();
  } else if (user.name) {
    username = user.name.toLowerCase().trim();
  }

  const isTeacherUser = config.TEACHERS.includes(username) || 
                       config.ADMINS.includes(username);

  console.log('=== IS TEACHER CHECK ===');
  console.log('User:', { id: user.id, email: user.email, name: user.name });
  console.log('Extracted username:', username);
  console.log('TEACHERS:', config.TEACHERS);
  console.log('ADMINS:', config.ADMINS);
  console.log('Access result:', isTeacherUser ? 'GRANTED' : 'DENIED');

  if (!isTeacherUser) {
    return res.status(403).json({ 
      message: 'Доступ запрещён. Только для учителей.',
      your_username: username,
      allowed_teachers: config.TEACHERS,
      allowed_admins: config.ADMINS
    });
  }

  req.isTeacher = true;
  req.isAdmin = config.ADMINS.includes(username);
  
  next();
};

module.exports = isTeacher;