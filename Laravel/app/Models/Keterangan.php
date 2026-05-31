<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Keterangan extends Model
{
    protected $table = 'keterangan';

    protected $fillable = [
        'absensi_mahasiswa_id', 'mahasiswa_id', 'jenis', 'keterangan',
        'file_bukti', 'diajukan_oleh', 'status_keterangan',
        'disetujui_oleh', 'approved_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    public function absensiMahasiswa(): BelongsTo
    {
        return $this->belongsTo(AbsensiMahasiswa::class);
    }

    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(Mahasiswa::class);
    }

    public function disetujuiOleh(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disetujui_oleh');
    }
}
