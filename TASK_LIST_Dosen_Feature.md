# Task List — Fitur Akun & Absensi Dosen
*Dibuat: 2 Juni 2026 | Lanjutan dari semua task sebelumnya*

---

## Konteks

Task list ini menambahkan fitur dosen sebagai role ke-4 dalam sistem. Berdasarkan audit repo:
- `recognizer.py` sudah punya loop dosen ✅ — tidak perlu diubah
- `InternalController` sudah handle type `dosen` ✅ — tidak perlu diubah
- `AbsensiDosen` model sudah ada ✅ — tidak perlu diubah
- Yang perlu dibangun: auth dosen, enrollment dosen, alpa dosen, koreksi absensi, dashboard dosen

**Root project:** `ta-faiz/Laravel/` (Laravel) dan `ta-faiz/python-service/` (Python FastAPI)

---

## Prioritas Eksekusi

| Task | Nama | Urgensi |
|------|------|---------|
| DOSEN-001 | Database migrations dosen | 🔴 Kritis — fondasi semua task lain |
| DOSEN-002 | Role, permissions, User & Dosen model update | 🔴 Kritis |
| DOSEN-003 | Seeder & DashboardController update | 🔴 Kritis |
| DOSEN-004 | EnrollmentDosenService | 🟡 Mayor |
| DOSEN-005 | EnrollmentDosenController + routes | 🟡 Mayor |
| DOSEN-006 | Enrollment dosen UI (upload foto + verifikasi) | 🟡 Mayor |
| DOSEN-007 | BatchAlpaJob + LockAlpaJob update untuk dosen | 🟡 Mayor |
| DOSEN-008 | KoreksiAbsensiDosen backend | 🟡 Mayor |
| DOSEN-009 | Koreksi absensi UI (dosen submit + admin review) | 🟡 Mayor |
| DOSEN-010 | Dashboard dosen + update dashboard mahasiswa | 🟢 Penyempurnaan |
| DOSEN-011 | npm run build — verifikasi build | ✅ Verifikasi |

---

## Detail Task

---

### DOSEN-001 — Database migrations dosen

**Buat 5 migration baru:**

**a) `add_auth_enrollment_to_dosen_table.php`**

```php
Schema::table('dosen', function (Blueprint $table) {
    $table->foreignId('user_id')->nullable()->after('id')
          ->constrained('users')->nullOnDelete();
    $table->string('status_enrollment')
          ->default('pending_upload')
          ->after('face_encodings');
    // enum: pending_upload | pending_verifikasi | aktif
    $table->json('foto_paths')->nullable()->after('foto_path');
    $table->timestamp('foto_verified_at')->nullable()->after('foto_paths');
});
```

**b) `create_enrollment_verifikasi_dosen_table.php`**

```php
Schema::create('enrollment_verifikasi_dosen', function (Blueprint $table) {
    $table->id();
    $table->foreignId('dosen_id')->constrained('dosen')->cascadeOnDelete();
    $table->string('jarak'); // dekat | sedang | jauh
    $table->float('confidence');
    $table->timestamp('verified_at');
    $table->timestamps();
    $table->unique(['dosen_id', 'jarak']);
});
```

**c) `add_window_dosen_menit_to_jadwal_table.php`**

```php
Schema::table('jadwal', function (Blueprint $table) {
    $table->unsignedInteger('window_dosen_menit')
          ->default(30)
          ->after('window_menit');
    // window_menit = mahasiswa (default 15)
    // window_dosen_menit = dosen (default 30, 2x mahasiswa)
});
```

**d) `add_lock_to_absensi_dosen_table.php`**

```php
Schema::table('absensi_dosen', function (Blueprint $table) {
    $table->boolean('is_locked')->default(false)->after('confidence');
    $table->timestamp('locked_at')->nullable()->after('is_locked');
});
```

**e) `create_koreksi_absensi_dosen_table.php`**

