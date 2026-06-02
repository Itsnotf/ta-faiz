<?php

namespace App\Http\Controllers;

use App\Services\EnrollmentDosenService;
use Illuminate\Http\Request;

class EnrollmentDosenController extends Controller
{
    public function __construct(private EnrollmentDosenService $service) {}

    public function index(Request $request)
    {
        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        $fotoPreviews = [];
        if ($dosen->foto_paths) {
            foreach ($dosen->foto_paths as $i => $path) {
                $fotoPreviews[] = [
                    'index' => $i,
                    'url'   => route('enrollment-dosen.foto-preview', ['index' => $i]),
                ];
            }
        }

        return inertia('enrollment-dosen/index', [
            'status'        => $this->service->status($dosen),
            'foto_previews' => $fotoPreviews,
        ]);
    }

    public function fotoPreview(Request $request, int $index)
    {
        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        abort_unless($dosen->foto_paths && isset($dosen->foto_paths[$index]), 404);
        $path = $dosen->foto_paths[$index];
        abort_unless(\Illuminate\Support\Facades\Storage::disk('local')->exists($path), 404);

        return \Illuminate\Support\Facades\Storage::disk('local')->response($path);
    }

    public function uploadFoto(Request $request)
    {
        $request->validate([
            'foto'   => ['required', 'array', 'size:5'],
            'foto.*' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
        ]);

        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        $this->service->uploadFoto($dosen, $request->file('foto'));

        return back()->with('success', '5 foto berhasil diunggah. Lanjutkan verifikasi wajah.');
    }

    public function verifikasi(Request $request)
    {
        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        return inertia('enrollment-dosen/verifikasi', [
            'dosen'  => ['id' => $dosen->id, 'nama' => $dosen->nama],
            'status' => $this->service->status($dosen),
        ]);
    }

    public function verifyFrame(Request $request)
    {
        $request->validate([
            'frame_base64' => ['required', 'string'],
            'jarak'        => ['required', 'in:dekat,sedang,jauh'],
        ]);

        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        $result = $this->service->verifyFrame($dosen, $request->frame_base64, $request->jarak);

        if ($result['semua_jarak_lulus'] && $dosen->status_enrollment === 'pending_verifikasi') {
            $this->service->approve($dosen);
            $result['auto_approved'] = true;
        }

        return response()->json($result);
    }

    public function reset(Request $request)
    {
        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        $this->service->reset($dosen);

        return back()->with('success', 'Enrollment berhasil direset.');
    }

    public function status(Request $request)
    {
        $dosen = $request->user()->dosen;
        if (!$dosen) abort(404);

        return response()->json($this->service->status($dosen));
    }
}
