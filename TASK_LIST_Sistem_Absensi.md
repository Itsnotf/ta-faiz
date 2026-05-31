# Task List — Sistem Absensi Face Recognition
*Dibuat: 31 Mei 2026 | Dieksekusi satu task per sesi Claude Code*

---

## Konteks Bisnis (baca ini dulu sebelum apapun)

**Masalah yang diselesaikan:** Absensi kuliah di politeknik selama ini bergantung pada manusia — dosen memanggil nama, mahasiswa tanda tangan. Rawan manipulasi, buang waktu, dan seluruh beban ada di dosen. Sistem ini menghapus keterlibatan manusia dari proses absensi sepenuhnya.

**Cara kerja utama:** Kamera di ruang kelas mengenali wajah mahasiswa dan dosen secara otomatis saat kuliah berlangsung. Tidak ada yang perlu menekan tombol. Kehadiran tercatat sendiri. Setelah kuliah selesai, siapa yang tidak terdeteksi langsung ditandai alpa oleh sistem — otomatis, tanpa intervensi.

**Tiga role dan tanggung jawabnya:**
- **Super Admin** — pengelola tingkat institusi. Melihat gambaran besar lintas jurusan (tren kehadiran, status sistem), tidak terlibat operasi harian.
- **Admin Jurusan** — pengguna paling aktif. Mengelola semua data (mahasiswa, dosen, jadwal, ruangan), memantau absensi harian, dan memproses pengajuan keterangan izin/sakit dari mahasiswa.
- **Mahasiswa** — akses hanya untuk memantau kehadiran diri sendiri dan mengajukan keterangan. Tidak bisa mengubah data absensi langsung.

**Alur keterangan izin/sakit:** Mahasiswa yang alpa bisa mengajukan keterangan (sakit/izin) lewat dashboard mereka pada hari yang sama, dengan wajib melampirkan bukti. Admin jurusan menerima pengajuan, melihat bukti, lalu approve atau tolak. Jika diapprove, status alpa berubah otomatis ke sakit/izin.

**Aturan bisnis yang tidak boleh dilanggar:**
- Keterangan hanya bisa diajukan **hari yang sama sebelum pukul 21:00**. Lewat dari itu → alpa dikunci **permanen**, tidak bisa diubah siapapun termasuk super admin. Ini disengaja agar tidak bisa dimanipulasi retroaktif.
- Absensi hadir hanya diterima dalam **window N menit pertama** sejak kuliah dimulai (default 15 menit, konfigurasi per jadwal).
- Mahasiswa bisa diabsen hanya jika sudah **enrollment wajah** — mendaftarkan foto dan lulus verifikasi dari 3 jarak (dekat, sedang, jauh) dengan confidence ≥ 90%. Ini dilakukan sekali sebelum semester.
- Sistem mengenali wajah dengan **confidence threshold 0.65** untuk absensi harian. Di bawah itu diabaikan.

---

## Konteks Global (baca sekali, berlaku untuk semua task)

**Starterkit:** `git clone https://github.com/Itsnotf/starterkit-v2.git`
**Stack:** Laravel 12 + Fortify + Spatie Permission + Inertia v2 + React + TypeScript + Tailwind + shadcn/ui
**Pattern wajib:** Controller hanya panggil Service. Semua logika bisnis di Service.
**Kamera:** Webcam laptop (`cv2.VideoCapture(0)`). Laravel + Python + MySQL semua di `localhost`.
**Chart:** Gunakan shadcn/ui chart (wrapper recharts). Install: `npx shadcn@latest add chart`

**Aturan wajib Claude Code:**
- `make:feature {Name}` = generate model + migration + controller + request + service sekaligus. Gunakan HANYA saat butuh semua itu (fase CRUD, bukan fase migration saja)
- Setiap tambah halaman baru → update `resources/js/components/app-sidebar.tsx`
- Setiap tambah fitur baru → tambah permission ke `config/starterkit.php`
- TypeScript interface untuk setiap model baru → `resources/js/types/index.d.ts`
- File private (bukti keterangan, foto enrollment) → `Storage::disk('local')`, bukan `public`
- Form yang redirect setelah submit → `useForm` dari `@inertiajs/react`
- Form yang butuh response JSON tanpa redirect (misal: verify-frame) → `axios.post()` + controller return `response()->json()`

---

## FASE 0 — Setup Awal

### TASK-000 — Environment & seeder
**Tujuan:** Siapkan project dari starterkit, konfigurasi roles/permissions, seed user demo.

**Langkah:**
1. Clone starterkit, `composer install`, `npm install`, copy `.env.example` → `.env`
2. Set DB di `.env`, tambah dua variabel baru:
   ```
   INTERNAL_API_KEY=sk-internal-absensi-dev-2026
   PYTHON_SERVICE_URL=http://localhost:8001
   ```
3. `config/app.php` — tambah: `'internal_api_key' => env('INTERNAL_API_KEY')`
4. `config/starterkit.php` — ganti isi seluruhnya:
   ```php
   'pagination' => 10,
   'roles' => ['super_admin', 'admin_jurusan', 'mahasiswa'],
   'default_admin_role' => 'super_admin',
   'permissions' => [
       'users index','users create','users edit','users delete',
       'roles index','roles create','roles edit','roles delete',
       'institusi index','institusi edit',
       'jurusan index','jurusan create','jurusan edit','jurusan delete',
       'prodi index','prodi create','prodi edit','prodi delete',
       'ruangan index','ruangan create','ruangan edit','ruangan delete',
       'dosen index','dosen create','dosen edit','dosen delete',
       'kelas index','kelas create','kelas edit','kelas delete',
       'mahasiswa index','mahasiswa create','mahasiswa edit','mahasiswa delete',
       'jadwal index','jadwal create','jadwal edit','jadwal delete',
       'sesi index',
       'absensi index',
       'keterangan index','keterangan create','keterangan approve',
       'enrollment index',
       'laporan index','laporan export',
   ],
   ```
5. `database/seeders/RoleSeeder.php` — seed ketiga role di atas
6. `database/seeders/UserSeeder.php` — buat 3 user demo:
   - `superadmin@demo.id` / `Password@123` → role `super_admin`
   - `admin@demo.id` / `Password@123` → role `admin_jurusan`
   - `mahasiswa@demo.id` / `Password@123` → role `mahasiswa`
