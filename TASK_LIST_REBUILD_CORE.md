# Task List — Rebuild Core: Event/Record Separation & Validasi Backend
*Dibuat: 25 Juni 2026 | Scope dikunci untuk eksekusi 1 hari — sidang besok*

---

## Konteks

Task list ini adalah scope **terbatas dan realistis** dari dokumen "Konteks Rebuild Sistem Absensi" untuk dieksekusi hari ini. Tidak semua hal di dokumen rebuild dikerjakan — hanya bagian paling fundamental: **pemisahan attendance event vs attendance record**, dan **menutup celah validasi di `InternalController::recordAbsensi()`** yang ditemukan setelah audit langsung ke kode (bukan asumsi).

**Temuan audit terhadap kode saat ini:**
- `recordAbsensi()` langsung menulis record final (`AbsensiMahasiswa`/`AbsensiDosen`) dalam satu langkah — tidak ada log mentah hasil deteksi. Event yang ditolak (duplicate, out_of_window, dll) tidak tersimpan sama sekali → tidak ada audit trail.
- `confidence` yang dikirim Python **tidak divalidasi ulang di Laravel** — threshold 0.65 hanya dicek di `recognizer.py` (sisi Python). Laravel sebagai *source of truth* mempercayai begitu saja angka yang dikirim.
- `ruangan_id` dikirim di request tapi **tidak pernah dibandingkan** dengan ruangan sebenarnya dari `sesi->jadwal->ruangan_id`. Event dari ruangan manapun akan tetap diterima asal `sesi_id` valid.
- Tidak ada unique constraint di level database untuk `(sesi_id, mahasiswa_id)` / `(sesi_id, dosen_id)` — cek duplikat hanya lewat `exists()` di kode, rawan race condition.
- Status enrollment (`status_akun` / `status_enrollment` = `aktif`) tidak dicek ulang di endpoint ini — saat ini hanya "aman" karena Python kebetulan hanya menerima encoding mahasiswa yang sudah `aktif`. Tidak ada jaminan independen di backend.

**Tidak dikerjakan hari ini (sengaja, demi realistis):** redesain `sesi_absensi` status enum, UX overhaul, modul monitoring, security boundary internal API (sudah cukup aman — sudah ada `InternalApiKey` middleware). Semua ini bisa lanjut setelah sidang.

**Root project:** `ta-faiz/Laravel/`

**PENTING sebelum mulai:** pastikan sudah `git tag pre-rebuild-stable` di kondisi sekarang sebelum task ini dieksekusi.

---

## Prioritas Eksekusi

| Task | Nama | Kategori | Urgensi |
|------|------|----------|---------|
| REBUILD-001 | Migration — tabel `attendance_events` | Laravel / DB | 🔴 Kritis |
| REBUILD-002 | Model `AttendanceEvent` | Laravel / Model | 🔴 Kritis |
| REBUILD-003 | Migration — unique constraint absensi_mahasiswa & absensi_dosen | Laravel / DB | 🔴 Kritis |
| REBUILD-004 | Config — `absensi_threshold` di `services.php` | Laravel / Config | 🟡 Mayor |
| REBUILD-005 | Refactor `InternalController::recordAbsensi()` — full validasi + logging event | Laravel / Backend | 🔴 Kritis |
| REBUILD-006 | Verifikasi — migrate + test manual | Verifikasi | ✅ Wajib |

---

## Detail Task

---

### REBUILD-001 — Migration: tabel `attendance_events`

**File baru:** `database/migrations/2026_06_25_080000_create_attendance_events_table.php`

