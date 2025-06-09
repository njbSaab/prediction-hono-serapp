import { Hono } from 'hono';
import type { Env } from '../utils/config';
import type { Variables } from '../types';
import { statisticsMiddleware } from '../middleware/statisics'; // путь к твоему middleware

const userStatistics = new Hono<{ Bindings: Env; Variables: Variables }>();
// ✅ Подключаем middleware только к этому роутеру
userStatistics.use(statisticsMiddleware);

// Эндпоинт для получения статистики по userResault
userStatistics.get('/', async (c) => {
  console.log('Entering /statistics endpoint'); // Отладка
  try {
    const DB = c.env.DB;
    console.log('DB connection established'); // Отладка

    // Подсчитываем общее количество пользователей с userResault !== null
    const totalUsersResult = await DB.prepare(`
      SELECT COUNT(*) as total
      FROM users
      WHERE userResault IS NOT NULL
    `).first<{ total: number }>();

    const totalUsers = totalUsersResult?.total || 0;
    console.log(`Total users with userResault: ${totalUsers}`); // Отладка

    if (totalUsers === 0) {
      console.log('Returning empty statistics'); // Отладка
      return c.json({
        totalUsers: 0,
        percentages: {
          option1: 0,
          option2: 0,
          option3: 0,
        },
      }, 200);
    }

    // Подсчитываем количество пользователей для каждого варианта userResault
    const statsResult = await DB.prepare(`
      SELECT userResault, COUNT(*) as count
      FROM users
      WHERE userResault IS NOT NULL
      GROUP BY userResault
    `).all<{ userResault: number; count: number }>(); // Изменено: userResault теперь number
    console.log('Stats result:', JSON.stringify(statsResult.results)); // Отладка

    // Инициализируем проценты
    const percentages = {
      option1: 0,
      option2: 0,
      option3: 0,
    };

    // Рассчитываем проценты для каждого варианта
    statsResult.results.forEach((row) => {
      const percentage = (row.count / totalUsers) * 100;
      // Приводим userResault к числу для надёжности и сравниваем с числами
      const resultValue = Number(row.userResault);
      if (resultValue === 1) {
        percentages.option1 = parseFloat(percentage.toFixed(1));
      } else if (resultValue === 2) {
        percentages.option2 = parseFloat(percentage.toFixed(1));
      } else if (resultValue === 3) {
        percentages.option3 = parseFloat(percentage.toFixed(1));
      }
    });

    console.log('Returning statistics:', { totalUsers, percentages }); // Отладка
    return c.json({
      totalUsers,
      percentages,
    }, 200);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in GET /statistics:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

export default userStatistics;