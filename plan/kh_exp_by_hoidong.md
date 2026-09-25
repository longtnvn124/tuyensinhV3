# Xuất Excel hồ sơ theo hội đồng xét tuyển

## 1. Phạm vi và trạng thái

Chức năng đã triển khai tại:

- `frontend/src/app/services/tuyensinh/exp-hoso-daduyet.service.ts`.
- `frontend/src/app/services/tuyensinh/exportDlTuyensinhCu.service.ts`.
- `frontend/src/app/pages/admin/children/hoidong-xettuyen/hoidong-hoso-xetduyet/hoidong-hoso-xetduyet.component.ts`.

`HoidongHosoXetduyetComponent.onExportData()` xuất dữ liệu theo hội đồng. Hồ sơ được tách theo ngày tạo:

| Nhóm hồ sơ | Điều kiện | Service |
|---|---|---|
| Dữ liệu cũ | `created_at` trước `2026-09-01` | `ExportDlTuyensinhCuService` |
| Dữ liệu hiện hành | `created_at` từ `2026-09-01` hoặc không có ngày tạo hợp lệ | `ExpHosoDaduyetService` |

Một hội đồng có cả hai nhóm sẽ tải **hai file Excel**, theo thứ tự file dữ liệu cũ rồi đến file dữ liệu hiện hành.

## 2. Workbook hiện hành

`ExpHosoDaduyetService` dựng workbook mới hoàn toàn bằng `ExcelJS`; không tải hoặc phụ thuộc template `.xlsx` trong `assets`.

### 2.1. Sheet

| Thứ tự | Sheet | Cột | Nội dung |
|---:|---|---:|---|
| 1 | `DS TT` | A:J | Danh sách thí sinh trúng tuyển |
| 2 | `DS đề nghị TT` | A:K | Danh sách đề nghị công nhận trúng tuyển (thêm cột Mã số bằng giữa Dân tộc và Văn bằng) |
| 3 | `KQ xét tuyển` | A:N | Kết quả xét tuyển |
| 4 | `DL xét tuyển` | A:N | Dữ liệu xét tuyển |
| 5 | `Dữ liệu tổng hợp` | A:AQ | Bảng tổng hợp 43 cột theo mẫu nhập học |

### 2.2. Định dạng được sinh bởi service

- Font mặc định: `Times New Roman`, cỡ `11`.
- Khổ giấy A4 ngang, `fitToWidth = 1`, căn giữa theo chiều ngang.
- Độ rộng cột A:N: `7, 27, 11, 14, 20, 13, 18, 27, 25, 11, 14, 16, 31, 22`.
- Header bảng có border mảnh, nền xanh nhạt, căn giữa, wrap text.
- Dòng dữ liệu và dòng tổng có border mảnh; chiều cao lần lượt `32` và `24`.
- Phần ký tên chỉ có trong sheet `DL xét tuyển`.

Sheet `Dữ liệu tổng hợp` dùng định dạng riêng:

- 43 cột A:AQ.
- Freeze panes `xSplit: 4`, `ySplit: 1`, `topLeftCell: E2`, zoom `85%`.
- Auto-filter `A1:AQ<n>`.
- Header cao `31.5`, dòng dữ liệu cao `47.25`.
- Cột TT dùng công thức `SUBTOTAL(3,$B$2:B<n>)`.
- Cột Z/AC giữ kiểu number; cột I dùng text `DD/MM/YYYY`.

Workbook có tiêu đề cơ quan, quốc hiệu, tên hội đồng, thông tin đợt xét tuyển; metadata văn bản chỉ hiển thị khi payload có giá trị tương ứng.

## 3. Contract service

```typescript
export type QualificationGroup = 'DH' | 'CD' | 'TC' | 'THPT';

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
    calculatedAdmissionScore?: number;
    result: string;
    note?: string;
}

export interface CouncilAdmissionExportPayload {
    council: CouncilExportInfo;
    round: AdmissionRoundExportInfo;
    documents: AdmissionDocumentExportInfo;
    candidates: readonly CouncilExportCandidate[];
}

export class ExpHosoDaduyetService {
    buildWorkbook(payload: CouncilAdmissionExportPayload): Promise<Workbook>;
    export(payload: CouncilAdmissionExportPayload): Promise<void>;
    exportExcel(payload: CouncilAdmissionExportPayload): Promise<void>;
}
```