**Tujuan:** Setiap hasil deteksi dari Python — diterima ATAU ditolak — disimpan sebagai event mentah. Ini yang membuat sistem auditable: setiap keputusan bisa ditelusuri alasannya.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sesi_id')->nullable()->constrained('sesi_absensi')->nullOnDelete();
            $table->enum('person_type', ['mahasiswa', 'dosen']);
            $table->unsignedBigInteger('person_id')->nullable(); // null jika not_found
            $table->string('nim_or_nip_raw'); // apa yang dikirim Python, walau ujungnya not_found
            $table->unsignedBigInteger('ruangan_id_reported')->nullable();
            $table->float('confidence');
            $table->enum('decision', ['accepted', 'rejected']);
            $table->string('reject_reason')->nullable();
            // contoh isi: sesi_not_found, low_confidence, wrong_room, out_of_window,
            // not_found, not_in_class, enrollment_not_verified, duplicate
            $table->timestamp('detected_at');
            $table->timestamps();

            $table->index(['sesi_id', 'person_type', 'person_id', 'detected_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_events');
    }
};
```

---

### REBUILD-002 — Model `AttendanceEvent`

**File baru:** `app/Models/AttendanceEvent.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceEvent extends Model
{
    protected $table = 'attendance_events';

    protected $fillable = [
        'sesi_id', 'person_type', 'person_id', 'nim_or_nip_raw',
        'ruangan_id_reported', 'confidence', 'decision', 'reject_reason', 'detected_at',
    ];

    protected $casts = [
        'detected_at' => 'datetime',
    ];

    public function sesi(): BelongsTo
    {
        return $this->belongsTo(SesiAbsensi::class, 'sesi_id');
    }
}
```

---

### REBUILD-003 — Migration: unique constraint pencegah duplikasi

**File baru:** `database/migrations/2026_06_25_080100_add_unique_constraints_to_absensi_tables.php`

**Tujuan:** `updateOrCreate()` di kode lama rawan race condition kalau dua request datang nyaris bersamaan (dua frame webcam berurutan). Constraint di level database menutup celah ini, bukan cuma andalan kode aplikasi.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('absensi_mahasiswa', function (Blueprint $table) {
            $table->unique(['sesi_id', 'mahasiswa_id']);
        });

        Schema::table('absensi_dosen', function (Blueprint $table) {
            $table->unique(['sesi_id', 'dosen_id']);
        });
    }

    public function down(): void
    {
        Schema::table('absensi_mahasiswa', function (Blueprint $table) {
            $table->dropUnique(['sesi_id', 'mahasiswa_id']);
        });

        Schema::table('absensi_dosen', function (Blueprint $table) {
            $table->dropUnique(['sesi_id', 'dosen_id']);
        });
    }
};
```

**Catatan:** kalau migration ini gagal karena ada data duplikat lama di tabel (kemungkinan kecil karena `updateOrCreate` sudah cukup disiplin selama ini), jalankan dulu query pembersihan manual sebelum migrate — beri tahu saya kalau ini terjadi, jangan langsung force.

---

### REBUILD-004 — Config: tambah `absensi_threshold`

**File:** `config/services.php`

**Cari blok ini:**

```php
'python' => [
    'url'                         => env('PYTHON_SERVICE_URL', 'http://localhost:8001'),
    'enrollment_threshold'        => (float) env('ENROLLMENT_CONFIDENCE_THRESHOLD', 0.75),
],
```

**Ganti jadi:**

```php
'python' => [
    'url'                         => env('PYTHON_SERVICE_URL', 'http://localhost:8001'),
    'enrollment_threshold'        => (float) env('ENROLLMENT_CONFIDENCE_THRESHOLD', 0.75),
    'absensi_threshold'           => (float) env('ABSENSI_CONFIDENCE_THRESHOLD', 0.65),
],
```

Tambahkan juga di `.env`: `ABSENSI_CONFIDENCE_THRESHOLD=0.65` (samakan dengan nilai di `python-service/core/recognizer.py` supaya kedua sisi konsisten).

---

### REBUILD-005 — Refactor `InternalController::recordAbsensi()`

**File:** `app/Http/Controllers/InternalController.php`

**Tambahkan import di atas file:**

