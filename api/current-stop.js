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
            INSERT INTO current_stop_state (route_id, current_stop_order) 
            VALUES (${route_id}, 1)
          `;
          return res.status(200).json({
            current_order: 1,
            total_stops: 0
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
          updated_at: state.updated_at
        });
        
      case 'POST':
        const { route_id: postRouteId, direction, force_order } = req.body;
        
        if (!postRouteId) {
          return res.status(400).json({ error: 'route_id обязателен' });
        }
        
        const [currentState] = await sql`
          SELECT * FROM current_stop_state WHERE route_id = ${postRouteId}
        `;
        
        if (!currentState) {
          await sql`
            INSERT INTO current_stop_state (route_id, current_stop_order) 
            VALUES (${postRouteId}, 1)
          `;
        }
        
        const [{ count: totalCount }] = await sql`
          SELECT COUNT(*) as count FROM stops WHERE route_id = ${postRouteId}
        `;
        
        let newOrder;
        
        if (force_order) {
          newOrder = Math.max(1, Math.min(force_order, parseInt(totalCount)));
        } else if (direction === 'next' || !direction) {
          newOrder = Math.min((currentState?.current_stop_order || 1) + 1, parseInt(totalCount));
        } else if (direction === 'prev') {
          newOrder = Math.max((currentState?.current_stop_order || 1) - 1, 1);
        } else if (direction === 'reset') {
          newOrder = 1;
        } else {
          newOrder = currentState?.current_stop_order || 1;
        }
        
        await sql`
          UPDATE current_stop_state 
          SET current_stop_order = ${newOrder}, updated_at = CURRENT_TIMESTAMP
          WHERE route_id = ${postRouteId}
        `;
        
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
          is_last: newOrder >= parseInt(totalCount),
          message: newOrder >= parseInt(totalCount) ? 'Конечная остановка' : 'Переключено успешно'
        });
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in current-stop API:', error);
    return res.status(500).json({ error: error.message });
  }
}
