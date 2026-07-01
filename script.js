import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Konfigurasi Firebase dari User
let firebaseConfig;
if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
} else {
    firebaseConfig = {
        apiKey: "AIzaSyCAVt8FSDNN72OtVDjNcX060apWY7um4EI",
        authDomain: "kalender-pendidikan-ad13c.firebaseapp.com",
        projectId: "kalender-pendidikan-ad13c",
        storageBucket: "kalender-pendidikan-ad13c.firebasestorage.app",
        messagingSenderId: "396729831545",
        appId: "1:396729831545:web:6e4c220690f8b9fb0444a8"
    };
}
const appId = typeof __app_id !== 'undefined' ? __app_id : 'kalender-default';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;
let isDataLoaded = false;

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let events = [];
let editingEventId = null; // State untuk mode Edit

const cloudText = document.getElementById('cloud-text');
const cloudStatus = document.getElementById('cloud-status');

function setCloudStatus(status) {
    if (status === 'saving') {
        cloudText.innerText = "Menyimpan...";
        cloudStatus.classList.replace('text-gray-500', 'text-blue-500');
    } else if (status === 'saved') {
        cloudText.innerText = "Tersimpan";
        cloudStatus.classList.replace('text-blue-500', 'text-green-500');
        setTimeout(() => cloudStatus.classList.replace('text-green-500', 'text-gray-500'), 2000);
    } else if (status === 'error') {
        cloudText.innerText = "Gagal simpan!";
        cloudStatus.classList.replace('text-gray-500', 'text-red-500');
    }
}

async function initAuth() {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        setCloudStatus('error');
        if (!isDataLoaded) { loadDefaultEvents(); isDataLoaded = true; }
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) { currentUser = user; loadFromFirestore(); }
});

function loadFromFirestore() {
    if (!currentUser) return;
    const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'settings', 'data');
    
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists() && !isDataLoaded) {
            const data = docSnap.data();
            document.getElementById('input-school').value = data.school || "";
            document.getElementById('input-year').value = data.year || 2026;
            document.getElementById('input-kepsek').value = data.kepsek || "";
            document.getElementById('input-nip').value = data.nip || "";
            document.getElementById('input-ttd-date').value = data.ttdDate || "";
            document.getElementById('input-paper').value = data.paper || "F4";
            document.getElementById('input-orientation').value = data.orientation || "portrait";
            
            if(data.margins) {
                ['top','right','bottom','left'].forEach(p => document.getElementById(`margin-${p}`).value = data.margins[p.charAt(0)] || 10);
            }
            events = data.events || [];
            
            updateLayoutConfig(); updateHeader(); updateSignature(); updateYearAndRender();
            isDataLoaded = true; setCloudStatus('saved');
        } else if (!docSnap.exists() && !isDataLoaded) {
            loadDefaultEvents(); isDataLoaded = true; saveToFirestore();
        }
    });
}

let saveTimeout = null;
function debounceSave() {
    if (!isDataLoaded) return;
    setCloudStatus('saving');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirestore, 1000);
}

function saveToFirestore() {
    if (!currentUser) return;
    const data = {
        school: document.getElementById('input-school').value, year: document.getElementById('input-year').value,
        kepsek: document.getElementById('input-kepsek').value, nip: document.getElementById('input-nip').value,
        ttdDate: document.getElementById('input-ttd-date').value, paper: document.getElementById('input-paper').value,
        orientation: document.getElementById('input-orientation').value,
        margins: {
            t: document.getElementById('margin-top').value, r: document.getElementById('margin-right').value,
            b: document.getElementById('margin-bottom').value, l: document.getElementById('margin-left').value,
        },
        events: events
    };
    setDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'settings', 'data'), data)
        .then(() => setCloudStatus('saved')).catch(() => setCloudStatus('error'));
}

const inputsToListen = [
    'input-school', 'input-year', 'input-kepsek', 'input-nip', 'input-ttd-date',
    'input-paper', 'input-orientation', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left'
];
inputsToListen.forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        if (id.startsWith('margin') || id.startsWith('input-paper') || id.startsWith('input-orientation')) updateLayoutConfig();
        else if (id === 'input-school') updateHeader();
        else if (id.includes('kepsek') || id.includes('nip') || id.includes('ttd')) updateSignature();
        else if (id === 'input-year') updateYearAndRender();
        debounceSave();
    });
});

