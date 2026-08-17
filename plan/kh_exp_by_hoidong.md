# Kế hoạch xuất Excel hồ sơ theo hội đồng xét tuyển

## 1. Mục tiêu

Xây dựng chức năng xuất workbook `.xlsx` theo hội đồng xét tuyển, có nội dung và định dạng tương tự `plan/mau_dl_ts.xlsx`.

- Dùng `exceljs` đọc template, ghi dữ liệu, giữ định dạng, sinh file.
- Dùng `file-saver` qua `SAVER` provider hiện có.
- Xuất đủ 4 sheet: `DS TT`, `DS đề nghị TT`, `KQ xét tuyển`, `DL xét tuyển`.
- Lấy toàn bộ dữ liệu theo `hoidong_id`, không phụ thuộc trang hiện tại.
- Nhóm theo ngành đăng ký, sau đó theo văn bằng đầu vào.
- Không hardcode danh sách ngành, số thí sinh, vị trí dòng dữ liệu.

## 2. Phân tích file mẫu

### 2.1. Cấu trúc workbook

| Sheet | Cột | Nội dung |
|---|---:|---|
| `DS TT` | A:J | Danh sách trúng tuyển |
| `DS đề nghị TT` | A:J | Danh sách đề nghị trúng tuyển |
| `KQ xét tuyển` | A:M | Kết quả xét tuyển, có mã ngành, điểm, ghi chú |
| `DL xét tuyển` | A:M | Dữ liệu đầu vào xét tuyển |

Đặc điểm chung:

- Đầu sheet: đơn vị, quốc hiệu, tiêu ngữ, tên báo cáo, đợt, căn cứ văn bản.
- Chia theo ngành bằng số La Mã.
- Mỗi ngành chia 4 nhóm: Đại học, Cao đẳng, Trung cấp, THPT.
- `DH/CD/TC` dùng mã phương thức `500`; `THPT` dùng `200`.
- Mỗi nhóm có dòng header riêng.
- Cuối ngành có tổng; cuối sheet có tổng toàn danh sách.
- `DL xét tuyển` có ngày lập và người lập danh sách.
- Không có công thức, ảnh, data validation.
- Khổ A4 ngang, `fitToWidth = 1`.

### 2.2. Mapping cột A:J

| Cột | Nội dung | Nguồn |
|---|---|---|
| A | TT | Số thứ tự trong nhóm văn bằng |
| B | Họ và tên | `HosoThisinh.ho_va_ten` |
| C | Giới tính | `gioi_tinh`, chuẩn hóa qua `GENDER` |
| D | Ngày sinh | `ngay_sinh`, hiển thị `dd/MM/yyyy` |
| E | Nơi sinh | Tên địa danh từ `noi_sinh` |
| F | Dân tộc | `dan_toc` |
| G | Văn bằng | Nhãn từ `doituong`/dữ liệu văn bằng |
| H | Ngành/Nghề tốt nghiệp | `vb_chuyenmon_nganh`; THPT có thể rỗng |
| I | Nơi cấp bằng | `vb_chuyenmon_noicap`; THPT dùng `tn_noicap` |
| J | Năm TN | `vb_chuyenmon_namtn`; THPT dùng `nam_tn` |

### 2.3. Mapping cột K:M

Áp dụng cho `KQ xét tuyển`, `DL xét tuyển`:

| Cột | Nội dung | Nguồn |
|---|---|---|
| K | Mã ngành | `Nganhhoc.code`, tra bằng `nganh_id` |
| L | Điểm xét tuyển | `diem_xettuyen` |
| M | Ghi chú | Sinh theo sheet và trạng thái hồ sơ |

Tiêu đề điểm:

- `DH/CD/TC`: `Điểm xét tuyển (thang điểm 10)`.
- `THPT`: `Điểm xét tuyển (thang điểm 30)`.

## 3. Bài học từ `btnExportDataThisinhByKehoachV2()`

Luồng cũ:

1. Component tải orders, thí sinh, danh mục bằng `forkJoin`.
2. Component chuẩn hóa dữ liệu.
3. `ExportExcelHskService` dựng workbook, tải file.

