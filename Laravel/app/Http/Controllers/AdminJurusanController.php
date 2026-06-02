<?php

namespace App\Http\Controllers;

use App\Models\AdminJurusan;
use App\Models\Jurusan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminJurusanController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:users index',  only: ['index']),
            new Middleware('permission:users create', only: ['store']),
            new Middleware('permission:users edit',   only: ['update']),
            new Middleware('permission:users delete', only: ['destroy']),
        ];
    }

    public function index()
    {
        $adminList = AdminJurusan::with(['user', 'jurusan'])
            ->orderBy('nama')
            ->paginate(config('starterkit.pagination'));

        $jurusanList = Jurusan::orderBy('nama')->get(['id', 'nama']);

        return inertia('admin-jurusan/index', [
            'admin_list'  => $adminList,
            'jurusan'     => $jurusanList,
            'flash'       => ['success' => session('success')],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama'       => ['required', 'string', 'max:255'],
            'email'      => ['required', 'email', 'max:255', 'unique:users,email', 'unique:admin_jurusan,email'],
            'no_hp'      => ['nullable', 'string', 'max:20'],
            'jurusan_id' => ['required', 'exists:jurusan,id'],
        ]);

        DB::transaction(function () use ($request) {
            $user = User::create([
                'name'              => $request->nama,
                'email'             => $request->email,
                'password'          => Hash::make('Password@123'),
                'email_verified_at' => now(),
            ]);
            $user->syncRoles('admin_jurusan');

            AdminJurusan::create([
                'user_id'    => $user->id,
                'jurusan_id' => $request->jurusan_id,
                'nama'       => $request->nama,
                'email'      => $request->email,
                'no_hp'      => $request->no_hp,
            ]);
        });

        return back()->with('success',
            "Admin jurusan berhasil dibuat. Login: {$request->email} / Password@123"
        );
    }

    public function update(Request $request, AdminJurusan $adminJurusan)
    {
        $request->validate([
            'nama'       => ['required', 'string', 'max:255'],
            'email'      => [
                'required', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($adminJurusan->user_id),
                Rule::unique('admin_jurusan', 'email')->ignore($adminJurusan->id),
            ],
            'no_hp'      => ['nullable', 'string', 'max:20'],
            'jurusan_id' => ['required', 'exists:jurusan,id'],
        ]);

        DB::transaction(function () use ($request, $adminJurusan) {
            $adminJurusan->update([
                'nama'       => $request->nama,
                'email'      => $request->email,
                'no_hp'      => $request->no_hp,
                'jurusan_id' => $request->jurusan_id,
            ]);

            if ($adminJurusan->user) {
                $adminJurusan->user->update([
                    'name'  => $request->nama,
                    'email' => $request->email,
                ]);
            }
        });

        return back()->with('success', 'Data admin jurusan berhasil diperbarui.');
    }

    public function destroy(AdminJurusan $adminJurusan)
    {
        DB::transaction(function () use ($adminJurusan) {
            $userId = $adminJurusan->user_id;
            $adminJurusan->delete();
            if ($userId) User::destroy($userId);
        });

        return back()->with('success', 'Admin jurusan berhasil dihapus.');
    }
}
