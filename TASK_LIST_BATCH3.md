# Task List Batch 3 — Arsitektur, Data Isolation & Enhancement
*Dibuat: 2 Juni 2026 | Prerequisite: Batch 1 & 2 selesai*

---

## Gambaran Perubahan Batch 3

```
SEBELUM                          SESUDAH
──────────────────────────────   ──────────────────────────────────────
users.jurusan_id (nullable)  →   users: bersih, hanya auth
admin_jurusan (tidak ada)    →   tabel admin_jurusan baru
mahasiswa (tidak ada email)  →   mahasiswa.email ditambahkan
DosenService.store()         →   auto-create user account
MahasiswaService.store()     →   auto-create user dengan email nyata
enrollment-dosen (no preview)→   ada foto preview
enrollment mahasiswa (no self)→  ada halaman self-status
```

**Strategi kunci:** Daripada mengubah semua controller yang sudah pakai
`$user->jurusan_id`, kita buat accessor di User model yang auto-resolve
jurusan_id dari relasi yang tepat berdasarkan role. Zero perubahan di controller.

---

## Urutan Eksekusi (WAJIB berurutan)

```
ARCH-001  Migration baru
ARCH-002  Models update
ARCH-003  RoleSeeder update
ARCH-004  UserSeeder + MasterDataSeeder rombak total
ARCH-005  DosenService auto-create user
ARCH-006  MahasiswaService + requests update
ARCH-007  AdminJurusanController + routes
ARCH-008  Halaman admin_jurusan (frontend)
CRUD-001  Halaman dosen: kolom status enrollment
CRUD-002  Halaman kelas: button mahasiswa + filter tahun
CRUD-003  Halaman mahasiswa: filter kelas + email di form
CRUD-004  Halaman ruangan: filter jurusan aktif
GAP-001   Enrollment dosen: foto preview
GAP-002   Enrollment mahasiswa: halaman self-status
GAP-003   MasterDataSeeder: window_dosen_menit
```

---

# ARCH-001 — Migration Baru

**Files yang diubah: 3 migration baru**

**Migration 1: `create_admin_jurusan_table.php`**

Buat file baru di `database/migrations/` dengan nama timestamp sekarang:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('admin_jurusan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('jurusan_id')->constrained('jurusan')->cascadeOnDelete();
            $table->string('nama');
            $table->string('email')->unique();
            $table->string('no_hp')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_jurusan');
    }
};
```

**Migration 2: `add_email_to_mahasiswa_table.php`**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('mahasiswa', function (Blueprint $table) {
            $table->string('email')->unique()->nullable()->after('nama');
        });
    }

    public function down(): void
    {
        Schema::table('mahasiswa', function (Blueprint $table) {
            $table->dropColumn('email');
        });
    }
};
```

**Migration 3: `remove_jurusan_id_from_users_table.php`**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['jurusan_id']);
            $table->dropColumn('jurusan_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('jurusan_id')->nullable()->constrained('jurusan')->nullOnDelete();
        });
    }
};
```

**Jalankan:** `php artisan migrate`

---

# ARCH-002 — Models Update

**Files yang diubah: 4**

**File 1: BUAT `app/Models/AdminJurusan.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminJurusan extends Model
{
    protected $table = 'admin_jurusan';

    protected $fillable = ['user_id', 'jurusan_id', 'nama', 'email', 'no_hp'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function jurusan(): BelongsTo
    {
        return $this->belongsTo(Jurusan::class);
    }
}
```

**File 2: `app/Models/User.php`**

Perubahan:
- Hapus `'jurusan_id'` dari `$fillable`
- Hapus method `jurusan(): BelongsTo`
- Tambah relasi `adminJurusan()` dan accessor `getJurusanIdAttribute()`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, Notifiable, TwoFactorAuthenticatable, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'        => 'datetime',
            'password'                 => 'hashed',
            'two_factor_confirmed_at'  => 'datetime',
        ];
    }

    // ── Relasi ─────────────────────────────────────────────────────────────

    public function adminJurusan(): HasOne
    {
        return $this->hasOne(AdminJurusan::class);
    }

    public function mahasiswa(): HasOne
    {
        return $this->hasOne(Mahasiswa::class);
    }

    public function dosen(): HasOne
    {
        return $this->hasOne(Dosen::class);
    }

    // ── Accessor: jurusan_id (dipakai semua controller tanpa perlu diubah) ─

    /**
     * Resolve jurusan_id dari relasi berdasarkan role.
     * admin_jurusan → admin_jurusan.jurusan_id
     * dosen          → dosen.jurusan_id
     * lainnya        → null
     */
    public function getJurusanIdAttribute(): ?int
    {
        if ($this->isAdminJurusan()) {
            return $this->adminJurusan?->jurusan_id;
        }

        if ($this->isDosen()) {
            return $this->dosen?->jurusan_id;
        }

        return null;
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    public function getUserPermissions()
    {
        return $this->getAllPermissions()->mapWithKeys(fn($permission) => [$permission['name'] => true]);
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    public function isAdminJurusan(): bool
    {
        return $this->hasRole('admin_jurusan');
    }

    public function isMahasiswa(): bool
    {
        return $this->hasRole('mahasiswa');
    }

    public function isDosen(): bool
    {
        return $this->hasRole('dosen');
    }
}
```

**CATATAN PENTING:** Accessor `getJurusanIdAttribute()` menggunakan eager-loaded relation.
Pastikan semua query yang membutuhkan `jurusan_id` sudah me-load relasi yang diperlukan
(`adminJurusan` untuk admin_jurusan, `dosen` untuk dosen). Accessor ini akan otomatis
bekerja karena Laravel sudah load relasi ketika route berjalan dengan `auth` middleware.

**File 3: `app/Models/Mahasiswa.php`**

Tambahkan `'email'` ke `$fillable`:

```php
protected $fillable = [
    'user_id', 'kelas_id', 'nim', 'nama', 'email',
    'foto_paths', 'face_encodings', 'enrollment_score',
    'status_akun', 'foto_verified_at',
];
```

**File 4: `app/Http/Middleware/HandleInertiaRequests.php`**

Di method `share()`, cari bagian `'auth' => [...]`.

Hapus atau ganti baris yang mengakses `$request->user()->jurusan` (relasi lama)
jika ada. Sekarang `jurusan_id` tersedia melalui accessor, tidak perlu diubah.

Tambahkan `adminJurusan` ke eager-load auth user agar accessor bekerja:

```php
'auth' => [
    'user' => $request->user()?->load([
        'adminJurusan',
        'dosen',
        'mahasiswa',
    ]),
    'roles'       => $request->user() ? $request->user()->getRoleNames() : [],
    'permissions' => $request->user()
        ? $request->user()->getAllPermissions()->map(fn($p) => [
            'id'         => $p->id,
            'name'       => $p->name,
            'guard_name' => $p->guard_name,
            'created_at' => $p->created_at,
            'updated_at' => $p->updated_at,
        ])
        : [],
],
```

Hapus bagian `$request->user()` yang sudah ada (ganti seluruh block `'auth'` dengan yang baru).

---

# ARCH-003 — RoleSeeder Update

**Files yang diubah: 1**

**File: `database/seeders/RoleSeeder.php`**

Ganti SELURUH isi file dengan:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        foreach (config('starterkit.roles') as $role) {
            Role::firstOrCreate(['name' => $role]);
        }

        // super_admin: semua permission
        Role::findByName('super_admin')
            ->syncPermissions(Permission::all());

        // admin_jurusan: semua KECUALI yang di-exclude
        // Tidak bisa: jurusan management, institusi, user/role management, fitur dosen
        Role::findByName('admin_jurusan')
            ->syncPermissions(Permission::whereNotIn('name', [
                // Institusi — hanya super admin
                'institusi index', 'institusi edit',
                // Jurusan — hanya super admin (admin jurusan sudah tahu jurusannya)
                'jurusan index', 'jurusan create', 'jurusan edit', 'jurusan delete',
                // User & Role management — hanya super admin
                'users index', 'users create', 'users edit', 'users delete',
                'roles index', 'roles create', 'roles edit', 'roles delete',
                // Keterangan create — hanya mahasiswa
                'keterangan create',
                // Fitur khusus dosen
                'enrollment_dosen index', 'koreksi_dosen create',
                // Fitur absensi dosen (review oleh admin, bukan dosen itu sendiri)
                // koreksi_dosen approve TETAP BISA untuk admin_jurusan
            ])->get());

        // mahasiswa: hanya akses keterangan sendiri
        Role::findByName('mahasiswa')
            ->syncPermissions(Permission::whereIn('name', [
                'keterangan index',
                'keterangan create',
            ])->get());

        // dosen: enrollment mandiri, lihat absensi diri, submit koreksi
        Role::findByName('dosen')
            ->syncPermissions(Permission::whereIn('name', [
                'enrollment_dosen index',
                'absensi_dosen index',
                'koreksi_dosen create',
            ])->get());
    }
}
```

---

# ARCH-004 — UserSeeder + MasterDataSeeder Rombak Total

**Files yang diubah: 2**

**File 1: `database/seeders/UserSeeder.php`**

Ganti SELURUH isi file dengan:

```php
<?php

