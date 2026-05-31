<?php

namespace App\Http\Controllers;

use App\Models\Prodi;
use App\Services\ProdiService;
use App\Http\Requests\StoreProdiRequest;
use App\Http\Requests\UpdateProdiRequest;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class ProdiController extends Controller implements HasMiddleware
{
    public function __construct(private ProdiService $prodiService) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:prodi index',  only: ['index']),
            new Middleware('permission:prodi create', only: ['store']),
            new Middleware('permission:prodi edit',   only: ['update']),
            new Middleware('permission:prodi delete', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();

        return inertia('prodi/index', [
            'prodi'   => $this->prodiService->index($request->search, $user->jurusan_id, $user->isSuperAdmin()),
            'jurusan' => $this->prodiService->getJurusanOptions($user->jurusan_id, $user->isSuperAdmin()),
            'filters' => $request->only('search'),
            'flash'   => ['success' => session('success')],
        ]);
    }

    public function store(StoreProdiRequest $request)
    {
        $this->prodiService->store($request->validated());
        return back()->with('success', 'Prodi berhasil ditambahkan.');
    }

    public function update(UpdateProdiRequest $request, Prodi $prodi)
    {
        $this->prodiService->update($prodi, $request->validated());
        return back()->with('success', 'Prodi berhasil diperbarui.');
    }

    public function destroy(Prodi $prodi)
    {
        $this->prodiService->destroy($prodi);
        return back()->with('success', 'Prodi berhasil dihapus.');
    }
}