function updateLayoutConfig() {
    const p = document.getElementById('input-paper').value, o = document.getElementById('input-orientation').value;
    const m = ['top','right','bottom','left'].map(x => document.getElementById(`margin-${x}`).value || 10);
    
    let w = p === 'F4' ? (o === 'portrait' ? '215mm' : '330mm') : (o === 'portrait' ? '210mm' : '297mm');
    let h = p === 'F4' ? (o === 'portrait' ? '330mm' : '215mm') : (o === 'portrait' ? '297mm' : '210mm');

    let style = document.getElementById('dynamic-print-style') || document.createElement('style');
    style.id = 'dynamic-print-style';
    style.innerHTML = `@media print { @page { size: ${w} ${h}; margin: 0; } }`;
    document.head.appendChild(style);

    document.querySelectorAll('.page').forEach(page => {
        page.style.width = w; page.style.height = h; page.style.padding = `${m[0]}mm ${m[1]}mm ${m[2]}mm ${m[3]}mm`;
        page.className = `page ${o}`;
    });
}

function updateHeader() {
    const s = document.getElementById('input-school').value;
    document.getElementById('title-school-1').innerText = s; document.getElementById('title-school-2').innerText = s;
}

function updateSignature() {
    document.querySelectorAll('.kepsek-name-display').forEach(el => el.innerText = document.getElementById('input-kepsek').value);
    document.querySelectorAll('.kepsek-nip-display').forEach(el => el.innerText = "NIP. " + document.getElementById('input-nip').value);
    document.querySelectorAll('.ttd-date-display').forEach(el => el.innerText = document.getElementById('input-ttd-date').value);
}

function updateYearAndRender() {
    const y = parseInt(document.getElementById('input-year').value) || 2026;
    const t = `${y}/${y+1}`;
    document.getElementById('display-year').value = t;
    document.getElementById('title-year-1').innerText = `TAHUN AJARAN ${t}`;
    document.getElementById('title-year-2').innerText = `TAHUN AJARAN ${t}`;
    renderCalendars(y, y + 1);
}

// Global scope untuk Event Handler tombol
window.addOrUpdateEvent = function() {
    const s = document.getElementById('event-start-date').value;
    const e = document.getElementById('event-end-date').value || s;
    const d = document.getElementById('event-desc').value;
    const c = document.getElementById('event-color').value;
    const i = document.getElementById('event-icon').value;
    const isHol = document.getElementById('event-is-holiday').checked;

    if(!s || !d) return alert("Tanggal Mulai dan Keterangan wajib diisi!");

    const eventObj = { id: editingEventId || Date.now().toString(), start: s, end: e, desc: d, color: c, icon: i, isHoliday: isHol };

    if (editingEventId) {
        events = events.map(ev => ev.id === editingEventId ? eventObj : ev);
        window.cancelEdit(); // Reset form
    } else {
        events.push(eventObj);
        document.getElementById('event-start-date').value = '';
        document.getElementById('event-end-date').value = '';
        document.getElementById('event-desc').value = '';
    }
    
    updateYearAndRender();
    debounceSave();
}

window.editEvent = function(id) {
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    
    document.getElementById('event-start-date').value = ev.start;
    document.getElementById('event-end-date').value = ev.end !== ev.start ? ev.end : '';
    document.getElementById('event-desc').value = ev.desc;
    document.getElementById('event-color').value = ev.color;
    document.getElementById('event-icon').value = ev.icon || 'none';
    document.getElementById('event-is-holiday').checked = ev.isHoliday;

    editingEventId = id;
    document.getElementById('form-event-title').innerHTML = '<i class="fas fa-edit text-orange-500"></i> Edit Kegiatan';
    document.getElementById('btn-submit-event').innerText = "Simpan Perubahan";
    document.getElementById('btn-submit-event').classList.replace('bg-blue-600', 'bg-orange-500');
    document.getElementById('btn-submit-event').classList.replace('hover:bg-blue-700', 'hover:bg-orange-600');
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
}

