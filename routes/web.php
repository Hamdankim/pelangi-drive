<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FileController;


/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', [FileController::class, 'index']);
Route::get('/folder/{id}', [FileController::class, 'showFolder']);
Route::post('/upload', [FileController::class, 'upload']);
Route::get('/download/{id}', [FileController::class, 'download']);
Route::post('/folder', [FileController::class, 'createFolder']);
Route::post('/folder/{id}/rename', [FileController::class, 'renameFolder']);
Route::post('/folder/{id}/delete', [FileController::class, 'destroyFolder']);
Route::post('/file/{id}/move', [FileController::class, 'move']);
Route::post('/file/{id}/delete', [FileController::class, 'destroy']);
Route::post('/file/{id}/rename', [FileController::class, 'renameFile']);
