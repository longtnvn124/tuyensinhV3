# Kế hoạch và đặc tả xuất dữ liệu nhập học (`DL_nhaphoc_Form.xlsx`)

## 1. Mục tiêu và phạm vi

- Định dạng xuất dữ liệu tuyển sinh theo mẫu Excel: `plan/export-hoidong-cu/DL_nhaphoc_Form.xlsx`.
- Áp dụng trên 2 luồng xuất:
  1. **Hội đồng cũ (legacy)**: `HoidongHosoXetduyetComponent` tạo `TuyensinhCuExportPayload` và gọi `ExportDlTuyensinhCuService.exportExcel(payload)`. Workbook chỉ có 1 sheet `Mẫu xuất full` theo 43 cột.
  2. **Hội đồng hiện hành**: `HoidongHosoXetduyetComponent` tạo `CouncilAdmissionExportPayload` và gọi `ExpHosoDaduyetService.exportExcel(payload)`. Service này tạo 4 sheet xét tuyển (`DS TT`, `DS đề nghị TT`, `KQ xét tuyển`, `DL xét tuyển`) kèm sheet thứ 5 `Dữ liệu tổng hợp` dùng cùng layout/header 43 cột.
- Nguyên tắc cốt lõi: **chỉ lấy từ dữ liệu thực tế đã truy vấn, không phỏng đoán/suy diễn dữ liệu thiếu**. Nếu thiếu thì để trống (`""`).

## 2. Cấu trúc workbook mẫu (43 cột `A:AQ`)

- Sheet name:
  - Service cũ (`ExportDlTuyensinhCuService`): `Mẫu xuất full`.
  - Service hiện hành (`ExpHosoDaduyetService`): `Dữ liệu tổng hợp`.
- Số cột: 43 (`A:AQ`).
- Header: dòng 1, cao `31.5`.
- Data row: từ dòng 2, cao `47.25`.
- Freeze panes: 4 cột đầu và dòng header (`xSplit: 4`, `ySplit: 1`, `topLeftCell: E2`).
- Zoom scale: `85%`.
- Auto-filter: toàn bộ vùng dữ liệu `A1:AQ<n>`.
- Font: `Times New Roman`, size `11`.
- Viền: viền mảnh toàn bộ ô header và dữ liệu.
- Cột số thứ tự (A): công thức `=SUBTOTAL(3,$B$2:B<row>)`.
- Cột căn giữa: `1, 2, 3, 4, 5, 9, 10, 11, 13, 16, 17, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38` (các cột còn lại căn trái, tất cả căn giữa theo chiều dọc và `wrapText: true`).

## 3. Rà soát các Service và API truy xuất dữ liệu

### 3.1. Các service đã được gọi trong component (`HoidongHosoXetduyetComponent`)

| STT | Service | Phương thức gọi | Endpoint / Bảng | Mục đích |
|---|---|---|---|---|
| 1 | `DotXettuyenService` | `get(council.dot_xettuyen_id)` | `/dot-xettuyen/{id}` | Lấy thông tin đợt xét tuyển (`tieude`, `thoi_gian_bat_dau`, `thoi_gian_ket_thuc`). |
| 2 | `NganhhocService` | `load({ search: '' }, { limit: -1 })` | `/nganhhoc` | Lấy danh mục ngành để lookup mã/tên ngành (`ma_nganh`, `ten_nganh`). |
| 3 | `LocationService` | `queryLocation([], { limit: -1 }, 'regions')` | `/regions/` | Lấy danh mục tỉnh/thành phố (`id`, `name`). |
| 4 | `LocationService` | `queryLocation([], { limit: -1 }, 'provinces')` | `/provinces/` | Lấy danh mục quận/huyện/phường/xã (`id`, `name`). |
| 5 | `UserService` | `query([], { limit: -1 })` | `/users/` | Lấy danh mục cán bộ/người dùng (`id`, `display_name`). |
| 6 | `HoidongHosoThisinhService` | `query([{ conditionName: 'hoidong_id', ... }], { limit: -1, order: 'DESC', orderby: 'created_at' })` | `/hoidong-hoso-thisinh/` | Lấy danh sách liên kết thí sinh trong hội đồng (`tuyensinh_id`, `ket_qua`, `ghi_chu`). |
| 7 | `RegistrationsService` | `loopGetHosoByIds(ids, [], 50, 1)` -> `query([{ conditionName: 'id', orWhere: 'in', value: '...' }], { paged: 1, limit: 50 })` | `/registrations/` | Lấy chi tiết hồ sơ thí sinh theo lô 50 ID (`ho_va_ten`, `cccd`, `dia_chi_*`, `vb_*`, `diem_*`, ...). |
| 8 | `ExportDlTuyensinhCuService` | `exportExcel(payload)` | Local `ExcelJS` + `SAVER` | Tạo và tải file Excel cho hội đồng cũ. |
| 9 | `ExpHosoDaduyetService` | `exportExcel(payload)` | Local `ExcelJS` + `SAVER` | Tạo và tải file Excel cho hội đồng hiện hành. |

