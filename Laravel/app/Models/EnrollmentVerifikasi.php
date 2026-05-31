<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnrollmentVerifikasi extends Model
{
    protected $table = 'enrollment_verifikasi';

    protected $fillable = ['mahasiswa_id', 'jarak', 'confidence', 'verified_at'];

    protected $casts = [
        'verified_at' => 'datetime',
        'confidence'  => 'float',
    ];

    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(Mahasiswa::class);
    }
}
