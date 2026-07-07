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
        const { route_id } = req.query;
        
        if (!route_id) {
          return res.status(400).json({ error: 'route_id обязателен' });
        }
        
        const [state] = await sql`
          SELECT * FROM current_stop_state WHERE route_id = ${route_id}
        `;
        
        if (!state) {
          await sql`
            INSERT INTO current_stop_state (route_id, current_stop_order, announced_next) 
            VALUES (${route_id}, 1, NULL)
          `;
          return res.status(200).json({
            current_order: 1,
            total_stops: 0,
            announced_next: null
          });
        }
        
        const [currentStop] = await sql`
          SELECT * FROM stops 
          WHERE route_id = ${route_id} AND order_number = ${state.current_stop_order}
        `;
        
        const [nextStop] = await sql`
          SELECT * FROM stops 
          WHERE route_id = ${route_id} AND order_number = ${state.current_stop_order + 1}
        `;
        
        const [{ count }] = await sql`
          SELECT COUNT(*) as count FROM stops WHERE route_id = ${route_id}
        `;
        
        return res.status(200).json({
          current_stop: currentStop || null,
          next_stop: nextStop || null,
          current_order: state.current_stop_order,
          total_stops: parseInt(count),
          announced_next: state.announced_next,
          updated_at: state.updated_at
        });
        
      case 'POST':
        const { route_id: postRouteId, direction, force_order, announced_next } = req.body;
        
        if (!postRouteId) {
          return res.status(400).json({ error: 'route_id обязателен' });
        }
        
        const [currentState] = await sql`
          SELECT * FROM current_stop_state WHERE route_id = ${postRouteId}
        `;
        
        if (!currentState) {
          await sql`
            INSERT INTO current_stop_state (route_id, current_stop_order, announced_next) 
            VALUES (${postRouteId}, 1, NULL)
          `;
        }
        
        const [{ count: totalCount }] = await sql`
          SELECT COUNT(*) as count FROM stops WHERE route_id = ${postRouteId}
        `;
        
        if (direction === 'announce') {
          // Только объявляем следующую, не сдвигаем текущую
          await sql`
            UPDATE current_stop_state 
            SET announced_next = ${announced_next || null}, 
                updated_at = CURRENT_TIMESTAMP
            WHERE route_id = ${postRouteId}
          `;
        } else if (direction === 'next' || force_order) {
          // Сдвигаем текущую остановку и сбрасываем announced_next
          let newOrder;
          if (force_order) {
            newOrder = Math.max(1, Math.min(force_order, parseInt(totalCount)));
          } else {
            newOrder = Math.min((currentState?.current_stop_order || 1) + 1, parseInt(totalCount));
          }
          
          await sql`
            UPDATE current_stop_state 
            SET current_stop_order = ${newOrder}, 
                announced_next = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE route_id = ${postRouteId}
          `;
        } else if (direction === 'prev') {
          const newOrder = Math.max((currentState?.current_stop_order || 1) - 1, 1);
          await sql`
            UPDATE current_stop_state 
            SET current_stop_order = ${newOrder}, 
                announced_next = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE route_id = ${postRouteId}
          `;
        } else if (direction === 'reset') {
          await sql`
            UPDATE current_stop_state 
            SET current_stop_order = 1, 
                announced_next = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE route_id = ${postRouteId}
          `;
        }
        
        // Возвращаем обновлённое состояние
        const [updatedState] = await sql`
          SELECT * FROM current_stop_state WHERE route_id = ${postRouteId}
        `;
        
        const [updatedStop] = await sql`
          SELECT * FROM stops 
          WHERE route_id = ${postRouteId} AND order_number = ${updatedState.current_stop_order}
        `;
        
        const [updatedNextStop] = await sql`
          SELECT * FROM stops 
          WHERE route_id = ${postRouteId} AND order_number = ${updatedState.current_stop_order + 1}
        `;
        
        return res.status(200).json({
          current_stop: updatedStop || null,
          next_stop: updatedNextStop || null,
          current_order: updatedState.current_stop_order,
          total_stops: parseInt(totalCount),
          announced_next: updatedState.announced_next,
          message: 'OK'
        });
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in current-stop API:', error);
    return res.status(500).json({ error: error.message });
  }
}
