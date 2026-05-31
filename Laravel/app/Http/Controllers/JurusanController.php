<?php

namespace App\Http\Controllers;

use App\Models\Jurusan;
use App\Services\JurusanService;
use App\Http\Requests\StoreJurusanRequest;
use App\Http\Requests\UpdateJurusanRequest;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class JurusanController extends Controller implements HasMiddleware
{
    public function __construct(private JurusanService $jurusanService) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:jurusan index',  only: ['index']),
            new Middleware('permission:jurusan create', only: ['store']),
            new Middleware('permission:jurusan edit',   only: ['update']),
            new Middleware('permission:jurusan delete', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();

        return inertia('jurusan/index', [
            'jurusan'  => $this->jurusanService->index(
                $request->search,
                $user->jurusan_id,
                $user->isSuperAdmin()
            ),
            'institusi' => $this->jurusanService->getAllInstitusi(),
            'filters'  => $request->only('search'),
            'flash'    => ['success' => session('success')],
        ]);
    }

    public function store(StoreJurusanRequest $request)
    {
        $this->jurusanService->store($request->validated());

        return back()->with('success', 'Jurusan berhasil ditambahkan.');
    }

    public function update(UpdateJurusanRequest $request, Jurusan $jurusan)
    {
        $this->jurusanService->update($jurusan, $request->validated());

        return back()->with('success', 'Jurusan berhasil diperbarui.');
    }

    public function destroy(Jurusan $jurusan)
    {
        $this->jurusanService->destroy($jurusan);

        return back()->with('success', 'Jurusan berhasil dihapus.');
    }
}
