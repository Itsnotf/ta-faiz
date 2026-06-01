# Task List — Bug Fix & UX Redesign
*Dibuat: 2 Juni 2026 | Lanjutan dari TASK_LIST_Dosen_Feature.md*

---

## Filosofi Redesign

Setiap halaman harus menjawab satu pertanyaan utama user tanpa perlu input apapun.
Data selalu tampil terlebih dahulu — filter hanya mempersempit, bukan membuka akses.
Hierarki informasi mengikuti urgensi, bukan urutan pembuatan fitur.

---

## Skala Prioritas

| Task | Nama | Prioritas |
|------|------|-----------|
| BUG-001 | Fix window_dosen_menit (form jadwal + InternalController) | 🔴 Critical |
| UX-A01 | Rekap Absensi — Backend (service + controller + routes) | 🔴 P1 |
| UX-A02 | Rekap Absensi — Level 1 Frontend (daftar jadwal) | 🔴 P1 |
| UX-A03 | Rekap Absensi — Level 2 Frontend (daftar sesi per jadwal) | 🔴 P1 |
| UX-A04 | Rekap Absensi — Level 3 Frontend (detail sesi: mahasiswa + dosen) | 🔴 P1 |
| UX-B01 | Enrollment — Backend (hapus admin upload, tambah detail endpoint) | 🟡 P2 |
| UX-B02 | Enrollment — Frontend (tabs Mahasiswa/Dosen + detail sheet) | 🟡 P2 |
| UX-C01 | Dashboard Admin Jurusan — Backend (tambah dosen stats) | 🟡 P2 |
| UX-C02 | Dashboard Admin Jurusan — Frontend update | 🟡 P2 |
| UX-C03 | Dashboard Mahasiswa — Frontend hierarki informasi | 🟢 P3 |
| UX-D01 | Sidebar — Restrukturisasi menu | 🟢 P3 |
| UX-E01 | npm run build — verifikasi build | ✅ Verifikasi |

---

## Detail Task

---

### BUG-001 — Fix window_dosen_menit

**Masalah:** Tabel `jadwal` sudah punya kolom `window_dosen_menit` (dari DOSEN-001) tapi:
1. Form create/edit jadwal tidak ada input untuk field ini
2. `InternalController::recordAbsensi()` memakai `window_menit` untuk semua tipe,
   padahal dosen seharusnya pakai `window_dosen_menit`

**File 1: `app/Http/Requests/StoreJadwalRequest.php`**

Tambahkan satu rule di array `rules()`:

```php
'window_dosen_menit' => ['required', 'integer', 'min:1', 'max:120'],
```

**File 2: `app/Http/Requests/UpdateJadwalRequest.php`**

Tambahkan rule yang sama persis:

```php
'window_dosen_menit' => ['required', 'integer', 'min:1', 'max:120'],
```

**File 3: `app/Http/Controllers/InternalController.php`**

Di dalam method `recordAbsensi()`, cari baris:
```php
$batasWindow = Carbon::parse($sesi->mulai_at)->addMinutes($sesi->jadwal->window_menit);
```

Ganti menjadi:
```php
$windowMenit = $request->type === 'dosen'
    ? $sesi->jadwal->window_dosen_menit
    : $sesi->jadwal->window_menit;
$batasWindow = Carbon::parse($sesi->mulai_at)->addMinutes($windowMenit);
```

**File 4: `resources/js/pages/jadwal/index.tsx`**

Di komponen `FormFields`, cari bagian:
```tsx
<Label>Window (menit)</Label>
<Input type="number" min={1} max={60} value={form.data.window_menit}
    onChange={e => form.setData('window_menit', e.target.value)} />
```

Ganti dengan dua field (pakai grid col-2 yang sudah ada):
```tsx
<div className="space-y-1">
    <Label>Window Mahasiswa (menit)</Label>
    <Input type="number" min={1} max={60}
        value={form.data.window_menit}
        onChange={e => form.setData('window_menit', e.target.value)} />
    <p className="text-xs text-muted-foreground">Waktu toleransi hadir mahasiswa</p>
</div>
<div className="space-y-1">
    <Label>Window Dosen (menit)</Label>
    <Input type="number" min={1} max={120}
        value={form.data.window_dosen_menit}
        onChange={e => form.setData('window_dosen_menit', e.target.value)} />
    <p className="text-xs text-muted-foreground">Waktu toleransi hadir dosen (default 2×)</p>
</div>
```

Tambahkan `window_dosen_menit: '30'` ke `initialForm` (objek default values di atas komponen).

Tambahkan ke `setEditData()` saat populate form edit:
```tsx
window_dosen_menit: String(item.window_dosen_menit ?? 30),
```

**Verifikasi:** Buat jadwal baru → form memiliki 2 field window → submit berhasil.
Cek di DB bahwa `window_dosen_menit` tersimpan sesuai input.

---

### UX-A01 — Rekap Absensi: Backend

**Arsitektur baru:**
```
GET /absensi              → AbsensiController::index()      → daftar semua jadwal + stats
GET /absensi/{jadwal}     → AbsensiController::sesiList()   → daftar sesi per jadwal
GET /absensi/{jadwal}/{sesi} → AbsensiController::sesiDetail() → detail sesi (mhs + dosen)
```

**File 1: `app/Services/AbsensiService.php`**

