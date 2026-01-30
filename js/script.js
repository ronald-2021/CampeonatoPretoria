// ========== CONFIGURACIÓN ==========
const CONFIG = {
    adminEmail: 'ronaldtorres846@gmail.com',
    formSubmitURL: 'https://formsubmit.co/ronaldtorres846@gmail.com',
    secretClicks: 5
};

// ========== ESTADO GLOBAL ==========
let state = {
    equipos: [],
    jugadores: [],
    partidos: [],
    resultados: [],
    authenticated: false
};

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    inicializarEventos();
    renderizarVista();
    sincronizarConStorage();
});

// ========== PERSISTENCIA DE DATOS ==========
function guardarDatos() {
    localStorage.setItem('pretoria_equipos', JSON.stringify(state.equipos));
    localStorage.setItem('pretoria_jugadores', JSON.stringify(state.jugadores));
    localStorage.setItem('pretoria_partidos', JSON.stringify(state.partidos));
    localStorage.setItem('pretoria_resultados', JSON.stringify(state.resultados));
    window.dispatchEvent(new Event('datosActualizados'));
}

function cargarDatos() {
    state.equipos = JSON.parse(localStorage.getItem('pretoria_equipos')) || [];
    state.jugadores = JSON.parse(localStorage.getItem('pretoria_jugadores')) || [];
    state.partidos = JSON.parse(localStorage.getItem('pretoria_partidos')) || [];
    state.resultados = JSON.parse(localStorage.getItem('pretoria_resultados')) || [];
}

function sincronizarConStorage() {
    window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('pretoria_')) {
            cargarDatos();
            renderizarVista();
            if (state.authenticated) renderizarAdmin();
        }
    });
    window.addEventListener('datosActualizados', renderizarVista);
}

// ========== EVENTOS Y NAVEGACIÓN ==========
let clickCount = 0;
let clickTimer = null;

function inicializarEventos() {
    // Navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
            
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const targetId = e.target.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                window.scrollTo(0, 0);
            }
        });
    });

    // Secret Logo
    const logo = document.getElementById('secret-logo');
    if(logo) {
        logo.addEventListener('click', () => {
            clickCount++;
            if (clickCount === 1) {
                clickTimer = setTimeout(() => { clickCount = 0; }, 3000);
            }
            if (clickCount === CONFIG.secretClicks) {
                clearTimeout(clickTimer);
                clickCount = 0;
                mostrarLogin();
            }
        });
    }
    
    // Modales
    const modalLogin = document.getElementById('login-modal');
    const modalStats = document.getElementById('player-stats-modal');
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            modalLogin.style.display = 'none';
        });
    });

    // Cerrar modal de estadísticas
    document.querySelector('.close-modal-stats').addEventListener('click', () => {
        modalStats.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => { 
        if (e.target === modalLogin) modalLogin.style.display = 'none'; 
        if (e.target === modalStats) modalStats.style.display = 'none';
    });
    
    const loginForm = document.getElementById('login-form');
    if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            verificarCredenciales();
        });
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) logoutBtn.addEventListener('click', cerrarSesion);
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            cambiarTab(tab);
        });
    });
    
    const forms = {
        'form-equipo': agregarEquipo,
        'form-jugador': agregarJugador,
        'form-partido': programarPartido
    };

    for (const [id, func] of Object.entries(forms)) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('submit', func);
    }

    const selectResultado = document.getElementById('select-partido-resultado');
    if(selectResultado) selectResultado.addEventListener('change', mostrarFormResultado);
}

// ========== CREDENCIALES ==========
function mostrarLogin() {
    document.getElementById('login-modal').style.display = 'block';
}

function generarCredenciales() {
    const username = 'admin_' + Math.floor(Math.random() * 1000);
    const password = Math.random().toString(36).slice(-8);
    return { username, password };
}

function enviarCredenciales(username, password) {
    fetch(CONFIG.formSubmitURL, {
        method: "POST",
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
            _subject: "🔑 Credenciales PRETORIA SUB 50",
            Usuario: username,
            Password: password,
            Fecha: new Date().toLocaleString(),
            message: "Guarda estas credenciales. Son únicas para este dispositivo."
        })
    }).catch(console.error);
}

function verificarCredenciales() {
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;
    let credenciales = JSON.parse(localStorage.getItem('pretoria_credentials') || '[]');
    
    if (credenciales.length === 0) {
        const newCreds = generarCredenciales();
        credenciales.push(newCreds);
        localStorage.setItem('pretoria_credentials', JSON.stringify(credenciales));
        enviarCredenciales(newCreds.username, newCreds.password);
        alert(`PRIMER ACCESO: Hemos generado credenciales nuevas.\n\nUSUARIO: ${newCreds.username}\nCLAVE: ${newCreds.password}\n\n(Cópialas ahora).`);
        return;
    }
    
    const valido = credenciales.some(c => c.username === usernameInput && c.password === passwordInput);
    
    if (valido) {
        state.authenticated = true;
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('username').value = "";
        document.getElementById('password').value = "";
        mostrarPanelAdmin();
    } else {
        alert('Credenciales incorrectas.');
    }
}

