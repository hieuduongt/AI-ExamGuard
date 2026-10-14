# Kịch bản PowerShell (một danh sách lệnh chạy tự động trên Windows) để build ra file EXE
# của AI ExamGuard. Chạy một lệnh là xong cả phần web lẫn phần Python.
#
# Đây là gì: kịch bản build bản EXE chạy trên Windows.
# Mục tiêu: tạo một file EXE duy nhất mà máy giám thị/thí sinh mở lên là dùng được.
# Chức năng: (1) cài thư viện cho web (npm ci); (2) xuất giao diện web ra thư mục web/out
#   (npm run build); (3) đóng gói thành EXE bằng PyInstaller (công cụ gói chương trình Python
#   thành file EXE) theo desktop-hub/examguard.spec; (4) chép file EXE vào thư mục release/.
#   Bước nào lỗi thì dừng ngay và báo bước đó. Không ghi đè một EXE đang chạy, trừ khi
#   trùng tên - hãy truyền -Name để build ra file mới có số phiên bản.
# Đầu ra: file release/<Name>.exe (mặc định release/AI_ExamGuard_Portable.exe).
# Dùng ở đâu: chạy tay trong PowerShell từ thư mục gốc repo (hướng dẫn trong README.md,
#   desktop-hub/README.md, docs/van-hanh/chay-va-build.md):
#   powershell -ExecutionPolicy Bypass -File scripts/build-exe.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/build-exe.ps1 -Name AI_ExamGuard_2026_09_08_3
# Liên kết với: web/package.json (lệnh build web), desktop-hub/examguard.spec (đọc biến
#   EXAMGUARD_EXE_NAME để đặt tên EXE), desktop-hub/app_desktop.py (điểm khởi động của EXE).
param(
    [string]$Name = 'AI_ExamGuard_Portable'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

# Đây là gì: hàm chạy một bước build (ví dụ "cài thư viện web", "đóng gói EXE").
# Mục tiêu: bước nào hỏng thì dừng ngay và nói rõ hỏng ở bước nào, thay vì chạy tiếp mù quáng.
# Chức năng: in tên bước, đi vào thư mục của bước đó, chạy lệnh; nếu lệnh trả mã lỗi thì báo
#   "<tên bước> failed"; dù thành công hay lỗi cũng quay về thư mục cũ.
# Đầu ra: không trả về gì; nếu lỗi thì ném lỗi làm cả kịch bản dừng.
# Dùng ở đâu: các lệnh Invoke-Step ngay bên dưới trong chính file này.
# Liên kết với: web/package.json (npm ci, npm run build), desktop-hub/examguard.spec (PyInstaller).
function Invoke-Step([string]$Title, [string]$Folder, [scriptblock]$Command) {
    Write-Host "== $Title" -ForegroundColor Cyan
    Push-Location (Join-Path $root $Folder)
    try {
        & $Command
        if ($LASTEXITCODE) { throw "$Title failed (exit code $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
}

Invoke-Step 'Install web dependencies' 'web' { npm ci }
Invoke-Step 'Export web UI to web/out' 'web' { npm run build }

$env:EXAMGUARD_EXE_NAME = $Name
Invoke-Step 'Package EXE with PyInstaller' 'desktop-hub' { python -m PyInstaller --noconfirm examguard.spec }

$release = Join-Path $root 'release'
New-Item -ItemType Directory -Force $release | Out-Null
Copy-Item (Join-Path $root "desktop-hub/dist/$Name.exe") $release -Force
Write-Host "Done: release/$Name.exe" -ForegroundColor Green