```php
Schema::create('koreksi_absensi_dosen', function (Blueprint $table) {
    $table->id();
    $table->foreignId('absensi_dosen_id')->constrained('absensi_dosen')->cascadeOnDelete();
    $table->foreignId('dosen_id')->constrained('dosen')->cascadeOnDelete();
    $table->string('bukti_path'); // path file bukti mengajar
    $table->text('catatan')->nullable(); // catatan dari dosen
    $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
    $table->text('catatan_admin')->nullable();
    $table->foreignId('disetujui_oleh')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('diproses_at')->nullable();
    $table->timestamps();
});
```

**Jalankan:** `php artisan migrate`

**Verifikasi:** Semua 5 tabel/kolom baru berhasil dibuat.

---

### DOSEN-002 — Role, permissions, User & Dosen model update

**a) `config/starterkit.php` — tambah role dan permissions dosen:**

```php
'roles' => ['super_admin', 'admin_jurusan', 'mahasiswa', 'dosen'],

'permissions' => [
    // ... permissions yang sudah ada ...

    // Tambah permissions baru untuk dosen:
    'enrollment_dosen index',
    'absensi_dosen index',
    'koreksi_dosen create',
    'koreksi_dosen approve',
],
```

**b) `app/Models/User.php` — tambah relasi dan helper dosen:**

```php
// Tambah di dalam class User:

public function dosen(): HasOne
{
    return $this->hasOne(Dosen::class);
}

public function isDosen(): bool
{
    return $this->hasRole('dosen');
}
```

Tambah `use Illuminate\Database\Eloquent\Relations\HasOne;` di bagian import jika belum ada.

**c) `app/Models/Dosen.php` — tambah relasi user dan enrollment:**

```php
// Tambah fillable:
protected $fillable = [
    'user_id', 'jurusan_id', 'nip', 'nama', 'email',
    'foto_path', 'foto_paths', 'face_encodings',
    'status_enrollment', 'foto_verified_at',
];

// Tambah casts:
protected $casts = [
    'face_encodings'   => 'array',
    'foto_paths'       => 'array',
    'foto_verified_at' => 'datetime',
];

// Tambah relasi:
public function user(): BelongsTo
{
    return $this->belongsTo(User::class);
}

public function enrollmentVerifikasi(): HasMany
{
    return $this->hasMany(EnrollmentVerifikasiDosen::class);
}

public function absensi(): HasMany
{
    return $this->hasMany(AbsensiDosen::class);
}
```

**d) Buat model `EnrollmentVerifikasiDosen.php`:**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnrollmentVerifikasiDosen extends Model
{
    protected $table = 'enrollment_verifikasi_dosen';

    protected $fillable = ['dosen_id', 'jarak', 'confidence', 'verified_at'];

    protected $casts = ['verified_at' => 'datetime'];

    public function dosen(): BelongsTo
    {
        return $this->belongsTo(Dosen::class);
    }
}
```

**e) Buat model `KoreksiAbsensiDosen.php`:**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KoreksiAbsensiDosen extends Model
{
    protected $table = 'koreksi_absensi_dosen';

    protected $fillable = [
        'absensi_dosen_id', 'dosen_id', 'bukti_path',
        'catatan', 'status', 'catatan_admin',
        'disetujui_oleh', 'diproses_at',
    ];

    protected $casts = ['diproses_at' => 'datetime'];

    public function absensiDosen(): BelongsTo
    {
        return $this->belongsTo(AbsensiDosen::class);
    }

    public function dosen(): BelongsTo
    {
        return $this->belongsTo(Dosen::class);
    }

    public function disetujuiOleh(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disetujui_oleh');
    }
}
```

**f) Update `app/Models/AbsensiDosen.php` — tambah fillable is_locked:**

```php
protected $fillable = [
    'sesi_id', 'dosen_id', 'hadir_at',
    'status', 'confidence', 'is_locked', 'locked_at',
];

protected $casts = [
    'hadir_at'  => 'datetime',
    'locked_at' => 'datetime',
];

// Tambah relasi koreksi:
public function koreksi(): HasMany
{
    return $this->hasMany(KoreksiAbsensiDosen::class);
}
```

**g) Jalankan ulang seeder untuk sync role & permissions baru:**