window.cancelEdit = function() {
    editingEventId = null;
    document.getElementById('event-start-date').value = '';
    document.getElementById('event-end-date').value = '';
    document.getElementById('event-desc').value = '';
    document.getElementById('event-icon').value = 'none';
    
    document.getElementById('form-event-title').innerHTML = '<i class="fas fa-calendar-plus text-blue-500"></i> Tambah Kegiatan/Libur';
    document.getElementById('btn-submit-event').innerText = "Simpan";
    document.getElementById('btn-submit-event').classList.replace('bg-orange-500', 'bg-blue-600');
    document.getElementById('btn-submit-event').classList.replace('hover:bg-orange-600', 'hover:bg-blue-700');
    document.getElementById('btn-cancel-edit').classList.add('hidden');
}

window.removeEvent = function(id) {
    events = events.filter(e => e.id !== id);
    if (editingEventId === id) window.cancelEdit();
    updateYearAndRender();
    debounceSave();
}

function renderCalendars(startYear, endYear) {
    document.getElementById('grid-sem1').innerHTML = ''; document.getElementById('grid-sem2').innerHTML = '';
    for (let i = 6; i <= 11; i++) document.getElementById('grid-sem1').appendChild(generateMonthTable(i, startYear));
    for (let i = 0; i <= 5; i++) document.getElementById('grid-sem2').appendChild(generateMonthTable(i, endYear));
    renderLegends(); renderEventListSidebar();
}

function generateMonthTable(monthIndex, year) {
    const container = document.createElement('div');
    container.innerHTML = `
        <div class="flex justify-between items-center bg-gray-100 py-1 px-1 border border-gray-300 border-b-0">
            <span class="font-bold text-xs truncate">${monthNames[monthIndex]} ${year}</span>
            <span class="text-[10px] font-bold text-blue-700 bg-blue-100 px-1 rounded flex-shrink-0" id="he-${year}-${monthIndex}">HE: 0</span>
        </div>
        <table class="calendar-table">
            <thead><tr><th class="weekend">M</th><th>S</th><th>S</th><th>R</th><th>K</th><th>J</th><th class="weekend">S</th></tr></thead>
            <tbody></tbody>
        </table>`;
    
    const tbody = container.querySelector('tbody');
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    let date = 1, effectiveDays = 0;

    for (let i = 0; i < 6; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');
            if (i === 0 && j < firstDay) { /* Kosong */ } 
            else if (date > daysInMonth) { /* Kosong */ } 
            else {
                const dateString = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                let matchedEvent = events.find(ev => {
                    return new Date(dateString).getTime() >= new Date(ev.start).getTime() && 
                           new Date(dateString).getTime() <= new Date(ev.end).getTime();
                });
                
                let isWeekend = (j === 0 || j === 6); // Sabtu & Minggu
                if (isWeekend) cell.classList.add('weekend');

                let dateSpan = document.createElement('span');
                dateSpan.className = "date-number";
                dateSpan.innerText = date;

                // Event HANYA mewarnai hari kerja (Senin - Jumat)
                if (matchedEvent && !isWeekend) {
                    dateSpan.style.backgroundColor = matchedEvent.color;
                    dateSpan.style.color = 'white';
                    dateSpan.style.fontWeight = 'bold';
                    
                    if (matchedEvent.icon && matchedEvent.icon !== 'none') {
                        let iconEl = document.createElement('i');
                        iconEl.className = `fas ${matchedEvent.icon} absolute -top-1.5 -right-1.5 text-[7px] bg-white text-gray-800 rounded-full border border-gray-300 p-[2px] shadow-sm`;
                        dateSpan.appendChild(iconEl);
                    }
                }

                if (!isWeekend && !(matchedEvent && matchedEvent.isHoliday)) {
                    effectiveDays++;
                }
                cell.appendChild(dateSpan);
                date++;
            }
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }
    container.querySelector(`#he-${year}-${monthIndex}`).innerText = `HE:${effectiveDays}`;
    return container;
}

