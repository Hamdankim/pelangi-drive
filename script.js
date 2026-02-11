const BACKEND_URL = "https://your-backend.onrender.com/upload";

const form = document.getElementById("uploadForm");
const statusDiv = document.getElementById("status");
const resultDiv = document.getElementById("result");
const resultText = document.getElementById("resultText");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById("pdfFile");
    const file = fileInput.files[0];

    if (!file) return;

    statusDiv.classList.remove("hidden");
    statusDiv.innerText = "Sedang memproses...";

    resultDiv.classList.add("hidden");

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            statusDiv.innerText = "Upload & Convert berhasil!";
            resultDiv.classList.remove("hidden");
            resultText.innerText =
                "PDF ID: " + data.pdf_drive_id +
                "\nExcel ID: " + data.excel_drive_id;
        } else {
            statusDiv.innerText = "Error: " + data.detail;
        }

    } catch (error) {
        statusDiv.innerText = "Terjadi kesalahan koneksi.";
    }
});