```bash
php artisan db:seed --class=RoleSeeder
```

**Verifikasi:** Role `dosen` dan semua permissions baru terdaftar di tabel permissions.

---

### DOSEN-003 — Seeder & DashboardController update

**a) `database/seeders/UserSeeder.php` — tambah user demo dosen:**

Di dalam method `run()`, setelah seeder mahasiswa, tambahkan:

```php
// Demo dosen
$dosenUser = \App\Models\User::firstOrCreate(
    ['email' => 'dosen@demo.id'],
    [
        'name'     => 'Dr. Budi Santoso',
        'password' => Hash::make('Password@123'),
    ]
);
$dosenUser->assignRole('dosen');

// Buat record dosen untuk user ini
// Pastikan ada jurusan dulu (ambil jurusan pertama yang ada)
$jurusan = \App\Models\Jurusan::first();
if ($jurusan) {
    \App\Models\Dosen::firstOrCreate(
        ['nip' => '198001012010011001'],
        [
            'user_id'    => $dosenUser->id,
            'jurusan_id' => $jurusan->id,
            'nama'       => 'Dr. Budi Santoso',
            'email'      => 'dosen@demo.id',
        ]
    );
}
```

**b) `app/Http/Controllers/DashboardController.php` — tambah routing dosen:**

```php
if ($user->isDosen()) {
    return inertia('dashboard/dosen', $this->dashboardService->forDosen($user));
}
```

Letakkan sebelum `return inertia('dashboard/admin', ...)`.

**c) `app/Services/DashboardService.php` — tambah method forDosen():**

```php
public function forDosen(User $user): array
{
    $dosen = $user->dosen;
    if (!$dosen) return ['dosen' => null, 'jadwal_hari_ini' => [], 'absensi_bulan_ini' => []];

    $hariMap = [0=>'minggu',1=>'senin',2=>'selasa',3=>'rabu',4=>'kamis',5=>'jumat',6=>'sabtu'];
    $hariIni = $hariMap[now()->dayOfWeek];

    $jadwalHariIni = Jadwal::where('dosen_id', $dosen->id)
        ->where('hari', $hariIni)
        ->where('is_active', true)
        ->with(['kelas', 'ruangan', 'sesiAbsensi' => fn($q) => $q->whereDate('tanggal', today())])
        ->get()
        ->map(fn($j) => [
            'id'          => $j->id,
            'kelas'       => $j->kelas->nama ?? '-',
            'ruangan'     => $j->ruangan->nama ?? '-',
            'jam_mulai'   => substr($j->jam_mulai, 0, 5),
            'jam_selesai' => substr($j->jam_selesai, 0, 5),
            'status_hadir'=> $j->sesiAbsensi->first()?->absensiDosen
                                ->where('dosen_id', $dosen->id)->first()?->status ?? 'belum',
        ]);

    $absensiStats = AbsensiDosen::where('dosen_id', $dosen->id)
        ->whereMonth('created_at', now()->month)
        ->whereYear('created_at', now()->year)
        ->selectRaw('status, count(*) as total')
        ->groupBy('status')
        ->pluck('total', 'status');

    return [
        'dosen'           => ['nama' => $dosen->nama, 'nip' => $dosen->nip,
                              'status_enrollment' => $dosen->status_enrollment],
        'jadwal_hari_ini' => $jadwalHariIni,
        'absensi_stats'   => $absensiStats,
    ];
}
```

Tambah import yang diperlukan di atas class.

**Verifikasi:** Login dengan `dosen@demo.id` / `Password@123` → diarahkan ke `dashboard/dosen`.

---

### DOSEN-004 — EnrollmentDosenService

**File:** `ta-faiz/Laravel/app/Services/EnrollmentDosenService.php`

Buat file baru ini — mirip dengan `EnrollmentService` yang sudah ada tapi untuk model `Dosen`:

```php
<?php
namespace App\Services;

use App\Models\Dosen;
use App\Models\EnrollmentVerifikasiDosen;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class EnrollmentDosenService
{
    private string $pythonUrl;
    private float  $enrollmentThreshold;

    public function __construct()
    {
        $this->pythonUrl           = config('services.python.url', 'http://localhost:8001');
        $this->enrollmentThreshold = (float) config('services.python.enrollment_threshold', 0.75);
    }

    public function uploadFoto(Dosen $dosen, array $files): void
    {
        if (count($files) !== 5) {
            throw ValidationException::withMessages(['foto' => 'Harus mengirim tepat 5 foto wajah.']);
        }

        $dir     = "enrollment_dosen/{$dosen->id}";
        $paths   = [];
        $b64List = [];

        foreach ($files as $file) {
            $path      = $file->store($dir, 'local');
            $paths[]   = $path;
            $b64List[] = base64_encode(Storage::disk('local')->get($path));
        }

        try {
            $resp = Http::timeout(30)->post("{$this->pythonUrl}/enroll/generate-encoding", [
                'foto_list' => $b64List,
            ]);
        } catch (ConnectionException) {
            throw ValidationException::withMessages(['foto' => 'Layanan face recognition tidak tersedia.']);
        }

        $data = $resp->json();

        if (isset($data['error'])) {
            $no = ($data['foto_index'] ?? 0) + 1;
            throw ValidationException::withMessages(['foto' => "Foto ke-{$no} tidak terdeteksi wajah."]);
        }

        $dosen->update([
            'foto_paths'        => $paths,
            'face_encodings'    => $data['encodings'],
            'status_enrollment' => 'pending_verifikasi',
        ]);
    }

    public function verifyFrame(Dosen $dosen, string $frameBase64, string $jarak): array
    {
        try {
            $resp = Http::timeout(15)->post("{$this->pythonUrl}/enroll/verify-frame", [
                'frame_base64'    => $frameBase64,
                'known_encodings' => $dosen->face_encodings,
                'jarak'           => $jarak,
                'threshold'       => $this->enrollmentThreshold,
            ]);
        } catch (ConnectionException) {
            throw ValidationException::withMessages(['frame' => 'Layanan face recognition tidak tersedia.']);
        }

        $result = $resp->json();

        if (($result['lulus'] ?? false) === true) {
            EnrollmentVerifikasiDosen::updateOrCreate(
                ['dosen_id' => $dosen->id, 'jarak' => $jarak],
                ['confidence' => $result['confidence'], 'verified_at' => now()]
            );
        }

        $semuaJarakLulus = EnrollmentVerifikasiDosen::where('dosen_id', $dosen->id)->count() >= 3;

        return [
            'lulus'             => $result['lulus'] ?? false,
            'confidence'        => $result['confidence'] ?? 0,
            'semua_jarak_lulus' => $semuaJarakLulus,
        ];
    }

    public function approve(Dosen $dosen): void
    {
        $lulus = EnrollmentVerifikasiDosen::where('dosen_id', $dosen->id)->count();
        if ($lulus < 3) {
            throw ValidationException::withMessages(['enrollment' => 'Dosen belum lulus verifikasi 3 jarak.']);
        }

        $dosen->update([
            'status_enrollment' => 'aktif',
            'foto_verified_at'  => now(),
        ]);
    }

    public function reset(Dosen $dosen): void
    {
        if ($dosen->foto_paths) {
            foreach ($dosen->foto_paths as $path) {
                Storage::disk('local')->delete($path);
            }
        }

        EnrollmentVerifikasiDosen::where('dosen_id', $dosen->id)->delete();

        $dosen->update([
            'foto_paths'        => null,
            'face_encodings'    => null,
            'status_enrollment' => 'pending_upload',
            'foto_verified_at'  => null,
        ]);
    }

    public function status(Dosen $dosen): array
    {
        $jarakLulus = EnrollmentVerifikasiDosen::where('dosen_id', $dosen->id)
            ->pluck('confidence', 'jarak');

        return [
            'status_enrollment' => $dosen->status_enrollment,
            'jarak_lulus'       => $jarakLulus,
            'semua_jarak_lulus' => $jarakLulus->count() >= 3,
        ];
    }
}
```

