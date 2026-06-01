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
                $totalSesi      = SesiAbsensi::where('jadwal_id', $jadwal->id)->count();
                $totalMahasiswa = $jadwal->kelas->mahasiswa->count();
                $persenHadir    = null;

                if ($totalSesi > 0 && $totalMahasiswa > 0) {
                    $totalRecord = $totalSesi * $totalMahasiswa;
                    $totalHadir  = AbsensiMahasiswa::whereHas(
                        'sesi', fn($q) => $q->where('jadwal_id', $jadwal->id)
                    )->where('status', 'hadir')->count();
                    $persenHadir = round($totalHadir / $totalRecord * 100, 1);
                }

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

                $tgl    = $sesi->tanggal;
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

        $adosen = AbsensiDosen::where('sesi_id', $sesi->id)
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

        $tgl    = $sesi->tanggal;
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
            'dosen'          => $statusDosen,
            'mahasiswa_list' => $mahasiswaList,
        ];
    }
}
