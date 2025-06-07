export interface Env {
    DB: D1Database; // Для D1 базы данных
    JWT_SECRET: string; // Для JWT-авторизации
    ADMIN_SECRET: string; // Добавляем секрет для админа
  }