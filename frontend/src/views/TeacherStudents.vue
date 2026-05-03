<template>
  <div class="teacher-students">
    <div class="page-header">
      <button @click="goBack" class="btn-back">← Назад в панель</button>
      <h1>👥 Список студентов</h1>
      <div class="total">Всего студентов: <strong>{{ filteredStudents.length }}</strong></div>
    </div>

    <!-- Поиск -->
    <div class="search-box">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Поиск по имени или email..."
        class="search-input"
      >
    </div>

    <table class="students-table">
      <thead>
        <tr>
          <th>Имя</th>
          <th>Email</th>
          <th>Баланс</th>
          <th>Куплено курсов</th>
          <th>Общий прогресс</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="student in filteredStudents" :key="student.id">
          <td><strong>{{ student.name || '—' }}</strong></td>
          <td>{{ student.email }}</td>
          <td>
            <span class="balance">{{ formatBalance(student.balance) }}</span>
          </td>
          <td><strong>{{ student.courses_count || 0 }}</strong></td>
          <td>
            <div class="progress-container">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: Math.min(student.total_progress || 0, 100) + '%' }"
                >
                  {{ Math.round(student.total_progress || 0) }}%
                </div>
              </div>
            </div>
          </td>
          <td>
            <button @click="viewDetails(student)" class="btn-detail">Подробнее</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="filteredStudents.length === 0" class="no-data">
      Ничего не найдено по запросу "{{ searchQuery }}"
    </p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      students: [],
      searchQuery: ''
    }
  },

  computed: {
    filteredStudents() {
      if (!this.searchQuery) return this.students;

      const q = this.searchQuery.toLowerCase();
      return this.students.filter(student => 
        (student.name && student.name.toLowerCase().includes(q)) ||
        (student.email && student.email.toLowerCase().includes(q))
      );
    }
  },

  mounted() {
    this.loadStudents();
  },

  methods: {
    async loadStudents() {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/teacher/students', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          this.students = await res.json();
        }
      } catch (err) {
        console.error('Ошибка загрузки студентов:', err);
      }
    },

    formatBalance(balance) {
      if (!balance) return '0 ₽';
      return balance.toLocaleString('ru-RU') + ' ₽ копеек';
    },

    viewDetails(student) {
      const info = `
Имя: ${student.name || '—'}
Email: ${student.email}
Баланс (в копейках): ${this.formatBalance(student.balance)}
Куплено курсов: ${student.courses_count || 0}
Общий прогресс: ${Math.round(student.total_progress || 0)}%
      `.trim();
      alert(info);
    },

    goBack() {
      window.location.href = '/teacher/';
    }
  }
}
</script>

<style scoped>
.teacher-students {
  padding: 2rem;
  color: white;
  max-width: 1300px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.search-box {
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  max-width: 500px;
  padding: 12px 16px;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 8px;
  color: white;
  font-size: 1.05rem;
}

.students-table {
  width: 100%;
  border-collapse: collapse;
  background: #1f2937;
  border-radius: 12px;
  overflow: hidden;
}

.students-table th,
.students-table td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #374151;
}

.students-table th {
  background: #111827;
  font-weight: 600;
}

.balance {
  color: #22c55e;
  font-weight: 600;
}

.progress-container {
  width: 180px;
}

.progress-bar {
  height: 24px;
  background: #374151;
  border-radius: 9999px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #86efac);
  color: #111827;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 24px;
}

.btn-detail {
  padding: 8px 14px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
}

.btn-back {
  padding: 10px 18px;
  background: #374151;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.no-data {
  text-align: center;
  padding: 4rem 2rem;
  color: #9ca3af;
  font-size: 1.1rem;
}
</style>