Nên kế thừa:

- Tải toàn bộ dữ liệu theo khóa cha.
- Tải lookup song song.
- Chuẩn hóa text, ngày, trạng thái trước khi ghi Excel.
- Nhóm dữ liệu trước khi truyền service.
- Hiển thị tiến độ; đóng loading ở cả success/error.

Không nên sao chép:

- `any[]`, khóa `_hoten`, `_ngaysinh`, ...
- Xác định cột bằng `Object.keys(data[0])`.
- Hardcode số ngành/ID ngành.
- Mutate object API.
- Dựng toàn bộ style thủ công khi đã có template chuẩn.

## 4. Hiện trạng dự án đích

Điểm tích hợp:

- `HoidongHosoXetduyetComponent.onExportData()` đã tồn tại.
- Nút `Xuất dữ liệu` đã gọi hàm trên.
- `loopGetHdxtDsTs()` tải toàn bộ hồ sơ theo hội đồng với relation `thi-sinh`.
- `ExpHosoDaduyetService` đã inject nhưng service đang rỗng.
- `exceljs`, `file-saver`, `SAVER` provider đã có.

Dữ liệu hiện có:

- Cá nhân: họ tên, giới tính, ngày sinh, nơi sinh, dân tộc.
- Ngành: `nganh_id`.
- Nhóm đầu vào: `doituong` (`DH`, `CD`, `TC`, `THPT`).
- Văn bằng THPT: `van_bang_tn`, `nam_tn`, `tn_noicap`.
- Văn bằng chuyên môn: `vb_chuyenmon`, `vb_chuyenmon_nganh`, `vb_chuyenmon_noicap`, `vb_chuyenmon_namtn`.
- Điểm: `diem_xettuyen`.
- Kết quả: `status`.
- Lookup: ngành, địa danh, đợt, `DOI_TUONG`, `GENDER`, `TH_XETTUYEN`.

Metadata hành chính chưa có nguồn chính thức:

- Số/ngày quyết định trúng tuyển.
- Số/ngày công văn đề nghị trúng tuyển.
- Ngày biên bản hội đồng.
- Người lập danh sách.

Không hardcode ngày hoặc tên người từ file mẫu.

## 5. Contract dữ liệu đầu vào

### 5.1. API service

```typescript
export interface CouncilAdmissionExportPayload {
    council: CouncilExportInfo;
    round: AdmissionRoundExportInfo;
    documents: AdmissionDocumentExportInfo;
    candidates: readonly CouncilExportCandidate[];
}

export class ExpHosoDaduyetService {
    export(payload: CouncilAdmissionExportPayload): Promise<void>;
    buildWorkbook(payload: CouncilAdmissionExportPayload): Promise<Workbook>;
}
```

`buildWorkbook()` tách riêng để test mà không tải file.

### 5.2. Hội đồng, đợt, văn bản

```typescript
export interface CouncilExportInfo {
    id: number;
    name: string;
    reviewDate?: string;
}

export interface AdmissionRoundExportInfo {
    id: number;
    name: string;
    startDate?: string;
    endDate?: string;
}

export interface AdmissionDocumentExportInfo {
    decisionNumber?: string;
    decisionDate?: string;
    proposalNumber?: string;
    proposalDate?: string;
    meetingDate?: string;
    preparedDate?: string;
    preparedBy?: string;
}
```

Ngày đầu vào dùng ISO `yyyy-MM-dd`; Excel hiển thị `dd/MM/yyyy`.

Giai đoạn đầu: metadata truyền từ dialog/cấu hình xuất. Nếu cần lưu lâu dài, thêm vào hội đồng/đợt hoặc bảng cấu hình văn bản riêng.

### 5.3. Thí sinh chuẩn hóa

```typescript
export type QualificationGroup = 'DH' | 'CD' | 'TC' | 'THPT';

export interface CouncilExportCandidate {
    id: number;
    fullName: string;
    gender: string;
    birthDate?: string;
    birthPlace: string;
    ethnicity: string;
    qualificationGroup: QualificationGroup;
    qualificationName: string;
    graduationMajor: string;
    graduationInstitution: string;
    graduationYear: string;
    registeredMajorId: number;
    registeredMajorName: string;
    registeredMajorCode: string;
    admissionScore?: number;
    result: string;
    note?: string;
}
```