`buildWorkbook()` là API dựng workbook tách riêng; `export()` gọi trực tiếp API này, ghi buffer `.xlsx`, tạo `Blob` đúng MIME và tải qua `SAVER`. `buildWorkbook()` cũng cho phép kiểm thử mà không tải file. `exportExcel()` là alias gọi `export()`.

Tên file có dạng:

```text
ket-qua-xet-tuyen_<ten-hoi-dong-da-chuan-hoa>_<UTC-yyyyMMdd-HHmmss>.xlsx
```

## 4. Luồng tại component

1. Chặn thao tác nếu đang xuất, thiếu hội đồng, thiếu đợt xét tuyển hoặc hội đồng không có hồ sơ.
2. Mở progress animation.
3. Lấy đợt bằng `DotXettuyenService.get(council.dot_xettuyen_id)`; map `round.name` từ `round.tieude`, cùng `thoi_gian_bat_dau`/`thoi_gian_ket_thuc` vào `startDate`/`endDate`.
4. Tải lại toàn bộ assignment của hội đồng (`limit: -1`), sau đó lấy hồ sơ theo lô 50 ID và hydrate vào `_hoso`.
5. Chia hồ sơ cũ/hiện hành theo `created_at` với mốc `2026-09-01`.
6. Tạo payload tương ứng, xuất tuần tự từng file.
7. Hoàn tất progress, đóng loading trong `finalize()`; thông báo toast success/error.

Catalog ngành, địa danh, người dùng đã tải ở luồng khởi tạo component được tái sử dụng khi map payload. Lần xuất vẫn tải lại assignment/hồ sơ để đảm bảo dữ liệu mới nhất.

## 5. Mapping hồ sơ hiện hành

| Payload | Nguồn/quy tắc |
|---|---|
| `id` | `_hoso.id` |
| `fullName` | `_hoso.ho_va_ten.trim()` |
| `gender` | Nhãn từ `GENDER` theo `gioi_tinh`; không tra được thì dùng giá trị gốc hoặc rỗng |
| `birthDate` | `_hoso.ngay_sinh` |
| `birthPlace` | Tra `provinceOptions()` theo `_hoso.noi_sinh` |
| `ethnicity` | `_hoso.dan_toc`, thiếu thì rỗng |
| `qualificationGroup` | `_hoso.doituong`, chỉ nhận `DH`, `CD`, `TC`, `THPT`; giá trị khác dừng export và báo hồ sơ lỗi |
| `qualificationName` | THPT: `van_bang_tn`; nhóm khác: `vb_chuyenmon`; thiếu thì nhãn `DOI_TUONG` |
| `graduationMajor` | `vb_chuyenmon_nganh` |
| `graduationInstitution` | THPT: `tn_noicap`; nhóm khác: `vb_chuyenmon_noicap` |
| `graduationYear` | THPT: `nam_tn`; nhóm khác: `vb_chuyenmon_namtn` |
| `registeredMajorId/name/code` | Tra `Nganhhoc` có `ten_nganh.trim()` bằng `nganh_dangky.trim()`; dùng `id`, `ten_nganh`, `ma_nganh` từ catalog |
| `admissionScore` | `_hoso.diem_xettuyen` |
| `calculatedAdmissionScore` | Kết quả công thức điểm ưu tiên tại mục 6 |
| `result` | Nhãn `TH_XETTUYEN` theo `_hoso.status`; nếu không có, tra `record.ket_qua` theo `kyhieu`; cuối cùng dùng chính `record.ket_qua` |
| `note` | `record.ghi_chu.trim()` hoặc `_hoso.content.trim()` |

Không map `registeredMajorId` trực tiếp từ `_hoso.nganh_id` trong luồng hiện hành. Nếu không tìm được ngành theo `nganh_dangky`, export dừng với thông báo lỗi.

## 6. Công thức điểm xét tuyển sau công thức

`calculatedAdmissionScore` dùng `decimal.js`, không làm tròn số thực trung gian.

