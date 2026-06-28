import sql, { initDatabase } from './db.js';

export default async function handler(req, res) {
  await initDatabase();
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    switch (req.method) {
      case 'GET':
        const { city_id } = req.query;
        let routes;
        
        if (city_id) {
          routes = await sql`
            SELECT r.*, c.name as city_name,
              (SELECT COUNT(*) FROM stops WHERE route_id = r.id) as stops_count
            FROM routes r 
            LEFT JOIN cities c ON r.city_id = c.id 
            WHERE r.city_id = ${city_id}
            ORDER BY r.route_number ASC
          `;
        } else {
          routes = await sql`
            SELECT r.*, c.name as city_name,
              (SELECT COUNT(*) FROM stops WHERE route_id = r.id) as stops_count
            FROM routes r 
            LEFT JOIN cities c ON r.city_id = c.id 
            ORDER BY c.name, r.route_number ASC
          `;
        }
        return res.status(200).json(routes);
        
      case 'POST':
        const { city_id: newCityId, route_number, name, start_point, end_point } = req.body;
        
        if (!newCityId || !route_number || !name || !start_point || !end_point) {
          return res.status(400).json({ error: 'Все поля обязательны' });
        }
        
        const newRoute = await sql`
          INSERT INTO routes (city_id, route_number, name, start_point, end_point)
          VALUES (${newCityId}, ${route_number}, ${name}, ${start_point}, ${end_point})
          RETURNING *
        `;
        
        // Инициализируем состояние остановки для нового маршрута
        await sql`
          INSERT INTO current_stop_state (route_id, current_stop_order)
          VALUES (${newRoute[0].id}, 1)
          ON CONFLICT (route_id) DO NOTHING
        `;
        
        return res.status(201).json(newRoute[0]);
        
      case 'DELETE':
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: 'ID маршрута обязателен' });
        }
        
        await sql`DELETE FROM routes WHERE id = ${id}`;
        return res.status(200).json({ message: 'Маршрут удален' });
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in routes API:', error);
    return res.status(500).json({ error: error.message });
  }
}
