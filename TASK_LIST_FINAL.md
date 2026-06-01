# Task List Final — Bug Fix + UX Redesign
*Dibuat: 2 Juni 2026 | Prioritas: UX Redesign didahulukan*

---

## Prinsip Utama untuk Semua Task

1. **Full width** — tidak ada `max-w-*` di container halaman utama. Gunakan 100% horizontal space.
2. **Data selalu tampil** — filter hanya mempersempit, tidak pernah jadi syarat akses data.
3. **Card standardization** — semua stat card pakai pattern: left accent bar + label atas + angka besar + context bawah. Background tetap white/netral, tidak ada background warna penuh.
4. **Status color konsisten di semua halaman:**
   - Hadir = `text-green-700 border-green-200 bg-green-50`
   - Alpa = `text-red-700 border-red-200 bg-red-50`
   - Izin = `text-blue-700 border-blue-200 bg-blue-50`
   - Sakit = `text-yellow-700 border-yellow-200 bg-yellow-50`
   - Pending = `text-orange-700 border-orange-200 bg-orange-50`
   - Aktif = `text-green-700 border-green-200 bg-green-50`
   - Terkunci = `text-gray-500 border-gray-200 bg-gray-50`

---

## Urutan Eksekusi

```
BATCH 1: Bug Fix (critical, eksekusi duluan)
  FIX-001 → FIX-002 → FIX-003

BATCH 2: UX Redesign
  UX-A01 → UX-A02 → UX-A03 → UX-A04   (Rekap Absensi)
  UX-B01 → UX-B02                       (Enrollment)
  UX-C01 → UX-C02 → UX-C03 → UX-C04   (Dashboard)
  UX-D01                                 (Sidebar)

BATCH 3: Arsitektur & CRUD (setelah UX selesai)
  ARCH-001 → ARCH-002 → ARCH-003 → ARCH-004
  CRUD-001 → CRUD-002 → CRUD-003
  CRUD-004 → CRUD-005 → CRUD-006 → CRUD-007
  PROFILE-001 → PROFILE-002
```

---

# BATCH 1 — BUG FIX

---

## FIX-001 — Bug `persen` vs `persen_hadir` di Laporan

**Files yang diubah: 1**

**File: `app/Services/LaporanService.php`**

Di method `rekapKelas()`, cari baris:
```php
$persen = $totalPertemuan > 0 ? round($hadir / $totalPertemuan * 100, 1) : 0;

return compact('hadir', 'alpa', 'izin', 'sakit', 'persen') + [
```

Ganti dengan:
```php
$persen_hadir = $totalPertemuan > 0 ? round($hadir / $totalPertemuan * 100, 1) : 0;

return compact('hadir', 'alpa', 'izin', 'sakit', 'persen_hadir') + [
```

Di method `rekapMahasiswa()`, cari:
```php
$persen = round($hadir / $totalPertemuan * 100, 1);
```
Ganti dengan:
```php
$persen_hadir = round($hadir / $totalPertemuan * 100, 1);
```

Dan cari di return yang sama:
```php
'persen_hadir' => $persen,
```
Ini sudah benar, tapi pastikan variable `$persen_hadir` dipakai.

**Verifikasi:** Export PDF laporan → tidak ada error. Export Excel → berhasil.

---

## FIX-002 — Bug Sidebar Super Admin (404 saat klik menu Dosen)

**Files yang diubah: 4**

**Masalah:** Super Admin punya semua permissions sehingga melihat menu `dosenItems`,
tapi controller dosen melakukan `abort(404)` jika user tidak punya record dosen.
Solusi: tambah role-based filtering di sidebar.

**File 1: `app/Http/Middleware/HandleInertiaRequests.php`**

Di dalam array `share()`, cari bagian `'auth' => [...]` dan tambahkan `'roles'`:

```php
'auth' => [
    'user' => $request->user(),
    'roles' => $request->user() ? $request->user()->getRoleNames() : [],  // TAMBAH INI
    'permissions' => $request->user() ? $request->user()->getAllPermissions()->map(fn($permission) => [
        // ... isi yang sudah ada tetap sama
    ]) : [],
],
```

**File 2: `resources/js/types/index.d.ts`**

Update interface `Auth`:
```ts
export interface Auth {
    user: User;
    roles: string[];         // TAMBAH: array nama role user yang login
    permissions: Permission[];
}
```

Update interface `NavItem` — tambah field `roles`:
```ts
export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    permissions?: string[];
    roles?: string[];         // TAMBAH: jika diisi, item hanya tampil untuk role ini
    isActive?: boolean;
}
```

**File 3: `resources/js/components/nav-main.tsx`**

Tambahkan role-checking di dalam `NavMain`. Cari:
```tsx
const { auth } = page.props as { auth?: { permissions?: Permission[] } };
const userPerms = auth?.permissions?.map(p => p.name) ?? [];

function canSee(perms?: string[]) {
    if (!perms?.length) return true;
    return perms.some(p => userPerms.includes(p));
}

const visibleItems = items.filter(item => canSee(item.permissions));
```

Ganti seluruh bagian itu dengan:
```tsx
const { auth } = page.props as { auth?: { permissions?: Permission[]; roles?: string[] } };
const userPerms = auth?.permissions?.map(p => p.name) ?? [];
const userRoles = auth?.roles ?? [];

function canSee(item: NavItem): boolean {
    // Cek roles dulu — jika ada batasan role, user harus punya salah satu role itu
    if (item.roles?.length) {
        if (!item.roles.some(r => userRoles.includes(r))) return false;
    }
    // Cek permissions
    if (!item.permissions?.length) return true;
    return item.permissions.some(p => userPerms.includes(p));
}

const visibleItems = items.filter(item => canSee(item));
```

**File 4: `resources/js/components/app-sidebar.tsx`**

Di `dosenItems`, tambahkan `roles: ['dosen']` agar hanya role dosen yang melihat:

```tsx
const dosenItems: NavItem[] = [
    {
        title: 'Enrollment Wajah',
        href: '/enrollment-dosen',
        icon: ScanFace,
        permissions: ['enrollment_dosen index'],
        roles: ['dosen'],          // TAMBAH
    },
    {
        title: 'Koreksi Absensi',
        href: '/koreksi-dosen',
        icon: ClipboardList,
        permissions: ['koreksi_dosen create'],
        roles: ['dosen'],          // TAMBAH
    },
];
```

**Verifikasi:** Login super admin → menu Enrollment Wajah dan Koreksi Absensi tidak muncul.
Login dosen → kedua menu muncul.

---

## FIX-003 — Bug window_dosen_menit tidak ada di form Jadwal

**Files yang diubah: 4**

**File 1: `app/Http/Requests/StoreJadwalRequest.php`**

Di `rules()`, tambahkan setelah `'window_menit'`:
```php
'window_dosen_menit' => ['required', 'integer', 'min:1', 'max:120'],
```

**File 2: `app/Http/Requests/UpdateJadwalRequest.php`**

Sama persis seperti di atas.

**File 3: `app/Http/Controllers/InternalController.php`**

Cari method `recordAbsensi()`. Di dalam method, cari baris:
```php
$batasWindow = Carbon::parse($sesi->mulai_at)->addMinutes($sesi->jadwal->window_menit);
```

Ganti dengan:
```php
$windowMenit = $request->type === 'dosen'
    ? $sesi->jadwal->window_dosen_menit
    : $sesi->jadwal->window_menit;
$batasWindow = Carbon::parse($sesi->mulai_at)->addMinutes($windowMenit);
```

**File 4: `resources/js/pages/jadwal/index.tsx`**

**a)** Cari `initialForm` (atau `emptyForm`) — object default values untuk form jadwal.
Tambahkan `window_dosen_menit: '30'` di dalamnya.

**b)** Di `FormFields` component, cari blok window:
```tsx
<div className="space-y-1">
    <Label>Window (menit)</Label>
    <Input type="number" min={1} max={60} value={form.data.window_menit}
        onChange={e => form.setData('window_menit', e.target.value)} />
</div>
```

