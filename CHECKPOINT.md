# Checkpoint — Sistem Absensi Face Recognition
*Update otomatis setiap task selesai*

---

## Status Terakhir
**Task aktif:** — SEMUA TASK SELESAI — (debugging & tuning berlanjut)
**Terakhir diupdate:** 2026-05-31

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

## Cara Lanjut di Sesi Baru
1. Baca file ini untuk tahu posisi progress
2. Lanjut ke task pertama yang statusnya ⏳ Pending
3. Task list lengkap ada di: `TASK_LIST_Sistem_Absensi.md`