namespace Database\Seeders;

use App\Models\AdminJurusan;
use App\Models\Institusi;
use App\Models\Jurusan;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Super Admin ─────────────────────────────────────────────────
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@demo.id'],
            [
                'name'              => 'Super Admin',
                'password'          => 'Password@123',
                'email_verified_at' => now(),
            ]
        );
        $superAdmin->syncRoles('super_admin');

        // ── 2. Institusi & Jurusan dummy (dibutuhkan UserSeeder) ───────────
        $institusi = Institusi::firstOrCreate(
            ['nama' => 'Politeknik Negeri Demo'],
            ['alamat' => 'Jl. Pendidikan No. 1, Palembang']
        );

        $jurusanTI = Jurusan::firstOrCreate(
            ['kode' => 'TI'],
            ['institusi_id' => $institusi->id, 'nama' => 'Teknik Informatika']
        );

        $jurusanTE = Jurusan::firstOrCreate(
            ['kode' => 'TE'],
            ['institusi_id' => $institusi->id, 'nama' => 'Teknik Elektronika']
        );

        // ── 3. Admin Jurusan TI ────────────────────────────────────────────
        $adminTIUser = User::firstOrCreate(
            ['email' => 'admin.ti@demo.id'],
            [
                'name'              => 'Admin Jurusan TI',
                'password'          => 'Password@123',
                'email_verified_at' => now(),
            ]
        );
        $adminTIUser->syncRoles('admin_jurusan');

        AdminJurusan::firstOrCreate(
            ['user_id' => $adminTIUser->id],
            [
                'jurusan_id' => $jurusanTI->id,
                'nama'       => 'Admin Jurusan TI',
                'email'      => 'admin.ti@demo.id',
                'no_hp'      => '081234567890',
            ]
        );

        // ── 4. Admin Jurusan TE ────────────────────────────────────────────
        $adminTEUser = User::firstOrCreate(
            ['email' => 'admin.te@demo.id'],
            [
                'name'              => 'Admin Jurusan TE',
                'password'          => 'Password@123',
                'email_verified_at' => now(),
            ]
        );
        $adminTEUser->syncRoles('admin_jurusan');

        AdminJurusan::firstOrCreate(
            ['user_id' => $adminTEUser->id],
            [
                'jurusan_id' => $jurusanTE->id,
                'nama'       => 'Admin Jurusan TE',
                'email'      => 'admin.te@demo.id',
                'no_hp'      => '081234567891',
            ]
        );

        $this->command->info('✅ UserSeeder selesai:');
        $this->command->info('   superadmin@demo.id / Password@123  → Super Admin');
        $this->command->info('   admin.ti@demo.id / Password@123   → Admin Jurusan TI');
        $this->command->info('   admin.te@demo.id / Password@123   → Admin Jurusan TE');
    }
}
```

**File 2: `database/seeders/MasterDataSeeder.php`**

Ganti SELURUH isi file dengan:

```php
<?php

namespace Database\Seeders;

