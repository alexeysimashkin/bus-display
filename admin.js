// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadCities();
    setupEventListeners();
});

// Настройка слушателей событий
function setupEventListeners() {
    document.getElementById('routeCitySelect').addEventListener('change', (e) => {
        if (e.target.value) {
            loadRoutes(e.target.value);
        }
    });
    
    document.getElementById('stopRouteSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            loadStops(e.target.value);
        }
    });
    
    document.getElementById('controlRouteSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            loadRouteStatus(e.target.value);
        }
    });
}

// ============ УПРАВЛЕНИЕ ГОРОДАМИ ============
async function loadCities() {
    try {
        const response = await fetch('/api/cities');
        const cities = await response.json();
        
        displayCities(cities);
        updateCitySelects(cities);
    } catch (error) {
        console.error('Error loading cities:', error);
    }
}

function displayCities(cities) {
    const container = document.getElementById('citiesList');
    
    if (cities.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center;">Нет городов</p>';
        return;
    }
    
    container.innerHTML = cities.map(city => `
        <div class="list-item">
            <div>
                <strong>${city.name}</strong>
                <span style="color: #888; margin-left: 10px;">
                    Маршрутов: ${city.routes_count || 0}
                </span>
            </div>
            <button onclick="deleteCity(${city.id})" class="btn-delete">🗑️</button>
        </div>
    `).join('');
}

function updateCitySelects(cities) {
    const selects = ['routeCitySelect', 'controlRouteSelect'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">Выберите город</option>';
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city.id;
            option.textContent = city.name;
            select.appendChild(option);
        });
        
        if (currentValue) select.value = currentValue;
    });
}

async function addCity() {
    const nameInput = document.getElementById('newCityName');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('Введите название города');
        return;
    }
    
    try {
        const response = await fetch('/api/cities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        
        if (response.ok) {
            nameInput.value = '';
            await loadCities();
        } else {
            const error = await response.json();
            alert(error.error);
        }
    } catch (error) {
        console.error('Error adding city:', error);
        alert('Ошибка при добавлении города');
    }
}

async function deleteCity(id) {
    if (!confirm('Удалить город? Все маршруты и остановки будут удалены.')) return;
    
    try {
        await fetch(`/api/cities?id=${id}`, { method: 'DELETE' });
        await loadCities();
    } catch (error) {
        console.error('Error deleting city:', error);
    }
}

// ============ УПРАВЛЕНИЕ МАРШРУТАМИ ============
async function loadRoutes(cityId) {
    try {
        const response = await fetch(`/api/routes?city_id=${cityId}`);
        const routes = await response.json();
        
        displayRoutes(routes);
        updateRouteSelects(routes);
    } catch (error) {
        console.error('Error loading routes:', error);
    }
}

function displayRoutes(routes) {
    const container = document.getElementById('routesList');
    
    if (routes.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center;">Нет маршрутов</p>';
        return;
    }
    
    container.innerHTML = routes.map(route => `
        <div class="list-item">
            <div>
                <strong>№${route.route_number}</strong> - ${route.name}
                <br>
                <small style="color: #888;">
                    ${route.start_point} → ${route.end_point}
                    (Остановок: ${route.stops_count || 0})
                </small>
            </div>
            <button onclick="deleteRoute(${route.id})" class="btn-delete">🗑️</button>
        </div>
    `).join('');
}

function updateRouteSelects(routes) {
    const selects = ['stopRouteSelect', 'controlRouteSelect'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">Выберите маршрут</option>';
        routes.forEach(route => {
            const option = document.createElement('option');
            option.value = route.id;
            option.textContent = `${route.route_number} - ${route.name}`;
            select.appendChild(option);
        });
        
        if (currentValue) select.value = currentValue;
    });
}

async function addRoute() {
    const cityId = document.getElementById('routeCitySelect').value;
    const routeNumber = document.getElementById('routeNumber').value.trim();
    const routeName = document.getElementById('routeName').value.trim();
    
    if (!cityId || !routeNumber || !routeName) {
        alert('Заполните все поля');
        return;
    }
    
    try {
        const response = await fetch('/api/routes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                city_id: parseInt(cityId),
                route_number: routeNumber,
                name: routeName,
                start_point: 'Начальная',
                end_point: 'Конечная'
            })
        });
        
        if (response.ok) {
            document.getElementById('routeNumber').value = '';
            document.getElementById('routeName').value = '';
            await loadRoutes(cityId);
        } else {
            const error = await response.json();
            alert(error.error);
        }
    } catch (error) {
        console.error('Error adding route:', error);
        alert('Ошибка при создании маршрута');
    }
}

async function deleteRoute(id) {
    if (!confirm('Удалить маршрут и все остановки?')) return;
    
    try {
        await fetch(`/api/routes?id=${id}`, { method: 'DELETE' });
        const cityId = document.getElementById('routeCitySelect').value;
        if (cityId) await loadRoutes(cityId);
    } catch (error) {
        console.error('Error deleting route:', error);
    }
}

