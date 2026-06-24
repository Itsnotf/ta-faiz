<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('absensi_mahasiswa', function (Blueprint $table) {
            $table->unique(['sesi_id', 'mahasiswa_id']);
        });

        Schema::table('absensi_dosen', function (Blueprint $table) {
            $table->unique(['sesi_id', 'dosen_id']);
        });
    }

    public function down(): void
    {
        Schema::table('absensi_mahasiswa', function (Blueprint $table) {
            $table->dropUnique(['sesi_id', 'mahasiswa_id']);
        });

        Schema::table('absensi_dosen', function (Blueprint $table) {
            $table->dropUnique(['sesi_id', 'dosen_id']);
        });
    }
};
