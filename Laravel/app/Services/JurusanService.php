<?php

namespace App\Services;

use App\Models\Jurusan;
use App\Models\Institusi;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class JurusanService
{
    public function index(?string $search, ?int $jurusanId, bool $isSuperAdmin): LengthAwarePaginator
    {
        return Jurusan::query()
            ->with('institusi')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('id', $jurusanId))
            ->when($search, fn($q) => $q->where('nama', 'like', "%{$search}%"))
            ->latest()
            ->paginate(config('starterkit.pagination'))
            ->withQueryString();
    }

    public function getAllInstitusi(): Collection
    {
        return Institusi::orderBy('nama')->get(['id', 'nama']);
    }

    public function store(array $data): Jurusan
    {
        return Jurusan::create($data);
    }

    public function update(Jurusan $jurusan, array $data): Jurusan
    {
        $jurusan->update($data);
        return $jurusan;
    }

    public function destroy(Jurusan $jurusan): void
    {
        $jurusan->delete();
    }
}