use App\Models\Dosen;
use App\Models\Institusi;
use App\Models\Jadwal;
use App\Models\Jurusan;
use App\Models\Kelas;
use App\Models\Mahasiswa;
use App\Models\Prodi;
use App\Models\Ruangan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. INSTITUSI ──────────────────────────────────────────────────
        $institusi = Institusi::firstOrCreate(
            ['nama' => 'Politeknik Negeri Demo'],
            ['alamat' => 'Jl. Pendidikan No. 1, Palembang']
        );

        // ── 2. JURUSAN ────────────────────────────────────────────────────
        $jurusanTI = Jurusan::firstOrCreate(
            ['kode' => 'TI'],
            ['institusi_id' => $institusi->id, 'nama' => 'Teknik Informatika']
        );
        $jurusanTE = Jurusan::firstOrCreate(
            ['kode' => 'TE'],
            ['institusi_id' => $institusi->id, 'nama' => 'Teknik Elektronika']
        );

        // ── 3. PRODI ──────────────────────────────────────────────────────
        $prodiD3TI  = Prodi::firstOrCreate(['kode' => 'D3-TI'],  ['jurusan_id' => $jurusanTI->id, 'nama' => 'D3 Teknik Informatika']);
        $prodiD4RPL = Prodi::firstOrCreate(['kode' => 'D4-RPL'], ['jurusan_id' => $jurusanTI->id, 'nama' => 'D4 Rekayasa Perangkat Lunak']);
        $prodiD3TE  = Prodi::firstOrCreate(['kode' => 'D3-TE'],  ['jurusan_id' => $jurusanTE->id, 'nama' => 'D3 Teknik Elektronika']);

        // ── 4. RUANGAN ────────────────────────────────────────────────────
        $ruanganLK1 = Ruangan::firstOrCreate(['kode' => 'LK1'], ['jurusan_id' => $jurusanTI->id, 'nama' => 'Lab Komputer 1',    'kapasitas' => 30]);
        $ruanganLK2 = Ruangan::firstOrCreate(['kode' => 'LK2'], ['jurusan_id' => $jurusanTI->id, 'nama' => 'Lab Komputer 2',    'kapasitas' => 30]);
        $ruanganGD1 = Ruangan::firstOrCreate(['kode' => 'GD1'], ['jurusan_id' => $jurusanTI->id, 'nama' => 'Gedung A Ruang 101','kapasitas' => 40]);
        $ruanganLE1 = Ruangan::firstOrCreate(['kode' => 'LE1'], ['jurusan_id' => $jurusanTE->id, 'nama' => 'Lab Elektronika 1', 'kapasitas' => 25]);

        // ── 5. KELAS ──────────────────────────────────────────────────────
        $kelas1ATI  = Kelas::firstOrCreate(['nama' => '1A', 'prodi_id' => $prodiD3TI->id],  ['angkatan' => 2024]);
        $kelas2ATI  = Kelas::firstOrCreate(['nama' => '2A', 'prodi_id' => $prodiD3TI->id],  ['angkatan' => 2023]);
        $kelas1BRPL = Kelas::firstOrCreate(['nama' => '1B', 'prodi_id' => $prodiD4RPL->id], ['angkatan' => 2024]);
        $kelas1ATE  = Kelas::firstOrCreate(['nama' => '1A', 'prodi_id' => $prodiD3TE->id],  ['angkatan' => 2024]);

        // ── 6. DOSEN TI ───────────────────────────────────────────────────
        $dosenTIData = [
            ['nip' => '197801012005011001', 'nama' => 'Dr. Budi Santoso, M.T.',      'email' => 'budi.santoso@demo.id'],
            ['nip' => '198202152008012002', 'nama' => 'Siti Rahayu, S.Kom., M.Cs.', 'email' => 'siti.rahayu@demo.id'],
            ['nip' => '197605202003011003', 'nama' => 'Agus Prasetyo, M.Kom.',       'email' => 'agus.prasetyo@demo.id'],
            ['nip' => '198509102010012004', 'nama' => 'Dewi Lestari, S.T., M.T.',   'email' => 'dewi.lestari@demo.id'],
            ['nip' => '197303081999031005', 'nama' => 'Hendra Wijaya, M.Sc.',        'email' => 'hendra.wijaya@demo.id'],
        ];

        $dosensTI = [];
        foreach ($dosenTIData as $d) {
            // Cek apakah sudah ada user untuk dosen ini
            $existingDosen = Dosen::where('nip', $d['nip'])->first();

            if ($existingDosen && $existingDosen->user_id) {
                $dosensTI[] = $existingDosen;
                continue;
            }

            DB::transaction(function () use ($d, $jurusanTI, &$dosensTI) {
                $user = User::firstOrCreate(
                    ['email' => $d['email']],
                    [
                        'name'              => $d['nama'],
                        'password'          => Hash::make('Password@123'),
                        'email_verified_at' => now(),
                    ]
                );
                $user->syncRoles('dosen');

                $dosen = Dosen::firstOrCreate(
                    ['nip' => $d['nip']],
                    [
                        'user_id'    => $user->id,
                        'jurusan_id' => $jurusanTI->id,
                        'nama'       => $d['nama'],
                        'email'      => $d['email'],
                    ]
                );

                if (!$dosen->user_id) {
                    $dosen->update(['user_id' => $user->id]);
                }

                $dosensTI[] = $dosen;
            });
        }

        // ── 7. DOSEN TE ───────────────────────────────────────────────────
        $dosenTEData = [
            ['nip' => '197201012001011001', 'nama' => 'Prof. Ahmad Fauzan, M.T.', 'email' => 'ahmad.fauzan@demo.id'],
            ['nip' => '198005102006012002', 'nama' => 'Rina Susanti, M.Eng.',     'email' => 'rina.susanti@demo.id'],
        ];

        $dosenTE = [];
        foreach ($dosenTEData as $d) {
            $existingDosen = Dosen::where('nip', $d['nip'])->first();
            if ($existingDosen && $existingDosen->user_id) {
                $dosenTE[] = $existingDosen;
                continue;
            }

            DB::transaction(function () use ($d, $jurusanTE, &$dosenTE) {
                $user = User::firstOrCreate(
                    ['email' => $d['email']],
                    [
                        'name'              => $d['nama'],
                        'password'          => Hash::make('Password@123'),
                        'email_verified_at' => now(),
                    ]
                );
                $user->syncRoles('dosen');

                $dosen = Dosen::firstOrCreate(
                    ['nip' => $d['nip']],
                    [
                        'user_id'    => $user->id,
                        'jurusan_id' => $jurusanTE->id,
                        'nama'       => $d['nama'],
                        'email'      => $d['email'],
                    ]
                );

                if (!$dosen->user_id) {
                    $dosen->update(['user_id' => $user->id]);
                }

                $dosenTE[] = $dosen;
            });
        }

        // ── 8. MAHASISWA 1A TI (10 mhs) ──────────────────────────────────
        $this->seedMahasiswa($kelas1ATI->id, [
            ['nim' => '2410001', 'nama' => 'Ahmad Fauzi',         'email' => 'ahmad.fauzi@mhs.demo.id'],
            ['nim' => '2410002', 'nama' => 'Bunga Citra Lestari', 'email' => 'bunga.citra@mhs.demo.id'],
            ['nim' => '2410003', 'nama' => 'Cahya Nugraha',       'email' => 'cahya.nugraha@mhs.demo.id'],
            ['nim' => '2410004', 'nama' => 'Dina Permatasari',    'email' => 'dina.permatasari@mhs.demo.id'],
            ['nim' => '2410005', 'nama' => 'Eko Setiawan',        'email' => 'eko.setiawan@mhs.demo.id'],
            ['nim' => '2410006', 'nama' => 'Fitri Handayani',     'email' => 'fitri.handayani@mhs.demo.id'],
            ['nim' => '2410007', 'nama' => 'Galih Pratama',       'email' => 'galih.pratama@mhs.demo.id'],
            ['nim' => '2410008', 'nama' => 'Hani Kusuma',         'email' => 'hani.kusuma@mhs.demo.id'],
            ['nim' => '2410009', 'nama' => 'Irfan Maulana',       'email' => 'irfan.maulana@mhs.demo.id'],
            ['nim' => '2410010', 'nama' => 'Juwita Sari',         'email' => 'juwita.sari@mhs.demo.id'],
        ], demoEmail: 'mahasiswa@demo.id', demoNim: '2410001');

        // ── 9. MAHASISWA 2A TI (8 mhs) ───────────────────────────────────
        $this->seedMahasiswa($kelas2ATI->id, [
            ['nim' => '2310001', 'nama' => 'Aldi Kurniawan',   'email' => 'aldi.kurniawan@mhs.demo.id'],
            ['nim' => '2310002', 'nama' => 'Bella Safitri',    'email' => 'bella.safitri@mhs.demo.id'],
            ['nim' => '2310003', 'nama' => 'Chandra Putra',    'email' => 'chandra.putra@mhs.demo.id'],
            ['nim' => '2310004', 'nama' => 'Devi Anggraini',   'email' => 'devi.anggraini@mhs.demo.id'],
            ['nim' => '2310005', 'nama' => 'Evan Perdana',     'email' => 'evan.perdana@mhs.demo.id'],
            ['nim' => '2310006', 'nama' => 'Fanny Oktavia',    'email' => 'fanny.oktavia@mhs.demo.id'],
            ['nim' => '2310007', 'nama' => 'Gilang Ramadhan',  'email' => 'gilang.ramadhan@mhs.demo.id'],
            ['nim' => '2310008', 'nama' => 'Hesti Wulandari',  'email' => 'hesti.wulandari@mhs.demo.id'],
        ]);

        // ── 10. MAHASISWA 1B RPL (6 mhs) ─────────────────────────────────
        $this->seedMahasiswa($kelas1BRPL->id, [
            ['nim' => '2420001', 'nama' => 'Anisa Putri',      'email' => 'anisa.putri@mhs.demo.id'],
            ['nim' => '2420002', 'nama' => 'Bagas Wicaksono',  'email' => 'bagas.wicaksono@mhs.demo.id'],
            ['nim' => '2420003', 'nama' => 'Cika Amelia',      'email' => 'cika.amelia@mhs.demo.id'],
            ['nim' => '2420004', 'nama' => 'Dimas Arfan',      'email' => 'dimas.arfan@mhs.demo.id'],
            ['nim' => '2420005', 'nama' => 'Elsa Maharani',    'email' => 'elsa.maharani@mhs.demo.id'],
            ['nim' => '2420006', 'nama' => 'Fajar Nugroho',    'email' => 'fajar.nugroho@mhs.demo.id'],
        ]);

        // ── 11. MAHASISWA 1A TE (5 mhs) ──────────────────────────────────
        $this->seedMahasiswa($kelas1ATE->id, [
            ['nim' => '2430001', 'nama' => 'Gita Safira',      'email' => 'gita.safira@mhs.demo.id'],
            ['nim' => '2430002', 'nama' => 'Hanif Pratama',    'email' => 'hanif.pratama@mhs.demo.id'],
            ['nim' => '2430003', 'nama' => 'Indira Sari',      'email' => 'indira.sari@mhs.demo.id'],
            ['nim' => '2430004', 'nama' => 'Jaka Santoso',     'email' => 'jaka.santoso@mhs.demo.id'],
            ['nim' => '2430005', 'nama' => 'Kirana Dewi',      'email' => 'kirana.dewi@mhs.demo.id'],
        ]);

        // ── 12. JADWAL TI ─────────────────────────────────────────────────
        $jadwalTI = [
            // 1A TI
            [$kelas1ATI, $dosensTI[0], $ruanganLK1, 'Pemrograman Web',     'senin',  '08:00', '10:30', 15, 30],
            [$kelas1ATI, $dosensTI[1], $ruanganGD1, 'Basis Data',          'selasa', '10:00', '12:30', 15, 30],
            [$kelas1ATI, $dosensTI[2], $ruanganLK2, 'Jaringan Komputer',   'rabu',   '07:30', '10:00', 15, 30],
            [$kelas1ATI, $dosensTI[3], $ruanganGD1, 'Sistem Operasi',      'kamis',  '13:00', '15:30', 15, 30],
            // 2A TI
            [$kelas2ATI, $dosensTI[0], $ruanganLK1, 'Pemrograman Mobile',  'senin',  '13:00', '15:30', 15, 30],
            [$kelas2ATI, $dosensTI[4], $ruanganLK2, 'Kecerdasan Buatan',   'rabu',   '10:00', '12:30', 15, 30],
            [$kelas2ATI, $dosensTI[2], $ruanganGD1, 'Keamanan Sistem',     'jumat',  '08:00', '10:30', 15, 30],
            // 1B RPL
            [$kelas1BRPL, $dosensTI[1], $ruanganLK2, 'Rekayasa Perangkat Lunak', 'selasa', '13:00', '15:30', 15, 30],
            [$kelas1BRPL, $dosensTI[3], $ruanganGD1, 'Manajemen Proyek IT',      'kamis',  '08:00', '10:30', 15, 30],
        ];

        foreach ($jadwalTI as [$kelas, $dosen, $ruangan, $matkul, $hari, $mulai, $selesai, $wMhs, $wDosen]) {
            Jadwal::firstOrCreate(
                ['kelas_id' => $kelas->id, 'dosen_id' => $dosen->id, 'mata_kuliah' => $matkul],
                [
                    'ruangan_id'         => $ruangan->id,
                    'hari'               => $hari,
                    'jam_mulai'          => $mulai,
                    'jam_selesai'        => $selesai,
                    'window_menit'       => $wMhs,
                    'window_dosen_menit' => $wDosen,
                    'is_active'          => true,
                ]
            );
        }

        // ── 13. JADWAL TE ─────────────────────────────────────────────────
        $jadwalTE = [
            [$kelas1ATE, $dosenTE[0], $ruanganLE1, 'Teknik Digital',       'senin',  '08:00', '10:30', 15, 30],
            [$kelas1ATE, $dosenTE[1], $ruanganLE1, 'Elektronika Analog',   'rabu',   '10:00', '12:30', 15, 30],
        ];

        foreach ($jadwalTE as [$kelas, $dosen, $ruangan, $matkul, $hari, $mulai, $selesai, $wMhs, $wDosen]) {
            Jadwal::firstOrCreate(
                ['kelas_id' => $kelas->id, 'dosen_id' => $dosen->id, 'mata_kuliah' => $matkul],
                [
                    'ruangan_id'         => $ruangan->id,
                    'hari'               => $hari,
                    'jam_mulai'          => $mulai,
                    'jam_selesai'        => $selesai,
                    'window_menit'       => $wMhs,
                    'window_dosen_menit' => $wDosen,
                    'is_active'          => true,
                ]
            );
        }

        $this->command->info('✅ Master data berhasil di-seed:');
        $this->command->info('   Jurusan TI: ' . Mahasiswa::whereHas('kelas.prodi', fn($q) => $q->where('jurusan_id', $jurusanTI->id))->count() . ' mahasiswa, ' . Dosen::where('jurusan_id', $jurusanTI->id)->count() . ' dosen');
        $this->command->info('   Jurusan TE: ' . Mahasiswa::whereHas('kelas.prodi', fn($q) => $q->where('jurusan_id', $jurusanTE->id))->count() . ' mahasiswa, ' . Dosen::where('jurusan_id', $jurusanTE->id)->count() . ' dosen');
        $this->command->info('   Total jadwal: ' . Jadwal::count());
        $this->command->info('');
        $this->command->info('   Login accounts:');
        $this->command->info('   superadmin@demo.id   → Super Admin');
        $this->command->info('   admin.ti@demo.id     → Admin Jurusan TI (hanya lihat data TI)');
        $this->command->info('   admin.te@demo.id     → Admin Jurusan TE (hanya lihat data TE)');
        $this->command->info('   mahasiswa@demo.id    → Mahasiswa (Ahmad Fauzi, 1A TI)');
        $this->command->info('   budi.santoso@demo.id → Dosen TI (Dr. Budi Santoso)');
        $this->command->info('   Semua password: Password@123');
    }

    private function seedMahasiswa(
        int $kelasId,
        array $list,
        ?string $demoEmail = null,
        ?string $demoNim   = null
    ): void {
        foreach ($list as $m) {
            if (Mahasiswa::where('nim', $m['nim'])->exists()) continue;

            // Jika ini mahasiswa demo, pakai email demo agar bisa login dengan mahasiswa@demo.id
            $emailToUse = ($demoNim && $m['nim'] === $demoNim && $demoEmail)
                ? $demoEmail
                : $m['email'];

            DB::transaction(function () use ($m, $kelasId, $emailToUse) {
                $user = User::firstOrCreate(
                    ['email' => $emailToUse],
                    [
                        'name'              => $m['nama'],
                        'password'          => Hash::make('Password@123'),
                        'email_verified_at' => now(),
                    ]
                );
                $user->syncRoles('mahasiswa');

                Mahasiswa::create([
                    'user_id'     => $user->id,
                    'kelas_id'    => $kelasId,
                    'nim'         => $m['nim'],
                    'nama'        => $m['nama'],
                    'email'       => $emailToUse,
                    'status_akun' => 'pending_upload',
                ]);
            });
        }
    }
}
```

**Jalankan setelah selesai:**
```bash
php artisan migrate:fresh --seed
```

---

# ARCH-005 — DosenService: Auto-Create User

**Files yang diubah: 2**

**File 1: `app/Services/DosenService.php`**

Ganti SELURUH isi file dengan:

```php
<?php