function cerrarSesion() {
    state.authenticated = false;
    document.getElementById('admin-panel').style.display = 'none';
}

function mostrarPanelAdmin() {
    document.getElementById('admin-panel').style.display = 'block';
    renderizarAdmin();
}

// ========== LÓGICA ADMIN ==========
function agregarEquipo(e) {
    e.preventDefault();
    const input = document.getElementById('nombre-equipo');
    const nombre = input.value.trim();
    if (nombre) {
        state.equipos.push({
            id: Date.now(), nombre,
            estadisticas: { pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, dg:0, pts:0 }
        });
        guardarDatos(); renderizarAdmin(); input.value = '';
    }
}

function eliminarEquipo(id) {
    if(confirm('¿Eliminar equipo?')) {
        state.equipos = state.equipos.filter(e => e.id !== id);
        state.jugadores = state.jugadores.filter(j => j.equipoId !== id);
        guardarDatos(); renderizarAdmin();
    }
}

function agregarJugador(e) {
    e.preventDefault();
    const equipoId = parseInt(document.getElementById('equipo-jugador').value);
    const nombre = document.getElementById('nombre-jugador').value.trim();
    const origen = document.getElementById('origen-jugador').value.trim();
    const esExtranjero = document.getElementById('extranjero-jugador').checked;

    const jugadoresEquipo = state.jugadores.filter(j => j.equipoId === equipoId);
    if (jugadoresEquipo.length >= 20) return alert('Máximo 20 jugadores permitidos.');
    if (esExtranjero && jugadoresEquipo.filter(j => j.esExtranjero).length >= 2) return alert('Máximo 2 extranjeros permitidos.');

    state.jugadores.push({
        id: Date.now(), equipoId, nombre, origen, esExtranjero,
        amarillas: 0, rojas: 0, goles: 0, sancionado: 0
    });
    guardarDatos(); renderizarAdmin(); e.target.reset();
}

function eliminarJugador(id) {
    if(confirm('¿Eliminar jugador?')) {
        state.jugadores = state.jugadores.filter(j => j.id !== id);
        guardarDatos(); renderizarAdmin();
    }
}

function programarPartido(e) {
    e.preventDefault();
    const localId = parseInt(document.getElementById('equipo-local').value);
    const visitanteId = parseInt(document.getElementById('equipo-visitante').value);
    
    if(localId === visitanteId) return alert('El equipo no puede jugar contra sí mismo.');

    state.partidos.push({
        id: Date.now(), localId, visitanteId, jugado: false,
        fecha: document.getElementById('fecha-partido').value,
        lugar: document.getElementById('lugar-partido').value,
        arbitro: document.getElementById('arbitro-partido').value
    });
    guardarDatos(); renderizarAdmin(); e.target.reset();
}

function eliminarPartido(id) {
    if(confirm('¿Eliminar partido?')) {
        state.partidos = state.partidos.filter(p => p.id !== id);
        guardarDatos(); renderizarAdmin();
    }
}

// ========== ESTADÍSTICAS AVANZADAS (NUEVO) ==========
window.verFichaJugador = function(id) {
    const j = state.jugadores.find(x => x.id === id);
    if (!j) return;
    
    const eq = state.equipos.find(e => e.id === j.equipoId);
    
    // Calcular partidos jugados (aproximado basado en resultados donde el equipo participó)
    // Nota: Para precisión exacta se necesitaría guardar alineaciones por partido.
    // Aquí asumimos pj del equipo como base estadística simple.
    const pj = eq ? eq.estadisticas.pj : 0;
    const promedioGol = pj > 0 ? (j.goles / pj).toFixed(2) : 0;

    const modalContent = document.getElementById('player-stats-content');
    modalContent.innerHTML = `
        <div class="player-profile-header">
            <h2 class="player-big-name">${j.nombre}</h2>
            <div class="player-meta">
                ${eq ? eq.nombre : 'Sin Equipo'} | ${j.origen} ${j.esExtranjero ? '🌍' : '🏠'}
            </div>
            ${j.sancionado > 0 ? `<div style="color:var(--danger); font-weight:bold; margin-top:10px;">⛔ SUSPENDIDO (${j.sancionado} fechas)</div>` : ''}
        </div>
        
        <div class="player-stats-grid">
            <div class="stat-box highlight">
                <span class="stat-value">${j.goles}</span>
                <span class="stat-title">Goles Totales</span>
            </div>
            <div class="stat-box">
                <span class="stat-value">${promedioGol}</span>
                <span class="stat-title">Promedio Gol/Partido</span>
            </div>
            <div class="stat-box">
                <span class="stat-value" style="color:#ffd700">${j.amarillas}</span>
                <span class="stat-title">Tarjetas Amarillas</span>
            </div>
            <div class="stat-box danger">
                <span class="stat-value" style="color:#fff">${j.rojas}</span>
                <span class="stat-title">Tarjetas Rojas</span>
            </div>
        </div>
    `;
    
    document.getElementById('player-stats-modal').style.display = 'flex';
};

