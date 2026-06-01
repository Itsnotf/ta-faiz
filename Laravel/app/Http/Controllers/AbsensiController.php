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
