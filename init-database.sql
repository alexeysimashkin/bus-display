-- Создание таблиц
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
    route_number VARCHAR(10) NOT NULL,
    name VARCHAR(200) NOT NULL,
    start_point VARCHAR(200) NOT NULL,
    end_point VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stops (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    order_number INTEGER NOT NULL,
    arrival_time VARCHAR(50),
    distance_km DECIMAL(5,1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(route_id, order_number)
);

-- ВАЖНО: удаляем старую таблицу и создаем новую с полем announced_next
DROP TABLE IF EXISTS current_stop_state CASCADE;

CREATE TABLE current_stop_state (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE UNIQUE,
    current_stop_order INTEGER DEFAULT 1,
    announced_next INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Тестовые данные
INSERT INTO cities (name) VALUES 
    ('Москва'),
    ('Санкт-Петербург'),
    ('Казань')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
    moscow_id INTEGER;
    route1_id INTEGER;
BEGIN
    SELECT id INTO moscow_id FROM cities WHERE name = 'Москва';
    
    INSERT INTO routes (city_id, route_number, name, start_point, end_point) 
    VALUES (moscow_id, '42', 'Центр - Вокзал', 'Красная площадь', 'Киевский вокзал')
    ON CONFLICT DO NOTHING
    RETURNING id INTO route1_id;
    
    -- Если маршрут уже существовал, получаем его id
    IF route1_id IS NULL THEN
        SELECT id INTO route1_id FROM routes WHERE route_number = '42' AND city_id = moscow_id;
    END IF;
    
    -- Очищаем старые остановки
    DELETE FROM stops WHERE route_id = route1_id;
    
    -- Добавляем остановки
    INSERT INTO stops (route_id, name, order_number, arrival_time) VALUES
        (route1_id, 'Красная площадь', 1, '5 мин'),
        (route1_id, 'Охотный ряд', 2, '8 мин'),
        (route1_id, 'Библиотека им. Ленина', 3, '12 мин'),
        (route1_id, 'Арбатская', 4, '15 мин'),
        (route1_id, 'Смоленская', 5, '20 мин'),
        (route1_id, 'Киевская', 6, '25 мин'),
        (route1_id, 'Киевский вокзал', 7, '30 мин');
    
    -- Удаляем старое состояние и создаем новое
    DELETE FROM current_stop_state WHERE route_id = route1_id;
    INSERT INTO current_stop_state (route_id, current_stop_order, announced_next) 
    VALUES (route1_id, 1, NULL);
    
END $$;
