<!DOCTYPE html>
<html>

<head>
    <title>Pelangi Drive</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="{{ asset('storage/files/logo-pelangi.jpeg') }}" />
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

<body>
    <div class="page">
        <header>
            <div class="title">
                <span class="title-icon"><img src="{{ asset('storage/files/logo-pelangi.jpeg') }}" alt="Pelangi Drive" style="width: 24px; height: 24px;"></span>
                Pelangi Drive
            </div>
        </header>

        <div class="flash">
            @if(session('error'))
            <span class="error">{{ session('error') }}</span>
            @endif
            @if(session('success'))
            <span class="success">{{ session('success') }}</span>
            @endif
        </div>

        @if(empty($currentFolder))
        <div class="section-header">
            <h2>Folder</h2>
            <form class="inline-form" action="/folder" method="POST">
                @csrf
                <input type="text" name="name" placeholder="Nama folder" required>
                <button type="submit" class="ghost">+ Folder Baru</button>
            </form>
        </div>
        <section class="grid">
            @forelse($folders as $folder)
            <div class="card folder-card" data-href="/folder/{{ $folder->id }}">
                <div class="card-icon">📁</div>
                <div class="card-title" title="{{ $folder->name }}">{{ $folder->name }}</div>
                <div class="card-meta">{{ $folderCounts[$folder->id] ?? 0 }} file</div>
                <div class="card-top-actions">
                    <button class="icon-button menu-button" type="button" data-menu-button="folder-menu-{{ $folder->id }}">...</button>
                </div>
                <div class="menu-panel" id="folder-menu-{{ $folder->id }}" data-menu-panel>
                    <form action="/folder/{{ $folder->id }}/rename" method="POST">
                        @csrf
                        <label for="folder-name-{{ $folder->id }}">Ubah nama folder</label>
                        <input id="folder-name-{{ $folder->id }}" type="text" name="name" value="{{ $folder->name }}" required>
                        <button type="submit" class="ghost">Simpan</button>
                    </form>
                    <form action="/folder/{{ $folder->id }}/delete" method="POST">
                        @csrf
                        <button type="submit" class="danger" onclick="return confirm('Hapus folder ini?')">Hapus folder</button>
                    </form>
                </div>
            </div>
            @empty
            <div class="card">
                <div class="card-icon">📁</div>
                <div class="card-title" title="Belum ada folder">Belum ada folder</div>
                <div class="card-meta">Buat folder baru di atas.</div>
            </div>
            @endforelse
        </section>
        @else
        <div class="section-header">
            <div style="display: flex; align-items: center; gap: 12px;">
                <a class="back-button" href="/">← Kembali</a>
                <h2>{{ $currentFolder->name }}</h2>
            </div>
            <form class="inline-form" action="/upload" method="POST" enctype="multipart/form-data">
                @csrf
                <input type="hidden" name="folder_id" value="{{ $currentFolder->id }}">
                <label class="upload-inline">
                    + Upload
                    <input type="file" name="pdf[]" hidden onchange="this.form.submit()" accept="application/pdf" multiple required>
                </label>
            </form>
        </div>
        <section class="grid">
            @forelse($files as $file)
            <div class="card">
                <div class="card-icon excel">
                    <img src="{{ asset('storage/files/excel.png') }}" alt="Excel" />
                </div>
                <div class="card-title" title="{{ $file->pdf_name }}">{{ $file->pdf_name }}</div>
                <div class="status {{ $file->status }}">
                    @if($file->status === 'done')
                    Selesai
                    @elseif($file->status === 'processing')
                    Proses
                    @else
                    Gagal
                    @endif
                </div>
                <div class="card-top-actions">
                    @if($file->status === 'done')
                    <a class="icon-button download-button" href="/download/{{ $file->id }}" title="Unduh Excel">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M12 3v12"></path>
                            <path d="M7 10l5 5 5-5"></path>
                            <path d="M5 21h14"></path>
                        </svg>
                    </a>
                    @endif
                    <button class="icon-button menu-button" type="button" data-menu-button="menu-{{ $file->id }}">...</button>
                </div>
                <div class="menu-panel" id="menu-{{ $file->id }}" data-menu-panel>
                    <form action="/file/{{ $file->id }}/rename" method="POST">
                        @csrf
                        <label for="file-name-{{ $file->id }}">Ubah nama file</label>
                        <input id="file-name-{{ $file->id }}" type="text" name="name" value="{{ pathinfo($file->pdf_name, PATHINFO_FILENAME) }}" required disabled>
                        <div class="rename-actions">
                            <button type="button" class="ghost rename-toggle" data-rename-target="file-name-{{ $file->id }}" data-submit-target="file-rename-submit-{{ $file->id }}">Ubah</button>
                            <button id="file-rename-submit-{{ $file->id }}" type="submit" class="ghost" disabled>Simpan</button>
                        </div>
                    </form>
                    <form action="/file/{{ $file->id }}/move" method="POST">
                        @csrf
                        <label for="file-move-{{ $file->id }}">Pindah ke folder</label>
                        <select id="file-move-{{ $file->id }}" name="folder_id" required>
                            @foreach($folders as $folder)
                            <option value="{{ $folder->id }}" @if($folder->id === $file->folder_id) selected @endif>{{ $folder->name }}</option>
                            @endforeach
                        </select>
                        <button type="submit" class="ghost">Pindahkan</button>
                    </form>
                    <form action="/file/{{ $file->id }}/delete" method="POST">
                        @csrf
                        <button type="submit" class="danger" onclick="return confirm('Hapus file ini?')">Hapus file</button>
                    </form>
                </div>
            </div>
            @empty
            <div class="card">
                <div class="card-icon excel">
                    <img src="{{ asset('storage/files/excel.png') }}" alt="Excel" />
                </div>
                <div class="card-title" title="Belum ada file">Belum ada file</div>
                <div class="card-meta">Upload PDF pertama di folder ini.</div>
            </div>
            @endforelse
        </section>
        @endif
    </div>

</body>

</html>