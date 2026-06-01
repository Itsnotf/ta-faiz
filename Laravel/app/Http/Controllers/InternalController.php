<?php

namespace App\Http\Controllers;

use App\Models\AbsensiDosen;
use App\Models\AbsensiMahasiswa;
use App\Models\Dosen;
use App\Models\Jadwal;
use App\Models\Mahasiswa;
use App\Models\Ruangan;
use App\Models\SesiAbsensi;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            return response()->json(['status' => 'sesi_not_found'], 404);
        }

        // Cek window waktu hadir
        $batasWindow = Carbon::parse($sesi->mulai_at)->addMinutes($sesi->jadwal->window_menit);
        if (now()->isAfter($batasWindow)) {
            return response()->json(['status' => 'out_of_window']);
        }

        if ($request->type === 'mahasiswa') {
            $mhs = Mahasiswa::where('nim', $request->nim_or_nip)->first();
            if (!$mhs) return response()->json(['status' => 'not_found'], 404);

            // Verifikasi mahasiswa terdaftar di kelas yang sesuai dengan sesi ini
            if ($mhs->kelas_id !== $sesi->jadwal->kelas_id) {
                return response()->json(['status' => 'not_in_class'], 403);
            }

            // Cek duplikat
            $exists = AbsensiMahasiswa::where('sesi_id', $sesi->id)
                ->where('mahasiswa_id', $mhs->id)
                ->where('status', 'hadir')
                ->exists();

            if ($exists) {
                return response()->json(['status' => 'duplicate'], 409);
            }

            AbsensiMahasiswa::updateOrCreate(
                ['sesi_id' => $sesi->id, 'mahasiswa_id' => $mhs->id],
                ['status' => 'hadir', 'hadir_at' => now(), 'confidence' => $request->confidence]
            );

            return response()->json(['status' => 'recorded', 'nama' => $mhs->nama, 'is_duplicate' => false]);

        } else {
            $dsn = Dosen::where('nip', $request->nim_or_nip)->first();
            if (!$dsn) return response()->json(['status' => 'not_found'], 404);

            $exists = AbsensiDosen::where('sesi_id', $sesi->id)
                ->where('dosen_id', $dsn->id)
                ->where('status', 'hadir')
                ->exists();

            if ($exists) {
                return response()->json(['status' => 'duplicate'], 409);
            }

            AbsensiDosen::updateOrCreate(
                ['sesi_id' => $sesi->id, 'dosen_id' => $dsn->id],
                ['status' => 'hadir', 'hadir_at' => now(), 'confidence' => $request->confidence]
            );

            return response()->json(['status' => 'recorded', 'nama' => $dsn->nama, 'is_duplicate' => false]);
        }
    }
}
