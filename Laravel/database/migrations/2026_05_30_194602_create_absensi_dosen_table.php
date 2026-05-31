<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('absensi_dosen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sesi_id')->constrained('sesi_absensi')->cascadeOnDelete();
            $table->foreignId('dosen_id')->constrained('dosen')->cascadeOnDelete();
            $table->timestamp('hadir_at')->nullable();
            $table->enum('status', ['hadir', 'alpa'])->default('alpa');
            $table->float('confidence')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('absensi_dosen');
    }
};
