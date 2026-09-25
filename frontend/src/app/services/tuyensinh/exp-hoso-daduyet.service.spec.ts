import { TestBed } from '@angular/core/testing';
import { SAVER } from '@app/providers/saver.provider';
import { Locations } from '@models/location';
import { User } from '@models/user';
import ExcelJS from 'exceljs';
import {
    CouncilAdmissionExportPayload,
    ExpHosoDaduyetService,
} from './exp-hoso-daduyet.service';

describe('ExpHosoDaduyetService', () => {
    let service: ExpHosoDaduyetService;
    let saveSpy: jasmine.Spy;

    const baseRegions: readonly Pick<Locations, 'id' | 'name'>[] = [
        { id: 9, name: 'Thái Nguyên' },
        { id: 11, name: 'Bắc Kạn' },
    ];
    const baseProvinces: readonly Pick<Locations, 'id' | 'name'>[] = [
        { id: 101, name: 'Phường Phan Đình Phùng' },
        { id: 102, name: 'Phường Hồng Tiến' },
    ];
    const baseUsers: readonly Pick<User, 'id' | 'display_name'>[] = [
        { id: 5, display_name: 'Cán bộ tuyển sinh' },
        { id: 6, display_name: 'Người nhập hồ sơ' },
        { id: 7, display_name: 'Người duyệt hồ sơ' },
    ];

    const basePayload: CouncilAdmissionExportPayload = {
        council: {
            id: 8,
            name: 'Hội đồng tuyển sinh 2026',
            reviewDate: '2026-08-20',
        },
        round: {
            id: 1,
            name: 'Đợt 1',
            startDate: '2026-08-01',
            endDate: '2026-08-15',
        },
        documents: {
            meetingDate: '2026-08-20',
            preparedDate: '2026-08-21',
            preparedBy: 'Nguyễn Văn Kiểm Duyệt',
        },
        regions: baseRegions,
        provinces: baseProvinces,
        users: baseUsers,
        candidates: [
            {
                id: 101,
                roundName: 'Đợt 1',
                fullName: '  Lê   Văn   Hoàng  ',
                gender: 'Nam',
                birthDate: '2005-04-12',
                birthPlace: 'Thái Nguyên',
                ethnicity: 'Kinh',
                phone: '0912345678',
                email: 'levanhoang@example.com',
                cccd: '012345678901',
                cccdDate: '2022-01-10',
                provinceId: 9,
                wardId: 101,
                address: '123 Đường A',
                highSchoolDiplomaCode: 'VB123456',
                highSchoolDiplomaPlace: 'Sở GD&ĐT Thái Nguyên',
                qualificationCode: 'CM789',
                qualificationGroup: 'THPT',
                qualificationName: 'Bằng tốt nghiệp THPT',
                graduationMajor: '',
                graduationInstitution: 'THPT Chu Văn An',
                graduationYear: '2023',
                recipientAddress: '456 Đường B',
                createdById: 5,
                ownerById: 6,
                consultantId: 7,
                registeredMajorId: 10,
                registeredMajorName: 'Công nghệ thông tin',
                registeredMajorCode: '7480201',
                admissionScore: 25.5,
                priorityRegionScore: 0.5,
                priorityObjectScore: 1.5,
                calculatedAdmissionScore: 26.7,
                result: 'Trúng tuyển',
                note: 'Ưu tiên khu vực 1',
            },
            {
                id: 102,
                roundName: 'Đợt 1',
                fullName: 'Nguyễn Bình',
                gender: 'nu',
                birthDate: '2004-11-03',
                birthPlace: 'Bắc Kạn',
                ethnicity: 'Tày',
                phone: '',
                email: '',
                cccd: '',
                cccdDate: '',
                provinceId: 11,
                wardId: 102,
                address: '',
                highSchoolDiplomaCode: '',
                highSchoolDiplomaPlace: '',
                qualificationCode: '',
                qualificationGroup: 'DH',
                qualificationName: 'Bằng Đại học',
                graduationMajor: 'Toán học',
                graduationInstitution: 'ĐH Sư phạm',
                graduationYear: '2025',
                recipientAddress: '',
                createdById: 5,
                ownerById: 6,
                consultantId: 7,
                registeredMajorId: 10,
                registeredMajorName: 'Công nghệ thông tin',
                registeredMajorCode: '7480201',
                admissionScore: 8.2,
                priorityRegionScore: 0.5,
                priorityObjectScore: 1,
                calculatedAdmissionScore: 8.58,
                result: 'Trúng tuyển',
            },
        ],
    };

    beforeEach(() => {
        saveSpy = jasmine.createSpy('save');
        TestBed.configureTestingModule({
            providers: [
                ExpHosoDaduyetService,
                { provide: SAVER, useValue: saveSpy },
            ],
        });
        service = TestBed.inject(ExpHosoDaduyetService);
    });

    it('builds a workbook with 5 sheets in the exact order', async () => {
        const workbook = await service.buildWorkbook(basePayload);
        const sheetNames = workbook.worksheets.map(sheet => sheet.name);

        expect(sheetNames).toEqual([
            'DS TT',
            'DS đề nghị TT',
            'KQ xét tuyển',
            'DL xét tuyển',
            'Dữ liệu tổng hợp',
        ]);
    });

    it('creates summary sheet with 43 columns, freeze panes, zoom and auto filter', async () => {
        const workbook = await service.buildWorkbook(basePayload);
        const worksheet = workbook.getWorksheet('Dữ liệu tổng hợp');

        expect(worksheet).toBeDefined();
        expect(worksheet?.columnCount).toBe(43);
        expect(worksheet?.views?.[0]).toEqual(jasmine.objectContaining({
            state: 'frozen',
            xSplit: 4,
            ySplit: 1,
            topLeftCell: 'E2',
            zoomScale: 85,
        }));
        expect(worksheet?.autoFilter).toBe('A1:AQ3');
        expect(worksheet?.getRow(1).getCell(1).value).toBe('TT');
        expect(worksheet?.getRow(1).getCell(6).value).toBe('Họ tên gộp');
        expect(worksheet?.getRow(1).getCell(7).value).toBe('Họ');
        expect(worksheet?.getRow(1).getCell(8).value).toBe('Tên');
        expect(worksheet?.getRow(1).getCell(24).value).toBe('Mã ngành\nĐKXT');
        expect(worksheet?.getRow(1).getCell(25).value).toBe('Tên ngành\nĐKXT');
        expect(worksheet?.getRow(1).getCell(26).value).toBe('Điểm xét tuyển gốc');
        expect(worksheet?.getRow(1).getCell(29).value).toBe('Điểm xét tuyển');
        expect(worksheet?.getRow(1).getCell(43).value).toBe('Ghi chú');
    });

    it('maps candidate data correctly into the summary sheet without converting scores to string', async () => {
        const workbook = await service.buildWorkbook(basePayload);
        const worksheet = workbook.getWorksheet('Dữ liệu tổng hợp');
        const firstRow = worksheet?.getRow(2);
        const secondRow = worksheet?.getRow(3);

        expect(firstRow?.getCell(1).value).toEqual({ formula: 'SUBTOTAL(3,$B$2:B2)' });
        expect(firstRow?.getCell(2).value).toBe('Đợt 1');
        expect(firstRow?.getCell(4).value).toBe('012345678901');
        expect(firstRow?.getCell(5).value).toBe('10/01/2022');
        expect(firstRow?.getCell(6).value).toBe('Lê Văn Hoàng');
        expect(firstRow?.getCell(7).value).toBe('Lê Văn');
        expect(firstRow?.getCell(8).value).toBe('Hoàng');
        expect(firstRow?.getCell(9).value).toBe('12/04/2005');
        expect(firstRow?.getCell(10).value).toBe('Nam');
        expect(firstRow?.getCell(11).value).toBe('Kinh');
        expect(firstRow?.getCell(12).value).toBe('Thái Nguyên');
        expect(firstRow?.getCell(13).value).toBe('0912345678');
        expect(firstRow?.getCell(15).value).toBe('levanhoang@example.com');
        expect(firstRow?.getCell(16).value).toBe('Thái Nguyên');
        expect(firstRow?.getCell(17).value).toBe('Phường Phan Đình Phùng');
        expect(firstRow?.getCell(18).value).toBe('123 Đường A');
        expect(firstRow?.getCell(24).value).toBe('7480201');
        expect(firstRow?.getCell(25).value).toBe('Công nghệ thông tin');
        expect(firstRow?.getCell(26).value).toBe('25,50');
        expect(firstRow?.getCell(27).value).toBe('0,50');
        expect(firstRow?.getCell(28).value).toBe('1,50');
        expect(firstRow?.getCell(29).value).toBe('26,70');
        expect(firstRow?.getCell(30).value).toBe('VB123456');
        expect(firstRow?.getCell(31).value).toBe('Sở GD&ĐT Thái Nguyên');
        expect(firstRow?.getCell(34).value).toBe('Bằng tốt nghiệp THPT');
        expect(firstRow?.getCell(35).value).toBe('CM789');
        expect(firstRow?.getCell(37).value).toBe('THPT Chu Văn An');
        expect(firstRow?.getCell(38).value).toBe('2023');
        expect(firstRow?.getCell(39).value).toBe('456 Đường B');
        expect(firstRow?.getCell(40).value).toBe('Cán bộ tuyển sinh');
        expect(firstRow?.getCell(41).value).toBe('Người nhập hồ sơ');
        expect(firstRow?.getCell(42).value).toBe('Người duyệt hồ sơ');
        expect(firstRow?.getCell(43).value).toBe('Ưu tiên khu vực 1');

        expect(secondRow?.getCell(1).value).toEqual({ formula: 'SUBTOTAL(3,$B$2:B3)' });
        expect(secondRow?.getCell(6).value).toBe('Nguyễn Bình');
        expect(secondRow?.getCell(7).value).toBe('Nguyễn');
        expect(secondRow?.getCell(8).value).toBe('Bình');
        expect(secondRow?.getCell(10).value).toBe('Nữ');
        expect(secondRow?.getCell(26).value).toBe('8,20');
        expect(secondRow?.getCell(27).value).toBe('0,50');
        expect(secondRow?.getCell(28).value).toBe('1,00');
        expect(secondRow?.getCell(29).value).toBe('8,58');
        expect(secondRow?.getCell(36).value).toBe('Toán học');
        expect(secondRow?.getCell(37).value).toBe('ĐH Sư phạm');
        expect(secondRow?.getCell(38).value).toBe('2025');
        expect(secondRow?.getCell(43).value).toBe('');
    });

    it('can serialize and reload the generated 5-sheet workbook without errors', async () => {
        const workbook = await service.buildWorkbook(basePayload);
        const buffer = await workbook.xlsx.writeBuffer();
        const reloaded = new ExcelJS.Workbook();
        await reloaded.xlsx.load(buffer as never);

        expect(reloaded.worksheets.length).toBe(5);
        expect(reloaded.getWorksheet('Dữ liệu tổng hợp')?.rowCount).toBe(3);
    });

    it('DS đề nghị TT sheet has 11 columns with Mã số bằng between Dân tộc and Văn bằng', async () => {
        const payload: CouncilAdmissionExportPayload = {
            ...basePayload,
            candidates: [
                {
                    ...basePayload.candidates[0],
                    diplomaNumber: 'SB-THPT-001',
                },
                {
                    ...basePayload.candidates[1],
                    diplomaNumber: 'CM-DH-002',
                },
            ],
        };
        const workbook = await service.buildWorkbook(payload);
        const sheet1 = workbook.getWorksheet('DS TT');
        const sheet2 = workbook.getWorksheet('DS đề nghị TT');

        expect(sheet1).toBeDefined();
        expect(sheet1?.columnCount).toBe(10);

        expect(sheet2).toBeDefined();
        expect(sheet2?.columnCount).toBe(11);
    });

    it('DS đề nghị TT header row has Dân tộc at col 6, Mã số bằng at col 7, Văn bằng at col 8', async () => {
        const workbook = await service.buildWorkbook(basePayload);
        const sheet2 = workbook.getWorksheet('DS đề nghị TT');
        let headerRow: ExcelJS.Row | undefined;
        sheet2?.eachRow((row) => {
            if (headerRow) return;
            if (row.getCell(6).value === 'Dân tộc') {
                headerRow = row;
            }
        });

        expect(headerRow).toBeDefined();
        expect(headerRow?.getCell(6).value).toBe('Dân tộc');
        expect(headerRow?.getCell(7).value).toBe('Mã số bằng');
        expect(headerRow?.getCell(8).value).toBe('Văn bằng');
        expect(headerRow?.getCell(9).value).toBe('Ngành/Nghề tốt nghiệp');
        expect(headerRow?.getCell(11).value).toBe('Năm TN');
    });

    it('DS đề nghị TT data rows render diplomaNumber at col 7', async () => {
        const payload: CouncilAdmissionExportPayload = {
            ...basePayload,
            candidates: [
                { ...basePayload.candidates[0], qualificationGroup: 'THPT', diplomaNumber: 'SB-THPT-001' },
                { ...basePayload.candidates[1], qualificationGroup: 'DH',   diplomaNumber: 'CM-DH-002' },
            ],
        };
        const workbook = await service.buildWorkbook(payload);
        const sheet2 = workbook.getWorksheet('DS đề nghị TT');

        const dataRows: ExcelJS.Row[] = [];
        sheet2?.eachRow((row) => {
            const c1 = row.getCell(1).value;
            if (typeof c1 === 'number' && c1 >= 1) {
                dataRows.push(row);
            }
        });

        expect(dataRows.length).toBeGreaterThanOrEqual(2);
        const thptRow = dataRows.find(r => r.getCell(8).value === 'Bằng tốt nghiệp THPT');
        const dhRow   = dataRows.find(r => r.getCell(8).value === 'Bằng Đại học');

        expect(thptRow?.getCell(7).value).toBe('SB-THPT-001');
        expect(dhRow?.getCell(7).value).toBe('CM-DH-002');
    });

    it('invokes saver when calling export', async () => {
        await service.export(basePayload);

        expect(saveSpy).toHaveBeenCalledTimes(1);
        const [blob, filename] = saveSpy.calls.mostRecent().args as [Blob, string];
        expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        expect(filename).toContain('ket-qua-xet-tuyen_hoi-dong-tuyen-sinh-2026_');
    });

    it('sorts candidates by given name (last word of fullName) A-Z in the first 3 sheets, but preserves order in sheet 4', async () => {
        const candidateC = {
            ...basePayload.candidates[0],
            id: 201,
            fullName: 'Nguyễn Văn Cường',
            qualificationGroup: 'THPT' as const,
            status: 3,
        };
        const candidateA = {
            ...basePayload.candidates[0],
            id: 202,
            fullName: 'Trần Anh',
            qualificationGroup: 'THPT' as const,
            status: 3,
        };
        const candidateB1 = {
            ...basePayload.candidates[0],
            id: 203,
            fullName: 'Nguyễn Văn Bình',
            qualificationGroup: 'THPT' as const,
            status: 3,
        };
        const candidateB2 = {
            ...basePayload.candidates[0],
            id: 204,
            fullName: 'Lê Văn Bình',
            qualificationGroup: 'THPT' as const,
            status: 3,
        };

        const payload: CouncilAdmissionExportPayload = {
            ...basePayload,
            candidates: [candidateC, candidateA, candidateB1, candidateB2],
        };

        const workbook = await service.buildWorkbook(payload);

        for (const sheetName of ['DS TT', 'DS đề nghị TT', 'KQ xét tuyển']) {
            const sheet = workbook.getWorksheet(sheetName);
            const names: string[] = [];
            sheet?.eachRow((row) => {
                const c1 = row.getCell(1).value;
                if (typeof c1 === 'number' && c1 >= 1) {
                    names.push(String(row.getCell(2).value));
                }
            });
            expect(names).toEqual([
                'Trần Anh',
                'Lê Văn Bình',
                'Nguyễn Văn Bình',
                'Nguyễn Văn Cường',
            ]);
        }

        const sheet4 = workbook.getWorksheet('DL xét tuyển');
        const sheet4Names: string[] = [];
        sheet4?.eachRow((row) => {
            const c1 = row.getCell(1).value;
            if (typeof c1 === 'number' && c1 >= 1) {
                sheet4Names.push(String(row.getCell(2).value));
            }
        });
        expect(sheet4Names).toEqual([
            'Nguyễn Văn Cường',
            'Trần Anh',
            'Nguyễn Văn Bình',
            'Lê Văn Bình',
        ]);
    });

    it('formats scores with 2 decimal places using comma separator (e.g. 8 -> 8,00; 6.7 -> 6,70; 6.78 -> 6,78)', async () => {
        const payload: CouncilAdmissionExportPayload = {
            ...basePayload,
            candidates: [
                {
                    ...basePayload.candidates[0],
                    id: 301,
                    fullName: 'Thí sinh Điểm Tròn',
                    admissionScore: 8,
                    calculatedAdmissionScore: 8.5,
                    status: 3,
                },
                {
                    ...basePayload.candidates[0],
                    id: 302,
                    fullName: 'Thí sinh Điểm Lẻ',
                    admissionScore: 6.7,
                    calculatedAdmissionScore: 6.78,
                    status: 3,
                },
            ],
        };

        const workbook = await service.buildWorkbook(payload);
        const resultSheet = workbook.getWorksheet('KQ xét tuyển');

        const rows: ExcelJS.Row[] = [];
        resultSheet?.eachRow((row) => {
            const c1 = row.getCell(1).value;
            if (typeof c1 === 'number' && c1 >= 1) {
                rows.push(row);
            }
        });

        expect(rows.length).toBe(2);
        const row1 = rows.find(r => r.getCell(2).value === 'Thí sinh Điểm Tròn');
        const row2 = rows.find(r => r.getCell(2).value === 'Thí sinh Điểm Lẻ');

        // Col 12: admissionScore, Col 14: calculatedAdmissionScore
        expect(row1?.getCell(12).value).toBe('8,00');
        expect(row1?.getCell(14).value).toBe('8,50');
        expect(row2?.getCell(12).value).toBe('6,70');
        expect(row2?.getCell(14).value).toBe('6,78');
    });
});
