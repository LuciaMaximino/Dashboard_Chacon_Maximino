let currentLevel = 1; //guarda el nivel en el que estoy de drill down/drill up 
let selectedChannel = null; //guarda el canal seleccionado
let selectedSale = null; //guarda la venta seleccionada
let allChannelsData = []; //guarda todos los datos de los canales
let barChartInstance = null; //guardan los gráficos creados
let pieChartInstance = null;

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

        //esperar antes de crear los gráficos
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
    //si existe eliminar gráfico anterior
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
    //si existe eliminar gráfico anterior 
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

//función helper para escapar HTML y prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}