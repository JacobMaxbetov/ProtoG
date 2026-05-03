import axios from 'axios';

const API_URL = '/api';
let currentUser = null;
let token = localStorage.getItem('token');

if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// ====================== ЭЛЕМЕНТЫ ======================
const mainPage = document.getElementById('main-page');
const dashboardPage = document.getElementById('dashboard-page');
const navHome = document.getElementById('nav-home');
const navDashboard = document.getElementById('nav-dashboard');
const loginBtn = document.getElementById('login-btn');
const modal = document.getElementById('auth-modal');
const closeModalBtn = document.getElementById('close-modal');

// ====================== ПЕРЕКЛЮЧЕНИЕ СТРАНИЦ ======================
function showPage(page) {
  mainPage.classList.add('hidden');
  dashboardPage.classList.add('hidden');
  if (page === 'dashboard') {
    dashboardPage.classList.remove('hidden');
    loadMyCourses();
  } else {
    mainPage.classList.remove('hidden');
  }
}

// ====================== ЗАГРУЗКА ВСЕХ КУРСОВ ======================
async function loadCourses() {
  const grid = document.getElementById('courses-grid');
  grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#94a3b8;">Загрузка курсов...</p>';

  try {
    const res = await axios.get(`${API_URL}/courses`);
    const courses = res.data;
    grid.innerHTML = '';

    courses.forEach(course => {
      const card = document.createElement('div');
      card.className = 'course-card';
      card.innerHTML = `
        <img src="${course.image || 'https://via.placeholder.com/400x200/1e2937/22c55e?text=ProtoG'}" alt="${course.title}">
        <div class="course-info">
          <h3>${course.title}</h3>
          <p>${course.description || 'Практический курс'}</p>
          <div class="price">${course.price.toLocaleString('ru-RU')} ₽</div>
          <button class="btn-buy" data-id="${course.id}">Купить курс</button>
        </div>
      `;
      grid.appendChild(card);
    });

    document.querySelectorAll('.btn-buy').forEach(btn => {
      btn.addEventListener('click', () => purchaseCourse(btn.dataset.id));
    });

  } catch (err) {
    grid.innerHTML = `<p style="color:#ef4444; grid-column:1/-1;text-align:center;">Не удалось загрузить курсы</p>`;
  }
}

// ====================== ПОКУПКА КУРСА ======================
async function purchaseCourse(courseId) {
  if (!currentUser) {
    alert("Войдите в аккаунт, чтобы купить курс");
    showAuthModal();
    return;
  }

  if (!confirm("Подтверждаете покупку курса?")) return;

  try {
    const res = await axios.post(`${API_URL}/courses/purchase`, { courseId });
    
    alert(res.data.message || "Курс успешно куплен!");
    
    // Обновляем баланс и мои курсы
    await loadBalance();
    await loadMyCourses();

  } catch (err) {
    const msg = err.response?.data?.message || "Ошибка при покупке курса";
    alert(msg);
  }
}