7. `php artisan migrate:fresh --seed`

**Audit:**
- [ ] `migrate:fresh --seed` tanpa error
- [ ] Login 3 user demo berhasil, masing-masing masuk ke halaman yang benar

---

## FASE 1 — Migrations & Models

### TASK-101 — Migration hierarki institusi
**Tujuan:** Buat 5 tabel dasar hierarki data. Gunakan `make:migration` (bukan `make:feature` — CRUD dibuat di fase 3).

**Jalankan 5 perintah:**
```bash
php artisan make:migration create_institusi_table
php artisan make:migration create_jurusan_table
php artisan make:migration create_prodi_table
php artisan make:migration create_ruangan_table
php artisan make:migration create_kelas_table
```

**Isi kolom tiap migration:**
- `institusi` → `nama`, `alamat`, `logo` (nullable)
- `jurusan` → `institusi_id` FK, `nama`, `kode`
- `prodi` → `jurusan_id` FK, `nama`, `kode`
- `ruangan` → `jurusan_id` FK, `nama`, `kode`, `kapasitas`, `cctv_url` (nullable, untuk produksi)
- `kelas` → `prodi_id` FK, `nama`, `angkatan`

**Buat juga 5 Model kosong** (`php artisan make:model` untuk masing-masing) dengan relasi dasar:
- `Institusi` hasMany `Jurusan`
- `Jurusan` belongsTo `Institusi`, hasMany `Prodi`, `Ruangan`
- `Prodi` belongsTo `Jurusan`, hasMany `Kelas`
- `Ruangan` belongsTo `Jurusan`
- `Kelas` belongsTo `Prodi`

**Audit:**
- [ ] `php artisan migrate` jalan tanpa error
- [ ] Foreign key constraints terbuat (cek via tinker: `Schema::getColumnListing('jurusan')`)

---

### TASK-102 — Migration dosen & mahasiswa + relasi User
**Tujuan:** Buat tabel dosen, mahasiswa, dan tambah `jurusan_id` ke tabel `users` untuk scope admin jurusan.

**Jalankan:**
```bash
php artisan make:migration create_dosen_table
php artisan make:migration create_mahasiswa_table
php artisan make:migration add_jurusan_id_to_users_table
```

**Kolom:**
- `dosen` → `jurusan_id` FK, `nip` (unique), `nama`, `email`, `foto_path` (nullable), `face_encodings` (json nullable)
- `mahasiswa` → `user_id` FK nullable, `kelas_id` FK, `nim` (unique), `nama`, `foto_paths` (json nullable), `face_encodings` (json nullable), `enrollment_score` (float nullable), `status_akun` (enum: `pending_upload`,`pending_verifikasi`,`aktif` — default `pending_upload`), `foto_verified_at` (timestamp nullable)
- `add_jurusan_id_to_users` → `jurusan_id` (FK nullable ke `jurusan.id`)

**Update `app/Models/User.php`:**
```php
public function jurusan(): BelongsTo { return $this->belongsTo(Jurusan::class); }
public function mahasiswa(): HasOne { return $this->hasOne(Mahasiswa::class); }
public function isSuperAdmin(): bool { return $this->hasRole('super_admin'); }
public function isAdminJurusan(): bool { return $this->hasRole('admin_jurusan'); }
public function isMahasiswa(): bool { return $this->hasRole('mahasiswa'); }
```

**Buat `app/Models/Mahasiswa.php`** dengan:
```php
protected $casts = ['face_encodings' => 'array', 'foto_paths' => 'array'];
```

**Audit:**
- [ ] Migration jalan tanpa error
- [ ] `User::find(1)->jurusan` tidak error (null ok, relasi ada)
- [ ] Cast JSON mahasiswa bekerja: assign array → simpan → baca kembali sebagai array

---

### TASK-103 — Migration jadwal & sesi absensi
**Jalankan:**
```bash
php artisan make:migration create_jadwal_table
php artisan make:migration create_sesi_absensi_table
```

**Kolom:**
- `jadwal` → `kelas_id` FK, `dosen_id` FK, `ruangan_id` FK, `mata_kuliah`, `hari` (enum: `senin`,`selasa`,`rabu`,`kamis`,`jumat`,`sabtu`), `jam_mulai` (time), `jam_selesai` (time), `window_menit` (int default 15), `is_active` (boolean default true)
- `sesi_absensi` → `jadwal_id` FK, `tanggal` (date), `mulai_at` (timestamp), `selesai_at` (timestamp nullable), `status` (enum: `berlangsung`,`selesai`)

**Buat Model** `Jadwal` dan `SesiAbsensi` dengan relasi yang sesuai.

**Audit:**
- [ ] Migration jalan tanpa error
- [ ] `Jadwal::with(['kelas','dosen','ruangan'])->first()` tidak error (setelah ada data seed)

---

### TASK-104 — Migration absensi, keterangan, enrollment verifikasi
**Jalankan:**
```bash
php artisan make:migration create_absensi_mahasiswa_table
php artisan make:migration create_absensi_dosen_table
php artisan make:migration create_keterangan_table
php artisan make:migration create_enrollment_verifikasi_table
```

**Kolom:**
- `absensi_mahasiswa` → `sesi_id` FK, `mahasiswa_id` FK, `hadir_at` (timestamp nullable), `status` (enum: `hadir`,`alpa`,`izin`,`sakit`), `confidence` (float nullable), `is_locked` (boolean default false)
- `absensi_dosen` → `sesi_id` FK, `dosen_id` FK, `hadir_at` (timestamp nullable), `status` (enum: `hadir`,`alpa`), `confidence` (float nullable)
- `keterangan` → `absensi_mahasiswa_id` FK, `mahasiswa_id` FK, `jenis` (enum: `izin`,`sakit`), `keterangan` (text), `file_bukti` (string), `diajukan_oleh` (enum: `mahasiswa`,`admin`), `status_keterangan` (enum: `pending`,`approved`,`rejected` — default `pending`), `disetujui_oleh` (FK ke users nullable), `approved_at` (timestamp nullable)
- `enrollment_verifikasi` → `mahasiswa_id` FK, `jarak` (enum: `dekat`,`sedang`,`jauh`), `confidence` (float), `verified_at` (timestamp), tambah `unique(['mahasiswa_id','jarak'])`

