import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { HTTPException } from 'hono/http-exception'

// Создание app
const app = new Hono()

// Middleware
app.use('*', logger()) // логгирование
app.use('*', cors())   // CORS
app.use('*', secureHeaders()) // безопасные заголовки

// Тестовый маршрут
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// Ошибки
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }  
  return c.json({ error: 'Internal Server Error' }, 500)
})

export default app