<template>
  <div class="teacher-schedule">
    <div class="page-header">
      <h1>📅 Расписание занятий</h1>
      <button @click="showModal = true" class="btn-primary">
        <i class="fas fa-plus"></i> Новое занятие
      </button>
    </div>

    <div v-if="events.length === 0" class="empty-state">
      <p>Пока нет запланированных занятий</p>
    </div>

    <div class="events-grid">
      <div v-for="event in events" :key="event.id" class="event-card">
        <div class="datetime">
          <div class="date">{{ formatDate(event.start_time) }}</div>
          <div class="time">{{ formatTime(event.start_time) }}</div>
        </div>
        <div class="event-details">
          <h3>{{ event.title }}</h3>
          <p v-if="event.course_title" class="course">Курс: {{ event.course_title }}</p>
          <span class="type-badge" :class="event.event_type">
            {{ getTypeLabel(event.event_type) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Модальное окно -->
    <div v-if="showModal" class="modal" @click.self="showModal = false">
      <div class="modal-content" @click.stop>
        <h2>Создать новое занятие</h2>
        
        <form @submit.prevent="createEvent">
          <input v-model="form.title" placeholder="Название занятия" required />
          
          <select v-model="form.event_type">
            <option value="stream">Стрим</option>
            <option value="webinar">Вебинар</option>
            <option value="lesson">Дополнительный урок</option>
          </select>

          <input v-model="form.start_time" type="datetime-local" required />

          <div class="modal-actions">
            <button type="button" @click="showModal = false">Отмена</button>
            <button type="submit">Создать</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const events = ref([])
const showModal = ref(false)
const form = ref({
  title: '',
  event_type: 'stream',
  start_time: ''
})

onMounted(() => {
  loadSchedule()
})

const loadSchedule = async () => {
  try {
    const res = await axios.get('/api/teacher/schedule', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    events.value = res.data
  } catch (err) {
    console.error('Ошибка загрузки расписания', err)
  }
}

const createEvent = async () => {
  try {
    await axios.post('/api/teacher/schedule', form.value, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    showModal.value = false
    form.value.title = ''
    await loadSchedule()
    alert('Занятие успешно создано!')
  } catch (err) {
    alert(err.response?.data?.message || 'Ошибка создания')
  }
}

const formatDate = (dt) => new Date(dt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
const formatTime = (dt) => new Date(dt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
const getTypeLabel = (type) => {
  const labels = { stream: 'Стрим', webinar: 'Вебинар', lesson: 'Урок' }
  return labels[type] || type
}
</script>

<style scoped>
/* Добавь свои стили здесь */
.teacher-schedule { padding: 2rem; }
.event-card {
  background: #1e2937;
  padding: 1.5rem;
  border-radius: 12px;
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}
</style>