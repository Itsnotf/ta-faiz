# Checkpoint — Sistem Absensi Face Recognition
*Update otomatis setiap task selesai*

---

## Status Terakhir
**Task aktif:** — SEMUA TASK TASK_LIST_FINAL.md (BATCH 1 + BATCH 2) SELESAI —
**Terakhir diupdate:** 2026-06-02

---

## Progress Per Task

| Task | Nama | Status |
|------|------|--------|
| TASK-000 | Environment & Seeder | ✅ Selesai |
| TASK-101 | Migration hierarki institusi | ✅ Selesai |
| TASK-102 | Migration dosen & mahasiswa | ✅ Selesai |
| TASK-103 | Migration jadwal & sesi absensi | ✅ Selesai |
| TASK-104 | Migration absensi, keterangan, enrollment | ✅ Selesai |
| TASK-201 | Middleware X-Internal-Key | ✅ Selesai |
| TASK-202 | Dashboard routing per role | ✅ Selesai |
| TASK-301 | CRUD Institusi & Jurusan | ✅ Selesai |
| TASK-302 | CRUD Prodi, Ruangan, Kelas | ✅ Selesai |
| TASK-303 | CRUD Dosen & Mahasiswa | ✅ Selesai |
| TASK-304 | CRUD Jadwal | ✅ Selesai |
| TASK-401 | Setup project Python | ✅ Selesai |
| TASK-402 | Endpoint enrollment Python | ✅ Selesai |
| TASK-403 | Session runner & webcam | ✅ Selesai |
| TASK-501 | Enrollment backend (Laravel) | ✅ Selesai |
| TASK-502 | Enrollment frontend | ✅ Selesai |
| TASK-601 | Internal API endpoints | ✅ Selesai |
| TASK-701 | Scheduler jobs | ✅ Selesai |
| TASK-702 | Halaman rekap absensi (admin) | ✅ Selesai |
| TASK-801 | Keterangan backend | ✅ Selesai |
| TASK-802 | Keterangan frontend mahasiswa | ✅ Selesai |
| TASK-803 | Keterangan frontend admin | ✅ Selesai |
| TASK-901 | Dashboard Admin Jurusan | ✅ Selesai |
| TASK-902 | Dashboard Super Admin | ✅ Selesai |
| TASK-903 | Dashboard Mahasiswa | ✅ Selesai |
| TASK-1001 | Rekap kehadiran | ✅ Selesai |
| TASK-1002 | Export PDF & Excel | ✅ Selesai |

---

## Fitur Dosen (TASK_LIST_Dosen_Feature.md)

| Task | Nama | Status |
|------|------|--------|
| DOSEN-001 | Database migrations dosen | ✅ Selesai |
| DOSEN-002 | Role, permissions, User & Dosen model update | ✅ Selesai |
| DOSEN-003 | Seeder & DashboardController update | ✅ Selesai |
| DOSEN-004 | EnrollmentDosenService | ✅ Selesai |
| DOSEN-005 | EnrollmentDosenController + routes | ✅ Selesai |
| DOSEN-006 | Enrollment dosen UI | ✅ Selesai |
| DOSEN-007 | BatchAlpaJob + LockAlpaJob update | ✅ Selesai |
| DOSEN-008 | KoreksiAbsensiDosen backend | ✅ Selesai |
| DOSEN-009 | Koreksi absensi UI | ✅ Selesai |
| DOSEN-010 | Dashboard dosen + update dashboard mahasiswa | ✅ Selesai |
| DOSEN-011 | npm run build — verifikasi build | ✅ Selesai |

---

## Bugfix (TASK_LIST_BUGFIX.md)

| Task | Nama | Status |
|------|------|--------|
| FIX-001 | camera.py — backend DirectShow + verifikasi frame pertama | ✅ Selesai |
| FIX-002 | recognizer.py — numpy conversion + FRAME_SCALE default 0.5 | ✅ Selesai |
| FIX-003 | python-service/.env — tambah FRAME_SCALE=0.5 | ✅ Selesai |
| FIX-004 | InternalController encodings() — filter status_akun='aktif' | ✅ Selesai |
| FIX-005 | InternalController recordAbsensi() — verifikasi mahasiswa ∈ kelas | ✅ Selesai |
| FIX-006 | Hapus migration duplikat 2026_05_31_070031_create_institusis_table.php | ✅ Selesai |
| FIX-007 | Buat komponen ConfirmDialog shadcn | ✅ Selesai |
| FIX-008 | institusi/index.tsx — ganti confirm() | ✅ Selesai |
| FIX-009 | jurusan/index.tsx — ganti confirm() | ✅ Selesai |
| FIX-010 | prodi/index.tsx — ganti confirm() | ✅ Selesai |
| FIX-011 | ruangan/index.tsx — ganti confirm() | ✅ Selesai |
| FIX-012 | kelas/index.tsx — ganti confirm() | ✅ Selesai |
| FIX-013 | dosen/index.tsx — ganti confirm() | ✅ Selesai |
| FIX-014 | mahasiswa/index.tsx — ganti confirm() | ✅ Selesai |
| FIX-015 | jadwal/index.tsx — ganti confirm() | ✅ Selesai |
| FIX-016 | enrollment/index.tsx — ConfirmDialog + flash prop + useEffect | ✅ Selesai |
| FIX-017 | enrollment/verifikasi.tsx — ganti alert() dengan toast.error() | ✅ Selesai |
| FIX-018 | npm run build — build sukses tanpa error TypeScript | ✅ Selesai |

---

## Catatan Per Task

### TASK-000 ✅ (2026-05-31)
- `.env` ditambah `INTERNAL_API_KEY=sk-internal-absensi-dev-2026` dan `PYTHON_SERVICE_URL=http://localhost:8001`
- `config/app.php` ditambah `'internal_api_key' => env('INTERNAL_API_KEY')`
- `config/starterkit.php` diganti total: 3 roles (`super_admin`, `admin_jurusan`, `mahasiswa`), 46 permissions
- `UserSeeder.php` diubah: 3 user demo (`superadmin@demo.id`, `admin@demo.id`, `mahasiswa@demo.id`) password `Password@123`
- `RoleSeeder.php` tidak perlu diubah (sudah dinamis baca dari config)
- `migrate:fresh --seed` sukses: 3 roles, 46 permissions, 3 users terbuat

### TASK-101 ✅ (2026-05-31)
- 5 migration: `institusi`, `jurusan`, `prodi`, `ruangan`, `kelas`
- FK cascade: jurusan→institusi, prodi→jurusan, ruangan→jurusan, kelas→prodi
- 5 Model dengan relasi lengkap + `$table` eksplisit + `$fillable`
- FK constraint aktif — rollback bersih, cascade delete bekerja