namespace App\Services;

use App\Models\Dosen;
use App\Models\Jurusan;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DosenService
{
    public function index(?string $search, ?int $jurusanId, bool $isSuperAdmin): LengthAwarePaginator
    {
        return Dosen::query()
            ->with(['jurusan', 'user'])
            ->withCount('enrollmentVerifikasi')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('jurusan_id', $jurusanId))
            ->when($search, fn($q) => $q->where(fn($q2) =>
                $q2->where('nama', 'like', "%{$search}%")
                   ->orWhere('nip', 'like', "%{$search}%")
            ))
            ->latest()
            ->paginate(config('starterkit.pagination'))
            ->withQueryString();
    }

    public function getJurusanOptions(?int $jurusanId, bool $isSuperAdmin): Collection
    {
        return Jurusan::query()
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('id', $jurusanId))
            ->orderBy('nama')
            ->get(['id', 'nama']);
    }

    public function store(array $data): Dosen
    {
        return DB::transaction(function () use ($data) {
            // Buat user account untuk dosen
            $user = User::create([
                'name'              => $data['nama'],
                'email'             => $data['email'],
                'password'          => Hash::make('Password@123'),
                'email_verified_at' => now(),
            ]);
            $user->syncRoles('dosen');

            return Dosen::create([
                'user_id'    => $user->id,
                'jurusan_id' => $data['jurusan_id'],
                'nip'        => $data['nip'],
                'nama'       => $data['nama'],
                'email'      => $data['email'],
            ]);
        });
    }

    public function update(Dosen $dosen, array $data): Dosen
    {
        DB::transaction(function () use ($dosen, $data) {
            $dosen->update([
                'jurusan_id' => $data['jurusan_id'],
                'nip'        => $data['nip'],
                'nama'       => $data['nama'],
                'email'      => $data['email'],
            ]);

            // Sync ke user account
            if ($dosen->user) {
                $dosen->user->update([
                    'name'  => $data['nama'],
                    'email' => $data['email'],
                ]);
            }
        });

        return $dosen->fresh();
    }

    public function destroy(Dosen $dosen): void
    {
        DB::transaction(function () use ($dosen) {
            $userId = $dosen->user_id;
            $dosen->delete();
            if ($userId) {
                User::destroy($userId);
            }
        });
    }
}
```

**File 2: `app/Http/Requests/StoreDosenRequest.php`**

Tambahkan validasi unique ke users.email juga:

```php
public function rules(): array
{
    return [
        'jurusan_id' => ['required', 'exists:jurusan,id'],
        'nip'        => ['required', 'string', 'max:50', 'unique:dosen,nip'],
        'nama'       => ['required', 'string', 'max:255'],
        'email'      => [
            'required', 'email', 'max:255',
            'unique:dosen,email',
            'unique:users,email',   // Tambah ini
        ],
    ];
}
```

---

# ARCH-006 — MahasiswaService + Requests Update

**Files yang diubah: 3**

**File 1: `app/Services/MahasiswaService.php`**

Ganti method `store()` dan `update()` saja (tidak ubah yang lain):

```php
public function store(array $data): Mahasiswa
{
    return DB::transaction(function () use ($data) {
        $user = User::create([
            'name'              => $data['nama'],
            'email'             => $data['email'],
            'password'          => Hash::make('Password@123'),
            'email_verified_at' => now(),
        ]);
        $user->syncRoles('mahasiswa');

        return Mahasiswa::create([
            'user_id'     => $user->id,
            'kelas_id'    => $data['kelas_id'],
            'nim'         => $data['nim'],
            'nama'        => $data['nama'],
            'email'       => $data['email'],
            'status_akun' => 'pending_upload',
        ]);
    });
}

public function update(Mahasiswa $mahasiswa, array $data): Mahasiswa
{
    DB::transaction(function () use ($mahasiswa, $data) {
        $mahasiswa->update([
            'kelas_id' => $data['kelas_id'],
            'nim'      => $data['nim'],
            'nama'     => $data['nama'],
            'email'    => $data['email'],
        ]);

        if ($mahasiswa->user) {
            $mahasiswa->user->update([
                'name'  => $data['nama'],
                'email' => $data['email'],
            ]);
        }
    });

    return $mahasiswa->fresh();
}
```

**File 2: `app/Http/Requests/StoreMahasiswaRequest.php`**

```php
public function rules(): array
{
    return [
        'kelas_id' => ['required', 'exists:kelas,id'],
        'nim'      => ['required', 'string', 'max:50', 'unique:mahasiswa,nim'],
        'nama'     => ['required', 'string', 'max:255'],
        'email'    => [
            'required', 'email', 'max:255',
            'unique:mahasiswa,email',
            'unique:users,email',
        ],
    ];
}
```

**File 3: `app/Http/Requests/UpdateMahasiswaRequest.php`**

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMahasiswaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $mahasiswaId = $this->route('mahasiswa')?->id;

        return [
            'kelas_id' => ['required', 'exists:kelas,id'],
            'nim'      => ['required', 'string', 'max:50',
                Rule::unique('mahasiswa', 'nim')->ignore($mahasiswaId)],
            'nama'     => ['required', 'string', 'max:255'],
            'email'    => [
                'required', 'email', 'max:255',
                Rule::unique('mahasiswa', 'email')->ignore($mahasiswaId),
                Rule::unique('users', 'email')->ignore(
                    $this->route('mahasiswa')?->user_id
                ),
            ],
        ];
    }
}
```