// Algoritma untuk membuang Sabtu & Minggu dari text Keterangan
function getWorkingDaysFormatted(startStr, endStr) {
    let start = new Date(startStr);
    let end = new Date(endStr);
    let validDates = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) validDates.push(new Date(d));
    }

    if (validDates.length === 0) return null;

    let byMonth = {};
    validDates.forEach(d => {
        let m = d.getMonth();
        if (!byMonth[m]) byMonth[m] = [];
        byMonth[m].push(d.getDate());
    });

    let parts = [];
    for (let m in byMonth) {
        let days = byMonth[m];
        let groups = [], currentGroup = [days[0]];
        for (let i = 1; i < days.length; i++) {
            if (days[i] === days[i-1] + 1) currentGroup.push(days[i]);
            else { groups.push(currentGroup); currentGroup = [days[i]]; }
        }
        groups.push(currentGroup);
        
        let str = groups.map(g => g.length === 1 ? g[0] : (g.length === 2 ? `${g[0]}, ${g[1]}` : `${g[0]}-${g[g.length - 1]}`)).join(', ');
        parts.push(`${str} ${monthNames[m]}`);
    }
    return parts.join(' - ');
}

function renderLegends() {
    const sYear = parseInt(document.getElementById('input-year').value) || 2026;
    const l1 = document.getElementById('legend-sem1'), l2 = document.getElementById('legend-sem2');
    l1.innerHTML = ''; l2.innerHTML = '';
    let h1 = false, h2 = false;

    [...events].sort((a, b) => new Date(a.start) - new Date(b.start)).forEach(evt => {
        const d1 = new Date(evt.start);
        
        // Dapatkan string tanggal HANYA hari kerja
        let dateText = getWorkingDaysFormatted(evt.start, evt.end);
        if (!dateText) return; // Jika murni dilakukan saat weekend, hilangkan dari legend

        let iconHtml = evt.icon && evt.icon !== 'none' ? `<i class="fas ${evt.icon} text-white text-[7px]"></i>` : '';
        const itemHtml = `
            <div class="flex items-start gap-1.5 text-[9px] break-words mb-1">
                <div class="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-[1px] flex items-center justify-center shadow-sm" style="background-color: ${evt.color}">
                    ${iconHtml}
                </div>
                <span class="leading-tight text-gray-800"><strong>${dateText}</strong> : ${evt.desc}</span>
            </div>
        `;

        if (d1.getFullYear() === sYear && d1.getMonth() >= 6) { l1.innerHTML += itemHtml; h1 = true; } 
        else if (d1.getFullYear() === sYear + 1 && d1.getMonth() <= 5) { l2.innerHTML += itemHtml; h2 = true; }
    });

    if(!h1) l1.innerHTML = '<span class="text-gray-400 italic text-[10px]">Tidak ada kegiatan di semester ini.</span>';
    if(!h2) l2.innerHTML = '<span class="text-gray-400 italic text-[10px]">Tidak ada kegiatan di semester ini.</span>';
}

function renderEventListSidebar() {
    const sidebar = document.getElementById('event-list-sidebar');
    sidebar.innerHTML = '';
    [...events].sort((a, b) => new Date(a.start) - new Date(b.start)).forEach(evt => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-start bg-white p-2 border rounded";
        div.innerHTML = `
            <div class="flex items-start gap-1.5 w-4/5 text-[10px]">
                <div class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 flex items-center justify-center" style="background-color: ${evt.color}">
                    ${evt.icon && evt.icon !== 'none' ? `<i class="fas ${evt.icon} text-white text-[5px]"></i>` : ''}
                </div>
                <div class="flex flex-col">
                    <span class="font-bold text-gray-700">${evt.start === evt.end ? evt.start : `${evt.start} - ${evt.end}`}</span>
                    <span class="text-gray-500 leading-tight">${evt.desc}</span>
                </div>
            </div>
            <div class="flex gap-1">
                <button onclick="window.editEvent('${evt.id}')" class="text-orange-500 hover:text-orange-700 p-1" title="Edit"><i class="fas fa-edit"></i></button>
                <button onclick="window.removeEvent('${evt.id}')" class="text-red-500 hover:text-red-700 p-1" title="Hapus"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        sidebar.appendChild(div);
    });
}

function loadDefaultEvents() {
    events = [
        { id: '1', start: '2026-07-13', end: '2026-07-15', desc: 'Masa Pengenalan Lingkungan Sekolah', color: '#3b82f6', icon: 'fa-flag', isHoliday: false },
        { id: '2', start: '2026-08-17', end: '2026-08-17', desc: 'HUT Kemerdekaan RI', color: '#ef4444', icon: 'fa-star', isHoliday: true }
    ];
    updateLayoutConfig(); updateHeader(); updateSignature(); updateYearAndRender();
}

initAuth();
