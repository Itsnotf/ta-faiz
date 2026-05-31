<?php

namespace App\Http\Controllers;

use App\Models\Kelas;
use App\Services\KelasService;
use App\Http\Requests\StoreKelasRequest;
use App\Http\Requests\UpdateKelasRequest;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class KelasController extends Controller implements HasMiddleware
{
    public function __construct(private KelasService $kelasService) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:kelas index',  only: ['index']),
            new Middleware('permission:kelas create', only: ['store']),
            new Middleware('permission:kelas edit',   only: ['update']),
            new Middleware('permission:kelas delete', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();

        return inertia('kelas/index', [
            'kelas'   => $this->kelasService->index($request->search, $user->jurusan_id, $user->isSuperAdmin()),
            'prodi'   => $this->kelasService->getProdiOptions($user->jurusan_id, $user->isSuperAdmin()),
            'filters' => $request->only('search'),
            'flash'   => ['success' => session('success')],
        ]);
    }

    public function store(StoreKelasRequest $request)
    {
        $this->kelasService->store($request->validated());
        return back()->with('success', 'Kelas berhasil ditambahkan.');
    }

    public function update(UpdateKelasRequest $request, Kelas $kelas)
    {
        $this->kelasService->update($kelas, $request->validated());
        return back()->with('success', 'Kelas berhasil diperbarui.');
    }

    public function destroy(Kelas $kelas)
    {
        $this->kelasService->destroy($kelas);
        return back()->with('success', 'Kelas berhasil dihapus.');
    }
}