**Buat Model** untuk keempat tabel dengan relasi dan cast yang sesuai.

**Audit:**
- [ ] Migration jalan tanpa error
- [ ] Unique constraint `enrollment_verifikasi` aktif (coba insert duplikat → exception)
- [ ] `php artisan migrate:rollback --step=4` bersih

---

## FASE 2 — Auth & Routing

### TASK-201 — Middleware X-Internal-Key
**Tujuan:** Proteksi route internal yang hanya boleh dipanggil Python service.

**Buat `app/Http/Middleware/InternalApiKey.php`:**
```php
public function handle(Request $request, Closure $next) {
    $key = $request->header('X-Internal-Key');
    if (!$key || $key !== config('app.internal_api_key')) {
        return response()->json(['message' => 'Unauthorized.'], 401);
    }
    return $next($request);
}
```

**`bootstrap/app.php`** — tambah alias di dalam `withMiddleware`:
```php
$middleware->alias(['internal.key' => \App\Http\Middleware\InternalApiKey::class]);
```

**Buat `routes/api.php`** jika belum ada, daftarkan di `bootstrap/app.php`.

**Audit:**
- [ ] `curl -X GET http://localhost:8000/api/internal/test` → 401
- [ ] `curl -H "X-Internal-Key: sk-internal-absensi-dev-2026" ...` → 404 (route belum ada, tapi middleware lewat)

---

### TASK-202 — Dashboard routing per role
**Tujuan:** Setelah login, tiap role masuk ke halaman dashboard masing-masing.

**`app/Http/Controllers/DashboardController.php`:**
```php
public function index() {
    $user = auth()->user();
    if ($user->isSuperAdmin())    return Inertia::render('dashboard/super-admin');
    if ($user->isAdminJurusan()) return Inertia::render('dashboard/admin-jurusan');
    if ($user->isMahasiswa())    return Inertia::render('dashboard/mahasiswa');
    return Inertia::render('dashboard/admin'); // fallback starterkit
}
```

**Buat 3 halaman placeholder** (hanya `<h1>` saja, diisi di TASK-901/902/903):
- `resources/js/pages/dashboard/super-admin.tsx`
- `resources/js/pages/dashboard/admin-jurusan.tsx`
- `resources/js/pages/dashboard/mahasiswa.tsx`

**Audit:**
- [ ] Login super_admin → halaman super-admin (tidak 404)
- [ ] Login admin_jurusan → halaman admin-jurusan
- [ ] Login mahasiswa → halaman mahasiswa

---

## FASE 3 — Master Data CRUD

### TASK-301 — CRUD Institusi & Jurusan
**Jalankan:**
```bash
php artisan make:feature Institusi
php artisan make:feature Jurusan
```

**Yang dikerjakan:**
- `InstitusiService` → `index()`, `store()`, `update()`, `destroy()`. Super admin only — tidak di-scope.
- `JurusanService` → sama, tambah scope: jika `admin_jurusan`, filter by `auth()->user()->jurusan_id`. Jika `super_admin`, tampil semua.
- `StoreInstitusiRequest` / `UpdateInstitusiRequest` → validasi nama required
- `StoreJurusanRequest` → validasi `institusi_id` exists, `nama`, `kode` unique
- Route di `routes/web.php`: `Route::resource('institusi', InstitusiController::class)->middleware('can:institusi index')`
- Halaman React: tabel shadcn + dialog form (shadcn Dialog + Form). Sidebar update: tambah menu Institusi dan Jurusan
- TypeScript: tambah interface `Institusi` dan `Jurusan` ke `types/index.d.ts`

**Audit:**
- [ ] Create, edit, delete institusi berfungsi
- [ ] Create jurusan dengan pilih institusi berfungsi
- [ ] Login admin_jurusan: menu institusi tidak muncul (permission check)

---

### TASK-302 — CRUD Prodi, Ruangan, Kelas
**Jalankan:**
```bash
php artisan make:feature Prodi
php artisan make:feature Ruangan
php artisan make:feature Kelas
```

**Yang dikerjakan (tiap entitas pola sama seperti TASK-301):**

- `ProdiService` → scope by jurusan, dropdown `jurusan_id` di form
- `RuanganService` → scope by jurusan, field `cctv_url` ada di form tapi opsional (placeholder "Diisi saat produksi dengan CCTV")
- `KelasService` → scope by jurusan via prodi, form: dropdown `prodi_id` + input `nama` + `angkatan`
- Permission middleware masing-masing: `prodi index`, `ruangan index`, `kelas index`
- Sidebar: tambah menu Prodi, Ruangan, Kelas
- TypeScript: tambah interface `Prodi`, `Ruangan`, `Kelas` ke `types/index.d.ts`

**Audit:**
- [ ] CRUD ketiga entitas berfungsi
- [ ] Dropdown prodi di form kelas hanya tampil prodi dari jurusan user yang login
- [ ] Admin jurusan tidak bisa lihat data jurusan lain

---

### TASK-303 — CRUD Dosen & Mahasiswa
**Jalankan:**
```bash
php artisan make:feature Dosen
php artisan make:feature Mahasiswa
```

**Dosen:** CRUD biasa. Kolom `face_encodings` dan `foto_path` tidak ditampilkan di form (dihandle oleh enrollment). Scope by `jurusan_id`.

**Mahasiswa — logika tambahan:**
- `MahasiswaService::store()` dibungkus `DB::transaction`:
  1. Buat `User` dengan email `{nim}@mhs.demo.id`, password `Password@123`, assign role `mahasiswa`
  2. Buat `Mahasiswa`, isi `user_id` dari user yang baru dibuat
- `MahasiswaService::destroy()` → hapus User terkait sekaligus (cascade atau manual)
- Tampilkan kolom `status_akun` di tabel dengan badge warna (pending = kuning, aktif = hijau)
- Sidebar: tambah menu Dosen dan Mahasiswa
- TypeScript: tambah interface `Dosen`, `Mahasiswa`

