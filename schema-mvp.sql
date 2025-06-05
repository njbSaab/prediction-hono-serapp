-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  uuid VARCHAR(36) PRIMARY KEY, -- Уникальный UUID
  email TEXT NOT NULL UNIQUE, -- Уникальный email
  name VARCHAR(191) NOT NULL, -- Имя пользователя
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  emailVerified BOOLEAN DEFAULT FALSE, -- Подтверждён ли email
  verificationCodeHash TEXT, -- Хэшированный код верификации
  verificationCodeExpiresAt DATETIME, -- Время истечения кода
  userPayload TEXT, -- JSON с метаданными (browser, os, и т.д.)
  userResaultCollect TEXT, -- JSON с результатами (по умолчанию null)
  isCorrectAnswer BOOLEAN DEFAULT NULL, -- Правильность прогноза
  userResault INTEGER DEFAULT NULL, -- Прогноз (1 = win1, 2 = win2, 3 = draw)
  isHistory TEXT -- JSON с историей действий
);

-- Таблица событий
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- Уникальный ID события
  name TEXT NOT NULL, -- Название события (например, "Матч Барселона - Реал")
  result INTEGER DEFAULT NULL, -- Результат события (1 = win1, 2 = win2, 3 = draw)
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);