Service Excel không phụ thuộc response API/relation `thi-sinh`. Mapper không mutate `HosoThisinh` hoặc `HoidongHosoThisinh`.

### 5.4. Quy tắc map

| Export | Nguồn/quy tắc |
|---|---|
| `fullName` | `ho_va_ten.trim()` |
| `gender` | Tra `GENDER`; thiếu thì rỗng |
| `birthDate` | Phần ngày, format `dd/MM/yyyy` |
| `birthPlace` | ID thì tra địa danh; string thì dùng trực tiếp |
| `ethnicity` | `dan_toc` |
| `qualificationGroup` | Chuẩn hóa `doituong` |
| `qualificationName` | `DOI_TUONG`; ưu tiên `vb_chuyenmon` |
| `graduationMajor` | `vb_chuyenmon_nganh`; THPT có thể rỗng |
| `graduationInstitution` | `vb_chuyenmon_noicap`; THPT dùng `tn_noicap` |
| `graduationYear` | `vb_chuyenmon_namtn`; THPT dùng `nam_tn` |
| `registeredMajorName/code` | Tra `Nganhhoc` bằng `nganh_id` |
| `admissionScore` | `diem_xettuyen`, giữ kiểu number |
| `result` | `status` |
| `note` | `content` nếu nghiệp vụ cho phép |

## 6. Bộ lọc từng sheet

Phương án đề xuất, cần xác nhận:

| Sheet | Tập dữ liệu |
|---|---|
| `DL xét tuyển` | Toàn bộ hồ sơ thuộc hội đồng |
| `KQ xét tuyển` | Hồ sơ đã có kết quả xét tuyển |
| `DS đề nghị TT` | Chỉ `TRUNG_TUYEN` |
| `DS TT` | Chỉ `TRUNG_TUYEN` |

Ghi chú:

- `TRUNG_TUYEN`: `Đủ điều kiện trúng tuyển`.
- `KHONG_TRUNG_TUYEN`: `Không đủ điều kiện trúng tuyển`.
- `DL xét tuyển`: dùng nhãn trạng thái thích hợp, ví dụ `Đủ điều kiện xét tuyển`.

Hiện chưa có trạng thái riêng tách “đề nghị trúng tuyển” và “đã ban hành quyết định trúng tuyển”; vì vậy hai sheet có thể cùng dữ liệu. Nếu nghiệp vụ cần khác nhau, bổ sung trạng thái/cờ trước khi code.

## 7. Nhóm, sắp xếp, tổng hợp

1. Lọc theo sheet.
2. Nhóm theo `registeredMajorId`.
3. Sắp xếp ngành theo danh mục; nếu không có thứ tự, dùng `registeredMajorCode`.
4. Trong ngành, nhóm cố định: `DH`, `CD`, `TC`, `THPT`.
5. Sắp xếp tên bằng `localeCompare(..., 'vi')` để file ổn định.
6. TT bắt đầu lại từ 1 trong mỗi nhóm.
7. Tổng ngành lấy từ dữ liệu thực tế sau lọc.
8. Tổng cuối sheet bằng tổng các ngành.
9. Nhóm rỗng hiển thị hay bỏ cần xác nhận.

## 8. Kiến trúc template-based

### 8.1. Template

- Sao chép, làm sạch file mẫu thành `frontend/src/assets/templates/kh_exp_by_hoidong.xlsx`.
- Service tải bằng `HttpClient`, `responseType: 'arraybuffer'`.
- ExcelJS đọc bằng `workbook.xlsx.load(arrayBuffer)`.
- Xóa dữ liệu cá nhân mẫu; giữ style mẫu cho từng loại dòng.
- Dựng lại vùng động theo số ngành/nhóm/thí sinh.
- Dùng `duplicateRow()` hoặc clone style cell.
- Unmerge vùng động trước; merge lại sau khi sinh dòng.
- Ghi bằng `workbook.xlsx.writeBuffer()`; tải qua `SAVER`.

