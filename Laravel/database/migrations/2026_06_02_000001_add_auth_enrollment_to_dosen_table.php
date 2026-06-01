<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dosen', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')
                  ->constrained('users')->nullOnDelete();
            $table->string('status_enrollment')->default('pending_upload')->after('face_encodings');
            $table->json('foto_paths')->nullable()->after('foto_path');
            $table->timestamp('foto_verified_at')->nullable()->after('foto_paths');
        });
    }

    public function down(): void
    {
        Schema::table('dosen', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'status_enrollment', 'foto_paths', 'foto_verified_at']);
        });
    }
};