Ganti seluruh div itu dengan DUA div (keduanya tetap di dalam grid yang sudah ada):
```tsx
<div className="space-y-1">
    <Label>Window Mahasiswa (menit)</Label>
    <Input
        type="number" min={1} max={60}
        value={form.data.window_menit}
        onChange={e => form.setData('window_menit', e.target.value)}
    />
    <p className="text-xs text-muted-foreground">Toleransi waktu hadir mahasiswa</p>
</div>
<div className="space-y-1">
    <Label>Window Dosen (menit)</Label>
    <Input
        type="number" min={1} max={120}
        value={form.data.window_dosen_menit}
        onChange={e => form.setData('window_dosen_menit', e.target.value)}
    />
    <p className="text-xs text-muted-foreground">Toleransi waktu hadir dosen (default 30)</p>
</div>
```

**c)** Cari fungsi `openEditDialog` (atau nama serupa) yang populate form saat edit.
Tambahkan:
```tsx
window_dosen_menit: String(item.window_dosen_menit ?? 30),
```

**Verifikasi:** Form jadwal ada 2 field window → submit create berhasil →
cek DB `jadwal.window_dosen_menit` tersimpan sesuai input.

---

# BATCH 2 — UX REDESIGN

---

## UX-A01 — Rekap Absensi: Backend Baru (3-level navigation)

**Files yang diubah: 3**

**Arsitektur:**
```
GET /absensi              → index()      → Inertia: absensi/index
GET /absensi/{jadwal}     → sesiList()   → Inertia: absensi/sesi-list
GET /absensi/{jadwal}/{sesi} → sesiDetail() → Inertia: absensi/sesi-detail
```

**File 1: `app/Services/AbsensiService.php`**

Ganti SELURUH isi file dengan:

```php
<?php

namespace App\Services;

use App\Models\AbsensiDosen;
use App\Models\AbsensiMahasiswa;
use App\Models\Jadwal;
use App\Models\SesiAbsensi;
use Illuminate\Support\Collection;

class AbsensiService
{
    // ── Level 1: Semua jadwal dengan statistik ─────────────────────────────
    public function getJadwalListWithStats(?int $jurusanId, bool $isSuperAdmin): Collection
    {
        return Jadwal::with(['kelas.prodi', 'kelas.mahasiswa', 'dosen', 'ruangan'])
            ->when(
                !$isSuperAdmin && $jurusanId,
                fn($q) => $q->whereHas('kelas.prodi', fn($q2) => $q2->where('jurusan_id', $jurusanId))
            )
            ->orderBy('mata_kuliah')
            ->get()
            ->map(function ($jadwal) {
                $totalSesi       = SesiAbsensi::where('jadwal_id', $jadwal->id)->count();
                $totalMahasiswa  = $jadwal->kelas->mahasiswa->count();
                $persenHadir     = null;

                if ($totalSesi > 0 && $totalMahasiswa > 0) {
                    $totalRecord = $totalSesi * $totalMahasiswa;
                    $totalHadir  = AbsensiMahasiswa::whereHas(
                        'sesi', fn($q) => $q->where('jadwal_id', $jadwal->id)
                    )->where('status', 'hadir')->count();
                    $persenHadir = round($totalHadir / $totalRecord * 100, 1);
                }

                // Status dosen di sesi terakhir
                $sesiTerakhir        = SesiAbsensi::where('jadwal_id', $jadwal->id)->latest('tanggal')->first();
                $statusDosenTerakhir = null;
                if ($sesiTerakhir) {
                    $adosen = AbsensiDosen::where('sesi_id', $sesiTerakhir->id)
                        ->where('dosen_id', $jadwal->dosen_id)->first();
                    $statusDosenTerakhir = $adosen?->status ?? 'belum';
                }

                return [
                    'id'                    => $jadwal->id,
                    'mata_kuliah'           => $jadwal->mata_kuliah,
                    'hari'                  => $jadwal->hari,
                    'jam_mulai'             => substr($jadwal->jam_mulai, 0, 5),
                    'jam_selesai'           => substr($jadwal->jam_selesai, 0, 5),
                    'kelas'                 => $jadwal->kelas->nama ?? '-',
                    'prodi'                 => $jadwal->kelas->prodi->nama ?? '-',
                    'dosen'                 => $jadwal->dosen->nama ?? '-',
                    'ruangan'               => $jadwal->ruangan->nama ?? '-',
                    'total_sesi'            => $totalSesi,
                    'total_mahasiswa'       => $totalMahasiswa,
                    'persen_hadir'          => $persenHadir,
                    'status_dosen_terakhir' => $statusDosenTerakhir,
                ];
            });
    }

    // ── Level 2: Semua sesi per jadwal ─────────────────────────────────────
    public function getSesiListByJadwal(Jadwal $jadwal): array
    {
        $jadwal->loadMissing(['kelas.mahasiswa', 'dosen', 'ruangan']);
        $totalMahasiswa = $jadwal->kelas->mahasiswa->count();

        $sesiList = SesiAbsensi::where('jadwal_id', $jadwal->id)
            ->orderByDesc('tanggal')
            ->get()
            ->map(function ($sesi) use ($jadwal, $totalMahasiswa) {
                $hadir = AbsensiMahasiswa::where('sesi_id', $sesi->id)->where('status', 'hadir')->count();
                $alpa  = AbsensiMahasiswa::where('sesi_id', $sesi->id)->where('status', 'alpa')->count();
                $izin  = AbsensiMahasiswa::where('sesi_id', $sesi->id)->where('status', 'izin')->count();
                $sakit = AbsensiMahasiswa::where('sesi_id', $sesi->id)->where('status', 'sakit')->count();

                $adosen = AbsensiDosen::where('sesi_id', $sesi->id)
                    ->where('dosen_id', $jadwal->dosen_id)->first();

                $tgl = $sesi->tanggal;
                $tglStr = ($tgl instanceof \Carbon\Carbon) ? $tgl->format('Y-m-d') : (string) $tgl;

                return [
                    'id'             => $sesi->id,
                    'tanggal'        => $tglStr,
                    'status'         => $sesi->status,
                    'hadir'          => $hadir,
                    'alpa'           => $alpa,
                    'izin'           => $izin,
                    'sakit'          => $sakit,
                    'total'          => $totalMahasiswa,
                    'persen_hadir'   => $totalMahasiswa > 0 ? round($hadir / $totalMahasiswa * 100, 1) : 0,
                    'status_dosen'   => $adosen?->status ?? 'belum',
                    'dosen_hadir_at' => $adosen?->hadir_at?->format('H:i'),
                ];
            });

        return [
            'jadwal' => [
                'id'                 => $jadwal->id,
                'mata_kuliah'        => $jadwal->mata_kuliah,
                'hari'               => $jadwal->hari,
                'jam_mulai'          => substr($jadwal->jam_mulai, 0, 5),
                'jam_selesai'        => substr($jadwal->jam_selesai, 0, 5),
                'kelas'              => $jadwal->kelas->nama ?? '-',
                'dosen'              => $jadwal->dosen->nama ?? '-',
                'ruangan'            => $jadwal->ruangan->nama ?? '-',
                'total_mahasiswa'    => $totalMahasiswa,
                'window_menit'       => $jadwal->window_menit,
                'window_dosen_menit' => $jadwal->window_dosen_menit,
            ],
            'sesi_list' => $sesiList,
        ];
    }

    // ── Level 3: Detail satu sesi ───────────────────────────────────────────
    public function getSesiDetail(SesiAbsensi $sesi): array
    {
        $jadwal = $sesi->jadwal()->with(['kelas.mahasiswa', 'dosen', 'ruangan'])->first();

        $adosen      = AbsensiDosen::where('sesi_id', $sesi->id)
            ->where('dosen_id', $jadwal->dosen_id)->first();

        $statusDosen = [
            'nama'       => $jadwal->dosen->nama ?? '-',
            'status'     => $adosen?->status ?? 'belum',
            'hadir_at'   => $adosen?->hadir_at?->format('H:i'),
            'confidence' => $adosen?->confidence ? round($adosen->confidence * 100, 1) : null,
            'is_locked'  => $adosen?->is_locked ?? false,
        ];

        $mahasiswaKelas = $jadwal->kelas->mahasiswa ?? collect();
        $absensiMap     = AbsensiMahasiswa::where('sesi_id', $sesi->id)->get()->keyBy('mahasiswa_id');

        $mahasiswaList = $mahasiswaKelas->map(function ($mhs) use ($absensiMap) {
            $ab = $absensiMap->get($mhs->id);
            return [
                'mahasiswa_id' => $mhs->id,
                'nim'          => $mhs->nim,
                'nama'         => $mhs->nama,
                'status'       => $ab?->status ?? 'belum',
                'hadir_at'     => $ab?->hadir_at?->format('H:i:s'),
                'confidence'   => $ab?->confidence ? round($ab->confidence * 100, 1) : null,
                'is_locked'    => $ab?->is_locked ?? false,
            ];
        })->sortBy('nama')->values();

        $tgl = $sesi->tanggal;
        $tglStr = ($tgl instanceof \Carbon\Carbon) ? $tgl->format('Y-m-d') : (string) $tgl;

        return [
            'sesi'          => [
                'id'         => $sesi->id,
                'tanggal'    => $tglStr,
                'status'     => $sesi->status,
                'mulai_at'   => $sesi->mulai_at?->format('H:i'),
                'selesai_at' => $sesi->selesai_at?->format('H:i'),
            ],
            'jadwal'        => [
                'id'          => $jadwal->id,
                'mata_kuliah' => $jadwal->mata_kuliah,
                'kelas'       => $jadwal->kelas->nama ?? '-',
                'ruangan'     => $jadwal->ruangan->nama ?? '-',
            ],
            'dosen'         => $statusDosen,
            'mahasiswa_list'=> $mahasiswaList,
        ];
    }
}
```

