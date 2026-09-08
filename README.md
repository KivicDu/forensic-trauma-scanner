# 🔬 Forensic Trauma & Scene Reconstruction Scanner (PFT-Sim)

**Standalone Desktop Suite for 3D Forensic Traumatology, Wound Morphometry & Crime/Accident Scene Reconstruction**  
*Built with Electron + Three.js + Rapier3D (WASM) + Node.js | 100% Offline & Field-Ready*

![Status](https://img.shields.io/badge/Status-Field%20Ready-brightgreen?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Desktop%20(Offline)-blue?style=flat-square)
![Precision](https://img.shields.io/badge/Metrics-Sub--Millimeter-orange?style=flat-square)

---

## 📌 Tổng quan dự án

**Forensic Trauma Scanner** là ứng dụng desktop chuyên dụng dành cho giám định viên pháp y, điều tra viên hiện trường và bác sĩ ngoại chấn thương. Hệ thống cung cấp giải pháp đo đạc trắc lượng hình thái học vết thương (Wound Morphometry) và tái tạo cơ chế va chạm tại hiện trường 3D với độ chính xác khoa học cao, **hoàn toàn offline**, không phụ thuộc vào internet hoặc điện lưới liên tục.

---

## ⚙️ Tính năng cốt lõi

### 1. 🔍 Trắc lượng Hình thái học Vết thương (Wound Morphometry)
- **Đo đạc đa chiều:** Xác định chiều dài, chiều rộng, chu vi miệng vết thương theo khoảng cách trắc địa (Geodesic Distance) trên mặt cong sinh học.
- **Trắc diện độ sâu (Depth Profile & Cavity Volume):** Nội suy bề mặt da nguyên vẹn (Thin-Plate Splines), đo khoảng cách từ da lành tới đáy vết thương và tính thể tích khoang khuyết hổng ($mm^3$).
- **Phân tích bề mặt & Mép vết thương (Surface Topography):** Tính toán độ cong Gauss và độ gồ ghề bề mặt ($Ra$) để hỗ trợ phân loại tổn thương do vật sắc nhọn (Sharp force) hay vật tày (Blunt force).

### 2. 🏛️ Tái tạo Hiện trường & Đối chiếu Cơ chế (Scene Reconstruction)
- **Mô hình hóa 3D (GLB / GLTF / OBJ / PLY):** Nạp và chuẩn hóa tỉ lệ tuyệt đối theo chuẩn thước đo pháp y (ABFO Scale No. 2).
- **Phân tích cơ học va đập (Impact Biomechanics):** Tích hợp công thức biến thiên động lượng $F = m \frac{\Delta v}{\Delta t}$, tiêu chuẩn chấn thương sọ não HIC₁₅, lực cản vật liệu và gia tốc trọng trường $G$.
- **Khớp hình học vật gây thương tích (Implement-to-Wound Matching):** Đối sánh góc cạnh của vật thể hiện trường với vết thương lún/rách trên cơ thể.

### 3. 🔒 Chuỗi hành trình Chứng cứ & Xuất Báo cáo (Chain of Custody)
- **Toàn vẹn dữ liệu:** Tự động tính mã băm SHA-256 cho mỗi tệp scan 3D được nạp vào.
- **Báo cáo Giám định Y pháp:** Xuất biên bản kết luận giám định thương tích chuẩn hóa (PDF độ nét cao với ảnh chụp đa góc, thước đo và ma trận số liệu).
- **100% Offline:** Không gửi bất kỳ dữ liệu nhạy cảm nào lên đám mây, an toàn tuyệt đối cho công tác điều tra.

---

## 🚀 Khởi chạy ứng dụng

```bash
# 1. Cài đặt các gói phụ thuộc
npm run install-all

# 2. Khởi chạy chế độ Desktop (Electron)
npm run electron:dev

# Hoặc khởi chạy chế độ trình duyệt Web cục bộ
npm run dev
```

---

## 📁 Cấu trúc thư mục

```
forensic-trauma-scanner/
├── electron/                  # Khung ứng dụng desktop Electron
│   ├── main.js               # Khởi tạo cửa sổ & dịch vụ local
│   └── preload.js            # Cầu nối IPC an toàn
├── Backend/                   # Lõi tính toán hình học & sinh cơ học
│   ├── controllers/          # Bộ điều khiển nạp mô hình & tính toán chấn thương
│   ├── services/             # Rapier3D physics, injury calculator, scale authority
│   ├── utils/                # GLB/Mesh parser, vector math, collider generator
│   └── server.js             # Local API engine
├── Frontend/                  # Giao diện người dùng y tế chuyên dụng
│   ├── src/components/       # Canvas3D (Forensic 3D Viewport), Header
│   ├── src/pages/            # Simulator / Forensic Workspace
│   └── src/utils/            # ScaleApplicator, ReportGenerator
└── package.json               # Root scripts
```

---

## ⚖️ Giấy phép
ISC License - Forensic Traumatology Team
