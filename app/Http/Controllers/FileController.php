<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use App\Models\File;
use App\Models\Folder;

class FileController extends Controller
{
    public function index()
    {
        $folders = Folder::orderBy('name')->get();
        $folderCounts = File::selectRaw('folder_id, COUNT(*) as total')
            ->groupBy('folder_id')
            ->pluck('total', 'folder_id');

        return view('index', [
            'folders' => $folders,
            'folderCounts' => $folderCounts,
            'files' => collect(),
            'currentFolder' => null,
        ]);
    }

    public function showFolder($id)
    {
        $currentFolder = Folder::findOrFail($id);
        $folders = Folder::orderBy('name')->get();
        $folderCounts = File::selectRaw('folder_id, COUNT(*) as total')
            ->groupBy('folder_id')
            ->pluck('total', 'folder_id');
        $files = File::with('folder')
            ->where('folder_id', $currentFolder->id)
            ->latest()
            ->get();

        return view('index', compact('files', 'folders', 'folderCounts', 'currentFolder'));
    }

    public function createFolder(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $name = trim($request->input('name'));
        $folder = Folder::firstOrCreate([
            'name' => $name,
            'parent_id' => null,
        ]);

        if ($folder->wasRecentlyCreated) {
            return back()->with('success', 'Folder berhasil dibuat');
        }

        return back()->with('success', 'Folder sudah ada');
    }

    public function upload(Request $request)
    {
        $request->validate([
            'pdf' => 'required|array',
            'pdf.*' => 'file|mimes:pdf',
            'folder_id' => 'required|integer|exists:folders,id',
        ]);

        $targetFolder = Folder::findOrFail($request->input('folder_id'));
        $folderPath = $this->getFolderStoragePath($targetFolder->id);
        $apiKey = env('PDFCO_API_KEY');
        if (empty($apiKey)) {
            return back()->with('error', 'PDFCO_API_KEY belum diisi di .env');
        }

        $pdfFiles = Arr::wrap($request->file('pdf'));
        $successCount = 0;
        $errorMessages = [];

        foreach ($pdfFiles as $pdfFile) {
            if (!$pdfFile) {
                continue;
            }

            $timestamp = now()->format('Ymd_His');
            $originalBaseName = pathinfo($pdfFile->getClientOriginalName(), PATHINFO_FILENAME);
            $safeBaseName = preg_replace('/[^A-Za-z0-9._ -]+/', '', $originalBaseName);
            $safeBaseName = preg_replace('/\s+/', ' ', $safeBaseName);
            $safeBaseName = trim($safeBaseName);
            if (empty($safeBaseName)) {
                $safeBaseName = 'file';
            }
            $pdfName = $timestamp . '_' . $safeBaseName . '.pdf';
            $pdfPath = $pdfFile->storeAs($folderPath, $pdfName);

            $file = File::create([
                'folder_id' => $targetFolder->id,
                'pdf_name'  => $pdfName,
                'pdf_path'  => $pdfPath,
                'status'    => 'processing'
            ]);

            $upload = Http::timeout(120)
                ->withHeaders([
                    'x-api-key' => $apiKey,
                ])
                ->attach(
                    'file',
                    Storage::get($pdfPath),
                    $pdfName
                )
                ->post('https://api.pdf.co/v1/file/upload');

            if (!$upload->successful()) {
                $file->update(['status' => 'error']);
                $message = 'Gagal upload PDF';
                if ($upload->header('content-type') && str_contains($upload->header('content-type'), 'application/json')) {
                    $detail = $upload->json('message') ?? $upload->json('error');
                    if (!empty($detail)) {
                        $message .= ': ' . $detail;
                    }
                }
                $errorMessages[] = $message . ' (' . $pdfName . ')';
                continue;
            }

            $uploadResult = $upload->json();
            if (!empty($uploadResult['error']) || empty($uploadResult['url'])) {
                $file->update(['status' => 'error']);
                $message = 'Gagal upload PDF';
                if (!empty($uploadResult['message'])) {
                    $message .= ': ' . $uploadResult['message'];
                }
                $errorMessages[] = $message . ' (' . $pdfName . ')';
                continue;
            }

            $response = Http::timeout(120)
                ->withHeaders([
                    'x-api-key' => $apiKey,
                ])
                ->post('https://api.pdf.co/v1/pdf/convert/to/xlsx', [
                    'url' => $uploadResult['url'],
                ]);

            if (!$response->successful()) {
                $file->update(['status' => 'error']);
                $message = 'Gagal convert PDF';
                if ($response->header('content-type') && str_contains($response->header('content-type'), 'application/json')) {
                    $detail = $response->json('message') ?? $response->json('error');
                    if (!empty($detail)) {
                        $message .= ': ' . $detail;
                    }
                }
                $errorMessages[] = $message . ' (' . $pdfName . ')';
                continue;
            }

            $result = $response->json();
            if (!empty($result['error'])) {
                $file->update(['status' => 'error']);
                $message = 'Gagal convert PDF';
                if (!empty($result['message'])) {
                    $message .= ': ' . $result['message'];
                }
                $errorMessages[] = $message . ' (' . $pdfName . ')';
                continue;
            }

            $fileUrl = $result['url'] ?? null;
            if (empty($fileUrl)) {
                $file->update(['status' => 'error']);
                $errorMessages[] = 'Gagal convert PDF: URL hasil kosong (' . $pdfName . ')';
                continue;
            }

            $download = Http::timeout(120)->get($fileUrl);
            if (!$download->successful() || empty($download->body())) {
                $file->update(['status' => 'error']);
                $errorMessages[] = 'Gagal download hasil Excel (' . $pdfName . ')';
                continue;
            }

            $excelName = str_replace('.pdf', '.xlsx', $pdfName);
            $excelPath = $folderPath . '/' . $excelName;

            Storage::put($excelPath, $download->body());

            $file->update([
                'excel_name' => $excelName,
                'excel_path' => $excelPath,
                'status'     => 'done'
            ]);

            $successCount++;
        }

        if ($successCount > 0 && !empty($errorMessages)) {
            return back()
                ->with('success', 'Berhasil memproses ' . $successCount . ' file')
                ->with('error', implode('; ', $errorMessages));
        }

        if ($successCount > 0) {
            return back()->with('success', 'Berhasil memproses ' . $successCount . ' file');
        }

        return back()->with('error', implode('; ', $errorMessages) ?: 'Gagal upload PDF');
    }

