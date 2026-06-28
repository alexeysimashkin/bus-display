import sql, { initDatabase } from './db.js';

export default async function handler(req, res) {
  await initDatabase();
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    switch (req.method) {
      case 'GET':
        // Получаем текущую остановку для маршрута
        const { route_id } = req.query;
        
        if (!route_id) {
          return res.status(400).json({ error: 'route_id обязателен' });
        }
        
        const [state] = await sql`
          SELECT * FROM current_stop_state WHERE route_id = ${route_id}
        `;
        
        if (!state) {
          return res.status(404).json({ error: 'Состояние не найдено' });
        }
        
        // Получаем информацию о текущей остановке
        const [currentStop] = await sql`
          SELECT * FROM stops 
          WHERE route_id = ${route_id} AND order_number = ${state.current_stop_order}
        `;
        
        // Получаем следующую остановку
        const [nextStop] = await sql`
          SELECT * FROM stops 
          WHERE route_id = ${route_id} AND order_number = ${state.current_stop_order + 1}
        `;
        
        // Получаем количество остановок
        const [{ count }] = await sql`
          SELECT COUNT(*) as count FROM stops WHERE route_id = ${route_id}
        `;
        
        return res.status(200).json({
          current_stop: currentStop || null,
          next_stop: nextStop || null,
          current_order: state.current_stop_order,
          total_stops: parseInt(count),
          updated_at: state.updated_at
        });
        
      case 'POST':
        // Переключение на следующую остановку
        const { route_id: postRouteId, direction } = req.body;
        
        if (!postRouteId) {
          return res.status(400).json({ error: 'route_id обязателен' });
        }
        
        // Получаем текущее состояние
        const [currentState] = await sql`
          SELECT * FROM current_stop_state WHERE route_id = ${postRouteId}
        `;
        
        if (!currentState) {
          return res.status(404).json({ error: 'Маршрут не найден' });
        }
        
        // Получаем общее количество остановок
        const [{ count: totalCount }] = await sql`
          SELECT COUNT(*) as count FROM stops WHERE route_id = ${postRouteId}
        `;
        
        let newOrder = currentState.current_stop_order;
        
        if (direction === 'next' || !direction) {
          // Переход к следующей остановке
          if (newOrder < totalCount) {
            newOrder++;
          }
        } else if (direction === 'prev') {
          // Переход к предыдущей остановке
          if (newOrder > 1) {
            newOrder--;
          }
        } else if (direction === 'reset') {
          // Сброс на начальную остановку
          newOrder = 1;
        }
        
        // Обновляем состояние
        await sql`
          UPDATE current_stop_state 
          SET current_stop_order = ${newOrder}, updated_at = CURRENT_TIMESTAMP
          WHERE route_id = ${postRouteId}
        `;
        
        // Получаем обновленную информацию
        const [updatedStop] = await sql`
          SELECT * FROM stops 
          WHERE route_id = ${postRouteId} AND order_number = ${newOrder}
        `;
        
        const [updatedNextStop] = await sql`
          SELECT * FROM stops 
          WHERE route_id = ${postRouteId} AND order_number = ${newOrder + 1}
        `;
        
        return res.status(200).json({
          current_stop: updatedStop,
          next_stop: updatedNextStop || null,
          current_order: newOrder,
          total_stops: parseInt(totalCount),
          is_last: newOrder >= totalCount,
          message: newOrder >= totalCount ? 'Конечная остановка' : 'Переключено успешно'
        });
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in current-stop API:', error);
    return res.status(500).json({ error: error.message });
  }
}
