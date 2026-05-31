<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreKeteranganRequest;
use App\Models\Keterangan;
use App\Services\KeteranganService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class KeteranganController extends Controller implements HasMiddleware
{
    public function __construct(private KeteranganService $keteranganService) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:keterangan index',   only: ['index', 'admin', 'bukti']),
            new Middleware('permission:keterangan create',  only: ['store']),
            new Middleware('permission:keterangan approve', only: ['approve', 'reject']),
        ];
    }

    public function index(Request $request)
    {
        if (!$request->user()->isMahasiswa()) {
            return redirect()->route('keterangan.admin');
        }

        $mahasiswa = $request->user()->mahasiswa;

        return Inertia::render('keterangan/index', [
            'alpas' => $this->keteranganService->getForMahasiswa($mahasiswa),
        ]);
    }

    public function admin(Request $request)
    {
        $user = $request->user();

        return Inertia::render('keterangan/admin', [
            'keteranganList' => $this->keteranganService->getForAdmin(
                $user->jurusan_id,
                $user->isSuperAdmin(),
                $request->status,
            ),
            'filters' => $request->only('status'),
        ]);
    }

    public function store(StoreKeteranganRequest $request)
    {
        $this->keteranganService->store($request, $request->user());

        return back()->with('success', 'Keterangan berhasil diajukan.');
    }

    public function approve(Keterangan $keterangan)
    {
        $this->keteranganService->approve($keterangan, auth()->user());

        return back()->with('success', 'Keterangan disetujui.');
    }

    public function reject(Keterangan $keterangan)
    {
        $this->keteranganService->reject($keterangan, auth()->user());

        return back()->with('success', 'Keterangan ditolak.');
    }

    public function bukti(Keterangan $keterangan)
    {
        return Storage::disk('local')->download($keterangan->file_bukti);
    }
}