Ưu điểm: giữ font, border, merge, độ rộng, chiều cao, print setup; dễ thay biểu mẫu.

### 8.2. Trách nhiệm service

`ExpHosoDaduyetService`:

- Tải/kiểm tra template đủ 4 sheet.
- Validate payload tối thiểu.
- Lọc, nhóm, sắp xếp dữ liệu chuẩn hóa.
- Ghi metadata tiêu đề.
- Dựng ngành, nhóm, header, data, tổng, ký tên.
- Giữ style/merge/page setup.
- Sinh tên file; trả workbook/tải file.

Không gọi API, hiển thị toast/progress, sửa trạng thái, mutate đầu vào.

### 8.3. Trách nhiệm component

`HoidongHosoXetduyetComponent`:

1. Kiểm tra hội đồng; khóa nút khi đang xuất.
2. Tải song song toàn bộ assignment, ngành, nơi sinh, đợt.
3. Map sang `CouncilExportCandidate[]`.
4. Tạo payload và gọi service.
5. Cập nhật tiến độ.
6. Dùng `finalize()` đóng loading mọi nhánh.
7. Báo lỗi rõ khi API/template lỗi.

Tối ưu:

- Workbook cần `noi_sinh`, không cần tải `dia_chi_xa` nếu không dùng.
- Batch các ID địa danh duy nhất.
- Tạo `Map<number, string>` cho địa danh; `Map<number, Nganhhoc>` cho ngành.
- Có thể dùng `loadAllByHoidong()` nếu endpoint `limit: -1` ổn định; nếu chưa xác nhận, giữ phân trang hiện tại.

## 9. File dự kiến thay đổi

### Tạo mới

- `frontend/src/assets/templates/kh_exp_by_hoidong.xlsx`.
- Có thể thêm `frontend/src/app/models/tuyensinh/council-admission-export.ts`.
- `frontend/src/app/services/tuyensinh/exp-hoso-daduyet.service.spec.ts`.

### Chỉnh sửa

- `frontend/src/app/services/tuyensinh/exp-hoso-daduyet.service.ts`.
- `frontend/src/app/pages/admin/children/hoidong-xettuyen/hoidong-hoso-xetduyet/hoidong-hoso-xetduyet.component.ts`.
- `frontend/src/app/pages/admin/children/hoidong-xettuyen/hoidong-hoso-xetduyet/hoidong-hoso-xetduyet.component.spec.ts`.

Chỉ sửa HTML/model/backend nếu xác nhận cần dialog hoặc lưu metadata hành chính.

## 10. Các giai đoạn thực hiện

### Giai đoạn 1: Chuẩn hóa template

1. Sao chép mẫu vào assets.
2. Giữ 4 sheet, tên, style, print setup.
3. Xóa dữ liệu cá nhân mẫu.
4. Giữ dòng style mẫu hoặc sheet template ẩn.
5. Đánh dấu vùng động.
6. Kiểm tra Angular build copy template.

### Giai đoạn 2: Contract và mapper

1. Tạo interface typed.
2. Implement mapper bất biến.
3. Chuẩn hóa ngày, giới tính, văn bằng, ngành, điểm, status.
4. Validate nhóm văn bằng, ngành, họ tên.

### Giai đoạn 3: Service ExcelJS

1. Inject `HttpClient`, `SAVER`.
2. Tải và kiểm tra template.
3. Tạo helper lọc, nhóm, tiêu đề, ghi chú, format.
4. Dựng lại từng sheet.
5. Áp style/merge/page setup.
6. Tính tổng.
7. Ghi metadata.
8. Ghi buffer, tải file.

### Giai đoạn 4: Component

1. Tải hồ sơ, ngành, nơi sinh, đợt song song.
2. Map payload.
3. Thu metadata từ nguồn được xác nhận.
4. Gọi export.
5. Hoàn thiện progress, loading, toast, chặn click lặp.

### Giai đoạn 5: Kiểm thử

1. Unit test mapper.
2. Unit test service bằng cách đọc lại buffer qua ExcelJS.
3. Unit test component orchestration.
4. Build production.
5. Chạy UI, xuất file thật.
6. Mở bằng Excel/LibreOffice, so sánh mẫu.