**File 2: `app/Http/Controllers/AbsensiController.php`**

Ganti SELURUH isi file dengan:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Jadwal;
use App\Models\SesiAbsensi;
use App\Services\AbsensiService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class AbsensiController extends Controller implements HasMiddleware
{
    public function __construct(private AbsensiService $absensiService) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:absensi index', only: ['index', 'sesiList', 'sesiDetail']),
        ];
    }

    public function index(Request $request)
    {
        $user         = $request->user();
        $jurusanId    = $user->jurusan_id;
        $isSuperAdmin = $user->isSuperAdmin();

        return inertia('absensi/index', [
            'jadwal_list' => $this->absensiService->getJadwalListWithStats($jurusanId, $isSuperAdmin),
        ]);
    }

    public function sesiList(Jadwal $jadwal)
    {
        return inertia('absensi/sesi-list',
            $this->absensiService->getSesiListByJadwal($jadwal)
        );
    }

    public function sesiDetail(Jadwal $jadwal, SesiAbsensi $sesi)
    {
        return inertia('absensi/sesi-detail',
            $this->absensiService->getSesiDetail($sesi)
        );
    }
}
```

**File 3: `routes/web.php`**

Cari baris:
```php
Route::get('absensi', [AbsensiController::class, 'index'])->name('absensi.index');
```

Ganti dengan 3 routes:
```php
Route::get('absensi', [AbsensiController::class, 'index'])->name('absensi.index');
Route::get('absensi/{jadwal}', [AbsensiController::class, 'sesiList'])->name('absensi.sesi-list');
Route::get('absensi/{jadwal}/{sesi}', [AbsensiController::class, 'sesiDetail'])->name('absensi.sesi-detail');
```

Pastikan `AbsensiController` sudah di-import di bagian atas `routes/web.php`.

---

## UX-A02 — Rekap Absensi: Frontend Level 1 (Daftar Jadwal)

**Files yang diubah: 1**

**File: `resources/js/pages/absensi/index.tsx`**

Ganti SELURUH isi file dengan:

```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

interface JadwalRow {
    id: number;
    mata_kuliah: string;
    hari: string;
    jam_mulai: string;
    jam_selesai: string;
    kelas: string;
    prodi: string;
    dosen: string;
    ruangan: string;
    total_sesi: number;
    total_mahasiswa: number;
    persen_hadir: number | null;
    status_dosen_terakhir: string | null;
}

interface Props { jadwal_list: JadwalRow[] }

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Rekap Absensi', href: '/absensi' }];

const HARI_ORDER = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const HARI_LABEL: Record<string, string> = {
    senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu',
    kamis: 'Kamis', jumat: 'Jumat', sabtu: 'Sabtu',
};

function PersenBadge({ persen }: { persen: number | null }) {
    if (persen === null) return <span className="text-sm text-muted-foreground">—</span>;
    const cls = persen >= 80
        ? 'bg-green-50 text-green-700 border-green-200'
        : persen >= 60
        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
        : 'bg-red-50 text-red-700 border-red-200';
    return <Badge variant="outline" className={cls}>{persen}%</Badge>;
}

function DosenBadge({ status }: { status: string | null }) {
    if (!status || status === 'belum')
        return <Badge variant="outline" className="bg-gray-50 text-gray-400 border-gray-200 text-xs">—</Badge>;
    if (status === 'hadir')
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Hadir</Badge>;
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Alpa</Badge>;
}

