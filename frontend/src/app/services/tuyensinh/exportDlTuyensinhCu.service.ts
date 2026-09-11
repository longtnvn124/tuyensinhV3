import { inject, Injectable } from '@angular/core';
import { SAVER, Saver } from '@app/providers/saver.provider';
import { Locations } from '@models/location';
import { Nganhhoc } from '@models/tuyensinh/nganhhoc';
import { User } from '@models/user';
import ExcelJS, {
    Alignment,
    Border,
    Font,
    Workbook,
    Worksheet,
} from 'exceljs';
export interface TuyensinhCuExportCandidate {
    id: number;
    fullName: string;
    roundName?: string;
    gender?: string;
    birthDate?: string;
    birthPlace?: string;
    ethnicity?: string;
    phone?: string;
    email?: string;
    cccd?: string;
    cccdDate?: string;
    address?: string;
    provinceId?: number;
    wardId?: number;
    registeredMajorName?: string;
    registeredMajorCode?: string;
    admissionScore?: number;
    calculatedAdmissionScore?: number;
    highSchoolDiplomaCode?: string;
    highSchoolDiplomaPlace?: string;
    qualificationName?: string;
    qualificationCode?: string;
    graduationMajor?: string;
    graduationInstitution?: string;
    graduationYear?: string;
    recipientAddress?: string;
    createdById?: number;
    ownerById?: number;
    consultantId?: number;
    note?: string;
}

export interface TuyensinhCuExportPayload {
    council: {
        id: number;
        name: string;
    };
    round?: {
        id: number;
        name: string;
    };
    majors?: readonly Pick<Nganhhoc, 'id' | 'ma_nganh' | 'ten_nganh'>[];
    regions?: readonly Pick<Locations, 'id' | 'name'>[];
    provinces?: readonly Pick<Locations, 'id' | 'name'>[];
    users?: readonly Pick<User, 'id' | 'display_name'>[];
    candidates: readonly TuyensinhCuExportCandidate[];
    filenameSuffix?: string;
}

interface ExportLookups {
    majors: ReadonlyMap<string, string>;
    regions: ReadonlyMap<number, string>;
    provinces: ReadonlyMap<number, string>;
    users: ReadonlyMap<number, string>;
}

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SHEET_NAME = 'Mẫu xuất full';
const HEADER_ROW = 1;
const FIRST_DATA_ROW = 2;
const COLUMN_COUNT = 43;

const HEADERS: readonly string[] = [
    'TT',
    'Đợt',
    'Mã SV',
    'CCCD',
    'Ngày cấp',
    'Họ tên gộp',
    'Họ',
    'Tên',
    'Ngày sinh',
    'Giới tính',
    'Dân tộc',
    'Nơi sinh',
    'Điện thoại',
    'Email ictu',
    'Email',
    'Tỉnh/Thành phố',
    'Phường/Xã',
    'Địa chỉ',
    'Mã tỉnh lớp 12',
    'Mã trường lớp 12',
    'Tên trường lớp 12',
    'KV ưu tiên',
    'ĐT ưu tiên',
    'Mã ngành\nĐKXT',
    'Tên ngành\nĐKXT',
    'Điểm xét tuyển gốc',
    'Điểm ƯT KV',
    'Điểm ƯT ĐT',
    'Điểm xét tuyển',
    'Mã Bằng THPT',
    'Nơi cấp bằng THPT',
    'Học lực lớp 12 ',
    'Hạnh kiểm lớp 12',
    'Bằng chuyên môn',
    'Mã Bằng chuyên môn',
    'Ngành tốt nghiệp',
    'Nơi cấp bằng chuyên môn',
    'Năm TN',
    'Địa chỉ nhận giấy báo',
    'CB tuyển sinh',
    'TK nhập HS',
    'TK duyệt HS',
    'Ghi chú',
];

const COLUMN_WIDTHS: readonly number[] = [
    9.29, 17, 17.14, 15.43, 15.57, 26.57, 19.14, 10.29, 16.57, 15.71,
    14.43, 24.86, 17.29, 28.14, 29.29, 14.57, 16.71, 63.57, 21.71, 24.71,
    27.57, 23.29, 23.29, 16.71, 20.86, 25.14, 25.14, 25.14, 20.86, 22.14,
    22.14, 21.14, 25.29, 16.29, 26.86, 30.71, 33.43, 14.71, 93.29, 43.86,
    43.86, 23.71, 14.57,
];

