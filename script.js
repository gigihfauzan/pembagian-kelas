        // Global State (DIPOSISIKAN DI ATAS UNTUK KEAMANAN INSTANSIASI)
        let rawStudents = [];
        let distributedClasses = [];
        let activeClassIndex = 0;
        let viewMode = 'list'; // 'list' or 'seating'
        let classConfigurations = []; // To store customized wali kelas name, NIP and class types dynamically.
        let manualStudentCount = 0;
        let lastDeletedStudent = null;
        let lastDeletedClassIndex = -1;

        // Dark Mode
        let isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (!localStorage.getItem('darkMode') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            isDarkMode = true;
        }
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        }

        // Firebase Configuration Terintegrasi Secara Permanen (Sesuai Permintaan Anda)
        const defaultFirebaseConfig = {
            apiKey: "AIzaSyB5IcirgGz6O0yclUseCUO-S_QKSMUvtpc",
            authDomain: "smpn2-kedungbanteng-app.firebaseapp.com",
            projectId: "smpn2-kedungbanteng-app",
            storageBucket: "smpn2-kedungbanteng-app.firebasestorage.app",
            messagingSenderId: "524999715159",
            appId: "1:524999715159:web:6d6398a3e294a4d080b612"
        };

        let db = null;
        let isFirebaseActive = false;
        let authUser = null;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'smpn2-kedungbanteng-app';

        // DOM Elements (DEKLARASI AMAN DI LEVEL ATAS)
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('file-input');
        const btnDemo = document.getElementById('btn-demo');
        const btnTemplate = document.getElementById('btn-template');
        const btnProcess = document.getElementById('btn-process');
        const mainStateCard = document.getElementById('main-state-card');
        const resultCard = document.getElementById('result-card');
        const quickStats = document.getElementById('quick-stats');
        const classTabs = document.getElementById('class-tabs');
        const dynamicContentArea = document.getElementById('dynamic-content-area');
        const toggleListView = document.getElementById('toggle-list-view');
        const toggleComparisonView = document.getElementById('toggle-comparison-view');
        const toggleSeatingView = document.getElementById('toggle-seating-view');
        const btnExportExcel = document.getElementById('btn-export-excel');
        const btnQuickRedistribute = document.getElementById('btn-quick-redistribute');
        const btnPrintAll = document.getElementById('btn-print-all');
        const printArea = document.getElementById('print-area');
        const classSettingsList = document.getElementById('class-settings-list');
        const configClassesInput = document.getElementById('config-classes');
        const btnToggleManual = document.getElementById('btn-toggle-manual');
        const manualEntryPanel = document.getElementById('manual-entry-panel');
        const manualChevron = document.getElementById('manual-chevron');
        const btnAddStudent = document.getElementById('btn-add-student');
        const btnClearForm = document.getElementById('btn-clear-form');
        const btnExportConfig = document.getElementById('btn-export-config');
        const btnImportConfig = document.getElementById('btn-import-config');
        const configFileInput = document.getElementById('config-file-input');

        // Toast Notification System
        function showToast(title, message, type = 'info') {
            const toastContainer = document.getElementById('toast-container');
            if (!toastContainer) return;
            
            const toast = document.createElement('div');
            toast.className = `flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm max-w-sm transition-all duration-300 transform translate-y-2 opacity-0`;
            
            let bgClass = "bg-white border-slate-100";
            let textClass = "text-slate-800";
            let iconMarkup = "";

            if (type === 'success') {
                bgClass = "bg-emerald-50 border-emerald-200";
                textClass = "text-emerald-900";
                iconMarkup = `<i data-lucide="check-circle-2" class="text-emerald-500 w-5 h-5 flex-shrink-0"></i>`;
            } else if (type === 'error') {
                bgClass = "bg-rose-50 border-rose-200";
                textClass = "text-rose-900";
                iconMarkup = `<i data-lucide="alert-triangle" class="text-rose-500 w-5 h-5 flex-shrink-0"></i>`;
            } else {
                bgClass = "bg-blue-50 border-blue-200";
                textClass = "text-blue-900";
                iconMarkup = `<i data-lucide="info" class="text-blue-500 w-5 h-5 flex-shrink-0"></i>`;
            }

            toast.className += ` ${bgClass} ${textClass}`;
            toast.innerHTML = `
                ${iconMarkup}
                <div>
                    <h4 class="font-bold">${title}</h4>
                    <p class="text-xs opacity-90 mt-0.5">${message}</p>
                </div>
            `;

            toastContainer.appendChild(toast);
            toast.classList.add('toast-enter');
            lucide.createIcons({ attrs: { class: 'w-5 h-5' } });
            
            // Animate In
            setTimeout(() => {
                toast.classList.remove('translate-y-2', 'opacity-0');
            }, 50);

            // Animate Out
            setTimeout(() => {
                toast.classList.add('translate-y-2', 'opacity-0');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 4000);
        }

        // Initialize Lucide Icons
        lucide.createIcons();

        // Helper pintar untuk memperlebar keterbacaan nama di denah tempat duduk tanpa kepotong kasar
        function getShortName(fullName) {
            if (!fullName) return '';
            const parts = fullName.trim().split(/\s+/);
            if (parts.length === 1) return parts[0];
            if (parts.length === 2) return parts[0] + ' ' + parts[1];
            // Format 3 kata atau lebih menjadi: Nama Depan + Nama Tengah + Inisial Akhir (Contoh: "Ahmad Fauzi R.")
            return parts[0] + ' ' + parts[1] + ' ' + parts[2].charAt(0) + '.';
        }

        // Helper function: Text Proper Case (Dioptimalkan khusus gelar akademik)
        function toProperCase(str) {
            if (!str) return '';
            let cleanStr = String(str).replace(/\s+/g, ' ').trim();
            // Pisahkan berdasarkan tanda koma terlebih dahulu untuk memisahkan nama dari gelar akademik
            let parts = cleanStr.split(',');
            
            // Proses nama utama (Proper Case)
            let namePart = parts[0].split(' ').map(word => {
                const upper = word.toUpperCase();
                if (['SD', 'SDN', 'MI', 'MIM', 'MIN', 'SMP', 'SMA', 'SMK', 'MA', 'MTS', 'PMB', 'VII', 'VIII', 'IX', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].includes(upper)) {
                    return upper;
                }
                if (word.includes("'")) {
                    return word.split("'").map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("'");
                }
                if (word.includes("-")) {
                    return word.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("-");
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(' ');

            parts[0] = namePart;

            // Proses standarisasi penulisan gelar akademik setelah koma (S.Pd., M.Pd. dsb.)
            for (let i = 1; i < parts.length; i++) {
                let degree = parts[i].trim();
                let lower = degree.toLowerCase().replace(/\./g, '');
                if (lower === 'spd') degree = 'S.Pd.';
                else if (lower === 'mpd') degree = 'M.Pd.';
                else if (lower === 'skom') degree = 'S.Kom.';
                else if (lower === 'mkom') degree = 'M.Kom.';
                else if (lower === 'st') degree = 'S.T.';
                else if (lower === 'mt') degree = 'M.T.';
                else if (lower === 'ssi') degree = 'S.Si.';
                else if (lower === 'msi') degree = 'M.Si.';
                else if (lower === 'se') degree = 'S.E.';
                else if (lower === 'mm') degree = 'M.M.';
                else if (lower === 'sip') degree = 'S.IP.';
                else if (lower === 'spsi') degree = 'S.Psi.';
                else if (lower === 'drs') degree = 'Drs.';
                else if (lower === 'dra') degree = 'Dra.';
                else {
                    degree = degree.charAt(0).toUpperCase() + degree.slice(1);
                }
                parts[i] = ' ' + degree;
            }

            return parts.join(',');
        }

        // Initialize Dynamic Class Configurations
        function initClassConfigurations() {
            if (!configClassesInput) return;
            const classCount = parseInt(configClassesInput.value) || 7;
            const currentConfigs = [...classConfigurations];
            classConfigurations = [];

            classSettingsList.innerHTML = '';

            for (let i = 0; i < classCount; i++) {
                const letter = String.fromCharCode(65 + i); // A, B, C, etc.
                const existing = currentConfigs.find(c => c.letter === letter);

                let defaultType = 'reguler';
                if (i === 6) defaultType = 'prestasi';
                else if (i < 2) defaultType = 'akademik';

                const configObj = {
                    letter: letter,
                    type: existing ? existing.type : defaultType,
                    waliKelas: existing ? existing.waliKelas : `Wali Kelas VII ${letter}`,
                    nip: existing ? existing.nip : ''
                };

                classConfigurations.push(configObj);

                const row = document.createElement('div');
                row.className = "p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col gap-2";
                row.innerHTML = `
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-extrabold text-blue-900">KELAS VII ${letter}</span>
                        <select data-letter="${letter}" class="class-type-select px-2 py-1 text-[11px] bg-white border border-slate-200 rounded font-bold text-slate-700">
                            <option value="reguler" ${configObj.type === 'reguler' ? 'selected' : ''}>Reguler</option>
                            <option value="akademik" ${configObj.type === 'akademik' ? 'selected' : ''}>Akademik (Unggulan)</option>
                            <option value="prestasi" ${configObj.type === 'prestasi' ? 'selected' : ''}>Prestasi (Sertifikat)</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Nama Wali Kelas" data-letter="${letter}" class="class-wali-input px-2 py-1 text-xs border border-slate-200 bg-white rounded" value="${configObj.waliKelas}">
                        <input type="text" placeholder="NIP Wali Kelas" data-letter="${letter}" class="class-nip-input px-2 py-1 text-xs border border-slate-200 bg-white rounded" value="${configObj.nip}">
                    </div>
                `;
                classSettingsList.appendChild(row);
            }

            // Bind update listeners (Dengan pembaruan real-time ke distributedClasses)
            document.querySelectorAll('.class-type-select').forEach(el => {
                el.addEventListener('change', (e) => {
                    const letter = e.target.getAttribute('data-letter');
                    const conf = classConfigurations.find(c => c.letter === letter);
                    if (conf) {
                        conf.type = e.target.value;
                        const dClass = distributedClasses.find(cl => cl.letter === letter);
                        if (dClass) {
                            dClass.type = conf.type;
                            renderClassContent();
                        }
                        triggerAutosave();
                    }
                });
            });
            document.querySelectorAll('.class-wali-input').forEach(el => {
                // Perubahan real-time instan saat mengetik
                el.addEventListener('input', (e) => {
                    const letter = e.target.getAttribute('data-letter');
                    const conf = classConfigurations.find(c => c.letter === letter);
                    if (conf) {
                        conf.waliKelas = e.target.value;
                        const dClass = distributedClasses.find(cl => cl.letter === letter);
                        if (dClass) {
                            dClass.waliKelas = e.target.value;
                            renderClassContent();
                        }
                        triggerAutosave();
                    }
                });
                
                // Formatisasi gelar secara otomatis saat klik diluar/selesai mengetik (blur)
                el.addEventListener('blur', (e) => {
                    const letter = e.target.getAttribute('data-letter');
                    const conf = classConfigurations.find(c => c.letter === letter);
                    if (conf) {
                        conf.waliKelas = toProperCase(e.target.value);
                        e.target.value = conf.waliKelas; // Menampilkan format Proper Case gelar yang benar langsung di layar

                        // Sinkronisasi realtime ke data kelas terdistribusi
                        const dClass = distributedClasses.find(cl => cl.letter === letter);
                        if (dClass) {
                            dClass.waliKelas = conf.waliKelas;
                            renderClassContent();
                        }
                        triggerAutosave();
                    }
                });
            });
            document.querySelectorAll('.class-nip-input').forEach(el => {
                el.addEventListener('input', (e) => {
                    const letter = e.target.getAttribute('data-letter');
                    const conf = classConfigurations.find(c => c.letter === letter);
                    if (conf) {
                        conf.nip = e.target.value;

                        // Sinkronisasi realtime ke data kelas terdistribusi
                        const dClass = distributedClasses.find(cl => cl.letter === letter);
                        if (dClass) {
                            dClass.nip = conf.nip;
                            renderClassContent();
                        }
                        triggerAutosave();
                    }
                });
            });
        }

        // CLOUD FUNCTIONS: Simpan & Muat Config dengan Firestore (Realtime Autosave)
        let saveTimeout = null;
        function triggerAutosave() {
            if (!isFirebaseActive || !authUser) return;

            const indicator = document.getElementById('autosave-indicator');
            if (indicator) {
                indicator.classList.remove('hidden');
                indicator.innerHTML = `<i data-lucide="refresh-cw" class="w-3 h-3 text-blue-500 animate-spin"></i> Menyimpan...`;
                lucide.createIcons();
            }

            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                try {
                    const docData = {
                        tahunAjaran: document.getElementById('config-ta').value,
                        tanggalDokumen: document.getElementById('config-date').value,
                        targetKapasitas: document.getElementById('config-capacity').value,
                        jumlahKelas: document.getElementById('config-classes').value,
                        kepsekNama: document.getElementById('config-kepsek-name').value,
                        kepsekNip: document.getElementById('config-kepsek-nip').value,
                        classConfigurations: classConfigurations,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    // Aturan 1: Gunakan jalur publik yang valid /artifacts/{appId}/public/data/configurations/main_config
                    await db.collection('artifacts')
                        .doc(appId)
                        .collection('public')
                        .doc('data')
                        .collection('configurations')
                        .doc('main_config')
                        .set(docData);
                    
                    if (indicator) {
                        indicator.innerHTML = `<i data-lucide="cloud-lightning" class="w-3 h-3 text-emerald-500"></i> Tersimpan di Cloud`;
                        lucide.createIcons();
                    }
                } catch (err) {
                    console.error("Gagal melakukan sinkronisasi cloud", err);
                    if (indicator) {
                        indicator.innerHTML = `<span class="text-rose-500">Gagal Sinkron</span>`;
                    }
                }
            }, 800);
        }

        async function loadConfigFromFirestore() {
            if (!isFirebaseActive || !authUser) return;

            try {
                // Aturan 1: Ambil data dari jalur yang valid
                const docRef = db.collection('artifacts')
                    .doc(appId)
                    .collection('public')
                    .doc('data')
                    .collection('configurations')
                    .doc('main_config');
                
                const doc = await docRef.get();

                if (doc.exists) {
                    const data = doc.data();
                    
                    document.getElementById('config-ta').value = data.tahunAjaran || '2026/2027';
                    document.getElementById('config-date').value = data.tanggalDokumen || 'Kedungbanteng, 26 Juni 2026';
                    document.getElementById('config-capacity').value = data.targetKapasitas || '32';
                    document.getElementById('config-classes').value = data.jumlahKelas || '7';
                    document.getElementById('config-kepsek-name').value = data.kepsekNama || 'Kepala Sekolah';
                    document.getElementById('config-kepsek-nip').value = data.kepsekNip || 'NIP Kepala Sekolah';

                    if (data.classConfigurations && data.classConfigurations.length > 0) {
                        classConfigurations = data.classConfigurations;
                    }

                    // Muat ulang UI setelan kelas agar sinkron dengan data cloud
                    initClassConfigurations();
                    showToast("Sinkronisasi Sukses", "Konfigurasi terakhir berhasil dimuat dari database cloud.", "success");
                }
            } catch (err) {
                console.error("Gagal membaca konfigurasi cloud", err);
            }
        }

        // Inisialisasi Firebase secara dinamis dan aman
        async function initFirebase() {
            try {
                let configToUse = defaultFirebaseConfig; // Default langsung ke kredensial utama Anda
                
                const savedConfig = localStorage.getItem('reigncast_firebase_config');
                if (savedConfig) {
                    configToUse = JSON.parse(savedConfig);
                }

                if (configToUse && configToUse.projectId) {
                    // MENGATASI CLOUD OFFLINE: Cek jika Firebase belum pernah diinisiasi untuk mencegah error duplikasi instansi
                    if (!firebase.apps.length) {
                        firebase.initializeApp(configToUse);
                    }
                    db = firebase.firestore();
                    const auth = firebase.auth();

                    // Aturan 3: Lakukan otentikasi TERLEBIH DAHULU dan tunggu hingga selesai
                    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                        const userCredential = await auth.signInWithCustomToken(__initial_auth_token);
                        authUser = userCredential.user;
                    } else {
                        const userCredential = await auth.signInAnonymously();
                        authUser = userCredential.user;
                    }

                    if (authUser) {
                        isFirebaseActive = true;
                        
                        // Update Indikator UI ke mode Online
                        const statusDiv = document.getElementById('firebase-status');
                        if (statusDiv) {
                            statusDiv.className = "flex items-center gap-1.5 text-xs bg-emerald-950/40 text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-800 shadow-sm";
                            statusDiv.innerHTML = `
                                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>Cloud Terhubung (Online)</span>
                            `;
                        }
                        
                        // Tampilkan tombol muat data cloud
                        const elLoadCloud = document.getElementById('btn-load-cloud');
                        if (elLoadCloud) elLoadCloud.classList.remove('hidden');

                        // Load Konfigurasi Tersimpan dari Cloud
                        await loadConfigFromFirestore();

                        // Jalankan pengecekan sunyi apakah ada hasil tersimpan sebelumnya di cloud
                        await loadResultFromFirestore(false);
                    }
                }
            } catch (err) {
                console.warn("Firebase gagal terhubung. Menggunakan penyimpanan lokal/memori.", err);
            }
        }

        // CLOUD FUNCTIONS: Simpan & Muat Hasil Pembagian Kelas (Data Hasil Generasi)
        async function saveResultToFirestore() {
            if (!isFirebaseActive || !authUser || distributedClasses.length === 0) return;

            const indicator = document.getElementById('autosave-indicator');
            if (indicator) {
                indicator.classList.remove('hidden');
                indicator.innerHTML = `<i data-lucide="refresh-cw" class="w-3 h-3 text-blue-500 animate-spin"></i> Menyimpan hasil...`;
                lucide.createIcons();
            }

            try {
                const dataToSave = {
                    distributedClasses: distributedClasses.map(c => ({
                        id: c.id,
                        letter: c.letter,
                        name: c.name,
                        type: c.type,
                        waliKelas: c.waliKelas,
                        nip: c.nip,
                        capacity: c.capacity,
                        targetBoys: c.targetBoys,
                        targetGirls: c.targetGirls,
                        students: c.students // Data daftar siswa di dalam kelas
                    })),
                    rawStudents: rawStudents,
                    savedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Menyimpan hasil di jalur: /artifacts/{appId}/public/data/results/latest_distribution
                await db.collection('artifacts')
                    .doc(appId)
                    .collection('public')
                    .doc('data')
                    .collection('results')
                    .doc('latest_distribution')
                    .set(dataToSave);

                if (indicator) {
                    indicator.innerHTML = `<i data-lucide="cloud-lightning" class="w-3 h-3 text-emerald-500"></i> Hasil Tersimpan di Cloud`;
                    lucide.createIcons();
                }
                showToast("Hasil Tersimpan", "Seluruh hasil pembagian kelas baru berhasil diunggah dan disimpan ke database cloud.", "success");
            } catch (err) {
                console.error("Gagal mengunggah hasil pembagian ke cloud:", err);
                showToast("Gagal Menyimpan Hasil", "Terjadi kesalahan saat menyinkronkan hasil pembagian ke cloud.", "error");
            }
        }

        async function loadResultFromFirestore(explicit = false) {
            if (!isFirebaseActive || !authUser) {
                if (explicit) showToast("Database Offline", "Firebase belum aktif atau belum dikonfigurasi.", "error");
                return;
            }

            try {
                const docRef = db.collection('artifacts')
                    .doc(appId)
                    .collection('public')
                    .doc('data')
                    .collection('results')
                    .doc('latest_distribution');
                
                const doc = await docRef.get();
                if (doc.exists) {
                    const data = doc.data();
                    
                    // Pulihkan data siswa mentah
                    if (data.rawStudents && data.rawStudents.length > 0) {
                        rawStudents = data.rawStudents;
                    }

                    // Pulihkan struktur kelas & susun kembali denah tempat duduk secara otomatis
                    if (data.distributedClasses && data.distributedClasses.length > 0) {
                        distributedClasses = data.distributedClasses.map(c => {
                            return {
                                ...c,
                                seating: arrangeSeating(c.students || [])
                            };
                        });

                        activeClassIndex = 0;
                        
                        // Perbarui UI
                        renderStatsPanel();
                        renderClassTabs();
                        renderClassContent();

                        // Tampilkan Kartu Hasil
                        if (mainStateCard) mainStateCard.classList.add('hidden');
                        if (resultCard) resultCard.classList.remove('hidden');
                        if (quickStats) quickStats.classList.remove('hidden');

                        if (explicit) {
                            showToast("Hasil Cloud Dimuat", `Berhasil memulihkan struktur ${distributedClasses.length} kelas beserta data siswanya secara realtime.`, "success");
                        } else {
                            showToast("Sesi Dipulihkan", "Sistem memulihkan hasil pembagian kelas terakhir secara otomatis dari Cloud.", "info");
                        }
                    }
                } else {
                    if (explicit) showToast("Cloud Kosong", "Belum ada riwayat hasil pembagian kelas tersimpan di database Cloud.", "info");
                }
            } catch (err) {
                console.error("Gagal memuat riwayat pembagian dari cloud:", err);
                if (explicit) showToast("Error Gagal Memuat", "Terjadi galat perizinan atau sambungan saat memuat data cloud.", "error");
            }
        }

        // Handle File Upload (READ EXCEL WITH SHEETJS)
        function handleFile(file) {
            const validTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'text/csv'
            ];
            const validExtensions = ['.xlsx', '.xls', '.csv'];
            const fileName = file.name.toLowerCase();
            const isValid = validTypes.includes(file.type) || validExtensions.some(ext => fileName.endsWith(ext));

            if (!isValid) {
                showToast("Format Tidak Didukung", "Silakan unggah file berformat .xlsx, .xls, atau .csv.", "error");
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                    if (jsonData.length === 0) {
                        showToast("File Kosong", "Tidak ditemukan data siswa dalam file yang diunggah.", "error");
                        return;
                    }

                    // Ambil header kolom pertama (NISN) dan kolom terakhir (Prestasi) secara dinamis
                    const colKeys = Object.keys(jsonData[0]);
                    const firstColKey = colKeys[0];
                    const lastColKey = colKeys[colKeys.length - 1];

                    rawStudents = jsonData.map((row, idx) => {
                        // NISN selalu diambil dari kolom pertama file Excel
                        const nisn = String(row[firstColKey] || `0000${idx + 1}`).trim();
                        const namaSiswa = toProperCase(String(row['Nama Siswa'] || row['nama siswa'] || row['NAMA'] || row['Nama'] || ''));
                        const jkRaw = String(row['Jenis Kelamin (P/L)'] || row['Jenis Kelamin'] || row['JK'] || row['jk'] || row['L/P'] || '').trim().toUpperCase();
                        const jenisKelamin = jkRaw.includes('L') && !jkRaw.includes('P') ? 'L' : jkRaw.includes('P') ? 'P' : (Math.random() > 0.5 ? 'L' : 'P');
                        const skorNilai = parseFloat(row['Skor Nilai'] || row['Nilai'] || row['skor'] || row['Score'] || 0) || 0;
                        const namaSekolah = toProperCase(String(row['Nama Sekolah'] || row['nama sekolah'] || row['Asal Sekolah'] || row['Sekolah'] || ''));

                        // Prestasi: coba dari kolom bernama prestasi, JIKA TIDAK KETEMU ambil dari kolom TERAKHIR Excel
                        // Sel kosong = Kosong, isi apapun (SERTIFIKAT/Sertifikat/dll) = Sertifikat
                        let prestasiRaw = String(row['Prestasi Sertifikat'] || row['Prestasi'] || row['prestasi'] || '').trim();
                        if (prestasiRaw === '' && lastColKey !== firstColKey) {
                            prestasiRaw = String(row[lastColKey] || '').trim();
                        }
                        const prestasi = prestasiRaw !== '' ? 'Sertifikat' : 'Kosong';

                        return {
                            nisn,
                            namaSiswa: namaSiswa || `Siswa ${idx + 1}`,
                            jenisKelamin,
                            skorNilai,
                            namaSekolah: namaSekolah || 'SD SEBELUMNYA',
                            prestasi
                        };
                    });

                    // === DATA VALIDATION BLOCK ===
                    let hasWarnings = false;

                    // 1. Duplicate NISN Check
                    const nisnMap = new Map();
                    const duplicateNisns = new Set();
                    rawStudents.forEach(s => {
                        if (nisnMap.has(s.nisn)) {
                            duplicateNisns.add(s.nisn);
                        } else {
                            nisnMap.set(s.nisn, true);
                        }
                    });
                    if (duplicateNisns.size > 0) {
                        hasWarnings = true;
                        const dupArr = [...duplicateNisns];
                        const displayList = dupArr.slice(0, 5).join(', ') + (dupArr.length > 5 ? `, dan ${dupArr.length - 5} lainnya` : '');
                        showToast("NISN Duplikat Ditemukan", `${dupArr.length} NISN duplikat dihapus (pertama dipertahankan): ${displayList}`, "error");
                        const seen = new Set();
                        rawStudents = rawStudents.filter(s => {
                            if (seen.has(s.nisn)) return false;
                            seen.add(s.nisn);
                            return true;
                        });
                    }

                    // 2. Gender Validation
                    let genderFixedCount = 0;
                    rawStudents.forEach(s => {
                        const g = String(s.jenisKelamin).trim().toUpperCase();
                        if (g !== 'L' && g !== 'P') {
                            if (g.includes('L') && !g.includes('P')) {
                                s.jenisKelamin = 'L';
                            } else if (g.includes('P')) {
                                s.jenisKelamin = 'P';
                            } else {
                                s.jenisKelamin = Math.random() > 0.5 ? 'L' : 'P';
                            }
                            genderFixedCount++;
                        }
                    });
                    if (genderFixedCount > 0) {
                        hasWarnings = true;
                        showToast("Jenis Kelamin Diperbaiki", `${genderFixedCount} data jenis kelamin tidak valid telah diperbaiki secara otomatis.`, "error");
                    }

                    // 3. Score Validation — hanya perbaiki NaN/negatif, JANGAN batasi nilai > 100 (skor asli bisa > 100)
                    let scoreFixedCount = 0;
                    rawStudents.forEach(s => {
                        if (isNaN(s.skorNilai) || s.skorNilai < 0) {
                            s.skorNilai = Math.max(0, isNaN(s.skorNilai) ? 0 : s.skorNilai);
                            scoreFixedCount++;
                        }
                    });
                    if (scoreFixedCount > 0) {
                        hasWarnings = true;
                        showToast("Skor Nilai Diperbaiki", `${scoreFixedCount} skor nilai tidak valid (NaN/negatif) telah dikoreksi.`, "error");
                    }

                    // 4. Empty Name Check
                    const beforeCount = rawStudents.length;
                    rawStudents = rawStudents.filter(s => {
                        const name = String(s.namaSiswa).trim();
                        return name !== '' && name !== 'Siswa' && !/^Siswa\s*\d+$/i.test(name);
                    });
                    const emptyRemoved = beforeCount - rawStudents.length;
                    if (emptyRemoved > 0) {
                        hasWarnings = true;
                        showToast("Nama Kosong Dihapus", `${emptyRemoved} data siswa dengan nama kosong telah dihapus.`, "error");
                    }

                    // 5. Summary
                    if (hasWarnings) {
                        showToast("Validasi Selesai", `Data bersih: ${rawStudents.length} siswa siap diproses.`, "info");
                    }
                    // === END DATA VALIDATION BLOCK ===

                    showToast("Data Berhasil Dimuat", `Sebanyak ${rawStudents.length} data siswa berhasil dibaca dari file "${file.name}".`, "success");
                    renderStatsPanel();
                    if (quickStats) quickStats.classList.remove('hidden');
                } catch (err) {
                    console.error("Gagal membaca file Excel:", err);
                    showToast("Gagal Membaca File", "Terjadi kesalahan saat memproses file: " + err.message, "error");
                }
            };
            reader.onerror = function() {
                showToast("Gagal Membaca", "File tidak dapat dibaca. Pastikan file tidak rusak.", "error");
            };
            reader.readAsArrayBuffer(file);
        }

        // Smart School Name Normalization
        function normalizeSchool(name) {
            if (!name) return "SD SEBELUMNYA";
            let clean = name.toLowerCase().trim();

            clean = clean.replace(/sekolah dasar negeri|sekolah dasar negri|sd negeri|sd negri|sd\s+n\s*/g, 'sd ');
            clean = clean.replace(/madrasah ibtidaiyah muhammadiyah|mi muhammadiyah|mim\s*/g, 'mim ');
            clean = clean.replace(/madrasah ibtidaiyah ma'arif|madrasah ibtidaiyah maarif|mi ma'arif|mi maarif/g, 'mi maarif');
            clean = clean.replace(/madrasah ibtidaiyah|mi\s+n|mi\s*/g, 'mi ');
            clean = clean.replace(/sd\s+isla+m/g, 'sd islam');
            clean = clean.replace(/sd\s+swasta/g, 'sd swasta');

            clean = clean.replace(/[^a-z0-9\s]/g, '');
            clean = clean.replace(/\s+/g, ' ').trim();

            return clean.toUpperCase();
        }

        // DISTRIBUTION ALGORITHM UTILIZING CUSTOM CLASS ALLOCATION
        function processAndDistribute() {
            if (rawStudents.length === 0) return;

            // Show loading overlay
            const loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = '<div class="text-center"><div class="spinner mx-auto mb-4"></div><p class="text-slate-600 font-semibold text-sm">Menyusun pembagian kelas...</p><p class="text-slate-400 text-xs mt-1">Mohon tunggu sebentar</p></div>';
            document.body.appendChild(loadingOverlay);

            const capacityPerClass = parseInt(document.getElementById('config-capacity').value);
            const classCountInput = parseInt(document.getElementById('config-classes').value);

            const totalStudents = rawStudents.length;
            const classCount = Math.max(classCountInput, Math.ceil(totalStudents / capacityPerClass));

            if (classCount > classCountInput) {
                showToast("Penyesuaian Kelas", `Jumlah kelas disesuaikan menjadi ${classCount} agar dapat menampung ${totalStudents} siswa secara adil.`, "info");
                document.getElementById('config-classes').value = classCount;
                initClassConfigurations();
            }

            let classes = [];
            classConfigurations.forEach((conf) => {
                classes.push({
                    id: conf.letter,
                    letter: conf.letter,
                    name: `VII ${conf.letter}`,
                    type: conf.type,
                    waliKelas: conf.waliKelas,
                    nip: conf.nip,
                    students: [],
                    capacity: capacityPerClass,
                    targetBoys: 0,
                    targetGirls: 0
                });
            });

            let pool = rawStudents.map(s => ({ ...s, normalizedSchool: normalizeSchool(s.namaSekolah) }));
            const totalL = pool.filter(s => s.jenisKelamin === 'L').length;
            const totalP = pool.filter(s => s.jenisKelamin === 'P').length;

            let remainingL = totalL;
            let remainingP = totalP;

            classes.forEach((c, idx) => {
                if (idx < classCount - 1) {
                    const ratioL = remainingL / (remainingL + remainingP || 1);
                    let idealB = ratioL * c.capacity;

                    let targetB = 2 * Math.round(idealB / 2);

                    if (targetB > remainingL) {
                        targetB = 2 * Math.floor(remainingL / 2);
                    }
                    if (c.capacity - targetB > remainingP) {
                        const neededP = c.capacity - targetB;
                        const diff = neededP - remainingP;
                        targetB += 2 * Math.ceil(diff / 2);
                    }

                    targetB = Math.max(0, Math.min(c.capacity, targetB));
                    let targetG = c.capacity - targetB;

                    c.targetBoys = targetB;
                    c.targetGirls = targetG;

                    remainingL -= targetB;
                    remainingP -= targetG;
                } else {
                    c.targetBoys = remainingL;
                    c.targetGirls = remainingP;
                }
            });

            let prestasiBoys = pool.filter(s => s.prestasi === 'Sertifikat' && s.jenisKelamin === 'L');
            let prestasiGirls = pool.filter(s => s.prestasi === 'Sertifikat' && s.jenisKelamin === 'P');
            
            let mainBoys = pool.filter(s => s.prestasi !== 'Sertifikat' && s.jenisKelamin === 'L');
            let mainGirls = pool.filter(s => s.prestasi !== 'Sertifikat' && s.jenisKelamin === 'P');

            classes.forEach(c => {
                if (c.type === 'prestasi') {
                    const boysToTake = Math.min(c.targetBoys, prestasiBoys.length);
                    const takenBoys = prestasiBoys.splice(0, boysToTake);
                    c.students.push(...takenBoys);

                    const girlsToTake = Math.min(c.targetGirls, prestasiGirls.length);
                    const takenGirls = prestasiGirls.splice(0, girlsToTake);
                    c.students.push(...takenGirls);
                }
            });

            mainBoys = [...mainBoys, ...prestasiBoys];
            mainGirls = [...mainGirls, ...prestasiGirls];

            mainBoys.sort((a, b) => b.skorNilai - a.skorNilai);
            mainGirls.sort((a, b) => b.skorNilai - a.skorNilai);

            classes.forEach(c => {
                if (c.type === 'akademik') {
                    const curBoys = c.students.filter(s => s.jenisKelamin === 'L').length;
                    const curGirls = c.students.filter(s => s.jenisKelamin === 'P').length;

                    const boysNeeded = c.targetBoys - curBoys;
                    const girlsNeeded = c.targetGirls - curGirls;

                    if (boysNeeded > 0) {
                        const takenBoys = mainBoys.splice(0, boysNeeded);
                        c.students.push(...takenBoys);
                    }
                    if (girlsNeeded > 0) {
                        const takenGirls = mainGirls.splice(0, girlsNeeded);
                        c.students.push(...takenGirls);
                    }
                }
            });

            const getSchoolGroups = (genderPool) => {
                const groups = {};
                genderPool.forEach(student => {
                    if (!groups[student.normalizedSchool]) {
                        groups[student.normalizedSchool] = [];
                    }
                    groups[student.normalizedSchool].push(student);
                });
                return groups;
            };

            let boyGroups = getSchoolGroups(mainBoys);
            let girlGroups = getSchoolGroups(mainGirls);

            const distributeGenderGroups = (groups, isBoys) => {
                let sortedSchools = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

                sortedSchools.forEach(school => {
                    let students = groups[school];

                    while (students.length > 0) {
                        let eligibleClasses = classes.filter(c => {
                            const currentOfGender = c.students.filter(s => s.jenisKelamin === (isBoys ? 'L' : 'P')).length;
                            const targetOfGender = isBoys ? c.targetBoys : c.targetGirls;
                            return currentOfGender < targetOfGender;
                        }).sort((a, b) => {
                            const currentA = a.students.filter(s => s.jenisKelamin === (isBoys ? 'L' : 'P')).length;
                            const currentB = b.students.filter(s => s.jenisKelamin === (isBoys ? 'L' : 'P')).length;
                            return currentA - currentB;
                        });

                        let bestClass = eligibleClasses[0];
                        if (!bestClass) break;

                        const targetOfGender = isBoys ? bestClass.targetBoys : bestClass.targetGirls;
                        const currentOfGender = bestClass.students.filter(s => s.jenisKelamin === (isBoys ? 'L' : 'P')).length;
                        const spaceLeft = targetOfGender - currentOfGender;

                        const takeCount = Math.min(students.length >= 2 ? 2 : 1, spaceLeft);
                        const batch = students.splice(0, takeCount);

                        bestClass.students.push(...batch);
                    }
                });
            };

            distributeGenderGroups(boyGroups, true);
            distributeGenderGroups(girlGroups, false);

            let allAssignedIds = new Set();
            classes.forEach(c => c.students.forEach(s => allAssignedIds.add(s.nisn)));

            let safetyLeftovers = pool.filter(s => !allAssignedIds.has(s.nisn));
            if (safetyLeftovers.length > 0) {
                safetyLeftovers.forEach(s => {
                    let bestClass = classes.filter(c => c.students.length < c.capacity)
                        .sort((a, b) => a.students.length - b.students.length)[0];
                    if (bestClass) {
                        bestClass.students.push(s);
                    }
                });
            }

            classes.forEach(c => {
                c.students.sort((a, b) => a.namaSiswa.localeCompare(b.namaSiswa));
                c.seating = arrangeSeating(c.students || []);
            });

            distributedClasses = classes;
            activeClassIndex = 0;

            renderStatsPanel();
            renderClassTabs();
            renderClassContent();

            if (mainStateCard) mainStateCard.classList.add('hidden');
            if (resultCard) resultCard.classList.remove('hidden');
            if (quickStats) quickStats.classList.remove('hidden');

            // Remove loading overlay
            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.remove();

            // Auto-scroll to results
            if (resultCard) {
                resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            showToast("Pembagian Selesai", "Siswa berhasil didistribusikan secara proporsional dan genap berpasangan.", "success");

            // Launch confetti celebration
            launchConfetti();

            // Otomatis mengunggah dan mengamankan data hasil pembagian di cloud Firebase
            saveResultToFirestore();
        }

        // Seating Arrangement Generator (Pairing L-L, P-P)
        function arrangeSeating(students) {
            const boys = students.filter(s => s.jenisKelamin === 'L');
            const girls = students.filter(s => s.jenisKelamin === 'P');

            let pairs = [];

            while (boys.length >= 2) {
                pairs.push([boys.shift(), boys.shift()]);
            }
            while (girls.length >= 2) {
                pairs.push([girls.shift(), girls.shift()]);
            }

            if (boys.length > 0 && girls.length > 0) {
                pairs.push([boys.shift(), girls.shift()]); 
            } else if (boys.length > 0) {
                pairs.push([boys.shift(), null]); 
            } else if (girls.length > 0) {
                pairs.push([girls.shift(), null]); 
            }

            return pairs;
        }

        // Confetti Animation on Distribution Complete
        function launchConfetti() {
            const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
            const container = document.createElement('div');
            container.id = 'confetti-container';
            container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999999;overflow:hidden;';
            document.body.appendChild(container);

            const particles = [];
            const particleCount = 90;

            for (let i = 0; i < particleCount; i++) {
                const p = document.createElement('div');
                const size = 6 + Math.random() * 4;
                const color = colors[Math.floor(Math.random() * colors.length)];
                const opacity = 0.5 + Math.random() * 0.5;
                const x = window.innerWidth / 2 + (Math.random() - 0.5) * 200;
                const vx = (Math.random() - 0.5) * 12;
                const vy = 2 + Math.random() * 6;
                const rotation = Math.random() * 360;
                const rotSpeed = (Math.random() - 0.5) * 15;

                p.style.cssText = `position:absolute;left:${x}px;top:-10px;width:${size}px;height:${size}px;background:${color};border-radius:50%;opacity:${opacity};`;
                container.appendChild(p);

                particles.push({ el: p, x: x, y: -10, vx: vx, vy: vy, rotation: rotation, rotSpeed: rotSpeed });
            }

            const startTime = performance.now();
            const duration = 3000;

            function animate(now) {
                const elapsed = now - startTime;
                if (elapsed > duration) {
                    container.remove();
                    return;
                }

                const progress = elapsed / duration;
                particles.forEach(p => {
                    p.x += p.vx;
                    p.vy += 0.15;
                    p.y += p.vy;
                    p.rotation += p.rotSpeed;
                    p.vx *= 0.99;

                    const fadeOut = progress > 0.7 ? 1 - ((progress - 0.7) / 0.3) : 1;
                    p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg)`;
                    p.el.style.opacity = fadeOut;
                    p.el.style.left = '0px';
                    p.el.style.top = '0px';
                });

                requestAnimationFrame(animate);
            }
            requestAnimationFrame(animate);
        }

        // Render Stats Panel
        function animateCounter(elementId, targetValue) {
            const el = document.getElementById(elementId);
            if (!el) return;
            const startValue = parseInt(el.innerText) || 0;
            const duration = 600;
            const startTime = performance.now();
            
            function update(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                const current = Math.round(startValue + (targetValue - startValue) * eased);
                el.innerText = current;
                if (progress < 1) requestAnimationFrame(update);
            }
            requestAnimationFrame(update);
        }

        function renderStatsPanel() {
            const total = rawStudents.length;
            const boys = rawStudents.filter(s => s.jenisKelamin === 'L').length;
            const girls = rawStudents.filter(s => s.jenisKelamin === 'P').length;
            const prestasi = rawStudents.filter(s => s.prestasi === 'Sertifikat').length;

            animateCounter('stat-total-students', total);
            animateCounter('stat-boys', boys);
            animateCounter('stat-girls', girls);
            animateCounter('stat-prestasi', prestasi);
        }

        // Render Class Letter Tabs
        function renderClassTabs() {
            classTabs.innerHTML = '';
            distributedClasses.forEach((c, idx) => {
                const btn = document.createElement('button');
                btn.className = `class-tab-btn relative px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 border ${
                    idx === activeClassIndex 
                    ? 'bg-blue-900 text-white border-blue-900 shadow-sm tab-active' 
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`;

                let badgeColor = "bg-slate-200 text-slate-700";
                let badgeLabel = "REG";
                if (c.type === 'akademik') {
                    badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
                    badgeLabel = "AKAD";
                } else if (c.type === 'prestasi') {
                    badgeColor = "bg-indigo-100 text-indigo-800 border-indigo-200";
                    badgeLabel = "PRES";
                }

                const tabCapacity = c.capacity || 32;
                const tabFillCount = c.students ? c.students.length : 0;
                const tabFillPct = Math.min(100, (tabFillCount / tabCapacity) * 100);

                btn.innerHTML = `
                    <div class="flex flex-col items-center leading-tight">
                        <span>Kelas VII ${c.letter}</span>
                        <span class="text-[8px] text-slate-400 font-semibold">${tabFillCount}/${tabCapacity}</span>
                    </div>
                    <span class="text-[9px] px-1 py-0.5 rounded font-extrabold border ${badgeColor}">${badgeLabel}</span>
                    <span class="text-[10px] opacity-70">(${tabFillCount})</span>
                    <div style="position:absolute;bottom:0;left:0;right:0;height:2px;border-radius:0 0 12px 12px;overflow:hidden;background:rgba(0,0,0,0.05);">
                        <div style="width:${tabFillPct}%;height:100%;background:${tabFillPct >= 90 ? '#22c55e' : tabFillPct >= 60 ? '#f59e0b' : '#ef4444'};border-radius:0 0 12px 12px;transition:width 0.3s;"></div>
                    </div>
                `;

                btn.addEventListener('click', () => {
                    activeClassIndex = idx;
                    renderClassTabs();
                    renderClassContent();
                });

                classTabs.appendChild(btn);
            });
        }

        // View Mode selection
        function setViewMode(mode) {
            viewMode = mode;
            const inactiveClass = "px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-800 transition flex items-center gap-1.5";
            const activeClass = "px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition flex items-center gap-1.5";

            if (toggleListView) toggleListView.className = mode === 'list' ? activeClass : inactiveClass;
            if (toggleComparisonView) toggleComparisonView.className = mode === 'comparison' ? activeClass : inactiveClass;
            if (toggleSeatingView) toggleSeatingView.className = mode === 'seating' ? activeClass : inactiveClass;

            // Show/hide class tabs based on mode
            if (classTabs) {
                classTabs.style.display = mode === 'comparison' ? 'none' : '';
            }

            renderClassContent();
        }

        // Render Class Details
        function renderClassContent() {
            // COMPARISON VIEW — render summary table & insight cards
            if (viewMode === 'comparison') {
                renderComparisonPanel();
                return;
            }

            const activeClass = distributedClasses[activeClassIndex];
            if (!activeClass) return;

            const currentStudents = activeClass.students || [];
            const currentSeating = activeClass.seating || [];

            const boysCount = currentStudents.filter(s => s.jenisKelamin === 'L').length;
            const girlsCount = currentStudents.filter(s => s.jenisKelamin === 'P').length;
            const avgScore = (currentStudents.reduce((acc, s) => acc + s.skorNilai, 0) / currentStudents.length || 0).toFixed(1);

            let html = '';

            // Capacity calculation
            const capacity = activeClass.capacity || 32;
            const fillCount = currentStudents.length;
            const fillPct = Math.min(100, (fillCount / capacity) * 100);
            let capacityColor = 'bg-emerald-500';
            if (fillPct < 60) capacityColor = 'bg-red-500';
            else if (fillPct < 90) capacityColor = 'bg-amber-500';

            html += `
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                    <div>
                        <span class="text-xs text-slate-500 block">Total Siswa</span>
                        <span class="font-extrabold text-slate-800 text-base">${currentStudents.length} Siswa</span>
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 block">Komposisi Gender</span>
                        <span class="font-bold text-slate-700 text-sm">${boysCount} L / ${girlsCount} P</span>
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 block">Rata-rata Nilai</span>
                        <span class="font-bold text-amber-600 text-sm flex items-center gap-1">
                            <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-500 text-amber-500"></i> ${avgScore}
                        </span>
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 block">Wali Kelas</span>
                        <span class="font-bold text-blue-800 text-sm truncate block" title="${activeClass.waliKelas || ''}">${activeClass.waliKelas || '-'}</span>
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 block">Kapasitas</span>
                        <span class="font-extrabold text-slate-800 text-sm">${fillCount} / ${capacity} Siswa</span>
                        <div class="w-full bg-slate-200 rounded-full h-2 mt-1">
                            <div class="${capacityColor} h-2 rounded-full transition-all duration-500" style="width:${fillPct}%"></div>
                        </div>
                    </div>
                </div>
            `;

            if (viewMode === 'list') {
                html += `
                    <div class="flex items-center gap-3 mb-4">
                        <div class="relative flex-1">
                            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                            <input type="text" id="student-search-input" placeholder="Cari nama siswa atau sekolah..." class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pl-10">
                        </div>
                        <span id="selected-count" class="hidden text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full whitespace-nowrap"></span>
                    </div>
                    <div id="student-table-container" class="overflow-x-auto rounded-xl border border-slate-100">
                        <!-- Kolom disesuaikan lebar persentasenya sesuai request di web view agar seragam -->
                        <table class="w-full text-xs text-left table-fixed">
                            <thead class="bg-slate-100 text-slate-700 text-[10px] uppercase font-extrabold">
                                <tr>
                                    <th class="px-2 py-3 text-center w-[4%]"><input type="checkbox" onchange="toggleSelectAll(this.checked)" class="rounded" title="Pilih Semua"></th>
                                    <th class="px-3 py-3 text-center w-[4%]">NO</th>
                                    <th class="px-3 py-3 w-[9%]">NISN</th>
                                    <th class="px-3 py-3 w-[32%]">NAMA SISWA</th>
                                    <th class="px-3 py-3 text-center w-[4%]">JK</th>
                                    <th class="px-3 py-3 w-[29%]">ASAL SEKOLAH</th>
                                    <th class="px-1 py-3 text-center w-[8%]">AKSI</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 text-slate-700" id="student-tbody">
                `;

                currentStudents.forEach((s, idx) => {
                    const bgRow = idx % 2 === 0 ? "bg-white" : "bg-slate-50/50";

                    html += `
                        <tr class="${bgRow} hover:bg-slate-50 transition-colors" data-searchable onmouseenter="showStudentTooltip(${idx}, event)" onmouseleave="hideStudentTooltip()">
                            <td class="px-2 py-2 text-center"><input type="checkbox" class="student-checkbox rounded" data-idx="${idx}"></td>
                            <td class="px-3 py-2 font-bold text-slate-400 text-center student-no">${idx + 1}</td>
                            <td class="px-3 py-2 font-mono font-semibold text-slate-600">${s.nisn}</td>
                            <td class="px-3 py-2 font-bold text-slate-900 truncate cursor-help" title="${s.namaSiswa}">${s.namaSiswa}</td>
                            <td class="px-4 py-2 text-center">
                                <span class="px-2 py-0.5 rounded text-[10px] font-extrabold ${s.jenisKelamin === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}">
                                    ${s.jenisKelamin}
                                </span>
                            </td>
                            <td class="px-4 py-2 text-slate-600 font-medium truncate" title="${s.namaSekolah}">${s.namaSekolah}</td>
                            <td class="px-2 py-2 text-center">
                                <div class="flex items-center justify-center gap-1">
                                    <button onclick="editStudent(${idx})" class="student-action-btn p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition" title="Edit Siswa">
                                        <i data-lucide="pencil" class="w-3 h-3"></i>
                                    </button>
                                    <button onclick="moveStudent(${idx})" class="student-action-btn p-1.5 rounded-lg hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition" title="Pindahkan Kelas">
                                        <i data-lucide="arrow-right-left" class="w-3 h-3"></i>
                                    </button>
                                    <button onclick="deleteStudent(${idx})" class="student-action-btn p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition" title="Hapus Siswa">
                                        <i data-lucide="trash-2" class="w-3 h-3"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });

                html += `
                            </tbody>
                        </table>
                        <div id="no-results-message" class="hidden text-center py-8 text-slate-400 text-sm">
                            <i data-lucide="search-x" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                            <p class="font-semibold">Tidak ditemukan siswa yang cocok</p>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-inner">
                        <div class="w-full bg-slate-800 text-slate-400 text-center py-2 rounded-xl font-bold border border-slate-700 mb-8 shadow relative flex items-center justify-center gap-2 text-xs">
                            <i data-lucide="presentation" class="w-4 h-4 text-slate-400"></i>
                            Papan Tulis & Meja Guru (Depan Kelas)
                        </div>

                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                `;

                currentSeating.forEach((pair, pairIdx) => {
                    const studentLeft = pair[0];
                    const studentRight = pair[1];

                    html += `
                        <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700 shadow flex flex-col justify-between">
                            <div class="text-center text-[9px] font-extrabold text-slate-500 mb-2.5 uppercase tracking-wider pb-1 border-b border-slate-700">Meja ${pairIdx + 1}</div>
                            
                            <div class="grid grid-cols-2 gap-1.5">
                                ${studentLeft ? `
                                    <div class="p-1.5 rounded-lg text-center ${studentLeft.jenisKelamin === 'L' ? 'bg-blue-950/80 border border-blue-800 text-blue-200' : 'bg-rose-950/80 border border-rose-800 text-rose-200'}">
                                        <div class="w-4 h-4 rounded-full ${studentLeft.jenisKelamin === 'L' ? 'bg-blue-600 text-white' : 'bg-pink-600 text-white'} flex items-center justify-center text-[8px] font-extrabold mx-auto mb-1">
                                            ${studentLeft.jenisKelamin}
                                        </div>
                                        <div class="text-[10px] font-bold truncate tracking-tight" title="${studentLeft.namaSiswa}">${getShortName(studentLeft.namaSiswa)}</div>
                                        <div class="text-[8px] opacity-75 mt-0.5 truncate">${studentLeft.namaSekolah}</div>
                                    </div>
                                ` : `
                                    <div class="p-1.5 rounded-lg text-center border border-dashed border-slate-700 bg-slate-900/40 text-slate-600 flex flex-col justify-center items-center min-h-[50px]">
                                        <span class="text-[9px] font-bold">Kosong</span>
                                    </div>
                                `}

                                ${studentRight ? `
                                    <div class="p-1.5 rounded-lg text-center ${studentRight.jenisKelamin === 'L' ? 'bg-blue-950/80 border border-blue-800 text-blue-200' : 'bg-rose-950/80 border border-rose-800 text-rose-200'}">
                                        <div class="w-4 h-4 rounded-full ${studentRight.jenisKelamin === 'L' ? 'bg-blue-600 text-white' : 'bg-pink-600 text-white'} flex items-center justify-center text-[8px] font-extrabold mx-auto mb-1">
                                            ${studentRight.jenisKelamin}
                                        </div>
                                        <div class="text-[10px] font-bold truncate tracking-tight" title="${studentRight.namaSiswa}">${getShortName(studentRight.namaSiswa)}</div>
                                        <div class="text-[8px] opacity-75 mt-0.5 truncate">${studentRight.namaSekolah}</div>
                                    </div>
                                ` : `
                                    <div class="p-1.5 rounded-lg text-center border border-dashed border-slate-700 bg-slate-900/40 text-slate-600 flex flex-col justify-center items-center min-h-[50px]">
                                        <span class="text-[9px] font-bold">Kosong</span>
                                    </div>
                                `}
                            </div>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            }

            dynamicContentArea.innerHTML = html;
            lucide.createIcons();

            // Attach search/filter event listener for list view
            if (viewMode === 'list') {
                const searchInput = document.getElementById('student-search-input');
                if (searchInput) {
                    searchInput.addEventListener('input', function() {
                        const query = this.value.toLowerCase().trim();
                        const rows = dynamicContentArea.querySelectorAll('tr[data-searchable]');
                        const noResults = document.getElementById('no-results-message');
                        let visibleCount = 0;
                        rows.forEach(row => {
                            const nameCell = row.querySelector('td:nth-child(4)');
                            const schoolCell = row.querySelector('td:nth-child(6)');
                            const name = nameCell ? nameCell.textContent.toLowerCase() : '';
                            const school = schoolCell ? schoolCell.textContent.toLowerCase() : '';
                            const match = !query || name.includes(query) || school.includes(query);
                            row.style.display = match ? '' : 'none';
                            if (match) {
                                visibleCount++;
                                row.querySelector('.student-no').textContent = visibleCount;
                            }
                        });
                        if (noResults) {
                            noResults.classList.toggle('hidden', visibleCount > 0);
                        }
                    });
                }
                // Attach individual checkbox change listeners
                dynamicContentArea.querySelectorAll('.student-checkbox').forEach(cb => {
                    cb.addEventListener('change', updateSelectionUI);
                });
            }
        }

        // Render Comparison Panel (Ringkasan Perbandingan Antar Kelas)
        function renderComparisonPanel() {
            if (distributedClasses.length === 0) {
                dynamicContentArea.innerHTML = '<p class="text-center text-slate-400 py-8">Belum ada data kelas untuk dibandingkan.</p>';
                return;
            }

            // Compute per-class stats
            const stats = distributedClasses.map(c => {
                const students = c.students || [];
                const total = students.length;
                const boys = students.filter(s => s.jenisKelamin === 'L').length;
                const girls = students.filter(s => s.jenisKelamin === 'P').length;
                const avg = total > 0 ? (students.reduce((acc, s) => acc + (s.skorNilai || 0), 0) / total) : 0;
                const uniqueSchools = new Set(students.map(s => s.namaSekolah)).size;
                const prestasiCount = students.filter(s => s.prestasi === 'Sertifikat').length;
                let typeLabel = 'Reguler';
                if (c.type === 'akademik') typeLabel = 'Akademik';
                else if (c.type === 'prestasi') typeLabel = 'Prestasi';
                return { name: `VII ${c.letter}`, letter: c.letter, type: typeLabel, total, boys, girls, avg, uniqueSchools, prestasiCount };
            });

            // Find best avg score
            const maxAvg = Math.max(...stats.map(s => s.avg));

            // Build table rows
            let rowsHtml = '';
            stats.forEach((s, idx) => {
                const bgRow = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                const isBest = s.avg === maxAvg && maxAvg > 0;
                const avgCellClass = isBest ? 'bg-emerald-50 text-emerald-700 font-extrabold' : 'text-slate-700 font-semibold';
                const pctL = s.total > 0 ? ((s.boys / s.total) * 100).toFixed(0) : 0;
                const pctP = s.total > 0 ? ((s.girls / s.total) * 100).toFixed(0) : 0;

                rowsHtml += `
                    <tr class="${bgRow} hover:bg-blue-50/40 transition-colors">
                        <td class="px-3 py-2.5 font-extrabold text-slate-800 whitespace-nowrap">${s.name}</td>
                        <td class="px-3 py-2.5 text-slate-600">
                            <span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold ${s.type === 'Akademik' ? 'bg-amber-100 text-amber-800 border border-amber-200' : s.type === 'Prestasi' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}">${s.type}</span>
                        </td>
                        <td class="px-3 py-2.5 font-bold text-center text-slate-800">${s.total}</td>
                        <td class="px-3 py-2.5 font-bold text-center text-blue-700">${s.boys}</td>
                        <td class="px-3 py-2.5 font-bold text-center text-pink-700">${s.girls}</td>
                        <td class="px-3 py-2.5 text-center ${avgCellClass}">${s.avg.toFixed(1)}</td>
                        <td class="px-3 py-2.5 text-center font-semibold text-slate-700">${s.uniqueSchools}</td>
                        <td class="px-3 py-2.5 text-center font-semibold text-slate-700">${s.prestasiCount}</td>
                        <td class="px-3 py-2.5 min-w-[80px]">
                            <div class="flex h-3 rounded-full overflow-hidden bg-slate-100">
                                <div class="bg-blue-500" style="width:${pctL}%" title="Laki-laki ${pctL}%"></div>
                                <div class="bg-pink-400" style="width:${pctP}%" title="Perempuan ${pctP}%"></div>
                            </div>
                        </td>
                    </tr>
                `;
            });

            // Compute insight cards
            // 1. Kelas Terseimbang — closest L/P ratio to 1.0
            let balancedClass = stats[0];
            let minRatioDiff = Infinity;
            stats.forEach(s => {
                const ratio = s.girls > 0 ? s.boys / s.girls : (s.boys > 0 ? Infinity : 0);
                const diff = Math.abs(ratio - 1.0);
                if (diff < minRatioDiff) {
                    minRatioDiff = diff;
                    balancedClass = s;
                }
            });
            const balancedRatio = balancedClass.girls > 0 ? (balancedClass.boys / balancedClass.girls).toFixed(2) : (balancedClass.boys > 0 ? '∞' : '-');

            // 2. Rata-rata Tertinggi
            const bestAvgClass = stats.reduce((best, s) => s.avg > best.avg ? s : best, stats[0]);

            // 3. Sekolah Paling Beragam
            const diverseClass = stats.reduce((best, s) => s.uniqueSchools > best.uniqueSchools ? s : best, stats[0]);

            let html = '';
            html += `
                <div class="mb-5 flex items-center gap-2">
                    <i data-lucide="bar-chart-3" class="w-5 h-5 text-blue-600"></i>
                    <h3 class="font-extrabold text-lg text-slate-900">Ringkasan Perbandingan Antar Kelas</h3>
                </div>

                <div class="overflow-x-auto rounded-xl border border-slate-100 mb-6">
                    <table class="w-full text-xs text-left">
                        <thead>
                            <tr class="bg-slate-800 text-white text-[10px] uppercase tracking-wider font-extrabold">
                                <th class="px-3 py-3">Kelas</th>
                                <th class="px-3 py-3">Tipe</th>
                                <th class="px-3 py-3 text-center">Total</th>
                                <th class="px-3 py-3 text-center">L</th>
                                <th class="px-3 py-3 text-center">P</th>
                                <th class="px-3 py-3 text-center">Rata-rata Nilai</th>
                                <th class="px-3 py-3 text-center">Jumlah Sekolah Asal</th>
                                <th class="px-3 py-3 text-center">Siswa Prestasi</th>
                                <th class="px-3 py-3 text-center">L / P</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-100 flex items-start gap-3 insight-card">
                        <div class="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                            <i data-lucide="scale" class="w-5 h-5 text-blue-600"></i>
                        </div>
                        <div>
                            <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Kelas Terseimbang</p>
                            <p class="text-sm font-extrabold text-slate-900">${balancedClass.name}</p>
                            <p class="text-xs text-slate-600 mt-0.5">Rasio L/P: <span class="font-bold text-blue-700">${balancedRatio}</span></p>
                        </div>
                    </div>

                    <div class="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-100 flex items-start gap-3 insight-card">
                        <div class="p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                            <i data-lucide="trophy" class="w-5 h-5 text-emerald-600"></i>
                        </div>
                        <div>
                            <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Rata-rata Tertinggi</p>
                            <p class="text-sm font-extrabold text-slate-900">${bestAvgClass.name}</p>
                            <p class="text-xs text-slate-600 mt-0.5">Skor: <span class="font-bold text-emerald-700">${bestAvgClass.avg.toFixed(1)}</span></p>
                        </div>
                    </div>

                    <div class="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-100 flex items-start gap-3 insight-card">
                        <div class="p-2 bg-amber-50 rounded-lg flex-shrink-0">
                            <i data-lucide="school" class="w-5 h-5 text-amber-600"></i>
                        </div>
                        <div>
                            <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Sekolah Paling Beragam</p>
                            <p class="text-sm font-extrabold text-slate-900">${diverseClass.name}</p>
                            <p class="text-xs text-slate-600 mt-0.5">Asal Sekolah: <span class="font-bold text-amber-700">${diverseClass.uniqueSchools}</span></p>
                        </div>
                    </div>
                </div>

                <div class="mt-6 bg-white rounded-xl border border-slate-100 p-5">
                    <div class="flex items-center gap-2 mb-4">
                        <i data-lucide="histogram" class="w-5 h-5 text-violet-600"></i>
                        <h3 class="font-extrabold text-lg text-slate-900">Distribusi Nilai per Kelas</h3>
                    </div>

                    <div class="space-y-3">
            `;

            // Score ranges configuration
            const scoreRanges = [
                { label: '0-40', color: '#ef4444', colorName: 'Merah', min: 0, max: 40 },
                { label: '41-60', color: '#f59e0b', colorName: 'Amber', min: 41, max: 60 },
                { label: '61-70', color: '#eab308', colorName: 'Kuning', min: 61, max: 70 },
                { label: '71-80', color: '#22c55e', colorName: 'Hijau', min: 71, max: 80 },
                { label: '81-90', color: '#3b82f6', colorName: 'Biru', min: 81, max: 90 },
                { label: '91-100', color: '#8b5cf6', colorName: 'Ungu', min: 91, max: 100 }
            ];

            distributedClasses.forEach((c) => {
                const students = c.students || [];
                const rangeCounts = scoreRanges.map(r => students.filter(s => s.skorNilai >= r.min && s.skorNilai <= r.max).length);
                const totalInRanges = rangeCounts.reduce((a, b) => a + b, 0);
                const maxCount = Math.max(...rangeCounts, 1);

                html += `
                    <div class="flex items-center gap-3">
                        <div class="w-20 flex-shrink-0 text-xs font-extrabold text-slate-700 text-right">VII ${c.letter}</div>
                        <div class="flex-1 flex h-5 rounded-md overflow-hidden bg-slate-100">
                `;

                rangeCounts.forEach((count, ri) => {
                    const pct = totalInRanges > 0 ? (count / totalInRanges) * 100 : 0;
                    if (pct > 0) {
                        html += `<div style="width:${pct}%; background-color:${scoreRanges[ri].color};" title="${scoreRanges[ri].label}: ${count} siswa (${pct.toFixed(1)}%)"></div>`;
                    }
                });

                html += `
                        </div>
                        <div class="w-10 flex-shrink-0 text-[10px] text-slate-500 font-bold text-right">${students.length}</div>
                    </div>
                `;
            });

            // Legend
            html += `
                    </div>

                    <div class="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-slate-100">
            `;
            scoreRanges.forEach(r => {
                html += `
                    <div class="flex items-center gap-1.5">
                        <span class="w-3 h-3 rounded-sm inline-block" style="background-color:${r.color};"></span>
                        <span class="text-[10px] text-slate-600 font-semibold">${r.label} (${r.colorName})</span>
                    </div>
                `;
            });
            html += `
                    </div>
                </div>
            `;

            dynamicContentArea.innerHTML = html;
            lucide.createIcons();
        }

        // Delete a student from the active class
        function deleteStudent(studentIdx) {
            const activeClass = distributedClasses[activeClassIndex];
            const student = activeClass.students[studentIdx];
            if (!student) return;

            // Save for undo before deleting
            lastDeletedStudent = { ...student };
            lastDeletedClassIndex = activeClassIndex;

            activeClass.students.splice(studentIdx, 1);

            // Also remove from rawStudents
            const rawIdx = rawStudents.findIndex(rs => rs.nisn === student.nisn);
            if (rawIdx !== -1) rawStudents.splice(rawIdx, 1);

            // Re-arrange seating
            activeClass.seating = arrangeSeating(activeClass.students);

            // Update class tabs to reflect new count
            renderClassTabs();

            // Re-render content
            renderClassContent();

            showToast("Siswa Dihapus", `${student.namaSiswa} telah dihapus dari Kelas VII ${activeClass.letter}.`, 'error');

            // Undo toast
            const toastContainer = document.getElementById('toast-container');
            if (toastContainer) {
                const undoToast = document.createElement('div');
                undoToast.className = 'flex items-center gap-3 p-4 rounded-xl shadow-lg border text-sm max-w-sm transition-all duration-300 transform translate-y-2 opacity-0 bg-amber-50 border-amber-200 text-amber-900';
                undoToast.innerHTML = `
                    <i data-lucide="undo-2" class="text-amber-500 w-5 h-5 flex-shrink-0"></i>
                    <div class="flex-1">
                        <h4 class="font-bold">Undo Hapus</h4>
                        <p class="text-xs opacity-90 mt-0.5">Klik tombol untuk membatalkan penghapusan.</p>
                    </div>
                    <button onclick="undoLastDelete()" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex-shrink-0">Undo</button>
                `;
                toastContainer.appendChild(undoToast);
                undoToast.classList.add('toast-enter');
                lucide.createIcons({ attrs: { class: 'w-5 h-5' } });
                setTimeout(() => {
                    undoToast.classList.remove('translate-y-2', 'opacity-0');
                }, 50);
                setTimeout(() => {
                    undoToast.classList.add('translate-y-2', 'opacity-0');
                    setTimeout(() => {
                        undoToast.remove();
                    }, 300);
                }, 8000);
            }

            triggerAutosave();
        }


        // Edit a student inline via modal
        function editStudent(studentIdx) {
            const activeClass = distributedClasses[activeClassIndex];
            const student = activeClass.students[studentIdx];
            if (!student) return;

            const modal = document.createElement('div');
            modal.id = 'edit-student-modal';
            modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[999998] backdrop-blur-sm';
            modal.innerHTML = `
                <div class="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-md mx-4 transform transition-all">
                    <h3 class="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                        <i data-lucide="user-cog" class="w-5 h-5 text-blue-600"></i>
                        Edit Siswa
                    </h3>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">NISN</label>
                            <input type="text" id="edit-nisn" value="${student.nisn}" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Nama Siswa</label>
                            <input type="text" id="edit-nama" value="${student.namaSiswa}" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-slate-600 mb-1">Jenis Kelamin</label>
                                <select id="edit-jk" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="L" ${student.jenisKelamin === 'L' ? 'selected' : ''}>Laki-Laki (L)</option>
                                    <option value="P" ${student.jenisKelamin === 'P' ? 'selected' : ''}>Perempuan (P)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-600 mb-1">Skor Nilai</label>
                                <input type="number" id="edit-skor" value="${student.skorNilai}" min="0" max="100" step="0.1" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Asal Sekolah</label>
                            <input type="text" id="edit-sekolah" value="${student.namaSekolah}" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                    <div class="flex gap-2 mt-6">
                        <button id="edit-save-btn" class="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition">Simpan</button>
                        <button id="edit-cancel-btn" class="flex-1 py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-bold transition">Batal</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            lucide.createIcons();

            // Save handler
            document.getElementById('edit-save-btn').addEventListener('click', function() {
                const newNisn = document.getElementById('edit-nisn').value.trim();
                const newNama = toProperCase(document.getElementById('edit-nama').value.trim());
                const newJk = document.getElementById('edit-jk').value;
                const newSkor = parseFloat(document.getElementById('edit-skor').value) || 0;
                const newSekolah = toProperCase(document.getElementById('edit-sekolah').value.trim());

                // Update in activeClass
                activeClass.students[studentIdx].nisn = newNisn;
                activeClass.students[studentIdx].namaSiswa = newNama;
                activeClass.students[studentIdx].jenisKelamin = newJk;
                activeClass.students[studentIdx].skorNilai = newSkor;
                activeClass.students[studentIdx].namaSekolah = newSekolah;

                // Update in rawStudents
                const rawStudent = rawStudents.find(rs => rs.nisn === student.nisn);
                if (rawStudent) {
                    rawStudent.nisn = newNisn;
                    rawStudent.namaSiswa = newNama;
                    rawStudent.jenisKelamin = newJk;
                    rawStudent.skorNilai = newSkor;
                    rawStudent.namaSekolah = newSekolah;
                }

                // Re-arrange seating
                activeClass.seating = arrangeSeating(activeClass.students);

                // Remove modal and re-render
                modal.remove();
                renderClassTabs();
                renderClassContent();
                showToast("Siswa Diperbarui", `Data ${newNama} berhasil diperbarui.`, 'success');
                triggerAutosave();
            });

            // Cancel handler
            document.getElementById('edit-cancel-btn').addEventListener('click', function() {
                modal.remove();
            });
        }

        // PREPARE PRINT AREA (Daftar Siswa Halaman 1, Denah Tempat Duduk Halaman 2)
        function preparePrintArea() {
            try {
                printArea.innerHTML = '';
                const ta = document.getElementById('config-ta').value;
                const docDate = document.getElementById('config-date').value;
                const kepsekName = document.getElementById('config-kepsek-name').value;
                const kepsekNip = document.getElementById('config-kepsek-nip').value;

                // If comparison view is active, add comparison summary page first
                if (viewMode === 'comparison' && distributedClasses.length > 0) {
                    const printStats = distributedClasses.map(c => {
                        const students = c.students || [];
                        const total = students.length;
                        const boys = students.filter(s => s.jenisKelamin === 'L').length;
                        const girls = students.filter(s => s.jenisKelamin === 'P').length;
                        const avg = total > 0 ? (students.reduce((acc, s) => acc + (s.skorNilai || 0), 0) / total) : 0;
                        const uniqueSchools = new Set(students.map(s => s.namaSekolah)).size;
                        const prestasiCount = students.filter(s => s.prestasi === 'Sertifikat').length;
                        let typeLabel = 'Reguler';
                        if (c.type === 'akademik') typeLabel = 'Akademik';
                        else if (c.type === 'prestasi') typeLabel = 'Prestasi';
                        return { name: `VII ${c.letter}`, type: typeLabel, total, boys, girls, avg, uniqueSchools, prestasiCount };
                    });
                    const maxAvg = Math.max(...printStats.map(s => s.avg));

                    let compTableRows = '';
                    printStats.forEach((s, idx) => {
                        const bgRow = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                        const isBest = s.avg === maxAvg && maxAvg > 0;
                        const avgStyle = isBest ? 'background:#ecfdf5;color:#047857;font-weight:900;' : 'color:#334155;font-weight:600;';
                        compTableRows += `
                            <tr class="${bgRow} border-b border-slate-300">
                                <td class="border border-slate-400 px-2 py-1 text-[11px] font-extrabold text-center">${s.name}</td>
                                <td class="border border-slate-400 px-2 py-1 text-[11px] font-semibold text-center">${s.type}</td>
                                <td class="border border-slate-400 px-2 py-1 text-[11px] font-extrabold text-center">${s.total}</td>
                                <td class="border border-slate-400 px-2 py-1 text-[11px] font-bold text-center text-blue-800">${s.boys}</td>
                                <td class="border border-slate-400 px-2 py-1 text-[11px] font-bold text-center text-pink-700">${s.girls}</td>
                                <td class="border border-slate-400 px-2 py-1 text-[11px] text-center" style="${avgStyle}">${s.avg.toFixed(1)}</td>
                                <td class="border border-slate-400 px-2 py-1 text-[11px] font-semibold text-center">${s.uniqueSchools}</td>
                                <td class="border border-slate-400 px-2 py-1 text-[11px] font-semibold text-center">${s.prestasiCount}</td>
                            </tr>
                        `;
                    });

                    const compPage = document.createElement('div');
                    compPage.className = 'print-page bg-white p-4 flex flex-col justify-between';
                    compPage.innerHTML = `
                        <div class="text-center border-b-4 border-double border-slate-900 pb-2 mb-3">
                            <div class="flex items-center justify-center gap-4">
                                <img src="https://i.ibb.co.com/LdsMJhz1/Icon-Header-WEB.png" class="w-12 h-12 object-contain logo-transparent" alt="Logo SMPN 2 Kedungbanteng">
                                <div class="text-left">
                                    <h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 leading-tight">RINGKASAN PERBANDINGAN ANTAR KELAS VII</h2>
                                    <h1 class="text-lg font-black tracking-wider uppercase text-slate-900 leading-tight">SEKOLAH MENENGAH PERTAMA NEGERI 2 KEDUNGBANTENG</h1>
                                    <p class="text-[9px] font-bold text-slate-600 tracking-wide uppercase">TAHUN AJARAN ${ta}</p>
                                </div>
                            </div>
                        </div>

                        <div class="flex-grow overflow-hidden mt-2">
                            <table class="w-full border-collapse border border-slate-400 text-xs">
                                <thead>
                                    <tr class="bg-slate-800 text-white border-b border-slate-400 text-[10px] uppercase font-extrabold">
                                        <th class="border border-slate-600 px-2 py-1.5 text-center">Kelas</th>
                                        <th class="border border-slate-600 px-2 py-1.5 text-center">Tipe</th>
                                        <th class="border border-slate-600 px-2 py-1.5 text-center">Total</th>
                                        <th class="border border-slate-600 px-2 py-1.5 text-center">L</th>
                                        <th class="border border-slate-600 px-2 py-1.5 text-center">P</th>
                                        <th class="border border-slate-600 px-2 py-1.5 text-center">Rata-rata Nilai</th>
                                        <th class="border border-slate-600 px-2 py-1.5 text-center">Sekolah Asal</th>
                                        <th class="border border-slate-600 px-2 py-1.5 text-center">Siswa Prestasi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${compTableRows}
                                </tbody>
                            </table>
                        </div>

                        <div class="mt-4">
                            <div class="grid grid-cols-2 gap-4 items-end text-xs">
                                <div></div>
                                <div class="text-right font-normal text-xs text-black pr-6">
                                    ${docDate}
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4 mt-6 text-xs">
                                <div></div>
                                <div class="text-center">
                                    <p class="font-bold">Mengetahui,</p>
                                    <p class="font-bold">Kepala Sekolah</p>
                                    <div class="h-12"></div>
                                    <p class="font-extrabold underline text-sm">${kepsekName}</p>
                                    <p class="text-sm font-semibold text-slate-800 font-mono">${kepsekNip}</p>
                                </div>
                            </div>
                        </div>
                    `;
                    printArea.appendChild(compPage);
                }

                distributedClasses.forEach((c) => {
                    const currentStudents = c.students || [];
                    const currentSeating = c.seating || [];

                    const boysCount = currentStudents.filter(s => s.jenisKelamin === 'L').length;
                    const girlsCount = currentStudents.filter(s => s.jenisKelamin === 'P').length;

                    // Mengambil data Wali Kelas dan NIP paling update langsung dari Class Configurations
                    const conf = classConfigurations.find(cfg => cfg.letter === c.letter) || {};
                    const currentWaliKelas = conf.waliKelas || `Wali Kelas VII ${c.letter}`;
                    const currentWaliNip = conf.nip ? "NIP " + conf.nip : "........................................";

                    // --- HALAMAN 1: DAFTAR NAMA SISWA KELAS (LEBAR PENUH, PAS 1 HALAMAN) ---
                    const page1 = document.createElement('div');
                    page1.className = 'print-page bg-white p-4 flex flex-col justify-between';
                    
                    let tableRows = '';
                    currentStudents.forEach((s, idx) => {
                        tableRows += `
                            <tr class="border-b border-slate-300">
                                <td class="border border-slate-400 px-3 py-0.5 text-center text-[11px] font-bold">${idx + 1}</td>
                                <td class="border border-slate-400 px-3 py-0.5 text-[11px] font-mono">${s.nisn}</td>
                                <!-- Fit to cell: Truncate long names -->
                                <td class="border border-slate-400 px-3 py-0.5 text-[11px] font-bold truncate" title="${s.namaSiswa}">${s.namaSiswa}</td>
                                <td class="border border-slate-400 px-3 py-0.5 text-center text-[11px] font-semibold">${s.jenisKelamin}</td>
                                <!-- Fit to cell: Truncate long school names -->
                                <td class="border border-slate-400 px-3 py-0.5 text-[11px] truncate" title="${s.namaSekolah}">${s.namaSekolah}</td>
                            </tr>
                        `;
                    });

                    page1.innerHTML = `
                        <!-- Header Kop Surat SMP 2 Kedungbanteng (Official) -->
                        <div class="text-center border-b-4 border-double border-slate-900 pb-2 mb-3">
                            <div class="flex items-center justify-center gap-4">
                                <img src="https://i.ibb.co.com/LdsMJhz1/Icon-Header-WEB.png" class="w-12 h-12 object-contain logo-transparent" alt="Logo SMPN 2 Kedungbanteng">
                                <div class="text-left">
                                    <h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 leading-tight">DAFTAR NAMA SISWA KELAS VII ${c.letter}</h2>
                                    <h1 class="text-lg font-black tracking-wider uppercase text-slate-900 leading-tight">SEKOLAH MENENGAH PERTAMA NEGERI 2 KEDUNGBANTENG</h1>
                                    <p class="text-[9px] font-bold text-slate-600 tracking-wide uppercase">TAHUN AJARAN ${ta}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Table Daftar Siswa Lebar Penuh dengan layout fixed agar fit to cell rapi & Proporsional sesuai request -->
                        <div class="flex-grow overflow-hidden mt-2">
                            <table class="w-full border-collapse border border-slate-400 text-xs table-fixed">
                                <thead>
                                    <tr class="bg-slate-100 border-b border-slate-400 text-left font-bold text-slate-800">
                                        <th class="border border-slate-400 px-3 py-1 text-center w-[5%]">NO</th>
                                        <th class="border border-slate-400 px-3 py-1 w-[10%]">NISN</th>
                                        <th class="border border-slate-400 px-3 py-1 w-[38%]">NAMA SISWA</th>
                                        <th class="border border-slate-400 px-3 py-1 text-center w-[5%]">JK</th>
                                        <th class="border border-slate-400 px-3 py-1 w-[42%]">ASAL SEKOLAH</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                </tbody>
                            </table>
                        </div>

                        <!-- Footer Halaman 1 (Rekap & TTD) -->
                        <div class="mt-4">
                            <div class="grid grid-cols-2 gap-4 items-end text-xs">
                                <!-- Recapitulation Table -->
                                <div>
                                    <table class="w-full border-collapse border border-slate-300 text-[10px]">
                                        <tbody>
                                            <tr class="border-b border-slate-200">
                                                <td class="px-2 py-0.5 font-bold text-slate-600 w-28">LAKI-LAKI (L)</td>
                                                <td class="px-2 py-0.5 font-extrabold">: ${boysCount} Siswa</td>
                                            </tr>
                                            <tr class="border-b border-slate-200">
                                                <td class="px-2 py-0.5 font-bold text-slate-600">PEREMPUAN (P)</td>
                                                <td class="px-2 py-0.5 font-extrabold">: ${girlsCount} Siswa</td>
                                            </tr>
                                            <tr class="bg-slate-50 font-bold">
                                                <td class="px-2 py-1 text-slate-800">TOTAL SISWA</td>
                                                <td class="px-2 py-1 text-blue-900 font-black">: ${currentStudents.length} Siswa</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <!-- Tanggal Dokumen (Diperbarui: non-italic, non-bold, text-xs seimbang dengan Mengetahui) -->
                                <div class="text-right font-normal text-xs text-black pr-6">
                                    ${docDate}
                                </div>
                            </div>

                            <!-- Signatures Block (Diperbarui: NIP ukuran font sama dengan nama & gelar proper-case) -->
                            <div class="grid grid-cols-2 gap-4 mt-6 text-xs">
                                <div class="text-center">
                                    <p class="font-bold">Mengetahui,</p>
                                    <p class="font-bold">Kepala Sekolah</p>
                                    <div class="h-12"></div>
                                    <p class="font-extrabold underline text-sm">${kepsekName}</p>
                                    <p class="text-sm font-semibold text-slate-800 font-mono">${kepsekNip}</p>
                                </div>
                                <div class="text-center">
                                    <p class="font-bold">&nbsp;</p>
                                    <p class="font-bold">Wali Kelas</p>
                                    <div class="h-12"></div>
                                    <p class="font-extrabold underline text-sm">${currentWaliKelas}</p>
                                    <p class="text-sm font-semibold text-slate-800 font-mono">${currentWaliNip}</p>
                                </div>
                            </div>
                        </div>
                    `;

                    // --- HALAMAN 2: DENAH TEMPAT DUDUK MEJA BERPASANGAN (BESAR, TINGGI h-[125px] & WRAP TEXT) ---
                    const page2 = document.createElement('div');
                    page2.className = 'print-page bg-white p-4 flex flex-col justify-between';

                    let seatingGridHtml = '';
                    currentSeating.forEach((pair, pairIdx) => {
                        const studentLeft = pair[0];
                        const studentRight = pair[1];
                        seatingGridHtml += `
                            <!-- Diperbarui: Seating Box ditingkatkan tingginya menjadi h-[125px] & Nama wrap-text (whitespace-normal break-words line-clamp-3) -->
                            <div class="border border-slate-400 p-2 text-center bg-white rounded-md shadow-sm h-[125px] flex flex-col justify-between">
                                <div class="font-extrabold text-[10px] border-b border-slate-300 pb-1 mb-1 text-slate-500 uppercase">Meja ${pairIdx + 1}</div>
                                <div class="grid grid-cols-2 gap-1.5 text-[10px] items-center h-full">
                                    ${studentLeft ? `
                                        <div class="p-1 rounded bg-slate-50 border border-slate-200 h-full flex flex-col justify-center">
                                            <div class="w-3.5 h-3.5 rounded-full ${studentLeft.jenisKelamin === 'L' ? 'bg-blue-600 text-white' : 'bg-pink-600 text-white'} flex items-center justify-center text-[8px] font-bold mx-auto mb-0.5">${studentLeft.jenisKelamin}</div>
                                            <!-- Fit to cell: Lebar nama diperbesar, wrap text & Proper Case -->
                                            <div class="font-extrabold text-[10px] leading-tight text-slate-900 whitespace-normal break-words line-clamp-3 px-0.5" title="${studentLeft.namaSiswa}">${studentLeft.namaSiswa}</div>
                                        </div>
                                    ` : `
                                        <div class="p-1 rounded border border-dashed border-slate-200 text-slate-400 text-[8px] h-full flex items-center justify-center">Kosong</div>
                                    `}

                                    ${studentRight ? `
                                        <div class="p-1 rounded bg-slate-50 border border-slate-200 h-full flex flex-col justify-center">
                                            <div class="w-3.5 h-3.5 rounded-full ${studentRight.jenisKelamin === 'L' ? 'bg-blue-600 text-white' : 'bg-pink-600 text-white'} flex items-center justify-center text-[8px] font-bold mx-auto mb-0.5">${studentRight.jenisKelamin}</div>
                                            <!-- Fit to cell: Lebar nama diperbesar, wrap text & Proper Case -->
                                            <div class="font-extrabold text-[10px] leading-tight text-slate-900 whitespace-normal break-words line-clamp-3 px-0.5" title="${studentRight.namaSiswa}">${studentRight.namaSiswa}</div>
                                        </div>
                                    ` : `
                                        <div class="p-1 rounded border border-dashed border-slate-200 text-slate-400 text-[8px] h-full flex items-center justify-center">Kosong</div>
                                    `}
                                </div>
                            </div>
                        `;
                    });

                    page2.innerHTML = `
                        <!-- Header Kop Surat Denah (Official) -->
                        <div class="text-center border-b-4 border-double border-slate-900 pb-2 mb-4">
                            <div class="flex items-center justify-center gap-3">
                                <img src="https://i.ibb.co.com/LdsMJhz1/Icon-Header-WEB.png" class="w-12 h-12 object-contain logo-transparent" alt="Logo SMPN 2 Kedungbanteng">
                                <div class="text-left">
                                    <h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 leading-tight">DENAH TEMPAT DUDUK KELAS VII ${c.letter}</h2>
                                    <h1 class="text-lg font-black tracking-wider uppercase text-slate-900 leading-tight">SEKOLAH MENENGAH PERTAMA NEGERI 2 KEDUNGBANTENG</h1>
                                    <p class="text-[9px] font-bold text-slate-600 tracking-wide uppercase">TAHUN AJARAN ${ta}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Papan Tulis / Meja Guru -->
                        <div class="w-full bg-slate-100 text-slate-600 text-center py-1.5 rounded-lg font-bold border border-slate-300 text-[10px] mb-4">
                            Papan Tulis & Meja Guru (Depan Kelas)
                        </div>

                        <!-- Grid Denah 4-Kolom Lebar, Sesuai Tampilan di Web Dashboard -->
                        <div class="grid grid-cols-4 gap-3 flex-grow overflow-hidden">
                            ${seatingGridHtml}
                        </div>

                        <!-- Footer Halaman 2 (TTD Wali Kelas Saja di Bawah, Tanggal non-italic non-bold) -->
                        <div class="mt-4 pt-3 border-t border-dashed border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-xs">
                                <div></div>
                                <div class="text-center">
                                    <p class="font-normal text-xs text-black mb-1">${docDate}</p>
                                    <p class="font-bold text-slate-800 leading-tight">Wali Kelas</p>
                                    <div class="h-12"></div>
                                    <p class="font-extrabold underline text-sm">${currentWaliKelas}</p>
                                    <p class="text-xs text-slate-800 font-mono">${currentWaliNip}</p>
                                </div>
                            </div>
                        </div>
                    `;

                    printArea.appendChild(page1);
                    printArea.appendChild(page2);
                });
                lucide.createIcons();
            } catch (err) {
                console.error("Gagal menyiapkan area cetak PDF:", err);
                showToast("Gagal Cetak PDF", "Terjadi kesalahan saat menyusun dokumen: " + err.message, "error");
            }
        }

        // Print Preview Modal
        function showPrintPreview() {
            if (distributedClasses.length === 0) {
                showToast("Tidak Ada Data", "Silakan susun pembagian kelas terlebih dahulu.", "error");
                return;
            }

            preparePrintArea();

            const modal = document.createElement('div');
            modal.id = 'print-preview-modal';
            modal.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-[999998] backdrop-blur-sm';
            modal.style.animation = 'modalFadeIn 0.2s ease';

            modal.innerHTML = `
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col" style="max-height:90vh;">
                    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h3 class="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                            <i data-lucide="printer" class="w-5 h-5 text-blue-600"></i>
                            Pratinjau Cetak
                        </h3>
                        <button id="print-preview-close" class="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-6 bg-slate-100" id="print-preview-content" style="min-height:400px;">
                        <div class="bg-white rounded-xl shadow-sm p-4 overflow-auto" style="transform:scale(0.75);transform-origin:top center;">
                            <div id="print-preview-inner"></div>
                        </div>
                    </div>
                    <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
                        <button id="print-preview-cancel" class="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-bold transition">
                            Tutup
                        </button>
                        <button id="print-preview-print" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm">
                            <i data-lucide="printer" class="w-4 h-4"></i>
                            Cetak Sekarang
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            lucide.createIcons();

            // Populate preview with print area content
            const previewInner = document.getElementById('print-preview-inner');
            if (previewInner && printArea) {
                previewInner.innerHTML = printArea.innerHTML;
            }

            // Print button
            document.getElementById('print-preview-print').addEventListener('click', function() {
                modal.remove();
                setTimeout(() => window.print(), 200);
            });

            // Close handlers
            document.getElementById('print-preview-close').addEventListener('click', function() {
                modal.remove();
            });
            document.getElementById('print-preview-cancel').addEventListener('click', function() {
                modal.remove();
            });
            modal.addEventListener('click', function(e) {
                if (e.target === modal) modal.remove();
            });
        }

        // EXPORT TO EXCEL DENGAN METODE BLOB DAN PEMBAGIAN SHEET YANG AMAN (Siswa = Sheet 1, Denah = Sheet 2)
        function exportToExcel() {
            try {
                if (distributedClasses.length === 0) {
                    showToast("Tidak Ada Data", "Silakan susun pembagian kelas terlebih dahulu.", "error");
                    return;
                }
                
                const wb = XLSX.utils.book_new();
                const ta = document.getElementById('config-ta').value;
                const docDate = document.getElementById('config-date').value;
                const kepsekName = document.getElementById('config-kepsek-name').value;
                const kepsekNip = document.getElementById('config-kepsek-nip').value;

                distributedClasses.forEach((c) => {
                    const currentStudents = c.students || [];
                    const currentSeating = c.seating || arrangeSeating(currentStudents);
                    
                    // Mengambil data Wali Kelas dan NIP paling update langsung dari Class Configurations
                    const conf = classConfigurations.find(cfg => cfg.letter === c.letter) || {};
                    const currentWaliKelas = conf.waliKelas || `Wali Kelas VII ${c.letter}`;
                    const currentWaliNip = conf.nip ? "NIP " + conf.nip : "";

                    // --- SHEET 1: DAFTAR NAMA SISWA ---
                    const sheetData = [];
                    sheetData.push(["DAFTAR NAMA SISWA KELAS VII " + c.letter]);
                    sheetData.push(["SEKOLAH MENENGAH PERTAMA NEGERI 2 KEDUNGBANTENG"]);
                    sheetData.push(["TAHUN AJARAN " + ta]);
                    sheetData.push([]); 

                    sheetData.push(["NO", "NISN", "NAMA", "JENIS KELAMIN", "ASAL SEKOLAH"]);

                    currentStudents.forEach((s, idx) => {
                        sheetData.push([
                            idx + 1,
                            s.nisn,
                            s.namaSiswa, 
                            s.jenisKelamin === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN',
                            s.namaSekolah 
                        ]);
                    });

                    const boysCount = currentStudents.filter(s => s.jenisKelamin === 'L').length;
                    const girlsCount = currentStudents.filter(s => s.jenisKelamin === 'P').length;
                    
                    sheetData.push(["", "LAKI-LAKI", boysCount, "", docDate]);
                    sheetData.push(["", "PEREMPUAN", girlsCount]);
                    sheetData.push(["", "JUMLAH", currentStudents.length]);
                    sheetData.push([]); 

                    sheetData.push(["", "Mengetahui,"]);
                    // Diperbarui: Tanda tangan Wali kelas disederhanakan tanpa menyebutkan kelasnya
                    sheetData.push(["", "Kepala Sekolah", "", "", "Wali Kelas"]);
                    sheetData.push([]); 
                    sheetData.push([]);
                    sheetData.push([]);
                    sheetData.push(["", kepsekName, "", "", currentWaliKelas]);
                    sheetData.push(["", kepsekNip, "", "", currentWaliNip]);

                    const ws1 = XLSX.utils.aoa_to_sheet(sheetData);
                    const wscols = [
                        {wch: 6},  // NO
                        {wch: 18}, // NISN
                        {wch: 35}, // NAMA
                        {wch: 22}, // JENIS KELAMIN
                        {wch: 30}  // ASAL SEKOLAH
                    ];
                    ws1['!cols'] = wscols;
                    XLSX.utils.book_append_sheet(wb, ws1, `Siswa VII ${c.letter}`);

                    // --- SHEET 2: DENAH TEMPAT DUDUK (GRID 4-KOLOM MEJA) ---
                    const denahData = [];
                    denahData.push(["DENAH TEMPAT DUDUK KELAS VII " + c.letter]);
                    denahData.push(["SMP NEGERI 2 KEDUNGBANTENG"]);
                    denahData.push(["TAHUN AJARAN " + ta]);
                    denahData.push([]);
                    denahData.push(["", "", "PAPAN TULIS & MEJA GURU (DEPAN KELAS)"]);
                    denahData.push([]);

                    const desksPerRow = 4;
                    for (let r = 0; r < currentSeating.length; r += desksPerRow) {
                        const rowDesks = currentSeating.slice(r, r + desksPerRow);
                        
                        const labelRow = [];
                        const leftRow = [];
                        const rightRow = [];

                        rowDesks.forEach((pair, idx) => {
                            const deskNum = r + idx + 1;
                            labelRow.push(`MEJA ${deskNum}`, "");
                            
                            const l = pair[0];
                            const rStudent = pair[1];

                            leftRow.push(l ? l.namaSiswa : "Kosong");
                            rightRow.push(rStudent ? rStudent.namaSiswa : "Kosong");
                        });

                        denahData.push(labelRow);
                        denahData.push(leftRow);
                        denahData.push(rightRow);
                        denahData.push([]); // Spacer antar baris meja
                    }

                    const ws2 = XLSX.utils.aoa_to_sheet(denahData);
                    XLSX.utils.book_append_sheet(wb, ws2, `Denah VII ${c.letter}`);
                });

                // PENDEKATAN BLOB ASLI (BUKAN DATA:URI): Sangat andal & bebas blokir sandbox chrome
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const blobUrl = URL.createObjectURL(blob);
                const filename = `Pembagian_Kelas_VII_SMPN2_Kedungbanteng_${String(ta || '').replace('/', '-')}.xlsx`;
                
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                }, 200);

                showToast("Ekspor Excel", "File Excel multi-sheet berhasil diunduh.", "success");
            } catch (err) {
                console.error("Gagal mengekspor data ke Excel:", err);
                showToast("Gagal Ekspor Excel", "Terjadi kesalahan saat menyusun dokumen Excel: " + err.message, "error");
            }
        }

        // Export all class data to a single CSV file
        function exportToCSV() {
            try {
                if (distributedClasses.length === 0) {
                    showToast("Tidak Ada Data", "Silakan susun pembagian kelas terlebih dahulu.", "error");
                    return;
                }

                const headers = ["NO", "NISN", "NAMA", "JK", "SKOR NILAI", "ASAL SEKOLAH", "PRESTASI", "KELAS", "WALI KELAS"];
                const rows = [headers.join(",")];

                let no = 1;
                distributedClasses.forEach((c) => {
                    const conf = classConfigurations.find(cfg => cfg.letter === c.letter) || {};
                    const waliNama = conf.waliKelas || '';
                    (c.students || []).forEach((s) => {
                        const nama = '"' + (s.namaSiswa || '').replace(/"/g, '""') + '"';
                        const sekolah = '"' + (s.namaSekolah || '').replace(/"/g, '""') + '"';
                        const wali = '"' + waliNama.replace(/"/g, '""') + '"';
                        rows.push([no, s.nisn, nama, s.jenisKelamin, s.skorNilai, sekolah, s.prestasi, 'VII ' + c.letter, wali].join(","));
                        no++;
                    });
                });

                const csvContent = rows.join("\n");
                const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
                const blobUrl = URL.createObjectURL(blob);
                const ta = document.getElementById('config-ta').value;
                const filename = 'Pembagian_Kelas_VII_SMPN2_Kedungbanteng_' + String(ta || '').replace('/', '-') + '.csv';

                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();

                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                }, 200);

                showToast("Ekspor CSV", "File CSV berhasil diunduh.", "success");
            } catch (err) {
                console.error("Gagal mengekspor data ke CSV:", err);
                showToast("Gagal Ekspor CSV", "Terjadi kesalahan saat menyusun file CSV: " + err.message, "error");
            }
        }

        // Generate Sample Template download
        function downloadExcelTemplate() {
            try {
                const templateData = [
                    ["NISN", "Nama Siswa", "Jenis Kelamin (P/L)", "Skor Nilai", "Nama Sekolah", "Prestasi Sertifikat"],
                    ["0123456789", "Andi Setiadi", "L", 85.5, "SD Negeri 1 Kedungbanteng", "Kosong"],
                    ["0123456790", "Budi Raharjo", "L", 78.0, "SDN 2 Kedungbanteng", "Sertifikat"],
                    ["0123456791", "Citra Kirana", "P", 92.0, "SD N 1 Purwokerto", "Kosong"],
                    ["0123456792", "Dewi Lestari", "P", 88.5, "MI Ma'arif Kedungbanteng", "Sertifikat"]
                ];

                const ws = XLSX.utils.aoa_to_sheet(templateData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Template");
                
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const blobUrl = URL.createObjectURL(blob);
                
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = "Template_PMB_SMPN2_Kedungbanteng.xlsx";
                document.body.appendChild(link);
                link.click();
                
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                }, 200);

                showToast("Template Diunduh", "Gunakan template ini untuk mengisi data Anda.", "info");
            } catch (err) {
                console.error("Gagal mengunduh template:", err);
            }
        }

        // Generate Sample Demo Data
        function generateDemoData() {
            const firstNamesBoys = ["Agus", "Budi", "Candra", "Dedi", "Eko", "Fajar", "Gilang", "Heri", "Iwan", "Joko", "Kurniawan", "Lutfi", "Mulyono", "Nugroho", "Oki", "Prabowo", "Rian", "Setyawan", "Taufik", "Wahyu", "Yanto"];
            const firstNamesGirls = ["Anisa", "Berti", "Citra", "Dewi", "Eka", "Fitri", "Gita", "Hana", "Indah", "Juli", "Kartika", "Laras", "Mega", "Novi", "Olivia", "Putri", "Rina", "Sari", "Tari", "Utami", "Wulandari"];
            const lastNames = ["Saputra", "Wibowo", "Pratama", "Hidayat", "Kurnia", "Santoso", "Suryadi", "Wijaya", "Setyawan", "Nugraha", "Raharjo", "Budiman", "Purnomo", "Setiawan", "Utomo", "Kusuma"];
            
            const schools = [
                "SDN 1 Kedungbanteng", "SD N 1 Kedungbanteng", "SD Negeri 1 Kedungbanteng",
                "SDN 2 Kedungbanteng", "SD Negeri 2 Kedungbanteng",
                "MI Ma'arif Kedungbanteng", "MI Maarif Kedungbanteng", "MIM Kedungbanteng",
                "SDN 1 Beji", "SD N 1 Beji", "SD Negeri 1 Beji",
                "SDN 2 Beji", "SDN 1 Karangnangka", "MI Ma'arif Karangnangka",
                "SDN 3 Kedungbanteng", "SD Islam Al-Azhari", "SD Swasta Muhammadiyah"
            ];

            const list = [];
            const count = 238; 

            for (let i = 1; i <= count; i++) {
                const isBoy = Math.random() > 0.46; 
                const firstName = isBoy 
                    ? firstNamesBoys[Math.floor(Math.random() * firstNamesBoys.length)] 
                    : firstNamesGirls[Math.floor(Math.random() * firstNamesGirls.length)];
                const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
                const namaSiswa = `${firstName} ${lastName}`;
                
                const score = parseFloat((65 + Math.random() * 34).toFixed(1)); 
                const school = schools[Math.floor(Math.random() * schools.length)];
                const prestasi = Math.random() < 0.15 ? "Sertifikat" : "Kosong";

                list.push({
                    nisn: String(1203000000 + i),
                    namaSiswa: toProperCase(namaSiswa),
                    jenisKelamin: isBoy ? 'L' : 'P',
                    skorNilai: score,
                    namaSekolah: toProperCase(school),
                    prestasi
                });
            }

            return list;
        }


        // Dark Mode DOM References
            const btnDarkMode = document.getElementById('btn-dark-mode');
            const darkModeIcon = document.getElementById('dark-mode-icon');
            const darkModeLabel = document.getElementById('dark-mode-label');
            function updateDarkModeUI() {
                if (isDarkMode) {
                    document.documentElement.classList.add('dark');
                    if (darkModeIcon) {
                        darkModeIcon.setAttribute('data-lucide', 'sun');
                    }
                    if (darkModeLabel) darkModeLabel.textContent = 'Terang';
                    if (btnDarkMode) {
                        btnDarkMode.classList.remove('bg-slate-800/80', 'text-slate-400', 'border-slate-700');
                        btnDarkMode.classList.add('bg-amber-900/50', 'text-amber-300', 'border-amber-700');
                    }
                } else {
                    document.documentElement.classList.remove('dark');
                    if (darkModeIcon) {
                        darkModeIcon.setAttribute('data-lucide', 'moon');
                    }
                    if (darkModeLabel) darkModeLabel.textContent = 'Gelap';
                    if (btnDarkMode) {
                        btnDarkMode.classList.add('bg-slate-800/80', 'text-slate-400', 'border-slate-700');
                        btnDarkMode.classList.remove('bg-amber-900/50', 'text-amber-300', 'border-amber-700');
                    }
                }
                lucide.createIcons();
                localStorage.setItem('darkMode', isDarkMode);
            }

        // ========== NEW FEATURES: Phase 5 ==========

        // 1. Batch Move Multiple Students
        function batchMoveSelectedStudents() {
            const checkboxes = document.querySelectorAll('.student-checkbox:checked');
            if (checkboxes.length === 0) {
                showToast("Tidak Ada Pilihan", "Tidak ada siswa dipilih", "error");
                return;
            }

            if (distributedClasses.length < 2) {
                showToast("Tidak Bisa", "Minimal 2 kelas tersedia untuk memindahkan siswa.", "error");
                return;
            }

            const count = checkboxes.length;
            const sourceClass = distributedClasses[activeClassIndex];

            let optionsHtml = '';
            distributedClasses.forEach((c, idx) => {
                if (idx === activeClassIndex) return;
                const cCount = c.students ? c.students.length : 0;
                optionsHtml += `<option value="${idx}">Kelas VII ${c.letter} (${cCount} siswa)</option>`;
            });

            const modal = document.createElement('div');
            modal.id = 'batch-move-modal';
            modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[999998] backdrop-blur-sm';
            modal.style.animation = 'modalFadeIn 0.2s ease';

            modal.innerHTML = `
                <div class="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-md mx-4">
                    <h3 class="font-bold text-lg text-slate-900 mb-2 flex items-center gap-2">
                        <i data-lucide="users" class="w-5 h-5 text-blue-600"></i>
                        Pindahkan Siswa Terpilih
                    </h3>
                    <p class="text-sm text-slate-600 mb-4">
                        Pindahkan <span class="font-bold text-slate-900">${count} siswa terpilih</span> dari <span class="font-bold text-blue-700">Kelas VII ${sourceClass.letter}</span> ke:
                    </p>
                    <select id="batch-move-target-class" class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4">
                        ${optionsHtml}
                    </select>
                    <div class="flex gap-2">
                        <button id="batch-move-confirm-btn" class="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5">
                            <i data-lucide="check" class="w-4 h-4"></i> Pindahkan
                        </button>
                        <button id="batch-move-cancel-btn" class="flex-1 py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-bold transition">Batal</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            lucide.createIcons();

            document.getElementById('batch-move-confirm-btn').addEventListener('click', function() {
                const targetIdx = parseInt(document.getElementById('batch-move-target-class').value);
                const targetClass = distributedClasses[targetIdx];
                if (!targetClass) return;

                // Collect students to move (by index in active class)
                const indicesToMove = [];
                checkboxes.forEach(cb => {
                    const idx = parseInt(cb.getAttribute('data-student-index'));
                    if (!isNaN(idx)) indicesToMove.push(idx);
                });

                // Sort descending so splicing doesn't shift earlier indices
                indicesToMove.sort((a, b) => b - a);

                const movedStudents = [];
                indicesToMove.forEach(idx => {
                    if (sourceClass.students[idx]) {
                        movedStudents.push(sourceClass.students[idx]);
                        sourceClass.students.splice(idx, 1);
                    }
                });

                // Add to target and re-sort
                movedStudents.forEach(s => targetClass.students.push(s));
                targetClass.students.sort((a, b) => a.namaSiswa.localeCompare(b.namaSiswa));

                // Update seating
                sourceClass.seating = arrangeSeating(sourceClass.students);
                targetClass.seating = arrangeSeating(targetClass.students);

                modal.remove();
                renderClassTabs();
                renderStatsPanel();
                renderClassContent();
                showToast("Siswa Dipindahkan", `${movedStudents.length} siswa dipindahkan ke Kelas VII ${targetClass.letter}.`, 'success');
                saveResultToFirestore();
            });

            document.getElementById('batch-move-cancel-btn').addEventListener('click', function() {
                modal.remove();
            });

            modal.addEventListener('click', function(e) {
                if (e.target === modal) modal.remove();
            });
        }

        // 2. Select All / Deselect All Checkbox
        function toggleSelectAll(checked) {
            const checkboxes = document.querySelectorAll('.student-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = checked;
            });
            updateSelectionUI();
        }

        function updateSelectionUI() {
            const checked = document.querySelectorAll('.student-checkbox:checked');
            const countEl = document.getElementById('selected-count');
            const batchBtn = document.getElementById('btn-batch-move');
            if (checked.length > 0) {
                if (countEl) {
                    countEl.textContent = `${checked.length} siswa dipilih`;
                    countEl.classList.remove('hidden');
                }
                if (batchBtn) batchBtn.classList.remove('hidden');
            } else {
                if (countEl) countEl.classList.add('hidden');
                if (batchBtn) batchBtn.classList.add('hidden');
            }
        }

        // 3. Undo Last Delete
        function undoLastDelete() {
            if (!lastDeletedStudent || lastDeletedClassIndex < 0) {
                showToast("Tidak Bisa Undo", "Tidak ada data penghapusan terakhir untuk dibatalkan.", "error");
                return;
            }

            const targetClass = distributedClasses[lastDeletedClassIndex];
            if (!targetClass) {
                showToast("Gagal Undo", "Kelas asal tidak ditemukan.", "error");
                return;
            }

            // Restore student to original class
            targetClass.students.push(lastDeletedStudent);
            targetClass.students.sort((a, b) => a.namaSiswa.localeCompare(b.namaSiswa));
            targetClass.seating = arrangeSeating(targetClass.students);

            // Also restore to rawStudents
            const exists = rawStudents.find(rs => rs.nisn === lastDeletedStudent.nisn);
            if (!exists) {
                rawStudents.push(lastDeletedStudent);
            }

            // Switch to the restored class and re-render
            activeClassIndex = lastDeletedClassIndex;

            // Clear undo state
            lastDeletedStudent = null;
            lastDeletedClassIndex = -1;

            renderClassTabs();
            renderClassContent();
            showToast("Berhasil Undo", `Siswa telah dikembalikan ke Kelas VII ${targetClass.letter}.`, 'success');
            triggerAutosave();
        }

        // ========== NEW FEATURES: Phase 4 ==========

        // 1. Move Student to Another Class
        function moveStudent(studentIdx) {
            const sourceClass = distributedClasses[activeClassIndex];
            const student = sourceClass.students[studentIdx];
            if (!student || distributedClasses.length < 2) return;

            const modal = document.createElement('div');
            modal.id = 'move-student-modal';
            modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[999998] backdrop-blur-sm';
            modal.style.animation = 'modalFadeIn 0.2s ease';

            let optionsHtml = '';
            distributedClasses.forEach((c, idx) => {
                if (idx === activeClassIndex) return;
                const count = c.students ? c.students.length : 0;
                optionsHtml += `<option value="${idx}">Kelas VII ${c.letter} (${count} siswa)</option>`;
            });

            modal.innerHTML = `
                <div class="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-md mx-4">
                    <h3 class="font-bold text-lg text-slate-900 mb-2 flex items-center gap-2">
                        <i data-lucide="arrow-right-left" class="w-5 h-5 text-blue-600"></i>
                        Pindahkan Siswa
                    </h3>
                    <p class="text-sm text-slate-600 mb-4">
                        Pindahkan <span class="font-bold text-slate-900">${student.namaSiswa}</span> dari <span class="font-bold text-blue-700">Kelas VII ${sourceClass.letter}</span> ke:
                    </p>
                    <select id="move-target-class" class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4">
                        ${optionsHtml}
                    </select>
                    <div class="flex gap-2">
                        <button id="move-confirm-btn" class="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5">
                            <i data-lucide="check" class="w-4 h-4"></i> Pindahkan
                        </button>
                        <button id="move-cancel-btn" class="flex-1 py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-bold transition">Batal</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            lucide.createIcons();

            document.getElementById('move-confirm-btn').addEventListener('click', function() {
                const targetIdx = parseInt(document.getElementById('move-target-class').value);
                const targetClass = distributedClasses[targetIdx];
                if (!targetClass) return;

                // Remove from source
                sourceClass.students.splice(studentIdx, 1);
                sourceClass.seating = arrangeSeating(sourceClass.students);

                // Add to target
                targetClass.students.push(student);
                targetClass.students.sort((a, b) => a.namaSiswa.localeCompare(b.namaSiswa));
                targetClass.seating = arrangeSeating(targetClass.students);

                modal.remove();
                renderClassTabs();
                renderStatsPanel();
                renderClassContent();
                showToast("Siswa Dipindahkan", `${student.namaSiswa} dipindahkan ke Kelas VII ${targetClass.letter}.`, 'success');
                saveResultToFirestore();
            });

            document.getElementById('move-cancel-btn').addEventListener('click', function() {
                modal.remove();
            });

            // Close on backdrop click
            modal.addEventListener('click', function(e) {
                if (e.target === modal) modal.remove();
            });
        }

        // 2. Quick Re-distribute (re-sort current students into classes)
        function quickRedistribute() {
            if (rawStudents.length === 0) {
                showToast("Data Kosong", "Tidak ada data siswa untuk didistribusikan ulang.", "error");
                return;
            }
            processAndDistribute();
        }

        // 3. Student Detail Tooltip (shows on hover in list view)
        function showStudentTooltip(studentIdx, event) {
            const activeClass = distributedClasses[activeClassIndex];
            const student = activeClass.students[studentIdx];
            if (!student) return;

            // Remove existing tooltip
            const existing = document.getElementById('student-tooltip');
            if (existing) existing.remove();

            const tooltip = document.createElement('div');
            tooltip.id = 'student-tooltip';
            tooltip.className = 'fixed z-[999999] bg-slate-900 text-white text-xs rounded-xl p-3 shadow-2xl pointer-events-none max-w-xs';
            tooltip.style.animation = 'modalFadeIn 0.15s ease';

            const schoolSet = new Set(activeClass.students.map(s => s.namaSekolah));
            const schoolCount = schoolSet.size;
            const sameSchoolCount = activeClass.students.filter(s => s.namaSekolah === student.namaSekolah).length;

            tooltip.innerHTML = `
                <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700">
                    <div class="w-7 h-7 rounded-full ${student.jenisKelamin === 'L' ? 'bg-blue-600' : 'bg-pink-600'} flex items-center justify-center text-[10px] font-extrabold">${student.jenisKelamin}</div>
                    <div>
                        <p class="font-bold text-sm">${student.namaSiswa}</p>
                        <p class="text-slate-400 text-[10px]">NISN: ${student.nisn}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-300">
                    <div><span class="text-slate-500 block text-[9px] uppercase">Skor Nilai</span><span class="font-bold text-amber-400">${student.skorNilai}</span></div>
                    <div><span class="text-slate-500 block text-[9px] uppercase">Asal Sekolah</span><span class="font-semibold">${student.namaSekolah}</span></div>
                    <div><span class="text-slate-500 block text-[9px] uppercase">Prestasi</span><span class="${student.prestasi === 'Sertifikat' ? 'text-emerald-400 font-bold' : 'text-slate-500'}">${student.prestasi === 'Sertifikat' ? '✓ Ada' : 'Tidak Ada'}</span></div>
                    <div><span class="text-slate-500 block text-[9px] uppercase">Teman Sekolah</span><span class="font-semibold">${sameSchoolCount} siswa</span></div>
                </div>
            `;

            document.body.appendChild(tooltip);

            // Position near cursor
            const rect = event.target.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            let left = rect.right + 8;
            let top = rect.top;

            // Prevent overflow
            if (left + tooltipRect.width > window.innerWidth - 10) {
                left = rect.left - tooltipRect.width - 8;
            }
            if (top + tooltipRect.height > window.innerHeight - 10) {
                top = window.innerHeight - tooltipRect.height - 10;
            }

            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        }

        function hideStudentTooltip() {
            const tooltip = document.getElementById('student-tooltip');
            if (tooltip) tooltip.remove();
        }

        // 4. Keyboard Shortcuts
        function initKeyboardShortcuts() {
            document.addEventListener('keydown', function(e) {
                // Escape: close any open modal
                if (e.key === 'Escape') {
                    const editModal = document.getElementById('edit-student-modal');
                    const moveModal = document.getElementById('move-student-modal');
                    if (editModal) editModal.remove();
                    if (moveModal) moveModal.remove();
                    hideStudentTooltip();
                }

                // Ctrl+Shift+E: Export to Excel
                if (e.ctrlKey && e.shiftKey && e.key === 'E') {
                    e.preventDefault();
                    if (distributedClasses.length > 0) exportToExcel();
                }

                // Ctrl+Shift+P: Print Preview
                if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                    e.preventDefault();
                    if (distributedClasses.length > 0) {
                        showPrintPreview();
                    }
                }

                // Ctrl+Shift+R: Quick Redistribute
                if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                    e.preventDefault();
                    quickRedistribute();
                }

                // Left/Right arrows: switch class tabs (when not in input)
                if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                    if (distributedClasses.length > 0 && viewMode !== 'comparison') {
                        e.preventDefault();
                        if (e.key === 'ArrowLeft' && activeClassIndex > 0) {
                            activeClassIndex--;
                            renderClassTabs();
                            renderClassContent();
                        } else if (e.key === 'ArrowRight' && activeClassIndex < distributedClasses.length - 1) {
                            activeClassIndex++;
                            renderClassTabs();
                            renderClassContent();
                        }
                    }
                }
            });
        }

        // Expose new functions globally
        window.moveStudent = moveStudent;
        window.showStudentTooltip = showStudentTooltip;
        window.hideStudentTooltip = hideStudentTooltip;
        window.quickRedistribute = quickRedistribute;
        window.batchMoveSelectedStudents = batchMoveSelectedStudents;
        window.toggleSelectAll = toggleSelectAll;
        window.updateSelectionUI = updateSelectionUI;
        window.undoLastDelete = undoLastDelete;
        window.exportToCSV = exportToCSV;
        window.launchConfetti = launchConfetti;
        window.showPrintPreview = showPrintPreview;

        // Memulai Inisialisasi saat Window dimuat
        window.onload = function() {
            // Inisialisasi daftar pengaturan kelas saat pertama kali dimuat
            initClassConfigurations();

            initFirebase();
            initKeyboardShortcuts();
        const configInputs = document.querySelectorAll('.config-input');
        if (configInputs) {
            configInputs.forEach(el => {
                el.addEventListener('change', () => {
                    triggerAutosave();
                });
            });
        }
        // Trigger file picker
        if (dropzone) {
            dropzone.addEventListener('click', () => fileInput.click());
            
            // Drag & Drop
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dropzone-active');
            });

            dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('dropzone-active');
            });

            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dropzone-active');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    handleFile(files[0]);
                }
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    handleFile(e.target.files[0]);
                }
            });
        }

        // Load Demo Data
        if (btnDemo) {
            btnDemo.addEventListener('click', () => {
                rawStudents = generateDemoData();
                showToast("Sukses!", "Data simulasi sebanyak 240 siswa berhasil dimuat.", "success");
                processAndDistribute();
            });
        }

        // Download Template
        if (btnTemplate) {
            btnTemplate.addEventListener('click', () => {
                downloadExcelTemplate();
            });
        }

        // Process Class Distribution manually
        if (btnProcess) {
            btnProcess.addEventListener('click', () => {
                if (rawStudents.length === 0) {
                    showToast("Data Kosong", "Silakan unggah file Excel atau klik tombol 'Gunakan Data Simulasi' terlebih dahulu.", "error");
                    return;
                }
                processAndDistribute();
            });
        }

        // Export Excel button
        if (btnExportExcel) {
            btnExportExcel.addEventListener('click', () => {
                exportToExcel();
            });
        }

        // Export CSV button
        const btnExportCsv = document.getElementById('btn-export-csv');
        if (btnExportCsv) {
            btnExportCsv.addEventListener('click', () => {
                exportToCSV();
            });
        }

        // Quick Redistribute button
        if (btnQuickRedistribute) {
            btnQuickRedistribute.addEventListener('click', () => {
                quickRedistribute();
            });
        }

        // Jumlah Kelas change listener
        if (configClassesInput) {
            configClassesInput.addEventListener('change', () => {
                initClassConfigurations();
                triggerAutosave();
            });
        }

        // Toggle Views
        if (toggleListView) toggleListView.addEventListener('click', () => setViewMode('list'));
        if (toggleComparisonView) toggleComparisonView.addEventListener('click', () => setViewMode('comparison'));
        if (toggleSeatingView) toggleSeatingView.addEventListener('click', () => setViewMode('seating'));
            // Call once on load (prevent flash)
            document.documentElement.classList.add('no-transition');
            updateDarkModeUI();
            requestAnimationFrame(() => {
                document.documentElement.classList.remove('no-transition');
            });
            if (btnDarkMode) {
                btnDarkMode.addEventListener('click', () => {
                    isDarkMode = !isDarkMode;
                    updateDarkModeUI();
                });
            }
            // Listen for system dark mode changes
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    if (!localStorage.getItem('darkMode')) {
                        isDarkMode = e.matches;
                        updateDarkModeUI();
                    }
                });
            }
            // Pengikat tombol cetak PDF secara eksplisit
            if (btnPrintAll) {
                btnPrintAll.addEventListener('click', () => {
                    showPrintPreview();
                });
            }
            // Manual Student Entry - Toggle Panel
        if (btnToggleManual) {
            btnToggleManual.addEventListener('click', () => {
                const isHidden = manualEntryPanel.classList.toggle('hidden');
                manualChevron.style.transform = isHidden ? '' : 'rotate(180deg)';
            });
        }

        // Manual Student Entry - Add Student
        if (btnAddStudent) {
            btnAddStudent.addEventListener('click', () => {
                const nisnVal = document.getElementById('manual-nisn').value.trim();
                const namaVal = document.getElementById('manual-nama').value.trim();
                const jkVal = document.getElementById('manual-jk').value;
                const skorVal = parseFloat(document.getElementById('manual-skor').value) || 0;
                const sekolahVal = document.getElementById('manual-sekolah').value.trim();
                const prestasiVal = document.getElementById('manual-prestasi').value;

                // Validate required fields
                if (!nisnVal) {
                    showToast("NISN Wajib Diisi", "Silakan masukkan NISN siswa.", "error");
                    return;
                }
                if (!namaVal) {
                    showToast("Nama Wajib Diisi", "Silakan masukkan nama siswa.", "error");
                    return;
                }

                // Check duplicate NISN
                if (rawStudents.some(s => s.nisn === nisnVal)) {
                    showToast("NISN Duplikat", `Siswa dengan NISN "${nisnVal}" sudah ada dalam data.`, "error");
                    return;
                }

                // Clamp score
                const clampedSkor = Math.min(100, Math.max(0, skorVal));

                const newStudent = {
                    nisn: nisnVal,
                    namaSiswa: toProperCase(namaVal),
                    jenisKelamin: jkVal,
                    skorNilai: clampedSkor,
                    namaSekolah: toProperCase(sekolahVal) || 'SD SEBELUMNYA',
                    prestasi: prestasiVal
                };

                rawStudents.push(newStudent);
                manualStudentCount++;

                // Update stats panel if visible
                if (quickStats && !quickStats.classList.contains('hidden')) {
                    renderStatsPanel();
                } else {
                    quickStats.classList.remove('hidden');
                    renderStatsPanel();
                }

                showToast("Siswa Ditambahkan", `Siswa ditambahkan: ${newStudent.namaSiswa}`, "success");

                // Clear form fields (except gender select)
                document.getElementById('manual-nisn').value = '';
                document.getElementById('manual-nama').value = '';
                document.getElementById('manual-skor').value = '';
                document.getElementById('manual-sekolah').value = '';
                document.getElementById('manual-prestasi').value = 'Kosong';

                // Update manual count display
                const countEl = document.getElementById('manual-students-count');
                const countText = document.getElementById('manual-count-text');
                if (countEl && countText) {
                    countEl.classList.remove('hidden');
                    countText.textContent = manualStudentCount;
                }

                // Re-init lucide icons for new elements
                lucide.createIcons();
            });
        }

        // Manual Student Entry - Clear Form
        if (btnClearForm) {
            btnClearForm.addEventListener('click', () => {
                document.getElementById('manual-nisn').value = '';
                document.getElementById('manual-nama').value = '';
                document.getElementById('manual-jk').value = 'L';
                document.getElementById('manual-skor').value = '';
                document.getElementById('manual-sekolah').value = '';
                document.getElementById('manual-prestasi').value = 'Kosong';
            });
        }

        // Reset/Clear Data Button
            const btnResetData = document.getElementById('btn-reset-data');
            if (btnResetData) {
                btnResetData.addEventListener('click', () => {
                    rawStudents = [];
                    distributedClasses = [];
                    activeClassIndex = 0;
                    if (resultCard) resultCard.classList.add('hidden');
                    if (quickStats) quickStats.classList.add('hidden');
                    if (mainStateCard) mainStateCard.classList.remove('hidden');
                    classTabs.innerHTML = '';
                    dynamicContentArea.innerHTML = '';
                    showToast("Data Direset", "Semua data siswa dan hasil pembagian kelas telah dihapus.", "info");
                });
            }

        // Config Export Handler
        if (btnExportConfig) {
            btnExportConfig.addEventListener('click', () => {
                const configData = {
                    tahunAjaran: document.getElementById('config-ta').value,
                    tanggalDokumen: document.getElementById('config-date').value,
                    targetKapasitas: document.getElementById('config-capacity').value,
                    jumlahKelas: document.getElementById('config-classes').value,
                    kepsekNama: document.getElementById('config-kepsek-name').value,
                    kepsekNip: document.getElementById('config-kepsek-nip').value,
                    classConfigurations: classConfigurations,
                    exportedAt: new Date().toISOString(),
                    exportedBy: 'Sistem Pembagian Kelas SMPN 2 Kedungbanteng'
                };
                const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Konfigurasi_Kelas_SMPN2_${document.getElementById('config-ta').value.replace('/', '-')}.json`;
                document.body.appendChild(link);
                link.click();
                setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 200);
                showToast("Konfigurasi Diekspor", "File konfigurasi berhasil diunduh. Dapat dibagikan ke wali kelas.", "success");
            });
        }

        // Config Import Handler
        if (btnImportConfig) {
            btnImportConfig.addEventListener('click', () => configFileInput.click());
            if (configFileInput) {
                configFileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = function(ev) {
                        try {
                            const data = JSON.parse(ev.target.result);
                            if (!data.classConfigurations || !Array.isArray(data.classConfigurations)) {
                                showToast("Format Tidak Valid", "File tidak berisi konfigurasi kelas yang valid.", "error");
                                return;
                            }
                            // Restore config values
                            if (data.tahunAjaran) document.getElementById('config-ta').value = data.tahunAjaran;
                            if (data.tanggalDokumen) document.getElementById('config-date').value = data.tanggalDokumen;
                            if (data.targetKapasitas) document.getElementById('config-capacity').value = data.targetKapasitas;
                            if (data.jumlahKelas) document.getElementById('config-classes').value = data.jumlahKelas;
                            if (data.kepsekNama) document.getElementById('config-kepsek-name').value = data.kepsekNama;
                            if (data.kepsekNip) document.getElementById('config-kepsek-nip').value = data.kepsekNip;
                            classConfigurations = data.classConfigurations;
                            initClassConfigurations();
                            showToast("Konfigurasi Dimuat", `Berhasil memuat konfigurasi ${classConfigurations.length} kelas dari file.`, "success");
                        } catch (err) {
                            showToast("Gagal Membaca File", "File tidak dapat diparse sebagai JSON: " + err.message, "error");
                        }
                    };
                    reader.readAsText(file);
                    configFileInput.value = '';
                });
            }

            // Expose functions globally for HTML onclick handlers
            window.editStudent = editStudent;
            window.deleteStudent = deleteStudent;
            window.handleFile = handleFile;
        }
        };