### TASK-102 ✅ (2026-05-31)
- 3 migration: `dosen`, `mahasiswa`, `add_jurusan_id_to_users`
- `dosen`: jurusan_id FK, nip/email unique, face_encodings JSON nullable
- `mahasiswa`: user_id FK nullable, kelas_id FK, nim unique, JSON casts (face_encodings, foto_paths), status_akun enum default `pending_upload`
- `users`: tambah jurusan_id FK nullable (nullOnDelete)
- `User` model: tambah relasi `jurusan()`, `mahasiswa()` + helper `isSuperAdmin()`, `isAdminJurusan()`, `isMahasiswa()`
- `Mahasiswa` model: JSON cast bekerja — assign array → simpan → baca kembali sebagai array ✅

### TASK-103 ✅ (2026-05-31)
- 2 migration: `jadwal`, `sesi_absensi`
- `jadwal`: 3 FK (kelas, dosen, ruangan), hari enum, jam_mulai/selesai time, window_menit default 15, is_active default true
- `sesi_absensi`: jadwal_id FK, tanggal date, mulai_at/selesai_at timestamp, status enum (berlangsung/selesai)
- `Jadwal` model: relasi kelas, dosen, ruangan, sesiAbsensi + cast is_active boolean
- `SesiAbsensi` model: relasi jadwal, absensiMahasiswa, absensiDosen (referensi ke TASK-104)
- `Jadwal::with(['kelas','dosen','ruangan'])` bekerja ✅

### TASK-104 ✅ (2026-05-31)
- 4 migration: `absensi_mahasiswa`, `absensi_dosen`, `keterangan`, `enrollment_verifikasi`
- `absensi_mahasiswa`: sesi_id/mahasiswa_id FK, status enum (hadir/alpa/izin/sakit), is_locked default false
- `absensi_dosen`: sesi_id/dosen_id FK, status enum (hadir/alpa)
- `keterangan`: 2 FK (absensi_mahasiswa_id, mahasiswa_id), disetujui_oleh FK nullable ke users, status_keterangan enum default pending
- `enrollment_verifikasi`: unique(['mahasiswa_id','jarak']) — terbukti UniqueConstraintViolationException saat duplikat
- `SesiAbsensi` diupdate: relasi `absensiMahasiswa()` dan `absensiDosen()` ditambahkan kembali
- `migrate:rollback --step=4` bersih ✅

### TASK-201 ✅ (2026-05-31)
- Buat `app/Http/Middleware/InternalApiKey.php` — cek header `X-Internal-Key` vs `config('app.internal_api_key')`
- Daftarkan alias `internal.key` di `bootstrap/app.php`
- Buat `routes/api.php` + daftarkan via `api:` di `withRouting`
- Tambah `GET /api/internal/health` sebagai placeholder (dipakai Python service untuk health check)
- Tanpa key → 401 ✅ | Key salah → 401 ✅ | Key benar → 200 ✅

### TASK-202 ✅ (2026-05-31)
- `DashboardController::index()` diupdate: routing via `isSuperAdmin()`, `isAdminJurusan()`, `isMahasiswa()`
- Fallback ke `dashboard/admin` (starterkit) tetap ada untuk user tanpa role baru
- 3 halaman placeholder dibuat: `super-admin.tsx`, `admin-jurusan.tsx`, `mahasiswa.tsx`
- Routing logic terverifikasi via tinker: tiap email → halaman yang benar ✅
- Build frontend sukses (43s)

### TASK-301 ✅ (2026-05-31)
- `make:feature Institusi` & `make:feature Jurusan` (model sudah ada → jawab yes → generate controller+request+service)
- Migration dummy dari make:feature dihapus (tabel sudah ada dari TASK-101)
- `InstitusiService`: index (search+paginate), store, update, destroy — super admin only, no scope
- `JurusanService`: index dengan scope by jurusan_id jika admin_jurusan, getAllInstitusi untuk dropdown
- Request validation: nama required (institusi); institusi_id+kode unique (jurusan, ignore self saat update)
- Routes: 4 routes masing-masing (index/store/update/destroy), hanya yang dibutuhkan
- Halaman React: tabel + inline dialog create/edit menggunakan `useForm` Inertia
- TypeScript interfaces `Institusi` dan `Jurusan` ditambah ke `types/index.d.ts`
- Sidebar: section "Master Data" dengan menu Institusi + Jurusan (permission-gated)
- Build frontend sukses ✅ | 8 routes terdaftar ✅
- **Audit**: login admin_jurusan → menu institusi tidak muncul (permission `institusi index` tidak diberikan ke admin_jurusan secara default — perlu konfirmasi manual)

### TASK-302 ✅ (2026-05-31)
- make:feature Prodi, Ruangan, Kelas (model sudah ada → yes → generate controller+request+service)
- Dummy migrations dihapus (tabel sudah ada dari TASK-101)
- Service scope: Prodi/Ruangan scope by jurusan_id; Kelas scope via whereHas prodi
- Dropdown Kelas hanya tampil prodi dari jurusan user yang login (admin_jurusan)
- Kelas route: fix `{kela}` → `{kelas}` dengan `.parameters(['kelas' => 'kelas'])`
- TypeScript: tambah interface Prodi, Ruangan, Kelas
- Sidebar: tambah Prodi (GraduationCap), Ruangan (DoorOpen), Kelas (Users) di section Master Data
- Ruangan: field cctv_url ada di form tapi opsional (placeholder "rtsp://...")
- Build sukses ✅ | 12 routes baru terdaftar ✅

### TASK-303 ✅ (2026-05-31)
- Dosen: CRUD biasa, scope by jurusan_id. face_encodings/foto_path tidak di form (dihandle enrollment)
- Mahasiswa store: DB::transaction → buat User (email={nim}@mhs.demo.id, pass=Password@123) → assign role mahasiswa → buat Mahasiswa
- Mahasiswa destroy: DB::transaction → hapus Mahasiswa + hapus User terkait sekaligus
- Fix: status_akun harus diset eksplisit ke 'pending_upload' saat create (DB default tidak di-apply di PHP object)
- Badge status_akun: pending_upload=kuning, pending_verifikasi=oranye, aktif=hijau
- Tabel Mahasiswa: search by nama OR nim
- TypeScript: tambah interface Dosen, Mahasiswa
- Sidebar: Dosen (UserCog), Mahasiswa (GraduationCap) di section Master Data
- Build sukses ✅ | Audit tinker: store/destroy mahasiswa + user cascading ✅

