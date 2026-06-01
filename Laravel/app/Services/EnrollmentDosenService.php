<?php

namespace App\Services;

use App\Models\Dosen;
use App\Models\EnrollmentVerifikasiDosen;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class EnrollmentDosenService
{
    private string $pythonUrl;
    private float  $enrollmentThreshold;

    public function __construct()
    {
        $this->pythonUrl           = config('services.python.url', 'http://localhost:8001');
        $this->enrollmentThreshold = (float) config('services.python.enrollment_threshold', 0.75);
    }

    public function uploadFoto(Dosen $dosen, array $files): void
    {
        if (count($files) !== 5) {
            throw ValidationException::withMessages(['foto' => 'Harus mengirim tepat 5 foto wajah.']);
        }

        $dir     = "enrollment_dosen/{$dosen->id}";
        $paths   = [];
        $b64List = [];

        foreach ($files as $file) {
            $path      = $file->store($dir, 'local');
            $paths[]   = $path;
            $b64List[] = base64_encode(Storage::disk('local')->get($path));
        }

        try {
            $resp = Http::timeout(30)->post("{$this->pythonUrl}/enroll/generate-encoding", [
                'foto_list' => $b64List,
            ]);
        } catch (ConnectionException) {
            throw ValidationException::withMessages(['foto' => 'Layanan face recognition tidak tersedia.']);
        }

        $data = $resp->json();

        if (isset($data['error'])) {
            $no = ($data['foto_index'] ?? 0) + 1;
            throw ValidationException::withMessages(['foto' => "Foto ke-{$no} tidak terdeteksi wajah."]);
        }

        $dosen->update([
            'foto_paths'        => $paths,
            'face_encodings'    => $data['encodings'],
            'status_enrollment' => 'pending_verifikasi',
        ]);
    }

    public function verifyFrame(Dosen $dosen, string $frameBase64, string $jarak): array
    {
        try {
            $resp = Http::timeout(15)->post("{$this->pythonUrl}/enroll/verify-frame", [
                'frame_base64'    => $frameBase64,
                'known_encodings' => $dosen->face_encodings,
                'jarak'           => $jarak,
                'threshold'       => $this->enrollmentThreshold,
            ]);
        } catch (ConnectionException) {
            throw ValidationException::withMessages(['frame' => 'Layanan face recognition tidak tersedia.']);
        }

        $result = $resp->json();

        if (($result['lulus'] ?? false) === true) {
            EnrollmentVerifikasiDosen::updateOrCreate(
                ['dosen_id' => $dosen->id, 'jarak' => $jarak],
                ['confidence' => $result['confidence'], 'verified_at' => now()]
            );
        }

        $semuaJarakLulus = EnrollmentVerifikasiDosen::where('dosen_id', $dosen->id)->count() >= 3;

        return [
            'lulus'             => $result['lulus'] ?? false,
            'confidence'        => $result['confidence'] ?? 0,
            'semua_jarak_lulus' => $semuaJarakLulus,
        ];
    }

    public function approve(Dosen $dosen): void
    {
        $lulus = EnrollmentVerifikasiDosen::where('dosen_id', $dosen->id)->count();
        if ($lulus < 3) {
            throw ValidationException::withMessages(['enrollment' => 'Dosen belum lulus verifikasi 3 jarak.']);
        }

        $dosen->update([
            'status_enrollment' => 'aktif',
            'foto_verified_at'  => now(),
        ]);
    }

    public function reset(Dosen $dosen): void
    {
        if ($dosen->foto_paths) {
            foreach ($dosen->foto_paths as $path) {
                Storage::disk('local')->delete($path);
            }
        }

        EnrollmentVerifikasiDosen::where('dosen_id', $dosen->id)->delete();

        $dosen->update([
            'foto_paths'        => null,
            'face_encodings'    => null,
            'status_enrollment' => 'pending_upload',
            'foto_verified_at'  => null,
        ]);
    }

    public function status(Dosen $dosen): array
    {
        $jarakLulus = EnrollmentVerifikasiDosen::where('dosen_id', $dosen->id)
            ->pluck('confidence', 'jarak');

        return [
            'status_enrollment' => $dosen->status_enrollment,
            'jarak_lulus'       => $jarakLulus,
            'semua_jarak_lulus' => $jarakLulus->count() >= 3,
        ];
    }
}
