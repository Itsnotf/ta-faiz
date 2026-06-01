<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnrollmentVerifikasiDosen extends Model
{
    protected $table = 'enrollment_verifikasi_dosen';

    protected $fillable = ['dosen_id', 'jarak', 'confidence', 'verified_at'];

    protected $casts = ['verified_at' => 'datetime'];

    public function dosen(): BelongsTo
    {
        return $this->belongsTo(Dosen::class);
    }
}
