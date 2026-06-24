<?php

namespace App\Services;

use App\Models\EnrollmentVerifikasi;
use App\Models\Mahasiswa;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class EnrollmentService
{
    private string $pythonUrl;
    private float  $enrollmentThreshold;

    public function __construct()
    {
        $this->pythonUrl            = config('services.python.url', 'http://localhost:8001');
        $this->enrollmentThreshold  = (float) config('services.python.enrollment_threshold', 0.60);
    }

    public function uploadFoto(Mahasiswa $mhs, array $files): void
    {
        if (count($files) !== 5) {
            throw ValidationException::withMessages(['foto' => 'Harus mengirim tepat 5 foto wajah.']);
        }

        $dir     = "enrollment/{$mhs->id}";
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
            throw ValidationException::withMessages(['foto' => 'Layanan face recognition tidak tersedia. Pastikan Python service berjalan.']);
        }

        $data = $resp->json();

        if (isset($data['error'])) {
            $no = ($data['foto_index'] ?? 0) + 1;
            throw ValidationException::withMessages(['foto' => "Foto ke-{$no} tidak terdeteksi wajah. Gunakan foto yang lebih jelas."]);
        }

        $mhs->update([
            'foto_paths'     => $paths,
            'face_encodings' => $data['encodings'],
            'status_akun'    => 'pending_verifikasi',
        ]);
    }

    public function verifyFrame(Mahasiswa $mhs, string $frameBase64, string $jarak): array
    {
        try {
            $resp = Http::timeout(15)->post("{$this->pythonUrl}/enroll/verify-frame", [
                'frame_base64'    => $frameBase64,
                'known_encodings' => $mhs->face_encodings,
                'jarak'           => $jarak,
                'threshold'       => $this->enrollmentThreshold,
            ]);
        } catch (ConnectionException) {
            throw ValidationException::withMessages(['frame' => 'Layanan face recognition tidak tersedia. Pastikan Python service berjalan.']);
        }

        $result = $resp->json();

        if (($result['lulus'] ?? false) === true) {
            EnrollmentVerifikasi::updateOrCreate(
                ['mahasiswa_id' => $mhs->id, 'jarak' => $jarak],
                ['confidence' => $result['confidence'], 'verified_at' => now()]
            );
        }

        $jumlahLulus         = EnrollmentVerifikasi::where('mahasiswa_id', $mhs->id)->count();
        $result['semua_jarak_lulus'] = $jumlahLulus >= 3;

        return $result;
    }

    public function approve(Mahasiswa $mhs): void
    {
        $count = EnrollmentVerifikasi::where('mahasiswa_id', $mhs->id)->count();

        if ($count < 3) {
            throw ValidationException::withMessages(['approve' => 'Verifikasi 3 jarak (dekat, sedang, jauh) belum selesai.']);
        }

        $mhs->update([
            'status_akun'      => 'aktif',
            'foto_verified_at' => now(),
        ]);
    }

    public function reset(Mahasiswa $mhs): void
    {
        if ($mhs->foto_paths) {
            foreach ($mhs->foto_paths as $path) {
                Storage::disk('local')->delete($path);
            }
        }

        EnrollmentVerifikasi::where('mahasiswa_id', $mhs->id)->delete();

        $mhs->update([
            'face_encodings'   => null,
            'foto_paths'       => null,
            'enrollment_score' => null,
            'foto_verified_at' => null,
            'status_akun'      => 'pending_upload',
        ]);
    }

    public function status(Mahasiswa $mhs): array
    {
        $lulus = EnrollmentVerifikasi::where('mahasiswa_id', $mhs->id)
            ->pluck('jarak')
            ->toArray();

        return [
            'status_akun'       => $mhs->status_akun,
            'jarak_lulus'       => $lulus,
            'semua_jarak_lulus' => count($lulus) >= 3,
        ];
    }
}
