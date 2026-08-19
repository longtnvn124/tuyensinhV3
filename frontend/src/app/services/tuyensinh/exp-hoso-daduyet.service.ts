import { inject, Injectable } from '@angular/core';
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

export interface CouncilAdmissionExportPayload {
    council: CouncilExportInfo;
    round: AdmissionRoundExportInfo;
    documents: AdmissionDocumentExportInfo;
    candidates: readonly CouncilExportCandidate[];
}

type SheetKey = 'admitted' | 'proposed' | 'result' | 'source';

interface SheetConfig {
    key: SheetKey;
    name: string;
    title: string;
    columnCount: 10 | 13;
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
    { key: 'proposed', name: 'DS đề nghị TT', title: 'DANH SÁCH ĐỀ NGHỊ CÔNG NHẬN TRÚNG TUYỂN', columnCount: 10 },
    { key: 'result', name: 'KQ xét tuyển', title: 'KẾT QUẢ XÉT TUYỂN', columnCount: 13 },
    { key: 'source', name: 'DL xét tuyển', title: 'DỮ LIỆU XÉT TUYỂN', columnCount: 13 },
];

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
        this.configureWorksheet(worksheet, config.columnCount);
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

    private configureWorksheet(worksheet: Worksheet, columnCount: number): void {
        const widths = [7, 27, 11, 14, 20, 13, 18, 27, 25, 11, 14, 16, 31];
        worksheet.columns = widths.slice(0, columnCount).map((width: number) => ({ width }));
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
        const leftEndColumn = config.columnCount === 10 ? 'E' : 'F';
        const rightStartColumn = config.columnCount === 10 ? 'F' : 'G';

        worksheet.mergeCells(`A1:${leftEndColumn}1`);
        worksheet.mergeCells(`${rightStartColumn}1:${lastColumn}1`);
        worksheet.getCell('A1').value = 'ĐẠI HỌC THÁI NGUYÊN';
        worksheet.getCell(`${rightStartColumn}1`).value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
        worksheet.mergeCells(`A2:${leftEndColumn}2`);
        worksheet.mergeCells(`${rightStartColumn}2:${lastColumn}2`);
        worksheet.getCell('A2').value = 'TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG';
        worksheet.getCell(`${rightStartColumn}2`).value = 'Độc lập - Tự do - Hạnh phúc';

        for (const address of ['A1', 'A2', `${rightStartColumn}1`, `${rightStartColumn}2`]) {
            worksheet.getCell(address).font = { ...BASE_FONT, bold: true };
            worksheet.getCell(address).alignment = CENTER_ALIGNMENT;
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
            const groupCandidates = major.candidates
                .filter((candidate: CouncilExportCandidate): boolean => candidate.qualificationGroup === qualification)
                .sort((left: CouncilExportCandidate, right: CouncilExportCandidate): number =>
                    left.fullName.localeCompare(right.fullName, 'vi'),
                );
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

        const headerRow = worksheet.addRow(this.headers(config.columnCount, qualification));
        this.styleHeaderRow(headerRow, config.columnCount);

        candidates.forEach((candidate: CouncilExportCandidate, index: number): void => {
            const row = worksheet.addRow(this.candidateValues(candidate, index + 1, config));
            this.styleDataRow(row, config.columnCount);
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
        const signatureStart = columnCount === 13 ? 'I' : 'G';
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

    private headers(columnCount: number, qualification: QualificationGroup): string[] {
        const headers = [
            'TT',
            'Họ và tên',
            'Giới tính',
            'Ngày sinh',
            'Nơi sinh',
            'Dân tộc',
            'Văn bằng',
            'Ngành/Nghề tốt nghiệp',
            'Nơi cấp bằng',
            'Năm TN',
        ];
        if (columnCount === 13) {
            headers.push(
                'Mã ngành',
                qualification === 'THPT'
                    ? 'Điểm xét tuyển (thang điểm 30)'
                    : 'Điểm xét tuyển (thang điểm 10)',
                'Ghi chú',
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
            candidate.qualificationName || this.qualificationLabel(candidate.qualificationGroup),
            candidate.graduationMajor,
            candidate.graduationInstitution,
            candidate.graduationYear,
        ];
        if (config.columnCount === 13) {
            values.push(
                candidate.registeredMajorCode,
                candidate.admissionScore ?? '',
                this.createCandidateNote(candidate, config.key),
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

    private styleDataRow(row: Row, columnCount: number): void {
        row.height = 32;
        for (let column = 1; column <= columnCount; column += 1) {
            const cell = row.getCell(column);
            cell.font = BASE_FONT;
            cell.border = DATA_BORDER;
            cell.alignment = {
                horizontal: [1, 3, 4, 6, 10, 11, 12].includes(column) ? 'center' : 'left',
                vertical: 'middle',
                wrapText: true,
            };
        }
        if (columnCount === 13) {
            row.getCell(12).numFmt = '0.0';
        }
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
        if (key === 'source') return [...candidates];
        if (key === 'result') {
            return candidates.filter((candidate: CouncilExportCandidate): boolean => candidate.result.trim().length > 0);
        }
        return candidates.filter((candidate: CouncilExportCandidate): boolean => candidate.result === ADMITTED_RESULT);
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
}