### TASK-304 ✅ (2026-05-31)
- JadwalService: validasi bentrok via `where NOT (jam_selesai <= ? OR jam_mulai >= ?)` — terdeteksi overlap jam
- Update jadwal: bentrok check exclude diri sendiri (`where id != $excludeId`)
- Dropdown kelas/dosen/ruangan semua scope by jurusan user
- UI: timepicker HTML native (`type="time"`), badge hari per warna, jam ditampilkan `HH:MM – HH:MM`
- TypeScript: interface Jadwal dengan union type hari
- Sidebar: Jadwal (CalendarDays) di section Master Data
- Build sukses ✅ | Bentrok terdeteksi, jadwal hari lain tidak bentrok ✅

### TASK-401 ✅ (2026-05-31)
- Struktur: `python-service/main.py`, `.env`, `requirements.txt`, `api/`, `client/`, `core/`, `session_runner.py`
- `GET /` → `{"status":"ok"}` ✅ | `GET /session/status` → `{"active_ruangan":[]}` ✅
- `face_recognition` belum terinstall — dlib butuh Visual C++ Build Tools
- `dlib 20.0.1` + `face_recognition` terinstall via terminal Windows langsung (bukan lewat Claude Code — ada issue MSBuild di temp dir)
- Semua file lain (camera.py, recognizer.py, session_runner.py, laravel_client.py) sudah dibuat lengkap
- FastAPI + uvicorn berjalan normal, config `.env` terbaca benar

### TASK-402 ✅ (2026-05-31)
- `POST /enroll/generate-encoding`: decode base64 → PIL → numpy → face_encodings; return `{encodings, count}` atau `{error: no_face, foto_index}`
- `POST /enroll/verify-frame`: decode frame → face_encodings → face_distance → confidence = 1 - min(distances); return `{confidence, lulus, threshold, jarak}`
- Helper `base64_to_numpy`: strip data URI prefix, decode → PIL.Image → RGB → numpy
- Foto tanpa wajah → `{error: no_face, foto_index: N}` ✅
- verify-frame tanpa wajah → `{confidence: 0.0, lulus: false, error: no_face}` ✅
- Audit wajah nyata (confidence ≥ 0.90 dengan foto sendiri) dilakukan saat TASK-502 (enrollment frontend)

### TASK-502 ✅ (2026-05-31)
- `pages/enrollment/index.tsx`: tabel mahasiswa + badge status (Belum Upload/Siap Verifikasi/Aktif), filter by kelas, tombol Verifikasi (jika pending_verifikasi) dan Reset
- `pages/enrollment/verifikasi.tsx`: webcam via `getUserMedia`, capture JPEG frame, POST `axios` ke `/enrollment/{id}/verify-frame`, tampilkan confidence + lulus/tidak per jarak, tombol Approve muncul jika semua lulus
- Tambah route `GET /enrollment/{mahasiswa}/verifikasi` + method `verifikasi()` di controller
- Sidebar: Enrollment (ScanFace icon) dengan permission `enrollment index`
- Build sukses ✅ | verifyFrame return `response()->json()` (bukan Inertia) ✅

### TASK-601 ✅ (2026-05-31)
- `InternalController` dengan 3 method:
  - `sesiAktif()`: query SesiAbsensi status=berlangsung, return sesi_id/ruangan_id/cctv_url/mulai_at/selesai_at/window_menit
  - `encodings(Ruangan)`: lookup via sesi berlangsung hari ini (bukan filter hari-in-week), return mahasiswa+dosen dengan face_encodings
  - `recordAbsensi()`: cek window → cek duplikat → simpan AbsensiMahasiswa/Dosen
- Fix `Kelas` model: tambah relasi `hasMany Mahasiswa` (diperlukan oleh encodings)
- Fix `encodings`: filter via sesi berlangsung aktif (bukan hari enum) agar bekerja di semua hari
- Audit: tanpa key→401 ✅ | sesi-aktif ✅ | encodings struktur benar ✅ | record→200 ✅ | duplikat→409 ✅ | out_of_window ✅

### TASK-1002 ✅ (2026-05-31)
- `composer require barryvdh/laravel-dompdf maatwebsite/excel:^3.1` — perlu aktifkan `extension=zip` di php.ini Laragon (DLL sudah ada di `ext/php_zip.dll`)
- `app/Exports/RekapExport.php`: implements `FromCollection`, `WithHeadings`, `WithTitle` — map rekap array ke rows Excel
- `LaporanService::exportPdf()`: `Pdf::loadView('laporan.rekap-pdf', compact('rekap','info'))->download('rekap-kehadiran.pdf')`
- `LaporanService::exportExcel()`: `Excel::download(new RekapExport($rekap), 'rekap-kehadiran.xlsx')`
- `resources/views/laporan/rekap-pdf.blade.php`: HTML/CSS table sederhana, warna % hadir (hijau/kuning/merah), footer timestamp
- 2 routes export: GET /laporan/export/pdf, GET /laporan/export/excel (middleware `can:laporan export`)
- Tombol Export PDF/Excel di `pages/laporan/index.tsx` sudah link ke routes ini sejak TASK-1001
- Build sukses ✅

### TASK-1001 ✅ (2026-05-31)
- `make:feature Laporan` → hapus model, migration, requests (tidak butuh tabel)
- `LaporanService`: `getKelasList()` (scope jurusan), `getJadwalByKelas()`, `rekapKelas()` (filter jadwal_id+dari+sampai, count hadir/alpa/izin/sakit per mahasiswa, persen_hadir = hadir/total_pertemuan), `rekapMahasiswa()` (per matkul breakdown)
- `LaporanController`: `index()` cascade kelas→jadwal, `mahasiswa()` detail per matkul. Middleware: `laporan index` + `laporan export`
- 2 routes: GET /laporan, GET /laporan/mahasiswa/{mahasiswa}
- `pages/laporan/index.tsx`: filter bar (kelas→jadwal cascade + date range), summary cards 4 status, tabel rekap per mahasiswa (% berwarna), tombol Export PDF/Excel (link ke routes yang akan dibuat TASK-1002), tombol Detail per baris
- `pages/laporan/mahasiswa.tsx`: detail per matkul satu mahasiswa, filter date range, tombol kembali
- Sidebar: section "Laporan" → "Laporan Kehadiran" (BookOpen, permission `laporan index`)
- Build sukses ✅