---

### DOSEN-005 — EnrollmentDosenController + routes

**File:** `ta-faiz/Laravel/app/Http/Controllers/EnrollmentDosenController.php`

```php
<?php
namespace App\Http\Controllers;

use App\Services\EnrollmentDosenService;
use Illuminate\Http\Request;

class EnrollmentDosenController extends Controller
{
    public function __construct(private EnrollmentDosenService $service) {}

    // Halaman utama enrollment dosen (untuk dosen login sendiri)
    public function index(Request $request)
    {
        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        return inertia('enrollment-dosen/index', [
            'status' => $this->service->status($dosen),
        ]);
    }

    // Upload foto — dipanggil dosen
    public function uploadFoto(Request $request)
    {
        $request->validate([
            'foto'   => ['required', 'array', 'size:5'],
            'foto.*' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
        ]);

        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        $this->service->uploadFoto($dosen, $request->file('foto'));

        return back()->with('success', '5 foto berhasil diunggah. Lanjutkan verifikasi wajah.');
    }

    // Halaman verifikasi wajah
    public function verifikasi(Request $request)
    {
        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        return inertia('enrollment-dosen/verifikasi', [
            'dosen'  => ['id' => $dosen->id, 'nama' => $dosen->nama],
            'status' => $this->service->status($dosen),
        ]);
    }

    // Verifikasi satu frame dari webcam
    public function verifyFrame(Request $request)
    {
        $request->validate([
            'frame_base64' => ['required', 'string'],
            'jarak'        => ['required', 'in:dekat,sedang,jauh'],
        ]);

        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        $result = $this->service->verifyFrame($dosen, $request->frame_base64, $request->jarak);

        // Auto-approve jika semua jarak lulus
        if ($result['semua_jarak_lulus'] && $dosen->status_enrollment === 'pending_verifikasi') {
            $this->service->approve($dosen);
            $result['auto_approved'] = true;
        }

        return response()->json($result);
    }

    // Reset enrollment
    public function reset(Request $request)
    {
        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        $this->service->reset($dosen);

        return back()->with('success', 'Enrollment berhasil direset.');
    }

    // Status enrollment (JSON, untuk polling frontend)
    public function status(Request $request)
    {
        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        return response()->json($this->service->status($dosen));
    }
}
```

**Routes — tambahkan di `routes/web.php`:**

```php
// Enrollment Dosen (dosen melakukan sendiri)
Route::middleware(['auth', 'can:enrollment_dosen index'])->prefix('enrollment-dosen')->group(function () {
    Route::get('/', [EnrollmentDosenController::class, 'index'])->name('enrollment-dosen.index');
    Route::post('/upload-foto', [EnrollmentDosenController::class, 'uploadFoto'])->name('enrollment-dosen.upload');
    Route::get('/verifikasi', [EnrollmentDosenController::class, 'verifikasi'])->name('enrollment-dosen.verifikasi');
    Route::post('/verify-frame', [EnrollmentDosenController::class, 'verifyFrame'])->name('enrollment-dosen.verify-frame');
    Route::delete('/reset', [EnrollmentDosenController::class, 'reset'])->name('enrollment-dosen.reset');
    Route::get('/status', [EnrollmentDosenController::class, 'status'])->name('enrollment-dosen.status');
});
```

Tambahkan `use App\Http\Controllers\EnrollmentDosenController;` di bagian import routes.

---

### DOSEN-006 — Enrollment dosen UI

**File:** `ta-faiz/Laravel/resources/js/pages/enrollment-dosen/index.tsx`

Buat halaman ini dengan struktur yang **sama persis** dengan `pages/enrollment/verifikasi-mandiri.tsx` yang sudah ada (untuk mahasiswa), tapi disesuaikan untuk dosen:

- Tampilkan status enrollment dosen (badge status_enrollment)
- Jika `pending_upload`: tampilkan form upload 5 foto dengan tombol "Upload Foto Wajah"
- Jika `pending_verifikasi`: tampilkan tombol "Mulai Verifikasi Wajah" yang mengarah ke halaman verifikasi
- Jika `aktif`: tampilkan badge hijau "Enrollment Aktif"
- Tombol reset dengan ConfirmDialog

