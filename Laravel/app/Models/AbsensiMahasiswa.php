<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AbsensiMahasiswa extends Model
{
    protected $table = 'absensi_mahasiswa';

    protected $fillable = ['sesi_id', 'mahasiswa_id', 'hadir_at', 'status', 'confidence', 'is_locked'];

    protected $casts = [
        'hadir_at'  => 'datetime',
        'is_locked' => 'boolean',
    ];

    public function sesi(): BelongsTo
    {
        return $this->belongsTo(SesiAbsensi::class, 'sesi_id');
    }

    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(Mahasiswa::class);
    }

    public function keterangan(): HasOne
    {
        return $this->hasOne(Keterangan::class);
    }
}
