import { Hono } from 'hono';
import type { Env } from '../utils/config';
import type { Variables } from '../types';
import { statisticsMiddleware } from '../middleware/statistics';

const userStatistics = new Hono<{ Bindings: Env; Variables: Variables }>();
userStatistics.use(statisticsMiddleware);

userStatistics.get('/', async (c) => {
  console.log('Entering /statistics endpoint');
  try {
    const DB = c.env.DB;
    let eventsSiteName = c.req.query('eventsSiteName');
    console.log('DB connection established');

    let query = `
      SELECT COUNT(*) as total
      FROM user_events ue
      JOIN events e ON ue.event_id = e.id
      WHERE ue.userResault IS NOT NULL
    `;
    let bindings: string[] = [];

    if (eventsSiteName) {
      eventsSiteName = eventsSiteName.replace(/^\/+|\/+$/g, '');
      query += ' AND e.eventsSiteName = ?';
      bindings.push(eventsSiteName);
    }

    const totalUsersResult = await DB.prepare(query).bind(...bindings).first<{ total: number }>();
    const totalUsers = totalUsersResult?.total || 0;
    console.log(`Total users with userResault: ${totalUsers}`);

    if (totalUsers === 0) {
      console.log('Returning empty statistics');
      return c.json({
        totalUsers: 0,
        percentages: { option1: 0, option2: 0, option3: 0 },
      }, 200);
    }

    query = `
      SELECT ue.userResault, COUNT(*) as count
      FROM user_events ue
      JOIN events e ON ue.event_id = e.id
      WHERE ue.userResault IS NOT NULL
    `;
    if (eventsSiteName) {
      query += ' AND e.eventsSiteName = ?';
      bindings = [eventsSiteName];
    }
    query += ' GROUP BY ue.userResault';

    const statsResult = await DB.prepare(query).bind(...bindings).all<{ userResault: number; count: number }>();
    console.log('Stats result:', JSON.stringify(statsResult.results));

    const percentages = { option1: 0, option2: 0, option3: 0 };
    statsResult.results.forEach((row) => {
      const percentage = (row.count / totalUsers) * 100;
      const resultValue = Number(row.userResault);
      if (resultValue === 1) percentages.option1 = parseFloat(percentage.toFixed(1));
      else if (resultValue === 2) percentages.option2 = parseFloat(percentage.toFixed(1));
      else if (resultValue === 3) percentages.option3 = parseFloat(percentage.toFixed(1));
    });

    console.log('Returning statistics:', { totalUsers, percentages });
    return c.json({ totalUsers, percentages }, 200);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error in GET /statistics:', error);
    return c.json({ error: 'Database error', details: error.message }, 500);
  }
});

export default userStatistics;