**Audit:**
- [ ] Buat mahasiswa → user ikut terbuat, bisa login dengan `nim@mhs.demo.id`
- [ ] Delete mahasiswa → user ikut terhapus
- [ ] Badge status_akun tampil dengan warna yang benar

---

### TASK-304 — CRUD Jadwal
**Jalankan:** `php artisan make:feature Jadwal`

**JadwalService:**
- `index()` → scope by jurusan (via kelas → prodi → jurusan)
- `store()` → validasi bentrok: cek apakah ruangan + hari + jam_mulai–jam_selesai overlap dengan jadwal lain. Gunakan query: `where ruangan_id = ? AND hari = ? AND NOT (jam_selesai <= ? OR jam_mulai >= ?)`
- Form: dropdown kelas (scope jurusan), dropdown dosen (scope jurusan), dropdown ruangan (scope jurusan), select hari, timepicker jam_mulai + jam_selesai, input window_menit (default 15)
- Sidebar: tambah menu Jadwal
- TypeScript: tambah interface `Jadwal`

**Audit:**
- [ ] Create jadwal berfungsi
- [ ] Buat jadwal dengan ruangan + hari + jam yang sama → error "jadwal bentrok"
- [ ] Dropdown hanya tampil data jurusan yang benar

---

## FASE 4 — Python Service

### TASK-401 — Setup project Python
**Tujuan:** Buat folder `python-service/` di root project Laravel, struktur lengkap, bisa dijalankan.

**Buat struktur:**
```
python-service/
├── main.py
├── .env
├── requirements.txt
├── client/
│   └── laravel_client.py
├── api/
│   └── enroll_router.py
├── core/
│   ├── camera.py
│   └── recognizer.py
└── session_runner.py
```

**`requirements.txt`:**
```
fastapi==0.115.0
uvicorn==0.30.0
face_recognition==1.3.0
opencv-python==4.10.0.84
python-dotenv==1.0.1
requests==2.32.3
Pillow==10.4.0
numpy==1.26.4
```

**`.env` Python:**
```
LARAVEL_BASE_URL=http://localhost:8000
INTERNAL_API_KEY=sk-internal-absensi-dev-2026
POLL_INTERVAL_SECONDS=5
CONFIDENCE_THRESHOLD_ABSENSI=0.65
CONFIDENCE_THRESHOLD_ENROLLMENT=0.90
```

**`main.py`** — FastAPI app dasar, include `enroll_router`, endpoint `GET /` return `{"status":"ok"}`, endpoint `GET /session/status` return dict active sessions (diisi di TASK-403).

**Audit:**
- [ ] `pip install -r requirements.txt` sukses
- [ ] `uvicorn main:app --reload --port 8001` jalan tanpa error
- [ ] `GET http://localhost:8001/` → `{"status":"ok"}`

---

### TASK-402 — Endpoint enrollment Python
**File:** `api/enroll_router.py`

**`POST /enroll/generate-encoding`**
- Input: `{"foto_list": ["base64string", ...]}` (list 5 foto)
- Proses: decode base64 → PIL → numpy array → `face_recognition.face_encodings()`
- Jika foto ke-N tidak ada wajah → return `{"error": "no_face", "foto_index": N}`
- Output sukses: `{"encodings": [[128 floats], ...], "count": 5}`

**`POST /enroll/verify-frame`**
- Input: `{"frame_base64": "...", "known_encodings": [[...], ...], "jarak": "dekat", "threshold": 0.90}`
- Proses: decode frame → `face_recognition.face_encodings()` → `face_distance(known_encs, frame_enc)` → `confidence = 1 - min(distances)`
- Jika tidak ada wajah di frame → return `{"confidence": 0.0, "lulus": false, "error": "no_face"}`
- Output: `{"confidence": 0.94, "lulus": true, "threshold": 0.90, "jarak": "dekat"}`

**Helper `base64_to_numpy(b64_str)`** — strip prefix `data:image/...;base64,`, decode, PIL.Image.open, convert RGB, return numpy array.

**Audit:**
- [ ] POST foto valid (wajah jelas) → return 5 encodings, masing-masing array 128 float
- [ ] POST foto tanpa wajah → return error `no_face` dengan `foto_index`
- [ ] POST verify-frame foto yang sama dengan enrollment → confidence ≥ 0.90
- [ ] POST verify-frame foto orang berbeda → confidence < 0.90

---

### TASK-403 — Session runner & webcam
**File:** `session_runner.py`, `core/camera.py`, `core/recognizer.py`, `client/laravel_client.py`

**`laravel_client.py`** — semua request ke Laravel:
```python
HEADERS = {"X-Internal-Key": API_KEY, "Content-Type": "application/json"}
def get_sesi_aktif() → dict
def get_encodings(ruangan_id) → dict
def record_absensi(payload) → (status_code, dict)  # 409 bukan error fatal
```

**`core/camera.py`** — baca webcam loop:
```python
def run_camera(ruangan_id, sesi_info, known_encodings, stop_event):
    cap = cv2.VideoCapture(0)
    while not stop_event.is_set():
        ret, frame = cap.read()
        if ret:
            recognize_and_report(frame, ruangan_id, known_encodings)
        time.sleep(1)
    cap.release()
```

**`core/recognizer.py`** — `recognize_and_report(frame, ruangan_id, known_encodings)`:
- `face_recognition.face_encodings(frame)` → jika kosong, return
- bandingkan dengan known_encodings (mahasiswa + dosen)
- jika confidence ≥ threshold → `record_absensi(payload)`, log hasilnya

**`session_runner.py`** — dict global `active_sessions = {}`, loop polling:
```python
while True:
    data = get_sesi_aktif()
    for sesi in data["sesi_aktif"]:
        rid = sesi["ruangan_id"]
        if rid not in active_sessions:
            # ambil encodings, spawn thread
            stop_event = threading.Event()
            encs = get_encodings(rid)
            t = threading.Thread(target=run_camera, args=(rid, sesi, encs, stop_event))
            t.start()
            active_sessions[rid] = {"thread": t, "stop": stop_event, "sesi": sesi}
    # cleanup sesi yang sudah selesai
    for rid in list(active_sessions.keys()):
        selesai_at = parse_datetime(active_sessions[rid]["sesi"]["selesai_at"])
        if datetime.now(timezone.utc) >= selesai_at:
            active_sessions[rid]["stop"].set()
            del active_sessions[rid]
    time.sleep(POLL_INTERVAL)
```

