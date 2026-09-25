import { inject, Injectable } from '@angular/core';
import { SAVER, Saver } from '@app/providers/saver.provider';
import { ChuongtrinhDaotao } from '@models/tuyensinh/chuongtrinh-daotao';
import { DotXettuyen } from '@models/tuyensinh/dot-xettuyen';
import { Registrations } from '@models/tuyensinh/registrations';
import { Nganhhoc } from '@models/tuyensinh/nganhhoc';
import { Locations } from '@models/location';
import { User } from '@models/user';
import ExcelJS, {
    Alignment,
    Border,
    CellValue,
    Fill,
    Font,
    Row,
    Workbook,
    Worksheet,
} from 'exceljs';

export interface HosoTuyensinhExportPayload {
    records: readonly Registrations[];
    majors: readonly Pick<Nganhhoc, 'id' | 'ma_nganh' | 'ten_nganh'>[];

    rounds: readonly Pick<DotXettuyen, 'id' | 'tieude'>[];
    regions: readonly Pick<Locations, 'id' | 'name'>[];
    provinces: readonly Pick<Locations, 'id' | 'name'>[];
    users: readonly Pick<User, 'id' | 'display_name' | 'username'>[];
}

interface ExportGroup {
    name: string;
    startColumn: number;
    endColumn: number;
}

interface CodeNameLookup {
    code: string;
    name: string;
}

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SHEET_NAME = 'DL hồ sơ';
const COLUMN_COUNT = 43;
const LAST_COLUMN = 'AS';
const BASE_FONT: Partial<Font> = { name: 'Times New Roman', size: 11 };
const THIN_BORDER: Partial<Border> = {
    style: 'thin',
    color: { argb: 'FF000000' },
};
const DATA_BORDER = {
    top: THIN_BORDER,
    left: THIN_BORDER,
    bottom: THIN_BORDER,
    right: THIN_BORDER,
};
const CENTER_ALIGNMENT: Partial<Alignment> = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
};
const GROUP_FILL: Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF9DC3E6' },
};
const HEADER_FILL: Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9EAF7' },
};
const GROUPS: readonly ExportGroup[] = [
    { name: 'Quản lý hồ sơ', startColumn: 1, endColumn: 6 },
    { name: 'Thông tin cá nhân', startColumn: 7, endColumn: 18 },
    { name: 'Địa chỉ', startColumn: 19, endColumn: 22 },
    { name: 'Đăng ký xét tuyển', startColumn: 23, endColumn: 27 },
    { name: 'Điểm', startColumn: 28, endColumn: 30 },
    { name: 'Bằng THPT', startColumn: 31, endColumn: 34 },
    { name: 'Văn bằng chuyên môn', startColumn: 35, endColumn: 39 },
    { name: 'Theo dõi nghiệp vụ', startColumn: 40, endColumn: 43 },
];
const HEADERS: readonly string[] = [
    'STT',
    'ID hồ sơ',
    'Trạng thái',
    'Đợt xét tuyển',
    'Ngày tạo',
    'Ngày cập nhật',
    'CCCD',
    'Ngày cấp CCCD',
    'Nơi cấp CCCD',
    'Họ và tên',
    'Họ',
    'Tên',
    'Ngày sinh',
    'Giới tính',
    'Dân tộc',
    'Nơi sinh',
    'Điện thoại',
    'Email',
    'Tỉnh/thành',
    'Xã/phường',
    'Địa chỉ chi tiết',
    'Địa chỉ đầy đủ',
    'Mã ngành',
    'Tên ngành',
    // 'Mã CTĐT',
    // 'Tên CTĐT',
    'Đối tượng',
    'Hình thức xét tuyển',
    'Nguồn nộp',
    'Điểm xét tuyển',
    'Điểm ưu tiên',
    'Điểm cộng',
    'Văn bằng tốt nghiệp',
    'Năm tốt nghiệp',
    'Mã bằng',
    'Nơi cấp',
    'Văn bằng',
    'Ngành tốt nghiệp',
    'Nơi cấp',
    'Số hiệu',
    'Năm tốt nghiệp',
    'Tài khoản nhập DL',
    'Tài khoản sở hữu HS',
    'Tài khoản Duyệt HS',
    'Ghi chú',
];
const COLUMN_WIDTHS: readonly number[] = [
    7, 12, 28, 22, 18, 18, 17, 16, 24, 28, 22, 14, 16, 12, 14, 22, 16, 26,
    22, 24, 28, 42, 16, 30, 16, 30, 17, 22, 18, 16, 16, 14, 24, 17, 18, 26,
    22, 26, 26, 28, 28, 28, 24, 38,
];
export const STATUS_LABELS = new Map<number, string>([
    [-1, 'Không trúng tuyển'],
    [0, 'Chờ duyệt'],
    [1, 'Hồ sơ chưa đủ, cần bổ sung'],
    [2, 'Đã duyệt, chờ kết quả xét tuyển'],
    [3, 'Trúng tuyển'],
    [4, 'Chưa nhập học'],
    [5, 'Đã nhập học, chưa hoàn thành thủ tục nhập học'],
    [6, 'Đã hoàn thành thủ tục nhập học'],
]);

