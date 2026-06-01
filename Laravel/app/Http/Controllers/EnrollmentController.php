<?php

namespace App\Http\Controllers;

use App\Models\Dosen;
use App\Models\Kelas;
use App\Models\Mahasiswa;
use App\Services\EnrollmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EnrollmentController extends Controller
{
    public function __construct(private EnrollmentService $enrollmentService) {}

    public function index(Request $request)
    {
        $user         = $request->user();
        $jurusanId    = $user->jurusan_id;
        $isSuperAdmin = $user->isSuperAdmin();

        $kelasFilter = $request->kelas_id;

        $mahasiswa = Mahasiswa::with(['kelas.prodi'])
            ->withCount('enrollmentVerifikasi')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->whereHas('kelas.prodi', fn($q2) => $q2->where('jurusan_id', $jurusanId)))
            ->when($kelasFilter, fn($q) => $q->where('kelas_id', $kelasFilter))
            ->orderByRaw("FIELD(status_akun, 'pending_verifikasi', 'pending_upload', 'aktif')")
            ->orderBy('nama')
            ->paginate(config('starterkit.pagination'))
            ->withQueryString();

        $kelas = Kelas::with('prodi')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->whereHas('prodi', fn($q2) => $q2->where('jurusan_id', $jurusanId)))
            ->orderBy('nama')
            ->get(['id', 'nama', 'prodi_id']);

        $dosenList = Dosen::withCount('enrollmentVerifikasi')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('jurusan_id', $jurusanId))
            ->orderByRaw("FIELD(status_enrollment, 'pending_verifikasi', 'pending_upload', 'aktif')")
            ->orderBy('nama')
            ->get(['id', 'nip', 'nama', 'email', 'status_enrollment']);

        return inertia('enrollment/index', [
            'mahasiswa'  => $mahasiswa,
            'dosen_list' => $dosenList,
            'kelas'      => $kelas,
            'filters'    => $request->only('kelas_id'),
            'flash'      => ['success' => session('success'), 'error' => session('error')],
        ]);
    }

    public function detail(Mahasiswa $mahasiswa)
    {
        $statusData = $this->enrollmentService->status($mahasiswa);

        $fotoPreviews = [];
        if ($mahasiswa->foto_paths) {
            foreach ($mahasiswa->foto_paths as $i => $path) {
                $fotoPreviews[] = [
                    'index' => $i,
                    'url'   => route('enrollment.foto-preview', ['mahasiswa' => $mahasiswa->id, 'index' => $i]),
                ];
            }
        }

        return inertia('enrollment/detail', [
            'mahasiswa'     => $mahasiswa->load('kelas'),
            'foto_previews' => $fotoPreviews,
            'jarak_lulus'   => $statusData['jarak_lulus'],
            'semua_lulus'   => $statusData['semua_jarak_lulus'],
            'status_akun'   => $mahasiswa->status_akun,
        ]);
    }

    public function fotoPreview(Mahasiswa $mahasiswa, int $index)
    {
        abort_unless($mahasiswa->foto_paths && isset($mahasiswa->foto_paths[$index]), 404);
        $path = $mahasiswa->foto_paths[$index];
        abort_unless(Storage::disk('local')->exists($path), 404);
        return Storage::disk('local')->response($path);
    }

    public function selfVerifyPage(Request $request)
    {
        abort_unless($request->user()->isMahasiswa(), 403);

        $mahasiswa = $request->user()->mahasiswa;
        abort_if(!$mahasiswa, 404);
        abort_if($mahasiswa->status_akun === 'pending_upload', 422, 'Upload foto terlebih dahulu.');

        $statusData = $this->enrollmentService->status($mahasiswa);

        return inertia('enrollment/self-verify', [
            'mahasiswa'   => $mahasiswa->load('kelas'),
            'jarak_lulus' => $statusData['jarak_lulus'],
        ]);
    }

    public function selfVerifyFrame(Request $request)
    {
        abort_unless($request->user()->isMahasiswa(), 403);

        $mahasiswa = $request->user()->mahasiswa;
        abort_if(!$mahasiswa, 404);

        $request->validate([
            'frame_base64' => ['required', 'string'],
            'jarak'        => ['required', 'in:dekat,sedang,jauh'],
        ]);

        $result = $this->enrollmentService->verifyFrame(
            $mahasiswa,
            $request->frame_base64,
            $request->jarak
        );

        // Auto-approve jika semua 3 jarak sudah lulus
        if (($result['semua_jarak_lulus'] ?? false) && $mahasiswa->status_akun === 'pending_verifikasi') {
            $this->enrollmentService->approve($mahasiswa);
            $result['auto_approved'] = true;
        }

        return response()->json($result);
    }

    public function selfUploadPage(Request $request)
    {
        abort_unless($request->user()->isMahasiswa(), 403);

        $mahasiswa = $request->user()->mahasiswa;
        abort_if(!$mahasiswa, 404);

        $statusData = $this->enrollmentService->status($mahasiswa);

        return inertia('enrollment/self-upload', [
            'mahasiswa' => $mahasiswa->load('kelas'),
            'status'    => $statusData,
        ]);
    }

    public function selfUpload(Request $request)
    {
        abort_unless($request->user()->isMahasiswa(), 403);

        $mahasiswa = $request->user()->mahasiswa;
        abort_if(!$mahasiswa, 404);

        $request->validate([
            'foto.*' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:2048'],
        ]);

        $this->enrollmentService->uploadFoto($mahasiswa, $request->file('foto'));

        return back()->with('success', 'Foto berhasil diupload. Silakan tunggu verifikasi dari admin.');
    }

    public function verifikasi(Mahasiswa $mahasiswa)
    {
        $statusData = $this->enrollmentService->status($mahasiswa);

        return inertia('enrollment/verifikasi', [
            'mahasiswa'   => $mahasiswa->load('kelas'),
            'jarak_lulus' => $statusData['jarak_lulus'],
        ]);
    }

    public function status(Mahasiswa $mahasiswa)
    {
        return response()->json($this->enrollmentService->status($mahasiswa));
    }

    public function verifyFrame(Request $request, Mahasiswa $mahasiswa)
    {
        $request->validate([
            'frame_base64' => ['required', 'string'],
            'jarak'        => ['required', 'in:dekat,sedang,jauh'],
        ]);

        $result = $this->enrollmentService->verifyFrame(
            $mahasiswa,
            $request->frame_base64,
            $request->jarak
        );

        // Auto-approve jika semua 3 jarak sudah lulus
        if (($result['semua_jarak_lulus'] ?? false) && $mahasiswa->status_akun === 'pending_verifikasi') {
            $this->enrollmentService->approve($mahasiswa);
            $result['auto_approved'] = true;
        }

        return response()->json($result);
    }

    public function approve(Mahasiswa $mahasiswa)
    {
        $this->enrollmentService->approve($mahasiswa);
        return back()->with('success', 'Enrollment mahasiswa berhasil disetujui.');
    }

    public function reset(Mahasiswa $mahasiswa)
    {
        $this->enrollmentService->reset($mahasiswa);
        return back()->with('success', 'Enrollment berhasil direset.');
    }
}