// ============ УПРАВЛЕНИЕ ОСТАНОВКАМИ ============
async function loadStops(routeId) {
    try {
        const response = await fetch(`/api/stops?route_id=${routeId}`);
        const stops = await response.json();
        
        displayStops(stops);
    } catch (error) {
        console.error('Error loading stops:', error);
    }
}

function displayStops(stops) {
    const container = document.getElementById('stopsList');
    
    if (stops.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center;">Нет остановок</p>';
        return;
    }
    
    container.innerHTML = stops.map(stop => `
        <div class="list-item">
            <div>
                <strong>${stop.order_number}. ${stop.name}</strong>
                ${stop.arrival_time ? `<span style="color: #888; margin-left: 10px;">≈${stop.arrival_time}</span>` : ''}
            </div>
            <button onclick="deleteStop(${stop.id})" class="btn-delete">🗑️</button>
        </div>
    `).join('');
}

async function addStop() {
    const routeId = document.getElementById('stopRouteSelect').value;
    const stopName = document.getElementById('stopName').value.trim();
    const stopTime = document.getElementById('stopTime').value.trim();
    
    if (!routeId || !stopName) {
        alert('Выберите маршрут и введите название остановки');
        return;
    }
    
    // Получаем текущее количество остановок
    const response = await fetch(`/api/stops?route_id=${routeId}`);
    const stops = await response.json();
    const orderNumber = stops.length + 1;
    
    try {
        const addResponse = await fetch('/api/stops', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                route_id: parseInt(routeId),
                name: stopName,
                order_number: orderNumber,
                arrival_time: stopTime || null
            })
        });
        
        if (addResponse.ok) {
            document.getElementById('stopName').value = '';
            document.getElementById('stopTime').value = '';
            await loadStops(routeId);
        }
    } catch (error) {
        console.error('Error adding stop:', error);
    }
}

async function deleteStop(id) {
    if (!confirm('Удалить остановку?')) return;
    
    try {
        await fetch(`/api/stops?id=${id}`, { method: 'DELETE' });
        const routeId = document.getElementById('stopRouteSelect').value;
        if (routeId) await loadStops(routeId);
    } catch (error) {
        console.error('Error deleting stop:', error);
    }
}

// ============ УПРАВЛЕНИЕ ДВИЖЕНИЕМ ============
async function loadRouteStatus(routeId) {
    try {
        const response = await fetch(`/api/current-stop?route_id=${routeId}`);
        const data = await response.json();
        
        displayRouteStatus(data);
    } catch (error) {
        console.error('Error loading route status:', error);
    }
}

function displayRouteStatus(data) {
    const container = document.getElementById('routeStatus');
    
    if (!data.current_stop) {
        container.innerHTML = '<p>Маршрут не активен</p>';
        return;
    }
    
    container.innerHTML = `
        <p>
            <strong>Текущая остановка:</strong>
            <span class="status-current">${data.current_stop.name}</span>
        </p>
        ${data.next_stop ? `
            <p>
                <strong>Следующая:</strong>
                <span class="status-next">${data.next_stop.name}</span>
            </p>
        ` : `
            <p><span class="status-final">🚩 Конечная остановка</span></p>
        `}
        <p style="margin-top: 10px; color: #888;">
            Остановка ${data.current_order} из ${data.total_stops}
        </p>
    `;
}

async function moveToNext() {
    const routeId = document.getElementById('controlRouteSelect').value;
    if (!routeId) {
        alert('Выберите маршрут');
        return;
    }
    
    try {
        const response = await fetch('/api/current-stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                route_id: parseInt(routeId),
                direction: 'next'
            })
        });
        
        const data = await response.json();
        displayRouteStatus(data);
        
        if (data.is_last) {
            alert('🚩 Достигнута конечная остановка!');
        }
    } catch (error) {
        console.error('Error moving to next stop:', error);
    }
}

async function moveToPrev() {
    const routeId = document.getElementById('controlRouteSelect').value;
    if (!routeId) {
        alert('Выберите маршрут');
        return;
    }
    
    try {
        const response = await fetch('/api/current-stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                route_id: parseInt(routeId),
                direction: 'prev'
            })
        });
        
        const data = await response.json();
        displayRouteStatus(data);
    } catch (error) {
        console.error('Error moving to previous stop:', error);
    }
}

async function resetRoute() {
    const routeId = document.getElementById('controlRouteSelect').value;
    if (!routeId) {
        alert('Выберите маршрут');
        return;
    }
    
    if (!confirm('Сбросить маршрут на начальную остановку?')) return;
    
    try {
        const response = await fetch('/api/current-stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                route_id: parseInt(routeId),
                direction: 'reset'
            })
        });
        
        const data = await response.json();
        displayRouteStatus(data);
        alert('✅ Маршрут сброшен на начальную остановку');
    } catch (error) {
        console.error('Error resetting route:', error);
    }
}
