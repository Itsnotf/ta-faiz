<?php

namespace App\Services;

use App\Models\Institusi;
use Illuminate\Pagination\LengthAwarePaginator;

class InstitusiService
{
    public function index(?string $search): LengthAwarePaginator
    {
        return Institusi::query()
            ->when($search, fn($q) => $q->where('nama', 'like', "%{$search}%"))
            ->latest()
            ->paginate(config('starterkit.pagination'))
            ->withQueryString();
    }

    public function store(array $data): Institusi
    {
        return Institusi::create($data);
    }

    public function update(Institusi $institusi, array $data): Institusi
    {
        $institusi->update($data);
        return $institusi;
    }

    public function destroy(Institusi $institusi): void
    {
        $institusi->delete();
    }
}
