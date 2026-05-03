<template>
  <div class="lesson-viewer-page">
    <!-- Header -->
    <header class="lesson-header">
      <div class="container">
        <button @click="goBack" class="btn-back">
          ← Назад к курсам
        </button>
        <div class="lesson-info">
          <h1>{{ lesson?.title || 'Загрузка урока...' }}</h1>
          <p v-if="course">Курс: {{ course.title }}</p>
        </div>
      </div>
    </header>

    <!-- Основной контент урока -->
    <main class="lesson-content">
      <div class="container content-wrapper">
        <div v-if="loading" class="loading">Загрузка материала урока...</div>
        
        <div v-else-if="error" class="error">
          <p>{{ error }}</p>
        </div>

        <div v-else id="lesson-body" class="lesson-body" v-html="lessonHtml"></div>
      </div>
    </main>

    <!-- Нижняя панель управления -->
    <footer class="lesson-footer">
      <div class="container footer-content">
        <button @click="prevLesson" :disabled="!hasPrev" class="nav-btn">
          <i class="fas fa-chevron-left"></i>
          Предыдущий
        </button>

        <button @click="markAsCompleted" class="done-btn">
          <i class="fas fa-check-circle"></i>
          {{ isCompleted ? '✓ Пройден' : 'Отметить как пройденный' }}
        </button>

        <button @click="nextLesson" :disabled="!hasNext" class="nav-btn">
          Следующий
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const lessonId = new URLSearchParams(window.location.search).get('id')
const lesson = ref(null)
const course = ref(null)
const lessonHtml = ref('')
const loading = ref(true)
const error = ref(null)
const completedLessons = ref([])

const hasPrev = computed(() => false) // TODO: логика
const hasNext = computed(() => false) // TODO: логика
const isCompleted = computed(() => completedLessons.value.includes(Number(lessonId)))

onMounted(async () => {
  if (!lessonId) {
    error.value = 'ID урока не указан'
    loading.value = false
    return
  }

  await loadLesson()
})

async function loadLesson() {
  try {
    // Загружаем мета-информацию об уроке
    const res = await axios.get(`/api/lessons/${lessonId}`)
    lesson.value = res.data.lesson
    course.value = res.data.course

    // Загружаем HTML-контент урока
    const contentRes = await fetch(`/content/lessons/${lessonId}.html`)
    if (contentRes.ok) {
      lessonHtml.value = await contentRes.text()
    } else {
      lessonHtml.value = `<h2>${lesson.value?.title}</h2><p>Материал урока ещё не добавлен учителем.</p>`
    }
  } catch (err) {
    console.error(err)
    error.value = 'Не удалось загрузить урок'
  } finally {
    loading.value = false
  }
}

function goBack() {
  window.location.href = '/'
}

async function markAsCompleted() {
  if (!lessonId) return
  try {
    await axios.post('/api/student/lessons/complete', { lessonId })
    alert('✅ Урок отмечен как пройденный!')
    // Можно обновить UI
  } catch (e) {
    alert('Ошибка сохранения прогресса')
  }
}

function prevLesson() {
  alert('Предыдущий урок — будет реализовано')
}

function nextLesson() {
  alert('Следующий урок — будет реализовано')
}
</script>

<style scoped>
.lesson-viewer-page {
  min-height: 100vh;
  background: #0f172a;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
}

.lesson-header {
  background: #1e2937;
  padding: 1rem 0;
  border-bottom: 1px solid #334155;
}

.lesson-info h1 {
  margin: 0.5rem 0 0.25rem;
  font-size: 1.8rem;
}

.lesson-content {
  flex: 1;
  padding: 2rem 0;
}

.content-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  background: #1e2937;
  border-radius: 12px;
  min-height: 70vh;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.lesson-body {
  font-size: 1.1rem;
  line-height: 1.7;
}

.lesson-footer {
  background: #1e2937;
  border-top: 1px solid #334155;
  padding: 1.2rem 0;
  position: sticky;
  bottom: 0;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1100px;
  margin: 0 auto;
}

.nav-btn {
  padding: 12px 24px;
  background: #334155;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.05rem;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background: #475569;
}

.done-btn {
  padding: 12px 32px;
  background: #22c55e;
  color: #111827;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
}

.done-btn:hover {
  background: #16a34a;
}

.loading, .error {
  text-align: center;
  padding: 4rem;
  font-size: 1.3rem;
}
</style>