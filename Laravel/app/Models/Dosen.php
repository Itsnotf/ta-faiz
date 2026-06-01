<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Dosen extends Model
{
    protected $table = 'dosen';

    protected $fillable = [
        'user_id', 'jurusan_id', 'nip', 'nama', 'email',
        'foto_path', 'foto_paths', 'face_encodings',
        'status_enrollment', 'foto_verified_at',
    ];

    protected $casts = [
        'face_encodings'   => 'array',
        'foto_paths'       => 'array',
        'foto_verified_at' => 'datetime',
    ];

    public function jurusan(): BelongsTo
    {
        return $this->belongsTo(Jurusan::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function enrollmentVerifikasi(): HasMany
    {
        return $this->hasMany(EnrollmentVerifikasiDosen::class);
    }

    public function absensi(): HasMany
    {
        return $this->hasMany(AbsensiDosen::class);
    }
}
