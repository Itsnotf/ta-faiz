<?php

namespace App\Jobs;

use App\Models\AbsensiDosen;
use App\Models\AbsensiMahasiswa;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class LockAlpaJob implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        AbsensiMahasiswa::whereDate('created_at', today())
            ->where('status', 'alpa')
            ->where('is_locked', false)
            ->whereDoesntHave('keterangan', fn($q) => $q->whereIn('status_keterangan', ['pending', 'approved']))
            ->update(['is_locked' => true]);

        // Lock alpa dosen — hanya dapat dikoreksi dalam 3 hari
        AbsensiDosen::whereDate('created_at', '<=', now()->subDays(3))
            ->where('status', 'alpa')
            ->where('is_locked', false)
            ->whereDoesntHave('koreksi', fn($q) => $q->whereIn('status', ['pending', 'approved']))
            ->update(['is_locked' => true, 'locked_at' => now()]);
    }
}
