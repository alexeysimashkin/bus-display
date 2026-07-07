import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default sql;

export async function initDatabase() {
  try {
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
    
    await sql`
      CREATE TABLE IF NOT EXISTS current_stop_state (
        id SERIAL PRIMARY KEY,
        route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE UNIQUE,
        current_stop_order INTEGER DEFAULT 1,
        announced_next INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}
