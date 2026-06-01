<?php

namespace App\Jobs;

use App\Models\AbsensiDosen;
use App\Models\AbsensiMahasiswa;
use App\Models\SesiAbsensi;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class BatchAlpaJob implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        // Cari sesi yang berlangsung tapi sudah melewati jam selesai
        $sesiSelesai = SesiAbsensi::where('status', 'berlangsung')
            ->with(['jadwal.kelas.mahasiswa'])
            ->get()
            ->filter(function ($sesi) {
                // Jika selesai_at eksplisit sudah lewat
                if ($sesi->selesai_at && now()->isAfter($sesi->selesai_at)) {
                    return true;
                }

                // Atau jam_selesai jadwal sudah lewat hari ini
                if ($sesi->jadwal) {
                    $selesaiAt = Carbon::today('Asia/Jakarta')
                        ->setTimeFromTimeString($sesi->jadwal->jam_selesai)
                        ->utc();
                    return now()->isAfter($selesaiAt);
                }

                return false;
            });

        foreach ($sesiSelesai as $sesi) {
            $mahasiswaKelas = $sesi->jadwal->kelas->mahasiswa ?? collect();

            foreach ($mahasiswaKelas as $mhs) {
                // Hanya insert alpa jika belum ada record sama sekali
                AbsensiMahasiswa::firstOrCreate(
                    ['sesi_id' => $sesi->id, 'mahasiswa_id' => $mhs->id],
                    ['status' => 'alpa', 'is_locked' => false]
                );
            }

            // Alpa dosen — hanya insert jika window dosen juga sudah lewat
            $jadwal = $sesi->jadwal;
            if ($jadwal && $jadwal->dosen_id) {
                $batasDosen = Carbon::parse($sesi->mulai_at)->addMinutes($jadwal->window_dosen_menit);
                if (now()->isAfter($batasDosen)) {
                    AbsensiDosen::firstOrCreate(
                        ['sesi_id' => $sesi->id, 'dosen_id' => $jadwal->dosen_id],
                        ['status' => 'alpa', 'is_locked' => false]
                    );
                }
            }

            // Tandai sesi selesai
            $sesi->update([
                'status'     => 'selesai',
                'selesai_at' => $sesi->selesai_at ?? now(),
            ]);
        }
    }
}