**`GET /session/status`** di `main.py` → return list `ruangan_id` yang ada di `active_sessions`.

**Audit:**
- [ ] Python jalan, log polling muncul setiap 5 detik
- [ ] Tidak ada sesi aktif → `active_sessions` kosong, tidak ada webcam terbuka
- [ ] Buat sesi manual di DB → webcam terbuka (cek log "Camera started")
- [ ] `GET /session/status` → list ruangan yang aktif

---

## FASE 5 — Enrollment Flow

### TASK-501 — Enrollment backend (Laravel)
**Jalankan:** `php artisan make:feature Enrollment`

**`config/services.php`** — tambah:
```php
'python' => ['url' => env('PYTHON_SERVICE_URL', 'http://localhost:8001')],
```

**`EnrollmentService`** — 5 method:

`uploadFoto(Mahasiswa $mhs, array $files)`:
- Validasi tepat 5 file (jpg/png, max 2MB each)
- Simpan ke `storage/app/private/enrollment/{mahasiswa_id}/`
- POST ke `{PYTHON_URL}/enroll/generate-encoding` dengan list base64
- Jika Python error → throw exception dengan pesan asli dari Python
- Simpan `face_encodings` ke DB, ubah `status_akun` → `pending_verifikasi`

`verifyFrame(Mahasiswa $mhs, string $frameBase64, string $jarak)`:
- Ambil `face_encodings` mahasiswa dari DB
- POST ke `{PYTHON_URL}/enroll/verify-frame` dengan frame + known_encodings + jarak
- Jika lulus (`confidence >= 0.90`) → simpan ke tabel `enrollment_verifikasi` (upsert by jarak)
- Return hasil dari Python + tambah field `semua_jarak_lulus` (bool: count verifikasi = 3)

`approve(Mahasiswa $mhs)`:
- Cek count `enrollment_verifikasi` where `mahasiswa_id = mhs.id` = 3 → jika tidak → abort 422
- Update `status_akun` → `aktif`, isi `foto_verified_at`

`reset(Mahasiswa $mhs)`:
- Hapus file dari storage
- Set `face_encodings`, `foto_paths`, `enrollment_score`, `foto_verified_at` → null
- Set `status_akun` → `pending_upload`
- Hapus semua record `enrollment_verifikasi` mahasiswa ini

`status(Mahasiswa $mhs)`:
- Return: `status_akun`, list jarak yang sudah lulus (dari `enrollment_verifikasi`)

**Routes di `routes/web.php`** (dalam middleware `auth`):
```php
Route::prefix('enrollment')->name('enrollment.')->middleware('can:enrollment index')->group(function () {
    Route::get('/', [EnrollmentController::class, 'index'])->name('index');
    Route::get('{mahasiswa}/status', [EnrollmentController::class, 'status'])->name('status');
    Route::post('{mahasiswa}/upload-foto', [EnrollmentController::class, 'uploadFoto'])->name('upload-foto');
    Route::post('{mahasiswa}/verify-frame', [EnrollmentController::class, 'verifyFrame'])->name('verify-frame');
    Route::patch('{mahasiswa}/approve', [EnrollmentController::class, 'approve'])->name('approve');
    Route::delete('{mahasiswa}/reset', [EnrollmentController::class, 'reset'])->name('reset');
});
```

**Catatan penting:** `verifyFrame` harus return `response()->json()` (bukan Inertia), karena dipanggil via `axios` dari frontend.

**Audit:**
- [ ] Upload 5 foto wajah valid → `face_encodings` tersimpan di DB sebagai array
- [ ] Upload 4 foto → error validasi
- [ ] Upload foto tanpa wajah → pesan error dari Python tersampaikan ke user
- [ ] Python mati → response 503 dengan pesan "Layanan tidak tersedia"
- [ ] Approve sebelum 3 jarak lulus → abort 422

---

### TASK-502 — Enrollment frontend
**File:** `pages/enrollment/index.tsx`, `pages/enrollment/verifikasi.tsx`

**`index.tsx`:** Tabel mahasiswa (gunakan shadcn Table) dengan kolom: nama, NIM, status_akun (badge), aksi (tombol "Verifikasi" jika pending_verifikasi, tombol "Reset"). Filter by kelas.

**`verifikasi.tsx`:** Halaman verifikasi 3 jarak.
- `useRef<HTMLVideoElement>` untuk video element
- `useEffect` → `navigator.mediaDevices.getUserMedia({video: true})` → set ke `videoRef.current.srcObject`
- State: `hasil: {dekat: boolean|null, sedang: boolean|null, jauh: boolean|null}`
- 3 tombol capture per jarak — saat klik:
  ```tsx
  const canvas = document.createElement('canvas');
  canvas.width = videoRef.current.videoWidth;
  canvas.height = videoRef.current.videoHeight;
  canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
  const frameBase64 = canvas.toDataURL('image/jpeg', 0.8);
  const res = await axios.post(route('enrollment.verify-frame', mahasiswa.id), { frame_base64: frameBase64, jarak });
  ```
- Tampilkan confidence + lulus/tidak per jarak (shadcn Badge)
- Jika `res.data.semua_jarak_lulus === true` → tampilkan tombol Approve (Inertia form patch)
- Sidebar: tambah menu Enrollment

**Audit:**
- [ ] Webcam terbuka saat halaman verifikasi dibuka
- [ ] Klik "Verifikasi Dekat" → frame terkirim → confidence ditampilkan
- [ ] Setelah 3 jarak lulus → tombol Approve muncul
- [ ] Klik Approve → redirect ke index dengan status "aktif"

---

## FASE 6 — Internal API

### TASK-601 — Internal API endpoints
**File:** `routes/api.php`, `app/Http/Controllers/InternalController.php`