// ========== RENDERIZADO VISUAL ==========

function renderizarVista() {
    // 1. Calendario: Próximos
    const divProximos = document.getElementById('proximos-partidos');
    const pendientes = state.partidos.filter(p => !p.jugado).sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
    
    divProximos.innerHTML = pendientes.length ? pendientes.map(p => {
        const local = state.equipos.find(e => e.id === p.localId);
        const visit = state.equipos.find(e => e.id === p.visitanteId);
        const date = new Date(p.fecha);
        return `
            <div class="match-card">
                <div class="match-header">
                    <span class="match-date">${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span class="match-status">Por Jugar</span>
                </div>
                <div class="match-teams">
                    <div class="team"><div class="team-name">${local?.nombre || 'Unknown'}</div></div>
                    <div class="match-vs">VS</div>
                    <div class="team"><div class="team-name">${visit?.nombre || 'Unknown'}</div></div>
                </div>
                <div class="match-info">📍 ${p.lugar} | 👨‍⚖️ ${p.arbitro}</div>
            </div>`;
    }).join('') : '<div class="no-data-card">No hay partidos pendientes</div>';

    // 2. Calendario: Historial (NUEVO)
    const divHistorial = document.getElementById('historial-partidos');
    const jugados = state.partidos.filter(p => p.jugado).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    
    divHistorial.innerHTML = jugados.length ? jugados.map(p => {
        const resultado = state.resultados.find(r => r.partidoId === p.id);
        const local = state.equipos.find(e => e.id === p.localId);
        const visit = state.equipos.find(e => e.id === p.visitanteId);
        const date = new Date(p.fecha);
        return `
            <div class="match-card played">
                <div class="match-header">
                    <span class="match-date">${date.toLocaleDateString()}</span>
                    <span class="match-status completed">Finalizado</span>
                </div>
                <div class="match-teams">
                    <div class="team"><div class="team-name">${local?.nombre}</div></div>
                    <div class="result-score">${resultado ? resultado.gl : 0} - ${resultado ? resultado.gv : 0}</div>
                    <div class="team"><div class="team-name">${visit?.nombre}</div></div>
                </div>
                <div class="match-info">📍 ${p.lugar}</div>
            </div>`;
    }).join('') : '<div class="no-data-card">Aún no hay partidos jugados</div>';

    // 3. Tabla de Posiciones
    const tbody = document.querySelector('#tabla-posiciones tbody');
    const ordenados = [...state.equipos].sort((a,b) => b.estadisticas.pts - a.estadisticas.pts || b.estadisticas.dg - a.estadisticas.dg);
    
    tbody.innerHTML = ordenados.length ? ordenados.map((eq, i) => `
        <tr>
            <td>${i+1}</td>
            <td><strong>${eq.nombre}</strong></td>
            <td>${eq.estadisticas.pj}</td>
            <td>${eq.estadisticas.pg}</td>
            <td>${eq.estadisticas.pe}</td>
            <td>${eq.estadisticas.pp}</td>
            <td>${eq.estadisticas.gf}</td>
            <td>${eq.estadisticas.gc}</td>
            <td>${eq.estadisticas.dg}</td>
            <td><strong>${eq.estadisticas.pts}</strong></td>
        </tr>`).join('') : '<tr><td colspan="10" class="no-data">Sin equipos registrados</td></tr>';

    // 4. Goleadores (Interactivos)
    const divGoleadores = document.getElementById('goleadores-list');
    const goleadores = state.jugadores.filter(j => j.goles > 0).sort((a,b) => b.goles - a.goles).slice(0, 10);
    
    divGoleadores.innerHTML = goleadores.length ? goleadores.map((j, i) => {
        const eq = state.equipos.find(e => e.id === j.equipoId);
        // Agregamos onclick para ver ficha
        return `
            <div class="scorer-card" onclick="verFichaJugador(${j.id})" style="cursor: pointer;">
                <div class="scorer-position ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i+1}</div>
                <div class="scorer-info">
                    <div class="scorer-name">${j.nombre}</div>
                    <div class="scorer-team">${eq?.nombre || '-'}</div>
                </div>
                <div class="scorer-goals">${j.goles}</div>
            </div>`;
    }).join('') : '<div class="no-data-card">Aún no hay goles registrados</div>';
}