---

# ARCH-007 — AdminJurusanController + Routes

**Files yang diubah: 2**

**File 1: BUAT `app/Http/Controllers/AdminJurusanController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\AdminJurusan;
use App\Models\Jurusan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminJurusanController extends Controller
{
    // Hanya super_admin yang bisa akses ini
    public function __construct()
    {
        $this->middleware('permission:users index')->only('index');
        $this->middleware('permission:users create')->only('store');
        $this->middleware('permission:users edit')->only('update');
        $this->middleware('permission:users delete')->only('destroy');
    }

    public function index()
    {
        $adminList = AdminJurusan::with(['user', 'jurusan'])
            ->orderBy('nama')
            ->paginate(config('starterkit.pagination'));

        $jurusanList = Jurusan::orderBy('nama')->get(['id', 'nama']);

        return inertia('admin-jurusan/index', [
            'admin_list'  => $adminList,
            'jurusan'     => $jurusanList,
            'flash'       => ['success' => session('success')],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama'       => ['required', 'string', 'max:255'],
            'email'      => ['required', 'email', 'max:255', 'unique:users,email', 'unique:admin_jurusan,email'],
            'no_hp'      => ['nullable', 'string', 'max:20'],
            'jurusan_id' => ['required', 'exists:jurusan,id'],
        ]);

        DB::transaction(function () use ($request) {
            $user = User::create([
                'name'              => $request->nama,
                'email'             => $request->email,
                'password'          => Hash::make('Password@123'),
                'email_verified_at' => now(),
            ]);
            $user->syncRoles('admin_jurusan');

            AdminJurusan::create([
                'user_id'    => $user->id,
                'jurusan_id' => $request->jurusan_id,
                'nama'       => $request->nama,
                'email'      => $request->email,
                'no_hp'      => $request->no_hp,
            ]);
        });

        return back()->with('success',
            "Admin jurusan berhasil dibuat. Login: {$request->email} / Password@123"
        );
    }

    public function update(Request $request, AdminJurusan $adminJurusan)
    {
        $request->validate([
            'nama'       => ['required', 'string', 'max:255'],
            'email'      => [
                'required', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($adminJurusan->user_id),
                Rule::unique('admin_jurusan', 'email')->ignore($adminJurusan->id),
            ],
            'no_hp'      => ['nullable', 'string', 'max:20'],
            'jurusan_id' => ['required', 'exists:jurusan,id'],
        ]);

        DB::transaction(function () use ($request, $adminJurusan) {
            $adminJurusan->update([
                'nama'       => $request->nama,
                'email'      => $request->email,
                'no_hp'      => $request->no_hp,
                'jurusan_id' => $request->jurusan_id,
            ]);

            if ($adminJurusan->user) {
                $adminJurusan->user->update([
                    'name'  => $request->nama,
                    'email' => $request->email,
                ]);
            }
        });

        return back()->with('success', 'Data admin jurusan berhasil diperbarui.');
    }

    public function destroy(AdminJurusan $adminJurusan)
    {
        DB::transaction(function () use ($adminJurusan) {
            $userId = $adminJurusan->user_id;
            $adminJurusan->delete();
            if ($userId) User::destroy($userId);
        });

        return back()->with('success', 'Admin jurusan berhasil dihapus.');
    }
}
```

**File 2: `routes/web.php`**

Tambahkan route group baru untuk admin_jurusan (akses oleh super_admin):

```php
// Admin Jurusan Management (hanya super_admin via permission users index/create/etc)
Route::resource('admin-jurusan', AdminJurusanController::class)
    ->only(['index', 'store', 'update', 'destroy'])
    ->middleware('auth');
```

Tambahkan import di atas file:
```php
use App\Http\Controllers\AdminJurusanController;
```

---

# ARCH-008 — Halaman Admin Jurusan (Frontend)

**Files yang diubah: 1 (FILE BARU)**

**File baru: `resources/js/pages/admin-jurusan/index.tsx`**

Halaman CRUD untuk admin jurusan — hanya super admin yang bisa lihat.
Pattern sama dengan halaman dosen/mahasiswa yang sudah ada.

```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Jurusan } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AdminJurusanRecord {
    id: number;
    nama: string;
    email: string;
    no_hp: string | null;
    jurusan_id: number;
    jurusan?: { id: number; nama: string };
    user?: { email: string };
}

interface Props {
    admin_list: { data: AdminJurusanRecord[]; links: any[] };
    jurusan: Jurusan[];
    flash?: { success?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Admin Jurusan', href: '/admin-jurusan' }];

const emptyForm = { nama: '', email: '', no_hp: '', jurusan_id: '' };

export default function AdminJurusanPage({ admin_list, jurusan, flash }: Props) {
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editTarget, setEditTarget] = useState<AdminJurusanRecord | null>(null);
    const [shown] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shown.has(flash.success)) {
            toast.success(flash.success);
            shown.add(flash.success);
        }
    }, [flash?.success]);

    const createForm = useForm({ ...emptyForm });
    const editForm   = useForm({ ...emptyForm, _method: 'PUT' });

    function openEditDialog(item: AdminJurusanRecord) {
        setEditTarget(item);
        editForm.setData({
            nama: item.nama,
            email: item.email,
            no_hp: item.no_hp ?? '',
            jurusan_id: String(item.jurusan_id),
            _method: 'PUT',
        });
        setOpenEdit(true);
    }

    function FormFields({ form }: { form: any }) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label>Nama Lengkap</Label>
                        <Input value={form.data.nama}
                            onChange={e => form.setData('nama', e.target.value)} />
                        {form.errors.nama && <p className="text-xs text-red-500">{form.errors.nama}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Jurusan</Label>
                        <Select value={form.data.jurusan_id}
                            onValueChange={v => form.setData('jurusan_id', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih jurusan..." />
                            </SelectTrigger>
                            <SelectContent>
                                {jurusan.map(j => (
                                    <SelectItem key={j.id} value={String(j.id)}>{j.nama}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {form.errors.jurusan_id && <p className="text-xs text-red-500">{form.errors.jurusan_id}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Email (login)</Label>
                        <Input type="email" value={form.data.email}
                            onChange={e => form.setData('email', e.target.value)} />
                        {form.errors.email && <p className="text-xs text-red-500">{form.errors.email}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>No. HP</Label>
                        <Input value={form.data.no_hp}
                            onChange={e => form.setData('no_hp', e.target.value)} />
                        {form.errors.no_hp && <p className="text-xs text-red-500">{form.errors.no_hp}</p>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Jurusan" />
            <div className="p-6 space-y-5">

                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Admin Jurusan</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Kelola akun admin per jurusan — dibuat, akun login otomatis terbuat
                        </p>
                    </div>
                    <Button onClick={() => { createForm.reset(); setOpenCreate(true); }}>
                        <PlusCircle className="size-4 mr-2" /> Tambah Admin Jurusan
                    </Button>
                </div>

                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>Nama</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>No. HP</TableHead>
                                <TableHead>Jurusan</TableHead>
                                <TableHead className="w-24">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {admin_list.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-16">
                                        Belum ada admin jurusan.
                                    </TableCell>
                                </TableRow>
                            ) : admin_list.data.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.nama}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.email}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {item.no_hp ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                            {item.jurusan?.nama ?? '-'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="outline"
                                                onClick={() => openEditDialog(item)}>
                                                <Pencil className="size-3.5" />
                                            </Button>
                                            <ConfirmDialog
                                                title="Hapus Admin Jurusan?"
                                                description={`Akun ${item.nama} dan akses loginnya akan dihapus permanen.`}
                                                confirmLabel="Ya, Hapus"
                                                onConfirm={() => router.delete(`/admin-jurusan/${item.id}`)}
                                                trigger={
                                                    <Button size="sm" variant="outline"
                                                        className="hover:bg-red-50 hover:text-red-600">
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex gap-1">
                    {admin_list.links.map((link: any, i: number) => (
                        <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm"
                            disabled={!link.url}
                            onClick={() => link.url && router.get(link.url)}
                            dangerouslySetInnerHTML={{ __html: link.label }} />
                    ))}
                </div>

                {/* Dialog Create */}
                <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Tambah Admin Jurusan</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={e => {
                            e.preventDefault();
                            createForm.post('/admin-jurusan', {
                                onSuccess: () => { setOpenCreate(false); createForm.reset(); }
                            });
                        }} className="space-y-4">
                            <FormFields form={createForm} />
                            <p className="text-xs text-muted-foreground">
                                Password default: <code className="bg-muted px-1 rounded">Password@123</code>
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={createForm.processing}>
                                    Simpan
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog Edit */}
                <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Admin Jurusan</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={e => {
                            e.preventDefault();
                            if (!editTarget) return;
                            editForm.post(`/admin-jurusan/${editTarget.id}`, {
                                onSuccess: () => setOpenEdit(false)
                            });
                        }} className="space-y-4">
                            <FormFields form={editForm} />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={editForm.processing}>
                                    Simpan
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

            </div>
        </AppLayout>
    );
}
```