**File:** `ta-faiz/Laravel/resources/js/pages/enrollment-dosen/verifikasi.tsx`

Buat halaman ini dengan struktur yang **sama persis** dengan `pages/enrollment/verifikasi.tsx` yang sudah ada untuk mahasiswa. Endpoint yang dipanggil: `POST /enrollment-dosen/verify-frame`.

**Sidebar — tambahkan menu enrollment di sidebar dosen:**

Di file sidebar yang ada (cari komponen sidebar/nav), tambahkan kondisi untuk role dosen:

```tsx
// Jika user adalah dosen, tampilkan menu enrollment dosen
{isDosen && (
  <NavItem href="/enrollment-dosen" icon={<UserCheck />}>
    Enrollment Wajah
  </NavItem>
)}
```

---

### DOSEN-007 — BatchAlpaJob + LockAlpaJob update untuk dosen

**File:** `ta-faiz/Laravel/app/Jobs/BatchAlpaJob.php`

Di dalam method `handle()`, setelah loop mahasiswa yang sudah ada, tambahkan:

```php
// ── Alpa dosen ────────────────────────────────────────────────────────────
foreach ($sesiSelesai as $sesi) {
    $jadwal = $sesi->jadwal;
    if (!$jadwal) continue;

    $batasDosen = Carbon::parse($sesi->mulai_at)
        ->addMinutes($jadwal->window_dosen_menit);

    // Hanya insert alpa dosen jika window dosen juga sudah lewat
    if (now()->isAfter($batasDosen)) {
        $dosenId = $jadwal->dosen_id;
        if ($dosenId) {
            AbsensiDosen::firstOrCreate(
                ['sesi_id' => $sesi->id, 'dosen_id' => $dosenId],
                ['status' => 'alpa', 'is_locked' => false]
            );
        }
    }
}
```

Tambahkan `use App\Models\AbsensiDosen;` di bagian import jika belum ada.

**File:** `ta-faiz/Laravel/app/Jobs/LockAlpaJob.php`

Di dalam method `handle()`, setelah update `AbsensiMahasiswa`, tambahkan:

```php
// Lock alpa dosen — hanya dapat dikoreksi dalam 3 hari
AbsensiDosen::whereDate('created_at', '<=', now()->subDays(3))
    ->where('status', 'alpa')
    ->where('is_locked', false)
    ->whereDoesntHave('koreksi', fn($q) => $q->whereIn('status', ['pending', 'approved']))
    ->update(['is_locked' => true, 'locked_at' => now()]);
```

Tambahkan `use App\Models\AbsensiDosen;` jika belum ada.

---

### DOSEN-008 — KoreksiAbsensiDosen backend

**File:** `ta-faiz/Laravel/app/Http/Controllers/KoreksiAbsensiDosenController.php`

