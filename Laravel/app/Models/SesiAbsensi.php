<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SesiAbsensi extends Model
{
    protected $table = 'sesi_absensi';

    protected $fillable = ['jadwal_id', 'tanggal', 'mulai_at', 'selesai_at', 'status'];

    protected $casts = [
        'tanggal'    => 'date',
        'mulai_at'   => 'datetime',
        'selesai_at' => 'datetime',
    ];

    public function jadwal(): BelongsTo
    {
        return $this->belongsTo(Jadwal::class);
    }

    public function absensiMahasiswa(): HasMany
    {
        return $this->hasMany(AbsensiMahasiswa::class, 'sesi_id');
    }

    public function absensiDosen(): HasMany
    {
        return $this->hasMany(AbsensiDosen::class, 'sesi_id');
    }
}
