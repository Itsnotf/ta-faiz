<?php

namespace App\Http\Controllers;

use App\Models\Institusi;
use App\Services\InstitusiService;
use App\Http\Requests\StoreInstitusiRequest;
use App\Http\Requests\UpdateInstitusiRequest;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class InstitusiController extends Controller implements HasMiddleware
{
    public function __construct(private InstitusiService $institusiService) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:institusi index',  only: ['index']),
            new Middleware('permission:institusi edit',   only: ['update']),
            new Middleware('permission:institusi delete', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        return inertia('institusi/index', [
            'institusi' => $this->institusiService->index($request->search),
            'filters'   => $request->only('search'),
            'flash'     => ['success' => session('success')],
        ]);
    }

    public function store(StoreInstitusiRequest $request)
    {
        $this->institusiService->store($request->validated());

        return back()->with('success', 'Institusi berhasil ditambahkan.');
    }

    public function update(UpdateInstitusiRequest $request, Institusi $institusi)
    {
        $this->institusiService->update($institusi, $request->validated());

        return back()->with('success', 'Institusi berhasil diperbarui.');
    }

    public function destroy(Institusi $institusi)
    {
        $this->institusiService->destroy($institusi);

        return back()->with('success', 'Institusi berhasil dihapus.');
    }
}
