<?php

namespace App\Http\Controllers;

use App\Models\Mahasiswa;
use App\Services\LaporanService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;

class LaporanController extends Controller implements HasMiddleware
{
    public function __construct(private LaporanService $laporanService) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:laporan index',  only: ['index', 'mahasiswa']),
            new Middleware('permission:laporan export', only: ['exportPdf', 'exportExcel']),
        ];
    }

    public function index(Request $request)
    {
        $user         = $request->user();
        $jurusanId    = $user->jurusan_id;
        $isSuperAdmin = $user->isSuperAdmin();

        $kelasList  = $this->laporanService->getKelasList($jurusanId, $isSuperAdmin);
        $jadwalList = $request->kelas_id
            ? $this->laporanService->getJadwalByKelas((int) $request->kelas_id)
            : collect();

        $rekap = ($request->jadwal_id)
            ? $this->laporanService->rekapKelas($request->only('jadwal_id', 'dari', 'sampai'), $jurusanId, $isSuperAdmin)
            : [];

        return Inertia::render('laporan/index', [
            'kelasList'  => $kelasList,
            'jadwalList' => $jadwalList,
            'rekap'      => $rekap,
            'filters'    => $request->only('kelas_id', 'jadwal_id', 'dari', 'sampai'),
        ]);
    }

    public function exportPdf(Request $request)
    {
        $user = $request->user();
        return $this->laporanService->exportPdf(
            $request->only('jadwal_id', 'dari', 'sampai'),
            $user->jurusan_id,
            $user->isSuperAdmin(),
        );
    }

    public function exportExcel(Request $request)
    {
        $user = $request->user();
        return $this->laporanService->exportExcel(
            $request->only('jadwal_id', 'dari', 'sampai'),
            $user->jurusan_id,
            $user->isSuperAdmin(),
        );
    }

    public function mahasiswa(Request $request, Mahasiswa $mahasiswa)
    {
        $rekap = $this->laporanService->rekapMahasiswa($mahasiswa, $request->only('dari', 'sampai'));

        return Inertia::render('laporan/mahasiswa', [
            'mahasiswa' => ['id' => $mahasiswa->id, 'nama' => $mahasiswa->nama, 'nim' => $mahasiswa->nim],
            'rekap'     => $rekap,
            'filters'   => $request->only('dari', 'sampai'),
        ]);
    }
}
