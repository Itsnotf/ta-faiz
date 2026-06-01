<?php

namespace App\Http\Controllers;

use App\Models\AbsensiDosen;
use App\Models\KoreksiAbsensiDosen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class KoreksiAbsensiDosenController extends Controller
{
    public function index(Request $request)
    {
        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        $absensi = AbsensiDosen::where('dosen_id', $dosen->id)
            ->with(['sesi.jadwal.kelas', 'koreksi'])
            ->orderByDesc('created_at')
            ->paginate(15);

        return inertia('koreksi-dosen/index', ['absensi' => $absensi]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'absensi_dosen_id' => ['required', 'exists:absensi_dosen,id'],
            'bukti'            => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'catatan'          => ['nullable', 'string', 'max:500'],
        ]);

        $dosen   = $request->user()->dosen;
        $absensi = AbsensiDosen::findOrFail($request->absensi_dosen_id);

        abort_if($absensi->dosen_id !== $dosen->id, 403);
        abort_if($absensi->is_locked, 422, 'Absensi sudah terkunci dan tidak dapat dikoreksi.');
        abort_if($absensi->koreksi()->whereIn('status', ['pending', 'approved'])->exists(), 422, 'Pengajuan koreksi sudah ada.');

        $path = $request->file('bukti')->store('koreksi_dosen', 'local');

        KoreksiAbsensiDosen::create([
            'absensi_dosen_id' => $absensi->id,
            'dosen_id'         => $dosen->id,
            'bukti_path'       => $path,
            'catatan'          => $request->catatan,
        ]);

        return back()->with('success', 'Pengajuan koreksi berhasil dikirim.');
    }

    public function adminIndex(Request $request)
    {
        $user      = $request->user();
        $jurusanId = $user->isAdminJurusan() ? $user->jurusan_id : null;

        $koreksi = KoreksiAbsensiDosen::with(['dosen.jurusan', 'absensiDosen.sesi.jadwal'])
            ->when($jurusanId, fn($q) => $q->whereHas('dosen', fn($d) => $d->where('jurusan_id', $jurusanId)))
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->paginate(15);

        return inertia('koreksi-dosen/admin', ['koreksi' => $koreksi]);
    }

    public function approve(Request $request, KoreksiAbsensiDosen $koreksi)
    {
        $request->validate(['catatan_admin' => ['nullable', 'string', 'max:500']]);

        $koreksi->update([
            'status'         => 'approved',
            'catatan_admin'  => $request->catatan_admin,
            'disetujui_oleh' => $request->user()->id,
            'diproses_at'    => now(),
        ]);

        $koreksi->absensiDosen->update(['status' => 'hadir']);

        return back()->with('success', 'Koreksi disetujui. Status absensi diubah ke hadir.');
    }

    public function reject(Request $request, KoreksiAbsensiDosen $koreksi)
    {
        $request->validate(['catatan_admin' => ['required', 'string', 'max:500']]);

        $koreksi->update([
            'status'         => 'rejected',
            'catatan_admin'  => $request->catatan_admin,
            'disetujui_oleh' => $request->user()->id,
            'diproses_at'    => now(),
        ]);

        return back()->with('success', 'Koreksi ditolak.');
    }

    public function bukti(KoreksiAbsensiDosen $koreksi)
    {
        abort_if(!Storage::disk('local')->exists($koreksi->bukti_path), 404);
        return Storage::disk('local')->download($koreksi->bukti_path);
    }
}
