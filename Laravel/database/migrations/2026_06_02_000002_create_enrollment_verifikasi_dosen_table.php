<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrollment_verifikasi_dosen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dosen_id')->constrained('dosen')->cascadeOnDelete();
            $table->string('jarak'); // dekat | sedang | jauh
            $table->float('confidence');
            $table->timestamp('verified_at');
            $table->timestamps();
            $table->unique(['dosen_id', 'jarak']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollment_verifikasi_dosen');
    }
};
