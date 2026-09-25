import { inject, Injectable } from '@angular/core';
import { Locations } from '@models/location';
import { RegistrationStatus } from '@models/tuyensinh/registrations';
import { User } from '@models/user';
import { SAVER, Saver } from '@app/providers/saver.provider';
import ExcelJS, {
    Alignment,
    Border,
    Cell,
    Fill,
    Font,
    Row,
    Workbook,
    Worksheet,
} from 'exceljs';

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
    roundName?: string;
    fullName: string;
    gender: string;
    birthDate?: string;
    birthPlace: string;
    ethnicity: string;
    phone?: string;
    email?: string;
    cccd?: string;
    cccdDate?: string;
    provinceId?: number;
    wardId?: number;
    address?: string;
    qualificationGroup: QualificationGroup;
    qualificationName: string;
    highSchoolDiplomaCode?: string;
    highSchoolDiplomaPlace?: string;
    qualificationCode?: string;
    diplomaNumber?: string;
    graduationMajor: string;
    graduationInstitution: string;
    graduationYear: string;
    recipientAddress?: string;
    createdById?: number;
    ownerById?: number;
    consultantId?: number;
    registeredMajorId: number;
    registeredMajorName: string;
    registeredMajorCode: string;
    admissionScore?: number;
    priorityRegionScore?: number;
    priorityObjectScore?: number;
    calculatedAdmissionScore?: number;
    status?: RegistrationStatus;
    result: string;
    note?: string;
    graduationTHPT?:string;
}

export interface CouncilAdmissionExportPayload {
    council: CouncilExportInfo;
    round: AdmissionRoundExportInfo;
    documents: AdmissionDocumentExportInfo;
    regions?: readonly Pick<Locations, 'id' | 'name'>[];
    provinces?: readonly Pick<Locations, 'id' | 'name'>[];
    users?: readonly any[];
    candidates: readonly CouncilExportCandidate[];
}

interface SummaryLookups {
    regions: ReadonlyMap<number, string>;
    provinces: ReadonlyMap<number, string>;
    users: readonly any[];
}

type SheetKey = 'admitted' | 'proposed' | 'result' | 'source';

export interface SheetConfig {
    key: SheetKey;
    name: string;
    title: string;
    columnCount: 10 | 11 | 14;
}

interface MajorGroup {
    id: number;
    name: string;
    code: string;
    candidates: CouncilExportCandidate[];
}

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ADMITTED_RESULT = 'Trúng tuyển';
const NON_ADMITTED_RESULT = 'Không trúng tuyển';
const QUALIFICATION_ORDER: readonly QualificationGroup[] = ['DH', 'CD', 'TC', 'THPT'];
const SHEET_CONFIGS: readonly SheetConfig[] = [
    { key: 'admitted', name: 'DS TT', title: 'DANH SÁCH THÍ SINH TRÚNG TUYỂN', columnCount: 10 },
    { key: 'proposed', name: 'DS đề nghị TT', title: 'DANH SÁCH ĐỀ NGHỊ CÔNG NHẬN TRÚNG TUYỂN', columnCount: 11 },
    { key: 'result', name: 'KQ xét tuyển', title: 'KẾT QUẢ XÉT TUYỂN', columnCount: 14 },
    { key: 'source', name: 'DL xét tuyển', title: 'DỮ LIỆU XÉT TUYỂN', columnCount: 14 },
];
const SUMMARY_SHEET_NAME = 'Dữ liệu tổng hợp';
const SUMMARY_HEADERS: readonly string[] = [
    'TT', 'Đợt', 'Mã SV', 'CCCD', 'Ngày cấp', 'Họ tên gộp', 'Họ', 'Tên',
    'Ngày sinh', 'Giới tính', 'Dân tộc', 'Nơi sinh', 'Điện thoại', 'Email ictu',
    'Email', 'Tỉnh/Thành phố', 'Phường/Xã', 'Địa chỉ', 'Mã tỉnh lớp 12',
    'Mã trường lớp 12', 'Tên trường lớp 12', 'KV ưu tiên', 'ĐT ưu tiên',
    'Mã ngành\nĐKXT', 'Tên ngành\nĐKXT', 'Điểm xét tuyển gốc', 'Điểm ƯT KV',
    'Điểm ƯT ĐT', 'Điểm xét tuyển', 'Mã Bằng THPT', 'Nơi cấp bằng THPT',
    'Học lực lớp 12 ', 'Hạnh kiểm lớp 12', 'Bằng chuyên môn',
    'Mã Bằng chuyên môn', 'Ngành tốt nghiệp', 'Nơi cấp bằng chuyên môn',
    'Năm TN', 'Địa chỉ nhận giấy báo', 'CB tuyển sinh', 'TK nhập HS',
    'TK duyệt HS', 'Ghi chú',
];
const SUMMARY_COLUMN_WIDTHS: readonly number[] = [
    9.29, 17, 17.14, 15.43, 15.57, 26.57, 19.14, 10.29, 16.57, 15.71,
    14.43, 24.86, 17.29, 28.14, 29.29, 14.57, 16.71, 63.57, 21.71, 24.71,
    27.57, 23.29, 23.29, 16.71, 20.86, 25.14, 25.14, 25.14, 20.86, 22.14,
    22.14, 21.14, 25.29, 16.29, 26.86, 30.71, 33.43, 14.71, 93.29, 43.86,
    43.86, 23.71, 14.57,
];
const SUMMARY_CENTERED_COLUMNS = new Set<number>([
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
const HEADER_FILL: Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9EAF7' },
};
const CENTER_ALIGNMENT: Partial<Alignment> = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
};