```php
<?php
namespace App\Http\Controllers;

use App\Models\AbsensiDosen;
use App\Models\KoreksiAbsensiDosen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class KoreksiAbsensiDosenController extends Controller
{
    // Dosen: lihat daftar absensi + status koreksi
    public function index(Request $request)
    {
        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        $absensi = AbsensiDosen::where('dosen_id', $dosen->id)
            ->with(['sesi.jadwal.kelas', 'koreksi'])
            ->orderByDesc('created_at')
            ->paginate(15);

        return inertia('koreksi-dosen/index', ['absensi' => $absensi]);
    }

    // Dosen: submit pengajuan koreksi
    public function store(Request $request)
    {
        $request->validate([
            'absensi_dosen_id' => ['required', 'exists:absensi_dosen,id'],
            'bukti'            => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'catatan'          => ['nullable', 'string', 'max:500'],
        ]);

        $dosen = $request->user()->dosen;
        $absensi = AbsensiDosen::findOrFail($request->absensi_dosen_id);

        // Pastikan absensi milik dosen ini
        abort_if($absensi->dosen_id !== $dosen->id, 403);
        // Pastikan belum terkunci
        abort_if($absensi->is_locked, 422, 'Absensi sudah terkunci dan tidak dapat dikoreksi.');
        // Pastikan belum ada koreksi pending/approved
        abort_if($absensi->koreksi()->whereIn('status', ['pending', 'approved'])->exists(), 422,
            'Pengajuan koreksi sudah ada.');

        $path = $request->file('bukti')->store('koreksi_dosen', 'local');

        KoreksiAbsensiDosen::create([
            'absensi_dosen_id' => $absensi->id,
            'dosen_id'         => $dosen->id,
            'bukti_path'       => $path,
            'catatan'          => $request->catatan,
        ]);

        return back()->with('success', 'Pengajuan koreksi berhasil dikirim.');
    }

    // Admin: lihat semua pengajuan koreksi
    public function adminIndex(Request $request)
    {
        $user = $request->user();
        $jurusanId = $user->isAdminJurusan() ? $user->jurusan_id : null;

        $koreksi = KoreksiAbsensiDosen::with(['dosen.jurusan', 'absensiDosen.sesi.jadwal'])
            ->when($jurusanId, fn($q) => $q->whereHas('dosen', fn($d) => $d->where('jurusan_id', $jurusanId)))
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->paginate(15);

        return inertia('koreksi-dosen/admin', ['koreksi' => $koreksi]);
    }

    // Admin: approve koreksi → ubah status absensi ke hadir
    public function approve(Request $request, KoreksiAbsensiDosen $koreksi)
    {
        $request->validate(['catatan_admin' => ['nullable', 'string', 'max:500']]);

        $koreksi->update([
            'status'        => 'approved',
            'catatan_admin' => $request->catatan_admin,
            'disetujui_oleh'=> $request->user()->id,
            'diproses_at'   => now(),
        ]);

        $koreksi->absensiDosen->update(['status' => 'hadir']);

        return back()->with('success', 'Koreksi disetujui. Status absensi diubah ke hadir.');
    }

    // Admin: reject koreksi
    public function reject(Request $request, KoreksiAbsensiDosen $koreksi)
    {
        $request->validate(['catatan_admin' => ['required', 'string', 'max:500']]);

        $koreksi->update([
            'status'        => 'rejected',
            'catatan_admin' => $request->catatan_admin,
            'disetujui_oleh'=> $request->user()->id,
            'diproses_at'   => now(),
        ]);

        return back()->with('success', 'Koreksi ditolak.');
    }

    // Download bukti mengajar
    public function bukti(KoreksiAbsensiDosen $koreksi)
    {
        abort_if(!Storage::disk('local')->exists($koreksi->bukti_path), 404);
        return Storage::disk('local')->download($koreksi->bukti_path);
    }
}
```

**Routes — tambahkan di `routes/web.php`:**

```php
// Koreksi Absensi Dosen (dosen submit)
Route::middleware(['auth', 'can:koreksi_dosen create'])->prefix('koreksi-dosen')->group(function () {
    Route::get('/', [KoreksiAbsensiDosenController::class, 'index'])->name('koreksi-dosen.index');
    Route::post('/', [KoreksiAbsensiDosenController::class, 'store'])->name('koreksi-dosen.store');
});

// Koreksi Absensi Dosen (admin review)
Route::middleware(['auth', 'can:koreksi_dosen approve'])->prefix('koreksi-dosen/admin')->group(function () {
    Route::get('/', [KoreksiAbsensiDosenController::class, 'adminIndex'])->name('koreksi-dosen.admin');
    Route::patch('/{koreksi}/approve', [KoreksiAbsensiDosenController::class, 'approve'])->name('koreksi-dosen.approve');
    Route::patch('/{koreksi}/reject', [KoreksiAbsensiDosenController::class, 'reject'])->name('koreksi-dosen.reject');
    Route::get('/{koreksi}/bukti', [KoreksiAbsensiDosenController::class, 'bukti'])->name('koreksi-dosen.bukti');
});
```

---

### DOSEN-009 — Koreksi absensi UI

