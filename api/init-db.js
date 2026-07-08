import sql from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Используйте POST запрос' });
  }

  const authToken = req.headers.authorization;
  const expectedToken = process.env.ADMIN_TOKEN || 'bus-display-init-2026';

  if (authToken !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Неавторизованный доступ. Используйте токен.' });
  }

  try {
    // Удаляем старую таблицу
    await sql`DROP TABLE IF EXISTS current_stop_state CASCADE`;
    console.log('✅ Old table dropped');

    // Создаем таблицы заново
    await sql`
      CREATE TABLE IF NOT EXISTS cities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS routes (
        id SERIAL PRIMARY KEY,
        city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
        route_number VARCHAR(10) NOT NULL,
        name VARCHAR(200) NOT NULL,
        start_point VARCHAR(200) NOT NULL,
        end_point VARCHAR(200) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS stops (
        id SERIAL PRIMARY KEY,
        route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        order_number INTEGER NOT NULL,
        arrival_time VARCHAR(50),
        distance_km DECIMAL(5,1),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(route_id, order_number)
      )
    `;

    // Создаем новую таблицу с полем announced_next
    await sql`
      CREATE TABLE current_stop_state (
        id SERIAL PRIMARY KEY,
        route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE UNIQUE,
        current_stop_order INTEGER DEFAULT 1,
        announced_next INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ New table created');

    // Добавляем города
    await sql`
      INSERT INTO cities (name) VALUES 
        ('Москва'),
        ('Санкт-Петербург'),
        ('Казань')
      ON CONFLICT (name) DO NOTHING
    `;

    // Получаем ID Москвы
    const cities = await sql`SELECT id FROM cities WHERE name = 'Москва'`;
    const moscowId = cities[0].id;

    // Добавляем маршрут
    await sql`
      INSERT INTO routes (city_id, route_number, name, start_point, end_point) 
      VALUES (${moscowId}, '42', 'Центр - Вокзал', 'Красная площадь', 'Киевский вокзал')
      ON CONFLICT DO NOTHING
    `;

    // Получаем ID маршрута
    const routes = await sql`SELECT id FROM routes WHERE route_number = '42' AND city_id = ${moscowId}`;
    const routeId = routes[0].id;

    // Удаляем старые остановки
    await sql`DELETE FROM stops WHERE route_id = ${routeId}`;

    // Добавляем остановки
    const stops = [
      { name: 'Красная площадь', order: 1, time: '5 мин' },
      { name: 'Охотный ряд', order: 2, time: '8 мин' },
      { name: 'Библиотека им. Ленина', order: 3, time: '12 мин' },
      { name: 'Арбатская', order: 4, time: '15 мин' },
      { name: 'Смоленская', order: 5, time: '20 мин' },
      { name: 'Киевская', order: 6, time: '25 мин' },
      { name: 'Киевский вокзал', order: 7, time: '30 мин' }
    ];

    for (const stop of stops) {
      await sql`
        INSERT INTO stops (route_id, name, order_number, arrival_time) 
        VALUES (${routeId}, ${stop.name}, ${stop.order}, ${stop.time})
        ON CONFLICT (route_id, order_number) DO UPDATE 
        SET name = ${stop.name}, arrival_time = ${stop.time}
      `;
    }

    // Инициализируем состояние
    await sql`
      INSERT INTO current_stop_state (route_id, current_stop_order, announced_next) 
      VALUES (${routeId}, 1, NULL)
      ON CONFLICT (route_id) DO UPDATE 
      SET current_stop_order = 1, announced_next = NULL
    `;

    // Проверяем что всё создалось
    const citiesCount = await sql`SELECT COUNT(*) as count FROM cities`;
    const routesCount = await sql`SELECT COUNT(*) as count FROM routes`;
    const stopsCount = await sql`SELECT COUNT(*) as count FROM stops`;
    const stateCount = await sql`SELECT COUNT(*) as count FROM current_stop_state`;

    return res.status(200).json({
      success: true,
      message: 'База данных успешно пересоздана',
      stats: {
        cities: parseInt(citiesCount[0].count),
        routes: parseInt(routesCount[0].count),
        stops: parseInt(stopsCount[0].count),
        states: parseInt(stateCount[0].count)
      }
    });

  } catch (error) {
    console.error('❌ Init error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