@Injectable({
    providedIn: 'root',
})
export class ExpHosoDaduyetService {
    private readonly save = inject<Saver>(SAVER);

    async buildWorkbook(payload: CouncilAdmissionExportPayload): Promise<Workbook> {
        this.validatePayload(payload);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Hệ thống tuyển sinh';
        workbook.created = new Date();
        workbook.modified = new Date();

        for (const config of SHEET_CONFIGS) {
            const worksheet = workbook.addWorksheet(config.name);
            const candidates = this.filterCandidates(payload.candidates, config.key);
            this.buildSheet(worksheet, config, payload, candidates);
        }

        this.buildSummarySheet(workbook, payload);

        return workbook;
    }

    async export(payload: CouncilAdmissionExportPayload): Promise<void> {
        const workbook = await this.buildWorkbook(payload);
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: MIME_XLSX });
        this.save(blob, this.createFilename(payload.council.name));
    }

    async exportExcel(payload: CouncilAdmissionExportPayload): Promise<void> {
        await this.export(payload);
    }

    private buildSheet(
        worksheet: Worksheet,
        config: SheetConfig,
        payload: CouncilAdmissionExportPayload,
        candidates: readonly CouncilExportCandidate[],
    ): void {
        this.configureWorksheet(worksheet, config);
        this.addAdministrativeHeader(worksheet, config, payload);

        const majorGroups = this.groupByMajor(candidates);
        majorGroups.forEach((major: MajorGroup, majorIndex: number): void => {
            this.addMajorSection(worksheet, config, major, majorIndex + 1);
        });

        this.addGrandTotal(worksheet, config.columnCount, candidates.length);
        if (config.key === 'source') {
            this.addSignature(worksheet, config.columnCount, payload.documents);
        }

        worksheet.eachRow((row: Row): void => {
            row.eachCell({ includeEmpty: true }, (cell: Cell): void => {
                cell.font = { ...BASE_FONT, ...cell.font };
            });
        });
    }

    private configureWorksheet(worksheet: Worksheet, config: SheetConfig): void {
        const defaultWidths = [7, 27, 11, 14, 20, 13, 18, 27, 25, 11, 14, 16, 31, 22];
        const widths = config.key === 'proposed'
            ? [7, 27, 11, 14, 20, 13, 18, 18, 27, 25, 11]
            : defaultWidths.slice(0, config.columnCount);
        worksheet.columns = widths.map((width: number) => ({ width }));
        worksheet.pageSetup = {
            paperSize: 9,
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            horizontalCentered: true,
            margins: {
                left: 0.25,
                right: 0.25,
                top: 0.5,
                bottom: 0.5,
                header: 0.2,
                footer: 0.2,
            },
        };
        worksheet.properties.defaultRowHeight = 20;
    }

    private addAdministrativeHeader(
        worksheet: Worksheet,
        config: SheetConfig,
        payload: CouncilAdmissionExportPayload,
    ): void {
        const lastColumn = this.columnLetter(config.columnCount);
        const leftEndColumn = config.columnCount === 10 ? 'E' : (config.columnCount === 11 ? 'F' : 'G');
        const rightStartColumn = config.columnCount === 10 ? 'F' : (config.columnCount === 11 ? 'G' : 'H');

        worksheet.mergeCells(`A1:${leftEndColumn}1`);
        worksheet.mergeCells(`${rightStartColumn}1:${lastColumn}1`);
        worksheet.getCell('A1').value = 'ĐẠI HỌC THÁI NGUYÊN';
        worksheet.getCell(`${rightStartColumn}1`).value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
        worksheet.mergeCells(`A2:${leftEndColumn}2`);
        worksheet.mergeCells(`${rightStartColumn}2:${lastColumn}2`);
        worksheet.getCell('A2').value = config.key === 'result'
            ? 'TRƯỜNG ĐẠI HỌC CÔNG NGHỆ'
            : 'TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG';
        worksheet.getCell(`${rightStartColumn}2`).value = 'Độc lập - Tự do - Hạnh phúc';

        for (const address of ['A1', 'A2', `${rightStartColumn}1`, `${rightStartColumn}2`]) {
            worksheet.getCell(address).font = { ...BASE_FONT, bold: true };
            worksheet.getCell(address).alignment = CENTER_ALIGNMENT;
        }

        if (config.key === 'result') {
            worksheet.mergeCells(`A3:${leftEndColumn}3`);
            worksheet.getCell('A3').value = 'THÔNG TIN VÀ TRUYỀN THÔNG';
            worksheet.getCell('A3').font = { ...BASE_FONT, bold: true, underline: true };
            worksheet.getCell('A3').alignment = CENTER_ALIGNMENT;
        }

        worksheet.mergeCells(`A4:${lastColumn}4`);
        worksheet.getCell('A4').value = config.title;
        worksheet.getCell('A4').font = { ...BASE_FONT, size: 14, bold: true };
        worksheet.getCell('A4').alignment = CENTER_ALIGNMENT;
        worksheet.getRow(4).height = 25;

        worksheet.mergeCells(`A5:${lastColumn}5`);
        worksheet.getCell('A5').value = `Hội đồng: ${payload.council.name}`;
        worksheet.getCell('A5').font = { ...BASE_FONT, bold: true };
        worksheet.getCell('A5').alignment = CENTER_ALIGNMENT;

        worksheet.mergeCells(`A6:${lastColumn}6`);
        worksheet.getCell('A6').value = this.createRoundDescription(payload.round);
        worksheet.getCell('A6').alignment = CENTER_ALIGNMENT;

        const documentDescription = this.createDocumentDescription(config.key, payload.documents);
        if (documentDescription) {
            worksheet.mergeCells(`A7:${lastColumn}7`);
            worksheet.getCell('A7').value = documentDescription;
            worksheet.getCell('A7').font = { ...BASE_FONT, italic: true };
            worksheet.getCell('A7').alignment = CENTER_ALIGNMENT;
        }

        worksheet.addRow([]);
    }

    private addMajorSection(
        worksheet: Worksheet,
        config: SheetConfig,
        major: MajorGroup,
        majorNumber: number,
    ): void {
        const lastColumn = this.columnLetter(config.columnCount);
        const majorRow = worksheet.addRow([]);
        worksheet.mergeCells(`A${majorRow.number}:${lastColumn}${majorRow.number}`);
        majorRow.getCell(1).value = `${this.toRoman(majorNumber)}. ${major.name} (${major.code})`;
        majorRow.getCell(1).font = { ...BASE_FONT, bold: true, size: 12 };
        majorRow.getCell(1).alignment = { vertical: 'middle', wrapText: true };
        majorRow.height = 23;

        let qualificationNumber = 1;
        for (const qualification of QUALIFICATION_ORDER) {
            const candidatesInGroup = major.candidates.filter(
                (candidate: CouncilExportCandidate): boolean => candidate.qualificationGroup === qualification,
            );
            const shouldSortByName =
                config.key === 'admitted' ||
                config.key === 'proposed' ||
                config.key === 'result';
            const groupCandidates = shouldSortByName
                ? [...candidatesInGroup].sort(
                    (left: CouncilExportCandidate, right: CouncilExportCandidate): number =>
                        this.compareCandidateByName(left, right),
                )
                : candidatesInGroup;
            if (!groupCandidates.length) continue;

            this.addQualificationSection(
                worksheet,
                config,
                qualification,
                qualificationNumber,
                groupCandidates,
            );
            qualificationNumber += 1;
        }

        const totalRow = worksheet.addRow([]);
        worksheet.mergeCells(`A${totalRow.number}:${lastColumn}${totalRow.number}`);
        totalRow.getCell(1).value = `Tổng số thí sinh: ${major.candidates.length} thí sinh`;
        this.styleTotalRow(totalRow, config.columnCount);
        totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    }

    private addQualificationSection(
        worksheet: Worksheet,
        config: SheetConfig,
        qualification: QualificationGroup,
        qualificationNumber: number,
        candidates: readonly CouncilExportCandidate[],
    ): void {
        const lastColumn = this.columnLetter(config.columnCount);
        const sectionRow = worksheet.addRow([]);
        worksheet.mergeCells(`A${sectionRow.number}:${lastColumn}${sectionRow.number}`);
        sectionRow.getCell(1).value = `${qualificationNumber}. ${this.qualificationSectionTitle(qualification)} (Mã phương thức xét tuyển ${this.admissionMethod(qualification)})`;
        sectionRow.getCell(1).font = { ...BASE_FONT, bold: true, italic: true };
        sectionRow.getCell(1).alignment = { vertical: 'middle', wrapText: true };
        sectionRow.height = 22;

        const headerRow = worksheet.addRow(this.headers(config, qualification));
        this.styleHeaderRow(headerRow, config.columnCount);

        candidates.forEach((candidate: CouncilExportCandidate, index: number): void => {
            const row = worksheet.addRow(this.candidateValues(candidate, index + 1, config));
            this.styleDataRow(row, config);
        });
    }

    private addGrandTotal(worksheet: Worksheet, columnCount: number, total: number): void {
        const lastColumn = this.columnLetter(columnCount);
        const fixedRow = worksheet.addRow([]);
        worksheet.mergeCells(`A${fixedRow.number}:${lastColumn}${fixedRow.number}`);
        fixedRow.getCell(1).value = `Ấn định danh sách đủ điều kiện xét tuyển: ${total} thí sinh`;
        this.styleTotalRow(fixedRow, columnCount);
        fixedRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    }

    private addSignature(
        worksheet: Worksheet,
        columnCount: number,
        documents: AdmissionDocumentExportInfo,
    ): void {
        worksheet.addRow([]);
        const lastColumn = this.columnLetter(columnCount);
        const signatureStart = columnCount === 14 ? 'J' : 'G';
        const signatureColumn = this.columnNumber(signatureStart);
        const dateRow = worksheet.addRow([]);
        worksheet.mergeCells(`${signatureStart}${dateRow.number}:${lastColumn}${dateRow.number}`);
        dateRow.getCell(signatureColumn).value = `Thái Nguyên, ${this.formatAdministrativeDate(documents.preparedDate)}`;
        dateRow.getCell(signatureColumn).alignment = CENTER_ALIGNMENT;
        dateRow.getCell(signatureColumn).font = { ...BASE_FONT, italic: true };

        const titleRow = worksheet.addRow([]);
        worksheet.mergeCells(`${signatureStart}${titleRow.number}:${lastColumn}${titleRow.number}`);
        titleRow.getCell(signatureColumn).value = 'NGƯỜI LẬP DANH SÁCH';
        titleRow.getCell(signatureColumn).alignment = CENTER_ALIGNMENT;
        titleRow.getCell(signatureColumn).font = { ...BASE_FONT, bold: true };

        worksheet.addRow([]);
        worksheet.addRow([]);
        const nameRow = worksheet.addRow([]);
        worksheet.mergeCells(`${signatureStart}${nameRow.number}:${lastColumn}${nameRow.number}`);
        nameRow.getCell(signatureColumn).value = documents.preparedBy ?? '';
        nameRow.getCell(signatureColumn).alignment = CENTER_ALIGNMENT;
        nameRow.getCell(signatureColumn).font = { ...BASE_FONT, bold: true };
    }

    private headers(config: SheetConfig, qualification: QualificationGroup): string[] {
        const headers = [
            'TT',
            'Họ và tên',
            'Giới tính',
            'Ngày sinh',
            'Nơi sinh',
            'Dân tộc',
            ...(config.key === 'proposed' ? ['Mã số bằng'] : []),
            'Văn bằng',
            'Ngành/Nghề tốt nghiệp',
            'Nơi cấp bằng',
            'Năm TN',
        ];
        if (config.columnCount === 14) {
            headers.push(
                'Mã ngành',
                qualification === 'THPT'
                    ? 'Điểm xét tuyển (thang điểm 30)'
                    : 'Điểm xét tuyển (thang điểm 10)',
                'Ghi chú',
                'Điểm xét tuyển sau công thức',
            );
        }
        return headers;
    }

    private candidateValues(
        candidate: CouncilExportCandidate,
        order: number,
        config: SheetConfig,
    ): Array<string | number> {
        const values: Array<string | number> = [
            order,
            candidate.fullName.trim(),
            candidate.gender,
            this.formatDate(candidate.birthDate),
            candidate.birthPlace,
            candidate.ethnicity,
            ...(config.key === 'proposed' ? [this.text(candidate.diplomaNumber)] : []),
            candidate.qualificationName || this.qualificationLabel(candidate.qualificationGroup),
            candidate.graduationMajor,
            candidate.qualificationGroup == 'THPT' ? candidate.graduationTHPT : candidate.graduationInstitution,
            candidate.graduationYear,
        ];
        if (config.columnCount === 14) {
            values.push(
                candidate.registeredMajorCode,
                this.formatScore(candidate.admissionScore),
                this.createCandidateNote(candidate, config.key),
                this.formatScore(candidate.calculatedAdmissionScore),
            );
        }
        return values;
    }

    private styleHeaderRow(row: Row, columnCount: number): void {
        row.height = 42;
        for (let column = 1; column <= columnCount; column += 1) {
            const cell = row.getCell(column);
            cell.font = { ...BASE_FONT, bold: true };
            cell.alignment = CENTER_ALIGNMENT;
            cell.border = DATA_BORDER;
            cell.fill = HEADER_FILL;
        }
    }

    private styleDataRow(row: Row, config: SheetConfig): void {
        row.height = 32;
        const centerColumns = config.key === 'proposed'
            ? [1, 3, 4, 6, 7, 11]
            : [1, 3, 4, 6, 10, 11, 12, 14];
        for (let column = 1; column <= config.columnCount; column += 1) {
            const cell = row.getCell(column);
            cell.font = BASE_FONT;
            cell.border = DATA_BORDER;
            cell.alignment = {
                horizontal: centerColumns.includes(column) ? 'center' : 'left',
                vertical: 'middle',
                wrapText: true,
            };
        }
    }

    private formatScore(score?: number | string): string {
        if (score === undefined || score === null || score === '') {
            return '';
        }
        const num = Number(score);
        if (Number.isNaN(num)) {
            return '';
        }
        return num.toFixed(2).replace('.', ',');
    }

    private styleTotalRow(row: Row, columnCount: number): void {
        row.height = 24;
        for (let column = 1; column <= columnCount; column += 1) {
            const cell = row.getCell(column);
            cell.font = { ...BASE_FONT, bold: true };
            cell.border = DATA_BORDER;
            cell.alignment = CENTER_ALIGNMENT;
        }
    }

    private filterCandidates(
        candidates: readonly CouncilExportCandidate[],
        key: SheetKey,
    ): CouncilExportCandidate[] {
        if (key === 'source' || key === 'proposed') return [...candidates];
        if (key === 'result') {
            return candidates.filter((candidate: CouncilExportCandidate): boolean =>
                candidate.status !== undefined,
            );
        }
        return candidates.filter((candidate: CouncilExportCandidate): boolean => candidate.status === 3);
    }

    private groupByMajor(candidates: readonly CouncilExportCandidate[]): MajorGroup[] {
        const groups = new Map<number, MajorGroup>();
        for (const candidate of candidates) {
            const existing = groups.get(candidate.registeredMajorId);
            if (existing) {
                existing.candidates.push(candidate);
                continue;
            }
            groups.set(candidate.registeredMajorId, {
                id: candidate.registeredMajorId,
                name: candidate.registeredMajorName,
                code: candidate.registeredMajorCode,
                candidates: [candidate],
            });
        }

        return [...groups.values()].sort((left: MajorGroup, right: MajorGroup): number => {
            const codeComparison = left.code.localeCompare(right.code, 'vi');
            return codeComparison || left.name.localeCompare(right.name, 'vi') || left.id - right.id;
        });
    }

    private compareCandidateByName(
        left: CouncilExportCandidate,
        right: CouncilExportCandidate,
    ): number {
        const leftFullName = this.normalizeSummaryName(left.fullName);
        const rightFullName = this.normalizeSummaryName(right.fullName);
        const [leftFamily, leftGiven] = this.splitSummaryName(leftFullName);
        const [rightFamily, rightGiven] = this.splitSummaryName(rightFullName);

        const givenComparison = leftGiven.localeCompare(rightGiven, 'vi');
        if (givenComparison !== 0) {
            return givenComparison;
        }

        const familyComparison = leftFamily.localeCompare(rightFamily, 'vi');
        if (familyComparison !== 0) {
            return familyComparison;
        }

        return left.id - right.id;
    }

    private createRoundDescription(round: AdmissionRoundExportInfo): string {
        const period = [this.formatDate(round.startDate), this.formatDate(round.endDate)]
            .filter((value: string): boolean => value.length > 0)
            .join(' - ');
        return period ? `Đợt xét tuyển: ${round.name} (${period})` : `Đợt xét tuyển: ${round.name}`;
    }

    private createDocumentDescription(
        key: SheetKey,
        documents: AdmissionDocumentExportInfo,
    ): string {
        if (key === 'admitted' && (documents.decisionNumber || documents.decisionDate)) {
            return this.documentText('Quyết định', documents.decisionNumber, documents.decisionDate);
        }
        if (key === 'proposed' && (documents.proposalNumber || documents.proposalDate)) {
            return this.documentText('Công văn đề nghị', documents.proposalNumber, documents.proposalDate);
        }
        if (key === 'result' && documents.meetingDate) {
            return `Theo biên bản họp hội đồng ${this.formatAdministrativeDate(documents.meetingDate)}`;
        }
        return '';
    }

    private documentText(label: string, number: string | undefined, date: string | undefined): string {
        const numberText = number ? ` số ${number}` : '';
        const dateText = date ? ` ${this.formatAdministrativeDate(date)}` : '';
        return `Theo ${label}${numberText}${dateText}`;
    }

    private createCandidateNote(candidate: CouncilExportCandidate, key: SheetKey): string {
        if (key === 'result') return 'Đủ điều kiện xét tuyển';
        if (candidate.note?.trim()) return candidate.note.trim();
        if (key === 'source') return 'Đủ điều kiện xét tuyển';
        if (candidate.result === ADMITTED_RESULT) return 'Đủ điều kiện trúng tuyển';
        if (candidate.result === NON_ADMITTED_RESULT) return 'Không đủ điều kiện trúng tuyển';
        return candidate.result;
    }

    private formatAdministrativeDate(value: string | undefined): string {
        if (!value) return 'ngày ..... tháng ..... năm ........';
        const datePart = value.slice(0, 10);
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
        return match
            ? `ngày ${match[3]} tháng ${match[2]} năm ${match[1]}`
            : 'ngày ..... tháng ..... năm ........';
    }

    private formatDate(value: string | undefined): string {
        if (!value) return '';
        const datePart = value.slice(0, 10);
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
        return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
    }

    private qualificationLabel(group: QualificationGroup): string {
        const labels: Record<QualificationGroup, string> = {
            DH: 'Đại học',
            CD: 'Cao đẳng',
            TC: 'Trung cấp',
            THPT: 'THPT',
        };
        return labels[group];
    }

    private qualificationSectionTitle(group: QualificationGroup): string {
        const titles: Record<QualificationGroup, string> = {
            DH: 'THÍ SINH CÓ BẰNG ĐẠI HỌC',
            CD: 'THÍ SINH CÓ BẰNG CAO ĐẲNG',
            TC: 'THÍ SINH CÓ BẰNG TRUNG CẤP',
            THPT: 'THÍ SINH CÓ BẰNG THPT',
        };
        return titles[group];
    }

    private admissionMethod(group: QualificationGroup): '200' | '500' {
        return group === 'THPT' ? '200' : '500';
    }

    private createFilename(councilName: string): string {
        const safeCouncilName = councilName
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase() || 'hoi-dong';
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
        return `ket-qua-xet-tuyen_${safeCouncilName}_${timestamp}.xlsx`;
    }

    private toRoman(value: number): string {
        const numerals: ReadonlyArray<readonly [number, string]> = [
            [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
            [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
            [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
        ];
        let remainder = value;
        let result = '';
        for (const [number, numeral] of numerals) {
            while (remainder >= number) {
                result += numeral;
                remainder -= number;
            }
        }
        return result;
    }

    private columnLetter(column: number): string {
        return String.fromCharCode(64 + column);
    }

    private columnNumber(column: string): number {
        return column.charCodeAt(0) - 64;
    }

    private validatePayload(payload: CouncilAdmissionExportPayload): void {
        if (!payload?.council || !payload.round || !payload.documents || !Array.isArray(payload.candidates)) {
            throw new Error('Dữ liệu xuất hồ sơ xét tuyển không hợp lệ.');
        }
    }

    private buildSummarySheet(
        workbook: Workbook,
        payload: CouncilAdmissionExportPayload,
    ): void {
        const worksheet = workbook.addWorksheet(SUMMARY_SHEET_NAME);
        this.configureSummarySheet(worksheet, payload.candidates.length);
        this.addSummaryHeader(worksheet);
        const lookups = this.createSummaryLookups(payload);
        const roundName = payload.round?.name;
        payload.candidates.forEach((candidate: CouncilExportCandidate, index: number): void => {
            this.addSummaryCandidate(worksheet, candidate, index + 2, roundName, lookups);
        });
    }

    private createSummaryLookups(payload: CouncilAdmissionExportPayload): SummaryLookups {
        const regions = new Map<number, string>(
            payload.regions?.map(item => [item.id, this.text(item.name)]) ?? [],
        );
        const provinces = new Map<number, string>(
            payload.provinces?.map(item => [item.id, this.text(item.name)]) ?? [],
        );
        // const users = new Map<number, string>(
        //     payload.users?.map(item => [item.id, this.text(item.display_name)]) ?? [],
        // );
        return { regions, provinces, users: payload.users };
    }

    private lookupSummaryName(map: ReadonlyMap<number, string>, id: number | undefined): string {
        return id == null ? '' : map.get(id)  ?? '';
    }
    private lookupSummaryNameUser(data: readonly any[], id: number): string {

        const item = data.find(f => f.id == id);
        return item ? item['display_name'] : '';
    }
    private getNameUserMap(data: readonly any[], id: number): string {
        const item = data.find(f => f.id == id);
        return item ? item['display_name_format'] : '';
    }

    private configureSummarySheet(worksheet: Worksheet, candidateCount: number): void {
        worksheet.columns = SUMMARY_COLUMN_WIDTHS.map((width: number): { width: number } => ({ width }));
        worksheet.views = [{
            state: 'frozen',
            xSplit: 4,
            ySplit: 1,
            topLeftCell: 'E2',
            zoomScale: 85,
            zoomScaleNormal: 85,
        }];
        worksheet.autoFilter = `A1:AQ${Math.max(2, candidateCount + 1)}`;
        worksheet.properties.defaultRowHeight = 20;
        worksheet.getRow(1).height = 31.5;
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

    private addSummaryHeader(worksheet: Worksheet): void {
        const row = worksheet.getRow(1);
        row.values = [...SUMMARY_HEADERS];
        for (let column = 1; column <= SUMMARY_HEADERS.length; column += 1) {
            const cell = row.getCell(column);
            cell.font = { ...BASE_FONT, bold: true };
            cell.alignment = CENTER_ALIGNMENT;
            cell.border = DATA_BORDER;
        }
    }

    private addSummaryCandidate(
        worksheet: Worksheet,
        candidate: CouncilExportCandidate,
        rowNumber: number,
        roundName: string,
        lookups: SummaryLookups,
    ): void {
        const row = worksheet.getRow(rowNumber);
        row.values = this.summaryCandidateValues(candidate, roundName, lookups);
        row.height = 47.25;

        for (let column = 1; column <= SUMMARY_HEADERS.length; column += 1) {
            const cell = row.getCell(column);
            cell.font = BASE_FONT;
            cell.border = DATA_BORDER;
            cell.alignment = {
                horizontal: SUMMARY_CENTERED_COLUMNS.has(column) ? 'center' : 'left',
                vertical: 'middle',
                wrapText: true,
            };
        }

        row.getCell(1).value = { formula: `SUBTOTAL(3,$B$2:B${rowNumber})` };
    }

    private summaryCandidateValues(candidate: CouncilExportCandidate, roundName: string, lookups: SummaryLookups): Array<string | number | null> {
        const fullName = this.normalizeSummaryName(candidate.fullName);
        const [familyName, givenName] = this.splitSummaryName(fullName);
        const birthDate = this.formatSummaryDate(candidate.birthDate);

        return [
            null,
            this.text(roundName),
            '',
            this.text(candidate.cccd),
            this.formatDate(candidate.cccdDate),
            fullName,
            familyName,
            givenName,
            birthDate,
            candidate.gender,
            candidate.ethnicity,
            candidate.birthPlace,
            this.text(candidate.phone),
            '',
            this.text(candidate.email),
            this.lookupSummaryName(lookups.regions, candidate.provinceId),
            this.lookupSummaryName(lookups.provinces, candidate.wardId),
            this.text(candidate.address),
            '',
            '',
            '',
            '',
            '',
            candidate.registeredMajorCode,
            candidate.registeredMajorName,
            this.formatScore(candidate.admissionScore),
            this.formatScore(candidate.priorityRegionScore),
            this.formatScore(candidate.priorityObjectScore),
            this.formatScore(candidate.calculatedAdmissionScore),
            this.text(candidate.highSchoolDiplomaCode),
            this.text(candidate.highSchoolDiplomaPlace),
            '',
            '',
            candidate.qualificationName,
            this.text(candidate.qualificationCode),
            candidate.graduationMajor,
            candidate.graduationInstitution,
            candidate.graduationYear,
            this.text(candidate.recipientAddress),
            this.lookupSummaryNameUser(lookups.users, candidate.createdById),
            // this.lookupSummaryName(lookups.users, candidate.ownerById),
            this.getNameUserMap(lookups.users, candidate.ownerById),
            this.lookupSummaryNameUser(lookups.users, candidate.consultantId),
            candidate.note?.trim() || '',
        ];
    }

    private normalizeSummaryName(value: string | undefined): string {
        return this.text(value).replace(/\s+/g, ' ');
    }

    private splitSummaryName(fullName: string): [string, string] {
        const parts = fullName.split(' ').filter(Boolean);
        if (parts.length <= 1) {
            return ['', parts[0] ?? ''];
        }
        return [parts.slice(0, -1).join(' '), parts.at(-1) ?? ''];
    }

    private formatSummaryDate(value: string | undefined): string {
        if (!value) return '';
        const datePart = value.slice(0, 10);
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
        return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
    }

    private text(value: string | number | null | undefined): string {
        if (value === undefined || value === null) return '';
        return String(value).trim();
    }
}
