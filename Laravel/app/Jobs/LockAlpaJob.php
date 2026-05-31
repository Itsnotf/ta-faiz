<?php

namespace App\Jobs;

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
    }
}
