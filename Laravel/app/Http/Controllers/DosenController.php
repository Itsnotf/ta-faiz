<?php

namespace App\Http\Controllers;

use App\Models\Dosen;
use App\Services\DosenService;
use App\Http\Requests\StoreDosenRequest;
use App\Http\Requests\UpdateDosenRequest;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class DosenController extends Controller implements HasMiddleware
{
    public function __construct(private DosenService $dosenService) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:dosen index',  only: ['index']),
            new Middleware('permission:dosen create', only: ['store']),
            new Middleware('permission:dosen edit',   only: ['update']),
            new Middleware('permission:dosen delete', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();

        return inertia('dosen/index', [
            'dosen'   => $this->dosenService->index($request->search, $user->jurusan_id, $user->isSuperAdmin()),
            'jurusan' => $this->dosenService->getJurusanOptions($user->jurusan_id, $user->isSuperAdmin()),
            'filters' => $request->only('search'),
            'flash'   => ['success' => session('success')],
        ]);
    }

    public function store(StoreDosenRequest $request)
    {
        $this->dosenService->store($request->validated());
        return back()->with('success', 'Dosen berhasil ditambahkan.');
    }

    public function update(UpdateDosenRequest $request, Dosen $dosen)
    {
        $this->dosenService->update($dosen, $request->validated());
        return back()->with('success', 'Dosen berhasil diperbarui.');
    }

    public function destroy(Dosen $dosen)
    {
        $this->dosenService->destroy($dosen);
        return back()->with('success', 'Dosen berhasil dihapus.');
    }
}
