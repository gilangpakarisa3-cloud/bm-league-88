# Firebase Deployment Protocol

Saat diminta untuk deploy ke Firebase:
- Target Akun: `gilangpakarisa3@gmail.com`
- Project ID : `studio-2162727345-cf90e`
- Project Number: `102552922602`

SOP Eksekusi:
1. Pastikan user login via `firebase login:list`. Jika belum login, minta tolong user login (`firebase login`).
2. Setelah user login, agen langsung menjalankan seluruh sisa proses secara mandiri:
   - `firebase use studio-2162727345-cf90e`
   - `firebase deploy --only firestore`
   - Validasi `npm run build`
   - Commit & push ke repository `origin main` untuk auto-build Firebase App Hosting.

