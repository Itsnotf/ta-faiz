<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Dosen extends Model
{
    protected $table = 'dosen';

    protected $fillable = ['jurusan_id', 'nip', 'nama', 'email', 'foto_path', 'face_encodings'];

    protected $casts = [
        'face_encodings' => 'array',
    ];

    public function jurusan(): BelongsTo
    {
        return $this->belongsTo(Jurusan::class);
    }
}
