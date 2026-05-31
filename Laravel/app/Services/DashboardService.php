<?php

namespace App\Services;

use App\Models\AbsensiMahasiswa;
use App\Models\EnrollmentVerifikasi;
use App\Models\Jadwal;
use App\Models\Jurusan;
use App\Models\Keterangan;
use App\Models\Mahasiswa;
use App\Models\SesiAbsensi;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DashboardService
{
    public function forMahasiswa(User $user): array
    {
        $mhs = $user->mahasiswa()->with(['kelas.prodi'])->firstOrFail();

        // Stat keseluruhan
        $counts = AbsensiMahasiswa::where('mahasiswa_id', $mhs->id)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->get()
            ->pluck('total', 'status');

        $hadirCount = (int)($counts['hadir'] ?? 0);
        $alpaCount  = (int)($counts['alpa'] ?? 0);
        $izinCount  = (int)($counts['izin'] ?? 0);
        $sakitCount = (int)($counts['sakit'] ?? 0);
        $totalCount = $hadirCount + $alpaCount + $izinCount + $sakitCount;
        $rataRata   = $totalCount > 0 ? round($hadirCount / $totalCount * 100, 1) : 0;

        // Kehadiran per matkul
        $jadwalList = Jadwal::where('kelas_id', $mhs->kelas_id)->get();

        $kehadiranPerMatkul = $jadwalList->map(function ($j) use ($mhs) {
            $totalSesi = SesiAbsensi::where('jadwal_id', $j->id)->count();
            $hadir     = AbsensiMahasiswa::where('mahasiswa_id', $mhs->id)
                ->whereHas('sesi', fn($q) => $q->where('jadwal_id', $j->id))
                ->where('status', 'hadir')
                ->count();
            $persen = $totalSesi > 0 ? round($hadir / $totalSesi * 100, 1) : 0;
            return ['mata_kuliah' => $j->mata_kuliah, 'hadir' => $hadir, 'total' => $totalSesi, 'persen' => $persen];
        })->filter(fn($r) => $r['total'] > 0)->values();

        $warningMatkul = $kehadiranPerMatkul->filter(fn($r) => $r['persen'] < 80)->values();

        // Jadwal minggu ini
        $hariMap = [1 => 'senin', 2 => 'selasa', 3 => 'rabu', 4 => 'kamis', 5 => 'jumat', 6 => 'sabtu'];
        $jadwalMingguIni = $jadwalList->map(fn($j) => [
            'id'          => $j->id,
            'mata_kuliah' => $j->mata_kuliah,
            'hari'        => $j->hari,
            'jam_mulai'   => substr($j->jam_mulai, 0, 5),
            'jam_selesai' => substr($j->jam_selesai, 0, 5),
        ])->sortBy(fn($j) => array_search($j['hari'], $hariMap))->values();

        $hariIniNama = $hariMap[now('Asia/Jakarta')->dayOfWeekIso] ?? null;

        // Riwayat terbaru
        $riwayatTerbaru = AbsensiMahasiswa::where('mahasiswa_id', $mhs->id)
            ->with('sesi.jadwal')
            ->latest()
            ->take(10)
            ->get()
            ->map(fn($a) => [
                'mata_kuliah' => $a->sesi->jadwal->mata_kuliah,
                'tanggal'     => $a->sesi->tanggal,
                'status'      => $a->status,
                'hadir_at'    => $a->hadir_at ? Carbon::parse($a->hadir_at)->format('H:i') : null,
            ]);

        // Enrollment status
        $jarakLulus = EnrollmentVerifikasi::where('mahasiswa_id', $mhs->id)->pluck('jarak')->toArray();
        $enrollmentStatus = [
            'status_akun'       => $mhs->status_akun,
            'jarak_lulus'       => $jarakLulus,
            'semua_jarak_lulus' => count($jarakLulus) >= 3,
        ];

        return [
            'mahasiswa'         => ['nama' => $mhs->nama, 'nim' => $mhs->nim, 'kelas' => $mhs->kelas->nama, 'prodi' => $mhs->kelas->prodi->nama],
            'stat'              => ['hadir' => $hadirCount, 'alpa' => $alpaCount, 'izin' => $izinCount, 'sakit' => $sakitCount, 'rata_rata' => $rataRata],
            'kehadiran_per_matkul' => $kehadiranPerMatkul,
            'warning_matkul'    => $warningMatkul,
            'jadwal_minggu_ini' => $jadwalMingguIni,
            'hari_ini'          => $hariIniNama,
            'riwayat_terbaru'   => $riwayatTerbaru,
            'enrollment_status' => $enrollmentStatus,
        ];
    }

    public function adminStats(): array
    {
        return [
            'total_users'       => User::count(),
            'total_roles'       => Role::count(),
            'total_permissions' => Permission::count(),
            'recent_users'      => User::with('roles')->latest()->take(5)->get(),
        ];
    }

    public function memberStats(User $user): array
    {
        return [
            'roles'        => $user->getRoleNames(),
            'permissions'  => $user->getAllPermissions()->pluck('name'),
            'member_since' => $user->created_at->format('d M Y'),
        ];
    }

    public function forSuperAdmin(): array
    {
        $totalMahasiswaAktif = Mahasiswa::where('status_akun', 'aktif')->count();
        $totalMahasiswa      = Mahasiswa::count();

        $totalAbsensi  = AbsensiMahasiswa::count();
        $totalHadir    = AbsensiMahasiswa::where('status', 'hadir')->count();
        $rataKehadiran = $totalAbsensi > 0 ? round($totalHadir / $totalAbsensi * 100, 1) : 0;

        $sesiHariIni     = SesiAbsensi::whereDate('tanggal', today())->count();
        $sesiBerlangsung = SesiAbsensi::where('status', 'berlangsung')->count();

        $enrollmentPct = $totalMahasiswa > 0 ? round($totalMahasiswaAktif / $totalMahasiswa * 100, 1) : 0;

        // Kehadiran & enrollment per jurusan
        $jurusanList = Jurusan::all();
        $kehadiranPerJurusan  = [];
        $enrollmentPerJurusan = [];

        foreach ($jurusanList as $j) {
            $mhsIds = Mahasiswa::whereHas('kelas.prodi', fn($q) => $q->where('jurusan_id', $j->id))->pluck('id');

            $jTotal = AbsensiMahasiswa::whereIn('mahasiswa_id', $mhsIds)->count();
            $jHadir = AbsensiMahasiswa::whereIn('mahasiswa_id', $mhsIds)->where('status', 'hadir')->count();
            $jAlpa  = AbsensiMahasiswa::whereIn('mahasiswa_id', $mhsIds)->where('status', 'alpa')->count();
            $jIzSkt = AbsensiMahasiswa::whereIn('mahasiswa_id', $mhsIds)->whereIn('status', ['izin', 'sakit'])->count();
            $pHadir = $jTotal > 0 ? round($jHadir / $jTotal * 100, 1) : 0;

            $mhsTotal  = $mhsIds->count();
            $mhsAktif  = Mahasiswa::whereIn('id', $mhsIds)->where('status_akun', 'aktif')->count();
            $pEnroll   = $mhsTotal > 0 ? round($mhsAktif / $mhsTotal * 100, 1) : 0;

            $kehadiranPerJurusan[]  = ['nama' => $j->nama, 'persen_hadir' => $pHadir, 'total_alpa' => $jAlpa, 'total_izin_sakit' => $jIzSkt];
            $enrollmentPerJurusan[] = ['nama' => $j->nama, 'persen_selesai' => $pEnroll, 'aktif' => $mhsAktif, 'total' => $mhsTotal];
        }

        // 10 aktivitas terbaru: gabung alpa baru + enrollment baru
        $alpaEvents = AbsensiMahasiswa::where('status', 'alpa')
            ->with('mahasiswa')
            ->latest()
            ->take(10)
            ->get()
            ->map(fn($a) => [
                'type'      => 'alpa',
                'label'     => ($a->mahasiswa->nama ?? '?') . ' ditandai Alpa',
                'timestamp' => $a->created_at->toISOString(),
            ]);

        $enrollmentEvents = Mahasiswa::whereNotNull('foto_verified_at')
            ->latest('foto_verified_at')
            ->take(10)
            ->get()
            ->map(fn($m) => [
                'type'      => 'enrollment',
                'label'     => $m->nama . ' enrollment aktif',
                'timestamp' => Carbon::parse($m->foto_verified_at)->toISOString(),
            ]);

        $aktivitasTerbaru = $alpaEvents->concat($enrollmentEvents)
            ->sortByDesc('timestamp')
            ->values()
            ->take(10);

        return compact(
            'totalMahasiswaAktif', 'rataKehadiran', 'sesiHariIni', 'sesiBerlangsung',
            'enrollmentPct', 'kehadiranPerJurusan', 'enrollmentPerJurusan', 'aktivitasTerbaru'
        );
    }

    public function forAdminJurusan(User $user): array
    {
        $jid = $user->jurusan_id;

        $absensiScopeToday = fn($q) => $q->whereHas(
            'sesi',
            fn($q2) => $q2->whereDate('tanggal', today())
                ->whereHas('jadwal.kelas.prodi', fn($q3) => $q3->where('jurusan_id', $jid))
        );

        $statHadir = AbsensiMahasiswa::where($absensiScopeToday)->where('status', 'hadir')->count();
        $statAlpa  = AbsensiMahasiswa::where($absensiScopeToday)->where('status', 'alpa')->count();

        $statKetPending = Keterangan::whereHas(
            'mahasiswa.kelas.prodi', fn($q) => $q->where('jurusan_id', $jid)
        )->where('status_keterangan', 'pending')->count();

        $statEnrollment = Mahasiswa::whereHas(
            'kelas.prodi', fn($q) => $q->where('jurusan_id', $jid)
        )->where('status_akun', 'aktif')->count();

        $sesiAktif = SesiAbsensi::where('status', 'berlangsung')
            ->whereHas('jadwal', fn($q) => $q->whereHas('kelas.prodi', fn($q2) => $q2->where('jurusan_id', $jid)))
            ->with(['jadwal.kelas', 'jadwal.dosen', 'jadwal.ruangan'])
            ->get()
            ->map(fn($s) => [
                'id'          => $s->id,
                'mata_kuliah' => $s->jadwal->mata_kuliah,
                'kelas'       => $s->jadwal->kelas->nama,
                'dosen'       => $s->jadwal->dosen->nama,
                'ruangan'     => $s->jadwal->ruangan->nama,
                'mulai_at'    => Carbon::parse($s->mulai_at)->format('H:i'),
                'hadir'       => $s->absensiMahasiswa()->where('status', 'hadir')->count(),
                'total'       => $s->jadwal->kelas->mahasiswa()->count(),
            ]);

        $keteranganPending = Keterangan::whereHas(
            'mahasiswa.kelas.prodi', fn($q) => $q->where('jurusan_id', $jid)
        )->where('status_keterangan', 'pending')
            ->with(['mahasiswa', 'absensiMahasiswa.sesi.jadwal'])
            ->latest()
            ->take(3)
            ->get()
            ->map(fn($k) => [
                'id'            => $k->id,
                'mahasiswa_nama'=> $k->mahasiswa->nama,
                'mata_kuliah'   => $k->absensiMahasiswa->sesi->jadwal->mata_kuliah,
                'tanggal'       => $k->absensiMahasiswa->sesi->tanggal,
                'jenis'         => $k->jenis,
            ]);

        $absensiHariIni = AbsensiMahasiswa::where($absensiScopeToday)
            ->with(['mahasiswa', 'sesi.jadwal'])
            ->latest()
            ->take(10)
            ->get()
            ->map(fn($a) => [
                'nama'        => $a->mahasiswa->nama,
                'nim'         => $a->mahasiswa->nim,
                'mata_kuliah' => $a->sesi->jadwal->mata_kuliah,
                'status'      => $a->status,
                'hadir_at'    => $a->hadir_at ? Carbon::parse($a->hadir_at)->format('H:i') : null,
            ]);

        $startOfWeek = now()->startOfWeek(Carbon::MONDAY);
        $endOfWeek   = now()->endOfWeek(Carbon::SUNDAY);

        $weekCounts = AbsensiMahasiswa::whereHas(
            'sesi',
            fn($q) => $q->whereBetween('tanggal', [$startOfWeek->toDateString(), $endOfWeek->toDateString()])
                ->whereHas('jadwal.kelas.prodi', fn($q2) => $q2->where('jurusan_id', $jid))
        )->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->get()
            ->pluck('total', 'status');

        $kehadiranMingguIni = [
            'hadir'      => (int) ($weekCounts['hadir'] ?? 0),
            'alpa'       => (int) ($weekCounts['alpa'] ?? 0),
            'izin_sakit' => (int) ($weekCounts['izin'] ?? 0) + (int) ($weekCounts['sakit'] ?? 0),
        ];

        return compact(
            'statHadir', 'statAlpa', 'statKetPending', 'statEnrollment',
            'sesiAktif', 'keteranganPending', 'absensiHariIni', 'kehadiranMingguIni'
        );
    }
}