### TASK-903 ✅ (2026-05-31)
- `DashboardService::forMahasiswa()`: stat 4 status + rata-rata, kehadiran per matkul (count sesi + hadir per jadwal), warning matkul (<80%), jadwal minggu ini (semua hari kelas + flag hari_ini), riwayat 10 absensi terbaru, enrollment status (status_akun + jarak_lulus)
- `DashboardController`: pass data via `forMahasiswa($user)` ke mahasiswa page
- `pages/dashboard/mahasiswa.tsx`: banner enrollment (biru, jika status_akun != aktif), banner warning matkul (merah, jika ada matkul <80%), 4 stat card, BarChart horizontal per matkul (warna per kondisi), stepper 4 tahap enrollment dengan badge jarak, tabel jadwal minggu ini (highlight hari ini), tabel riwayat 10 absensi
- Data ter-scope ke mahasiswa yang login (via `$user->mahasiswa`) ✅
- Build sukses ✅

### TASK-902 ✅ (2026-05-31)
- `DashboardService::forSuperAdmin()`: 8 data points — 4 stat (mahasiswa aktif, rata kehadiran, sesi hari ini, berlangsung), kehadiran per jurusan (persen+alpa+izin_sakit), enrollment per jurusan (persen+aktif+total), 10 aktivitas terbaru (merge alpa events + enrollment events, sort by timestamp), enrollmentPct global
- `DashboardController`: pass data via `forSuperAdmin()` ke super-admin page
- `pages/dashboard/super-admin.tsx`: 4 stat card, BarChart horizontal per jurusan (warna: ≥85% hijau, 75-84% kuning, <75% merah via cell fill), progress bar enrollment per jurusan, feed aktivitas 10 item, card status Python (axios.get ke :8001/session/status saat mount)
- Build sukses — chunk super-admin 55KB + chart 312KB ✅

### TASK-901 ✅ (2026-05-31)
- `DashboardService::forAdminJurusan()`: 8 data points — 4 stat (hadir/alpa/ket-pending/enrollment), sesi aktif (progress hadir/total), keterangan pending (3 teratas), absensi hari ini (10 terakhir), kehadiran minggu ini (aggregate per status untuk donut chart)
- `DashboardController`: pass data via `forAdminJurusan($user)` ke admin-jurusan page
- `shadcn chart` diinstall via `npx shadcn@latest add chart` ✅
- `pages/dashboard/admin-jurusan.tsx`: 4 stat card, progress bar per sesi aktif, 3 keterangan pending + tombol approve/reject (router.post method spoofing), tabel absensi hari ini, PieChart donut (recharts via shadcn chart)
- Build sukses — chunk admin-jurusan 332KB ✅

### TASK-803 ✅ (2026-05-31)
- `pages/keterangan/admin.tsx`: tabel keterangan masuk, filter status (semua/pending/approved/rejected), badge sumber (Diajukan mahasiswa=abu / Diinput admin=biru), badge status, tombol "Bukti" buka tab baru, tombol Setujui/Tolak dengan AlertDialog konfirmasi
- Approve/Reject via Inertia `useForm.post()` (method spoofing PATCH)
- Sidebar: tambah "Keterangan Masuk" di section Keterangan (ClipboardList icon, permission `keterangan approve` — hanya admin)
- Build sukses ✅

### TASK-802 ✅ (2026-05-31)
- `pages/keterangan/index.tsx`: tabel alpas mahasiswa, countdown live ke 21:00 (setInterval per menit), badge status per kondisi (belum/pending/approved/rejected/locked), tombol Ajukan aktif/disabled sesuai kondisi, banner "Alpa dikunci permanen" jika is_locked
- Dialog form: Select jenis (izin/sakit), textarea keterangan, file input (jpg/png/pdf max 5MB), submit via `useForm` dengan `forceFormData: true`
- KeteranganController::index() ditambah guard: jika bukan mahasiswa → redirect ke `/keterangan/admin`
- Sidebar: section "Keterangan" → "Keterangan Saya" (FileText icon, permission `keterangan create` — hanya mahasiswa)
- RoleSeeder diupdate: `firstOrCreate` + permission assignment per role (super_admin=all, admin_jurusan=35 perms, mahasiswa=keterangan index+create)
- `db:seed --class=RoleSeeder` dijalankan untuk apply ke DB existing ✅
- Build sukses ✅

### TASK-801 ✅ (2026-05-31)
- `KeteranganService`: `store()` (3 guard: non-alpa 422, deadline+is_locked 403, scope mahasiswa 403), `approve()` (DB::transaction update absensi status ke jenis), `reject()`, `getForMahasiswa()` (alpas mahasiswa + keterangan relasi), `getForAdmin()` (scope jurusan + filter status)
- `KeteranganController`: index (mahasiswa view), admin (admin view), store, approve, reject, bukti (Storage download)
- `StoreKeteranganRequest`: validasi absensi_id exists, jenis enum, keterangan text max 1000, file_bukti file mimes jpg/png/pdf max 5MB
- 6 routes: GET /keterangan, POST /keterangan, GET /keterangan/admin, GET+PATCH /keterangan/{id}/bukti+approve+reject
- `Mahasiswa` model: tambah `keterangan()` hasMany
- File bukti disimpan ke `storage/app/private/keterangan/` (disk local)

### TASK-702 ✅ (2026-05-31)
- `AbsensiService`: `getKelasList`, `getJadwalByKelas`, `getSesiByJadwal`, `getRekapSesi` (scope by jurusan)
- `AbsensiController::index()`: cascade filter kelas→jadwal→sesi, kirim rekap via Inertia props
- `pages/absensi/index.tsx`: filter bar cascade (Select shadcn), summary cards (hadir/alpa/izin/sakit), tabel dengan Badge warna per status, indikator 🔒 untuk alpa terkunci
- Route `GET /absensi` → `absensi.index` sudah terdaftar di `routes/web.php`
- Sidebar: tambah section "Absensi" dengan menu "Rekap Absensi" (ClipboardList icon, permission `absensi index`)
- Build sukses ✅

### TASK-701 ✅ (2026-05-31)
- `BuatSesiHariIni`: mapping dayOfWeek → hari Indonesia, firstOrCreate sesi per jadwal, skip Minggu
- `BatchAlpaJob`: filter sesi berlangsung yang jam_selesai sudah lewat → insert alpa untuk yang belum hadir → update sesi jadi selesai
- `LockAlpaJob`: update is_locked=true untuk alpa hari ini tanpa keterangan pending/approved
- Schedule: `06:00 sesi:buat-hari-ini` | `*/5 BatchAlpaJob` | `21:00 LockAlpaJob (Asia/Jakarta)`
- `php artisan schedule:list` → 3 job terdaftar ✅
- Catatan: `BuatSesiHariIni` dikerjakan Senin-Sabtu saja (Minggu tidak ada kuliah) — ditest pada hari Minggu menunjukkan output "Hari Minggu"

