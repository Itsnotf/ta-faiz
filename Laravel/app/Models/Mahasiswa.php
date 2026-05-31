<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Mahasiswa extends Model
{
    protected $table = 'mahasiswa';

    protected $fillable = [
        'user_id', 'kelas_id', 'nim', 'nama',
        'foto_paths', 'face_encodings', 'enrollment_score',
        'status_akun', 'foto_verified_at',
    ];

    protected $casts = [
        'face_encodings'  => 'array',
        'foto_paths'      => 'array',
        'foto_verified_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(Kelas::class);
    }

    public function keterangan(): HasMany
    {
        return $this->hasMany(Keterangan::class);
    }

    public function enrollmentVerifikasi(): HasMany
    {
        return $this->hasMany(EnrollmentVerifikasi::class);
    }
}