```php
use App\Models\AttendanceEvent;
use Illuminate\Support\Facades\DB;
```

**Ganti seluruh method `recordAbsensi()` (dan tambahkan 3 method private baru setelahnya) dengan:**

```php
public function recordAbsensi(Request $request): JsonResponse
{
    $request->validate([
        'nim_or_nip' => ['required', 'string'],
        'type'       => ['required', 'in:mahasiswa,dosen'],
        'ruangan_id' => ['required', 'integer'],
        'sesi_id'    => ['required', 'integer'],
        'confidence' => ['required', 'numeric'],
    ]);

    $sesi = SesiAbsensi::where('id', $request->sesi_id)
        ->where('status', 'berlangsung')
        ->with('jadwal')
        ->first();

    if (!$sesi) {
        $this->logEvent($request, null, null, 'rejected', 'sesi_not_found');
        return response()->json(['status' => 'sesi_not_found'], 404);
    }

    // Re-validasi confidence di Laravel — jangan percaya angka dari Python begitu saja.
    // Laravel adalah source of truth, bukan Python.
    $threshold = (float) config('services.python.absensi_threshold', 0.65);
    if ($request->confidence < $threshold) {
        $this->logEvent($request, $sesi->id, null, 'rejected', 'low_confidence');
        return response()->json(['status' => 'low_confidence']);
    }

    // Event harus berasal dari ruangan yang sesuai jadwal sesi ini.
    if ((int) $request->ruangan_id !== (int) $sesi->jadwal->ruangan_id) {
        $this->logEvent($request, $sesi->id, null, 'rejected', 'wrong_room');
        return response()->json(['status' => 'wrong_room'], 403);
    }

    $windowMenit = $request->type === 'dosen'
        ? $sesi->jadwal->window_dosen_menit
        : $sesi->jadwal->window_menit;
    $batasWindow = Carbon::parse($sesi->mulai_at)->addMinutes($windowMenit);
    if (now()->isAfter($batasWindow)) {
        $this->logEvent($request, $sesi->id, null, 'rejected', 'out_of_window');
        return response()->json(['status' => 'out_of_window']);
    }

    return $request->type === 'mahasiswa'
        ? $this->recordMahasiswa($request, $sesi)
        : $this->recordDosen($request, $sesi);
}

private function recordMahasiswa(Request $request, SesiAbsensi $sesi): JsonResponse
{
    $mhs = Mahasiswa::where('nim', $request->nim_or_nip)->first();
    if (!$mhs) {
        $this->logEvent($request, $sesi->id, null, 'rejected', 'not_found');
        return response()->json(['status' => 'not_found'], 404);
    }

    if ($mhs->kelas_id !== $sesi->jadwal->kelas_id) {
        $this->logEvent($request, $sesi->id, $mhs->id, 'rejected', 'not_in_class');
        return response()->json(['status' => 'not_in_class'], 403);
    }

    // Jangan andalkan Python saja soal status enrollment — cek ulang di backend.
    if ($mhs->status_akun !== 'aktif') {
        $this->logEvent($request, $sesi->id, $mhs->id, 'rejected', 'enrollment_not_verified');
        return response()->json(['status' => 'enrollment_not_verified'], 403);
    }

    return DB::transaction(function () use ($request, $sesi, $mhs) {
        $existing = AbsensiMahasiswa::where('sesi_id', $sesi->id)
            ->where('mahasiswa_id', $mhs->id)
            ->lockForUpdate()
            ->first();

        if ($existing && $existing->status === 'hadir') {
            $this->logEvent($request, $sesi->id, $mhs->id, 'rejected', 'duplicate');
            return response()->json(['status' => 'duplicate'], 409);
        }

        AbsensiMahasiswa::updateOrCreate(
            ['sesi_id' => $sesi->id, 'mahasiswa_id' => $mhs->id],
            ['status' => 'hadir', 'hadir_at' => now(), 'confidence' => $request->confidence]
        );

        $this->logEvent($request, $sesi->id, $mhs->id, 'accepted', null);

        return response()->json(['status' => 'recorded', 'nama' => $mhs->nama, 'is_duplicate' => false]);
    });
}

private function recordDosen(Request $request, SesiAbsensi $sesi): JsonResponse
{
    $dsn = Dosen::where('nip', $request->nim_or_nip)->first();
    if (!$dsn) {
        $this->logEvent($request, $sesi->id, null, 'rejected', 'not_found');
        return response()->json(['status' => 'not_found'], 404);
    }

    if ($dsn->status_enrollment !== 'aktif') {
        $this->logEvent($request, $sesi->id, $dsn->id, 'rejected', 'enrollment_not_verified');
        return response()->json(['status' => 'enrollment_not_verified'], 403);
    }

    return DB::transaction(function () use ($request, $sesi, $dsn) {
        $existing = AbsensiDosen::where('sesi_id', $sesi->id)
            ->where('dosen_id', $dsn->id)
            ->lockForUpdate()
            ->first();

        if ($existing && $existing->status === 'hadir') {
            $this->logEvent($request, $sesi->id, $dsn->id, 'rejected', 'duplicate');
            return response()->json(['status' => 'duplicate'], 409);
        }

        AbsensiDosen::updateOrCreate(
            ['sesi_id' => $sesi->id, 'dosen_id' => $dsn->id],
            ['status' => 'hadir', 'hadir_at' => now(), 'confidence' => $request->confidence]
        );

        $this->logEvent($request, $sesi->id, $dsn->id, 'accepted', null);

        return response()->json(['status' => 'recorded', 'nama' => $dsn->nama, 'is_duplicate' => false]);
    });
}

private function logEvent(Request $request, ?int $sesiId, ?int $personId, string $decision, ?string $reason): void
{
    AttendanceEvent::create([
        'sesi_id'             => $sesiId,
        'person_type'         => $request->type,
        'person_id'           => $personId,
        'nim_or_nip_raw'      => $request->nim_or_nip,
        'ruangan_id_reported' => $request->ruangan_id,
        'confidence'          => $request->confidence,
        'decision'            => $decision,
        'reject_reason'       => $reason,
        'detected_at'         => now(),
    ]);
}
```