const CENTERED_COLUMNS = new Set<number>([
    1, 2, 3, 4, 5, 9, 10, 11, 13, 16, 17, 19, 20, 22, 23, 24, 25, 26, 27,
    28, 29, 30, 31, 32, 33, 34, 35, 38,
]);

const BASE_FONT: Partial<Font> = {
    name: 'Times New Roman',
    size: 11,
};
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

@Injectable({
    providedIn: 'root',
})
export class ExportDlTuyensinhCuService {
    private readonly save = inject<Saver>(SAVER);

    async buildWorkbook(payload: TuyensinhCuExportPayload): Promise<Workbook> {
        this.validatePayload(payload);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Hệ thống tuyển sinh';
        workbook.created = new Date();
        workbook.modified = new Date();

        const worksheet = workbook.addWorksheet(SHEET_NAME);
        this.configureWorksheet(worksheet, payload.candidates.length);
        this.addHeaderRow(worksheet);
        const lookups = this.createLookups(payload);

        payload.candidates.forEach((candidate: TuyensinhCuExportCandidate, index: number): void => {
            this.addCandidateRow(worksheet, candidate, index + FIRST_DATA_ROW, lookups);
        });

        return workbook;
    }

    async export(payload: TuyensinhCuExportPayload): Promise<void> {
        const workbook = await this.buildWorkbook(payload);
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: MIME_XLSX });
        this.save(blob, this.createFilename(payload.council.name, payload.filenameSuffix));
    }

    async exportExcel(payload: TuyensinhCuExportPayload): Promise<void> {
        await this.export(payload);
    }

    private createLookups(payload: TuyensinhCuExportPayload): ExportLookups {
        const majors = new Map<string, string>();
        payload.majors?.forEach((major: Pick<Nganhhoc, 'id' | 'ma_nganh' | 'ten_nganh'>): void => {
            const key = this.text(major.ten_nganh);
            if (key.length > 0) {
                majors.set(key, this.text(major.ma_nganh));
            }
        });
        const regions = new Map<number, string>(
            payload.regions?.map(item => [item.id, this.text(item.name)]) ?? [],
        );
        const provinces = new Map<number, string>(
            payload.provinces?.map(item => [item.id, this.text(item.name)]) ?? [],
        );
        const users = new Map<number, string>(
            payload.users?.map(item => [item.id, this.text(item.display_name)]) ?? [],
        );
        return { majors, regions, provinces, users };
    }

    private lookupName(map: ReadonlyMap<number, string>, id: number | undefined): string {
        return id == null ? '' : map.get(id) ?? '';
    }

    private configureWorksheet(worksheet: Worksheet, candidateCount: number): void {
        worksheet.columns = COLUMN_WIDTHS.map((width: number): { width: number } => ({ width }));
        worksheet.views = [{
            state: 'frozen',
            xSplit: 4,
            ySplit: 1,
            topLeftCell: 'E2',
            zoomScale: 85,
            zoomScaleNormal: 85,
        }];
        worksheet.autoFilter = `A1:AQ${Math.max(FIRST_DATA_ROW, candidateCount + 1)}`;
        worksheet.properties.defaultRowHeight = 20;
        worksheet.getRow(HEADER_ROW).height = 31.5;
        worksheet.pageSetup = {
            orientation: 'landscape',
            fitToPage: false,
            margins: {
                left: 0.7,
                right: 0.7,
                top: 0.75,
                bottom: 0.75,
                header: 0.3,
                footer: 0.3,
            },
        };
    }

    private addHeaderRow(worksheet: Worksheet): void {
        const row = worksheet.getRow(HEADER_ROW);
        row.values = [...HEADERS];
        for (let column = 1; column <= COLUMN_COUNT; column += 1) {
            const cell = row.getCell(column);
            cell.font = { ...BASE_FONT, bold: true };
            cell.alignment = CENTER_ALIGNMENT;
            cell.border = DATA_BORDER;
        }
    }

    private addCandidateRow(
        worksheet: Worksheet,
        candidate: TuyensinhCuExportCandidate,
        rowNumber: number,
        lookups: ExportLookups,
    ): void {
        const row = worksheet.getRow(rowNumber);
        row.values = this.candidateValues(candidate, lookups);
        row.height = 47.25;

        for (let column = 1; column <= COLUMN_COUNT; column += 1) {
            const cell = row.getCell(column);
            cell.font = BASE_FONT;
            cell.border = DATA_BORDER;
            cell.alignment = this.alignmentForColumn(column);
        }

        row.getCell(1).value = {
            formula: `SUBTOTAL(3,$B$2:B${rowNumber})`,
        };
    }

    private candidateValues(
        candidate: TuyensinhCuExportCandidate,
        lookups: ExportLookups,
    ): Array<string | number | null> {
        const fullName = this.normalizeName(candidate.fullName);
        const [familyName, givenName] = this.splitName(fullName);
        const registeredMajorName = this.text(candidate.registeredMajorName);
        const registeredMajorCode = lookups.majors.get(registeredMajorName)
            ?? this.text(candidate.registeredMajorCode);

        return [
            null,
            this.text(candidate.roundName),
            '',
            this.text(candidate.cccd),
            this.formatDate(candidate.cccdDate),
            fullName,
            familyName,
            givenName,
            this.formatDate(candidate.birthDate),
            this.formatGender(candidate.gender),
            this.text(candidate.ethnicity),
            this.text(candidate.birthPlace),
            this.text(candidate.phone),
            '',
            this.text(candidate.email),
            this.lookupName(lookups.regions, candidate.provinceId),
            this.lookupName(lookups.provinces, candidate.wardId),
            this.text(candidate.address),
            '',
            '',
            '',
            '',
            '',
            registeredMajorCode,
            registeredMajorName,
            this.numberOrEmpty(candidate.admissionScore),
            '',
            '',
            this.numberOrEmpty(candidate.calculatedAdmissionScore),
            this.text(candidate.highSchoolDiplomaCode),
            this.text(candidate.highSchoolDiplomaPlace),
            '',
            '',
            this.text(candidate.qualificationName),
            this.text(candidate.qualificationCode),
            this.text(candidate.graduationMajor),
            this.text(candidate.graduationInstitution),
            this.text(candidate.graduationYear),
            this.text(candidate.recipientAddress),
            this.lookupName(lookups.users, candidate.createdById),
            this.lookupName(lookups.users, candidate.ownerById),
            this.lookupName(lookups.users, candidate.consultantId),
            this.text(candidate.note),
        ];
    }

    private normalizeName(value: string | undefined): string {
        return this.text(value).replace(/\s+/g, ' ');
    }

    private splitName(fullName: string): [string, string] {
        const parts = fullName.split(' ').filter(Boolean);
        if (parts.length <= 1) return ['', parts[0] ?? ''];
        return [parts.slice(0, -1).join(' '), parts.at(-1) ?? ''];
    }

    private alignmentForColumn(column: number): Partial<Alignment> {
        return {
            horizontal: CENTERED_COLUMNS.has(column) ? 'center' : 'left',
            vertical: 'middle',
            wrapText: true,
        };
    }

    private formatDate(value: string | undefined): string {
        if (!value) return '';
        const datePart = value.slice(0, 10);
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
        return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
    }

    private formatGender(value: string | undefined): string {
        const gender = this.text(value);
        const normalized = gender.toLowerCase();
        if (normalized === 'nam') return 'Nam';
        if (normalized === 'nu') return 'Nữ';
        return gender;
    }

    private text(value: string | number | null | undefined): string {
        if (value === undefined || value === null) return '';
        return String(value).trim();
    }

    private numberOrEmpty(value: number | undefined): number | '' {
        return value === undefined || value === null ? '' : value;
    }

    private createFilename(councilName: string, filenameSuffix?: string): string {
        const safeCouncilName = this.safeFilenamePart(councilName) || 'hoi-dong';
        const safeSuffix = this.safeFilenamePart(filenameSuffix);
        const suffix = safeSuffix ? `_${safeSuffix}` : '';
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
        return `du-lieu-nhap-hoc_${safeCouncilName}${suffix}_${timestamp}.xlsx`;
    }

    private safeFilenamePart(value: string | undefined): string {
        return this.text(value)
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase();
    }

    private validatePayload(payload: TuyensinhCuExportPayload): void {
        if (!payload?.council || !Array.isArray(payload.candidates)) {
            throw new Error('Dữ liệu xuất nhập học không hợp lệ.');
        }
    }
}
