<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (config('starterkit.permissions') as $key => $value) {
            $name = is_int($key) ? $value : $key;
            \Spatie\Permission\Models\Permission::create(['name' => $name]);
        }
    }
}
