import sql, { initDatabase } from './db.js';

export default async function handler(req, res) {
  await initDatabase();
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    switch (req.method) {
      case 'GET':
        const { route_id } = req.query;
        
        if (!route_id) {
          return res.status(400).json({ error: 'route_id обязателен' });
        }
        
        const stops = await sql`
          SELECT * FROM stops 
          WHERE route_id = ${route_id} 
          ORDER BY order_number ASC
        `;
        return res.status(200).json(stops);
        
      case 'POST':
        const { route_id: postRouteId, name, order_number, arrival_time, distance_km } = req.body;
        
        if (!postRouteId || !name || !order_number) {
          return res.status(400).json({ error: 'Обязательные поля: route_id, name, order_number' });
        }
        
        // Добавляем остановку
        const newStop = await sql`
          INSERT INTO stops (route_id, name, order_number, arrival_time, distance_km)
          VALUES (${postRouteId}, ${name}, ${order_number}, ${arrival_time || null}, ${distance_km || null})
          ON CONFLICT (route_id, order_number) 
          DO UPDATE SET name = ${name}, arrival_time = ${arrival_time || null}, distance_km = ${distance_km || null}
          RETURNING *
        `;
        return res.status(201).json(newStop[0]);
        
      case 'PUT':
        // Обновление порядка остановок
        const { stops: stopsData } = req.body;
        
        if (!stopsData || !Array.isArray(stopsData)) {
          return res.status(400).json({ error: 'Массив остановок обязателен' });
        }
        
        const updatePromises = stopsData.map((stop, index) => 
          sql`UPDATE stops SET order_number = ${index + 1} WHERE id = ${stop.id}`
        );
        
        await Promise.all(updatePromises);
        return res.status(200).json({ message: 'Порядок остановок обновлен' });
        
      case 'DELETE':
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: 'ID остановки обязателен' });
        }
        
        await sql`DELETE FROM stops WHERE id = ${id}`;
        return res.status(200).json({ message: 'Остановка удалена' });
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in stops API:', error);
    return res.status(500).json({ error: error.message });
  }
}
