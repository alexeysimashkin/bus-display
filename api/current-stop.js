import sql, { initDatabase } from './db.js';

export default async function handler(req, res) {
  // Сначала пробуем создать таблицы
  try {
    await initDatabase();
  } catch (e) {
    console.error('Init error:', e);
  }
  
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
      
      // Проверяем, есть ли таблица current_stop_state
      let state;
      try {
        state = await sql`SELECT * FROM current_stop_state WHERE route_id = ${route_id}`;
      } catch (e) {
        return res.status(500).json({ 
          error: 'Таблица не найдена. Запустите инициализацию БД через /init' 
        });
      }
      
      // Если состояния нет — создаем
      if (state.length === 0) {
        await sql`
          INSERT INTO current_stop_state (route_id, current_stop_order, announced_next) 
          VALUES (${route_id}, 1, NULL)
        `;
        state = await sql`SELECT * FROM current_stop_state WHERE route_id = ${route_id}`;
      }
      
      const currentState = state[0];
      
      // Получаем остановки
      let currentStop = null;
      let nextStop = null;
      
      try {
        const result = await sql`SELECT * FROM stops WHERE route_id = ${route_id} AND order_number = ${currentState.current_stop_order}`;
        currentStop = result[0] || null;
      } catch (e) {
        console.error('Error getting current stop:', e);
      }
      
      try {
        const result = await sql`SELECT * FROM stops WHERE route_id = ${route_id} AND order_number = ${currentState.current_stop_order + 1}`;
        nextStop = result[0] || null;
      } catch (e) {
        console.error('Error getting next stop:', e);
      }
      
      let totalStops = 0;
      try {
        const result = await sql`SELECT COUNT(*) as count FROM stops WHERE route_id = ${route_id}`;
        totalStops = parseInt(result[0].count);
      } catch (e) {
        console.error('Error counting stops:', e);
      }
      
      return res.status(200).json({
        current_stop: currentStop,
        next_stop: nextStop,
        current_order: currentState.current_stop_order,
        total_stops: totalStops,
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
      
      console.log('POST:', { route_id, direction, force_order, announced_next });
      
      // Проверяем существование состояния
      let state;
      try {
        state = await sql`SELECT * FROM current_stop_state WHERE route_id = ${route_id}`;
      } catch (e) {
        return res.status(500).json({ 
          error: 'Таблица не найдена. Запустите инициализацию БД через /init' 
        });
      }
      
      if (state.length === 0) {
        await sql`
          INSERT INTO current_stop_state (route_id, current_stop_order, announced_next) 
          VALUES (${route_id}, 1, NULL)
        `;
        state = await sql`SELECT * FROM current_stop_state WHERE route_id = ${route_id}`;
      }
      
      const currentOrder = state[0].current_stop_order;
      
      // Количество остановок
      let totalStops = 0;
      try {
        const result = await sql`SELECT COUNT(*) as count FROM stops WHERE route_id = ${route_id}`;
        totalStops = parseInt(result[0].count);
      } catch (e) {
        console.error('Error counting stops:', e);
      }
      
      if (direction === 'announce') {
        // Объявляем следующую (НЕ сдвигаем текущую)
        const nextOrder = currentOrder + 1;
        
        if (nextOrder > totalStops) {
          return res.status(400).json({ error: 'Это конечная остановка' });
        }
        
        console.log('Setting announced_next to:', nextOrder);
        
        await sql`
          UPDATE current_stop_state 
          SET announced_next = ${nextOrder}, updated_at = CURRENT_TIMESTAMP
          WHERE route_id = ${route_id}
        `;
        
      } else if (direction === 'next' || force_order) {
        // Сдвигаем текущую вперед
        let newOrder;
        if (force_order) {
          newOrder = parseInt(force_order);
        } else {
          newOrder = currentOrder + 1;
        }
        
        if (newOrder > totalStops) newOrder = totalStops;
        if (newOrder < 1) newOrder = 1;
        
        console.log('Moving to stop:', newOrder);
        
        await sql`
          UPDATE current_stop_state 
          SET current_stop_order = ${newOrder}, 
              announced_next = NULL, 
              updated_at = CURRENT_TIMESTAMP
          WHERE route_id = ${route_id}
        `;
        
      } else if (direction === 'prev') {
        const newOrder = Math.max(1, currentOrder - 1);
        console.log('Moving back to:', newOrder);
        
        await sql`
          UPDATE current_stop_state 
          SET current_stop_order = ${newOrder}, 
              announced_next = NULL, 
              updated_at = CURRENT_TIMESTAMP
          WHERE route_id = ${route_id}
        `;
        
      } else if (direction === 'reset') {
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
      
      // Текущая остановка
      let currentStop = null;
      try {
        const result = await sql`SELECT * FROM stops WHERE route_id = ${route_id} AND order_number = ${finalState.current_stop_order}`;
        currentStop = result[0] || null;
      } catch (e) {}
      
      // Следующая остановка
      let nextStop = null;
      try {
        const result = await sql`SELECT * FROM stops WHERE route_id = ${route_id} AND order_number = ${finalState.current_stop_order + 1}`;
        nextStop = result[0] || null;
      } catch (e) {}
      
      console.log('Response:', { 
        current_order: finalState.current_stop_order, 
        announced_next: finalState.announced_next 
      });
      
      return res.status(200).json({
        current_stop: currentStop,
        next_stop: nextStop,
        current_order: finalState.current_stop_order,
        total_stops: totalStops,
        announced_next: finalState.announced_next,
        message: 'OK'
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('❌ API error:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
}