**Routes (semua dalam middleware `internal.key`):**
```php
Route::middleware('internal.key')->prefix('internal')->group(function () {
    Route::get('/sesi-aktif', [InternalController::class, 'sesiAktif']);
    Route::get('/encodings/{ruangan}', [InternalController::class, 'encodings']);
    Route::post('/absensi/record', [InternalController::class, 'recordAbsensi']);
});
```

**`sesiAktif()`:** Query `SesiAbsensi::where('status','berlangsung')->with(['jadwal.ruangan'])->get()`. Return array berisi: `sesi_id`, `ruangan_id`, `cctv_url` (dari jadwal.ruangan), `mulai_at`, `selesai_at`, `window_menit` (dari jadwal).

**`encodings(Ruangan $ruangan)`:** Cari semua `Jadwal` yang punya `ruangan_id` ini dan `status = berlangsung` hari ini → ambil kelas → ambil mahasiswa kelas tersebut + dosen jadwal tersebut. Return:
```json
{
  "mahasiswa": [{"id":1,"nim":"...","nama":"...","encodings":[[...]]}],
  "dosen":     [{"id":1,"nip":"...","nama":"...","encodings":[[...]]}]
}
```
Hanya include yang `face_encodings` tidak null.

**`recordAbsensi(Request $request)`:** Payload: `nim_or_nip`, `type` (mahasiswa|dosen), `ruangan_id`, `timestamp`, `confidence`.
- Cari mahasiswa/dosen by nim/nip
- Cari sesi aktif di ruangan ini
- Cek window: `Carbon::parse($sesi->mulai_at)->addMinutes($jadwal->window_menit)` — jika sudah lewat, return `{"status":"out_of_window"}`
- Cek duplikat: sudah ada absensi hadir untuk mahasiswa + sesi ini → return 409 `{"status":"duplicate"}`
- Simpan absensi, return 200 `{"status":"recorded","nama":"...","is_duplicate":false}`

**Audit:**
- [ ] Tanpa header → 401
- [ ] GET sesi-aktif saat tidak ada sesi berlangsung → `{"sesi_aktif":[]}`
- [ ] GET encodings → return struktur yang benar dengan encodings array
- [ ] POST record wajah valid dalam window → 200 recorded
- [ ] POST record duplikat → 409
- [ ] POST record di luar window → `out_of_window`

---

## FASE 7 — Absensi & Scheduler

### TASK-701 — Scheduler jobs
**Tujuan:** Otomasi buat sesi, batch alpa, dan lock alpa.

**Buat command:** `php artisan make:command BuatSesiHariIni --command=sesi:buat-hari-ini`
- Logic: ambil semua `Jadwal` yang `hari` = hari ini (lowercase bahasa Indonesia) dan `is_active = true`. Untuk tiap jadwal, `SesiAbsensi::firstOrCreate(['jadwal_id'=>$id,'tanggal'=>today()], ['mulai_at'=>..., 'status'=>'berlangsung'])`.

**Buat job:** `php artisan make:job BatchAlpaJob`
- Logic: Cari semua `SesiAbsensi` yang `status = berlangsung` dan `selesai_at` sudah lewat (atau tidak ada dan waktu sekarang sudah melewati `jadwal.jam_selesai`). Untuk tiap sesi:
  1. Ambil semua mahasiswa di kelas jadwal tersebut
  2. Cari yang tidak punya record `absensi_mahasiswa` hadir di sesi ini
  3. Insert absensi dengan `status = alpa`
  4. Update sesi `status = selesai`, isi `selesai_at`

**Buat job:** `php artisan make:job LockAlpaJob`
- Logic: `AbsensiMahasiswa::whereDate('created_at', today())->where('status','alpa')->where('is_locked',false)->whereDoesntHave('keterangan', fn($q) => $q->whereIn('status_keterangan',['pending','approved']))->update(['is_locked'=>true])`

**Daftarkan di `bootstrap/app.php`** (Laravel 12 — bukan Kernel.php):
```php
->withSchedule(function (Schedule $schedule) {
    $schedule->command('sesi:buat-hari-ini')->dailyAt('06:00');
    $schedule->job(new BatchAlpaJob)->everyFiveMinutes();
    $schedule->job(new LockAlpaJob)->dailyAt('21:00')->timezone('Asia/Jakarta');
})
```

**Jalankan manual untuk test:** `php artisan sesi:buat-hari-ini` dan `php artisan schedule:run`.

**Audit:**
- [ ] `php artisan sesi:buat-hari-ini` buat sesi untuk jadwal hari ini
- [ ] BatchAlpaJob: mahasiswa yang tidak hadir di sesi selesai → dapat status alpa
- [ ] LockAlpaJob: alpa hari ini tanpa keterangan → `is_locked = true`
- [ ] LockAlpaJob: alpa yang punya keterangan pending → tidak dikunci

---

### TASK-702 — Halaman rekap absensi (admin)
**File:** `pages/absensi/index.tsx`, tambah route `absensi.index` di `routes/web.php`

**Fitur:**
- Filter atas: select kelas, select jadwal/mata kuliah (cascade dari kelas), select tanggal sesi
- Tabel: nama mahasiswa, status (shadcn Badge warna: hadir=hijau, alpa=merah, izin=biru, sakit=kuning), waktu hadir, confidence
- Data dikirim via Inertia props dari controller + service
- Sidebar: tambah menu Rekap Absensi

**AbsensiService::getRekapSesi(sesi_id):** join mahasiswa + absensi_mahasiswa untuk sesi ini.

**Audit:**
- [ ] Halaman load dengan data yang benar
- [ ] Ganti filter kelas → data berubah (Inertia router.get dengan preserve state)
- [ ] Badge warna sesuai status

---

## FASE 8 — Keterangan Izin/Sakit

### TASK-801 — Keterangan backend
**Jalankan:** `php artisan make:feature Keterangan`