### 3.2. Logic phân loại và luồng xử lý xuất file (`exportRecordGroups`)

- Điểm kiểm tra phân loại: `isLegacyCouncil = this.isBeforeCutoff(council.created_at, dayjs('2026-09-01'))`.
  - `council.created_at < 2026-09-01` -> gọi `ExportDlTuyensinhCuService.exportExcel(payload)`.
  - `council.created_at >= 2026-09-01` (hoặc không có ngày tạo hợp lệ) -> gọi `ExpHosoDaduyetService.exportExcel(payload)`.
- Chú ý quan trọng:
  - Logic phân loại hiện tại kiểm tra trên **ngày tạo của hội đồng (`council.created_at`)**, toàn bộ hồ sơ trong hội đồng sẽ xuất ra 1 file duy nhất theo service tương ứng.
  - Quá trình chạy dùng `concatMap`, cập nhật thanh tiến trình (`controlLoading`: 50% -> 90%), tự động đóng loading tại `finalize()`.

## 4. Bảng đặc tả chi tiết 43 cột

Bảng dưới mô tả layout dùng chung cho luồng **legacy** (`ExportDlTuyensinhCuService`) và sheet `Dữ liệu tổng hợp` của `ExpHosoDaduyetService`. Sheet 5 hiện map tất cả trường có nguồn trong hồ sơ; các cột không có nguồn thực tế vẫn để trống (`""`).

