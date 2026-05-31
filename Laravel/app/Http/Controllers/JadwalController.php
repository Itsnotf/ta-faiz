<?php

namespace App\Http\Controllers;

use App\Models\Jadwal;
use App\Services\JadwalService;
use App\Http\Requests\StoreJadwalRequest;
use App\Http\Requests\UpdateJadwalRequest;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class JadwalController extends Controller implements HasMiddleware
{
    public function __construct(private JadwalService $jadwalService) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:jadwal index',  only: ['index']),
            new Middleware('permission:jadwal create', only: ['store']),
            new Middleware('permission:jadwal edit',   only: ['update']),
            new Middleware('permission:jadwal delete', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $opts = $this->jadwalService->getDropdownOptions($user->jurusan_id, $user->isSuperAdmin());

        return inertia('jadwal/index', [
            'jadwal'  => $this->jadwalService->index($request->search, $user->jurusan_id, $user->isSuperAdmin()),
            'kelas'   => $opts['kelas'],
            'dosen'   => $opts['dosen'],
            'ruangan' => $opts['ruangan'],
            'filters' => $request->only('search'),
            'flash'   => ['success' => session('success')],
        ]);
    }

    public function store(StoreJadwalRequest $request)
    {
        $this->jadwalService->store($request->validated());
        return back()->with('success', 'Jadwal berhasil ditambahkan.');
    }

    public function update(UpdateJadwalRequest $request, Jadwal $jadwal)
    {
        $this->jadwalService->update($jadwal, $request->validated());
        return back()->with('success', 'Jadwal berhasil diperbarui.');
    }

    public function destroy(Jadwal $jadwal)
    {
        $this->jadwalService->destroy($jadwal);
        return back()->with('success', 'Jadwal berhasil dihapus.');
    }
}
