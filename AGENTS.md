# Aturan Model & Peran Agent

- **Orkestrator (Diskusi / Perencanaan / Koordinasi)**: Gunakan `Gemini Argon 4`.
- **Eksekutor Coding (Implementasi / Penulisan Kode / Bugfix)**: Gunakan `Gemini 3.8 Flash`.

---

# Firebase Deployment Protocol

Saat diminta untuk deploy ke Firebase:
- Target Akun: `gilangpakarisa3@gmail.com`
- Project ID : `studio-2162727345-cf90e`
- Project Number: `102552922602`
- URL Hosting : `https://studio--studio-2162727345-cf90e.us-central1.hosted.app`

SOP Eksekusi:
1. Pastikan user login via `firebase login:list`. Jika belum login, minta tolong user login (`firebase login`).
2. Setelah user login, agen langsung menjalankan seluruh proses deployment secara mandiri:
   - `firebase use studio-2162727345-cf90e`
   - `firebase deploy --only firestore`
   - Validasi `npm run build`
   - Deploy App Hosting langsung via CLI: `firebase deploy --only apphosting`
   - Simpan / sync source code ke repository GitHub (`git add .`, `git commit`, `git push origin main`). GitHub hanya digunakan untuk backup/push source code, bukan penentu deploy.

