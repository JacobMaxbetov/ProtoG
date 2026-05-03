import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],

  define: {
    'import.meta.env.VITE_FRONTEND_URL': JSON.stringify(process.env.VITE_FRONTEND_URL),
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
    'import.meta.env.VITE_PYTHON_SERVER_URL': JSON.stringify(process.env.VITE_PYTHON_SERVER_URL)
  },

  server: {
    allowedHosts: ['localhost', '.railway.app', '.cloudpub.ru', '.ngrok-free.app', '.trycloudflare.com', `.cloudpub.ru`],
    port: 3000,
    strictPort: true,

    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    },

    // Специальная обработка для lesson-viewer
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/lesson-viewer.html') || req.url.includes('lesson-viewer')) {
          const filePath = path.resolve(process.cwd(), 'lesson-viewer.html');
          console.log('Serving lesson-viewer.html from middleware');
          return res.sendFile(filePath);
          
        }
        next();
      });
    }
  },

  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'teacher-courses': path.resolve(__dirname, 'teacher-courses.html'),
        'teacher-lesson-editor': path.resolve(__dirname, 'teacher-lesson-editor.html'),
        'lesson-viewer': path.resolve(__dirname, 'lesson-viewer.html'),
        'teacher-students': path.resolve(__dirname, 'teacher-students.html'),
        'call': path.resolve(__dirname, 'call.html'),
      }
    }
  }
})