**File:** `ta-faiz/Laravel/resources/js/pages/koreksi-dosen/index.tsx`

Buat halaman untuk dosen:
- Tabel absensi dosen (tanggal, kelas, status, aksi)
- Badge status: hadir (hijau), alpa (merah), alpa terkunci 🔒
- Tombol "Ajukan Koreksi" hanya muncul jika status alpa dan `is_locked = false`
- Dialog form pengajuan: upload bukti (jpg/png/pdf) + textarea catatan
- Toast sukses/error

**File:** `ta-faiz/Laravel/resources/js/pages/koreksi-dosen/admin.tsx`

Buat halaman untuk admin:
- Tabel pengajuan koreksi yang pending (nama dosen, tanggal, sesi)
- Tombol "Lihat Bukti" — buka link download
- Tombol "Setujui" dan "Tolak" dengan ConfirmDialog
- Tolak: memunculkan input textarea untuk catatan wajib diisi

**Sidebar admin** — tambahkan menu "Koreksi Absensi Dosen" di bawah section Absensi.

---

### DOSEN-010 — Dashboard dosen + update dashboard mahasiswa

**File:** `ta-faiz/Laravel/resources/js/pages/dashboard/dosen.tsx`

Buat halaman dashboard dosen dengan:
- Banner status enrollment (jika belum aktif, tampilkan tombol ke halaman enrollment)
- Card "Jadwal Mengajar Hari Ini" — tabel jam, kelas, ruangan, status kehadiran hari ini
- Card "Ringkasan Kehadiran Bulan Ini" — pie chart/badge hadir vs alpa
- Link ke halaman koreksi absensi

**Update `pages/dashboard/mahasiswa.tsx`:**

Tambahkan section "Jadwal Hari Ini" di bagian atas dashboard mahasiswa:
- Query jadwal kelas mahasiswa untuk hari ini
- Tampilkan: jam mulai-selesai, nama dosen, ruangan, status sesi (berlangsung/selesai)
- Jika tidak ada jadwal hari ini: tampilkan pesan "Tidak ada jadwal hari ini"

Untuk ini, update `DashboardService::forMahasiswa()` di Laravel agar mengirim data jadwal hari ini.

---

### DOSEN-011 — npm run build — verifikasi build

```bash
cd ta-faiz/Laravel
npm run build
```

Build harus selesai tanpa error TypeScript. Jika ada error:
- `Cannot find module '@/pages/enrollment-dosen/...'` → cek DOSEN-006 sudah dibuat
- `Cannot find module '@/pages/koreksi-dosen/...'` → cek DOSEN-009 sudah dibuat
- `Property 'isDosen' does not exist` → cek User model di DOSEN-002
- Import yang tidak dipakai → hapus dari file yang bersangkutan

---

## Urutan Eksekusi yang Direkomendasikan

```
DOSEN-001   (migrations — harus pertama)
DOSEN-002   (models & config)
DOSEN-003   (seeder + dashboard routing)
DOSEN-004   (EnrollmentDosenService)
DOSEN-005   (controller + routes)
DOSEN-006   (UI enrollment)
DOSEN-007   (batch jobs)
DOSEN-008   (koreksi backend)
DOSEN-009   (koreksi UI)
DOSEN-010   (dashboard)
DOSEN-011   (build verifikasi — terakhir)
```

## Cara Test Setelah Semua Task Selesai

1. **Auth dosen:** Login `dosen@demo.id` / `Password@123` → diarahkan ke dashboard dosen
2. **Enrollment:** Upload 5 foto → verifikasi 3 jarak → status berubah ke aktif
3. **Recognition:** Jalankan Python service → hadapkan wajah dosen → cek log `[Recognizer] ✓ HADIR dosen:`
4. **Alpa dosen:** Buat sesi yang melewati window → cek `absensi_dosen` ada record alpa
5. **Koreksi:** Dosen submit koreksi → admin lihat di halaman admin → approve → status berubah ke hadir
6. **Lock:** Cek alpa dosen > 3 hari → `is_locked = true` dan tombol koreksi tidak muncul

