import { createServer } from 'vite'
import path from 'path'

console.log('Запуск Lesson Viewer сервера...')

const server = await createServer({
  configFile: false,
  root: process.cwd(),           // frontend
  server: {
    port: 3001,
    strictPort: true,
  },
  plugins: [],
  // Отключаем всё лишнее
  optimizeDeps: {
    disabled: true
  },
  build: {
    rollupOptions: {
      input: {
        lesson: path.resolve(process.cwd(), 'lesson-viewer.html')
      }
    }
  }
})

await server.listen()

console.log('✅ Lesson Viewer успешно запущен на http://localhost:3001')