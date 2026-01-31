<?php

use Illuminate\Support\Facades\Route;
use Pterodactyl\BlueprintFramework\Extensions\playercontroller\PlayerController;

Route::get('/info', [PlayerController::class, 'index'])->name('extension.playercontroller.index');
