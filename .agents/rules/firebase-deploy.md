# Firebase Deployment SOP & Automated Rule

Ketika user meminta untuk deploy ke Firebase (misal: "deploy ke firebase", "deploy aplikasi", dsb):

## 1. Credentials & Project Info
- **Akun Google/Firebase**: `gilangpakarisa3@gmail.com`
- **Project ID**: `studio-2162727345-cf90e`
- **Project Number**: `102552922602`
- **Firebase App Hosting URL**: `https://studio--studio-2162727345-cf90e.us-central1.hosted.app`

## 2. Alur Eksekusi Otomatis (Cukup User Login)
1. **Cek Status Login**:
   - Jalankan `firebase login:list` dengan `BypassSandbox: true`.
   - Jika belum login atau akun `gilangpakarisa3@gmail.com` belum aktif, minta tolong user login sebentar dengan memanggil `firebase login` (hanya langkah ini yang butuh bantuan user).
2. **Set Project**:
   - Jalankan `firebase use studio-2162727345-cf90e` (`BypassSandbox: true`).
3. **Deploy Firestore Rules & Indexes**:
   - Jalankan `firebase deploy --only firestore` (`BypassSandbox: true`).
4. **Validasi Build**:
   - Jalankan `npm run build` (`BypassSandbox: true` untuk menghindari batasan filesystem sandbox Windows) untuk memastikan tidak ada error kompilasi.
5. **Git Push ke App Hosting**:
   - Cek `git status`. Jika ada file yang belum ter-commit/push, commit dan push ke remote `origin main` agar Firebase App Hosting otomatis mentrigger build dan deploy live.
6. Berikan konfirmasi status deploy selesai beserta link console dan URL live.

