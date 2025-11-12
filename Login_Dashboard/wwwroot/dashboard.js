let currentLevel = 1; //guarda el nivel en el que estoy de drill down/drill up 
let selectedChannel = null; //guarda el canal seleccionado
let selectedSale = null; //guarda la venta seleccionada
let allChannelsData = []; //guarda todos los datos de los canales
let barChartInstance = null; //guardan los gráficos creados
let pieChartInstance = null;
let customersBarChartInstance = null;
let customersPieChartInstance = null;
let categoriesBarChartInstance = null;
let categoriesPieChartInstance = null;

window.onload = () => { //una vez que se cargo la pagina ejecuta la funcion
    loadLevel1();
};

async function loadLevel1() {
    currentLevel = 1;
    selectedChannel = null;
    selectedSale = null;
    updateBreadcrumb('Canales de Venta');
    document.getElementById('navigation').style.display = 'none'; //oculta los botones de inicio y volver porque estoy en el nivel 1

    try {
        const response = await fetch('/api/sales-channels');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const channels = await response.json();
        allChannelsData = channels;

        let html = `
            <h2>Ventas por Canal</h2>
            <p>Resumen general de ventas por canal de distribución</p>
            
            <div class="charts-container">
                <div class="chart-box">
                    <canvas id="barChart"></canvas>
                </div>
                <div class="chart-box">
                    <canvas id="pieChart"></canvas>
                </div>
            </div>
            
            <div class="channels-grid">
        `;

        channels.forEach(channel => {
            html += `
                <div class="channel-card" onclick="loadLevel2('${channel.id}', '${escapeHtml(channel.name)}')">
                    <h3>${escapeHtml(channel.name)}</h3>
                    <div class="amount">$${channel.total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div class="sales-count">${channel.sales} ventas realizadas</div>
                    <div class="view-details">Ver detalles →</div>
                </div>
            `;
        });

        html += '</div>';
        document.getElementById('content-area').innerHTML = html;

        // Esperar antes de crear los gráficos
        setTimeout(() => {
            createBarChart(channels);
            createPieChart(channels);
        }, 100);
    } catch (error) {
        console.error('Error completo:', error);
        document.getElementById('content-area').innerHTML = `
            <div class="loading">
                Error al cargar los datos<br>
                <small style="color: #999;">${error.message}</small>
            </div>`;
    }
}

