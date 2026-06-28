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
        const cities = await sql`
          SELECT c.*, 
            (SELECT COUNT(*) FROM routes WHERE city_id = c.id) as routes_count
          FROM cities c 
          ORDER BY c.name ASC
        `;
        return res.status(200).json(cities);
        
      case 'POST':
        const { name } = req.body;
        
        if (!name || !name.trim()) {
          return res.status(400).json({ error: 'Название города обязательно' });
        }
        
        // Проверяем, существует ли уже такой город
        const existing = await sql`SELECT id FROM cities WHERE name = ${name.trim()}`;
        if (existing.length > 0) {
          return res.status(400).json({ error: 'Такой город уже существует' });
        }
        
        const newCity = await sql`
          INSERT INTO cities (name) VALUES (${name.trim()})
          RETURNING *
        `;
        return res.status(201).json(newCity[0]);
        
      case 'DELETE':
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: 'ID города обязателен' });
        }
        
        await sql`DELETE FROM cities WHERE id = ${id}`;
        return res.status(200).json({ message: 'Город удален' });
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in cities API:', error);
    return res.status(500).json({ error: error.message });
  }
}
