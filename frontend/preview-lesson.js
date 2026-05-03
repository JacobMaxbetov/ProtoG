import { createServer } from 'vite'
import path from 'path'

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  server: {
    port: 3001,
    strictPort: true,
  },
  plugins: [],
  build: {
    rollupOptions: {
      input: {
        lesson: path.resolve(process.cwd(), 'lesson-viewer/index.html')
      }
    }
  }
})

await server.listen()