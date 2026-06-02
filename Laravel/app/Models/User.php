<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, Notifiable, TwoFactorAuthenticatable, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'       => 'datetime',
            'password'                => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    // ── Relasi ─────────────────────────────────────────────────────────────

    public function adminJurusan(): HasOne
    {
        return $this->hasOne(AdminJurusan::class);
    }

    public function mahasiswa(): HasOne
    {
        return $this->hasOne(Mahasiswa::class);
    }

    public function dosen(): HasOne
    {
        return $this->hasOne(Dosen::class);
    }

    // ── Accessor: jurusan_id (dipakai semua controller tanpa perlu diubah) ─

    public function getJurusanIdAttribute(): ?int
    {
        if ($this->isAdminJurusan()) {
            return $this->adminJurusan?->jurusan_id;
        }

        if ($this->isDosen()) {
            return $this->dosen?->jurusan_id;
        }

        return null;
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    public function getUserPermissions()
    {
        return $this->getAllPermissions()->mapWithKeys(fn($permission) => [$permission['name'] => true]);
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    public function isAdminJurusan(): bool
    {
        return $this->hasRole('admin_jurusan');
    }

    public function isMahasiswa(): bool
    {
        return $this->hasRole('mahasiswa');
    }

    public function isDosen(): bool
    {
        return $this->hasRole('dosen');
    }
}
