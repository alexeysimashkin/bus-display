-- ============================================
-- ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ДЛЯ ТАБЛО АВТОБУСА
-- ============================================

-- Создание таблицы городов
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы маршрутов
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
    route_number VARCHAR(10) NOT NULL,
    name VARCHAR(200) NOT NULL,
    start_point VARCHAR(200) NOT NULL,
    end_point VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы остановок
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

-- Таблица для отслеживания текущей остановки
CREATE TABLE IF NOT EXISTS current_stop_state (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE UNIQUE,
    current_stop_order INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ДОБАВЛЕНИЕ ТЕСТОВЫХ ДАННЫХ
-- ============================================

-- Добавляем города (если их еще нет)
INSERT INTO cities (name) 
VALUES 
    ('Москва'),
    ('Санкт-Петербург'),
    ('Казань')
ON CONFLICT (name) DO NOTHING;

-- Получаем ID Москвы для использования в следующих запросах
DO $$
DECLARE
    moscow_id INTEGER;
    spb_id INTEGER;
    kazan_id INTEGER;
    route1_id INTEGER;
    route2_id INTEGER;
    route3_id INTEGER;
BEGIN
    -- Получаем ID городов
    SELECT id INTO moscow_id FROM cities WHERE name = 'Москва';
    SELECT id INTO spb_id FROM cities WHERE name = 'Санкт-Петербург';
    SELECT id INTO kazan_id FROM cities WHERE name = 'Казань';
    
    -- Добавляем маршруты для Москвы
    INSERT INTO routes (city_id, route_number, name, start_point, end_point) 
    VALUES 
        (moscow_id, '42', 'Центр - Вокзал', 'Красная площадь', 'Киевский вокзал'),
        (moscow_id, '15', 'Университет - Парк', 'МГУ', 'Парк Горького'),
        (moscow_id, '7', 'Кольцевой', 'Арбатская', 'Арбатская')
    ON CONFLICT DO NOTHING
    RETURNING id INTO route1_id;
    
    -- Получаем ID маршрутов
    SELECT id INTO route1_id FROM routes WHERE route_number = '42' AND city_id = moscow_id;
    SELECT id INTO route2_id FROM routes WHERE route_number = '15' AND city_id = moscow_id;
    SELECT id INTO route3_id FROM routes WHERE route_number = '7' AND city_id = moscow_id;
    
    -- Добавляем остановки для маршрута 42
    INSERT INTO stops (route_id, name, order_number, arrival_time, distance_km) VALUES
        (route1_id, 'Красная площадь', 1, '5 мин', 0),
        (route1_id, 'Охотный ряд', 2, '8 мин', 1.2),
        (route1_id, 'Библиотека им. Ленина', 3, '12 мин', 2.5),
        (route1_id, 'Арбатская', 4, '15 мин', 3.8),
        (route1_id, 'Смоленская', 5, '20 мин', 5.1),
        (route1_id, 'Киевская', 6, '25 мин', 6.5),
        (route1_id, 'Киевский вокзал', 7, '30 мин', 7.8)
    ON CONFLICT (route_id, order_number) DO NOTHING;
    
    -- Добавляем остановки для маршрута 15
    INSERT INTO stops (route_id, name, order_number, arrival_time, distance_km) VALUES
        (route2_id, 'МГУ', 1, '3 мин', 0),
        (route2_id, 'Университетский проспект', 2, '7 мин', 1.5),
        (route2_id, 'Ломоносовский проспект', 3, '10 мин', 3.0),
        (route2_id, 'Парк Горького', 4, '15 мин', 4.5)
    ON CONFLICT (route_id, order_number) DO NOTHING;
    
    -- Добавляем остановки для кольцевого маршрута 7
    INSERT INTO stops (route_id, name, order_number, arrival_time, distance_km) VALUES
        (route3_id, 'Арбатская', 1, '0 мин', 0),
        (route3_id, 'Краснопресненская', 2, '5 мин', 1.0),
        (route3_id, 'Киевская', 3, '10 мин', 2.0),
        (route3_id, 'Парк культуры', 4, '15 мин', 3.0),
        (route3_id, 'Октябрьская', 5, '20 мин', 4.0),
        (route3_id, 'Таганская', 6, '25 мин', 5.0),
        (route3_id, 'Курская', 7, '30 мин', 6.0),
        (route3_id, 'Арбатская', 8, '35 мин', 7.0)
    ON CONFLICT (route_id, order_number) DO NOTHING;
    
    -- Инициализируем состояние маршрутов
    INSERT INTO current_stop_state (route_id, current_stop_order) VALUES
        (route1_id, 1),
        (route2_id, 1),
        (route3_id, 1)
    ON CONFLICT (route_id) DO NOTHING;
    
    -- Маршруты для Санкт-Петербурга
    INSERT INTO routes (city_id, route_number, name, start_point, end_point) 
    VALUES 
        (spb_id, '22', 'Невский - Васильевский', 'Невский проспект', 'Васильевский остров')
    ON CONFLICT DO NOTHING
    RETURNING id INTO route1_id;
    
    SELECT id INTO route1_id FROM routes WHERE route_number = '22' AND city_id = spb_id;
    
    INSERT INTO stops (route_id, name, order_number, arrival_time, distance_km) VALUES
        (route1_id, 'Невский проспект', 1, '0 мин', 0),
        (route1_id, 'Гостиный двор', 2, '5 мин', 0.8),
        (route1_id, 'Адмиралтейская', 3, '10 мин', 1.5),
        (route1_id, 'Василеостровская', 4, '15 мин', 2.2),
        (route1_id, 'Васильевский остров', 5, '20 мин', 3.0)
    ON CONFLICT (route_id, order_number) DO NOTHING;
    
    INSERT INTO current_stop_state (route_id, current_stop_order) VALUES
        (route1_id, 1)
    ON CONFLICT (route_id) DO NOTHING;
    
    -- Маршруты для Казани
    INSERT INTO routes (city_id, route_number, name, start_point, end_point) 
    VALUES 
        (kazan_id, '5', 'Кремль - Аэропорт', 'Казанский Кремль', 'Аэропорт')
    ON CONFLICT DO NOTHING
    RETURNING id INTO route1_id;
    
    SELECT id INTO route1_id FROM routes WHERE route_number = '5' AND city_id = kazan_id;
    
    INSERT INTO stops (route_id, name, order_number, arrival_time, distance_km) VALUES
        (route1_id, 'Казанский Кремль', 1, '0 мин', 0),
        (route1_id, 'Площадь Свободы', 2, '8 мин', 2.0),
        (route1_id, 'Проспект Победы', 3, '15 мин', 5.0),
        (route1_id, 'Аэропорт', 4, '30 мин', 25.0)
    ON CONFLICT (route_id, order_number) DO NOTHING;
    
    INSERT INTO current_stop_state (route_id, current_stop_order) VALUES
        (route1_id, 1)
    ON CONFLICT (route_id) DO NOTHING;
    
END $$;

-- Проверка данных
SELECT 
    c.name as city,
    COUNT(DISTINCT r.id) as routes,
    COUNT(s.id) as stops
FROM cities c
LEFT JOIN routes r ON c.id = r.city_id
LEFT JOIN stops s ON r.id = s.route_id
GROUP BY c.name
ORDER BY c.name;