### TASK-403 ✅ (2026-05-31)
- `main.py` diupdate: session_runner distart sebagai daemon thread via FastAPI `lifespan` event
- `session_runner.active_sessions` shared satu proses dengan FastAPI → `GET /session/status` baca dict yang sama
- Unit test dengan mock: sesi masuk → spawn thread kamera → `[Camera] Started` muncul di log ✅
- Polling log `[SessionRunner] Polling dimulai...` muncul saat server start ✅
- `GET /session/status` return `{active_ruangan: []}` saat tidak ada sesi ✅
- End-to-end dengan DB nyata: menunggu TASK-601 (internal API sesi-aktif)

### TASK-501 ✅ (2026-05-31)
- `config/services.php`: tambah `python.url` dari env `PYTHON_SERVICE_URL`
- `EnrollmentService` 5 method:
  - `uploadFoto`: validasi 5 file, simpan ke `storage/local/enrollment/{id}/`, POST ke Python `/enroll/generate-encoding`, simpan face_encodings + set status pending_verifikasi
  - `verifyFrame`: POST ke Python `/enroll/verify-frame`, jika lulus → upsert EnrollmentVerifikasi, return + semua_jarak_lulus bool
  - `approve`: cek 3 jarak lulus → update status aktif + foto_verified_at
  - `reset`: hapus file storage, hapus EnrollmentVerifikasi records, reset semua field ke null + status pending_upload
  - `status`: return status_akun + jarak_lulus + semua_jarak_lulus
- Routes: 6 routes di prefix `/enrollment` dengan middleware `can:enrollment index`
- `verifyFrame` controller return `response()->json()` bukan Inertia ✅
- Audit: upload 0 foto → 422 ✅ | approve sebelum verifikasi → 422 ✅ | Python mati → 503 ✅

---

## Catatan Bugfix (2026-06-01)

### FIX-001 — FIX-003 ✅ Python camera + recognizer
- `camera.py`: ganti `cv2.VideoCapture(0)` ke `cv2.VideoCapture(0, cv2.CAP_DSHOW)` di Windows (DirectShow lebih reliable daripada MSMF)
- Tambah verifikasi hardware dengan membaca 1 frame sebelum cetak "Started"
- `recognizer.py`: tambah `numpy` conversion untuk encodings dari JSON Laravel (`[np.array(e) for e in mhs["encodings"]]`)
- FRAME_SCALE default naik dari `0.25` → `0.5` agar deteksi wajah lebih reliable di jarak normal
- `.env`: tambah `FRAME_SCALE=0.5` eksplisit

### FIX-004 — FIX-005 ✅ InternalController
- `encodings()`: tambah `$mhs->status_akun === 'aktif'` agar mahasiswa pending tidak masuk recognition pool
- `recordAbsensi()`: tambah cek `$mhs->kelas_id !== $sesi->jadwal->kelas_id` → return `not_in_class` 403

### FIX-006 ✅ Migration duplikat
- Hapus `2026_05_31_070031_create_institusis_table.php` (stub kosong, tabel `institusis` tidak dipakai)

### FIX-007 — FIX-018 ✅ Frontend ConfirmDialog
- Buat `resources/js/components/confirm-dialog.tsx` sebagai shared component berbasis shadcn AlertDialog
- Ganti semua `window.confirm()` di 8 halaman CRUD (institusi, jurusan, prodi, ruangan, kelas, dosen, mahasiswa, jadwal)
- enrollment/index.tsx: tambah `flash` prop + `useEffect` toast, ganti `handleReset` dengan ConfirmDialog
- enrollment/verifikasi.tsx: ganti `alert()` dengan `toast.error()` dari sonner
- Build sukses: `npm run build` selesai dalam 49s tanpa error TypeScript

---

## Sesi Debugging & Perbaikan (Post-Task)

### DEBUG-001 — Kamera buka tapi tidak ada log `[Recognizer]` (2026-05-31)

**Gejala:**
- Python service berjalan, sesi terdeteksi, kamera terbuka (`[Camera] Started` muncul)
- Tidak ada satu pun log `[Recognizer]` muncul di terminal

**Analisis kemungkinan penyebab (3 kandidat):**
1. `cap.read()` selalu `ret=False` sehingga `recognize_and_report` tidak pernah dipanggil (silent fail < 10x consecutive — belum sampai threshold log)
2. `recognize_and_report` dipanggil tapi ada exception sebelum baris `print` pertama
3. `known_encodings` kosong (encodings tidak berhasil diambil dari Laravel API) + tidak ada wajah terdeteksi — kombinasi dua kondisi sekaligus

**Solusi — tambah log debug sementara di dua file:**

`python-service/core/camera.py` — log di dalam loop `cap.read()`:
- Jika `ret=True`: cetak `[Camera-DEBUG] Frame OK, memanggil recognize_and_report`
- Jika `ret=False`: cetak `[Camera-DEBUG] cap.read() ret=False (consecutive_fail=N)`

`python-service/core/recognizer.py` — log di baris pertama fungsi `recognize_and_report`:
- Cetak jumlah mahasiswa dan dosen di `known_encodings`
- Cetak `frame.shape` untuk konfirmasi frame valid
- Setelah `face_locations()` selesai: cetak berapa wajah ditemukan

**Cara baca hasil debug:**
| Log yang muncul | Diagnosis |
|---|---|
| Tidak ada `[Camera-DEBUG]` sama sekali | `run_camera` thread tidak berjalan |
| `cap.read() ret=False` terus | Kamera buka tapi tidak bisa stream frame |
| `Frame OK` tapi tidak ada `[Recognizer-DEBUG]` | Exception di `recognize_and_report`, lihat traceback |
| `Fungsi dipanggil. known_encodings: 0 mahasiswa` | `get_encodings` dari Laravel API gagal/kosong |
| `face_locations selesai: 0 wajah` terus | dlib tidak mendeteksi wajah (pencahayaan/angle/model) |

**Hasil debug (konfirmasi dari user):**
```
[Camera-DEBUG] Frame OK, memanggil recognize_and_report (ruangan=12)
[Recognizer-DEBUG] Fungsi dipanggil. known_encodings: 1 mahasiswa, 0 dosen. frame shape=(720, 1280, 3)
(log berhenti di sini — face_locations tidak pernah selesai)
```

**Root cause:** `face_recognition.face_locations()` berjalan pada frame resolusi penuh **1280×720** → dlib HOG di CPU tanpa GPU memakan **10–30 detik per frame**. Fungsi tidak crash, hanya sangat lambat sehingga log berikutnya belum muncul saat user mengambil screenshot.

