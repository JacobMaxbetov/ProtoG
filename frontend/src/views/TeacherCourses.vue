<template>
  <div class="teacher-courses">
    <div class="page-header">
      <button @click="goBack" class="btn-back">← Назад в панель</button>
      <h1>📚 Управление курсами</h1>
      <button @click="openCreateCourseForm" class="btn btn-primary">+ Новый курс</button>
    </div>

    <!-- Форма создания/редактирования курса -->
    <div v-if="showCourseForm" class="modal" style="display: flex;">
      <div class="modal-content">
        <h2>{{ editingCourseId ? 'Редактировать курс' : 'Создать новый курс' }}</h2>
        <form @submit.prevent="saveCourse">
          <input v-model="courseForm.title" placeholder="Название курса *" required>
          <textarea v-model="courseForm.description" placeholder="Описание курса"></textarea>
          
          <div class="form-group">
            <input v-model="courseForm.price" type="number" placeholder="Цена (₽) *" required>
            <input v-model="courseForm.duration" placeholder="Длительность (например: 4 недели)">
          </div>

          <div class="form-group">
            <input v-model="courseForm.level" placeholder="Уровень">
            <input v-model="courseForm.image" placeholder="URL изображения">
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeCourseForm" class="btn btn-secondary">Отмена</button>
            <button type="submit" class="btn btn-primary">
              {{ editingCourseId ? 'Сохранить' : 'Создать курс' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Список курсов -->
    <div class="courses-list">
      <div v-for="course in courses" :key="course.id" class="course-item">
        <div class="course-header" @click="toggleCourse(course.id)">
          <h3>{{ course.title }}</h3>
          <span class="price">{{ course.price }} ₽</span>
          <span class="arrow" :class="{ open: expandedCourses[course.id] }">▼</span>
        </div>

        <div v-if="expandedCourses[course.id]" class="course-content">
          <div class="section-header">
            <h4>Модули курса</h4>
            <button @click="addModule(course.id)" class="btn btn-small">+ Новый модуль</button>
          </div>

          <div v-for="module in getModulesForCourse(course.id)" :key="module.id" class="module-item">
            <div class="module-header">
              <h4>{{ module.title }}</h4>
              <button @click="addLesson(course.id, module.id)" class="btn btn-small">+ Новый урок</button>
            </div>

            <div class="lessons-list">
              <div v-for="lesson in getLessonsForModule(module.id)" :key="lesson.id" class="lesson-item">
                <div class="lesson-info">
                  <strong>{{ lesson.title }}</strong>
                  <span v-if="lesson.video_url" class="has-video">📹 Видео</span>
                </div>
                <div class="lesson-actions">
                  <button @click="openLessonEditor(lesson.id)" class="btn-small edit">✏️ Контент</button>
                  <button @click="deleteLesson(lesson.id)" class="btn-small delete">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SunEditor Modal -->
    <div v-if="showEditor" class="modal editor-modal" style="display: flex;">
      <div class="modal-content editor-content">
        <div class="editor-header">
          <h2>Редактирование: {{ currentLesson?.title }}</h2>
          <button @click="closeEditor" class="btn btn-secondary">✕ Закрыть</button>
        </div>
        
        <div id="suneditor-container" style="flex: 1; min-height: 0; border: 1px solid #374151;"></div>

        <div class="editor-footer">
          <button @click="saveLessonContent" class="btn btn-primary">💾 Сохранить контент</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      courses: [],
      modules: [],
      lessons: [],
      expandedCourses: {},

      showCourseForm: false,
      editingCourseId: null,
      courseForm: {
        title: '',
        description: '',
        price: '',
        duration: '',
        level: '',
        image: ''
      },

      showEditor: false,
      currentLesson: null,
      sunEditorInstance: null
    }
  },

  async mounted() {
    await this.loadAllData();
  },

  methods: {
    async loadAllData() {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const [cRes, mRes, lRes] = await Promise.all([
          fetch('/api/teacher/courses', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/teacher/modules', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/teacher/lessons', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (cRes.ok) this.courses = await cRes.json();
        if (mRes.ok) this.modules = await mRes.json();
        if (lRes.ok) this.lessons = await lRes.json();
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
      }
    },

    toggleCourse(courseId) {
      this.expandedCourses[courseId] = !this.expandedCourses[courseId];
      this.expandedCourses = { ...this.expandedCourses };
    },

    getModulesForCourse(courseId) {
      return this.modules
        .filter(m => m.course_id === courseId)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    },

    getLessonsForModule(moduleId) {
      return this.lessons
        .filter(l => l.module_id === moduleId)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    },

    // Курсы
    openCreateCourseForm() {
      this.editingCourseId = null;
      this.courseForm = { title: '', description: '', price: '', duration: '', level: '', image: '' };
      this.showCourseForm = true;
    },

    closeCourseForm() {
      this.showCourseForm = false;
    },

    async saveCourse() {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Вы не авторизованы');
        return;
      }

      if (!this.courseForm.title.trim()) {
        alert('Введите название курса');
        return;
      }

      if (!this.courseForm.price || this.courseForm.price < 0) {
        alert('Введите корректную цену');
        return;
      }

      const method = this.editingCourseId ? 'PUT' : 'POST';
      const url = this.editingCourseId 
        ? `/api/teacher/courses/${this.editingCourseId}` 
        : '/api/teacher/courses';

      try {
        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(this.courseForm)
        });

        const data = await res.json();

        if (res.ok) {
          alert(this.editingCourseId ? '✅ Курс обновлён!' : '✅ Курс создан!');
          this.closeCourseForm();
          await this.loadAllData();
        } else {
          alert(`❌ Ошибка: ${data.message || 'Не удалось сохранить курс'}`);
          console.error('Server error:', data);
        }
      } catch (e) {
        console.error('Fetch error:', e);
        alert(`❌ Ошибка сохранения курса: ${e.message}`);
      }
    },

    // Модули
    async addModule(courseId) {
      const title = prompt('Название нового модуля:');
      if (!title?.trim()) return;

      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/teacher/modules', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ course_id: courseId, title: title.trim() })
        });

        const data = await res.json();

        if (res.ok) {
          alert('✅ Модуль создан!');
          await this.loadAllData();
        } else {
          alert(`❌ Ошибка: ${data.message || 'Не удалось создать модуль'}`);
        }
      } catch (e) {
        console.error('Fetch error:', e);
        alert(`❌ Ошибка создания модуля: ${e.message}`);
      }
    },

    // Уроки
    async addLesson(courseId, moduleId) {
      const title = prompt('Название нового урока:');
      if (!title?.trim()) return;

      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/teacher/lessons', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ 
            course_id: courseId, 
            module_id: moduleId, 
            title: title.trim() 
          })
        });

        const data = await res.json();

        if (res.ok) {
          alert('✅ Урок создан!');
          await this.loadAllData();
        } else {
          alert(`❌ Ошибка: ${data.message || 'Не удалось создать урок'}`);
        }
      } catch (e) {
        console.error('Fetch error:', e);
        alert(`❌ Ошибка создания урока: ${e.message}`);
      }
    },

    openLessonEditor(lessonId) {
      window.open(`/teacher-lesson-editor.html?id=${lessonId}`, '_blank');
    },

    // Заглушка для совместимости
    editLessonContent(lesson) {
      this.openLessonEditor(lesson.id);
    },

    async deleteLesson(id) {
      if (!confirm('Удалить этот урок навсегда?')) return;

      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`/api/teacher/lessons/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          alert('Урок удалён');
          this.loadAllData();
        }
      } catch (e) {
        alert('Ошибка удаления');
      }
    },

    goBack() {
      window.location.href = '/teacher/';
    }
  }
}
</script>

<style scoped>
/* Стили оставляем те же */
.teacher-courses { padding: 2rem; color: white; max-width: 1200px; margin: 0 auto; }
.course-item { margin-bottom: 1.5rem; background: #1f2937; border-radius: 12px; overflow: hidden; }
.course-header { padding: 1.25rem 1.75rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: #111827; }
.course-header:hover { background: #1f2937; }
.price { color: #22c55e; font-weight: 600; }
.arrow { transition: 0.3s; }
.arrow.open { transform: rotate(180deg); }

.section-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; background: #111827; }
.module-item { padding: 1rem 1.5rem; border-top: 1px solid #374151; }
.lesson-item { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 1rem; 
  background: #111827; 
  border-radius: 8px; 
  margin: 0.5rem 0;
}

.editor-modal .modal-content {
  width: 95%;
  max-width: 1200px;
  height: 90vh;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
  background: #1f2937;
  border-radius: 12px;
  overflow: hidden;
}
.editor-modal .editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;           /* важно для flex */
}
#suneditor-container {
  flex: 1;
  min-height: 0;
  border: 1px solid #4b5563;
  background: white !important;
}
.sun-editor {
  background: white !important;
  color: #111827 !important;
}

.sun-editor-editable {
  background: white !important;
  color: #111827 !important;
  min-height: 400px !important;
}
/* SunEditor fixes */
.sun-editor, .sun-editor-editable {
  background: white !important;
}
.editor-header { padding: 1rem 1.5rem; border-bottom: 1px solid #374151; display: flex; justify-content: space-between; align-items: center; }
.editor-footer { padding: 1rem 1.5rem; text-align: right; border-top: 1px solid #374151; }

.btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; }
.btn-primary { background: #22c55e; color: #111827; font-weight: bold; }
.btn-secondary { background: #6b7280; color: white; }
.btn-small { padding: 6px 12px; font-size: 0.9rem; }
.edit { background: #eab308; color: black; }
.delete { background: #ef4444; color: white; }
</style>