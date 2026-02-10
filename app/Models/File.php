<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class File extends Model
{
    protected $fillable = [
        'folder_id',
        'pdf_name',
        'excel_name',
        'pdf_path',
        'excel_path',
        'status'
    ];

    public function folder()
    {
        return $this->belongsTo(Folder::class);
    }
}