**Tambahkan juga ke sidebar `app-sidebar.tsx`:**

Di `userManagement` array, tambahkan:

```tsx
{
    title: 'Admin Jurusan',
    href: '/admin-jurusan',
    icon: ShieldCheck,
    permissions: ['users index'],
},
```

Tambahkan `ShieldCheck` ke import lucide-react jika belum ada.

---

# CRUD-001 — Halaman Dosen: Kolom Status Enrollment + Filter Jurusan (Aktif)

**Files yang diubah: 1**

**File: `resources/js/pages/dosen/index.tsx`**

**a)** Tambahkan interface `status_enrollment` ke tipe dosen:
```tsx
interface DosenItem {
    id: number; nip: string; nama: string; email: string;
    jurusan_id: number; jurusan?: { nama: string };
    status_enrollment: 'pending_upload' | 'pending_verifikasi' | 'aktif';
}
```

**b)** Tambahkan `TableHead` baru:
```tsx
<TableHead>Status Enrollment</TableHead>
```
Letakkan setelah kolom Jurusan, sebelum kolom Aksi.

**c)** Tambahkan `TableCell` yang sesuai di setiap baris:
```tsx
<TableCell>
    <Badge variant="outline" className={
        item.status_enrollment === 'aktif'
            ? 'bg-green-50 text-green-700 border-green-200 text-xs'
            : item.status_enrollment === 'pending_verifikasi'
            ? 'bg-blue-50 text-blue-700 border-blue-200 text-xs'
            : 'bg-gray-50 text-gray-600 border-gray-200 text-xs'
    }>
        {item.status_enrollment === 'aktif' ? 'Aktif'
            : item.status_enrollment === 'pending_verifikasi' ? 'Verifikasi'
            : 'Belum Upload'}
    </Badge>
</TableCell>
```

**d)** Di `DosenService.index()` (sudah diupdate di ARCH-005), `status_enrollment` sudah tersedia karena model `Dosen` punya kolom tersebut.

Tidak ada perubahan backend — `status_enrollment` sudah di-select dari DB.

---

# CRUD-002 — Halaman Kelas: Button Mahasiswa + Filter Tahun

**Files yang diubah: 2**

**File 1: `app/Http/Controllers/KelasController.php`**

Update method `index()` — tambahkan filter angkatan dan query mahasiswa per kelas:

```php
public function index(Request $request)
{
    $user = $request->user();

    $kelas = $this->kelasService->index(
        $request->search,
        $request->angkatan,       // TAMBAH parameter ini
        $user->jurusan_id,
        $user->isSuperAdmin()
    );

    return inertia('kelas/index', [
        'kelas'   => $kelas,
        'prodi'   => $this->kelasService->getProdiOptions($user->jurusan_id, $user->isSuperAdmin()),
        'filters' => $request->only('search', 'angkatan'),   // TAMBAH angkatan
        'flash'   => ['success' => session('success')],
    ]);
}
```

**File 2: `app/Services/KelasService.php`**

Tambahkan parameter `?string $angkatan` ke method `index()` dan filter-nya:

```php
public function index(?string $search, ?string $angkatan, ?int $jurusanId, bool $isSuperAdmin): LengthAwarePaginator
{
    return Kelas::query()
        ->with(['prodi.jurusan'])
        ->withCount('mahasiswa')              // TAMBAH untuk count mahasiswa
        ->when(!$isSuperAdmin && $jurusanId, fn($q) =>
            $q->whereHas('prodi', fn($q2) => $q2->where('jurusan_id', $jurusanId))
        )
        ->when($search, fn($q) => $q->where('nama', 'like', "%{$search}%"))
        ->when($angkatan, fn($q) => $q->where('angkatan', $angkatan))  // TAMBAH
        ->latest()
        ->paginate(config('starterkit.pagination'))
        ->withQueryString();
}
```

**Update `resources/js/pages/kelas/index.tsx`:**

**a)** Tambahkan `mahasiswa_count` ke interface kelas.

**b)** Tambahkan filter angkatan di filter bar:
```tsx
{/* Filter Angkatan */}
<Select value={filters.angkatan ?? ''}
    onValueChange={val => {
        const p = val && val !== 'all' ? { angkatan: val } : {};
        router.get('/kelas', { ...filters, ...p }, { preserveState: true });
    }}>
    <SelectTrigger className="w-40">
        <SelectValue placeholder="Semua Angkatan" />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="all">Semua Angkatan</SelectItem>
        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
        ))}
    </SelectContent>
</Select>
```

**c)** Tambahkan kolom "Mahasiswa" dan tombol "Lihat Mahasiswa" di tabel:
```tsx
<TableHead className="text-center">Mahasiswa</TableHead>
// ...
<TableCell className="text-center">
    <Button size="sm" variant="outline"
        onClick={() => router.get(`/kelas/${item.id}/mahasiswa`)}>
        <Users className="size-3.5 mr-1" />
        {item.mahasiswa_count}
    </Button>
</TableCell>
```

**d)** Tambahkan route baru di `routes/web.php`:
```php
Route::get('kelas/{kelas}/mahasiswa', [KelasController::class, 'mahasiswaList'])
    ->name('kelas.mahasiswa')
    ->middleware('permission:kelas index');
```

**e)** Tambahkan method `mahasiswaList()` di `KelasController`:
```php
public function mahasiswaList(Kelas $kelas)
{
    $kelas->load(['prodi.jurusan', 'mahasiswa' => fn($q) => $q->orderBy('nama')]);

    return inertia('kelas/mahasiswa-list', [
        'kelas'      => $kelas,
        'mahasiswa'  => $kelas->mahasiswa,
    ]);
}
```

**f)** Buat halaman baru `resources/js/pages/kelas/mahasiswa-list.tsx`:

Halaman sederhana: breadcrumb (Kelas → {nama kelas} → Mahasiswa), tabel dengan kolom
NIM, Nama, Status Enrollment, Email, dan tombol back ke halaman kelas.

```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface MhsRow {
    id: number; nim: string; nama: string; email: string | null;
    status_akun: 'pending_upload' | 'pending_verifikasi' | 'aktif';
}
interface KelasInfo {
    id: number; nama: string; angkatan: number;
    prodi?: { nama: string; jurusan?: { nama: string } };
}
interface Props { kelas: KelasInfo; mahasiswa: MhsRow[] }

const statusCfg = {
    pending_upload:     { label: 'Belum Upload',  cls: 'bg-gray-50 text-gray-600 border-gray-200' },
    pending_verifikasi: { label: 'Verifikasi',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    aktif:              { label: 'Aktif',          cls: 'bg-green-50 text-green-700 border-green-200' },
} as const;

export default function KelasDetailPage({ kelas, mahasiswa }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Kelas', href: '/kelas' },
        { title: `${kelas.nama} — ${kelas.prodi?.nama ?? '-'}`, href: `/kelas/${kelas.id}/mahasiswa` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Mahasiswa Kelas ${kelas.nama}`} />
            <div className="p-6 space-y-5">
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.get('/kelas')}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">
                            Kelas {kelas.nama} — {kelas.prodi?.nama ?? '-'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Angkatan {kelas.angkatan} · {kelas.prodi?.jurusan?.nama ?? '-'}
                            · {mahasiswa.length} mahasiswa
                        </p>
                    </div>
                </div>

                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>NIM</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status Enrollment</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mahasiswa.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-16">
                                        Belum ada mahasiswa di kelas ini.
                                    </TableCell>
                                </TableRow>
                            ) : mahasiswa.map(m => {
                                const cfg = statusCfg[m.status_akun];
                                return (
                                    <TableRow key={m.id}>
                                        <TableCell className="font-mono text-sm">{m.nim}</TableCell>
                                        <TableCell className="font-medium">{m.nama}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {m.email ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-xs ${cfg.cls}`}>
                                                {cfg.label}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
```

---

# CRUD-003 — Halaman Mahasiswa: Email + Filter Kelas

**Files yang diubah: 1**

**File: `resources/js/pages/mahasiswa/index.tsx`**

**a)** Tambahkan filter kelas di filter bar (dropdown pilih kelas):

```tsx
<Select value={filters.kelas_id ?? ''}
    onValueChange={val => {
        const p = val && val !== 'all' ? { kelas_id: val } : {};
        router.get('/mahasiswa', p, { preserveState: true });
    }}>
    <SelectTrigger className="w-56">
        <SelectValue placeholder="Semua Kelas" />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="all">Semua Kelas</SelectItem>
        {kelas.map(k => (
            <SelectItem key={k.id} value={String(k.id)}>
                {k.nama}{k.prodi ? ` — ${k.prodi.nama}` : ''}
            </SelectItem>
        ))}
    </SelectContent>
</Select>
```

**b)** Update `MahasiswaController.index()` — tambahkan `kelas_id` ke filters:

```php
return inertia('mahasiswa/index', [
    'mahasiswa' => $this->mahasiswaService->index(
        $request->search,
        $request->kelas_id,            // TAMBAH
        $user->jurusan_id,
        $user->isSuperAdmin()
    ),
    'kelas'   => $this->mahasiswaService->getKelasOptions($user->jurusan_id, $user->isSuperAdmin()),
    'filters' => $request->only('search', 'kelas_id'),  // TAMBAH kelas_id
    'flash'   => ['success' => session('success')],
]);
```

**c)** Update `MahasiswaService.index()` — tambahkan filter kelas_id:

```php
public function index(?string $search, ?string $kelasId, ?int $jurusanId, bool $isSuperAdmin): LengthAwarePaginator
{
    return Mahasiswa::query()
        ->with('kelas.prodi.jurusan')
        ->when(!$isSuperAdmin && $jurusanId, fn($q) =>
            $q->whereHas('kelas.prodi', fn($q2) => $q2->where('jurusan_id', $jurusanId))
        )
        ->when($search, fn($q) => $q->where(fn($q2) =>
            $q2->where('nama', 'like', "%{$search}%")->orWhere('nim', 'like', "%{$search}%")
        ))
        ->when($kelasId, fn($q) => $q->where('kelas_id', $kelasId))  // TAMBAH
        ->latest()
        ->paginate(config('starterkit.pagination'))
        ->withQueryString();
}
```

**d)** Tambahkan kolom Email di tabel dan form:

