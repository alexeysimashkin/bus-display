// Глобальные переменные
let currentRouteId = null;
let updateInterval = null;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initDateTime();
    loadRoutesForSelector();
    
    // Обновление времени каждую секунду
    setInterval(updateDateTime, 1000);
    
    // Имитация погоды
    initWeather();
});

// Функции даты и времени
function initDateTime() {
    updateDateTime();
}

function updateDateTime() {
    const now = new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('ru-RU', options);
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('ru-RU');
}

// Погода (имитация)
const weatherConditions = [
    { icon: '☀️', temp: '28°C' },
    { icon: '⛅', temp: '24°C' },
    { icon: '☁️', temp: '20°C' },
    { icon: '🌧️', temp: '18°C' },
    { icon: '❄️', temp: '-5°C' }
];

function initWeather() {
    const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    document.getElementById('weatherIcon').textContent = randomWeather.icon;
    document.getElementById('temperature').textContent = randomWeather.temp;
    
    setInterval(() => {
        const newWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
        document.getElementById('weatherIcon').textContent = newWeather.icon;
        document.getElementById('temperature').textContent = newWeather.temp;
    }, 30000);
}

// Загрузка маршрутов в селектор
async function loadRoutesForSelector() {
    try {
        const response = await fetch('/api/routes');
        const routes = await response.json();
        
        const select = document.getElementById('displayRouteSelect');
        select.innerHTML = '<option value="">Выберите маршрут для табло</option>';
        
        routes.forEach(route => {
            const option = document.createElement('option');
            option.value = route.id;
            option.textContent = `${route.city_name} - Маршрут ${route.route_number}: ${route.name}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading routes:', error);
    }
}

// Применение выбранного маршрута
document.getElementById('applyRoute').addEventListener('click', async () => {
    const routeId = document.getElementById('displayRouteSelect').value;
    if (!routeId) return;
    
    currentRouteId = routeId;
    await loadRouteInfo(routeId);
    startAutoUpdate(routeId);
});

// Загрузка информации о маршруте
async function loadRouteInfo(routeId) {
    try {
        // Получаем информацию о маршруте
        const routesResponse = await fetch('/api/routes');
        const routes = await routesResponse.json();
        const route = routes.find(r => r.id == routeId);
        
        if (!route) return;
        
        document.getElementById('routeNumber').textContent = route.route_number;
        document.getElementById('routeName').textContent = route.name;
        document.getElementById('finalStop').textContent = route.end_point;
        
        // Получаем текущее состояние
        await updateStopInfo(routeId);
        
    } catch (error) {
        console.error('Error loading route info:', error);
    }
}

// Обновление информации об остановках
async function updateStopInfo(routeId) {
    try {
        const response = await fetch(`/api/current-stop?route_id=${routeId}`);
        const data = await response.json();
        
        if (data.current_stop) {
            document.getElementById('currentStop').textContent = data.current_stop.name;
        }
        
        if (data.next_stop) {
            document.getElementById('nextStop').textContent = data.next_stop.name;
        } else if (data.current_stop && data.current_order >= data.total_stops) {
            document.getElementById('nextStop').textContent = 'КОНЕЧНАЯ';
        }
        
        // Обновляем бегущую строку
        updateMarquee(data);
        
    } catch (error) {
        console.error('Error updating stop info:', error);
    }
}

// Обновление бегущей строки
function updateMarquee(data) {
    let text = '';
    
    if (data.current_stop) {
        text = `Текущая остановка: ${data.current_stop.name}`;
        
        if (data.next_stop) {
            text += ` → Следующая: ${data.next_stop.name}`;
        } else {
            text += ` → КОНЕЧНАЯ`;
        }
        
        text += ` | Остановка ${data.current_order} из ${data.total_stops}`;
    } else {
        text = 'Ожидание начала движения...';
    }
    
    document.getElementById('marqueeText').textContent = text;
}

// Автоматическое обновление
function startAutoUpdate(routeId) {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    updateInterval = setInterval(() => {
        updateStopInfo(routeId);
    }, 3000);
}