**`KeteranganService::store(Request $request, User $user)`:**
```php
$absensi = AbsensiMahasiswa::findOrFail($request->absensi_id);

// Guard 1: harus alpa
if ($absensi->status !== 'alpa') abort(422, 'Keterangan hanya untuk status Alpa.');

// Guard 2: deadline jam 21:00 hari yang sama
$deadline = Carbon::parse($absensi->created_at)->setTimezone('Asia/Jakarta')->setTime(21,0,0);
if (now('Asia/Jakarta')->isAfter($deadline) || $absensi->is_locked) {
    abort(403, 'Batas waktu pengajuan sudah lewat.');
}

// Guard 3: scope mahasiswa — hanya milik sendiri
if ($user->isMahasiswa()) {
    abort_if($absensi->mahasiswa_id !== $user->mahasiswa->id, 403);
}

// Simpan file bukti ke storage/app/private/keterangan/
$path = $request->file('file_bukti')->store('keterangan', 'local');

return Keterangan::create([...]);
```

**`KeteranganService::approve(Keterangan $ket)`:** Dalam `DB::transaction`: update `status_keterangan = approved`, update `absensi_mahasiswa.status` → `$ket->jenis`, isi `disetujui_oleh`, `approved_at`.

**`KeteranganService::reject(Keterangan $ket)`:** Update `status_keterangan = rejected`. Absensi tetap alpa.

**Endpoint serve file bukti** (tambah route): `GET /keterangan/{keterangan}/bukti` → cek auth → `Storage::disk('local')->download($keterangan->file_bukti)`.

**Audit:**
- [ ] Mahasiswa submit sebelum 21:00 → 201 created
- [ ] Mahasiswa submit setelah 21:00 → 403 pesan deadline
- [ ] Submit untuk absensi `is_locked = true` → 403
- [ ] Submit untuk absensi mahasiswa lain → 403
- [ ] Submit tanpa file → 422 validasi
- [ ] Admin approve → `absensi.status` berubah dari alpa ke sakit/izin

---

### TASK-802 — Keterangan frontend mahasiswa
**File:** `pages/keterangan/index.tsx`

**Data dari controller:** list absensi mahasiswa yang login dengan status alpa (include `keterangan` relasi jika ada), `is_locked`.

**Tampilan per baris alpa:**
- State tombol berdasarkan kondisi:
  - `!is_locked && !ada_keterangan` → tombol "Ajukan" aktif + countdown live
  - `!is_locked && keterangan.status === 'pending'` → disabled "Menunggu review"
  - `is_locked` → disabled merah "Tidak bisa diajukan" + banner "Alpa dikunci permanen"
  - `keterangan.status === 'approved'` → badge hijau "Disetujui"

**Countdown live** (update tiap menit via `setInterval`):
```tsx
const deadline = new Date(); deadline.setHours(21,0,0,0);
const diff = deadline.getTime() - Date.now();
const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000);
```

**Dialog form pengajuan** (shadcn Dialog):
- RadioGroup jenis (Sakit/Izin)
- Textarea keterangan
- Input file (JPG/PNG/PDF, max 5MB, required)
- Submit via `useForm` dari Inertia

**Sidebar:** tambah menu Keterangan (untuk mahasiswa — hanya muncul jika role mahasiswa).

**Audit:**
- [ ] Alpa hari ini menampilkan countdown
- [ ] Alpa yang sudah dikunci menampilkan banner merah
- [ ] Submit form berhasil → status berubah ke "Menunggu review" tanpa reload penuh

---

### TASK-803 — Keterangan frontend admin
**File:** `pages/keterangan/admin.tsx`, route `keterangan.admin` di `routes/web.php`

**Fitur:**
- Tabel keterangan masuk: nama mahasiswa, mata kuliah, tanggal, jenis, label sumber (badge abu "Diajukan mahasiswa" / badge biru "Diinput admin"), status, aksi
- Tombol "Lihat Bukti" → buka URL `/keterangan/{id}/bukti` di tab baru
- Tombol "Setujui" dan "Tolak" → Inertia form patch/delete, konfirmasi via shadcn AlertDialog
- Filter: semua / pending / approved / rejected (Inertia router.get)
- Sidebar: tambah menu Keterangan (untuk admin — muncul jika role admin_jurusan/super_admin)

**Audit:**
- [ ] Label sumber tampil benar (mahasiswa vs admin)
- [ ] Tombol Setujui → absensi berubah, keterangan hilang dari list pending
- [ ] Tombol lihat bukti membuka file (tidak 403)

---

## FASE 9 — Dashboard Data Nyata

### TASK-901 — Dashboard Admin Jurusan
**File:** `pages/dashboard/admin-jurusan.tsx`, update `DashboardService.php`

**Data yang disiapkan di `DashboardService::forAdminJurusan(User $user)`:**
```php
$jurusanId = $user->jurusan_id;
return [
    'stat_hadir_hari_ini' => AbsensiMahasiswa::whereHas('sesi', fn($q) => $q->whereDate('tanggal', today())->whereHas('jadwal', fn($q2) => $q2->whereHas('kelas.prodi', fn($q3) => $q3->where('jurusan_id',$jurusanId))))->where('status','hadir')->count(),
    'stat_alpa_hari_ini' => ..., // sama, ganti status
    'stat_keterangan_pending' => Keterangan::whereHas('mahasiswa.kelas.prodi', fn($q) => $q->where('jurusan_id',$jurusanId))->where('status_keterangan','pending')->count(),
    'stat_enrollment_aktif' => Mahasiswa::whereHas('kelas.prodi', fn($q) => $q->where('jurusan_id',$jurusanId))->where('status_akun','aktif')->count(),
    'sesi_aktif' => SesiAbsensi::where('status','berlangsung')->whereHas('jadwal', fn($q) => $q->whereHas('kelas.prodi', fn($q2) => $q2->where('jurusan_id',$jurusanId)))->with(['jadwal.kelas','jadwal.dosen','jadwal.ruangan'])->get()->map(fn($s) => [..., 'hadir' => $s->absensiMahasiswa()->where('status','hadir')->count(), 'total' => ...]),
    'keterangan_pending' => Keterangan::...->take(3)->get(),
    'absensi_hari_ini' => ...,
    'kehadiran_minggu_ini' => ..., // aggregate hadir/alpa/izin+sakit untuk chart
];
```

**React — komponen:**
- 4 shadcn Card stat
- Progress bar per sesi aktif (hadir/total)
- 3 keterangan pending dengan tombol approve/tolak (Inertia form)
- shadcn Table absensi hari ini
- Donut chart (shadcn chart) kehadiran minggu ini

