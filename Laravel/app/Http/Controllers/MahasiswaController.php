<?php

namespace App\Http\Controllers;

use App\Models\Mahasiswa;
use App\Services\MahasiswaService;
use App\Http\Requests\StoreMahasiswaRequest;
use App\Http\Requests\UpdateMahasiswaRequest;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class MahasiswaController extends Controller implements HasMiddleware
{
    public function __construct(private MahasiswaService $mahasiswaService) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:mahasiswa index',  only: ['index']),
            new Middleware('permission:mahasiswa create', only: ['store']),
            new Middleware('permission:mahasiswa edit',   only: ['update']),
            new Middleware('permission:mahasiswa delete', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();

        return inertia('mahasiswa/index', [
            'mahasiswa' => $this->mahasiswaService->index(
                $request->search,
                $request->kelas_id,
                $user->jurusan_id,
                $user->isSuperAdmin()
            ),
            'kelas'   => $this->mahasiswaService->getKelasOptions($user->jurusan_id, $user->isSuperAdmin()),
            'filters' => $request->only('search', 'kelas_id'),
            'flash'   => ['success' => session('success')],
        ]);
    }

    public function store(StoreMahasiswaRequest $request)
    {
        $this->mahasiswaService->store($request->validated());
        return back()->with('success', 'Mahasiswa berhasil ditambahkan.');
    }

    public function update(UpdateMahasiswaRequest $request, Mahasiswa $mahasiswa)
    {
        $this->mahasiswaService->update($mahasiswa, $request->validated());
        return back()->with('success', 'Mahasiswa berhasil diperbarui.');
    }

    public function destroy(Mahasiswa $mahasiswa)
    {
        $this->mahasiswaService->destroy($mahasiswa);
        return back()->with('success', 'Mahasiswa berhasil dihapus.');
    }
}
