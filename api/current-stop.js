import sql, { initDatabase } from './db.js';

export default async function handler(req, res) {
  await initDatabase();
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // GET — получить состояние
    if (req.method === 'GET') {
      const { route_id } = req.query;
      
      if (!route_id) {
        return res.status(400).json({ error: 'route_id обязателен' });
      }
      
      // Проверяем существование состояния
      let state = await sql`SELECT * FROM current_stop_state WHERE route_id = ${route_id}`;
      
      if (state.length === 0) {
        // Создаем начальное состояние
        await sql`INSERT INTO current_stop_state (route_id, current_stop_order, announced_next) VALUES (${route_id}, 1, NULL)`;
        state = await sql`SELECT * FROM current_stop_state WHERE route_id = ${route_id}`;
      }
      
      const currentState = state[0];
      
      // Получаем текущую остановку
      const currentStopResult = await sql`
        SELECT * FROM stops 
        WHERE route_id = ${route_id} AND order_number = ${currentState.current_stop_order}
      `;
      
      // Получаем следующую остановку
      const nextStopResult = await sql`
        SELECT * FROM stops 
        WHERE route_id = ${route_id} AND order_number = ${currentState.current_stop_order + 1}
      `;
      
      // Общее количество остановок
      const countResult = await sql`SELECT COUNT(*) as count FROM stops WHERE route_id = ${route_id}`;
      
      return res.status(200).json({
        current_stop: currentStopResult[0] || null,
        next_stop: nextStopResult[0] || null,
        current_order: currentState.current_stop_order,
        total_stops: parseInt(countResult[0].count),
        announced_next: currentState.announced_next,
        updated_at: currentState.updated_at
      });
    }
    
    // POST — обновить состояние
    if (req.method === 'POST') {
      const { route_id, direction, force_order, announced_next } = req.body;
      
      if (!route_id) {
        return res.status(400).json({ error: 'route_id обязателен' });
      }
      
      console.log('POST received:', { route_id, direction, force_order, announced_next });
      
      // Проверяем существование состояния
      let state = await sql`SELECT * FROM current_stop_state WHERE route_id = ${route_id}`;
      
      if (state.length === 0) {
        await sql`INSERT INTO current_stop_state (route_id, current_stop_order, announced_next) VALUES (${route_id}, 1, NULL)`;
        state = await sql`SELECT * FROM current_stop_state WHERE route_id = ${route_id}`;
      }
      
      const currentOrder = state[0].current_stop_order;
      
      // Получаем общее количество остановок
      const countResult = await sql`SELECT COUNT(*) as count FROM stops WHERE route_id = ${route_id}`;
      const totalStops = parseInt(countResult[0].count);
      
      if (direction === 'announce') {
        // ТОЛЬКО объявляем следующую остановку, НЕ сдвигаем текущую
        const nextOrder = currentOrder + 1;
        if (nextOrder > totalStops) {
          return res.status(400).json({ error: 'Это конечная остановка' });
        }
        
        console.log('Announcing next stop:', nextOrder);
        
        await sql`
          UPDATE current_stop_state 
          SET announced_next = ${nextOrder}, 
              updated_at = CURRENT_TIMESTAMP
          WHERE route_id = ${route_id}
        `;
        
      } else if (direction === 'next' || force_order) {
        // Сдвигаем текущую остановку ВПЕРЕД и сбрасываем announced_next
        let newOrder;
        if (force_order) {
          newOrder = parseInt(force_order);
        } else {
          newOrder = currentOrder + 1;
        }
        
        // Не выходим за пределы
        if (newOrder > totalStops) {
          newOrder = totalStops;
        }
        if (newOrder < 1) {
          newOrder = 1;
        }
        
        console.log('Moving to stop:', newOrder);
        
        await sql`
          UPDATE current_stop_state 
          SET current_stop_order = ${newOrder}, 
              announced_next = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE route_id = ${route_id}
        `;
        
      } else if (direction === 'prev') {
        // Сдвигаем НАЗАД
        const newOrder = Math.max(1, currentOrder - 1);
        
        console.log('Moving back to stop:', newOrder);
        
        await sql`
          UPDATE current_stop_state 
          SET current_stop_order = ${newOrder}, 
              announced_next = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE route_id = ${route_id}
        `;
        
      } else if (direction === 'reset') {
        // Сброс на начало
        console.log('Resetting to stop 1');
        
        await sql`
          UPDATE current_stop_state 
          SET current_stop_order = 1, 
              announced_next = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE route_id = ${route_id}
        `;
      }
      
      // Получаем обновленное состояние
      const updatedState = await sql`SELECT * FROM current_stop_state WHERE route_id = ${route_id}`;
      const finalState = updatedState[0];
      
      // Получаем текущую остановку
      const currentStopResult = await sql`
        SELECT * FROM stops 
        WHERE route_id = ${route_id} AND order_number = ${finalState.current_stop_order}
      `;
      
      // Получаем следующую остановку
      const nextStopResult = await sql`
        SELECT * FROM stops 
        WHERE route_id = ${route_id} AND order_number = ${finalState.current_stop_order + 1}
      `;
      
      console.log('Response:', {
        current_order: finalState.current_stop_order,
        announced_next: finalState.announced_next
      });
      
      return res.status(200).json({
        current_stop: currentStopResult[0] || null,
        next_stop: nextStopResult[0] || null,
        current_order: finalState.current_stop_order,
        total_stops: totalStops,
        announced_next: finalState.announced_next,
        message: 'OK'
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('❌ Error in current-stop API:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}
