<template>
  <div class="teacher-dashboard">
    <div class="header">
      <h1>👨‍🏫 Панель учителя</h1>
      <div class="user-info">
        Привет, <strong>{{ username }}</strong>
        <button @click="logout" class="btn-logout">Выйти</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Проверка доступа...</div>
    
    <div v-else class="dashboard-grid">
      <div class="card" @click="goToCourses">
        <span class="card-icon">📚</span>
        <h2>Управление курсами</h2>
        <p>Создавать, редактировать и удалять курсы</p>
      </div>

      <div class="card" @click="goToStudents">
        <span class="card-icon">👥</span>
        <h2>Список студентов</h2>
        <p>Просмотр всех учеников и их прогресса</p>
      </div>

      <!-- НОВАЯ КАРТОЧКА -->
      <div class="card" @click="goToSchedule">
        <span class="card-icon">📅</span>
        <h2>Расписание занятий</h2>
        <p>Создавать стримы, вебинары и доп. занятия</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      username: localStorage.getItem('name') || 'Пользователь',
      loading: true
    }
  },

  async mounted() {
    await this.checkTeacherAccess();
  },

  methods: {
    async checkTeacherAccess() {
      const token = localStorage.getItem('token');
      if (!token) {
        this.redirectToCabinet();
        return;
      }

      try {
        const res = await fetch('/api/teacher', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.status === 403) {
          console.log('403 - Доступ запрещён для этого пользователя');
          alert('Доступ к панели учителя запрещён. У вас нет прав учителя.');
          this.redirectToCabinet();
          return;
        }

        if (res.status === 401) {
          alert('Сессия истекла. Пожалуйста, войдите заново.');
          localStorage.clear();
          window.location.href = '/';
          return;
        }

        if (!res.ok) {
          throw new Error('Server error');
        }

        const data = await res.json();
        console.log('Teacher access granted:', data);
        
        if (data.user && data.user.name) {
          this.username = data.user.name;
        }

        this.loading = false;

      } catch (err) {
        console.error('Ошибка проверки учителя:', err);
        this.redirectToCabinet();
      }
    },

    redirectToCabinet() {
      // Измените путь, если у вас кабинет называется по-другому
      window.location.href = '/';        // или '/cabinet.html'
    },

    goToCourses() {
        window.location.href = '/teacher-courses.html';
    },

    goToStudents() {
      window.location.href = '/teacher-students.html';
    },
    // Новый метод
    goToSchedule() {
      window.location.href = '/teacher-schedule.html';   // ← измени, если нужно
    },

    logout() {
      if (confirm('Выйти из аккаунта?')) {
        localStorage.clear();
        window.location.href = '/';
      }
    }
  }
}
</script>

<style scoped>
.teacher-dashboard {
  padding: 2rem;
  max-width: 1100px;
  margin: 0 auto;
  color: white;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 2rem;
}

.card {
  background: #1f2937;
  padding: 2.5rem;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.card:hover {
  background: #374151;
  transform: translateY(-8px);
}

.card-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.loading {
  text-align: center;
  padding: 3rem;
  font-size: 1.2rem;
}

.btn-logout {
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
}
</style>