**Catatan penting:** method lama hanya punya satu blok besar; method baru ini memecahnya jadi 4 method (`recordAbsensi`, `recordMahasiswa`, `recordDosen`, `logEvent`). Pastikan method lama benar-benar diganti seluruhnya, jangan ditumpuk.

---

### REBUILD-006 — Verifikasi

1. Jalankan migration:
   ```bash
   php artisan migrate
   ```
   Pastikan 3 migration baru (`attendance_events`, unique constraint) jalan tanpa error.

2. Cek tidak ada data lama yang bikin unique constraint gagal — kalau migration di langkah 1 error karena duplicate entry, **stop, jangan force**, laporkan balik ke saya dulu.

3. Tes manual salah satu skenario lewat Postman/curl ke `POST /api/internal/absensi/record` (pakai header `X-Internal-Key`) dengan:
   - `confidence` di bawah 0.65 → harus dapat `low_confidence`, dan cek row baru muncul di tabel `attendance_events` dengan `decision = rejected`.
   - `ruangan_id` yang salah (bukan ruangan jadwal sebenarnya) → harus dapat `wrong_room`.
   - Request normal yang valid → harus dapat `recorded`, dan `attendance_events` punya row `decision = accepted`.

4. Jalankan flow normal end-to-end pakai webcam (Python service) sekali untuk pastikan tidak ada regresi — proses absensi yang sudah jalan sebelumnya harus tetap jalan normal.

5. Setelah semua lolos: `git add -A && git commit -m "rebuild: event/record separation + backend validation hardening"`. **Jangan** hapus tag `pre-rebuild-stable` — itu tetap jadi fallback.