    public function download($id)
    {
        $file = File::findOrFail($id);

        if (!$file->excel_path || !Storage::exists($file->excel_path)) {
            abort(404, 'File Excel tidak ditemukan');
        }

        return Storage::download(
            $file->excel_path,
            $file->excel_name
        );
    }

    public function move(Request $request, $id)
    {
        $request->validate([
            'folder_id' => 'required|integer|exists:folders,id',
        ]);

        $file = File::findOrFail($id);
        $targetFolderId = (int) $request->input('folder_id');
        if ($file->folder_id === $targetFolderId) {
            return back()->with('success', 'File sudah berada di folder tersebut');
        }

        $targetPath = $this->getFolderStoragePath($targetFolderId);

        if (!empty($file->pdf_path) && Storage::exists($file->pdf_path)) {
            $pdfName = basename($file->pdf_path);
            $newPdfPath = $targetPath . '/' . $pdfName;
            Storage::move($file->pdf_path, $newPdfPath);
            $file->pdf_path = $newPdfPath;
        }

        if (!empty($file->excel_path) && Storage::exists($file->excel_path)) {
            $excelName = basename($file->excel_path);
            $newExcelPath = $targetPath . '/' . $excelName;
            Storage::move($file->excel_path, $newExcelPath);
            $file->excel_path = $newExcelPath;
        }

        $file->folder_id = $targetFolderId;
        $file->save();

        return back()->with('success', 'File berhasil dipindahkan');
    }

    public function destroy($id)
    {
        $file = File::findOrFail($id);

        if (!empty($file->pdf_path) && Storage::exists($file->pdf_path)) {
            Storage::delete($file->pdf_path);
        }
        if (!empty($file->excel_path) && Storage::exists($file->excel_path)) {
            Storage::delete($file->excel_path);
        }

        $file->delete();

        return back()->with('success', 'File berhasil dihapus');
    }

    public function renameFile(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:150',
        ]);

        $file = File::findOrFail($id);
        $baseName = trim(pathinfo($request->input('name'), PATHINFO_FILENAME));
        if ($baseName === '') {
            return back()->with('error', 'Nama file tidak valid');
        }

        $pdfName = $baseName . '.pdf';
        $excelName = $baseName . '.xlsx';

        if (!empty($file->pdf_path) && Storage::exists($file->pdf_path)) {
            $newPdfPath = dirname($file->pdf_path) . '/' . $pdfName;
            if ($newPdfPath !== $file->pdf_path) {
                Storage::move($file->pdf_path, $newPdfPath);
                $file->pdf_path = $newPdfPath;
            }
        }

        if (!empty($file->excel_path) && Storage::exists($file->excel_path)) {
            $newExcelPath = dirname($file->excel_path) . '/' . $excelName;
            if ($newExcelPath !== $file->excel_path) {
                Storage::move($file->excel_path, $newExcelPath);
                $file->excel_path = $newExcelPath;
            }
        }

        $file->pdf_name = $pdfName;
        $file->excel_name = $file->excel_path ? $excelName : null;
        $file->save();

        return back()->with('success', 'Nama file berhasil diubah');
    }

    public function renameFolder(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $folder = Folder::findOrFail($id);
        $name = trim($request->input('name'));

        $exists = Folder::where('name', $name)
            ->where('id', '!=', $folder->id)
            ->exists();
        if ($exists) {
            return back()->with('error', 'Nama folder sudah ada');
        }

        $folder->name = $name;
        $folder->save();

        return back()->with('success', 'Nama folder berhasil diubah');
    }

    public function destroyFolder($id)
    {
        $folder = Folder::findOrFail($id);
        $hasFiles = File::where('folder_id', $folder->id)->exists();
        if ($hasFiles) {
            return back()->with('error', 'Folder tidak bisa dihapus karena masih berisi file');
        }

        $folder->delete();

        return back()->with('success', 'Folder berhasil dihapus');
    }

    private function getFolderStoragePath($folderId)
    {
        return 'files/folder-' . $folderId;
    }
}
