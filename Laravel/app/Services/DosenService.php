<?php

namespace App\Services;

use App\Models\Dosen;
use App\Models\Jurusan;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class DosenService
{
    public function index(?string $search, ?int $jurusanId, bool $isSuperAdmin): LengthAwarePaginator
    {
        return Dosen::query()
            ->with('jurusan')
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('jurusan_id', $jurusanId))
            ->when($search, fn($q) => $q->where('nama', 'like', "%{$search}%"))
            ->latest()
            ->paginate(config('starterkit.pagination'))
            ->withQueryString();
    }

    public function getJurusanOptions(?int $jurusanId, bool $isSuperAdmin): Collection
    {
        return Jurusan::query()
            ->when(!$isSuperAdmin && $jurusanId, fn($q) => $q->where('id', $jurusanId))
            ->orderBy('nama')
            ->get(['id', 'nama']);
    }

    public function store(array $data): Dosen
    {
        return Dosen::create($data);
    }

    public function update(Dosen $dosen, array $data): Dosen
    {
        $dosen->update($data);
        return $dosen;
    }

    public function destroy(Dosen $dosen): void
    {
        $dosen->delete();
    }
}
