<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Jurusan extends Model
{
    protected $table = 'jurusan';

    protected $fillable = ['institusi_id', 'nama', 'kode'];

    public function institusi(): BelongsTo
    {
        return $this->belongsTo(Institusi::class);
    }

    public function prodi(): HasMany
    {
        return $this->hasMany(Prodi::class);
    }

    public function ruangan(): HasMany
    {
        return $this->hasMany(Ruangan::class);
    }
}
