document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let currentFilters = {
        region: 'all',
        type: 'all',
        status: 'all',
        dateRange: '30'
    };

    // Generate mock safety data
    FLEET_MASTER_DATA.trucks.forEach(t => {
        if (!t.safety) {
            t.safety = {
                harshBraking: Math.floor(Math.random() * 6),
                speeding: Math.floor(Math.random() * 10),
                microsleep: Math.floor(Math.random() * 4),
                score: Math.floor(Math.random() * 25 + 75) // 75 to 100
            };
            if (t.safety.microsleep > 1 || t.safety.score < 80) t.safety.fatigueRisk = 'High';
            else if (t.safety.microsleep === 1 || t.safety.score < 88) t.safety.fatigueRisk = 'Medium';
            else t.safety.fatigueRisk = 'Low';
        }
    });

    let filteredData = [...FLEET_MASTER_DATA.trucks];
    let charts = {};
    let tableFilters = {
        runtimeRange: null, // e.g. [0, 1000]
        maintStatus: null, // Added for maintenance chart filter
        complianceStatus: null,
        iotFilter: null,
        safetyRisk: null
    };

    // --- NAVIGATION & UI HELPERS ---
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    const views = document.querySelectorAll('.view-container');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const target = item.getAttribute('data-view');
            views.forEach(v => {
                v.classList.remove('active');
                if(v.id === `view-${target}`) v.classList.add('active');
            });
            tableFilters.runtimeRange = null; // Reset table filters on view change
            tableFilters.maintStatus = null;
            tableFilters.complianceStatus = null;
            tableFilters.iotFilter = null;
            tableFilters.safetyRisk = null;
            if(document.getElementById('clear-table-filter')) document.getElementById('clear-table-filter').style.display = 'none';
            if(document.getElementById('clear-maint-filter')) document.getElementById('clear-maint-filter').style.display = 'none';
            if(document.getElementById('maint-table-title')) document.getElementById('maint-table-title').textContent = 'Upcoming Maintenance Schedule';
            if(document.getElementById('clear-compliance-filter')) document.getElementById('clear-compliance-filter').style.display = 'none';
            if(document.getElementById('compliance-table-title')) document.getElementById('compliance-table-title').textContent = 'Compliance Expiry Details';
            if(document.getElementById('clear-iot-filter')) document.getElementById('clear-iot-filter').style.display = 'none';
            if(document.getElementById('iot-table-title')) document.getElementById('iot-table-title').textContent = 'Device Inventory & Action';
            if(document.getElementById('clear-safety-filter')) document.getElementById('clear-safety-filter').style.display = 'none';
            if(document.getElementById('safety-table-title')) document.getElementById('safety-table-title').textContent = 'Driver Safety Scorecard';
            renderActiveView(target);
        });
    });

    // --- GLOBAL FILTERS ---
    function initFilters() {
        const regionSelect = document.getElementById('filter-region');
        FLEET_MASTER_DATA.regions.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r; opt.textContent = r;
            regionSelect.appendChild(opt);
        });

        const typeSelect = document.getElementById('filter-type');
        const types = [...new Set(FLEET_MASTER_DATA.trucks.map(t => t.type))];
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t; opt.textContent = t;
            typeSelect.appendChild(opt);
        });

        const filterInputs = ['filter-region', 'filter-type', 'filter-status'];
        filterInputs.forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const key = id.split('-')[1];
                currentFilters[key] = e.target.value;
                applyFilters();
            });
        });

        document.getElementById('reset-filters').addEventListener('click', () => {
            currentFilters = { region: 'all', type: 'all', status: 'all', dateRange: '30' };
            filterInputs.forEach(id => document.getElementById(id).value = 'all');
            tableFilters.runtimeRange = null;
            applyFilters();
        });
    }

    function applyFilters() {
        filteredData = FLEET_MASTER_DATA.trucks.filter(t => {
            const regionMatch = currentFilters.region === 'all' || t.region === currentFilters.region;
            const typeMatch = currentFilters.type === 'all' || t.type === currentFilters.type;
            const statusMatch = currentFilters.status === 'all' || t.maintStatus === currentFilters.status;
            return regionMatch && typeMatch && statusMatch;
        });
        const activeView = document.querySelector('.nav-item.active').getAttribute('data-view');
        renderActiveView(activeView);
    }

    // --- KPI & RENDER HELPERS ---
    function populateKPIRibbon(containerId, kpis) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        kpis.forEach(k => {
            const card = document.createElement('div');
            card.className = 'kpi-card';
            card.innerHTML = `
                <div class="kpi-label">${k.label}</div>
                <div class="kpi-value">${k.value}</div>
                <div class="kpi-status" style="color: ${k.statusColor || '#64748b'}">${k.status || ''}</div>
            `;
            container.appendChild(card);
        });
    }

    // --- REEFER RUNTIME VIEW ---
    function renderReeferView() {
        const total = filteredData.length;
        if(total === 0) return;

        const downCount = filteredData.filter(t => t.maintStatus === 'Critical').length;
        const avgRuntime = Math.round(filteredData.reduce((acc, t) => acc + t.runtime, 0) / total);
        
        populateKPIRibbon('reefer-kpi-ribbon', [
            { label: 'Total Fleet', value: total, status: `Active: ${total - downCount} | Down: ${downCount}`, statusColor: downCount > 0 ? '#ef4444' : '#10b981' },
            { label: 'Avg Runtime', value: `${avgRuntime}h`, status: 'Current Avg: 8.2h/day' },
            { label: 'Fleet Risk', value: `${downCount}`, status: 'Trucks at Risk', statusColor: '#ef4444' },
            { label: 'Maint. Compliance', value: '92.4%', status: 'Target: 95%' }
        ]);

        // Make the "Down" status clickable via the KPI ribbon wrapper
        const downKpiCard = document.querySelectorAll('#reefer-kpi-ribbon .kpi-card')[0];
        if (downKpiCard) {
            downKpiCard.style.cursor = 'pointer';
            downKpiCard.title = "Click to filter 'Down' trucks";
            downKpiCard.onclick = () => {
                tableFilters.status = 'Critical';
                document.getElementById('clear-table-filter').style.display = 'block';
                document.getElementById('table-title').textContent = `Truck Investigation Ledger (Filtered: Down Trucks)`;
                renderReeferTable();
            };
        }

        // Risk Bands (Interactive) mapped to maintStatus
        const riskContainer = document.getElementById('runtime-risk-bands');
        riskContainer.innerHTML = '';
        
        const bands = [
            { id: 'Healthy', label: 'Healthy (Optimal)', color: '#10b981' },
            { id: 'Monitor', label: 'Monitor (Moderate Use)', color: '#3b82f6' },
            { id: 'Warning', label: 'Warning (High Use)', color: '#f59e0b' },
            { id: 'Critical', label: 'Critical (Down/Overdue)', color: '#ef4444' }
        ];

        bands.forEach(b => {
            const count = filteredData.filter(t => t.maintStatus === b.id).length;
            const pct = (count / total) * 100 || 0;
            const row = document.createElement('div');
            row.className = 'risk-band';
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <div class="risk-label" style="width: 150px;">${b.label}</div>
                <div class="risk-bar-bg"><div class="risk-bar-fill" style="width: ${pct}%; background: ${b.color};"></div></div>
                <div class="risk-count">${count} Trucks</div>
                <div class="risk-percent">${pct.toFixed(1)}%</div>
            `;
            row.onclick = () => {
                tableFilters.status = b.id;
                document.getElementById('clear-table-filter').style.display = 'block';
                document.getElementById('table-title').textContent = `Truck Investigation Ledger (Filtered: ${b.label})`;
                renderReeferTable();
            };
            riskContainer.appendChild(row);
        });

        document.getElementById('clear-table-filter').onclick = () => {
            tableFilters.status = null;
            document.getElementById('clear-table-filter').style.display = 'none';
            document.getElementById('table-title').textContent = 'Truck Investigation Ledger';
            renderReeferTable();
        };

        // Average Runtime by Region Chart
        const regionData = {};
        filteredData.forEach(t => {
            if(!regionData[t.region]) regionData[t.region] = { sum: 0, count: 0 };
    // --- MAINTENANCE VIEW ---
    function renderMaintenanceView() {
        // Calculate upcoming maintenance
        const now = new Date('2026-05-14');
        const upcoming = filteredData.filter(t => {
            const d = new Date(t.nextMaint);
            const diffDays = (d - now) / (1000 * 60 * 60 * 24);
            return diffDays >= 0 && diffDays <= 15;
        });
        const overdue = filteredData.filter(t => new Date(t.nextMaint) < now);

        populateKPIRibbon('maintenance-kpi-ribbon', [
            { label: 'Upcoming (15d)', value: `${upcoming.length}`, status: `Overdue: ${overdue.length}`, statusColor: overdue.length > 0 ? '#ef4444' : '#10b981' },
            { label: 'Under Maintenance', value: `${filteredData.filter(t => t.maintStatus === 'Critical').length}`, status: 'Action Required', statusColor: '#ef4444' },
            { label: 'Compliance', value: '94.2%', status: 'Target: 95%' }
        ]);

        // Service Status Chart based on actual data
        const counts = { 'Healthy': 0, 'Monitor': 0, 'Warning': 0, 'Critical': 0 };
        filteredData.forEach(t => counts[t.maintStatus]++);
        const chartLabels = ['Healthy', 'Monitor', 'Warning', 'Critical'];

        if(charts.maintenanceStatus) charts.maintenanceStatus.destroy();
        charts.maintenanceStatus = new Chart(document.getElementById('maintenanceStatusChart').getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{ data: [counts.Healthy, counts.Monitor, counts.Warning, counts.Critical], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'], borderWidth: 0 }]
            },
            options: { 
                maintainAspectRatio: false,
                cutout: '70%', 
                plugins: { legend: { position: 'right' } },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const idx = elements[0].index;
                        const selectedStatus = chartLabels[idx];
                        tableFilters.maintStatus = selectedStatus;
                        document.getElementById('clear-maint-filter').style.display = 'block';
                        document.getElementById('maint-table-title').textContent = `Upcoming Maintenance (Filtered: ${selectedStatus})`;
                        renderMaintenanceTable();
                    }
                }
            }
        });

        document.getElementById('clear-maint-filter').onclick = () => {
            tableFilters.maintStatus = null;
            document.getElementById('clear-maint-filter').style.display = 'none';
            document.getElementById('maint-table-title').textContent = 'Upcoming Maintenance Schedule';
            renderMaintenanceTable();
        };

        renderMaintenanceTable();

        const heatmap = document.getElementById('maintenance-heatmap');
        heatmap.style.gridTemplateColumns = `120px repeat(${FLEET_MASTER_DATA.regions.length}, 1fr)`;
        heatmap.innerHTML = `<div></div>${FLEET_MASTER_DATA.regions.map(r => `<div style="font-size: 10px; font-weight: 700; text-align: center;">${r}</div>`).join('')}`;
        
        ['Engine', 'Battery System', 'Reefer Unit', 'GPS / Telematics'].forEach(asset => {
            heatmap.innerHTML += `<div style="font-size: 11px; font-weight: 600; padding: 4px 0;">${asset}</div>`;
            FLEET_MASTER_DATA.regions.forEach(r => {
                const score = Math.floor(Math.random() * 3);
                const cls = score === 0 ? 'cell-green' : (score === 1 ? 'cell-amber' : 'cell-red');
                heatmap.innerHTML += `<div class="heatmap-cell ${cls}">${Math.floor(Math.random() * 20 + 80)}</div>`;
            });
        });
    }

    function renderMaintenanceTable() {
        const tbody = document.querySelector('#maintenance-schedule-table tbody');
        tbody.innerHTML = '';
        
        let displayData = [...filteredData];
        if (tableFilters.maintStatus) {
            displayData = displayData.filter(t => t.maintStatus === tableFilters.maintStatus);
        }

        const now = new Date('2026-05-14');
        const sortedSchedule = displayData.sort((a, b) => new Date(a.nextMaint) - new Date(b.nextMaint)).slice(0, 15);
        
        sortedSchedule.forEach(t => {
            const d = new Date(t.nextMaint);
            const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
            let statusText = diffDays < 0 ? 'Overdue' : (diffDays <= 7 ? 'Due Soon' : 'Scheduled');
            let statusColor = diffDays < 0 ? 'red' : (diffDays <= 7 ? 'amber' : 'green');

            tbody.innerHTML += `
                <tr>
                    <td><strong>${t.id}</strong></td>
                    <td>${t.region}</td>
                    <td>${t.nextMaint}</td>
                    <td><span class="chip chip-${statusColor}">${statusText}</span></td>
                </tr>
            `;
        });
    }

    // --- FUEL VIEW ---
    function renderFuelView() {
        populateKPIRibbon('fuel-kpi-ribbon', [
            { label: 'Avg Efficiency', value: '5.8 KM/L', status: 'Baseline: 6.0', statusColor: '#ef4444' },
            { label: 'Fuel Variance', value: '3.4%', status: 'Threshold: 5.0%' },
            { label: 'Theft Alerts', value: '2', status: 'Critical: 1', statusColor: '#ef4444' }
        ]);

        if(charts.fuelScatter) charts.fuelScatter.destroy();
        charts.fuelScatter = new Chart(document.getElementById('fuelScatterChart').getContext('2d'), {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Driver Efficiency',
                    data: filteredData.map(t => ({ x: t.fuelEfficiency, y: t.idleTime })),
                    backgroundColor: '#ef533f'
                }]
            },
            options: { maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Efficiency (KM/L)' } }, y: { title: { display: true, text: 'Idle Time (min)' } } } }
        });

        const typeData = {};
        filteredData.forEach(t => {
            if(!typeData[t.type]) typeData[t.type] = { sum: 0, count: 0 };
            typeData[t.type].sum += t.fuelEfficiency;
            typeData[t.type].count += 1;
        });

        if(charts.fuelType) charts.fuelType.destroy();
        charts.fuelType = new Chart(document.getElementById('fuelTypeChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(typeData),
                datasets: [{ label: 'Avg KM/L', data: Object.keys(typeData).map(k => typeData[k].sum / typeData[k].count), backgroundColor: '#10b981' }]
            },
            options: { maintainAspectRatio: false }
        });

        const alerts = document.getElementById('fuel-theft-alerts');
        alerts.innerHTML = filteredData.slice(0,4).map(t => `<div class="alert-item alert-${t.fuelVariance > 4 ? 'red' : 'amber'}"><div class="time">${t.id}</div><div class="msg">Variance: ${t.fuelVariance}% detected during idle</div></div>`).join('');
    }

        }

        displayData.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${t.id}</strong></td>
                <td><span class="chip chip-${t.iot.gps.toLowerCase()}">${t.iot.gps}</span></td>
                <td><span class="chip chip-${t.iot.fuel.toLowerCase()}">${t.iot.fuel}</span></td>
                <td><span class="chip chip-${t.iot.temp.toLowerCase()}">${t.iot.temp}</span></td>
                <td><span class="chip chip-${t.iot.camera.toLowerCase()}">${t.iot.camera}</span></td>
                <td><button onclick="triggerRestart('${t.id}')" style="background:#0f172a; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:10px; cursor:pointer;">RESTART</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- INVESTIGATION DRAWER ---
    function openInvestigation(truck) {
        const drawer = document.getElementById('investigation-drawer');
        document.getElementById('drawer-truck-id').textContent = truck.id;
        const content = document.getElementById('drawer-content');
        content.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                <div class="kpi-card"><div class="kpi-label">Region</div><div class="kpi-value" style="font-size: 16px;">${truck.region}</div></div>
                <div class="kpi-card"><div class="kpi-label">Driver</div><div class="kpi-value" style="font-size: 16px;">${truck.driver}</div></div>
            </div>
            <h4 style="margin-bottom: 12px; font-size: 13px;">TELEMETRY STATUS</h4>
            <div style="display: flex; gap: 8px; margin-bottom: 24px;">
                ${Object.entries(truck.iot).map(([k, v]) => `
                    <div style="flex: 1; text-align: center; padding: 8px; border: 1px solid var(--border); border-radius: 6px;">
                        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase;">${k}</div>
                        <div style="font-size: 11px; color: ${v === 'Active' ? '#10b981' : '#ef4444'}; font-weight: 700;">${v}</div>
                    </div>
                `).join('')}
            </div>
            <h4 style="margin-bottom: 12px; font-size: 13px;">FUEL & PERFORMANCE</h4>
            <div class="kpi-card" style="margin-bottom: 12px;">
                <div class="kpi-label">Fuel Efficiency</div>
                <div class="kpi-value" style="font-size: 24px;">${truck.fuelEfficiency} <span style="font-size: 12px;">KM/L</span></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Idle Time (Last 24h)</div>
                <div class="kpi-value" style="font-size: 24px;">${truck.idleTime} <span style="font-size: 12px;">min</span></div>
            </div>
        `;
        drawer.classList.add('open');
    }
    document.getElementById('close-drawer').onclick = () => document.getElementById('investigation-drawer').classList.remove('open');

    // --- IOT RESTART WORKFLOW ---
    window.triggerRestart = function(id) {
        const truck = FLEET_MASTER_DATA.trucks.find(t => t.id === id);
        const modal = document.getElementById('modal-overlay');
        const details = document.getElementById('restart-details');
        details.innerHTML = `
            <strong>Device ID:</strong> DEV-${id.split('-')[1]}<br>
            <strong>Truck:</strong> ${id}<br>
            <strong>Status:</strong> Offline for 2h 14m<br>
            <strong>Mapped Sensors:</strong> ${Object.keys(truck.iot).join(', ')}
        `;
        modal.style.display = 'flex';
        document.getElementById('iot-restart-modal').style.display = 'block';
        document.getElementById('iot-progress-modal').style.display = 'none';

        document.getElementById('confirm-restart').onclick = () => {
            document.getElementById('iot-restart-modal').style.display = 'none';
            document.getElementById('iot-progress-modal').style.display = 'block';
            startRestartTimer();
        };
        document.getElementById('cancel-restart').onclick = () => modal.style.display = 'none';
    };

    function startRestartTimer() {
        let timeLeft = 300;
        const timerSpan = document.getElementById('restart-timer');
        const progressBar = document.getElementById('restart-progress-bar');
        const stepText = document.getElementById('restart-step');
        
        const steps = [
            'Initializing bypass handshake...',
            'Sending telemetry ping...',
            'Authenticating sensor node...',
            'Re-establishing data stream...',
            'Syncing regional buffer...'
        ];

        const interval = setInterval(() => {
            timeLeft--;
            const mins = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            timerSpan.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            const pct = ((300 - timeLeft) / 300) * 100;
            progressBar.style.width = `${pct}%`;
            
            const stepIdx = Math.floor(pct / 20);
            if(stepIdx < steps.length) stepText.textContent = `Step: ${steps[stepIdx]}`;

            if(timeLeft <= 0) {
                clearInterval(interval);
                document.getElementById('modal-overlay').style.display = 'none';
                addAlert('IoT Device Recovered Successfully', 'green');
            }
        }, 10);
    }

    // --- ALERTS ---
    function addAlert(msg, severity) {
        const list = document.getElementById('global-alert-list');
        const item = document.createElement('div');
        item.className = `alert-item alert-${severity}`;
        item.innerHTML = `<div class="time">${new Date().toLocaleTimeString()}</div><div class="msg">${msg}</div>`;
        list.prepend(item);
    }

    function initAlerts() {
        const rawAlerts = [
            { msg: 'NXX-9876 entered critical runtime zone', sev: 'red' },
            { msg: 'Fuel sensor offline - Cebu', sev: 'amber' },
            { msg: 'Insurance expiry in 3 days - KLM-2345', sev: 'amber' },
            { msg: 'GPS reconnected - NCR', sev: 'green' }
        ];
        rawAlerts.forEach(a => addAlert(a.msg, a.sev));
    }

    // --- INITIALIZE ALL ---
    function renderActiveView(target) {
        if(target === 'reefer') renderReeferView();
        else if(target === 'maintenance') renderMaintenanceView();
        else if(target === 'fuel') renderFuelView();
        else if(target === 'compliance') renderComplianceView();
        else if(target === 'iot') renderIoTView();
        else if(target === 'safety') renderSafetyView();
    }

    // --- LIVE FEED TOGGLE ---
    const feedPanel = document.getElementById('alert-feed-panel');
    const toggleBtn = document.getElementById('toggle-feed-btn');
    const alertBadge = document.getElementById('alert-badge');
    
    // Default to hidden
    feedPanel.style.display = 'none';

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (feedPanel.style.display === 'none') {
                feedPanel.style.display = 'flex';
                if (alertBadge) alertBadge.style.display = 'none';
            } else {
                feedPanel.style.display = 'none';
            }
        });
    }

    initFilters();
    initAlerts();
    renderActiveView('maintenance');
});
