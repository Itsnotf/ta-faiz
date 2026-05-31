<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ruangan extends Model
{
    protected $table = 'ruangan';

    protected $fillable = ['jurusan_id', 'nama', 'kode', 'kapasitas', 'cctv_url'];

    public function jurusan(): BelongsTo
    {
        return $this->belongsTo(Jurusan::class);
    }
}