HAPUS semua method yang ada saat ini (`getKelasList`, `getJadwalByKelas`,
`getSesiByJadwal`, `getRekapSesi`) dan GANTI dengan method-method berikut:

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
    /**
     * Level 1 — Daftar semua jadwal dengan statistik kehadiran.
     * Dipakai oleh AbsensiController::index()
     */
    public function getJadwalListWithStats(?int $jurusanId, bool $isSuperAdmin): Collection
    {
        return Jadwal::with(['kelas.prodi', 'dosen', 'ruangan'])
            ->when(
                !$isSuperAdmin && $jurusanId,
                fn($q) => $q->whereHas('kelas.prodi', fn($q2) => $q2->where('jurusan_id', $jurusanId))
            )
            ->orderBy('mata_kuliah')
            ->get()
            ->map(function ($jadwal) {
                $totalSesi = SesiAbsensi::where('jadwal_id', $jadwal->id)->count();
                $totalMahasiswa = $jadwal->kelas->mahasiswa()->count();

                // Rata-rata kehadiran mahasiswa
                $totalHadir = 0;
                $totalRecord = 0;
                if ($totalSesi > 0 && $totalMahasiswa > 0) {
                    $totalRecord = $totalSesi * $totalMahasiswa;
                    $totalHadir  = AbsensiMahasiswa::whereHas(
                        'sesi', fn($q) => $q->where('jadwal_id', $jadwal->id)
                    )->where('status', 'hadir')->count();
                }
                $persenHadir = $totalRecord > 0 ? round($totalHadir / $totalRecord * 100, 1) : null;

                // Status dosen sesi terakhir
                $sesiTerakhir = SesiAbsensi::where('jadwal_id', $jadwal->id)
                    ->latest('tanggal')->first();
                $statusDosenTerakhir = null;
                if ($sesiTerakhir) {
                    $absensiDosen = AbsensiDosen::where('sesi_id', $sesiTerakhir->id)
                        ->where('dosen_id', $jadwal->dosen_id)
                        ->first();
                    $statusDosenTerakhir = $absensiDosen?->status ?? 'belum';
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

    /**
     * Level 2 — Daftar sesi per jadwal.
     * Dipakai oleh AbsensiController::sesiList()
     */
    public function getSesiListByJadwal(Jadwal $jadwal): array
    {
        $totalMahasiswa = $jadwal->kelas->mahasiswa()->count();

        $sesiList = SesiAbsensi::where('jadwal_id', $jadwal->id)
            ->orderByDesc('tanggal')
            ->get()
            ->map(function ($sesi) use ($jadwal, $totalMahasiswa) {
                $hadir = AbsensiMahasiswa::where('sesi_id', $sesi->id)->where('status', 'hadir')->count();
                $alpa  = AbsensiMahasiswa::where('sesi_id', $sesi->id)->where('status', 'alpa')->count();
                $izin  = AbsensiMahasiswa::where('sesi_id', $sesi->id)->where('status', 'izin')->count();
                $sakit = AbsensiMahasiswa::where('sesi_id', $sesi->id)->where('status', 'sakit')->count();

                $absensiDosen = AbsensiDosen::where('sesi_id', $sesi->id)
                    ->where('dosen_id', $jadwal->dosen_id)
                    ->first();

                return [
                    'id'           => $sesi->id,
                    'tanggal'      => $sesi->tanggal instanceof \Carbon\Carbon
                        ? $sesi->tanggal->format('Y-m-d')
                        : (string) $sesi->tanggal,
                    'status'       => $sesi->status,
                    'hadir'        => $hadir,
                    'alpa'         => $alpa,
                    'izin'         => $izin,
                    'sakit'        => $sakit,
                    'total'        => $totalMahasiswa,
                    'persen_hadir' => $totalMahasiswa > 0 ? round($hadir / $totalMahasiswa * 100, 1) : 0,
                    'status_dosen' => $absensiDosen?->status ?? 'belum',
                    'dosen_hadir_at' => $absensiDosen?->hadir_at?->format('H:i'),
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

    /**
     * Level 3 — Detail satu sesi: daftar mahasiswa + status dosen.
     * Dipakai oleh AbsensiController::sesiDetail()
     */
    public function getSesiDetail(SesiAbsensi $sesi): array
    {
        $jadwal = $sesi->jadwal()->with(['kelas.mahasiswa', 'dosen', 'ruangan'])->first();

        // Status dosen di sesi ini
        $absensiDosen = AbsensiDosen::where('sesi_id', $sesi->id)
            ->where('dosen_id', $jadwal->dosen_id)
            ->first();

        $statusDosen = [
            'nama'        => $jadwal->dosen->nama ?? '-',
            'status'      => $absensiDosen?->status ?? 'belum',
            'hadir_at'    => $absensiDosen?->hadir_at?->format('H:i'),
            'confidence'  => $absensiDosen?->confidence
                ? round($absensiDosen->confidence * 100, 1) : null,
            'is_locked'   => $absensiDosen?->is_locked ?? false,
        ];

        // Daftar mahasiswa
        $mahasiswaKelas = $jadwal->kelas->mahasiswa ?? collect();
        $absensiMap = AbsensiMahasiswa::where('sesi_id', $sesi->id)
            ->get()->keyBy('mahasiswa_id');

        $mahasiswaList = $mahasiswaKelas->map(function ($mhs) use ($absensiMap) {
            $absensi = $absensiMap->get($mhs->id);
            return [
                'mahasiswa_id' => $mhs->id,
                'nim'          => $mhs->nim,
                'nama'         => $mhs->nama,
                'status'       => $absensi?->status ?? 'belum',
                'hadir_at'     => $absensi?->hadir_at?->format('H:i:s'),
                'confidence'   => $absensi?->confidence
                    ? round($absensi->confidence * 100, 1) : null,
                'is_locked'    => $absensi?->is_locked ?? false,
            ];
        })->sortBy('nama')->values();

        return [
            'sesi' => [
                'id'         => $sesi->id,
                'tanggal'    => $sesi->tanggal instanceof \Carbon\Carbon
                    ? $sesi->tanggal->format('Y-m-d')
                    : (string) $sesi->tanggal,
                'status'     => $sesi->status,
                'mulai_at'   => $sesi->mulai_at?->format('H:i'),
                'selesai_at' => $sesi->selesai_at?->format('H:i'),
            ],
            'jadwal' => [
                'id'          => $jadwal->id,
                'mata_kuliah' => $jadwal->mata_kuliah,
                'kelas'       => $jadwal->kelas->nama ?? '-',
                'ruangan'     => $jadwal->ruangan->nama ?? '-',
            ],
            'dosen'           => $statusDosen,
            'mahasiswa_list'  => $mahasiswaList,
        ];
    }
}
```

**File 2: `app/Http/Controllers/AbsensiController.php`**

Ganti seluruh isi file dengan:

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

    // Level 1: Daftar semua jadwal dengan statistik
    public function index(Request $request)
    {
        $user         = $request->user();
        $jurusanId    = $user->jurusan_id;
        $isSuperAdmin = $user->isSuperAdmin();

        $jadwalList = $this->absensiService->getJadwalListWithStats($jurusanId, $isSuperAdmin);

        return inertia('absensi/index', [
            'jadwal_list' => $jadwalList,
        ]);
    }

    // Level 2: Daftar sesi per jadwal
    public function sesiList(Jadwal $jadwal)
    {
        $data = $this->absensiService->getSesiListByJadwal($jadwal->load(['kelas.mahasiswa', 'dosen', 'ruangan']));

        return inertia('absensi/sesi-list', $data);
    }

    // Level 3: Detail satu sesi
    public function sesiDetail(Jadwal $jadwal, SesiAbsensi $sesi)
    {
        $data = $this->absensiService->getSesiDetail($sesi->load('jadwal'));

        return inertia('absensi/sesi-detail', $data);
    }
}
```

**File 3: `routes/web.php`**

Cari baris:
```php
Route::get('absensi', [AbsensiController::class, 'index'])->name('absensi.index');
```

Ganti dengan tiga routes:
```php
Route::get('absensi', [AbsensiController::class, 'index'])->name('absensi.index');
Route::get('absensi/{jadwal}', [AbsensiController::class, 'sesiList'])->name('absensi.sesi-list');
Route::get('absensi/{jadwal}/{sesi}', [AbsensiController::class, 'sesiDetail'])->name('absensi.sesi-detail');
```

---

### UX-A02 — Rekap Absensi: Level 1 Frontend (Daftar Jadwal)

**File:** `resources/js/pages/absensi/index.tsx`

Ganti seluruh isi file dengan halaman baru. Konsep: tabel semua jadwal tampil langsung
tanpa perlu filter. Search bar dan filter hari tersedia sebagai penyempurna, bukan syarat.
Persentase kehadiran diberi warna: ≥80% hijau, 60-79% kuning, <60% merah.

```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronRight, Search } from 'lucide-react';
import { useState, useMemo } from 'react';

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

interface Props {
    jadwal_list: JadwalRow[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Rekap Absensi', href: '/absensi' }];

const HARI_ORDER = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const HARI_LABELS: Record<string, string> = {
    senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu',
    kamis: 'Kamis', jumat: 'Jumat', sabtu: 'Sabtu',
};

function PersenBadge({ persen }: { persen: number | null }) {
    if (persen === null) return <span className="text-sm text-muted-foreground">—</span>;
    const cls = persen >= 80
        ? 'bg-green-100 text-green-800 border-green-200'
        : persen >= 60
        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
        : 'bg-red-100 text-red-800 border-red-200';
    return <Badge variant="outline" className={cls}>{persen}%</Badge>;
}

function DosenStatusBadge({ status }: { status: string | null }) {
    if (!status || status === 'belum') return (
        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 text-xs">—</Badge>
    );
    if (status === 'hadir') return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs">Hadir</Badge>
    );
    return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">Alpa</Badge>
    );
}

export default function AbsensiPage({ jadwal_list }: Props) {
    const [search, setSearch] = useState('');
    const [filterHari, setFilterHari] = useState<string>('semua');

    const filtered = useMemo(() => {
        return jadwal_list.filter(j => {
            const matchSearch = search === '' ||
                j.mata_kuliah.toLowerCase().includes(search.toLowerCase()) ||
                j.kelas.toLowerCase().includes(search.toLowerCase()) ||
                j.dosen.toLowerCase().includes(search.toLowerCase());
            const matchHari = filterHari === 'semua' || j.hari === filterHari;
            return matchSearch && matchHari;
        });
    }, [jadwal_list, search, filterHari]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rekap Absensi" />
            <div className="p-4 space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-semibold">Rekap Absensi</h1>
                        <p className="text-sm text-muted-foreground">
                            {jadwal_list.length} jadwal — klik baris untuk melihat rekap per sesi
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                        <Input
                            className="pl-8"
                            placeholder="Cari mata kuliah, kelas, dosen..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-1">
                        {['semua', ...HARI_ORDER].map(h => (
                            <Button
                                key={h}
                                size="sm"
                                variant={filterHari === h ? 'default' : 'outline'}
                                onClick={() => setFilterHari(h)}
                                className="capitalize"
                            >
                                {h === 'semua' ? 'Semua' : HARI_LABELS[h]}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Tabel Jadwal */}
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Mata Kuliah</TableHead>
                                <TableHead>Kelas / Prodi</TableHead>
                                <TableHead>Dosen</TableHead>
                                <TableHead>Jadwal</TableHead>
                                <TableHead className="text-center">Total Sesi</TableHead>
                                <TableHead className="text-center">% Hadir Mhs</TableHead>
                                <TableHead className="text-center">Dosen Sesi Terakhir</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-16">
                                        {jadwal_list.length === 0
                                            ? 'Belum ada jadwal yang tersedia.'
                                            : 'Tidak ada jadwal yang cocok dengan filter.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map(j => (
                                    <TableRow
                                        key={j.id}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => router.get(`/absensi/${j.id}`)}
                                    >
                                        <TableCell className="font-medium">{j.mata_kuliah}</TableCell>
                                        <TableCell>
                                            <p className="font-medium text-sm">{j.kelas}</p>
                                            <p className="text-xs text-muted-foreground">{j.prodi}</p>
                                        </TableCell>
                                        <TableCell className="text-sm">{j.dosen}</TableCell>
                                        <TableCell>
                                            <p className="text-sm font-medium capitalize">{j.hari}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {j.jam_mulai} – {j.jam_selesai}
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="font-medium">{j.total_sesi}</span>
                                            <span className="text-xs text-muted-foreground ml-1">pertemuan</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <PersenBadge persen={j.persen_hadir} />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <DosenStatusBadge status={j.status_dosen_terakhir} />
                                        </TableCell>
                                        <TableCell>
                                            <ChevronRight className="size-4 text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
```

---

### UX-A03 — Rekap Absensi: Level 2 Frontend (Daftar Sesi per Jadwal)

**File baru:** `resources/js/pages/absensi/sesi-list.tsx`

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

interface Props {
    jadwal: JadwalInfo;
    sesi_list: SesiRow[];
}

const dosenStatusConfig: Record<string, { label: string; className: string }> = {
    hadir: { label: 'Hadir', className: 'bg-green-100 text-green-800 border-green-200' },
    alpa:  { label: 'Alpa',  className: 'bg-red-100 text-red-800 border-red-200' },
    belum: { label: 'Belum', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function PersenBar({ persen }: { persen: number }) {
    const color = persen >= 80 ? 'bg-green-500' : persen >= 60 ? 'bg-yellow-500' : 'bg-red-500';
    return (
        <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${persen}%` }} />
            </div>
            <span className="text-sm font-medium">{persen}%</span>
        </div>
    );
}

export default function SesiListPage({ jadwal, sesi_list }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Rekap Absensi', href: '/absensi' },
        { title: jadwal.mata_kuliah, href: `/absensi/${jadwal.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Rekap — ${jadwal.mata_kuliah}`} />
            <div className="p-4 space-y-4">

                {/* Back + Header */}
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" className="mt-0.5 shrink-0"
                        onClick={() => router.get('/absensi')}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold">{jadwal.mata_kuliah}</h1>
                        <p className="text-sm text-muted-foreground">
                            {jadwal.kelas} · {jadwal.dosen} · {jadwal.ruangan}
                            · <span className="capitalize">{jadwal.hari}</span> {jadwal.jam_mulai}–{jadwal.jam_selesai}
                        </p>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Pertemuan', value: sesi_list.length, icon: Clock },
                        { label: 'Total Mahasiswa', value: jadwal.total_mahasiswa, icon: Users },
                        { label: 'Window Mahasiswa', value: `${jadwal.window_menit} menit`, icon: Clock },
                        { label: 'Window Dosen', value: `${jadwal.window_dosen_menit} menit`, icon: Clock },
                    ].map(c => (
                        <Card key={c.label} className="border-border/50">
                            <CardContent className="p-3">
                                <p className="text-xs text-muted-foreground">{c.label}</p>
                                <p className="text-xl font-bold mt-0.5">{c.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Tabel Sesi */}
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Tanggal</TableHead>
                                <TableHead className="text-center">Hadir</TableHead>
                                <TableHead className="text-center">Alpa</TableHead>
                                <TableHead className="text-center">Izin</TableHead>
                                <TableHead className="text-center">Sakit</TableHead>
                                <TableHead>% Kehadiran</TableHead>
                                <TableHead className="text-center">Status Dosen</TableHead>
                                <TableHead>Status Sesi</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sesi_list.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground py-16">
                                        Belum ada sesi yang berlangsung untuk jadwal ini.
                                        Sesi akan muncul otomatis saat jadwal berlangsung.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sesi_list.map(s => {
                                    const dosenCfg = dosenStatusConfig[s.status_dosen] ?? dosenStatusConfig.belum;
                                    return (
                                        <TableRow key={s.id}
                                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() => router.get(`/absensi/${jadwal.id}/${s.id}`)}>
                                            <TableCell className="font-medium">{s.tanggal}</TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-green-700 font-medium">{s.hadir}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-red-700 font-medium">{s.alpa}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-blue-700 font-medium">{s.izin}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-yellow-700 font-medium">{s.sakit}</span>
                                            </TableCell>
                                            <TableCell><PersenBar persen={s.persen_hadir} /></TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className={dosenCfg.className}>
                                                    {dosenCfg.label}
                                                    {s.dosen_hadir_at && (
                                                        <span className="ml-1 opacity-70">{s.dosen_hadir_at}</span>
                                                    )}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline"
                                                    className={s.status === 'berlangsung'
                                                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                                                        : 'bg-gray-100 text-gray-600 border-gray-200'}>
                                                    {s.status === 'berlangsung' ? 'Berlangsung' : 'Selesai'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <ChevronRight className="size-4 text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
```

---

### UX-A04 — Rekap Absensi: Level 3 Frontend (Detail Sesi)

**File baru:** `resources/js/pages/absensi/sesi-detail.tsx`

```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Lock } from 'lucide-react';

interface SesiInfo {
    id: number; tanggal: string; status: string;
    mulai_at: string | null; selesai_at: string | null;
}
interface JadwalInfo { id: number; mata_kuliah: string; kelas: string; ruangan: string; }
interface DosenInfo {
    nama: string; status: string; hadir_at: string | null;
    confidence: number | null; is_locked: boolean;
}
interface MahasiswaRow {
    mahasiswa_id: number; nim: string; nama: string;
    status: string; hadir_at: string | null;
    confidence: number | null; is_locked: boolean;
}
interface Props {
    sesi: SesiInfo; jadwal: JadwalInfo;
    dosen: DosenInfo; mahasiswa_list: MahasiswaRow[];
}

const mhsStatusConfig: Record<string, { label: string; className: string }> = {
    hadir: { label: 'Hadir',  className: 'bg-green-100 text-green-800 border-green-200' },
    alpa:  { label: 'Alpa',   className: 'bg-red-100 text-red-800 border-red-200' },
    izin:  { label: 'Izin',   className: 'bg-blue-100 text-blue-800 border-blue-200' },
    sakit: { label: 'Sakit',  className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    belum: { label: 'Belum',  className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export default function SesiDetailPage({ sesi, jadwal, dosen, mahasiswa_list }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Rekap Absensi', href: '/absensi' },
        { title: jadwal.mata_kuliah, href: `/absensi/${jadwal.id}` },
        { title: sesi.tanggal, href: `/absensi/${jadwal.id}/${sesi.id}` },
    ];

    const dosenStatusCfg = dosen.status === 'hadir'
        ? { label: 'Hadir', className: 'bg-green-100 text-green-800 border-green-200' }
        : dosen.status === 'alpa'
        ? { label: 'Alpa', className: 'bg-red-100 text-red-800 border-red-200' }
        : { label: 'Belum Tercatat', className: 'bg-gray-100 text-gray-500 border-gray-200' };

    const stats = {
        hadir: mahasiswa_list.filter(m => m.status === 'hadir').length,
        alpa:  mahasiswa_list.filter(m => m.status === 'alpa').length,
        izin:  mahasiswa_list.filter(m => m.status === 'izin').length,
        sakit: mahasiswa_list.filter(m => m.status === 'sakit').length,
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detail Sesi — ${sesi.tanggal}`} />
            <div className="p-4 space-y-4">

                {/* Back + Header */}
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" className="mt-0.5 shrink-0"
                        onClick={() => router.get(`/absensi/${jadwal.id}`)}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold">{jadwal.mata_kuliah}</h1>
                        <p className="text-sm text-muted-foreground">
                            {jadwal.kelas} · {jadwal.ruangan} · {sesi.tanggal}
                            {sesi.mulai_at && ` · ${sesi.mulai_at}${sesi.selesai_at ? `–${sesi.selesai_at}` : ''}`}
                        </p>
                    </div>
                </div>

                {/* Dosen Card — prominent di atas */}
                <Card className={`border-2 ${
                    dosen.status === 'hadir' ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20'
                    : dosen.status === 'alpa' ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
                    : 'border-border'
                }`}>
                    <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Kehadiran Dosen
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold">{dosen.nama}</p>
                                {dosen.hadir_at && (
                                    <p className="text-sm text-muted-foreground">
                                        Terdeteksi pukul {dosen.hadir_at}
                                        {dosen.confidence && ` · Confidence: ${dosen.confidence}%`}
                                    </p>
                                )}
                            </div>
                            <Badge variant="outline" className={`text-sm px-3 py-1 ${dosenStatusCfg.className}`}>
                                {dosenStatusCfg.label}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Mahasiswa */}
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: 'Hadir',  value: stats.hadir, cls: 'text-green-700 bg-green-50 border-green-200' },
                        { label: 'Alpa',   value: stats.alpa,  cls: 'text-red-700 bg-red-50 border-red-200' },
                        { label: 'Izin',   value: stats.izin,  cls: 'text-blue-700 bg-blue-50 border-blue-200' },
                        { label: 'Sakit',  value: stats.sakit, cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
                    ].map(c => (
                        <div key={c.label} className={`rounded-xl border p-3 text-center ${c.cls}`}>
                            <p className="text-2xl font-bold">{c.value}</p>
                            <p className="text-xs mt-0.5">{c.label} / {mahasiswa_list.length}</p>
                        </div>
                    ))}
                </div>

                {/* Tabel Mahasiswa */}
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>NIM</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Waktu Hadir</TableHead>
                                <TableHead>Confidence</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mahasiswa_list.map(row => {
                                const cfg = mhsStatusConfig[row.status] ?? mhsStatusConfig.belum;
                                return (
                                    <TableRow key={row.mahasiswa_id}>
                                        <TableCell className="font-mono text-sm">{row.nim}</TableCell>
                                        <TableCell className="font-medium">{row.nama}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="outline" className={cfg.className}>
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

### UX-B01 — Enrollment: Backend

**Masalah yang diperbaiki:**
1. Hapus route admin upload foto mahasiswa (mahasiswa upload sendiri, admin tidak perlu)
2. Tambah endpoint `detail()` yang mengembalikan 5 foto + hasil verifikasi per jarak
3. Mahasiswa auto-approve setelah 3 jarak lulus (sama seperti dosen) — hapus langkah manual

**File 1: `app/Http/Controllers/EnrollmentController.php`**

**a) Hapus method `uploadFoto(Mahasiswa $mahasiswa)` sepenuhnya** — method ini adalah upload oleh admin,
bukan self-upload mahasiswa. `selfUpload()` untuk mahasiswa tetap ada.

**b) Tambah method `detail()`:**

```php
public function detail(Mahasiswa $mahasiswa)
{
    $statusData = $this->enrollmentService->status($mahasiswa);

    // Buat URL foto untuk preview (foto disimpan di disk local/private)
    $fotoPreviews = [];
    if ($mahasiswa->foto_paths) {
        foreach ($mahasiswa->foto_paths as $i => $path) {
            $fotoPreviews[] = [
                'index' => $i + 1,
                'url'   => route('enrollment.foto-preview', ['mahasiswa' => $mahasiswa->id, 'index' => $i]),
            ];
        }
    }

    return inertia('enrollment/detail', [
        'mahasiswa'    => $mahasiswa->load('kelas'),
        'foto_previews'=> $fotoPreviews,
        'jarak_lulus'  => $statusData['jarak_lulus'],
        'semua_lulus'  => $statusData['semua_jarak_lulus'],
        'status_akun'  => $mahasiswa->status_akun,
    ]);
}

public function fotoPreview(Mahasiswa $mahasiswa, int $index)
{
    abort_unless($mahasiswa->foto_paths && isset($mahasiswa->foto_paths[$index]), 404);
    $path = $mahasiswa->foto_paths[$index];
    abort_unless(Storage::disk('local')->exists($path), 404);
    return Storage::disk('local')->response($path);
}
```

Tambahkan `use Illuminate\Support\Facades\Storage;` di bagian import.

**c) Update method `verifyFrame(Mahasiswa $mahasiswa)` — tambah auto-approve:**

Cari method `verifyFrame` di EnrollmentController dan setelah pemanggilan `$this->enrollmentService->verifyFrame(...)`, tambahkan:

```php
// Auto-approve jika semua 3 jarak sudah lulus
if ($result['semua_jarak_lulus'] && $mahasiswa->status_akun === 'pending_verifikasi') {
    $this->enrollmentService->approve($mahasiswa);
    $result['auto_approved'] = true;
}
```

Lakukan hal yang sama untuk method `selfVerifyFrame()`.

**File 2: `routes/web.php`**

Di dalam block enrollment, **HAPUS** route:
```php
Route::post('{mahasiswa}/upload-foto', [EnrollmentController::class, 'uploadFoto'])->name('upload-foto');
```

**TAMBAHKAN** dua route baru:
```php
Route::get('{mahasiswa}/detail', [EnrollmentController::class, 'detail'])->name('detail');
Route::get('{mahasiswa}/foto/{index}', [EnrollmentController::class, 'fotoPreview'])->name('foto-preview');
```

**HAPUS juga route** `patch('{mahasiswa}/approve')` dari daftar routes — tidak diperlukan lagi karena auto-approve.

**Catatan:** `EnrollmentService::approve()` tetap ada — dipakai oleh auto-approve, bukan lagi oleh route manual.

---

### UX-B02 — Enrollment: Frontend (Tabs + Detail)

**File 1: `resources/js/pages/enrollment/index.tsx`**

Ganti seluruh isi file. Halaman baru menggunakan Tabs (Mahasiswa | Dosen).
Tab Mahasiswa: tabel tanpa tombol "Upload Foto", tanpa tombol "Approve" langsung.
Hanya ada tombol "Detail" yang mengarah ke halaman detail.
Tab Dosen: tabel enrollment dosen (mirip struktur yang sudah ada di enrollment-dosen/index.tsx).

```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Kelas, type Mahasiswa } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Eye, RotateCcw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';

// Tipe Dosen untuk tab dosen
interface DosenEnrollment {
    id: number; nip: string; nama: string; email: string;
    kelas_nama?: string;
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

const mhsStatusConfig = {
    pending_upload:     { label: 'Belum Upload',    className: 'bg-gray-100 text-gray-700 border-gray-200' },
    pending_verifikasi: { label: 'Verifikasi',      className: 'bg-blue-100 text-blue-800 border-blue-200' },
    aktif:              { label: 'Aktif',            className: 'bg-green-100 text-green-800 border-green-200' },
} as const;

const dosenStatusConfig = {
    pending_upload:     { label: 'Belum Upload',    className: 'bg-gray-100 text-gray-700 border-gray-200' },
    pending_verifikasi: { label: 'Verifikasi',      className: 'bg-blue-100 text-blue-800 border-blue-200' },
    aktif:              { label: 'Aktif',            className: 'bg-green-100 text-green-800 border-green-200' },
} as const;

export default function EnrollmentIndex({ mahasiswa, dosen_list, kelas, filters, flash }: Props) {
    const [searchDosen, setSearchDosen] = useState('');
    const [shownMessages] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shownMessages.has(flash.success)) {
            toast.success(flash.success);
            shownMessages.add(flash.success);
        }
        if (flash?.error && !shownMessages.has(flash.error)) {
            toast.error(flash.error);
            shownMessages.add(flash.error);
        }
    }, [flash?.success, flash?.error]);

    const filteredDosen = dosen_list.filter(d =>
        d.nama.toLowerCase().includes(searchDosen.toLowerCase()) ||
        d.nip.toLowerCase().includes(searchDosen.toLowerCase())
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Enrollment" />
            <div className="p-4 space-y-4">
                <div>
                    <h1 className="text-lg font-semibold">Enrollment Wajah</h1>
                    <p className="text-sm text-muted-foreground">
                        Kelola proses pendaftaran wajah mahasiswa dan dosen
                    </p>
                </div>

                <Tabs defaultValue="mahasiswa">
                    <TabsList>
                        <TabsTrigger value="mahasiswa">
                            Mahasiswa
                            <Badge variant="secondary" className="ml-2 text-xs">
                                {mahasiswa.data.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="dosen">
                            Dosen
                            <Badge variant="secondary" className="ml-2 text-xs">
                                {dosen_list.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Tab Mahasiswa ── */}
                    <TabsContent value="mahasiswa" className="space-y-3 mt-3">
                        <div className="flex items-center gap-3">
                            <Select value={filters.kelas_id ?? ''}
                                onValueChange={val => {
                                    const params = val && val !== 'all' ? { kelas_id: val } : {};
                                    router.get('/enrollment', params, { preserveState: true });
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
                                    <TableRow className="bg-muted/50">
                                        <TableHead>NIM</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Kelas</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Verifikasi</TableHead>
                                        <TableHead className="w-32">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mahasiswa.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                                                Belum ada data mahasiswa.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        mahasiswa.data.map(mhs => {
                                            const cfg = mhsStatusConfig[mhs.status_akun as keyof typeof mhsStatusConfig]
                                                ?? mhsStatusConfig.pending_upload;
                                            return (
                                                <TableRow key={mhs.id}>
                                                    <TableCell className="font-mono text-sm">{mhs.nim}</TableCell>
                                                    <TableCell className="font-medium">{mhs.nama}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {mhs.kelas?.nama ?? '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={cfg.className}>
                                                            {cfg.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {mhs.status_akun === 'pending_upload' ? (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                {['dekat','sedang','jauh'].map(j => (
                                                                    <div key={j}
                                                                        className={`w-5 h-5 rounded-full border text-[10px] flex items-center justify-center font-medium ${
                                                                            mhs.enrollment_verifikasi_count > ['dekat','sedang','jauh'].indexOf(j)
                                                                                ? 'bg-green-500 border-green-500 text-white'
                                                                                : 'bg-muted border-border text-muted-foreground'
                                                                        }`}>
                                                                        {['D','S','J'][['dekat','sedang','jauh'].indexOf(j)]}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1.5">
                                                            {mhs.status_akun !== 'pending_upload' && (
                                                                <Button size="sm" variant="outline"
                                                                    onClick={() => router.get(`/enrollment/${mhs.id}/detail`)}>
                                                                    <Eye className="size-3.5 mr-1" /> Detail
                                                                </Button>
                                                            )}
                                                            {(mhs.status_akun === 'pending_verifikasi' || mhs.status_akun === 'aktif') && (
                                                                <ConfirmDialog
                                                                    title="Reset Enrollment?"
                                                                    description="Semua foto dan encoding wajah mahasiswa ini akan dihapus. Mahasiswa harus mengulang proses enrollment dari awal."
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
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

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
                    <TabsContent value="dosen" className="space-y-3 mt-3">
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input className="pl-8" placeholder="Cari dosen..."
                                value={searchDosen} onChange={e => setSearchDosen(e.target.value)} />
                        </div>

                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>NIP</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Verifikasi</TableHead>
                                        <TableHead className="w-32">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredDosen.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                                                Belum ada data dosen.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredDosen.map(d => {
                                            const cfg = dosenStatusConfig[d.status_enrollment as keyof typeof dosenStatusConfig]
                                                ?? dosenStatusConfig.pending_upload;
                                            return (
                                                <TableRow key={d.id}>
                                                    <TableCell className="font-mono text-sm">{d.nip}</TableCell>
                                                    <TableCell className="font-medium">{d.nama}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={cfg.className}>
                                                            {cfg.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {d.status_enrollment === 'pending_upload' ? (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                {['dekat','sedang','jauh'].map((j, idx) => (
                                                                    <div key={j}
                                                                        className={`w-5 h-5 rounded-full border text-[10px] flex items-center justify-center font-medium ${
                                                                            d.enrollment_verifikasi_count > idx
                                                                                ? 'bg-green-500 border-green-500 text-white'
                                                                                : 'bg-muted border-border text-muted-foreground'
                                                                        }`}>
                                                                        {['D','S','J'][idx]}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs text-muted-foreground">
                                                            {d.status_enrollment === 'aktif' ? 'Aktif' : 'Proses mandiri'}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
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

**File 2: `app/Http/Controllers/EnrollmentController.php` — update method `index()`**

Tambahkan query dosen ke data yang dikirim ke Inertia:

```php
use App\Models\Dosen;
use App\Models\EnrollmentVerifikasi;

public function index(Request $request)
{
    // ... kode yang sudah ada untuk mahasiswa ...

    // Tambahkan query dosen
    $dosenList = Dosen::with('user')
        ->withCount('enrollmentVerifikasi')
        ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('jurusan_id', $jurusanId))
        ->orderByRaw("FIELD(status_enrollment, 'pending_verifikasi', 'pending_upload', 'aktif')")
        ->orderBy('nama')
        ->get(['id', 'nip', 'nama', 'email', 'status_enrollment']);

    return inertia('enrollment/index', [
        'mahasiswa'  => $mahasiswa,
        'dosen_list' => $dosenList,
        'kelas'      => $kelas,
        'filters'    => $request->only('kelas_id'),
        'flash'      => ['success' => session('success'), 'error' => session('error')],
    ]);
}
```

**File 3: `resources/js/pages/enrollment/detail.tsx` — BUAT FILE BARU**

Halaman detail enrollment mahasiswa: tampilkan 5 foto preview + hasil verifikasi 3 jarak
+ tombol Approve (hanya jika semua_lulus = true) dan Reset.

```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface FotoPreview { index: number; url: string; }
interface Props {
    mahasiswa: { id: number; nim: string; nama: string; kelas?: { nama: string } };
    foto_previews: FotoPreview[];
    jarak_lulus: Record<string, number>;
    semua_lulus: boolean;
    status_akun: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Enrollment', href: '/enrollment' },
    { title: 'Detail', href: '#' },
];

export default function EnrollmentDetail({ mahasiswa, foto_previews, jarak_lulus, semua_lulus, status_akun }: Props) {
    const jarakList = [
        { key: 'dekat', label: 'Jarak Dekat (~30cm)' },
        { key: 'sedang', label: 'Jarak Sedang (~60cm)' },
        { key: 'jauh', label: 'Jarak Jauh (~1m)' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Enrollment — ${mahasiswa.nama}`} />
            <div className="p-4 space-y-4 max-w-4xl">

                {/* Back */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.get('/enrollment')}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold">{mahasiswa.nama}</h1>
                        <p className="text-sm text-muted-foreground">
                            {mahasiswa.nim} · {mahasiswa.kelas?.nama ?? '-'}
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    {/* Foto Preview */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Foto Enrollment ({foto_previews.length}/5)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {foto_previews.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Belum ada foto yang diupload.</p>
                            ) : (
                                <div className="grid grid-cols-5 gap-2">
                                    {foto_previews.map(f => (
                                        <div key={f.index} className="aspect-square rounded-lg overflow-hidden border bg-muted">
                                            <img src={f.url} alt={`Foto ${f.index}`}
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
                            <CardTitle className="text-base">Hasil Verifikasi 3 Jarak</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {jarakList.map(j => {
                                const confidence = jarak_lulus[j.key];
                                const lulus = confidence !== undefined;
                                return (
                                    <div key={j.key} className={`flex items-center justify-between p-3 rounded-lg border ${
                                        lulus ? 'bg-green-50 border-green-200 dark:bg-green-950/20'
                                              : 'bg-muted/50 border-border'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            {lulus
                                                ? <CheckCircle className="size-4 text-green-600" />
                                                : <XCircle className="size-4 text-muted-foreground" />
                                            }
                                            <span className="text-sm font-medium">{j.label}</span>
                                        </div>
                                        {lulus && (
                                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                                {Math.round(confidence * 100)}% confidence
                                            </Badge>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Actions */}
                            <div className="pt-2 flex gap-2">
                                {semua_lulus && status_akun !== 'aktif' && (
                                    <Button className="flex-1 bg-green-600 hover:bg-green-700"
                                        onClick={() => router.patch(`/enrollment/${mahasiswa.id}/approve`)}>
                                        <CheckCircle className="size-4 mr-1.5" /> Approve Enrollment
                                    </Button>
                                )}
                                <ConfirmDialog
                                    title="Reset Enrollment?"
                                    description="Semua foto dan encoding wajah mahasiswa ini akan dihapus. Mahasiswa harus mengulang proses enrollment dari awal."
                                    confirmLabel="Ya, Reset"
                                    onConfirm={() => router.delete(`/enrollment/${mahasiswa.id}/reset`)}
                                    trigger={
                                        <Button variant="outline" className="hover:bg-red-50 hover:text-red-600">
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

### UX-C01 — Dashboard Admin Jurusan: Backend

**File:** `app/Services/DashboardService.php`

Di dalam method `forAdminJurusan(User $user)`, tambahkan query statistik dosen
setelah query mahasiswa yang sudah ada.

Tambahkan ini ke dalam method, setelah baris yang mengambil `$statEnrollment`:

```php
use App\Models\AbsensiDosen;
use App\Models\Dosen;

// Statistik dosen hari ini
$jadwalHariIniDosen = Jadwal::where('hari', $hariIni ?? '')
    ->where('is_active', true)
    ->whereHas('kelas.prodi', fn($q) => $q->where('jurusan_id', $jid))
    ->with('dosen')
    ->get();

// Dapatkan hariIni dari jadwal
$hariMap2 = [0=>'minggu',1=>'senin',2=>'selasa',3=>'rabu',4=>'kamis',5=>'jumat',6=>'sabtu'];
$hariIni = $hariMap2[now('Asia/Jakarta')->dayOfWeek];

$jadwalHariIniDosen = Jadwal::where('hari', $hariIni)
    ->where('is_active', true)
    ->whereHas('kelas.prodi', fn($q) => $q->where('jurusan_id', $jid))
    ->get();

$dosenHadirHariIni = 0;
$dosenTidakHadirHariIni = [];

foreach ($jadwalHariIniDosen as $jadwal) {
    $sesiHariIni = SesiAbsensi::where('jadwal_id', $jadwal->id)
        ->whereDate('tanggal', today())->first();

    if ($sesiHariIni) {
        $absensiDosen = AbsensiDosen::where('sesi_id', $sesiHariIni->id)
            ->where('dosen_id', $jadwal->dosen_id)->first();

        if ($absensiDosen && $absensiDosen->status === 'hadir') {
            $dosenHadirHariIni++;
        } else {
            $dosenTidakHadirHariIni[] = [
                'nama'        => $jadwal->dosen->nama ?? '-',
                'mata_kuliah' => $jadwal->mata_kuliah,
                'kelas'       => $jadwal->kelas->nama ?? '-',
            ];
        }
    }
}

$statDosenHariIni = [
    'total_jadwal' => $jadwalHariIniDosen->count(),
    'hadir'        => $dosenHadirHariIni,
    'tidak_hadir'  => $dosenTidakHadirHariIni,
];
```

Tambahkan `'stat_dosen_hari_ini' => $statDosenHariIni` ke dalam array `compact()` atau
array return di akhir method.

---

### UX-C02 — Dashboard Admin Jurusan: Frontend

**File:** `resources/js/pages/dashboard/admin-jurusan.tsx`

Tambahkan interface baru dan section baru. Jangan ubah yang sudah ada, hanya tambahkan.

**a) Tambahkan interface:**
```tsx
interface StatDosenHariIni {
    total_jadwal: number;
    hadir: number;
    tidak_hadir: { nama: string; mata_kuliah: string; kelas: string }[];
}
```

**b) Tambahkan ke Props:**
```tsx
stat_dosen_hari_ini: StatDosenHariIni;
```

**c) Tambahkan section di dalam JSX, setelah stat cards yang sudah ada:**

```tsx
{/* Dosen Hari Ini */}
{stat_dosen_hari_ini.total_jadwal > 0 && (
    <Card>
        <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
                <span>Kehadiran Dosen Hari Ini</span>
                <Badge variant="outline">
                    {stat_dosen_hari_ini.hadir}/{stat_dosen_hari_ini.total_jadwal} hadir
                </Badge>
            </CardTitle>
        </CardHeader>
        <CardContent>
            {stat_dosen_hari_ini.tidak_hadir.length === 0 ? (
                <p className="text-sm text-green-700 flex items-center gap-1.5">
                    <CheckCircle className="size-4" />
                    Semua dosen hadir hari ini.
                </p>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">
                        Dosen belum hadir:
                    </p>
                    {stat_dosen_hari_ini.tidak_hadir.slice(0, 5).map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                            <div>
                                <p className="font-medium">{d.nama}</p>
                                <p className="text-xs text-muted-foreground">{d.mata_kuliah} · {d.kelas}</p>
                            </div>
                            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">
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

---

### UX-C03 — Dashboard Mahasiswa: Hierarki Informasi

**File:** `resources/js/pages/dashboard/mahasiswa.tsx`

Perubahan hierarki: pindahkan `jadwal_hari_ini` ke PALING ATAS halaman (sebelum stat cards).
Tambahkan warning banner jika ada `warning_matkul` (matkul dengan kehadiran <80%).

**a) Temukan bagian render utama dan tambahkan SEBELUM semua card yang ada:**

```tsx
{/* Jadwal Hari Ini — paling atas */}
{hari_ini && (
    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
            <CardTitle className="text-base capitalize">Jadwal Hari Ini — {hari_ini}</CardTitle>
        </CardHeader>
        <CardContent>
            {jadwal_hari_ini.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada jadwal kuliah hari ini.</p>
            ) : (
                <div className="space-y-2">
                    {jadwal_hari_ini.map((j, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                            <div>
                                <p className="font-medium">{j.mata_kuliah}</p>
                                <p className="text-xs text-muted-foreground">
                                    {j.dosen} · {j.ruangan} · {j.jam_mulai}–{j.jam_selesai}
                                </p>
                            </div>
                            <Badge variant="outline"
                                className={j.status_sesi === 'berlangsung'
                                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                                    : j.status_sesi === 'selesai'
                                    ? 'bg-gray-100 text-gray-600 border-gray-200'
                                    : 'bg-muted text-muted-foreground'}>
                                {j.status_sesi === 'berlangsung' ? 'Sedang Berlangsung'
                                    : j.status_sesi === 'selesai' ? 'Selesai'
                                    : 'Belum Dimulai'}
                            </Badge>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
    </Card>
)}

{/* Warning Kehadiran — jika ada yang < 80% */}
{warning_matkul.length > 0 && (
    <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
        <CardContent className="pt-4">
            <div className="flex items-start gap-2">
                <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-red-800">
                        Perhatian: {warning_matkul.length} mata kuliah di bawah 80% kehadiran
                    </p>
                    <div className="mt-1.5 space-y-1">
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

Pastikan `AlertCircle` sudah ada di import lucide-react.

**b) Hapus section jadwal_hari_ini yang mungkin sudah ada di bawah** (jika sudah dirender di tempat lain, pindahkan ke atas, jangan duplikasi).

---

### UX-D01 — Sidebar: Restrukturisasi Menu

**File:** `resources/js/components/app-sidebar.tsx`

**Tujuan:** Pindahkan Enrollment keluar dari masterDataItems. Buat section terpisah.
Pindahkan "Koreksi Absensi Dosen" (admin review) ke section Absensi, bukan Dosen.

**a) Hapus item Enrollment dari `masterDataItems`:**

```tsx
// HAPUS baris ini dari masterDataItems:
{
    title: 'Enrollment',
    href: '/enrollment',
    icon: ScanFace,
    permissions: ['enrollment index'],
},
```

**b) Buat array baru `enrollmentItems`:**

```tsx
const enrollmentItems: NavItem[] = [
    {
        title: 'Enrollment',
        href: '/enrollment',
        icon: ScanFace,
        permissions: ['enrollment index'],
    },
    {
        title: 'Enrollment Wajah',
        href: '/enrollment-dosen',
        icon: ScanFace,
        permissions: ['enrollment_dosen index'],
    },
];
```

**c) Update `dosenItems` — HAPUS item Koreksi Absensi Dosen (admin) dari sini:**

```tsx
const dosenItems: NavItem[] = [
    // HAPUS item ini:
    // {
    //     title: 'Koreksi Absensi Dosen',
    //     href: '/koreksi-dosen/admin',
    //     ...
    // },
    {
        title: 'Koreksi Absensi',
        href: '/koreksi-dosen',
        icon: ClipboardList,
        permissions: ['koreksi_dosen create'],
    },
];
```

**d) Update `absensiItems` — tambahkan koreksi admin:**

```tsx
const absensiItems: NavItem[] = [
    {
        title: 'Rekap Absensi',
        href: '/absensi',
        icon: ClipboardList,
        permissions: ['absensi index'],
    },
    {
        title: 'Koreksi Absensi Dosen',
        href: '/koreksi-dosen/admin',
        icon: ShieldCheck,
        permissions: ['koreksi_dosen approve'],
    },
];
```

**e) Update bagian render `<SidebarContent>` — tambahkan section Enrollment:**

```tsx
<SidebarContent>
    <NavMain section='Platform' items={mainNavItems} />
    <NavMain section='Master Data' items={masterDataItems} />
    <NavMain section='Enrollment' items={enrollmentItems} />
    <NavMain section='Absensi' items={absensiItems} />
    <NavMain section='Keterangan' items={keteranganItems} />
    <NavMain section='Dosen' items={dosenItems} />
    <NavMain section='Laporan' items={laporanItems} />
    <NavMain section='User Management' items={userManagement} />
</SidebarContent>
```

Hapus `ScanFace` dari import lucide-react jika sudah tidak dipakai di tempat lain,
atau pastikan masih ada karena dipakai di `enrollmentItems`.

---

### UX-E01 — npm run build: Verifikasi Build

```bash
cd ta-faiz/Laravel
npm run build
```

Build harus selesai tanpa error TypeScript. Error yang mungkin muncul:

- `Cannot find module '@/pages/absensi/sesi-list'` → cek UX-A03 sudah dibuat
- `Cannot find module '@/pages/absensi/sesi-detail'` → cek UX-A04 sudah dibuat
- `Cannot find module '@/pages/enrollment/detail'` → cek UX-B02 file baru sudah dibuat
- `Property 'dosen_list' does not exist on type 'Props'` → cek UX-B02 interface sudah update
- `Property 'stat_dosen_hari_ini' does not exist` → cek UX-C02 interface sudah update
- Import yang tidak dipakai → hapus dari file yang bersangkutan

---

## Urutan Eksekusi

```
BUG-001     (wajib pertama — bugfix kritis)
UX-A01      (backend rekap — fondasi untuk A02-A04)
UX-A02      (frontend level 1)
UX-A03      (frontend level 2)
UX-A04      (frontend level 3)
UX-B01      (backend enrollment)
UX-B02      (frontend enrollment)
UX-C01      (backend dashboard)
UX-C02      (frontend dashboard admin)
UX-C03      (frontend dashboard mahasiswa)
UX-D01      (sidebar — bisa kapan saja, independen)
UX-E01      (build — terakhir)
```

## Cara Test Setelah Semua Task Selesai

1. **BUG-001**: Buat jadwal baru → form ada 2 field window → simpan → cek DB
2. **Rekap Absensi**: Buka `/absensi` → tabel jadwal langsung tampil → klik baris → muncul sesi → klik sesi → muncul detail dengan dosen card + mahasiswa list
3. **Enrollment**: Buka `/enrollment` → ada 2 tab → tab mahasiswa tidak ada tombol Upload → ada tombol Detail → klik Detail → muncul halaman dengan 5 foto + verifikasi
4. **Dashboard Admin**: Login admin → ada section kehadiran dosen hari ini
5. **Dashboard Mahasiswa**: Login mahasiswa → jadwal hari ini tampil paling atas → jika ada matkul <80% muncul warning merah

