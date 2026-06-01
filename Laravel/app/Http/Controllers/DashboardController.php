<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private DashboardService $dashboardService) {}

    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            return inertia('dashboard/super-admin', $this->dashboardService->forSuperAdmin());
        }

        if ($user->isAdminJurusan()) {
            return inertia('dashboard/admin-jurusan', $this->dashboardService->forAdminJurusan($user));
        }

        if ($user->isMahasiswa()) {
            return inertia('dashboard/mahasiswa', $this->dashboardService->forMahasiswa($user));
        }

        if ($user->isDosen()) {
            return inertia('dashboard/dosen', $this->dashboardService->forDosen($user));
        }

        return inertia('dashboard/admin', $this->dashboardService->adminStats());
    }
}