// ====================== ЗАГРУЗКА МОИХ КУРСОВ + СТАТИСТИКА ======================
async function loadMyCourses() {
  const grid = document.getElementById('my-courses-grid');
  grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#94a3b8;">Загрузка...</p>';

  try {
    const res = await axios.get(`${API_URL}/courses/my`);
    const courses = res.data || [];

    let totalCompleted = 0;

    grid.innerHTML = '';

    if (courses.length === 0) {
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#94a3b8;">У вас пока нет купленных курсов</p>`;
      document.getElementById('stat-lessons').textContent = '0';
      document.getElementById('stat-progress').textContent = '0%';
      return;
    }

    courses.forEach(course => {
      totalCompleted += course.completed_lessons || 0;

      const card = document.createElement('div');
      card.className = 'course-card';
      card.innerHTML = `
        <img src="${course.image || 'https://via.placeholder.com/400x200'}" alt="${course.title}">
        <div class="course-info">
          <h3>${course.title}</h3>
          <p>${course.description || ''}</p>
          <div class="progress-bar">
            <div class="progress" style="width: ${course.progress || 0}%"></div>
          </div>
          <div class="progress-text">${course.progress_text || '0 из 0 уроков (0%)'}</div>
          <button class="btn-open-course" data-id="${course.id}">Продолжить обучение</button>
        </div>
      `;
      grid.appendChild(card);
    });

    // Глобальная статистика
    document.getElementById('stat-courses').textContent = courses.length;
    document.getElementById('stat-lessons').textContent = totalCompleted;

    const avgProgress = courses.length > 0 
      ? Math.round(courses.reduce((sum, c) => sum + (c.progress || 0), 0) / courses.length) 
      : 0;
    document.getElementById('stat-progress').textContent = `${avgProgress}%`;

    // Кнопки
    document.querySelectorAll('.btn-open-course').forEach(btn => {
      btn.addEventListener('click', () => openLesson(btn.dataset.id));
    });

  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p style="color:#ef4444;text-align:center;">Ошибка загрузки</p>`;
  }
}

// ====================== ПРОСМОТР УРОКА ======================
let currentLessonId = null;
let currentCourseId = null;

async function openLesson(courseId) {
  try {
    const res = await axios.get(`/api/courses/${courseId}/lessons`);
    
    const lessons = res.data || [];

    if (lessons.length === 0) {
      alert("В этом курсе пока нет уроков.");
      return;
    }

    // Можно улучшить позже — открывать последний непройденный урок
    const firstLesson = lessons[0];
    
    window.location.href = `${window.CONFIG.pythonServerUrl}/lesson/${firstLesson.id}?token=${encodeURIComponent(token)}`;
    
  } catch (err) {
    console.error('Ошибка открытия урока:', err);
    
    if (err.response?.status === 403) {
      alert("У вас нет доступа к материалам этого курса.");
    } else {
      alert("Не удалось загрузить уроки. Попробуйте позже.");
    }
  }
}

async function loadLessonContent(lessonId) {
  const container = document.getElementById('lesson-body');
  container.innerHTML = '<p>Загрузка материала...</p>';

  try {
    const res = await fetch(`${window.CONFIG.PYTHON_SERVER_URL}/content/lessons/${lessonId}.html`);
    if (res.ok) {
      const html = await res.text();
      container.innerHTML = html;
    } else {
      container.innerHTML = `
        <h2>Урок ${lessonId}</h2>
        <p style="color:#94a3b8;">Учитель ещё не добавил материал для этого урока.</p>
      `;
    }
  } catch (e) {
    container.innerHTML = '<p>Ошибка загрузки контента урока.</p>';
  }
}

// ====================== АВТОРИЗАЦИЯ ======================
async function login(email, password) {
  try {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { token: newToken, user } = res.data;

    localStorage.setItem('token', newToken);
    token = newToken;
    currentUser = user;
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    hideAuthModal();
    updateAuthUI();
    showPage('dashboard');
    loadBalance();
  } catch (err) {
    alert(err.response?.data?.message || 'Ошибка входа');
  }
}

async function register(name, email, password) {
  try {
    const res = await axios.post(`${API_URL}/auth/register`, { name, email, password });
    const { token: newToken, user } = res.data;

    localStorage.setItem('token', newToken);
    token = newToken;
    currentUser = user;
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    hideAuthModal();
    updateAuthUI();
    showPage('dashboard');
    loadBalance();
  } catch (err) {
    alert(err.response?.data?.message || 'Ошибка регистрации');
  }
}

function logout() {
  localStorage.removeItem('token');
  token = null;
  currentUser = null;
  delete axios.defaults.headers.common['Authorization'];
  updateAuthUI();
  showPage('main');
}

function updateAuthUI() {
  if (currentUser) {
    loginBtn.classList.add('hidden');
    navDashboard.classList.remove('hidden');
    document.getElementById('welcome-text').textContent = `Привет, ${currentUser.name || currentUser.email?.split('@')[0]}!`;
  } else {
    loginBtn.classList.remove('hidden');
    navDashboard.classList.add('hidden');
  }
}

// ====================== ВОССТАНОВЛЕНИЕ СЕССИИ ======================

async function loadCurrentUser() {
  const savedToken = localStorage.getItem('token');
  if (!savedToken) return false;

  try {
    axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    const res = await axios.get(`/api/users/me`);

    currentUser = res.data;
    token = savedToken;

    console.log('✅ Сессия восстановлена:', currentUser.name || currentUser.email);
    updateAuthUI();
    return true;
  } catch (err) {
    console.error('Не удалось восстановить сессию:', err.response?.status);
    if (err.response?.status === 401 || err.response?.status === 500) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    }
    return false;
  }
}

// ====================== ПОПОЛНЕНИЕ БАЛАНСА ======================

function checkPaymentReturn() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get('payment') === 'success') {
    const paymentId = localStorage.getItem('lastPaymentId');
    console.log('✅ Возврат после оплаты. PaymentId из localStorage =', paymentId);

    window.history.replaceState({}, document.title, '/dashboard');
    localStorage.removeItem('lastPaymentId'); // очищаем после использования

    setTimeout(async () => {
      await loadCurrentUser();

      if (paymentId) {
        try {
          console.log('🔍 Проверяем статус платежа на бэкенде...');
          const res = await axios.get(`/api/payments/status/${paymentId}`);
          console.log('Ответ от /status:', res.data);
        } catch (e) {
          console.error('Не удалось проверить статус платежа:', e.message);
        }
      } else {
        console.log('PaymentId не найден в localStorage');
      }

      // Обновляем баланс несколько раз
      await loadBalance();
      await new Promise(r => setTimeout(r, 800));
      await loadBalance();
      await new Promise(r => setTimeout(r, 800));
      await loadBalance();
    }, 1200);
  }
}

async function loadBalance() {
  if (!currentUser) return;

  try {
    const res = await axios.get(`/api/users/me`);
    const balanceInKopecks = res.data.balance || 0;
    const balanceRub = balanceInKopecks / 100;   // один раз делим
    
    const balanceEl = document.getElementById('user-balance');
    if (balanceEl) {
      balanceEl.textContent = `${balanceRub.toLocaleString('ru-RU')} ₽`;
    }

    console.log(`💰 Баланс обновлён: ${balanceRub} ₽`);
  } catch (err) {
    console.error('Ошибка загрузки баланса:', err);
  }
}

function showDepositModal() {
  const modal = document.getElementById('deposit-modal');
  if (modal) modal.style.display = 'flex';
}

function hideDepositModal() {
  const modal = document.getElementById('deposit-modal');
  if (modal) modal.style.display = 'none';
}

async function createDeposit() {
  const amountInput = document.getElementById('deposit-amount');
  let amount = parseFloat(amountInput.value);

  if (!amount || amount < 10) {
    alert('Минимальная сумма — 10 ₽');
    return;
  }

  try {
    const res = await axios.post(`/api/payments/deposit`, { amount });
    
    if (res.data.confirmationUrl) {
      // Сохраняем paymentId для проверки после возврата
      if (res.data.paymentId) {
        localStorage.setItem('lastPaymentId', res.data.paymentId);
        console.log('Сохранён paymentId для проверки:', res.data.paymentId);
      }
      window.location.href = res.data.confirmationUrl;
    }
  } catch (err) {
    console.error(err);
    alert(err.response?.data?.message || 'Ошибка создания платежа');
  }
}

function setupQuickAmounts() {
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('deposit-amount').value = btn.dataset.amount;
      document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// ====================== ИНИЦИАЛИЗАЦИЯ ======================
document.addEventListener('DOMContentLoaded', async () => {
  // Восстанавливаем сессию при загрузке страницы
  console.log('Инициализация страницы...');
  const isLoggedIn = await loadCurrentUser();

  // Навигация
  navHome.addEventListener('click', (e) => { e.preventDefault(); showPage('main'); });
  navDashboard.addEventListener('click', (e) => { e.preventDefault(); showPage('dashboard'); });
  loginBtn.addEventListener('click', showAuthModal);

  // Модальное окно авторизации
  closeModalBtn.addEventListener('click', hideAuthModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) hideAuthModal(); });

  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  document.querySelectorAll('.link').forEach(link => link.addEventListener('click', () => switchTab(link.dataset.tab)));

  // Формы
  document.getElementById('login-submit').addEventListener('click', () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (email && password) login(email, password);
    else alert('Заполните все поля');
  });

  document.getElementById('register-submit').addEventListener('click', () => {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    if (name && email && password) register(name, email, password);
    else alert('Заполните все поля');
  });

  document.getElementById('logout-btn').addEventListener('click', logout);

  // Кнопка "Смотреть курсы"
  document.getElementById('browse-courses').addEventListener('click', () => {
    document.getElementById('courses-section').scrollIntoView({ behavior: 'smooth' });
  });

  // Пополнение баланса
  checkPaymentReturn();

  const depositBtn = document.getElementById('deposit-btn');
  if (depositBtn) depositBtn.addEventListener('click', showDepositModal);

  const closeDepositBtn = document.getElementById('close-deposit-modal');
  if (closeDepositBtn) closeDepositBtn.addEventListener('click', hideDepositModal);

  const depositModalEl = document.getElementById('deposit-modal');
  if (depositModalEl) {
    depositModalEl.addEventListener('click', e => {
      if (e.target === depositModalEl) hideDepositModal();
    });
  }

  const createDepositBtn = document.getElementById('create-deposit-btn');
  if (createDepositBtn) createDepositBtn.addEventListener('click', createDeposit);

  setupQuickAmounts();

  // Инициализация
  updateAuthUI();
  loadCourses();

  if (isLoggedIn) {
    showPage('dashboard');
    loadMyCourses();
    loadBalance();
    loadSchedule();
  }
});

// ====================== Вспомогательные функции ======================
function switchTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
}

function hideAuthModal() {
  modal.style.display = 'none';
}

function showAuthModal() {
  modal.style.display = 'flex';
  switchTab('login');
}

// ====================== РАСПИСАНИЕ ======================
// ====================== РАСПИСАНИЕ ======================
async function loadSchedule() {
    const container = document.getElementById('schedule-container');
    container.innerHTML = '<p>Загрузка расписания...</p>';

    try {
        const res = await axios.get('/api/schedule');
        const events = res.data || [];

        if (events.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-alt"></i>
                    <p><strong>Пока нет запланированных занятий</strong><br>
                    Здесь будут отображаться стримы и дополнительные уроки</p>
                </div>`;
            return;
        }

        let html = '<div class="schedule-list">';

        events.forEach(event => {
            const startTime = new Date(event.start_time);
            
            // Форматирование даты и времени
            const dateStr = startTime.toLocaleDateString('ru-RU', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });
            
            const timeStr = startTime.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const isPast = startTime < new Date();

            html += `
                <div class="schedule-item ${isPast ? 'past-event' : ''}">
                    <div class="schedule-date">
                        <span class="weekday">${dateStr.split(',')[0]}</span>
                        <span class="day">${startTime.getDate()}</span>
                        <span class="month">${dateStr.split(' ')[1] || ''}</span>
                    </div>
                    
                    <div class="schedule-time">
                        <i class="fas fa-clock"></i>
                        ${timeStr}
                    </div>
                    
                    <div class="schedule-info">
                        <div class="schedule-title">${event.title}</div>
                        <div class="schedule-teacher">
                            ${event.teacher_name || 'Преподаватель'}
                        </div>
                        ${event.course_title ? 
                            `<div class="schedule-course">${event.course_title}</div>` : ''}
                        ${event.event_type ? 
                            `<span class="event-type">${event.event_type === 'webinar' ? 'Вебинар' : 'Урок'}</span>` : ''}
                    </div>
                    
                    <div class="schedule-action">
                        ${isPast ? 
                            `<span class="status past">Завершено</span>` :
                            ``
                        }
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="color:#f87171;">Не удалось загрузить расписание</p>`;
    }
}

// Глобальная функция для вызова из HTML
window.joinEvent = async function(eventId) {
    try {
        const res = await axios.get(`/api/schedule/event/${eventId}`);
        const event = res.data;
        
        alert(`Открываем видеозвонок: "${event.title}"\n\nПреподаватель: ${event.teacher_name}`);
        
        // Пока заглушка — позже здесь будет открытие комнаты
        window.open(`/call/${eventId}`, '_blank');
        
    } catch (e) {
        alert('Не удалось открыть занятие');
    }
};