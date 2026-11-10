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
echo [2/4] Mendeploy Firestore Rules dan Indexes...
call firebase deploy --only firestore
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Deploy Firestore gagal atau terdapat kendala izin.
)

echo.
echo [3/4] Mendeploy ke Firebase App Hosting...
call firebase deploy --only apphosting
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Deploy App Hosting gagal.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [4/4] Sinkronisasi Git repository (backup)...
git add .
git commit -m "chore: sync after firebase apphosting deploy"
git push origin main

echo.
echo ========================================================
echo Selesai!
echo URL Live: https://studio--studio-2162727345-cf90e.us-central1.hosted.app
echo ========================================================
pause

