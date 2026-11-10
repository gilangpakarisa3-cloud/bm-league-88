@echo off
echo ========================================================
echo   Deploy Helper - BM LEAGUE 88 ke Firebase
echo   Project: studio-2162727345-cf90e
echo   Akun   : gilangpakarisa3@gmail.com
echo ========================================================
echo.

echo [1/3] Memastikan project aktif adalah studio-2162727345-cf90e...
call firebase use studio-2162727345-cf90e
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gagal mengatur project. Pastikan sudah menjalankan 'firebase login'.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Mendeploy Firestore Rules dan Indexes...
call firebase deploy --only firestore
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Deploy Firestore gagal atau terdapat kendala izin.
)

echo.
echo ========================================================
echo Selesai!
echo Jika Anda menggunakan Firebase App Hosting:
echo Cukup push commit ke repository Git yang terhubung di Firebase Console.
echo ========================================================
pause

