<?php

namespace App\Http\Controllers;

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
            new Middleware('permission:absensi index', only: ['index']),
        ];
    }

    public function index(Request $request)
    {

        $user         = $request->user();
        $jurusanId    = $user->jurusan_id;
        $isSuperAdmin = $user->isSuperAdmin();

        $kelasList  = $this->absensiService->getKelasList($jurusanId, $isSuperAdmin);

        $jadwalList = $request->kelas_id
            ? $this->absensiService->getJadwalByKelas((int) $request->kelas_id)
            : collect();

        $sesiList   = $request->jadwal_id
            ? $this->absensiService->getSesiByJadwal((int) $request->jadwal_id)
            : collect();

        $rekap      = $request->sesi_id
            ? $this->absensiService->getRekapSesi((int) $request->sesi_id)
            : collect();

        return inertia('absensi/index', [
            'kelasList'  => $kelasList,
            'jadwalList' => $jadwalList,
            'sesiList'   => $sesiList,
            'rekap'      => $rekap,
            'filters'    => $request->only('kelas_id', 'jadwal_id', 'sesi_id'),
        ]);
    }
}