async function loadLevel2(channelId, channelName) {
    currentLevel = 2;
    selectedChannel = { id: channelId, name: channelName };
    updateBreadcrumb(`Canales de Venta > ${channelName}`);
    document.getElementById('navigation').style.display = 'block';

    try {
        const response = await fetch(`/api/sales-channels/${channelId}/sales`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const sales = await response.json();

        const channelData = allChannelsData.find(c => c.id === channelId);
        const totalAmount = channelData ? channelData.total : 0;

        let html = `
            <h2>Ventas - ${escapeHtml(channelName)}</h2>
            <p>Total: $${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | ${sales.length} ventas</p>
            
            <table>
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th class="text-right">Total</th>
                        <th class="text-center">Acción</th>
                    </tr>
                </thead>
                <tbody>
        `;

        sales.forEach(sale => {
            html += `
                <tr>
                    <td><strong>${escapeHtml(sale.number)}</strong></td>
                    <td>${escapeHtml(sale.date)}</td>
                    <td>${escapeHtml(sale.customer)}</td>
                    <td class="text-right" style="color: #9C5B33; font-weight: 600;">
                        $${sale.total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td class="text-center">
                        <button class="btn-view" onclick="loadLevel3('${escapeHtml(sale.number)}', '${escapeHtml(sale.customer)}', '${escapeHtml(sale.date)}', ${sale.total})">
                            Ver detalle
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        document.getElementById('content-area').innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('content-area').innerHTML = '<div class="loading">Error al cargar las ventas</div>';
    }
}

async function loadLevel3(saleNumber, customer, date, total) {
    currentLevel = 3;
    selectedSale = { number: saleNumber, customer, date, total };
    updateBreadcrumb(`Canales de Venta > ${selectedChannel.name} > Venta ${saleNumber}`);

    try {
        const response = await fetch(`/api/sales/${saleNumber}/details`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const details = await response.json();

        let html = `
            <h2>Detalle de Venta ${escapeHtml(saleNumber)}</h2>
            
            <div class="info-box">
                <div class="info-item">
                    <p>Fecha</p>
                    <p>${escapeHtml(date)}</p>
                </div>
                <div class="info-item">
                    <p>Cliente</p>
                    <p>${escapeHtml(customer)}</p>
                </div>
                <div class="info-item">
                    <p>Canal</p>
                    <p>${escapeHtml(selectedChannel.name)}</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Código</th>
                        <th>Producto</th>
                        <th class="text-right">Cantidad</th>
                        <th class="text-right">Precio Unit.</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
        `;

        details.forEach(detail => {
            html += `
                <tr>
                    <td>${detail.item}</td>
                    <td><strong>${escapeHtml(detail.code)}</strong></td>
                    <td>${escapeHtml(detail.product)}</td>
                    <td class="text-right">${detail.quantity}</td>
                    <td class="text-right">$${detail.price.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="text-right" style="color: #9C5B33; font-weight: 600;">
                        $${detail.total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                </tr>
            `;
        });

        html += `
                    <tr class="total-row">
                        <td colspan="5" class="text-right">TOTAL VENTA</td>
                        <td class="text-right">$${total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                </tbody>
            </table>
        `;

        document.getElementById('content-area').innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('content-area').innerHTML = '<div class="loading">Error al cargar el detalle</div>';
    }
}

function goBack() {
    if (currentLevel === 3) {
        loadLevel2(selectedChannel.id, selectedChannel.name);
    } else if (currentLevel === 2) {
        loadLevel1();
    }
}

function goHome() {
    loadLevel1();
}

function updateBreadcrumb(text) {
    const parts = text.split(' > ');
    let html = '';
    parts.forEach((part, index) => {
        if (index > 0) html += '<span class="breadcrumb-arrow">→</span>';
        html += `<span class="${index === parts.length - 1 ? 'active' : ''}">${escapeHtml(part)}</span>`;
    });
    document.getElementById('breadcrumb').innerHTML = html;
}

function createBarChart(data) {
    // Si existe eliminar gráfico anterior
    if (barChartInstance) {
        barChartInstance.destroy();
    }

    const canvas = document.getElementById('barChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                label: 'Total Ventas',
                data: data.map(d => d.total),
                backgroundColor: '#9C5B33',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Ventas por Canal',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '$' + value.toLocaleString('es-AR');
                        }
                    }
                }
            }
        }
    });
}

function createPieChart(data) {
    // Si existe eliminar gráfico anterior
    if (pieChartInstance) {
        pieChartInstance.destroy();
    }

    const canvas = document.getElementById('pieChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colors = ['#9C5B33', '#C77D4E', '#E8A87C', '#F2C5A0'];

    pieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                data: data.map(d => d.total),
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución de Ventas',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// ============ FUNCIÓN CORREGIDA PARA CAMBIAR TABS ============
function showTab(tabName) {
    // Remover clase active de todos los tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Agregar active al tab clickeado
    event.target.classList.add('active');

    // Ocultar TODOS los contenedores de contenido
    document.getElementById('content-area').style.display = 'none';
    document.getElementById('tab-products').style.display = 'none';
    document.getElementById('tab-customers').style.display = 'none';
    document.getElementById('tab-categories').style.display = 'none';

    // Ocultar navegación de drill down
    document.getElementById('navigation').style.display = 'none';

    // Mostrar el contenido correspondiente y cargar datos
    setTimeout(() => {
        if (tabName === 'channels') {
            document.getElementById('content-area').style.display = 'block';
            updateBreadcrumb('Canales de Venta');
            loadLevel1();
        } else if (tabName === 'tab-products') {
            document.getElementById('tab-products').style.display = 'block';
            updateBreadcrumb('Productos');
            loadProducts();
        } else if (tabName === 'customers') {
            document.getElementById('tab-customers').style.display = 'block';
            updateBreadcrumb('Clientes por Provincia');
            loadCustomers();
        } else if (tabName === 'categories') {
            document.getElementById('tab-categories').style.display = 'block';
            updateBreadcrumb('Categorías de Productos');
            loadCategories();
        }
    }, 50);
}

// PRODUCTOS CON SEMAFORIZACIÓN
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const products = await response.json();

        let html = `
            <table>
                <thead>
                    <tr>
                        <th class="text-center">Estado</th>
                        <th>Código</th>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th class="text-right">Unidades</th>
                        <th class="text-right">Ingresos</th>
                    </tr>
                </thead>
                <tbody>
        `;

        products.forEach(product => {
            const statusText = product.status === 'high' ? 'Alto' : (product.status === 'medium' ? 'Medio' : 'Bajo');
            html += `
                <tr>
                    <td class="text-center">
                        <span class="status-indicator ${product.status}">
                            <span class="status-dot"></span>
                            ${statusText}
                        </span>
                    </td>
                    <td><strong>${escapeHtml(product.code)}</strong></td>
                    <td>${escapeHtml(product.name)}</td>
                    <td>${escapeHtml(product.category)}</td>
                    <td class="text-right"><strong>${product.sales}</strong></td>
                    <td class="text-right" style="color: #9C5B33; font-weight: 600;">
                        $${product.revenue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        document.getElementById('products-table').innerHTML = html;

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('products-table').innerHTML = '<div class="loading">Error al cargar productos</div>';
    }
}

// CLIENTES POR PROVINCIA
async function loadCustomers() {
    try {
        const response = await fetch('/api/customers');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const customers = await response.json();

        const totalCustomers = customers.reduce((sum, c) => sum + c.customers, 0);
        const totalSales = customers.reduce((sum, c) => sum + c.sales, 0);

        let statsHtml = `
            <div class="stat-card">
                <div class="stat-label">Total Clientes</div>
                <div class="stat-value">${totalCustomers}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Ventas</div>
                <div class="stat-value">${totalSales}</div>
            </div>
        `;
        document.getElementById('customers-stats').innerHTML = statsHtml;

        let tableHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Provincia</th>
                        <th class="text-right">Total Clientes</th>
                        <th class="text-right">Ventas</th>
                    </tr>
                </thead>
                <tbody>
        `;

        customers.forEach(customer => {
            tableHtml += `
                <tr>
                    <td><strong>${escapeHtml(customer.province)}</strong></td>
                    <td class="text-right" style="color: #9C5B33; font-weight: 600;">${customer.customers}</td>
                    <td class="text-right">${customer.sales}</td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        document.getElementById('customers-table').innerHTML = tableHtml;

        createCustomersCharts(customers);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('customers-table').innerHTML = '<div class="loading">Error al cargar clientes</div>';
    }
}

// CATEGORÍAS DE PRODUCTOS
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const categories = await response.json();

        const totalCategories = categories.length;
        const totalProducts = categories.reduce((sum, c) => sum + c.products, 0);
        const totalSales = categories.reduce((sum, c) => sum + c.sales, 0);
        const totalRevenue = categories.reduce((sum, c) => sum + c.revenue, 0);

        let statsHtml = `
            <div class="stat-card">
                <div class="stat-label">Total Categorías</div>
                <div class="stat-value">${totalCategories}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Productos</div>
                <div class="stat-value">${totalProducts}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Unidades Vendidas</div>
                <div class="stat-value">${totalSales}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Ingresos Totales</div>
                <div class="stat-value">$${totalRevenue.toLocaleString('es-AR')}</div>
            </div>
        `;
        document.getElementById('categories-stats').innerHTML = statsHtml;

        let tableHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Categoría</th>
                        <th class="text-right">Productos</th>
                        <th class="text-right">Unidades</th>
                        <th class="text-right">Ingresos</th>
                    </tr>
                </thead>
                <tbody>
        `;

        categories.forEach(category => {
            tableHtml += `
                <tr>
                    <td><strong>${escapeHtml(category.name)}</strong></td>
                    <td class="text-right">${category.products}</td>
                    <td class="text-right"><strong>${category.sales}</strong></td>
                    <td class="text-right" style="color: #9C5B33; font-weight: 600;">
                        $${category.revenue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        document.getElementById('categories-table').innerHTML = tableHtml;

        createCategoriesCharts(categories);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('categories-table').innerHTML = '<div class="loading">Error al cargar categorías</div>';
    }
}

function createCustomersCharts(data) {
    if (customersBarChartInstance) customersBarChartInstance.destroy();
    if (customersPieChartInstance) customersPieChartInstance.destroy();

    const barCanvas = document.getElementById('customersBarChart');
    if (barCanvas) {
        const ctx = barCanvas.getContext('2d');
        customersBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.province),
                datasets: [{
                    label: 'Total Clientes',
                    data: data.map(d => d.customers),
                    backgroundColor: '#9C5B33',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Clientes por Provincia',
                        font: { size: 16, weight: 'bold' }
                    }
                }
            }
        });
    }

    const pieCanvas = document.getElementById('customersPieChart');
    if (pieCanvas) {
        const ctx = pieCanvas.getContext('2d');
        const colors = ['#9C5B33', '#C77D4E', '#E8A87C', '#F2C5A0', '#D4A574'];
        customersPieChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(d => d.province),
                datasets: [{
                    data: data.map(d => d.customers),
                    backgroundColor: colors
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribución de Clientes',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

function createCategoriesCharts(data) {
    if (categoriesBarChartInstance) categoriesBarChartInstance.destroy();
    if (categoriesPieChartInstance) categoriesPieChartInstance.destroy();

    const barCanvas = document.getElementById('categoriesBarChart');
    if (barCanvas) {
        const ctx = barCanvas.getContext('2d');
        categoriesBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.name),
                datasets: [{
                    label: 'Ingresos',
                    data: data.map(d => d.revenue),
                    backgroundColor: '#9C5B33',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Ingresos por Categoría',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '$' + value.toLocaleString('es-AR');
                            }
                        }
                    }
                }
            }
        });
    }

    const pieCanvas = document.getElementById('categoriesPieChart');
    if (pieCanvas) {
        const ctx = pieCanvas.getContext('2d');
        const colors = ['#9C5B33', '#C77D4E', '#E8A87C', '#F2C5A0', '#D4A574', '#B8956A', '#A67C52'];
        categoriesPieChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(d => d.name),
                datasets: [{
                    data: data.map(d => d.revenue),
                    backgroundColor: colors
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribución de Ingresos',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

// Función helper para escapar HTML y prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}