| Nhóm | Thang tối đa | Ngưỡng | Khoảng giảm | Điểm ưu tiên ban đầu |
|---|---:|---:|---:|---|
| `THPT` | 30 | 22.5 | 7.5 | `diem_uutien + diem_cong` |
| `DH`, `CD`, `TC` | 10 | 7.5 | 2.5 | `(diem_uutien + diem_cong) / 3` |

Quy tắc:

1. Không có `diem_xettuyen` thì `calculatedAdmissionScore` để trống.
2. Điểm gốc dưới ngưỡng: cộng toàn bộ điểm ưu tiên ban đầu.
3. Điểm gốc từ ngưỡng trở lên: điểm ưu tiên thực tế bằng `(điểm tối đa - điểm gốc) / khoảng giảm × điểm ưu tiên ban đầu`.
4. Tổng điểm không vượt thang tối đa.
5. Làm tròn 2 chữ số thập phân, `Decimal.ROUND_HALF_UP`.

Ví dụ: THPT có `diem_xettuyen = 25.5`, `diem_uutien = 1.5`, `diem_cong = 0.5` cho kết quả `26.7`.

Lưu ý: test component spec hiện ghi nhận DH `(8.1, 1, 0.5)` = `8.5` và THPT `(29.5, 3, 2)` = `29.8`, nhưng theo công thức ở trên DH = `8.48` và THPT = `29.83`. Cần đồng bộ giữa implementation và test trước khi dùng làm chuẩn.

## 7. Cột dữ liệu

### 7.1. Cột A:J

| Cột | Nội dung | Giá trị |
|---|---|---|
| A | TT | Số thứ tự, bắt đầu lại từ 1 trong từng nhóm văn bằng |
| B | Họ và tên | `fullName` |
| C | Giới tính | `gender` |
| D | Ngày sinh | `birthDate`, hiển thị `dd/MM/yyyy` nếu đầu vào là ISO |
| E | Nơi sinh | `birthPlace` |
| F | Dân tộc | `ethnicity` |
| G | Văn bằng | `qualificationName`; thiếu thì nhãn nhóm |
| H | Ngành/Nghề tốt nghiệp | `graduationMajor` |
| I | Nơi cấp bằng | `graduationInstitution` |
| J | Năm TN | `graduationYear` |

### 7.2. Cột K:N

Chỉ có tại `KQ xét tuyển` và `DL xét tuyển`.

| Cột | Nội dung | Giá trị |
|---|---|---|
| K | Mã ngành | `registeredMajorCode` |
| L | Điểm xét tuyển | `admissionScore`, dạng text với dấu phẩy thập phân |
| M | Ghi chú | Theo quy tắc sheet tại mục 8 |
| N | Điểm xét tuyển sau công thức | `calculatedAdmissionScore`, dạng text với dấu phẩy thập phân |

`admissionScore` và `calculatedAdmissionScore` được ghi thành text (dấu phẩy) qua `formatScore()`; cột A (`TT`) là cột số duy nhất còn lại.

Tiêu đề cột L:

- `THPT`: `Điểm xét tuyển (thang điểm 30)`.
- `DH`, `CD`, `TC`: `Điểm xét tuyển (thang điểm 10)`.

## 8. Lọc, nhóm và ghi chú

### 8.1. Bộ lọc sheet

| Sheet | Dữ liệu |
|---|---|
| `DL xét tuyển` | Toàn bộ candidate của payload |
| `KQ xét tuyển` | Candidate có `result.trim().length > 0` |
| `DS đề nghị TT` | Candidate có `result === 'Trúng tuyển'` |
| `DS TT` | Candidate có `result === 'Trúng tuyển'` |

Hai sheet danh sách trúng tuyển hiện dùng cùng điều kiện do service chưa có trạng thái riêng cho “đề nghị” và “đã công nhận”.

### 8.2. Nhóm và sắp xếp

1. Nhóm theo `registeredMajorId`.
2. Sắp xếp ngành theo `registeredMajorCode`, tiếp theo `registeredMajorName`, rồi `registeredMajorId`.
3. Trong mỗi ngành, duyệt thứ tự `DH`, `CD`, `TC`, `THPT`.
4. Bỏ nhóm văn bằng không có thí sinh.
5. Sắp xếp thí sinh theo `fullName.localeCompare(..., 'vi')`.
6. Ghi tổng từng ngành từ số candidate thực tế sau lọc.
7. Ghi tổng cuối sheet từ tổng candidate của sheet.

