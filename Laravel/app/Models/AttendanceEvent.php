<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceEvent extends Model
{
    protected $table = 'attendance_events';

    protected $fillable = [
        'sesi_id', 'person_type', 'person_id', 'nim_or_nip_raw',
        'ruangan_id_reported', 'confidence', 'decision', 'reject_reason', 'detected_at',
    ];

    protected $casts = [
        'detected_at' => 'datetime',
    ];

    public function sesi(): BelongsTo
    {
        return $this->belongsTo(SesiAbsensi::class, 'sesi_id');
    }
}
