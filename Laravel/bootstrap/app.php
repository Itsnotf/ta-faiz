<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Jobs\BatchAlpaJob;
use App\Jobs\LockAlpaJob;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->alias([
            'role'             => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission'       => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'internal.key'     => \App\Http\Middleware\InternalApiKey::class,
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('sesi:buat-hari-ini')->dailyAt('06:00')->timezone('Asia/Jakarta');
        $schedule->job(new BatchAlpaJob)->everyFiveMinutes();
        $schedule->job(new LockAlpaJob)->dailyAt('21:00')->timezone('Asia/Jakarta');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