Di `TableHeader`:
```tsx
<TableHead>Email</TableHead>
```
Di `TableCell`:
```tsx
<TableCell className="text-sm text-muted-foreground">{item.email ?? '—'}</TableCell>
```

Di form create dan edit, tambahkan field email:
```tsx
<div className="space-y-1">
    <Label>Email</Label>
    <Input type="email" value={form.data.email}
        onChange={e => form.setData('email', e.target.value)} />
    {form.errors.email && <p className="text-xs text-red-500">{form.errors.email}</p>}
</div>
```

Update `useForm` untuk createForm dan editForm agar include `email: ''`.

Update `openEditDialog` agar set `email: item.email ?? ''`.

Hapus informasi "Login email otomatis: nim@mhs.demo.id" yang sudah tidak relevan.

---

# CRUD-004 — Halaman Ruangan: Filter Jurusan Aktif

**Files yang diubah: 1**

**File: `resources/js/pages/ruangan/index.tsx`**

Tambahkan filter jurusan di filter bar (sudah ada dropdown jurusan di form, sekarang tambah
juga sebagai filter tabel):

```tsx
<Select value={filters.jurusan_id ?? ''}
    onValueChange={val => {
        const p = val && val !== 'all' ? { jurusan_id: val } : {};
        router.get('/ruangan', p, { preserveState: true });
    }}>
    <SelectTrigger className="w-48">
        <SelectValue placeholder="Semua Jurusan" />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="all">Semua Jurusan</SelectItem>
        {jurusan.map(j => (
            <SelectItem key={j.id} value={String(j.id)}>{j.nama}</SelectItem>
        ))}
    </SelectContent>
</Select>
```

Update `RuanganController.index()` — tambahkan filter `jurusan_id`:
```php
'filters' => $request->only('search', 'jurusan_id'),
```

Update `RuanganService.index()` — tambahkan parameter dan query:
```php
->when($jurusanId && !$isSuperAdmin, fn($q) => $q->where('jurusan_id', $jurusanId))
->when($filterJurusanId, fn($q) => $q->where('jurusan_id', $filterJurusanId)) // untuk super admin filter manual
```

**Catatan:** Admin jurusan sudah otomatis ter-scope karena `jurusan_id` accessor.
Filter ini terutama berguna untuk super admin yang ingin melihat ruangan per jurusan.

---

# GAP-001 — Enrollment Dosen: Foto Preview

**Files yang diubah: 2**

**File 1: `app/Http/Controllers/EnrollmentDosenController.php`**

Update method `index()` — tambahkan foto_previews dan fotoPreview endpoint:

```php
public function index(Request $request)
{
    $dosen = $request->user()->dosen;
    if (!$dosen) abort(404);

    // Generate URL preview foto jika sudah diupload
    $fotoPreviews = [];
    if ($dosen->foto_paths) {
        foreach ($dosen->foto_paths as $i => $path) {
            $fotoPreviews[] = [
                'index' => $i,
                'url'   => route('enrollment-dosen.foto-preview', ['index' => $i]),
            ];
        }
    }

    return inertia('enrollment-dosen/index', [
        'status'       => $this->service->status($dosen),
        'foto_previews'=> $fotoPreviews,
    ]);
}
```

Tambahkan method `fotoPreview()`:
```php
public function fotoPreview(Request $request, int $index)
{
    $dosen = $request->user()->dosen;
    if (!$dosen) abort(404);

    abort_unless($dosen->foto_paths && isset($dosen->foto_paths[$index]), 404);
    $path = $dosen->foto_paths[$index];
    abort_unless(\Illuminate\Support\Facades\Storage::disk('local')->exists($path), 404);

    return \Illuminate\Support\Facades\Storage::disk('local')->response($path);
}
```

**Di `routes/web.php`**, di dalam block `enrollment-dosen`:
```php
Route::get('/foto/{index}', [EnrollmentDosenController::class, 'fotoPreview'])->name('foto-preview');
```

**File 2: `resources/js/pages/enrollment-dosen/index.tsx`**

Tambahkan interface dan section foto preview.

**a)** Update Props untuk terima `foto_previews`:
```tsx
interface FotoPreview { index: number; url: string }
interface Props {
    status: { status_enrollment: string; jarak_lulus: Record<string, number>; semua_jarak_lulus: boolean };
    foto_previews: FotoPreview[];
}
```

**b)** Tambahkan section foto preview setelah status card, sebelum tombol verifikasi.
Tampilkan hanya jika `foto_previews.length > 0`:

```tsx
{foto_previews.length > 0 && (
    <Card>
        <CardHeader className="pb-3">
            <CardTitle className="text-base">Foto Wajah Terdaftar ({foto_previews.length}/5)</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-5 gap-2">
                {foto_previews.map(f => (
                    <div key={f.index} className="aspect-square rounded-lg overflow-hidden border bg-muted">
                        <img src={f.url} alt={`Foto ${f.index + 1}`}
                            className="w-full h-full object-cover" />
                    </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
                Jika foto tidak sesuai dengan wajah Anda saat ini, reset enrollment dan ulangi.
            </p>
        </CardContent>
    </Card>
)}
```

**c)** Pastikan layout halaman full-width — hapus `max-w-*` di container utama.
Gunakan grid 2 kolom untuk layout: kiri = status + foto, kanan = verifikasi/aksi.

---

# GAP-002 — Enrollment Mahasiswa: Halaman Self-Status

**Files yang diubah: 3**

**File 1: `app/Http/Controllers/EnrollmentController.php`**

Tambahkan dua method baru:

```php
// Halaman status enrollment untuk mahasiswa (lihat foto + hasil verifikasi)
public function selfStatusPage(Request $request)
{
    $mahasiswa = $request->user()->mahasiswa;
    if (!$mahasiswa) abort(404);

    $statusData = $this->enrollmentService->status($mahasiswa);

    $fotoPreviews = [];
    if ($mahasiswa->foto_paths) {
        foreach ($mahasiswa->foto_paths as $i => $path) {
            $fotoPreviews[] = [
                'index' => $i,
                'url'   => route('enrollment.self-foto-preview', ['index' => $i]),
            ];
        }
    }

    return inertia('enrollment/self-status', [
        'mahasiswa'     => ['nama' => $mahasiswa->nama, 'nim' => $mahasiswa->nim],
        'foto_previews' => $fotoPreviews,
        'jarak_lulus'   => $statusData['jarak_lulus'],
        'semua_lulus'   => $statusData['semua_jarak_lulus'],
        'status_akun'   => $mahasiswa->status_akun,
    ]);
}

// Preview foto untuk mahasiswa
public function selfFotoPreview(Request $request, int $index)
{
    $mahasiswa = $request->user()->mahasiswa;
    if (!$mahasiswa) abort(404);

    abort_unless($mahasiswa->foto_paths && isset($mahasiswa->foto_paths[$index]), 404);
    $path = $mahasiswa->foto_paths[$index];
    abort_unless(Storage::disk('local')->exists($path), 404);

    return Storage::disk('local')->response($path);
}
```