**Perbaikan yang diterapkan — `python-service/core/recognizer.py`:**
- Tambah `import cv2` dan env var `FRAME_SCALE` (default `0.25`)
- Frame di-resize ke 25% sebelum `face_locations()` → resolusi efektif ~320×180, **4–16x lebih cepat**
- Koordinat wajah di-scale balik ke resolusi asli (`inv = 1/SCALE`) sebelum `face_encodings()` agar akurasi encoding tetap terjaga
- Hapus semua log DEBUG SEMENTARA dari `camera.py` dan `recognizer.py`

**Untuk tuning:** Atur `FRAME_SCALE` di `.env` python-service:
- `0.25` (default) → tercepat, cocok untuk kamera tunggal di laptop
- `0.5` → lebih akurat untuk wajah jauh/kecil, lebih lambat ~4x

**Pertanyaan sesi + kamera masih terbuka jam 23:10:**
Ini perilaku yang benar. Kamera hanya ditutup ketika:
1. `BatchAlpaJob` mengubah status sesi ke `selesai` di DB → sesi hilang dari `sesi_aktif`
2. Atau session runner mendeteksi `now_utc >= selesai_at` di interval polling berikutnya (~5 detik)
Selama belum jam 23:10, kamera memang harus tetap terbuka.

---

## Catatan Fitur Dosen (2026-06-02)

### DOSEN-001 ✅ (2026-06-02)
- 5 migration baru: `add_auth_enrollment_to_dosen`, `create_enrollment_verifikasi_dosen`, `add_window_dosen_menit_to_jadwal`, `add_lock_to_absensi_dosen`, `create_koreksi_absensi_dosen`
- Kolom baru di `dosen`: user_id FK (nullOnDelete), status_enrollment default pending_upload, foto_paths JSON, foto_verified_at
- Tabel baru `enrollment_verifikasi_dosen`: unique (dosen_id, jarak)
- Kolom baru di `jadwal`: window_dosen_menit default 30
- Kolom baru di `absensi_dosen`: is_locked default false, locked_at nullable
- Tabel baru `koreksi_absensi_dosen`: bukti_path, catatan, status enum, catatan_admin, disetujui_oleh FK
- `php artisan migrate` — semua 5 migration DONE ✅

### DOSEN-002 ✅ (2026-06-02)
- `config/starterkit.php`: tambah role `dosen`, tambah 4 permissions (enrollment_dosen index, absensi_dosen index, koreksi_dosen create, koreksi_dosen approve)
- `User` model: tambah `dosen()` hasOne + `isDosen()` helper
- `Dosen` model: update fillable (tambah user_id, foto_paths, status_enrollment, foto_verified_at), casts (foto_paths array, foto_verified_at datetime), relasi baru (user, enrollmentVerifikasi, absensi)
- Buat `EnrollmentVerifikasiDosen` model: table enrollment_verifikasi_dosen, fillable, cast verified_at datetime, relasi dosen
- Buat `KoreksiAbsensiDosen` model: table koreksi_absensi_dosen, fillable, relasi absensiDosen/dosen/disetujuiOleh
- Update `AbsensiDosen` model: tambah is_locked/locked_at ke fillable+casts, tambah relasi `koreksi()` hasMany
- Update `RoleSeeder`: tambah permission dosen (enrollment_dosen index, absensi_dosen index, koreksi_dosen create), exclude enrollment_dosen index + koreksi_dosen create dari admin_jurusan
- `php artisan db:seed --class=RoleSeeder` — 4 roles sync ✅

### DOSEN-003 ✅ (2026-06-02)
- `UserSeeder`: tambah user demo `dosen@demo.id` / Password@123, role dosen, record Dosen dengan NIP 198001012010011001 terhubung ke Jurusan pertama
- `DashboardController`: tambah routing `isDosen()` → inertia('dashboard/dosen')
- `DashboardService::forDosen()`: jadwal hari ini (filter dosen_id + hari enum + sesi hari ini), status_hadir per jadwal dari AbsensiDosen, statistik kehadiran bulan ini per status
- Import `AbsensiDosen` ditambahkan ke DashboardService

---

### DOSEN-004 ✅ (2026-06-02)
- Buat `app/Services/EnrollmentDosenService.php` — mirip EnrollmentService tapi untuk model Dosen
- 5 method: uploadFoto (validasi 5 file → POST Python → update face_encodings + status pending_verifikasi), verifyFrame (POST Python → upsert EnrollmentVerifikasiDosen), approve (cek 3 jarak lulus → set aktif), reset (hapus file + EnrollmentVerifikasiDosen → reset ke pending_upload), status (return jarak_lulus + semua_jarak_lulus)

### DOSEN-005 ✅ (2026-06-02)
- Buat `app/Http/Controllers/EnrollmentDosenController.php` — 6 method (index, uploadFoto, verifikasi, verifyFrame + auto-approve, reset, status)
- 6 routes dengan prefix `enrollment-dosen` + middleware `can:enrollment_dosen index`
- `php artisan route:list --path=enrollment-dosen` — 6 routes terdaftar ✅

### DOSEN-006 ✅ (2026-06-02)
- `resources/js/pages/enrollment-dosen/index.tsx`: tampilkan status enrollment, form upload 5 foto (jika pending_upload), tombol ke halaman verifikasi (jika pending_verifikasi), banner sukses (jika aktif), ConfirmDialog reset
- `resources/js/pages/enrollment-dosen/verifikasi.tsx`: webcam + verifikasi 3 jarak, auto-approved banner saat semua lulus, endpoint POST /enrollment-dosen/verify-frame

### DOSEN-007 ✅ (2026-06-02)
- `BatchAlpaJob`: tambah import AbsensiDosen, tambah loop alpa dosen per sesi (cek window_dosen_menit dari mulai_at, `firstOrCreate` alpa dosen)
- `LockAlpaJob`: tambah lock alpa dosen > 3 hari tanpa koreksi pending/approved (`update is_locked=true, locked_at=now()`)

### DOSEN-008 ✅ (2026-06-02)
- Buat `app/Http/Controllers/KoreksiAbsensiDosenController.php` — 5 method (index dosen, store dosen, adminIndex, approve, reject, bukti)
- Guard: cek kepemilikan dosen, cek is_locked, cek duplikat koreksi pending/approved
- 6 routes: 2 dengan middleware `koreksi_dosen create`, 4 dengan `koreksi_dosen approve`

