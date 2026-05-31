<?php

namespace App\Services;

use App\Exports\RekapExport;
use App\Models\AbsensiMahasiswa;
use App\Models\Jadwal;
use App\Models\Kelas;
use App\Models\Mahasiswa;
use App\Models\SesiAbsensi;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LaporanService
{
    public function getKelasList(?int $jurusanId, bool $isSuperAdmin): Collection
    {
        return Kelas::with('prodi')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->whereHas('prodi', fn($q2) => $q2->where('jurusan_id', $jurusanId)))
            ->orderBy('nama')
            ->get(['id', 'nama', 'prodi_id']);
    }

    public function getJadwalByKelas(int $kelasId): Collection
    {
        return Jadwal::where('kelas_id', $kelasId)
            ->orderBy('mata_kuliah')
            ->get(['id', 'mata_kuliah', 'hari', 'jam_mulai', 'jam_selesai']);
    }

    public function rekapKelas(array $filters, ?int $jurusanId, bool $isSuperAdmin): array
    {
        if (empty($filters['jadwal_id'])) return [];

        $jadwal = Jadwal::with('kelas.mahasiswa')->findOrFail($filters['jadwal_id']);

        // Scope: admin_jurusan hanya boleh akses jadwal jurusannya
        if (!$isSuperAdmin && $jurusanId) {
            $belongsToJurusan = $jadwal->kelas->prodi()->where('jurusan_id', $jurusanId)->exists();
            abort_if(!$belongsToJurusan, 403);
        }

        $sesiQuery = SesiAbsensi::where('jadwal_id', $jadwal->id);
        if (!empty($filters['dari']))   $sesiQuery->whereDate('tanggal', '>=', $filters['dari']);
        if (!empty($filters['sampai'])) $sesiQuery->whereDate('tanggal', '<=', $filters['sampai']);

        $sesiIds        = $sesiQuery->pluck('id');
        $totalPertemuan = $sesiIds->count();

        return $jadwal->kelas->mahasiswa
            ->map(function ($mhs) use ($sesiIds, $totalPertemuan) {
                $counts = AbsensiMahasiswa::where('mahasiswa_id', $mhs->id)
                    ->whereIn('sesi_id', $sesiIds)
                    ->selectRaw('status, count(*) as total')
                    ->groupBy('status')
                    ->get()
                    ->pluck('total', 'status');

                $hadir = (int)($counts['hadir'] ?? 0);
                $alpa  = (int)($counts['alpa'] ?? 0);
                $izin  = (int)($counts['izin'] ?? 0);
                $sakit = (int)($counts['sakit'] ?? 0);
                $persen = $totalPertemuan > 0 ? round($hadir / $totalPertemuan * 100, 1) : 0;

                return compact('hadir', 'alpa', 'izin', 'sakit', 'persen') + [
                    'mahasiswa_id'    => $mhs->id,
                    'nim'             => $mhs->nim,
                    'nama'            => $mhs->nama,
                    'total_pertemuan' => $totalPertemuan,
                ];
            })
            ->sortBy('nama')
            ->values()
            ->toArray();
    }

    public function exportPdf(array $filters, ?int $jurusanId, bool $isSuperAdmin)
    {
        $rekap = $this->rekapKelas($filters, $jurusanId, $isSuperAdmin);
        $info  = $this->buildInfo($filters);

        return Pdf::loadView('laporan.rekap-pdf', compact('rekap', 'info'))
            ->download('rekap-kehadiran.pdf');
    }

    public function exportExcel(array $filters, ?int $jurusanId, bool $isSuperAdmin)
    {
        $rekap = $this->rekapKelas($filters, $jurusanId, $isSuperAdmin);

        return Excel::download(new RekapExport($rekap), 'rekap-kehadiran.xlsx');
    }

    private function buildInfo(array $filters): array
    {
        $info = ['dari' => $filters['dari'] ?? null, 'sampai' => $filters['sampai'] ?? null];
        if (!empty($filters['jadwal_id'])) {
            $jadwal = Jadwal::with('kelas')->find($filters['jadwal_id']);
            if ($jadwal) {
                $info['mata_kuliah'] = $jadwal->mata_kuliah;
                $info['kelas']       = $jadwal->kelas->nama;
            }
        }
        return $info;
    }

    public function rekapMahasiswa(Mahasiswa $mhs, array $filters): array
    {
        $jadwalList = Jadwal::where('kelas_id', $mhs->kelas_id)->get();

        return $jadwalList->map(function ($j) use ($mhs, $filters) {
            $sesiQuery = SesiAbsensi::where('jadwal_id', $j->id);
            if (!empty($filters['dari']))   $sesiQuery->whereDate('tanggal', '>=', $filters['dari']);
            if (!empty($filters['sampai'])) $sesiQuery->whereDate('tanggal', '<=', $filters['sampai']);

            $sesiIds        = $sesiQuery->pluck('id');
            $totalPertemuan = $sesiIds->count();

            if ($totalPertemuan === 0) return null;

            $counts = AbsensiMahasiswa::where('mahasiswa_id', $mhs->id)
                ->whereIn('sesi_id', $sesiIds)
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->get()
                ->pluck('total', 'status');

            $hadir = (int)($counts['hadir'] ?? 0);
            $alpa  = (int)($counts['alpa'] ?? 0);
            $izin  = (int)($counts['izin'] ?? 0);
            $sakit = (int)($counts['sakit'] ?? 0);
            $persen = round($hadir / $totalPertemuan * 100, 1);

            return [
                'mata_kuliah'     => $j->mata_kuliah,
                'hadir'           => $hadir,
                'alpa'            => $alpa,
                'izin'            => $izin,
                'sakit'           => $sakit,
                'total_pertemuan' => $totalPertemuan,
                'persen_hadir'    => $persen,
            ];
        })->filter()->values()->toArray();
    }
}
