import { TestBed } from '@angular/core/testing';
import { SAVER } from '@app/providers/saver.provider';
import {
    ExportDlTuyensinhCuService,
    TuyensinhCuExportPayload,
} from './exportDlTuyensinhCu.service';

describe('ExportDlTuyensinhCuService', () => {
    let service: ExportDlTuyensinhCuService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ExportDlTuyensinhCuService,
                { provide: SAVER, useValue: jasmine.createSpy('save') },
            ],
        });
        service = TestBed.inject(ExportDlTuyensinhCuService);
    });

    it('maps legacy candidate names, locations, users, addresses, and major code', async () => {
        const payload: TuyensinhCuExportPayload = {
            council: { id: 8, name: 'Hội đồng tháng 8' },
            round: { id: 3, name: 'Đợt 1' },
            majors: [{ id: 12, ten_nganh: 'Công nghệ thông tin', ma_nganh: 'CNTT' }],
            regions: [{ id: 9, name: 'Thái Nguyên' }],
            provinces: [{ id: 101, name: 'Phường Phan Đình Phùng' }],
            users: [
                { id: 5, display_name: 'Cán bộ tuyển sinh' },
                { id: 6, display_name: 'Tài khoản nhập hồ sơ' },
                { id: 7, display_name: 'Tài khoản duyệt hồ sơ' },
            ],
            candidates: [{
                id: 21,
                fullName: '  Nguyễn   Văn   An  ',
                gender: 'nam',
                address: '123 Đường Cũ',
                provinceId: 9,
                wardId: 101,
                registeredMajorName: 'Công nghệ thông tin',
                recipientAddress: 'Địa chỉ nhận giấy',
                createdById: 5,
                ownerById: 6,
                consultantId: 7,
            }],
        };

        const workbook = await service.buildWorkbook(payload);
        const worksheet = workbook.getWorksheet('Mẫu xuất full');
        const header = worksheet?.getRow(1);
        const row = worksheet?.getRow(2);

        expect(header?.getCell(16).value).toBe('Tỉnh/Thành phố');
        expect(header?.getCell(17).value).toBe('Phường/Xã');
        expect(row?.getCell(6).value).toBe('Nguyễn Văn An');
        expect(row?.getCell(10).value).toBe('Nam');
        expect(row?.getCell(7).value).toBe('Nguyễn Văn');
        expect(row?.getCell(8).value).toBe('An');
        expect(row?.getCell(16).value).toBe('Thái Nguyên');
        expect(row?.getCell(17).value).toBe('Phường Phan Đình Phùng');
        expect(row?.getCell(18).value).toBe('123 Đường Cũ');
        expect(row?.getCell(24).value).toBe('CNTT');
        expect(row?.getCell(25).value).toBe('Công nghệ thông tin');
        expect(row?.getCell(39).value).toBe('Địa chỉ nhận giấy');
        expect(row?.getCell(40).value).toBe('Cán bộ tuyển sinh');
        expect(row?.getCell(41).value).toBe('Tài khoản nhập hồ sơ');
        expect(row?.getCell(42).value).toBe('Tài khoản duyệt hồ sơ');
    });

    it('keeps export successful when lookups are missing and handles a one-word name', async () => {
        const payload: TuyensinhCuExportPayload = {
            council: { id: 8, name: 'Hội đồng tháng 8' },
            majors: [],
            regions: [],
            provinces: [],
            users: [],
            candidates: [{
                id: 22,
                fullName: 'An',
                provinceId: 999,
                wardId: 999,
                registeredMajorName: 'Ngành chưa chuẩn hóa',
                createdById: 999,
                ownerById: 999,
                consultantId: 999,
            }],
        };

        const workbook = await service.buildWorkbook(payload);
        const row = workbook.getWorksheet('Mẫu xuất full')?.getRow(2);

        expect(row?.getCell(7).value).toBe('');
        expect(row?.getCell(8).value).toBe('An');
        expect(row?.getCell(16).value).toBe('');
        expect(row?.getCell(17).value).toBe('');
        expect(row?.getCell(24).value).toBe('');
        expect(row?.getCell(25).value).toBe('Ngành chưa chuẩn hóa');
        expect(row?.getCell(40).value).toBe('');
        expect(row?.getCell(41).value).toBe('');
        expect(row?.getCell(42).value).toBe('');
    });

    it('converts nu to Nữ when exporting gender', async () => {
        const payload: TuyensinhCuExportPayload = {
            council: { id: 8, name: 'Hội đồng tháng 8' },
            candidates: [{ id: 23, fullName: 'Trần Thị Bình', gender: 'nu' }],
        };

        const workbook = await service.buildWorkbook(payload);
        const row = workbook.getWorksheet('Mẫu xuất full')?.getRow(2);

        expect(row?.getCell(10).value).toBe('Nữ');
    });
});