**Audit:**
- [ ] Angka stat card akurat (verifikasi manual di DB)
- [ ] Approve keterangan dari dashboard berhasil
- [ ] Donut chart render tanpa error

---

### TASK-902 — Dashboard Super Admin
**File:** `pages/dashboard/super-admin.tsx`, tambah method di `DashboardService`

**Data `forSuperAdmin()`:**
- Total mahasiswa aktif (semua jurusan)
- Rata-rata kehadiran semester ini (all jurusan)
- Sesi hari ini: count + berapa berlangsung
- Enrollment selesai %: `aktif / total * 100`
- Kehadiran per jurusan: list `[{nama_jurusan, persen_hadir, total_alpa, total_izin_sakit}]`
- Enrollment per jurusan: list `[{nama_jurusan, persen_selesai}]`
- 10 aktivitas terbaru: gabung events dari batch alpa + lock alpa + enrollment baru (bisa pakai model `Activity` atau query langsung dari tabel masing-masing dengan `union`)

**React — komponen:**
- 4 stat card
- Bar chart horizontal per jurusan (shadcn chart) — warna encode kondisi: hijau ≥85%, kuning 75–84%, merah <75%
- Progress bar enrollment per jurusan
- Feed aktivitas (list sederhana dengan icon dan timestamp)
- Status Python: `GET /session/status` di Python via axios saat komponen mount (hanya untuk menampilkan ruangan mana yang aktif)

**Audit:**
- [ ] Data semua jurusan tampil
- [ ] Bar chart render dengan warna kondisi yang benar
- [ ] Feed aktivitas menampilkan event terbaru

---

### TASK-903 — Dashboard Mahasiswa
**File:** `pages/dashboard/mahasiswa.tsx`

**Data `forMahasiswa(User $user)`:**
- `mahasiswa` → `$user->mahasiswa` with kelas, prodi
- `stat` → hadir, alpa, izin, sakit, rata-rata %
- `kehadiran_per_matkul` → per jadwal: `[{mata_kuliah, hadir, total, persen}]`
- `warning_matkul` → list matkul dengan persen < 80%
- `jadwal_minggu_ini` → jadwal untuk kelas mahasiswa, hari senin-sabtu minggu ini
- `riwayat_terbaru` → 10 absensi terbaru
- `enrollment_status` → `status_akun`, list jarak yang sudah lulus

**React — komponen:**
- Banner warning (merah muda) jika `warning_matkul` tidak kosong — muncul di paling atas
- Banner enrollment (biru) jika `status_akun !== 'aktif'`
- 4 stat card
- Bar chart per matkul (shadcn chart), warna: ≥80% hijau, 75–79% kuning, <75% merah
- Tabel jadwal minggu ini — baris hari ini di-highlight
- Tabel riwayat 10 absensi
- Stepper enrollment (4 tahap: upload → encoding → verifikasi → approve)

**Audit:**
- [ ] Banner warning muncul jika ada matkul < 80%
- [ ] Data ter-scope ke mahasiswa yang login (tidak bisa lihat data mahasiswa lain)
- [ ] Stepper menunjukkan tahap yang benar sesuai status_akun

---

## FASE 10 — Laporan

### TASK-1001 — Rekap kehadiran
**Jalankan:** `php artisan make:feature Laporan` (hanya ambil controller + service, hapus migration)

**`LaporanService::rekapKelas(array $filters)`:**
- Filter: `jadwal_id`, `dari`, `sampai` (date range)
- Query: join mahasiswa + absensi_mahasiswa melalui sesi
- Return per mahasiswa: `hadir`, `alpa`, `izin`, `sakit`, `total_pertemuan`, `persen_hadir`
- Scope: admin_jurusan hanya jadwal jurusannya

**`LaporanService::rekapMahasiswa(Mahasiswa $mhs, array $filters)`:**
- Per mata kuliah: breakdown hadir/alpa/izin/sakit + persen

**Route:** `GET /laporan` dan `GET /laporan/mahasiswa/{mahasiswa}`

**Halaman:** `pages/laporan/index.tsx` — filter + tabel + tombol export

**Audit:**
- [ ] Rekap per kelas akurat (cross-check manual di DB)
- [ ] Persen hadir dihitung benar (hadir / total_pertemuan × 100)
- [ ] Admin jurusan tidak bisa akses laporan jurusan lain

---

### TASK-1002 — Export PDF & Excel
**Install:** `composer require barryvdh/laravel-dompdf maatwebsite/excel`

**`LaporanService::exportPdf(array $filters)`:**
- Siapkan data dari `rekapKelas()`
- Return `PDF::loadView('laporan.rekap-pdf', compact('data'))->download('rekap.pdf')`
- Buat view Blade: `resources/views/laporan/rekap-pdf.blade.php` — tabel sederhana

**`LaporanService::exportExcel(array $filters)`:**
- Buat class `RekapExport` yang implements `FromCollection`, `WithHeadings`
- Return `Excel::download(new RekapExport($data), 'rekap.xlsx')`

**Routes:** `GET /laporan/export/pdf` dan `GET /laporan/export/excel` (middleware `can:laporan export`)

**Audit:**
- [ ] Export PDF bisa dibuka, berisi data yang sesuai filter
- [ ] Export Excel bisa dibuka di spreadsheet
- [ ] User tanpa permission `laporan export` → 403

---

## Urutan Eksekusi

```
000 → 101 → 102 → 103 → 104
    → 201 → 202
    → 301 → 302 → 303 → 304
    → 401 → 402 → 403
    → 501 → 502
    → 601
    → 701 → 702
    → 801 → 802 → 803
    → 901 → 902 → 903
    → 1001 → 1002
```

**Total: 23 task.** Selesaikan dan audit satu task sebelum lanjut ke task berikutnya.

---

## Cara jalankan untuk demo (semua di satu laptop)

```bash
# Terminal 1
php artisan serve

# Terminal 2
cd python-service && uvicorn main:app --reload --port 8001

# Terminal 3 (scheduler — batch alpa, lock alpa)
php artisan schedule:work
```