### DOSEN-009 ✅ (2026-06-02)
- `resources/js/pages/koreksi-dosen/index.tsx`: tabel absensi dosen, badge alpa terkunci (🔒), tombol "Ajukan Koreksi" hanya jika status alpa + belum terkunci + tidak ada koreksi pending/approved, Dialog form upload bukti + catatan
- `resources/js/pages/koreksi-dosen/admin.tsx`: tabel pengajuan pending (nama dosen, jurusan, tanggal, matkul), tombol Bukti (buka tab baru), Setujui (dialog + catatan admin opsional), Tolak (dialog + catatan admin wajib)

### DOSEN-010 ✅ (2026-06-02)
- `resources/js/pages/dashboard/dosen.tsx`: banner enrollment (jika belum aktif), 3 stat card (hadir/alpa/persen), tabel jadwal hari ini (jam, matkul, kelas, ruangan, status_hadir), link ke koreksi absensi
- `app/Services/DashboardService.php`: tambah `forDosen()` method, update `forMahasiswa()` untuk tambah `jadwal_hari_ini` dengan detail (dosen, ruangan, status_sesi)
- `resources/js/pages/dashboard/mahasiswa.tsx`: tambah section "Jadwal Hari Ini" di atas chart (tampilkan matkul, dosen, ruangan, jam, badge status sesi)
- `resources/js/components/app-sidebar.tsx`: tambah section "Dosen" dengan 3 menu (Enrollment Wajah, Koreksi Absensi, Koreksi Absensi Dosen) — permission-gated

### DOSEN-011 ✅ (2026-06-02)
- `npx shadcn@latest add textarea` — install komponen Textarea yang dipakai koreksi-dosen
- `npm run build` — 3392 modules transformed, build sukses dalam 46.77s tanpa error TypeScript ✅
- Chunk baru: dosen-*.js (6.56KB), verifikasi-*.js x2, admin-*.js, mahasiswa-*.js, textarea-*.js

---

## UX Redesign (TASK_LIST_UX_Redesign.md) — 2026-06-02

| Task | Nama | Status |
|------|------|--------|
| BUG-001 | Fix window_dosen_menit | ✅ Selesai |
| UX-A01 | Rekap Absensi — Backend | ✅ Selesai |
| UX-A02 | Rekap Absensi — Level 1 Frontend | ✅ Selesai |
| UX-A03 | Rekap Absensi — Level 2 Frontend | ✅ Selesai |
| UX-A04 | Rekap Absensi — Level 3 Frontend | ✅ Selesai |
| UX-B01 | Enrollment — Backend | ✅ Selesai |
| UX-B02 | Enrollment — Frontend (Tabs + Detail) | ✅ Selesai |
| UX-C01 | Dashboard Admin Jurusan — Backend | ✅ Selesai |
| UX-C02 | Dashboard Admin Jurusan — Frontend | ✅ Selesai |
| UX-C03 | Dashboard Mahasiswa — Frontend | ✅ Selesai |
| UX-D01 | Sidebar — Restrukturisasi | ✅ Selesai |
| UX-E01 | npm run build — verifikasi | ✅ Selesai |

---

## TASK_LIST_FINAL.md — Batch 1 & 2 (2026-06-02)

| Task | Nama | Status |
|------|------|--------|
| FIX-001 | Bug persen vs persen_hadir di LaporanService | ✅ Selesai |
| FIX-002 | Bug Sidebar Super Admin 404 (roles system) | ✅ Selesai |
| FIX-003 | Bug window_dosen_menit (sudah selesai sesi sebelumnya) | ✅ Skip |
| UX-A01 | Rekap Absensi Backend — update AbsensiService eager load | ✅ Selesai |
| UX-A02 | Rekap Absensi Level 1 Frontend — p-6, bg-muted/40 | ✅ Selesai |
| UX-A03 | Rekap Absensi Level 2 Frontend — border-l-4 cards | ✅ Selesai |
| UX-A04 | Rekap Absensi Level 3 Frontend — border-l-4 dosen card | ✅ Selesai |
| UX-B01 | Enrollment Backend — detail() pakai status(), auto-approve | ✅ Selesai |
| UX-B02 | Enrollment Frontend — Tabs baru, detail.tsx jarak_lulus string[] | ✅ Selesai |
| UX-C01 | StatCard component baru | ✅ Selesai |
| UX-C02 | Dashboard Admin Jurusan — StatCard + belum_hadir structure | ✅ Selesai |
| UX-C03 | Dashboard Mahasiswa — StatCard + border-l-4 warning | ✅ Selesai |
| UX-C04 | Dashboard Dosen + Super Admin — StatCard | ✅ Selesai |
| UX-D01 | Sidebar — roles field, enrollmentItems baru | ✅ Selesai |
| UX-E01 | npm run build — 3420 modules, 0 errors, 127s | ✅ Selesai |

### Catatan Teknis Penting

**FIX-001:** `LaporanService::rekapKelas()` — rename `$persen` → `$persen_hadir` + update `compact()`. `rekapMahasiswa()` sama.

**FIX-002 (Roles System):**
- `HandleInertiaRequests::share()` — tambah `'roles' => $request->user()->getRoleNames()`
- `types/index.d.ts` — tambah `roles: string[]` ke `Auth` + `roles?: string[]` ke `NavItem`
- `nav-main.tsx` — `canSee(item)` sekarang cek `item.roles` dulu (harus match salah satu), lalu cek `item.permissions`
- `app-sidebar.tsx` — `dosenItems` pakai `roles: ['dosen']` → Super Admin tidak melihat menu Enrollment Wajah + Koreksi Absensi dosen

**UX-C01 StatCard:** `resources/js/components/stat-card.tsx` — Card dengan `border-l-4 {color}`, angka besar berwarna sesuai accent, context text bawah. Dipakai di semua 4 dashboard.

**UX-C02 DashboardService:** `statDosenHariIni` key berubah dari `total_jadwal`/`tidak_hadir` → `total`/`belum_hadir`. Tambah `jam_mulai`/`jam_selesai` di setiap entry.

**UX-B01 EnrollmentController::detail():** Sekarang pakai `$this->enrollmentService->status()` yang return `jarak_lulus` sebagai `string[]` (bukan `Record<string, float>`). `enrollment/detail.tsx` pakai `.includes()` bukan `[key] !== undefined`.

---

## Catatan UX Redesign (2026-06-02)

