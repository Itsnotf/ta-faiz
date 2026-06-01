<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KoreksiAbsensiDosen extends Model
{
    protected $table = 'koreksi_absensi_dosen';

    protected $fillable = [
        'absensi_dosen_id', 'dosen_id', 'bukti_path',
        'catatan', 'status', 'catatan_admin',
        'disetujui_oleh', 'diproses_at',
    ];

    protected $casts = ['diproses_at' => 'datetime'];

    public function absensiDosen(): BelongsTo
    {
        return $this->belongsTo(AbsensiDosen::class);
    }

    public function dosen(): BelongsTo
    {
        return $this->belongsTo(Dosen::class);
    }

    public function disetujuiOleh(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disetujui_oleh');
    }
}