**File 2: `routes/web.php`**

Di dalam block self-enrollment mahasiswa, tambahkan:
```php
Route::get('/enrollment/self-status', [EnrollmentController::class, 'selfStatusPage'])->name('enrollment.self-status');
Route::get('/enrollment/self-foto/{index}', [EnrollmentController::class, 'selfFotoPreview'])->name('enrollment.self-foto-preview');
```

**File 3: BUAT `resources/js/pages/enrollment/self-status.tsx`**

```tsx
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { CheckCircle, Info, XCircle } from 'lucide-react';

interface FotoPreview { index: number; url: string }
interface Props {
    mahasiswa: { nama: string; nim: string };
    foto_previews: FotoPreview[];
    jarak_lulus: Record<string, number>;
    semua_lulus: boolean;
    status_akun: string;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Status Enrollment', href: '/enrollment/self-status' }];

const JARAK = [
    { key: 'dekat', label: 'Jarak Dekat',  desc: '~30cm dari kamera' },
    { key: 'sedang', label: 'Jarak Sedang', desc: '~60cm dari kamera' },
    { key: 'jauh',   label: 'Jarak Jauh',   desc: '~100cm dari kamera' },
];

export default function SelfStatusPage({ mahasiswa, foto_previews, jarak_lulus, semua_lulus, status_akun }: Props) {
    const isAktif = status_akun === 'aktif';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Status Enrollment Wajah" />
            <div className="p-6 space-y-5">

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Status Enrollment Wajah</h1>
                        <p className="text-sm text-muted-foreground">
                            {mahasiswa.nama} · {mahasiswa.nim}
                        </p>
                    </div>
                    <Badge variant="outline" className={isAktif
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }>
                        {isAktif ? 'Enrollment Aktif' : 'Belum Aktif'}
                    </Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-5">

                    {/* Foto Preview */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                                Foto Wajah Terdaftar ({foto_previews.length}/5)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {foto_previews.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    Belum ada foto yang diupload.
                                </p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-5 gap-2">
                                        {foto_previews.map(f => (
                                            <div key={f.index}
                                                className="aspect-square rounded-lg overflow-hidden border bg-muted">
                                                <img src={f.url} alt={`Foto ${f.index + 1}`}
                                                    className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                    {isAktif && (
                                        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                                            <Info className="size-4 text-blue-600 shrink-0 mt-0.5" />
                                            <p className="text-xs text-blue-700">
                                                Jika foto tidak sesuai dengan penampilan Anda saat ini dan
                                                menyebabkan masalah absensi, hubungi admin jurusan untuk
                                                mereset enrollment.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Hasil Verifikasi */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Hasil Verifikasi 3 Jarak</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {JARAK.map(j => {
                                const confidence = jarak_lulus[j.key];
                                const lulus = confidence !== undefined;
                                return (
                                    <div key={j.key}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${
                                            lulus
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-muted/40 border-border'
                                        }`}>
                                        <div className="flex items-center gap-2.5">
                                            {lulus
                                                ? <CheckCircle className="size-4 text-green-600 shrink-0" />
                                                : <XCircle className="size-4 text-muted-foreground shrink-0" />
                                            }
                                            <div>
                                                <p className="text-sm font-medium">{j.label}</p>
                                                <p className="text-xs text-muted-foreground">{j.desc}</p>
                                            </div>
                                        </div>
                                        {lulus && (
                                            <Badge variant="outline"
                                                className="bg-green-50 text-green-700 border-green-200 text-xs">
                                                {Math.round(confidence * 100)}%
                                            </Badge>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Catatan jika belum aktif */}
                            {!isAktif && foto_previews.length === 5 && (
                                <div className="pt-1 p-3 rounded-lg bg-orange-50 border border-orange-200">
                                    <p className="text-xs text-orange-700">
                                        {semua_lulus
                                            ? 'Semua jarak telah diverifikasi. Enrollment aktif secara otomatis.'
                                            : 'Selesaikan verifikasi semua jarak untuk mengaktifkan enrollment.'}
                                    </p>
                                </div>
                            )}

                            {/* Jika belum upload */}
                            {foto_previews.length === 0 && (
                                <div className="pt-1 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                    <p className="text-xs text-gray-600">
                                        Upload 5 foto wajah terlebih dahulu untuk memulai enrollment.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
```

**Tambahkan link ke halaman ini di sidebar untuk role mahasiswa** (`app-sidebar.tsx`):

Di bagian yang hanya tampil untuk mahasiswa (gunakan `roles: ['mahasiswa']`):

```tsx
const mahasiswaItems: NavItem[] = [
    {
        title: 'Keterangan',
        href: '/keterangan',
        icon: FileText,
        permissions: ['keterangan index'],
    },
    {
        title: 'Status Enrollment',
        href: '/enrollment/self-status',
        icon: ScanFace,
        roles: ['mahasiswa'],
    },
];
```

Tambahkan section ini ke render `<SidebarContent>`.

---

# PROFILE-001 — Settings Profile: Sync Data Role-Specific

**Files yang diubah: 2**

**File 1: `app/Http/Controllers/Settings/ProfileController.php`**

Update method `update()` agar sync data ke tabel yang relevan:

```php
public function update(ProfileUpdateRequest $request): RedirectResponse
{
    $user = $request->user();
    $user->fill($request->validated());

    if ($user->isDirty('email')) {
        $user->email_verified_at = null;
    }

    $user->save();

    // Sync nama & email ke tabel role-specific
    if ($user->isAdminJurusan() && $user->adminJurusan) {
        $user->adminJurusan->update([
            'nama'  => $request->name,
            'email' => $request->email,
        ]);
    }

    if ($user->isDosen() && $user->dosen) {
        $user->dosen->update([
            'nama'  => $request->name,
            'email' => $request->email,
        ]);
    }

    if ($user->isMahasiswa() && $user->mahasiswa) {
        $user->mahasiswa->update([
            'nama'  => $request->name,
            'email' => $request->email,
        ]);
    }

    return to_route('profile.edit');
}
```

**File 2: `resources/js/pages/settings/profile.tsx`**

Tidak ada perubahan besar — settings profile sudah bisa edit name dan email melalui
`users` table, dan controller baru sudah sync ke tabel terkait.

Tambahkan saja informasi kontekstual kecil bahwa perubahan nama/email akan sync
ke data akademik:

```tsx
<p className="text-xs text-muted-foreground">
    Perubahan nama dan email akan otomatis tersinkron dengan data akademik Anda.
</p>
```

Letakkan di bawah form description, sebelum field pertama.

---

## Verifikasi Akhir

```bash
# 1. Jalankan fresh seeder
php artisan migrate:fresh --seed

# 2. Build frontend
cd Laravel && npm run build

# 3. Test isolation data
# Login admin.ti@demo.id → hanya lihat data TI
# Login admin.te@demo.id → hanya lihat data TE
# Login superadmin@demo.id → lihat semua data

# 4. Test akun dosen otomatis
# Buat dosen baru via form → cek tabel users ada record baru → login dengan email dosen

# 5. Test akun mahasiswa otomatis
# Buat mahasiswa baru via form (isi email) → cek tabel users → login

# 6. Test enrollment mahasiswa
# Login mahasiswa@demo.id → sidebar ada "Status Enrollment" → masuk → halaman tampil

# 7. Test enrollment dosen
# Login budi.santoso@demo.id → Enrollment Wajah → upload foto → cek foto preview tampil

# 8. Test Admin Jurusan CRUD
# Login superadmin → menu "Admin Jurusan" di User Management → buat admin baru
```

---

## Checklist Error yang Mungkin Muncul

| Error | Lokasi | Solusi |
|-------|--------|--------|
| `Column 'jurusan_id' doesn't exist` | Users query lama | Cek ARCH-003 migration sudah jalan |
| `Call to undefined: adminJurusan()` | User model | Cek ARCH-002 relasi sudah ditambah |
| `Property jurusan_id not found` | Controller | Accessor sudah ada, cek `load('adminJurusan')` di Inertia |
| `Unique constraint users.email` | Store dosen/mhs | Validasi email unique ke users sudah ditambah |
| `Cannot find module @/pages/admin-jurusan` | Frontend | Cek ARCH-008 file sudah dibuat |
| `Cannot find module @/pages/kelas/mahasiswa-list` | Frontend | Cek CRUD-002 file sudah dibuat |
| `Cannot find module @/pages/enrollment/self-status` | Frontend | Cek GAP-002 file sudah dibuat |

