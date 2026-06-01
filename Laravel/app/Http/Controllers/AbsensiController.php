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
