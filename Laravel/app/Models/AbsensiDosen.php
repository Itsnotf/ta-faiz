<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AbsensiDosen extends Model
{
    protected $table = 'absensi_dosen';

    protected $fillable = ['sesi_id', 'dosen_id', 'hadir_at', 'status', 'confidence'];

    protected $casts = [
        'hadir_at' => 'datetime',
    ];

    public function sesi(): BelongsTo
    {
        return $this->belongsTo(SesiAbsensi::class, 'sesi_id');
    }

    public function dosen(): BelongsTo
    {
        return $this->belongsTo(Dosen::class);
    }
}
