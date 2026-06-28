import sql, { initDatabase } from './db.js';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Только для инициализации (защита от случайного вызова)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Используйте POST запрос' });
  }
  
  // Простая защита (в продакшене используйте нормальную аутентификацию)
  const authToken = req.headers.authorization;
  const expectedToken = process.env.ADMIN_TOKEN || 'bus-display-init-2026';
  
  if (authToken !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Неавторизованный доступ. Используйте токен.' });
  }
  
  try {
    // Инициализируем таблицы
    await initDatabase();
    
    // Читаем и выполняем SQL файл
    const sqlFilePath = path.join(process.cwd(), 'init-database.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
    
    // Выполняем SQL (разбиваем на отдельные запросы)
    const queries = sqlContent
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));
    
    for (const query of queries) {
      try {
        await sql.unsafe(query + ';');
      } catch (error) {
        console.error('Error executing query:', query.substring(0, 100));
        console.error(error);
        // Продолжаем выполнение даже если какая-то часть упала
      }
    }
    
    // Проверяем результат
    const cities = await sql`SELECT COUNT(*) as count FROM cities`;
    const routes = await sql`SELECT COUNT(*) as count FROM routes`;
    const stops = await sql`SELECT COUNT(*) as count FROM stops`;
    
    return res.status(200).json({
      success: true,
      message: 'База данных успешно инициализирована',
      stats: {
        cities: parseInt(cities[0].count),
        routes: parseInt(routes[0].count),
        stops: parseInt(stops[0].count)
      }
    });
    
  } catch (error) {
    console.error('Initialization error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
