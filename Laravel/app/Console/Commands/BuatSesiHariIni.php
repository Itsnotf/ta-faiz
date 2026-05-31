<?php

namespace App\Console\Commands;

use App\Models\Jadwal;
use App\Models\SesiAbsensi;
use Carbon\Carbon;
use Illuminate\Console\Command;

class BuatSesiHariIni extends Command
{
    protected $signature   = 'sesi:buat-hari-ini';
    protected $description = 'Buat sesi absensi untuk semua jadwal yang aktif hari ini';

    private array $hariMap = [
        Carbon::MONDAY    => 'senin',
        Carbon::TUESDAY   => 'selasa',
        Carbon::WEDNESDAY => 'rabu',
        Carbon::THURSDAY  => 'kamis',
        Carbon::FRIDAY    => 'jumat',
        Carbon::SATURDAY  => 'sabtu',
        Carbon::SUNDAY    => 'minggu',
    ];

    public function handle(): int
    {
        $hariIni = $this->hariMap[now('Asia/Jakarta')->dayOfWeek] ?? null;

        if (!$hariIni) {
            $this->info('Hari tidak dikenali.');
            return self::SUCCESS;
        }

        $jadwalList = Jadwal::where('hari', $hariIni)
            ->where('is_active', true)
            ->with('ruangan')
            ->get();

        $dibuat = 0;

        foreach ($jadwalList as $jadwal) {
            $mulaiAt = Carbon::today('Asia/Jakarta')
                ->setTimeFromTimeString($jadwal->jam_mulai);

            $selesaiAt = Carbon::today('Asia/Jakarta')
                ->setTimeFromTimeString($jadwal->jam_selesai);

            $sesi = SesiAbsensi::firstOrCreate(
                ['jadwal_id' => $jadwal->id, 'tanggal' => today()],
                [
                    'mulai_at'   => $mulaiAt,
                    'selesai_at' => $selesaiAt,
                    'status'     => 'berlangsung',
                ]
            );

            if ($sesi->wasRecentlyCreated) {
                $dibuat++;
                $this->line("  Sesi dibuat: {$jadwal->mata_kuliah} ({$jadwal->jam_mulai} - {$jadwal->jam_selesai})");
            }
        }

        $this->info("Selesai. {$dibuat} sesi baru dibuat dari " . count($jadwalList) . ' jadwal.');
        return self::SUCCESS;
    }
}