## 11. Kiểm thử và nghiệm thu

### Workbook

- [ ] Đủ 4 sheet, đúng tên/thứ tự.
- [ ] Mở không báo repair.
- [ ] Không còn dữ liệu cá nhân mẫu.
- [ ] Tên file an toàn: `ket-qua-xet-tuyen_<hoi-dong>_<yyyyMMdd-HHmmss>.xlsx`.

### Dữ liệu

- [ ] Đúng hội đồng; không giới hạn bởi phân trang UI.
- [ ] Nhóm đúng ngành và `DH/CD/TC/THPT`.
- [ ] Mã phương thức đúng `500/200`.
- [ ] Ngày `dd/MM/yyyy`.
- [ ] Điểm là number, định dạng thống nhất.
- [ ] Nơi sinh, tên/mã ngành đúng lookup.
- [ ] Ghi chú đúng status/sheet.
- [ ] Tổng ngành và tổng sheet chính xác.

### Định dạng

- [ ] Font, cỡ, bold/italic tương tự mẫu.
- [ ] Merge, border, width, height đúng.
- [ ] Wrap text cột dài.
- [ ] A4 ngang, fit một trang chiều rộng.
- [ ] Phần ký đúng vị trí.

### Trường hợp biên

- [ ] Hội đồng rỗng.
- [ ] Nhóm/ngành rỗng.
- [ ] Thiếu nơi sinh, mã ngành, ngày sinh, điểm.
- [ ] `doituong` ngoài 4 mã.
- [ ] Template thiếu/không tải được.
- [ ] API lỗi.
- [ ] Bấm xuất nhiều lần.

### Unit test service

- Không mutate payload.
- Đúng thứ tự ngành/nhóm.
- Đúng 10/13 cột.
- Đúng thang điểm 10/30.
- Đúng bộ lọc sheet.
- Đúng tổng.
- `export()` gọi `SAVER` đúng một lần với MIME `.xlsx`.

## 12. Rủi ro

### Cao

- Chưa có quy tắc tách `DS đề nghị TT`/`DS TT`.
- Metadata văn bản chưa có nguồn chính thức.
- Merge động có thể hỏng nếu chèn/xóa dòng không kiểm soát.

### Trung bình

- `doituong`/văn bằng cũ không đồng nhất.
- `noi_sinh` có thể là ID hoặc string.
- Điểm mẫu lẫn text dấu phẩy và number dấu chấm.
- Dữ liệu lớn có thể làm UI đứng khi ExcelJS ghi workbook.

### Thấp

- Tên file có ký tự đặc biệt.
- Máy người dùng thiếu font mẫu.

Độ phức tạp: **Trung bình–Cao**.

## 13. Cần xác nhận trước khi code

1. `DS đề nghị TT` và `DS TT` cùng dùng `TRUNG_TUYEN`, hay có trạng thái/cờ riêng?
2. `KQ xét tuyển` gồm cả trúng tuyển và không trúng tuyển, hay chỉ hồ sơ đủ điều kiện?
3. `DL xét tuyển` gồm toàn bộ hồ sơ hội đồng, hay chỉ `DU_DK_XET_TUYEN` trở lên?
4. Nhóm văn bằng rỗng vẫn hiển thị như mẫu hay bỏ?
5. Metadata quyết định, công văn, biên bản, người lập lấy từ đâu?
6. Có cần dialog nhập metadata mỗi lần xuất không?
7. Điểm hiển thị dấu phẩy hay dấu chấm? Đề xuất giữ number, format `0.00`.
8. Giai đoạn đầu cần đủ 4 sheet, hay chỉ `KQ xét tuyển` và `DL xét tuyển`?

## 14. Kết luận

`plan/mau_dl_ts.xlsx` đủ làm mẫu; chưa cần file mẫu khác.

Phương án ưu tiên: template sạch + payload typed. Component tải/map dữ liệu; `ExpHosoDaduyetService` chỉ quản lý workbook và tải file. Chưa thực hiện code trước khi mục 13 được xác nhận.