### BUG-001 ✅ — Fix window_dosen_menit
- `StoreJadwalRequest` + `UpdateJadwalRequest`: tambah rule `window_dosen_menit` required integer min:1 max:120
- `Jadwal` model: tambah `window_dosen_menit` ke `$fillable`
- `InternalController::recordAbsensi()`: baris window sekarang bercabang — dosen pakai `window_dosen_menit`, mahasiswa pakai `window_menit`
- `types/index.d.ts`: tambah `window_dosen_menit: number` ke interface Jadwal
- `jadwal/index.tsx`: `emptyForm` tambah `window_dosen_menit: '30'`, `openEditDialog()` populate field, form field dipecah jadi 2 (Mahasiswa + Dosen), `grid-cols-3` → `grid-cols-2` untuk jam + window terpisah

### UX-A01 ✅ — Rekap Absensi Backend
- `AbsensiService`: GANTI total — hapus 4 method lama (getKelasList, getJadwalByKelas, getSesiByJadwal, getRekapSesi), TAMBAH 3 method baru (getJadwalListWithStats, getSesiListByJadwal, getSesiDetail)
- `AbsensiController`: GANTI total — 3 method (index/sesiList/sesiDetail), middleware update ke 3 method
- `routes/web.php`: tambah 2 route baru (`GET absensi/{jadwal}` → sesiList, `GET absensi/{jadwal}/{sesi}` → sesiDetail)

### UX-A02 ✅ — Rekap Absensi Level 1 Frontend
- `absensi/index.tsx`: GANTI total — tabel jadwal langsung tampil tanpa filter, search bar + filter hari, badge % kehadiran berwarna, DosenStatusBadge sesi terakhir, klik baris → navigasi ke Level 2

### UX-A03 ✅ — Rekap Absensi Level 2 Frontend
- `absensi/sesi-list.tsx`: BUAT FILE BARU — header dengan back button, 4 info cards, tabel sesi dengan progress bar %, status dosen per sesi, klik baris → navigasi ke Level 3

### UX-A04 ✅ — Rekap Absensi Level 3 Frontend
- `absensi/sesi-detail.tsx`: BUAT FILE BARU — dosen card menonjol di atas (warna border sesuai status), 4 summary stat mahasiswa, tabel mahasiswa lengkap dengan status + confidence + lock icon

### UX-B01 ✅ — Enrollment Backend
- `EnrollmentController`: TAMBAH `detail()` dan `fotoPreview()`, TAMBAH auto-approve di `verifyFrame()` dan `selfVerifyFrame()`, UPDATE `index()` sertakan `dosen_list` (Dosen::withCount), TAMBAH `use Dosen, EnrollmentVerifikasi, Storage`
- `routes/web.php`: TAMBAH `{mahasiswa}/detail` dan `{mahasiswa}/foto/{index}`, HAPUS `upload-foto` admin route

### UX-B02 ✅ — Enrollment Frontend
- `npx shadcn@latest add tabs` — install komponen Tabs
- `enrollment/index.tsx`: GANTI total — Tabs (Mahasiswa | Dosen), tab mahasiswa hapus Upload + Approve (auto), tambah tombol Detail, tab dosen dari dosen_list
- `enrollment/detail.tsx`: BUAT FILE BARU — back button, foto preview 5 grid, verifikasi 3 jarak (CheckCircle/XCircle), tombol Approve (jika semua_lulus), tombol Reset

### UX-C01 ✅ — Dashboard Admin Jurusan Backend
- `DashboardService::forAdminJurusan()`: TAMBAH blok statistik dosen hari ini — query jadwal hari ini per jurusan, loop cek AbsensiDosen per sesi, return `statDosenHariIni` (total_jadwal, hadir, tidak_hadir[])
- `compact()` return: tambah `statDosenHariIni`

### UX-C02 ✅ — Dashboard Admin Jurusan Frontend
- `dashboard/admin-jurusan.tsx`: TAMBAH interface `StatDosenHariIni`, TAMBAH ke Props + destructure, TAMBAH Card "Kehadiran Dosen Hari Ini" antara stat cards dan grid — tampilkan hitungan hadir/total + daftar yang belum hadir

### UX-C03 ✅ — Dashboard Mahasiswa Frontend
- `dashboard/mahasiswa.tsx`: PINDAHKAN jadwal_hari_ini dari bawah stat cards ke ATAS (sebelum stat cards), GANTI format dari Card biasa ke Card dengan `border-blue-200 bg-blue-50/50`, GANTI warning AlertTriangle (div) ke Card `border-red-200` dengan AlertCircle, HAPUS sesiStatusConfig yang tidak lagi dipakai

### UX-D01 ✅ — Sidebar Restrukturisasi
- `app-sidebar.tsx`: HAPUS 'Enrollment' dari masterDataItems, BUAT `enrollmentItems` (admin enrollment + dosen enrollment), UPDATE `absensiItems` tambah 'Koreksi Absensi Dosen' (admin), UPDATE `dosenItems` hapus Enrollment Wajah + Koreksi Absensi Dosen (hanya sisa Koreksi Absensi dosen), TAMBAH `<NavMain section='Enrollment'>` di SidebarContent

### UX-E01 ✅ — npm run build
- `npm run build` — 3419 modules transformed, build sukses dalam 98 detik tanpa error TypeScript ✅
- Chunk baru: sesi-list-*.js, sesi-detail-*.js, detail-*.js, admin-jurusan-*.js (26.39KB)

---

## Bugfix Sesi 2026-06-02

### FIX-DOSEN-001 ✅ — Dashboard dosen "akun belum terhubung"

**Gejala:** Login `dosen@demo.id` berhasil tapi dashboard menampilkan "Akun dosen belum terhubung. Hubungi administrator."

**Root cause:** `UserSeeder` pertama kali dijalankan saat tabel `jurusan` masih kosong (data jurusan baru diisi manual via CRUD admin). Kondisi `if ($jurusan)` bernilai false → record `Dosen` tidak pernah dibuat → `$user->dosen` selalu null.

**Perbaikan:**
1. Jalankan `UserSeeder` ulang (kali ini jurusan sudah ada) → record Dosen ID=6 ter-create dengan `user_id=4`
2. Update `UserSeeder.php` agar lebih robust:
   - Jika tidak ada jurusan sama sekali, buat `Institusi` + `Jurusan` demo sebagai fallback
   - Setelah `firstOrCreate`, cek jika `user_id` masih null → update secara eksplisit (menangani kasus record Dosen sudah ada dari CRUD tapi belum ter-link ke User)

**File yang diubah:** `database/seeders/UserSeeder.php`

---

## Cara Lanjut di Sesi Baru
1. Baca file ini untuk tahu posisi progress
2. Semua task sudah selesai — sistem absensi dosen lengkap
3. Untuk testing: login `dosen@demo.id` / `Password@123` → dashboard dosen → enrollment wajah
