<?php

namespace App\Http\Controllers;

use App\Models\AbsensiDosen;
use App\Models\AbsensiMahasiswa;
use App\Models\AttendanceEvent;
use App\Models\Dosen;
use App\Models\Jadwal;
use App\Models\Mahasiswa;
use App\Models\Ruangan;
use App\Models\SesiAbsensi;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InternalController extends Controller
{
    // ── GET /internal/sesi-aktif ─────────────────────────────────────────────

    public function sesiAktif(): JsonResponse
    {
        $now     = now();
        $hariMap = [0=>'minggu',1=>'senin',2=>'selasa',3=>'rabu',4=>'kamis',5=>'jumat',6=>'sabtu'];
        $hariIni = $hariMap[$now->dayOfWeek];

        // Auto-buat sesi untuk jadwal yang seharusnya berlangsung sekarang
        $jadwalAktif = Jadwal::where('hari', $hariIni)
            ->where('is_active', true)
            ->whereTime('jam_mulai', '<=', $now->format('H:i:s'))
            ->whereTime('jam_selesai', '>', $now->format('H:i:s'))
            ->get();

        foreach ($jadwalAktif as $jadwal) {
            SesiAbsensi::firstOrCreate(
                ['jadwal_id' => $jadwal->id, 'tanggal' => today()],
                [
                    'mulai_at'   => Carbon::today()->setTimeFromTimeString($jadwal->jam_mulai),
                    'selesai_at' => Carbon::today()->setTimeFromTimeString($jadwal->jam_selesai),
                    'status'     => 'berlangsung',
                ]
            );
        }

        // Kembalikan semua sesi yang sedang berlangsung
        $sesi = SesiAbsensi::where('status', 'berlangsung')
            ->with(['jadwal.ruangan'])
            ->get()
            ->map(fn($s) => [
                'sesi_id'      => $s->id,
                'ruangan_id'   => $s->jadwal->ruangan_id,
                'cctv_url'     => $s->jadwal->ruangan->cctv_url,
                'mulai_at'     => $s->mulai_at->toIso8601String(),
                'selesai_at'   => $s->selesai_at?->toIso8601String(),
                'window_menit' => $s->jadwal->window_menit,
                'tanggal'      => $s->tanggal instanceof \Carbon\Carbon ? $s->tanggal->toDateString() : (string) $s->tanggal,
                'jam_selesai'  => substr((string) $s->jadwal->jam_selesai, 0, 5),
            ]);

        return response()->json(['sesi_aktif' => $sesi]);
    }

    // ── GET /internal/encodings/{ruangan} ────────────────────────────────────

    public function encodings(Ruangan $ruangan): JsonResponse
    {
        // Cari jadwal yang sedang berlangsung di ruangan ini (via sesi aktif hari ini)
        $jadwalAktif = Jadwal::where('ruangan_id', $ruangan->id)
            ->where('is_active', true)
            ->whereHas('sesiAbsensi', fn($q) => $q->where('status', 'berlangsung')->whereDate('tanggal', today()))
            ->with(['kelas.mahasiswa', 'dosen'])
            ->get();

        $mahasiswaList = collect();
        $dosenList     = collect();

        foreach ($jadwalAktif as $jadwal) {
            // Mahasiswa dari kelas jadwal
            foreach ($jadwal->kelas->mahasiswa ?? [] as $mhs) {
                if ($mhs->face_encodings && $mhs->status_akun === 'aktif' && !$mahasiswaList->contains('id', $mhs->id)) {
                    $mahasiswaList->push([
                        'id'        => $mhs->id,
                        'nim'       => $mhs->nim,
                        'nama'      => $mhs->nama,
                        'encodings' => $mhs->face_encodings,
                    ]);
                }
            }

            // Dosen jadwal
            $dsn = $jadwal->dosen;
            if ($dsn && $dsn->face_encodings && !$dosenList->contains('id', $dsn->id)) {
                $dosenList->push([
                    'id'        => $dsn->id,
                    'nip'       => $dsn->nip,
                    'nama'      => $dsn->nama,
                    'encodings' => $dsn->face_encodings,
                ]);
            }
        }

        return response()->json([
            'mahasiswa' => $mahasiswaList->values(),
            'dosen'     => $dosenList->values(),
        ]);
    }

    // ── POST /internal/absensi/record ────────────────────────────────────────

    public function recordAbsensi(Request $request): JsonResponse
    {
        $request->validate([
            'nim_or_nip' => ['required', 'string'],
            'type'       => ['required', 'in:mahasiswa,dosen'],
            'ruangan_id' => ['required', 'integer'],
            'sesi_id'    => ['required', 'integer'],
            'confidence' => ['required', 'numeric'],
        ]);

        $sesi = SesiAbsensi::where('id', $request->sesi_id)
            ->where('status', 'berlangsung')
            ->with('jadwal')
            ->first();

        if (!$sesi) {
            $this->logEvent($request, null, null, 'rejected', 'sesi_not_found');
            return response()->json(['status' => 'sesi_not_found'], 404);
        }

        // Re-validasi confidence di Laravel — jangan percaya angka dari Python begitu saja.
        $threshold = (float) config('services.python.absensi_threshold', 0.65);
        if ($request->confidence < $threshold) {
            $this->logEvent($request, $sesi->id, null, 'rejected', 'low_confidence');
            return response()->json(['status' => 'low_confidence']);
        }

        // Event harus berasal dari ruangan yang sesuai jadwal sesi ini.
        if ((int) $request->ruangan_id !== (int) $sesi->jadwal->ruangan_id) {
            $this->logEvent($request, $sesi->id, null, 'rejected', 'wrong_room');
            return response()->json(['status' => 'wrong_room'], 403);
        }

        $windowMenit = $request->type === 'dosen'
            ? $sesi->jadwal->window_dosen_menit
            : $sesi->jadwal->window_menit;
        $batasWindow = Carbon::parse($sesi->mulai_at)->addMinutes($windowMenit);
        if (now()->isAfter($batasWindow)) {
            $this->logEvent($request, $sesi->id, null, 'rejected', 'out_of_window');
            return response()->json(['status' => 'out_of_window']);
        }

        return $request->type === 'mahasiswa'
            ? $this->recordMahasiswa($request, $sesi)
            : $this->recordDosen($request, $sesi);
    }

    private function recordMahasiswa(Request $request, SesiAbsensi $sesi): JsonResponse
    {
        $mhs = Mahasiswa::where('nim', $request->nim_or_nip)->first();
        if (!$mhs) {
            $this->logEvent($request, $sesi->id, null, 'rejected', 'not_found');
            return response()->json(['status' => 'not_found'], 404);
        }

        if ($mhs->kelas_id !== $sesi->jadwal->kelas_id) {
            $this->logEvent($request, $sesi->id, $mhs->id, 'rejected', 'not_in_class');
            return response()->json(['status' => 'not_in_class'], 403);
        }

        // Jangan andalkan Python saja soal status enrollment — cek ulang di backend.
        if ($mhs->status_akun !== 'aktif') {
            $this->logEvent($request, $sesi->id, $mhs->id, 'rejected', 'enrollment_not_verified');
            return response()->json(['status' => 'enrollment_not_verified'], 403);
        }

        return DB::transaction(function () use ($request, $sesi, $mhs) {
            $existing = AbsensiMahasiswa::where('sesi_id', $sesi->id)
                ->where('mahasiswa_id', $mhs->id)
                ->lockForUpdate()
                ->first();

            if ($existing && $existing->status === 'hadir') {
                $this->logEvent($request, $sesi->id, $mhs->id, 'rejected', 'duplicate');
                return response()->json(['status' => 'duplicate'], 409);
            }

            AbsensiMahasiswa::updateOrCreate(
                ['sesi_id' => $sesi->id, 'mahasiswa_id' => $mhs->id],
                ['status' => 'hadir', 'hadir_at' => now(), 'confidence' => $request->confidence]
            );

            $this->logEvent($request, $sesi->id, $mhs->id, 'accepted', null);

            return response()->json(['status' => 'recorded', 'nama' => $mhs->nama, 'is_duplicate' => false]);
        });
    }

    private function recordDosen(Request $request, SesiAbsensi $sesi): JsonResponse
    {
        $dsn = Dosen::where('nip', $request->nim_or_nip)->first();
        if (!$dsn) {
            $this->logEvent($request, $sesi->id, null, 'rejected', 'not_found');
            return response()->json(['status' => 'not_found'], 404);
        }

        if ($dsn->status_enrollment !== 'aktif') {
            $this->logEvent($request, $sesi->id, $dsn->id, 'rejected', 'enrollment_not_verified');
            return response()->json(['status' => 'enrollment_not_verified'], 403);
        }

        return DB::transaction(function () use ($request, $sesi, $dsn) {
            $existing = AbsensiDosen::where('sesi_id', $sesi->id)
                ->where('dosen_id', $dsn->id)
                ->lockForUpdate()
                ->first();

            if ($existing && $existing->status === 'hadir') {
                $this->logEvent($request, $sesi->id, $dsn->id, 'rejected', 'duplicate');
                return response()->json(['status' => 'duplicate'], 409);
            }

            AbsensiDosen::updateOrCreate(
                ['sesi_id' => $sesi->id, 'dosen_id' => $dsn->id],
                ['status' => 'hadir', 'hadir_at' => now(), 'confidence' => $request->confidence]
            );

            $this->logEvent($request, $sesi->id, $dsn->id, 'accepted', null);

            return response()->json(['status' => 'recorded', 'nama' => $dsn->nama, 'is_duplicate' => false]);
        });
    }

    private function logEvent(Request $request, ?int $sesiId, ?int $personId, string $decision, ?string $reason): void
    {
        AttendanceEvent::create([
            'sesi_id'             => $sesiId,
            'person_type'         => $request->type,
            'person_id'           => $personId,
            'nim_or_nip_raw'      => $request->nim_or_nip,
            'ruangan_id_reported' => $request->ruangan_id,
            'confidence'          => $request->confidence,
            'decision'            => $decision,
            'reject_reason'       => $reason,
            'detected_at'         => now(),
        ]);
    }
}