export default function AbsensiPage({ jadwal_list }: Props) {
    const [search, setSearch] = useState('');
    const [hari, setHari] = useState('semua');

    const filtered = useMemo(() =>
        jadwal_list.filter(j => {
            const matchSearch = !search ||
                j.mata_kuliah.toLowerCase().includes(search.toLowerCase()) ||
                j.kelas.toLowerCase().includes(search.toLowerCase()) ||
                j.dosen.toLowerCase().includes(search.toLowerCase());
            const matchHari = hari === 'semua' || j.hari === hari;
            return matchSearch && matchHari;
        }),
        [jadwal_list, search, hari]
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rekap Absensi" />
            <div className="p-6 space-y-5">

                {/* Header */}
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Rekap Absensi</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {jadwal_list.length} jadwal terdaftar — klik baris untuk detail
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                        <Input
                            className="pl-9 w-72"
                            placeholder="Cari mata kuliah, kelas, dosen..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-1">
                        {['semua', ...HARI_ORDER].map(h => (
                            <Button key={h} size="sm"
                                variant={hari === h ? 'default' : 'outline'}
                                onClick={() => setHari(h)}
                                className="capitalize text-xs">
                                {h === 'semua' ? 'Semua Hari' : HARI_LABEL[h]}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Tabel */}
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>Mata Kuliah</TableHead>
                                <TableHead>Kelas / Prodi</TableHead>
                                <TableHead>Dosen</TableHead>
                                <TableHead>Jadwal</TableHead>
                                <TableHead className="text-center">Sesi</TableHead>
                                <TableHead className="text-center">% Hadir Mhs</TableHead>
                                <TableHead className="text-center">Dosen Terakhir</TableHead>
                                <TableHead className="w-8"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-20">
                                        {jadwal_list.length === 0
                                            ? 'Belum ada jadwal. Tambahkan jadwal terlebih dahulu.'
                                            : 'Tidak ada jadwal yang cocok dengan pencarian.'}
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map(j => (
                                <TableRow key={j.id}
                                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                                    onClick={() => router.get(`/absensi/${j.id}`)}>
                                    <TableCell className="font-medium">{j.mata_kuliah}</TableCell>
                                    <TableCell>
                                        <p className="font-medium text-sm">{j.kelas}</p>
                                        <p className="text-xs text-muted-foreground">{j.prodi}</p>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{j.dosen}</TableCell>
                                    <TableCell>
                                        <p className="text-sm font-medium capitalize">{j.hari}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {j.jam_mulai} – {j.jam_selesai}
                                        </p>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="font-semibold">{j.total_sesi}</span>
                                        <span className="text-xs text-muted-foreground ml-1">pertemuan</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <PersenBadge persen={j.persen_hadir} />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <DosenBadge status={j.status_dosen_terakhir} />
                                    </TableCell>
                                    <TableCell>
                                        <ChevronRight className="size-4 text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
```

---

## UX-A03 — Rekap Absensi: Frontend Level 2 (Daftar Sesi per Jadwal)

**Files yang diubah: 1 (FILE BARU)**

**File baru: `resources/js/pages/absensi/sesi-list.tsx`**

```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, ChevronRight, Clock, Users } from 'lucide-react';

interface JadwalInfo {
    id: number; mata_kuliah: string; hari: string;
    jam_mulai: string; jam_selesai: string;
    kelas: string; dosen: string; ruangan: string;
    total_mahasiswa: number;
    window_menit: number; window_dosen_menit: number;
}
interface SesiRow {
    id: number; tanggal: string; status: string;
    hadir: number; alpa: number; izin: number; sakit: number;
    total: number; persen_hadir: number;
    status_dosen: string; dosen_hadir_at: string | null;
}
interface Props { jadwal: JadwalInfo; sesi_list: SesiRow[] }

function PersenBar({ persen }: { persen: number }) {
    const color = persen >= 80 ? 'bg-green-500' : persen >= 60 ? 'bg-yellow-500' : 'bg-red-500';
    return (
        <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${persen}%` }} />
            </div>
            <span className="text-sm font-medium tabular-nums">{persen}%</span>
        </div>
    );
}

const dosenStatusCfg: Record<string, { label: string; cls: string }> = {
    hadir: { label: 'Hadir', cls: 'bg-green-50 text-green-700 border-green-200' },
    alpa:  { label: 'Alpa',  cls: 'bg-red-50 text-red-700 border-red-200' },
    belum: { label: '—',     cls: 'bg-gray-50 text-gray-400 border-gray-200' },
};

export default function SesiListPage({ jadwal, sesi_list }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Rekap Absensi', href: '/absensi' },
        { title: jadwal.mata_kuliah, href: `/absensi/${jadwal.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Rekap — ${jadwal.mata_kuliah}`} />
            <div className="p-6 space-y-5">

                {/* Header */}
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" className="mt-0.5 shrink-0"
                        onClick={() => router.get('/absensi')}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-xl font-semibold">{jadwal.mata_kuliah}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {jadwal.kelas} · {jadwal.dosen} · {jadwal.ruangan}
                            · <span className="capitalize">{jadwal.hari}</span> {jadwal.jam_mulai}–{jadwal.jam_selesai}
                        </p>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Pertemuan', value: sesi_list.length, icon: Clock, accent: 'border-l-blue-500' },
                        { label: 'Total Mahasiswa', value: jadwal.total_mahasiswa, icon: Users, accent: 'border-l-purple-500' },
                        { label: 'Window Mahasiswa', value: `${jadwal.window_menit} menit`, icon: Clock, accent: 'border-l-green-500' },
                        { label: 'Window Dosen', value: `${jadwal.window_dosen_menit} menit`, icon: Clock, accent: 'border-l-orange-500' },
                    ].map(c => (
                        <Card key={c.label} className={`border-l-4 ${c.accent} overflow-hidden`}>
                            <CardContent className="p-4">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</p>
                                <p className="text-2xl font-bold mt-1">{c.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Tabel Sesi */}
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>Tanggal</TableHead>
                                <TableHead className="text-center text-green-700">Hadir</TableHead>
                                <TableHead className="text-center text-red-700">Alpa</TableHead>
                                <TableHead className="text-center text-blue-700">Izin</TableHead>
                                <TableHead className="text-center text-yellow-700">Sakit</TableHead>
                                <TableHead>% Kehadiran</TableHead>
                                <TableHead className="text-center">Dosen</TableHead>
                                <TableHead>Status Sesi</TableHead>
                                <TableHead className="w-8"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sesi_list.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground py-20">
                                        Belum ada sesi untuk jadwal ini. Sesi akan muncul otomatis saat perkuliahan berlangsung.
                                    </TableCell>
                                </TableRow>
                            ) : sesi_list.map(s => {
                                const dsn = dosenStatusCfg[s.status_dosen] ?? dosenStatusCfg.belum;
                                return (
                                    <TableRow key={s.id}
                                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                                        onClick={() => router.get(`/absensi/${jadwal.id}/${s.id}`)}>
                                        <TableCell className="font-medium">{s.tanggal}</TableCell>
                                        <TableCell className="text-center font-semibold text-green-700">{s.hadir}</TableCell>
                                        <TableCell className="text-center font-semibold text-red-700">{s.alpa}</TableCell>
                                        <TableCell className="text-center font-semibold text-blue-700">{s.izin}</TableCell>
                                        <TableCell className="text-center font-semibold text-yellow-700">{s.sakit}</TableCell>
                                        <TableCell><PersenBar persen={s.persen_hadir} /></TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={`text-xs ${dsn.cls}`}>
                                                {dsn.label}
                                                {s.dosen_hadir_at && (
                                                    <span className="ml-1 opacity-70">{s.dosen_hadir_at}</span>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline"
                                                className={s.status === 'berlangsung'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 text-xs'
                                                    : 'bg-gray-50 text-gray-500 border-gray-200 text-xs'}>
                                                {s.status === 'berlangsung' ? 'Berlangsung' : 'Selesai'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <ChevronRight className="size-4 text-muted-foreground" />
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

## UX-A04 — Rekap Absensi: Frontend Level 3 (Detail Sesi)

**Files yang diubah: 1 (FILE BARU)**

**File baru: `resources/js/pages/absensi/sesi-detail.tsx`**

```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Lock } from 'lucide-react';

interface SesiInfo { id: number; tanggal: string; status: string; mulai_at: string | null; selesai_at: string | null }
interface JadwalInfo { id: number; mata_kuliah: string; kelas: string; ruangan: string }
interface DosenInfo { nama: string; status: string; hadir_at: string | null; confidence: number | null; is_locked: boolean }
interface MahasiswaRow { mahasiswa_id: number; nim: string; nama: string; status: string; hadir_at: string | null; confidence: number | null; is_locked: boolean }
interface Props { sesi: SesiInfo; jadwal: JadwalInfo; dosen: DosenInfo; mahasiswa_list: MahasiswaRow[] }

const mhsStatusCfg: Record<string, { label: string; cls: string }> = {
    hadir: { label: 'Hadir', cls: 'bg-green-50 text-green-700 border-green-200' },
    alpa:  { label: 'Alpa',  cls: 'bg-red-50 text-red-700 border-red-200' },
    izin:  { label: 'Izin',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    sakit: { label: 'Sakit', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    belum: { label: 'Belum', cls: 'bg-gray-50 text-gray-400 border-gray-200' },
};

export default function SesiDetailPage({ sesi, jadwal, dosen, mahasiswa_list }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Rekap Absensi', href: '/absensi' },
        { title: jadwal.mata_kuliah, href: `/absensi/${jadwal.id}` },
        { title: sesi.tanggal, href: `/absensi/${jadwal.id}/${sesi.id}` },
    ];

    const stats = {
        hadir: mahasiswa_list.filter(m => m.status === 'hadir').length,
        alpa:  mahasiswa_list.filter(m => m.status === 'alpa').length,
        izin:  mahasiswa_list.filter(m => m.status === 'izin').length,
        sakit: mahasiswa_list.filter(m => m.status === 'sakit').length,
    };

    const dosenCardCls = dosen.status === 'hadir'
        ? 'border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-950/10'
        : dosen.status === 'alpa'
        ? 'border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-950/10'
        : 'border-l-4 border-l-gray-300';

    const dosenBadgeCls = dosen.status === 'hadir'
        ? 'bg-green-50 text-green-700 border-green-200'
        : dosen.status === 'alpa'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-gray-50 text-gray-400 border-gray-200';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Sesi ${sesi.tanggal} — ${jadwal.mata_kuliah}`} />
            <div className="p-6 space-y-5">

                {/* Header */}
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" className="mt-0.5 shrink-0"
                        onClick={() => router.get(`/absensi/${jadwal.id}`)}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">{jadwal.mata_kuliah}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {jadwal.kelas} · {jadwal.ruangan} · {sesi.tanggal}
                            {sesi.mulai_at && ` · ${sesi.mulai_at}${sesi.selesai_at ? `–${sesi.selesai_at}` : ''}`}
                        </p>
                    </div>
                </div>

                {/* Dosen Card — prominent di atas, full width */}
                <Card className={`overflow-hidden ${dosenCardCls}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                    Kehadiran Dosen
                                </p>
                                <p className="font-semibold text-base">{dosen.nama}</p>
                                {dosen.hadir_at && (
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        Terdeteksi pukul {dosen.hadir_at}
                                        {dosen.confidence && ` · Confidence ${dosen.confidence}%`}
                                    </p>
                                )}
                            </div>
                            <Badge variant="outline" className={`text-sm px-3 py-1 ${dosenBadgeCls}`}>
                                {dosen.status === 'hadir' ? 'Hadir' : dosen.status === 'alpa' ? 'Alpa' : 'Belum Tercatat'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Stat Cards Mahasiswa */}
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: 'Hadir',  value: stats.hadir, accent: 'border-l-green-500',  text: 'text-green-700' },
                        { label: 'Alpa',   value: stats.alpa,  accent: 'border-l-red-500',    text: 'text-red-700' },
                        { label: 'Izin',   value: stats.izin,  accent: 'border-l-blue-500',   text: 'text-blue-700' },
                        { label: 'Sakit',  value: stats.sakit, accent: 'border-l-yellow-500', text: 'text-yellow-700' },
                    ].map(c => (
                        <Card key={c.label} className={`border-l-4 ${c.accent} overflow-hidden`}>
                            <CardContent className="p-4">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</p>
                                <p className={`text-3xl font-bold mt-1 ${c.text}`}>{c.value}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">dari {mahasiswa_list.length} mahasiswa</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Tabel Mahasiswa */}
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>NIM</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Waktu Hadir</TableHead>
                                <TableHead>Confidence</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mahasiswa_list.map(row => {
                                const cfg = mhsStatusCfg[row.status] ?? mhsStatusCfg.belum;
                                return (
                                    <TableRow key={row.mahasiswa_id}>
                                        <TableCell className="font-mono text-sm">{row.nim}</TableCell>
                                        <TableCell className="font-medium">{row.nama}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="outline" className={`text-xs ${cfg.cls}`}>
                                                    {cfg.label}
                                                </Badge>
                                                {row.is_locked && (
                                                    <Lock className="size-3 text-muted-foreground" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm text-muted-foreground">
                                            {row.hadir_at ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {row.confidence != null ? `${row.confidence}%` : '—'}
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

## UX-B01 — Enrollment: Backend (hapus admin upload, tambah detail, auto-approve mahasiswa)

**Files yang diubah: 2**

**File 1: `app/Http/Controllers/EnrollmentController.php`**

**a) HAPUS method `uploadFoto(Mahasiswa $mahasiswa)` sepenuhnya.**
Ini adalah upload foto oleh admin (beda dengan `selfUpload` yang dilakukan mahasiswa sendiri).
Method yang dihapus: yang ada parameter `Mahasiswa $mahasiswa` dan memanggil `$this->enrollmentService->uploadFoto($mahasiswa, ...)`.

**b) UPDATE method `selfVerifyFrame(Request $request)`.**
Setelah baris `$result = $this->enrollmentService->verifyFrame(...)`, tambahkan:
```php
// Auto-approve jika semua 3 jarak lulus
if (($result['semua_jarak_lulus'] ?? false) && $mahasiswa->status_akun === 'pending_verifikasi') {
    $this->enrollmentService->approve($mahasiswa);
    $result['auto_approved'] = true;
}
```

**c) UPDATE method `verifyFrame(Request $request, Mahasiswa $mahasiswa)` (yang dipanggil admin).**
Setelah baris `$result = $this->enrollmentService->verifyFrame(...)`, tambahkan:
```php
// Auto-approve jika semua 3 jarak lulus
if (($result['semua_jarak_lulus'] ?? false) && $mahasiswa->status_akun === 'pending_verifikasi') {
    $this->enrollmentService->approve($mahasiswa);
    $result['auto_approved'] = true;
}
```

**d) TAMBAH method `detail(Mahasiswa $mahasiswa)`:**
```php
public function detail(Mahasiswa $mahasiswa)
{
    $statusData = $this->enrollmentService->status($mahasiswa);

    $fotoPreviews = [];
    if ($mahasiswa->foto_paths) {
        foreach ($mahasiswa->foto_paths as $i => $path) {
            $fotoPreviews[] = [
                'index' => $i,
                'url'   => route('enrollment.foto-preview', ['mahasiswa' => $mahasiswa->id, 'index' => $i]),
            ];
        }
    }

    return inertia('enrollment/detail', [
        'mahasiswa'     => $mahasiswa->load('kelas'),
        'foto_previews' => $fotoPreviews,
        'jarak_lulus'   => $statusData['jarak_lulus'],
        'semua_lulus'   => $statusData['semua_jarak_lulus'],
        'status_akun'   => $mahasiswa->status_akun,
    ]);
}
```

**e) TAMBAH method `fotoPreview(Mahasiswa $mahasiswa, int $index)`:**
```php
public function fotoPreview(Mahasiswa $mahasiswa, int $index)
{
    abort_unless($mahasiswa->foto_paths && isset($mahasiswa->foto_paths[$index]), 404);
    $path = $mahasiswa->foto_paths[$index];
    abort_unless(\Illuminate\Support\Facades\Storage::disk('local')->exists($path), 404);
    return \Illuminate\Support\Facades\Storage::disk('local')->response($path);
}
```

Pastikan ada `use Illuminate\Support\Facades\Storage;` di import jika belum ada.

**File 2: `routes/web.php`**

Di dalam block `prefix('enrollment')`:

**HAPUS** route:
```php
Route::post('{mahasiswa}/upload-foto', [EnrollmentController::class, 'uploadFoto'])->name('upload-foto');
```

**TAMBAH** dua route baru (letakkan di dalam block enrollment yang sama):
```php
Route::get('{mahasiswa}/detail', [EnrollmentController::class, 'detail'])->name('detail');
Route::get('{mahasiswa}/foto/{index}', [EnrollmentController::class, 'fotoPreview'])->name('foto-preview');
```

---

## UX-B02 — Enrollment: Frontend (Tabs Mahasiswa/Dosen + Detail Page)

**Files yang diubah: 3 (2 edit, 1 baru)**

**File 1: `app/Http/Controllers/EnrollmentController.php` — update `index()`**

Tambahkan query dosen ke data yang dikirim. Di dalam method `index()`, setelah query `$mahasiswa`, tambahkan:

```php
use App\Models\Dosen;

$dosenList = Dosen::withCount('enrollmentVerifikasi')
    ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('jurusan_id', $jurusanId))
    ->orderByRaw("FIELD(status_enrollment, 'pending_verifikasi', 'pending_upload', 'aktif')")
    ->orderBy('nama')
    ->get(['id', 'nip', 'nama', 'email', 'status_enrollment']);
```

Dan di return Inertia, tambahkan:
```php
'dosen_list' => $dosenList,
```

**File 2: `resources/js/pages/enrollment/index.tsx`**

Ganti SELURUH isi file dengan halaman baru menggunakan Tabs (Mahasiswa | Dosen).

```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/confirm-dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Kelas, type Mahasiswa } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Eye, RotateCcw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface DosenEnrollment {
    id: number; nip: string; nama: string; email: string;
    status_enrollment: 'pending_upload' | 'pending_verifikasi' | 'aktif';
    enrollment_verifikasi_count: number;
}
type MahasiswaWithCount = Mahasiswa & { enrollment_verifikasi_count: number };

interface Props {
    mahasiswa: { data: MahasiswaWithCount[]; links: any[] };
    dosen_list: DosenEnrollment[];
    kelas: Kelas[];
    filters: { kelas_id?: string };
    flash?: { success?: string; error?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Enrollment', href: '/enrollment' }];

// Status badge configs
const mhsStatusCfg = {
    pending_upload:     { label: 'Belum Upload',  cls: 'bg-gray-50 text-gray-600 border-gray-200' },
    pending_verifikasi: { label: 'Verifikasi',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    aktif:              { label: 'Aktif',          cls: 'bg-green-50 text-green-700 border-green-200' },
} as const;

const dosenStatusCfg = {
    pending_upload:     { label: 'Belum Upload',  cls: 'bg-gray-50 text-gray-600 border-gray-200' },
    pending_verifikasi: { label: 'Verifikasi',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    aktif:              { label: 'Aktif',          cls: 'bg-green-50 text-green-700 border-green-200' },
} as const;

// Komponen visual progress verifikasi 3 jarak
function VerifProgress({ count }: { count: number }) {
    return (
        <div className="flex items-center gap-1">
            {['D', 'S', 'J'].map((label, idx) => (
                <div key={label}
                    className={`w-6 h-6 rounded-full text-[10px] font-semibold flex items-center justify-center border ${
                        count > idx
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-muted border-border text-muted-foreground'
                    }`}>
                    {label}
                </div>
            ))}
        </div>
    );
}

export default function EnrollmentIndex({ mahasiswa, dosen_list, kelas, filters, flash }: Props) {
    const [searchDosen, setSearchDosen] = useState('');
    const [shown] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shown.has(flash.success)) { toast.success(flash.success); shown.add(flash.success); }
        if (flash?.error   && !shown.has(flash.error))   { toast.error(flash.error);   shown.add(flash.error); }
    }, [flash?.success, flash?.error]);

    const filteredDosen = useMemo(() =>
        dosen_list.filter(d =>
            d.nama.toLowerCase().includes(searchDosen.toLowerCase()) ||
            d.nip.toLowerCase().includes(searchDosen.toLowerCase())
        ),
        [dosen_list, searchDosen]
    );

    const mhsPending   = mahasiswa.data.filter(m => m.status_akun !== 'aktif').length;
    const dosenPending = dosen_list.filter(d => d.status_enrollment !== 'aktif').length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Enrollment" />
            <div className="p-6 space-y-5">

                <div>
                    <h1 className="text-xl font-semibold">Enrollment Wajah</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Kelola proses pendaftaran wajah untuk pengenalan otomatis
                    </p>
                </div>

                <Tabs defaultValue="mahasiswa">
                    <TabsList className="mb-1">
                        <TabsTrigger value="mahasiswa" className="gap-2">
                            Mahasiswa
                            {mhsPending > 0 && (
                                <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0">
                                    {mhsPending}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="dosen" className="gap-2">
                            Dosen
                            {dosenPending > 0 && (
                                <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0">
                                    {dosenPending}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Tab Mahasiswa ── */}
                    <TabsContent value="mahasiswa" className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Select value={filters.kelas_id ?? ''}
                                onValueChange={val => {
                                    const p = val && val !== 'all' ? { kelas_id: val } : {};
                                    router.get('/enrollment', p, { preserveState: true });
                                }}>
                                <SelectTrigger className="w-64">
                                    <SelectValue placeholder="Filter kelas..." />
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
                        </div>

                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>NIM</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Kelas</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Verifikasi Jarak</TableHead>
                                        <TableHead className="w-28">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mahasiswa.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground py-16">
                                                Belum ada data mahasiswa.
                                            </TableCell>
                                        </TableRow>
                                    ) : mahasiswa.data.map(mhs => {
                                        const cfg = mhsStatusCfg[mhs.status_akun as keyof typeof mhsStatusCfg] ?? mhsStatusCfg.pending_upload;
                                        return (
                                            <TableRow key={mhs.id}>
                                                <TableCell className="font-mono text-sm">{mhs.nim}</TableCell>
                                                <TableCell className="font-medium">{mhs.nama}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {mhs.kelas?.nama ?? '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`text-xs ${cfg.cls}`}>
                                                        {cfg.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {mhs.status_akun === 'pending_upload'
                                                        ? <span className="text-xs text-muted-foreground">—</span>
                                                        : <VerifProgress count={mhs.enrollment_verifikasi_count} />
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        {mhs.status_akun !== 'pending_upload' && (
                                                            <Button size="sm" variant="outline"
                                                                onClick={() => router.get(`/enrollment/${mhs.id}/detail`)}>
                                                                <Eye className="size-3.5 mr-1" /> Detail
                                                            </Button>
                                                        )}
                                                        {(mhs.status_akun === 'pending_verifikasi' || mhs.status_akun === 'aktif') && (
                                                            <ConfirmDialog
                                                                title="Reset Enrollment?"
                                                                description={`Semua foto dan encoding wajah ${mhs.nama} akan dihapus. Mahasiswa harus mengulang enrollment dari awal.`}
                                                                confirmLabel="Ya, Reset"
                                                                onConfirm={() => router.delete(`/enrollment/${mhs.id}/reset`)}
                                                                trigger={
                                                                    <Button size="sm" variant="outline"
                                                                        className="hover:bg-red-50 hover:text-red-600">
                                                                        <RotateCcw className="size-3.5" />
                                                                    </Button>
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <div className="flex gap-1">
                            {mahasiswa.links.map((link: any, i: number) => (
                                <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm"
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                            ))}
                        </div>
                    </TabsContent>

                    {/* ── Tab Dosen ── */}
                    <TabsContent value="dosen" className="space-y-4">
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="Cari nama atau NIP..."
                                value={searchDosen} onChange={e => setSearchDosen(e.target.value)} />
                        </div>

                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>NIP</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Verifikasi Jarak</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredDosen.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-16">
                                                Belum ada data dosen atau tidak ditemukan.
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredDosen.map(d => {
                                        const cfg = dosenStatusCfg[d.status_enrollment as keyof typeof dosenStatusCfg] ?? dosenStatusCfg.pending_upload;
                                        return (
                                            <TableRow key={d.id}>
                                                <TableCell className="font-mono text-sm">{d.nip}</TableCell>
                                                <TableCell className="font-medium">{d.nama}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{d.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`text-xs ${cfg.cls}`}>
                                                        {cfg.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {d.status_enrollment === 'pending_upload'
                                                        ? <span className="text-xs text-muted-foreground">—</span>
                                                        : <VerifProgress count={d.enrollment_verifikasi_count} />
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
```

**File 3 (BARU): `resources/js/pages/enrollment/detail.tsx`**

```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/confirm-dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface FotoPreview { index: number; url: string }
interface Props {
    mahasiswa: { id: number; nim: string; nama: string; kelas?: { nama: string } };
    foto_previews: FotoPreview[];
    jarak_lulus: Record<string, number>;
    semua_lulus: boolean;
    status_akun: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Enrollment', href: '/enrollment' },
    { title: 'Detail Enrollment', href: '#' },
];

const JARAK = [
    { key: 'dekat', label: 'Jarak Dekat', desc: '~30cm dari kamera' },
    { key: 'sedang', label: 'Jarak Sedang', desc: '~60cm dari kamera' },
    { key: 'jauh', label: 'Jarak Jauh', desc: '~100cm dari kamera' },
];

export default function EnrollmentDetail({ mahasiswa, foto_previews, jarak_lulus, semua_lulus, status_akun }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Enrollment — ${mahasiswa.nama}`} />
            <div className="p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon"
                        onClick={() => router.get('/enrollment')}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">{mahasiswa.nama}</h1>
                        <p className="text-sm text-muted-foreground">
                            {mahasiswa.nim} · {mahasiswa.kelas?.nama ?? '-'}
                        </p>
                    </div>
                    <div className="ml-auto">
                        <Badge variant="outline"
                            className={status_akun === 'aktif'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'}>
                            {status_akun === 'aktif' ? 'Enrollment Aktif' : 'Menunggu Verifikasi'}
                        </Badge>
                    </div>
                </div>

                {/* Two column layout */}
                <div className="grid md:grid-cols-2 gap-5">

                    {/* Foto Preview */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                                Foto Wajah Enrollment ({foto_previews.length}/5)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {foto_previews.length === 0 ? (
                                <div className="text-sm text-muted-foreground text-center py-8">
                                    Belum ada foto yang diupload.
                                </div>
                            ) : (
                                <div className="grid grid-cols-5 gap-2">
                                    {foto_previews.map(f => (
                                        <div key={f.index}
                                            className="aspect-square rounded-lg overflow-hidden border bg-muted">
                                            <img src={f.url} alt={`Foto ${f.index + 1}`}
                                                className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Hasil Verifikasi */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Hasil Verifikasi Wajah</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {JARAK.map(j => {
                                const confidence = jarak_lulus[j.key];
                                const lulus = confidence !== undefined;
                                return (
                                    <div key={j.key}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${
                                            lulus
                                                ? 'bg-green-50 border-green-200 dark:bg-green-950/20'
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

                            {/* Actions */}
                            <div className="pt-3 flex gap-2">
                                {semua_lulus && status_akun !== 'aktif' && (
                                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => router.patch(`/enrollment/${mahasiswa.id}/approve`)}>
                                        <CheckCircle className="size-4 mr-1.5" />
                                        Approve Enrollment
                                    </Button>
                                )}
                                <ConfirmDialog
                                    title="Reset Enrollment?"
                                    description={`Semua foto dan encoding wajah ${mahasiswa.nama} akan dihapus permanen. Mahasiswa harus mengulang enrollment dari awal.`}
                                    confirmLabel="Ya, Reset"
                                    onConfirm={() => router.delete(`/enrollment/${mahasiswa.id}/reset`)}
                                    trigger={
                                        <Button variant="outline"
                                            className="hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                                            Reset Enrollment
                                        </Button>
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
```

---

## UX-C01 — Dashboard: Standardisasi Card Component

**Files yang diubah: 1 (FILE BARU — reusable component)**

**File baru: `resources/js/components/stat-card.tsx`**

Buat komponen card standar yang dipakai di SEMUA dashboard:

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    label: string;
    value: string | number;
    context?: string;
    accent?: 'green' | 'red' | 'blue' | 'yellow' | 'orange' | 'purple' | 'gray';
    icon?: LucideIcon;
    className?: string;
}

const accentMap = {
    green:  'border-l-green-500',
    red:    'border-l-red-500',
    blue:   'border-l-blue-500',
    yellow: 'border-l-yellow-500',
    orange: 'border-l-orange-500',
    purple: 'border-l-purple-500',
    gray:   'border-l-gray-400',
};

const valueColorMap = {
    green:  'text-green-700 dark:text-green-400',
    red:    'text-red-700 dark:text-red-400',
    blue:   'text-blue-700 dark:text-blue-400',
    yellow: 'text-yellow-700 dark:text-yellow-400',
    orange: 'text-orange-700 dark:text-orange-400',
    purple: 'text-purple-700 dark:text-purple-400',
    gray:   'text-gray-600 dark:text-gray-400',
};

export function StatCard({ label, value, context, accent = 'blue', icon: Icon, className }: StatCardProps) {
    return (
        <Card className={cn(`border-l-4 ${accentMap[accent]} overflow-hidden`, className)}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                            {label}
                        </p>
                        <p className={cn('text-3xl font-bold mt-1 tabular-nums', valueColorMap[accent])}>
                            {value}
                        </p>
                        {context && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{context}</p>
                        )}
                    </div>
                    {Icon && (
                        <Icon className="size-8 text-muted-foreground/30 shrink-0 ml-2 mt-0.5" />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
```

---

## UX-C02 — Dashboard Admin Jurusan: Update Backend + Frontend

**Files yang diubah: 2**

**File 1: `app/Services/DashboardService.php`**

Di method `forAdminJurusan(User $user)`, tambahkan query dosen hari ini.
Cari baris `$jid = $user->jurusan_id;` dan setelah itu tambahkan:

```php
// Hari ini untuk scope dosen
$hariMap    = [0=>'minggu',1=>'senin',2=>'selasa',3=>'rabu',4=>'kamis',5=>'jumat',6=>'sabtu'];
$hariIniStr = $hariMap[now('Asia/Jakarta')->dayOfWeek];

$jadwalDosenHariIni = Jadwal::where('hari', $hariIniStr)
    ->where('is_active', true)
    ->whereHas('kelas.prodi', fn($q) => $q->where('jurusan_id', $jid))
    ->with(['dosen'])
    ->get();

$dosenHadirList     = [];
$dosenBelumHadirList = [];

foreach ($jadwalDosenHariIni as $jdl) {
    $sesiHariIni = SesiAbsensi::where('jadwal_id', $jdl->id)
        ->whereDate('tanggal', today())->first();

    $statusDosen = 'belum';
    if ($sesiHariIni) {
        $ab = AbsensiDosen::where('sesi_id', $sesiHariIni->id)
            ->where('dosen_id', $jdl->dosen_id)->first();
        $statusDosen = $ab?->status ?? 'belum';
    }

    $entry = [
        'nama'        => $jdl->dosen->nama ?? '-',
        'mata_kuliah' => $jdl->mata_kuliah,
        'kelas'       => $jdl->kelas->nama ?? '-',
        'jam_mulai'   => substr($jdl->jam_mulai, 0, 5),
        'jam_selesai' => substr($jdl->jam_selesai, 0, 5),
    ];

    if ($statusDosen === 'hadir') {
        $dosenHadirList[] = $entry;
    } else {
        $dosenBelumHadirList[] = $entry;
    }
}

$statDosenHariIni = [
    'total'       => $jadwalDosenHariIni->count(),
    'hadir'       => count($dosenHadirList),
    'belum_hadir' => $dosenBelumHadirList,
];
```

Tambahkan `'stat_dosen_hari_ini' => $statDosenHariIni` ke dalam array `compact()` atau return array di akhir method.

Tambahkan import `use App\Models\AbsensiDosen;` dan `use App\Models\Jadwal;` di atas class jika belum ada.

**File 2: `resources/js/pages/dashboard/admin-jurusan.tsx`**

**a)** Tambahkan interface baru:
```tsx
interface StatDosenHariIni {
    total: number;
    hadir: number;
    belum_hadir: { nama: string; mata_kuliah: string; kelas: string; jam_mulai: string; jam_selesai: string }[];
}
```

**b)** Tambahkan `stat_dosen_hari_ini: StatDosenHariIni` ke Props.

**c)** Import `StatCard` dari `@/components/stat-card`.

**d)** Ganti semua stat cards yang ada (4 card: hadir/alpa/keterangan/enrollment) dengan komponen `StatCard` baru:

Cari bagian render 4 stat cards dan ganti dengan:
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <StatCard label="Hadir Hari Ini"   value={statHadir}       accent="green"  context="mahasiswa hadir" />
    <StatCard label="Alpa Hari Ini"    value={statAlpa}        accent="red"    context="mahasiswa alpa" />
    <StatCard label="Keterangan Masuk" value={statKetPending}  accent="orange" context="menunggu review" />
    <StatCard label="Sudah Enrollment" value={statEnrollment}  accent="purple" context="akun aktif" />
</div>
```

**e)** Tambahkan section dosen setelah stat cards:
```tsx
{/* Dosen Hari Ini */}
{stat_dosen_hari_ini.total > 0 && (
    <Card>
        <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
                <CardTitle className="text-base">Kehadiran Dosen Hari Ini</CardTitle>
                <Badge variant="outline"
                    className={stat_dosen_hari_ini.hadir === stat_dosen_hari_ini.total
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-orange-50 text-orange-700 border-orange-200'}>
                    {stat_dosen_hari_ini.hadir} / {stat_dosen_hari_ini.total} hadir
                </Badge>
            </div>
        </CardHeader>
        <CardContent>
            {stat_dosen_hari_ini.belum_hadir.length === 0 ? (
                <p className="text-sm text-green-700 flex items-center gap-1.5">
                    <CheckCircle className="size-4" /> Semua dosen telah hadir hari ini.
                </p>
            ) : (
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground mb-2">
                        Dosen belum hadir ({stat_dosen_hari_ini.belum_hadir.length}):
                    </p>
                    {stat_dosen_hari_ini.belum_hadir.slice(0, 5).map((d, i) => (
                        <div key={i}
                            className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                            <div>
                                <p className="font-medium">{d.nama}</p>
                                <p className="text-xs text-muted-foreground">
                                    {d.mata_kuliah} · {d.kelas} · {d.jam_mulai}–{d.jam_selesai}
                                </p>
                            </div>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                Belum Hadir
                            </Badge>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
    </Card>
)}
```

Tambahkan `CheckCircle` ke import lucide-react jika belum ada.
Tambahkan import `StatCard` dari `@/components/stat-card`.

---

## UX-C03 — Dashboard Mahasiswa: Hierarki + Jadwal Hari Ini di Atas

**Files yang diubah: 1**

**File: `resources/js/pages/dashboard/mahasiswa.tsx`**

Tujuan: jadwal hari ini dan warning kehadiran harus di PALING ATAS halaman (sebelum stat cards).
Import `StatCard` dari `@/components/stat-card`.

**a)** Ganti 4 stat cards (hadir/alpa/izin/sakit) dengan komponen `StatCard`:
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <StatCard label="Hadir"          value={stat.hadir}    accent="green"  context={`${stat.rata_rata}% rata-rata`} />
    <StatCard label="Alpa"           value={stat.alpa}     accent="red"    context="pertemuan tidak hadir" />
    <StatCard label="Izin"           value={stat.izin}     accent="blue"   context="dengan keterangan" />
    <StatCard label="Sakit"          value={stat.sakit}    accent="yellow" context="dengan keterangan" />
</div>
```

**b)** Pindahkan section `jadwal_hari_ini` ke PALING ATAS, sebelum stat cards.
Jika sudah ada komponen jadwal hari ini di halaman ini, PINDAHKAN ke posisi pertama dalam JSX (setelah `<Head>` tag).

**c)** Tambahkan warning banner jika ada matkul < 80%, letakkan SETELAH jadwal hari ini tapi SEBELUM stat cards:
```tsx
{warning_matkul.length > 0 && (
    <Card className="border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-950/10">
        <CardContent className="p-4">
            <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold text-red-800 text-sm">
                        {warning_matkul.length} mata kuliah kehadiran di bawah 80%
                    </p>
                    <div className="mt-1.5 space-y-0.5">
                        {warning_matkul.map((m, i) => (
                            <p key={i} className="text-xs text-red-700">
                                {m.mata_kuliah} — {m.persen}% ({m.hadir}/{m.total} pertemuan)
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
)}
```

Tambahkan `AlertCircle` ke import lucide-react.

---

## UX-C04 — Dashboard Dosen & Super Admin: Fix Cards

**Files yang diubah: 2**

**File 1: `resources/js/pages/dashboard/dosen.tsx`**

Import `StatCard` dan ganti card stat yang ada (hadir/alpa bulan ini + persentase).

Cari bagian yang menampilkan stat dosen (card hadir, alpa, persen kehadiran) dan ganti dengan:
```tsx
<div className="grid grid-cols-3 gap-4">
    <StatCard
        label="Hadir Bulan Ini"
        value={absensi_stats?.hadir ?? 0}
        accent="green"
        context={`dari ${(absensi_stats?.hadir ?? 0) + (absensi_stats?.alpa ?? 0)} sesi`}
    />
    <StatCard
        label="Alpa Bulan Ini"
        value={absensi_stats?.alpa ?? 0}
        accent="red"
        context="sesi tidak hadir"
    />
    <StatCard
        label="Kehadiran"
        value={(() => {
            const h = absensi_stats?.hadir ?? 0;
            const a = absensi_stats?.alpa ?? 0;
            const total = h + a;
            return total > 0 ? `${Math.round(h / total * 100)}%` : '—';
        })()}
        accent="blue"
        context="persentase bulan ini"
    />
</div>
```

**File 2: `resources/js/pages/dashboard/super-admin.tsx`**

Import `StatCard` dan ganti semua stat cards yang ada.
Cari semua card statistik dan ganti dengan `StatCard` yang sesuai.
Gunakan accent yang masuk akal:
- Total mahasiswa aktif → `accent="green"`
- Rata kehadiran → `accent="blue"`
- Sesi hari ini → `accent="purple"`
- Sesi berlangsung → `accent="orange"`

---

## UX-D01 — Sidebar: Restrukturisasi

**Files yang diubah: 1**

**File: `resources/js/components/app-sidebar.tsx`**

**a)** HAPUS `Enrollment` dari `masterDataItems`.

**b)** BUAT array baru `enrollmentItems`:
```tsx
const enrollmentItems: NavItem[] = [
    {
        title: 'Enrollment Mahasiswa',
        href: '/enrollment',
        icon: ScanFace,
        permissions: ['enrollment index'],
    },
    {
        title: 'Enrollment Wajah',
        href: '/enrollment-dosen',
        icon: ScanFace,
        permissions: ['enrollment_dosen index'],
        roles: ['dosen'],
    },
];
```

**c)** UPDATE `dosenItems` — HAPUS item koreksi admin:
```tsx
const dosenItems: NavItem[] = [
    {
        title: 'Enrollment Wajah',
        href: '/enrollment-dosen',
        icon: ScanFace,
        permissions: ['enrollment_dosen index'],
        roles: ['dosen'],
    },
    {
        title: 'Koreksi Absensi',
        href: '/koreksi-dosen',
        icon: ClipboardList,
        permissions: ['koreksi_dosen create'],
        roles: ['dosen'],
    },
];
```

**d)** UPDATE `absensiItems` — tambahkan koreksi dosen untuk admin:
```tsx
const absensiItems: NavItem[] = [
    {
        title: 'Rekap Absensi',
        href: '/absensi',
        icon: ClipboardList,
        permissions: ['absensi index'],
    },
    {
        title: 'Koreksi Dosen',
        href: '/koreksi-dosen/admin',
        icon: ShieldCheck,
        permissions: ['koreksi_dosen approve'],
    },
];
```

**e)** UPDATE bagian render `<SidebarContent>`:
```tsx
<SidebarContent>
    <NavMain section="Platform"         items={mainNavItems} />
    <NavMain section="Master Data"      items={masterDataItems} />
    <NavMain section="Enrollment"       items={enrollmentItems} />
    <NavMain section="Absensi"          items={absensiItems} />
    <NavMain section="Keterangan"       items={keteranganItems} />
    <NavMain section="Dosen"            items={dosenItems} />
    <NavMain section="Laporan"          items={laporanItems} />
    <NavMain section="User Management"  items={userManagement} />
</SidebarContent>
```

---

## UX-E01 — Build Verifikasi

```bash
cd ta-faiz/Laravel && npm run build
```

**Error yang mungkin muncul dan solusinya:**

| Error | Solusi |
|-------|--------|
| `Cannot find module '@/pages/absensi/sesi-list'` | Cek UX-A03 sudah dibuat |
| `Cannot find module '@/pages/absensi/sesi-detail'` | Cek UX-A04 sudah dibuat |
| `Cannot find module '@/pages/enrollment/detail'` | Cek UX-B02 sudah dibuat |
| `Cannot find module '@/components/stat-card'` | Cek UX-C01 sudah dibuat |
| `Property 'roles' does not exist on type 'Auth'` | Cek FIX-002 types sudah diupdate |
| `Property 'stat_dosen_hari_ini' does not exist` | Cek UX-C02 interface sudah diupdate |
| `Property 'dosen_list' does not exist` | Cek UX-B02 EnrollmentController index sudah diupdate |

---

## Checklist Verifikasi Akhir

Setelah build sukses, test secara manual:

1. **FIX-001**: Export PDF laporan → tidak error, kolom % hadir tampil
2. **FIX-002**: Super Admin login → menu "Enrollment Wajah" dan "Koreksi Absensi" (section Dosen) TIDAK muncul
3. **FIX-003**: Form jadwal ada 2 field window → submit berhasil → cek DB
4. **UX-A**: `/absensi` tampil tabel jadwal langsung → klik baris → daftar sesi → klik sesi → detail dengan dosen card + tabel mahasiswa
5. **UX-B**: `/enrollment` ada 2 tab → tab mahasiswa tidak ada tombol Upload → tombol Detail buka halaman dengan 5 foto preview
6. **UX-C**: Dashboard semua role pakai card dengan left accent bar, tidak ada background warna penuh
7. **UX-C02**: Dashboard admin jurusan ada section kehadiran dosen hari ini
8. **UX-C03**: Dashboard mahasiswa jadwal hari ini muncul PERTAMA sebelum stat cards
9. **UX-D**: Sidebar punya section "Enrollment" terpisah dari Master Data

