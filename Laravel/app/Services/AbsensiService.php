<?php

namespace App\Services;

use App\Models\AbsensiMahasiswa;
use App\Models\Jadwal;
use App\Models\Kelas;
use App\Models\SesiAbsensi;
use Illuminate\Support\Collection;

class AbsensiService
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

    public function getSesiByJadwal(int $jadwalId): Collection
    {
        return SesiAbsensi::where('jadwal_id', $jadwalId)
            ->orderByDesc('tanggal')
            ->get(['id', 'tanggal', 'status']);
    }

    public function getRekapSesi(int $sesiId): Collection
    {
        $sesi = SesiAbsensi::with('jadwal.kelas.mahasiswa')->findOrFail($sesiId);

        // Semua mahasiswa di kelas
        $mahasiswaKelas = $sesi->jadwal->kelas->mahasiswa;

        // Record absensi yang ada
        $absensiMap = AbsensiMahasiswa::where('sesi_id', $sesiId)
            ->get()
            ->keyBy('mahasiswa_id');

        return $mahasiswaKelas->map(function ($mhs) use ($absensiMap) {
            $absensi = $absensiMap->get($mhs->id);
            return [
                'mahasiswa_id' => $mhs->id,
                'nim'          => $mhs->nim,
                'nama'         => $mhs->nama,
                'status'       => $absensi?->status ?? 'belum',
                'hadir_at'     => $absensi?->hadir_at?->format('H:i:s'),
                'confidence'   => $absensi?->confidence ? round($absensi->confidence * 100, 1) : null,
                'is_locked'    => $absensi?->is_locked ?? false,
            ];
        })->sortBy('nama')->values();
    }
}