| Cột | Header | Field payload/candidate | Nguồn dữ liệu thực tế / Cách lấy | Quy tắc xử lý |
|---|---|---|---|---|
| A | TT | — | Công thức Excel | `=SUBTOTAL(3,$B$2:B<row>)` |
| B | Đợt | `roundName` | `round.tieude` | Trim text. |
| C | Mã SV | — | Chưa có nguồn export | Luôn để trống `""`. |
| D | CCCD | `cccd` | `candidate.cccd` | Trim text. |
| E | Ngày cấp | `cccdDate` | `candidate.ngay_cap_cccd` | Định dạng `DD/MM/YYYY`. |
| F | Họ tên gộp | `fullName` | `candidate.ho_va_ten` | Chuẩn hóa khoảng trắng thừa (`\s+ -> ' '`). |
| G | Họ | Tính từ `fullName` | Tách từ `fullName` đã chuẩn hóa | Nếu <= 1 từ: `""`. Nếu > 1 từ: các từ đầu đến kế cuối. |
| H | Tên | Tính từ `fullName` | Tách từ `fullName` đã chuẩn hóa | Từ cuối cùng của `fullName`. |
| I | Ngày sinh | `birthDate` | `candidate.ngay_sinh` | Định dạng `DD/MM/YYYY`; thiếu thì `""`. |
| J | Giới tính | `gender` | `candidate.gioi_tinh` | Legacy chuẩn hóa `nam -> Nam`, `nu -> Nữ`; hiện hành đã map nhãn qua `GENDER` trước khi gọi service. |
| K | Dân tộc | `ethnicity` | `candidate.dan_toc` | Trim text. Thiếu thì `""`. |
| L | Nơi sinh | `birthPlace` | `candidate.noi_sinh` tra qua `provinceOptions` từ `regions` | Tra tên tỉnh theo ID; không map được thì `""`. |
| M | Điện thoại | `phone` | `candidate.dien_thoai` | Trim text. |
| N | Email ictu | — | Chưa có trường riêng | Luôn để trống `""`. |
| O | Email | `email` | `candidate.email` | Trim text. |
| P | Tỉnh/Thành phố | `provinceId` | `candidate.dia_chi_tinh` tra map `regions` | Không tra được thì `""`. |
| Q | Phường/Xã | `wardId` | `candidate.dia_chi_xa` tra map `provinces` | Không tra được thì `""`. |
| R | Địa chỉ | `address` | `candidate.dia_chi_nha` | Trim text. |
| S | Mã tỉnh lớp 12 | — | Chưa có nguồn export | Luôn để trống `""`. |
| T | Mã trường lớp 12 | — | Chưa có nguồn export | Luôn để trống `""`. |
| U | Tên trường lớp 12 | — | Chưa có nguồn export | Luôn để trống `""`. |
| V | KV ưu tiên | — | Chưa có nguồn export riêng | Luôn để trống `""`. |
| W | ĐT ưu tiên | — | Chưa có nguồn export riêng | Luôn để trống `""`. |
| X | Mã ngành ĐKXT | `registeredMajorCode` | Legacy: tra `majors` theo `candidate.nganh_dangky`, sau đó dùng `candidate.registeredMajorCode`; hiện hành: `Nganhhoc.ma_nganh` | Legacy chỉ dùng mã có sẵn khi lookup không có kết quả. |
| Y | Tên ngành ĐKXT | `registeredMajorName` | `candidate.nganh_dangky` | Trim text tên ngành đăng ký. |
| Z | Điểm xét tuyển gốc | `admissionScore` | `candidate.diem_xettuyen` | Giữ kiểu `number`; `null`/`undefined` là `""`. |
| AA | Điểm ƯT KV | `priorityRegionScore` | `candidate.diem_cong` | Giữ kiểu `number`; `null`/`undefined` là `""`. |
| AB | Điểm ƯT ĐT | `priorityObjectScore` | `candidate.diem_uutien` | Giữ kiểu `number`; `null`/`undefined` là `""`. |
| AC | Điểm xét tuyển | `calculatedAdmissionScore` | Hiện hành: tính từ `diem_xettuyen`, `diem_uutien`, `diem_cong`, `doituong` | Legacy không gán trường này nên để trống; hiện hành giữ kiểu `number`. |
| AD | Mã Bằng THPT | `highSchoolDiplomaCode` | `candidate.van_bang_tn_sohieu` | Trim text. |
| AE | Nơi cấp bằng THPT | `highSchoolDiplomaPlace` | `candidate.tn_noicap` | Trim text. |
| AF | Học lực lớp 12 | — | Chưa có nguồn export | Luôn để trống `""`. |
| AG | Hạnh kiểm lớp 12 | — | Chưa có nguồn export | Luôn để trống `""`. |
| AH | Bằng chuyên môn | `qualificationName` | Legacy: `van_bang_tn || vb_chuyenmon`; hiện hành: theo `doituong` | Trim text; hiện hành THPT dùng `van_bang_tn`, nhóm khác dùng `vb_chuyenmon`. |
| AI | Mã Bằng chuyên môn | `qualificationCode` | `candidate.vb_chuyenmon_sohieu` | Trim text. |
| AJ | Ngành tốt nghiệp | `graduationMajor` | `candidate.vb_chuyenmon_nganh` | Trim text; thiếu thì `""`. |
| AK | Nơi cấp bằng chuyên môn | `graduationInstitution` | Legacy: `candidate.vb_chuyenmon_noicap`; hiện hành THPT: `tn_noicap` | Trim text. |
| AL | Năm TN | `graduationYear` | Legacy: `vb_chuyenmon_namtn || nam_tn`; hiện hành theo `doituong` | Trim text. |
| AM | Địa chỉ nhận giấy báo | `recipientAddress` | `candidate.diachi_nhangiay` | Trim text. |
| AN | CB tuyển sinh | `createdById` | `candidate.created_by` tra `users` | Tra `User.display_name`. |
| AO | TK nhập HS | `ownerById` | `candidate.owner_by` tra `users` | Tra `User.display_name`. |
| AP | TK duyệt HS | `consultantId` | `candidate.nguoi_tuvan` tra `users` | Tra `User.display_name`. |
| AQ | Ghi chú | `note` | `record.ghi_chu` hoặc `candidate.content` | Legacy ưu tiên `record.ghi_chu`; hiện hành cũng áp dụng thứ tự này. |

## 5. Danh mục lỗi tiềm ẩn và điểm cần lưu ý khi gọi Service

1. **Phân trang khi lấy hồ sơ (`loopGetHosoByIds`)**:
   - Truy vấn hồ sơ bằng điều kiện `IN` với batch `50` ID/lần để tránh vượt giới hạn URL/payload của backend.
   - Luôn kiểm tra mảng kết quả rỗng hoặc vượt quá độ dài để dừng đệ quy.
2. **Khớp ID địa danh**:
   - `LocationService.queryLocation` được gọi 2 lần với 2 bảng `regions` (tỉnh/thành phố) và `provinces` (quận/huyện/phường/xã).
   - Lookup tỉnh ưu tiên tra từ `regions`, lookup xã/phường tra từ `provinces`.
3. **Lookup cán bộ (`users`)**:
   - Danh mục `users` lấy qua `UserService.query([], { limit: -1 })`.
   - Tra cứu `created_by`, `owner_by`, `nguoi_tuvan` cần ép kiểu ID chính xác (tránh so sánh lệch kiểu `string` vs `number`).
4. **Không phụ thuộc file template vật lý**:
   - Cả 2 service đều sinh workbook động bằng `ExcelJS`, thiết lập trực tiếp cấu trúc dòng, cột, style, viền, công thức; không đọc file `.xlsx` tĩnh từ ổ đĩa hay asset server.