### 8.3. Ghi chú

| Sheet | Quy tắc cột ghi chú |
|---|---|
| `KQ xét tuyển` | Luôn `Đủ điều kiện xét tuyển` |
| `DL xét tuyển` | Ưu tiên `candidate.note`; không có thì `Đủ điều kiện xét tuyển` |

`DS TT` và `DS đề nghị TT` chỉ có 10 cột nên không có cột ghi chú.

## 9. Metadata hành chính

Component hiện truyền:

```typescript
{
    meetingDate: council.ngay_xetduyet,
    preparedDate: new Date().toISOString().slice(0, 10),
}
```

Các giá trị chưa có nguồn UI/model chính thức, do đó để trống:

- `decisionNumber`, `decisionDate`.
- `proposalNumber`, `proposalDate`.
- `preparedBy`.

Hiển thị theo sheet trong `ExpHosoDaduyetService`:

| Sheet | Trường metadata | Ghi chú |
|---|---|---|
| `DS TT` | `decisionNumber`, `decisionDate` | Dòng 7: `Theo Quyết định số … ngày …` |
| `DS đề nghị TT` | `proposalNumber`, `proposalDate` | Dòng 7: `Theo Công văn đề nghị số … ngày …` |
| `KQ xét tuyển` | `meetingDate` | Dòng 7: `Theo biên bản họp hội đồng ngày …` |
| `DL xét tuyển` | `preparedDate`, `preparedBy` | Phần ký: `Thái Nguyên, ngày dd tháng MM năm yyyy` và người lập |

`council.reviewDate` được map ở component nhưng service hiện không dùng. Khi không có `preparedDate`, service hiển thị `ngày ..... tháng ..... năm ........` tại phần ký. Ngày có giá trị dùng định dạng hành chính `ngày dd tháng MM năm yyyy`.

## 10. Kiểm thử đã có

`hoidong-hoso-xetduyet.component.spec.ts` kiểm tra:

- Map payload export của hồ sơ hiện hành.
- Công thức điểm theo hai thang, gồm giới hạn điểm tối đa.
- Không export khi `doituong` không hợp lệ.
- Định tuyến hồ sơ cũ sang `ExportDlTuyensinhCuService`.
- Xuất hai file khi hội đồng đồng thời có dữ liệu cũ và hiện hành.

Chưa có spec trực tiếp cho `ExpHosoDaduyetService`; các component spec đang mock `exportExcel`, nên chưa xác nhận trực tiếp số sheet, kiểu cell, style, filter/tổng sau khi serialize workbook hoặc MIME của `Blob`. Test trường hợp hai nhóm cũng mới xác nhận cả hai service được gọi, chưa assert thứ tự tải file.

Lưu ý: test hiện hành đang dùng các giá trị kỳ vọng điểm `8.5` và `29.8`; theo công thức decimal hiện tại kết quả tương ứng là `8.48` và `29.83`. Cần điều chỉnh test hoặc công thức sau khi chốt quy tắc nghiệp vụ.
## 11. Checklist kiểm chứng tiếp theo

- [ ] Build Angular production sau thay đổi service/component.
- [ ] Xuất hội đồng chỉ có hồ sơ cũ.
- [ ] Xuất hội đồng chỉ có hồ sơ hiện hành.
- [ ] Xuất hội đồng có cả hai nhóm, xác nhận tải hai file theo thứ tự.
- [ ] Kiểm tra đủ 4 sheet và thứ tự `DS TT`, `DS đề nghị TT`, `KQ xét tuyển`, `DL xét tuyển` trong file hiện hành.
- [ ] Kiểm tra sheet 14 cột có cột N `Điểm xét tuyển sau công thức`.
- [ ] Kiểm tra lọc `Trúng tuyển`, tổng ngành, tổng sheet và số thứ tự từng nhóm.
- [ ] Mở file bằng Excel/LibreOffice, xác nhận không yêu cầu repair.
- [ ] Kiểm tra lỗi map ngành, thiếu `_hoso` và `doituong` không hợp lệ đều thông báo rõ.