@Injectable({ providedIn: 'root' })
export class ExpHosoTuyensinhService {
    private readonly save = inject<Saver>(SAVER);

    async buildWorkbook(payload: HosoTuyensinhExportPayload): Promise<Workbook> {
        if (!payload.records.length) {
            throw new Error('Không có dữ liệu hồ sơ để xuất');
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Hệ thống tuyển sinh';
        workbook.created = new Date();
        workbook.modified = new Date();

        const worksheet = workbook.addWorksheet(SHEET_NAME);
        this.configureWorksheet(worksheet);
        this.addHeaders(worksheet);
        this.addRecords(worksheet, payload);

        return workbook;
    }

    async exportExcel(payload: HosoTuyensinhExportPayload): Promise<void> {
        const workbook = await this.buildWorkbook(payload);
        const buffer = await workbook.xlsx.writeBuffer();
        this.save(
            new Blob([buffer], { type: MIME_XLSX }),
            `Danh-sach-ho-so-tuyen-sinh-${this.today()}.xlsx`,
        );
    }

    private configureWorksheet(worksheet: Worksheet): void {
        worksheet.columns = COLUMN_WIDTHS.map((width: number) => ({ width }));
        worksheet.views = [{ state: 'frozen', ySplit: 2 }];
        worksheet.autoFilter = `A2:${LAST_COLUMN}2`;
        worksheet.properties.defaultRowHeight = 22;
        worksheet.pageSetup = {
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
        };
    }

    private addHeaders(worksheet: Worksheet): void {
        const groupRow = worksheet.getRow(1);
        for (const group of GROUPS) {
            worksheet.mergeCells(1, group.startColumn, 1, group.endColumn);
            const cell = groupRow.getCell(group.startColumn);
            cell.value = group.name;
            cell.fill = GROUP_FILL;
        }
        this.styleHeaderRow(groupRow, GROUP_FILL, 28);

        const headerRow = worksheet.getRow(2);
        headerRow.values = [...HEADERS];
        this.styleHeaderRow(headerRow, HEADER_FILL, 42);
    }

    private addRecords(
        worksheet: Worksheet,
        payload: HosoTuyensinhExportPayload,
    ): void {
        const majorMap = new Map<string, CodeNameLookup>(
            payload.majors.map(major => [
                major.ten_nganh,
                { code: this.text(major.ma_nganh), name: this.text(major.ten_nganh) },
            ]),
        );
        const roundMap = new Map<number, string>(
            payload.rounds.map(round => [round.id, this.text(round.tieude)]),
        );
        const regionMap = new Map<number, string>(
            payload.regions.map(region => [region.id, this.text(region.name)]),
        );
        const provinceMap = new Map<number, string>(
            payload.provinces.map(province => [province.id, this.text(province.name)]),
        );
        const userMap = new Map<number, string>(
            payload.users.map(user => {
                const displayName = this.text(user.display_name).trim();
                const username = this.text(user.username).trim();
                const label = displayName && username
                    ? `${displayName} - ${username}`
                    : (displayName || username);
                return [user.id, label];
            }),
        );

        payload.records.forEach((record: Registrations, index: number): void => {
            const row = worksheet.addRow(this.recordValues(
                record,
                index + 1,
                majorMap,

                roundMap,
                regionMap,
                provinceMap,
                userMap,
            ));
            this.styleDataRow(row);
        });
    }

    private recordValues(
        record: Registrations,
        order: number,
        majors: ReadonlyMap<string, CodeNameLookup>,
        rounds: ReadonlyMap<number, string>,
        regions: ReadonlyMap<number, string>,
        provinces: ReadonlyMap<number, string>,
        users: ReadonlyMap<number, string>,
    ): CellValue[] {
        const [familyName, givenName] = this.splitName(record.ho_va_ten);
        const fullName = this.text(record.ho_va_ten).trim().replace(/\s+/g, ' ');
        const major = record.nganh_dangky == null ? undefined : majors.get(record.nganh_dangky);

        const region = this.lookup(regions, record.dia_chi_tinh);
        const province = this.lookup(provinces, record.dia_chi_xa);
        const detailedAddress = record.dia_chi_nha?.trim() ?? '';
        const fullAddress = [detailedAddress, province, region]
            .filter((value: string): boolean => value.length > 0)
            .join(', ');

        const values: CellValue[] = [
            order,
            record.id ?? '',
            this.statusLabel(record.status),
            this.lookup(rounds, record.dotxettuyen_id),
            this.formatDate(record.created_at),
            this.formatDate(record.updated_at),
            record.cccd ?? '',
            this.formatDate(record.ngay_cap_cccd),
            record.noi_cap_cccd ?? '',
            fullName,
            familyName,
            givenName,
            this.formatDate(record.ngay_sinh),
            this.genderLabel(record.gioi_tinh),
            record.dan_toc ?? '',
            this.lookup(regions, record.noi_sinh),
            record.dien_thoai ?? '',
            record.email ?? '',
            region,
            province,
            detailedAddress,
            fullAddress,
            major?.code ?? record.nganh_dangky,
            major?.name ?? this.idText(record.nganh_id),
            record.doituong ?? '',
            record.hinhthuc_xettuyen ?? '',
            record.submit_from ?? '',
            record.diem_xettuyen ?? '',
            record.diem_uutien ?? '',
            record.diem_cong ?? '',
            record.van_bang_tn ?? '',
            record.nam_tn ?? '',
            record.van_bang_tn_sohieu ?? '',
            record.tn_noicap ?? '',
            record.vb_chuyenmon ?? '',
            record.vb_chuyenmon_nganh ?? '',
            record.vb_chuyenmon_noicap ?? '',
            record.vb_chuyenmon_sohieu ?? '',
            record.vb_chuyenmon_namtn ?? '',
            this.lookup(users, record.created_by),
            this.lookup(users, record.owner_by),
            this.lookup(users, record.nguoi_tuvan),
            record.content ?? '',
        ];

        return values.map(value => value ?? '');
    }

    private styleHeaderRow(row: Row, fill: Fill, height: number): void {
        row.height = height;
        for (let column = 1; column <= COLUMN_COUNT; column += 1) {
            const cell = row.getCell(column);
            cell.font = { ...BASE_FONT, bold: true };
            cell.alignment = CENTER_ALIGNMENT;
            cell.border = DATA_BORDER;
            cell.fill = fill;
        }
    }

    private styleDataRow(row: Row): void {
        row.height = 32;
        for (let column = 1; column <= COLUMN_COUNT; column += 1) {
            const cell = row.getCell(column);
            cell.font = BASE_FONT;
            cell.border = DATA_BORDER;
            cell.alignment = {
                horizontal: [1, 2, 5, 6, 7, 8, 13, 14, 17, 23, 25, 30, 31, 32].includes(column)
                    ? 'center'
                    : 'left',
                vertical: 'middle',
                wrapText: true,
            };
        }
    }

    private lookup(values: ReadonlyMap<number, string>, id: number | null | undefined): string {
        return id == null ? '' : values.get(id) ?? String(id);
    }

    private idText(id: number | null | undefined): string {
        return id == null ? '' : String(id);
    }

    private text(value: string | null | undefined): string {
        return value ?? '';
    }

    private splitName(fullName: string | null | undefined): [string, string] {
        const parts = this.text(fullName).trim().split(/\s+/).filter(Boolean);
        if (parts.length <= 1) return ['', parts[0] ?? ''];
        return [parts.slice(0, -1).join(' '), parts.at(-1) ?? ''];
    }

    private statusLabel(status: Registrations['status'] | null): string {
        return status == null ? '' : STATUS_LABELS.get(status) ?? String(status);
    }

    private genderLabel(gender: string | null | undefined): string {
        const value = this.text(gender).trim();
        const normalized = value.toLowerCase();
        if (normalized === 'nam' || normalized === 'male') return 'Nam';
        if (normalized === 'nu' || normalized === 'nữ' || normalized === 'female') return 'Nữ';
        return value;
    }

    private formatDate(value: string | null | undefined): string {
        if (!value) return '';
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
    }

    private today(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