function renderizarAdmin() {
    const renderList = (id, items, renderFn) => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = items.length ? items.map(renderFn).join('') : '<p class="no-data">Sin datos</p>';
    };

    renderList('lista-equipos', state.equipos, e => `
        <div class="admin-item"><span>${e.nombre}</span><button class="delete-btn" onclick="eliminarEquipo(${e.id})">X</button></div>`);

    renderList('lista-jugadores', state.jugadores, j => {
        const eq = state.equipos.find(e => e.id === j.equipoId);
        return `<div class="admin-item"><span>${j.nombre} (${eq?.nombre})</span><button class="delete-btn" onclick="eliminarJugador(${j.id})">X</button></div>`;
    });

    renderList('lista-partidos-admin', state.partidos, p => {
        const l = state.equipos.find(e => e.id === p.localId);
        const v = state.equipos.find(e => e.id === p.visitanteId);
        return `<div class="admin-item"><span>${l?.nombre} vs ${v?.nombre} (${new Date(p.fecha).toLocaleDateString()})</span><button class="delete-btn" onclick="eliminarPartido(${p.id})">X</button></div>`;
    });

    actualizarSelectsEquipos();
    actualizarSelectPartidos();
}

function actualizarSelectsEquipos() {
    const options = `<option value="">Seleccionar Equipo</option>` + state.equipos.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
    ['equipo-jugador', 'equipo-local', 'equipo-visitante'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = options;
    });
}

function actualizarSelectPartidos() {
    const el = document.getElementById('select-partido-resultado');
    if(!el) return;
    const pendientes = state.partidos.filter(p => !p.jugado);
    el.innerHTML = `<option value="">Seleccionar Partido</option>` + pendientes.map(p => {
        const l = state.equipos.find(e => e.id === p.localId);
        const v = state.equipos.find(e => e.id === p.visitanteId);
        return `<option value="${p.id}">${l?.nombre} vs ${v?.nombre}</option>`;
    }).join('');
}

function mostrarFormResultado() {
    const partidoId = parseInt(this.value);
    const container = document.getElementById('form-resultado-container');
    if(!partidoId) return container.innerHTML = '';

    const p = state.partidos.find(x => x.id === partidoId);
    const local = state.equipos.find(e => e.id === p.localId);
    const visit = state.equipos.find(e => e.id === p.visitanteId);
    
    container.innerHTML = `
        <div class="result-inputs">
            <div><label>${local.nombre}</label><input type="number" id="goles-local" class="admin-input" min="0" value="0"></div>
            <div><label>${visit.nombre}</label><input type="number" id="goles-visitante" class="admin-input" min="0" value="0"></div>
        </div>
        <button type="button" class="admin-btn" onclick="guardarResultadoSimple(${p.id})">Guardar Marcador</button>
    `;
}

window.guardarResultadoSimple = function(partidoId) {
    const p = state.partidos.find(x => x.id === partidoId);
    const gl = parseInt(document.getElementById('goles-local').value);
    const gv = parseInt(document.getElementById('goles-visitante').value);
    const el = state.equipos.find(e => e.id === p.localId);
    const ev = state.equipos.find(e => e.id === p.visitanteId);

    el.estadisticas.pj++; ev.estadisticas.pj++;
    el.estadisticas.gf+=gl; el.estadisticas.gc+=gv; el.estadisticas.dg = el.estadisticas.gf - el.estadisticas.gc;
    ev.estadisticas.gf+=gv; ev.estadisticas.gc+=gl; ev.estadisticas.dg = ev.estadisticas.gf - ev.estadisticas.gc;

    if(gl > gv) { el.estadisticas.pg++; el.estadisticas.pts+=3; ev.estadisticas.pp++; }
    else if(gv > gl) { ev.estadisticas.pg++; ev.estadisticas.pts+=3; el.estadisticas.pp++; }
    else { el.estadisticas.pe++; ev.estadisticas.pe++; el.estadisticas.pts+=1; ev.estadisticas.pts+=1; }

    p.jugado = true;
    state.resultados.push({ id: Date.now(), partidoId, gl, gv });
    
    guardarDatos(); renderizarAdmin(); renderizarVista();
    document.getElementById('form-resultado-container').innerHTML = '';
    alert('Resultado registrado.');
};

function cambiarTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
}

window.eliminarEquipo = eliminarEquipo;
window.eliminarJugador = eliminarJugador;
window.eliminarPartido = eliminarPartido;