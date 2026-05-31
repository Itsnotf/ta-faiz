<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Institusi extends Model
{
    protected $table = 'institusi';

    protected $fillable = ['nama', 'alamat', 'logo'];

    public function jurusan(): HasMany
    {
        return $this->hasMany(Jurusan::class);
    }
}
