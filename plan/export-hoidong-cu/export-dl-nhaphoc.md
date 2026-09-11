# Kế hoạch xuất dữ liệu nhập học theo `DL_nhaphoc_Form.xlsx`

## 1. Mục tiêu

Hoàn thiện `ExportDlTuyensinhCuService` để tạo file Excel theo mẫu `DL_nhaphoc_Form.xlsx`. Service nhận `CouncilAdmissionExportPayload` đã được component chuẩn hóa. Trường nào payload hiện tại chưa có nguồn dữ liệu thì xuất ô trống, không suy diễn.

## 2. Cấu trúc workbook mẫu

- File mẫu: `plan/export-hoidong-cu/DL_nhaphoc_Form.xlsx`
- Tên sheet: `Mẫu xuất full`
- Số cột: 43 (`A:AQ`)
- Header: dòng 1, cao `31.5`
- Dữ liệu: từ dòng 2, dòng mẫu cao `47.25`
- Freeze panes: 4 cột đầu và dòng header (`xSplit: 4`, `ySplit: 1`)
- Zoom: `85%`
- Auto-filter: toàn bộ vùng có dữ liệu
- Border: viền mảnh cho header và ô dữ liệu
- Text dài: wrap text, căn giữa theo chiều dọc
- STT: công thức `SUBTOTAL(3,$B$2:B<n>)` như file mẫu

## 3. Mapping 43 cột

| Cột | Header | Nguồn `CouncilExportCandidate` | Quy tắc |
|---|---|---|---|
| A | TT | Công thức | `SUBTOTAL(3,$B$2:B<n>)` |
| B | Đợt | — | Trống |
| C | Mã SV | — | Trống |
| D | CCCD | — | Trống |
| E | Ngày cấp | — | Trống |
| F | Họ tên gộp | `fullName` | Trim |
| G | Họ | — | Trống, không tự tách họ tên |
| H | Tên | — | Trống, không tự tách họ tên |
| I | Ngày sinh | `birthDate` | `DD/MM/YYYY`; thiếu thì trống |
| J | Giới tính | `gender` | Thiếu thì trống |
| K | Dân tộc | `ethnicity` | Thiếu thì trống |
| L | Nơi sinh | `birthPlace` | Thiếu thì trống |
| M | Điện thoại | — | Trống |
| N | Email ictu | — | Trống |
| O | Email | — | Trống |
| P | Mã tỉnh | — | Trống |
| Q | Mã huyện | — | Trống |
| R | Địa chỉ | — | Trống |
| S | Mã tỉnh lớp 12 | — | Trống |
| T | Mã trường lớp 12 | — | Trống |
| U | Tên trường lớp 12 | — | Trống |
| V | KV ưu tiên | — | Trống |
| W | ĐT ưu tiên | — | Trống |
| X | Mã ngành ĐKXT | `registeredMajorCode` | Thiếu thì trống |
| Y | Tên ngành ĐKXT | `registeredMajorName` | Thiếu thì trống |
| Z | Điểm xét tuyển gốc | `admissionScore` | Giữ kiểu số; thiếu thì trống |
| AA | Điểm ƯT KV | — | Trống |
| AB | Điểm ƯT ĐT | — | Trống |
| AC | Điểm xét tuyển | `calculatedAdmissionScore` | Giữ kiểu số; thiếu thì trống |
| AD | Mã Bằng THPT | — | Trống |
| AE | Nơi cấp bằng THPT | — | Trống |
| AF | Học lực lớp 12 | — | Trống |
| AG | Hạnh kiểm lớp 12 | — | Trống |
| AH | Bằng chuyên môn | `qualificationName` | Thiếu thì trống |
| AI | Mã Bằng chuyên môn | — | Trống |
| AJ | Ngành tốt nghiệp | `graduationMajor` | Thiếu thì trống |
| AK | Nơi cấp bằng chuyên môn | `graduationInstitution` | Thiếu thì trống |
| AL | Năm TN | `graduationYear` | Thiếu thì trống |
| AM | Địa chỉ nhận giấy báo | — | Trống |
| AN | CB tuyển sinh | — | Trống |
| AO | TK nhập HS | — | Trống |
| AP | TK duyệt HS | — | Trống |
| AQ | Ghi chú | `note` | Trim; thiếu thì trống |

## 4. Luồng tích hợp

1. `HoidongHosoXetduyetComponent` tạo `CouncilAdmissionExportPayload` bằng `createExportPayload`.
2. Hội đồng có `created_at` trước `2026-09-01` gọi `ExpHosoDaduyetService`.
3. Hội đồng còn lại gọi `ExportDlTuyensinhCuService.exportExcel(payload)`.
4. Service mới tạo workbook, sheet `Mẫu xuất full`, header 43 cột rồi tải file qua `SAVER`.

## 5. Các bước code dự kiến

1. Hoàn thiện `frontend/src/app/services/tuyensinh/exportDlTuyensinhCu.service.ts`.
2. Inject `SAVER`; tái sử dụng `CouncilAdmissionExportPayload` và `CouncilExportCandidate`.
3. Thêm `buildWorkbook`, `export`, `exportExcel`.
4. Tạo header, widths, freeze pane, auto-filter, border, alignment giống mẫu.
5. Map candidate theo bảng trên; không mutate payload.
6. Đặt filename an toàn dạng `du-lieu-nhap-hoc_<hoi-dong>_<timestamp>.xlsx`.
7. Chỉ sửa component nếu build phát hiện mismatch; không sửa `FormThongtinDangkyComponent`.

## 6. Quy tắc an toàn dữ liệu

- Không bổ sung giá trị từ phỏng đoán.
- Không tự tách họ/tên.
- Không dùng `birthPlace` để điền mã tỉnh/huyện.
- Không dùng `note` cho cột khác ngoài `Ghi chú`.
- Giá trị `undefined`/`null` chuyển thành chuỗi rỗng.
- Không mutate payload hoặc candidate.

## 7. Kiểm tra sau triển khai

- Build Angular production không lỗi TypeScript.
- Workbook có đúng sheet `Mẫu xuất full`, 43 header đúng thứ tự.
- Freeze pane và auto-filter đúng vùng.
- Candidate thiếu trường vẫn xuất thành công; ô tương ứng trống.
- Candidate có ngày ISO hiển thị `DD/MM/YYYY`.
- File output có MIME `.xlsx` và tên file an toàn.
