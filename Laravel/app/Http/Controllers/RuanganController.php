<?php

namespace App\Http\Controllers;

use App\Models\Ruangan;
use App\Services\RuanganService;
use App\Http\Requests\StoreRuanganRequest;
use App\Http\Requests\UpdateRuanganRequest;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class RuanganController extends Controller implements HasMiddleware
{
    public function __construct(private RuanganService $ruanganService) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:ruangan index',  only: ['index']),
            new Middleware('permission:ruangan create', only: ['store']),
            new Middleware('permission:ruangan edit',   only: ['update']),
            new Middleware('permission:ruangan delete', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();

        return inertia('ruangan/index', [
            'ruangan' => $this->ruanganService->index(
                $request->search,
                $request->jurusan_id,
                $user->jurusan_id,
                $user->isSuperAdmin()
            ),
            'jurusan' => $this->ruanganService->getJurusanOptions($user->jurusan_id, $user->isSuperAdmin()),
            'filters' => $request->only('search', 'jurusan_id'),
            'flash'   => ['success' => session('success')],
        ]);
    }

    public function store(StoreRuanganRequest $request)
    {
        $this->ruanganService->store($request->validated());
        return back()->with('success', 'Ruangan berhasil ditambahkan.');
    }

    public function update(UpdateRuanganRequest $request, Ruangan $ruangan)
    {
        $this->ruanganService->update($ruangan, $request->validated());
        return back()->with('success', 'Ruangan berhasil diperbarui.');
    }

    public function destroy(Ruangan $ruangan)
    {
        $this->ruanganService->destroy($ruangan);
        return back()->with('success', 'Ruangan berhasil dihapus.');
    }
}
