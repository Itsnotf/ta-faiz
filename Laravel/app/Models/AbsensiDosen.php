<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AbsensiDosen extends Model
{
    protected $table = 'absensi_dosen';

    protected $fillable = [
        'sesi_id', 'dosen_id', 'hadir_at',
        'status', 'confidence', 'is_locked', 'locked_at',
    ];

    protected $casts = [
        'hadir_at'  => 'datetime',
        'locked_at' => 'datetime',
    ];

    public function sesi(): BelongsTo
    {
        return $this->belongsTo(SesiAbsensi::class, 'sesi_id');
    }

    public function dosen(): BelongsTo
    {
        return $this->belongsTo(Dosen::class);
    }

    public function koreksi(): HasMany
    {
        return $this->hasMany(KoreksiAbsensiDosen::class);
    }
}
