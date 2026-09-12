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
        expect(firstRow?.getCell(26).value).toBe(25.5);
        expect(firstRow?.getCell(27).value).toBe(0.5);
        expect(firstRow?.getCell(28).value).toBe(1.5);
        expect(firstRow?.getCell(29).value).toBe(26.7);
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
        expect(secondRow?.getCell(26).value).toBe(8.2);
        expect(secondRow?.getCell(27).value).toBe(0.5);
        expect(secondRow?.getCell(28).value).toBe(1);
        expect(secondRow?.getCell(29).value).toBe(8.58);
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

    it('invokes saver when calling export', async () => {
        await service.export(basePayload);

        expect(saveSpy).toHaveBeenCalledTimes(1);
        const [blob, filename] = saveSpy.calls.mostRecent().args as [Blob, string];
        expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        expect(filename).toContain('ket-qua-xet-tuyen_hoi-dong-tuyen-sinh-2026_');
    });
});
