import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { HoidongXettuyen } from '@models/tuyensinh/hoidong-xettuyen';
import { Registrations } from '@models/tuyensinh/registrations';
import { AuthenticationService } from '@services/authentication.service';
import { LocationService } from '@services/location.service';
import { NotificationService } from '@services/notification.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import {
    CouncilAdmissionExportPayload,
    ExpHosoDaduyetService,
} from '@services/tuyensinh/exp-hoso-daduyet.service';
import {
    ExportDlTuyensinhCuService,
} from '@services/tuyensinh/exportDlTuyensinhCu.service';
import { HoidongHosoThisinhService } from '@services/tuyensinh/hoidong-hoso-thisinh.service';
import { RegistrationsService } from '@services/tuyensinh/registrations.service';
import { NganhhocService } from '@services/tuyensinh/nganhhoc.service';
import { UserService } from '@services/user.service';
import { HoidongHosoXetduyetComponent } from './hoidong-hoso-xetduyet.component';

describe('HoidongHosoXetduyetComponent', () => {
    const emptyResponse = {
        data: [],
        draw: 1,
        recordsTotal: 0,
        recordsFiltered: 0,
    };

    const assignmentService = jasmine.createSpyObj<HoidongHosoThisinhService>('HoidongHosoThisinhService', ['query']);
    const registrationsService = jasmine.createSpyObj<RegistrationsService>('RegistrationsService', ['query', 'update']);
    const dotXettuyenService = jasmine.createSpyObj<DotXettuyenService>('DotXettuyenService', ['get']);
    const nganhHocService = jasmine.createSpyObj<NganhhocService>('NganhhocService', ['load']);
    const locationService = jasmine.createSpyObj<LocationService>('LocationService', ['queryLocation']);
    const userService = jasmine.createSpyObj<UserService>('UserService', ['query']);
    const notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', [
        'progressBarWithPercent',
        'startProgressAnimation',
        'toastError',
        'toastSuccess',
    ]);
    const exportService = jasmine.createSpyObj<ExpHosoDaduyetService>('ExpHosoDaduyetService', ['exportExcel']);
    const legacyExportService = jasmine.createSpyObj<ExportDlTuyensinhCuService>('ExportDlTuyensinhCuService', ['exportExcel']);
    const authService = jasmine.createSpyObj<AuthenticationService>('AuthenticationService', ['userHasRole']);

    beforeEach(() => {
        assignmentService.query.calls.reset();
        registrationsService.query.calls.reset();
        registrationsService.update.calls.reset();
        dotXettuyenService.get.calls.reset();
        exportService.exportExcel.calls.reset();
        legacyExportService.exportExcel.calls.reset();
        notificationService.toastError.calls.reset();
        notificationService.toastSuccess.calls.reset();
        authService.userHasRole.calls.reset();

        assignmentService.query.and.returnValue(of(emptyResponse));
        registrationsService.query.and.returnValue(of(emptyResponse));
        dotXettuyenService.get.and.returnValue(of({
            id: 3,
            name: 'Đợt 1',
            thoi_gian_bat_dau: '2026-08-01',
            thoi_gian_ket_thuc: '2026-08-31',
        } as never));
        exportService.exportExcel.and.returnValue(Promise.resolve());
        legacyExportService.exportExcel.and.returnValue(Promise.resolve());
        nganhHocService.load.and.returnValue(of({
            ...emptyResponse,
            data: [{ id: 12, ten_nganh: 'Công nghệ thông tin', ma_nganh: 'CNTT', status: 1 }],
        } as never));
        locationService.queryLocation.calls.reset();
        userService.query.calls.reset();
        userService.query.and.returnValue(of(emptyResponse));
        locationService.queryLocation.and.returnValue(of(emptyResponse));
        authService.userHasRole.and.returnValue(false);

        TestBed.configureTestingModule({
            imports: [HoidongHosoXetduyetComponent],
            providers: [
                { provide: HoidongHosoThisinhService, useValue: assignmentService },
                { provide: RegistrationsService, useValue: registrationsService },
                { provide: DotXettuyenService, useValue: dotXettuyenService },
                { provide: NganhhocService, useValue: nganhHocService },
                { provide: LocationService, useValue: locationService },
                { provide: UserService, useValue: userService },
                { provide: NotificationService, useValue: notificationService },
                { provide: ExpHosoDaduyetService, useValue: exportService },
                { provide: ExportDlTuyensinhCuService, useValue: legacyExportService },
                { provide: AuthenticationService, useValue: authService },
            ],
        });
    });

    it('loads major labels from NganhhocService', () => {
        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        fixture.componentRef.setInput('hoidong', { id: 8 });
        fixture.detectChanges();

        expect(nganhHocService.load).toHaveBeenCalledWith({ search: '' }, { limit: -1 });
        expect(fixture.componentInstance.majorOptions()).toEqual([
            { value: 12, label: 'Công nghệ thông tin' },
        ]);
    });

    it('does not render the training program column', () => {
        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        fixture.componentRef.setInput('hoidong', { id: 8 });
        fixture.detectChanges();
        fixture.componentInstance.records.set([{
            id: 1,
            hoidong_id: 8,
            hoso_id: 21,
            _hoso: { id: 21, ho_va_ten: 'Nguyễn Văn A', nganh_id: 12, ctdt_id: 4 },
        } as never]);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).not.toContain('Chương trình đào tạo');
    });

    it('sends approval status with the review time', () => {
        registrationsService.update.and.returnValue(of(undefined));
        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        fixture.detectChanges();
        fixture.componentInstance.records.set([{
            id: 1,
            hoidong_id: 8,
            hoso_id: 21,
        } as never]);
        fixture.componentInstance.selectedIds.set(new Set([1]));
        fixture.componentInstance.onApproveSelected();

        const payload = registrationsService.update.calls.mostRecent().args[1];
        expect(registrationsService.update).toHaveBeenCalledOnceWith(21, jasmine.objectContaining({ status: 3 }));
        expect(payload.ngay_duyet).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('sends cancellation status with the review time', () => {
        registrationsService.update.and.returnValue(of(undefined));
        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        fixture.detectChanges();
        fixture.componentInstance.records.set([{
            id: 1,
            hoidong_id: 8,
            hoso_id: 21,
        } as never]);
        fixture.componentInstance.selectedIds.set(new Set([1]));

        fixture.componentInstance.onCancelApprovalSelected();

        const payload = registrationsService.update.calls.mostRecent().args[1];
        expect(registrationsService.update).toHaveBeenCalledOnceWith(21, jasmine.objectContaining({ status: -1 }));
        expect(payload.ngay_duyet).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('calculates admission scores for both scales and caps the maximum score', () => {
        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        const component = fixture.componentInstance as unknown as {
            calculateAdmissionScore(candidate: Registrations, qualificationGroup: 'DH' | 'CD' | 'TC' | 'THPT'): number | undefined;
        };
        const candidate = (score: number, priority: number, additional: number): Registrations => ({
            diem_xettuyen: score,
            diem_uutien: priority,
            diem_cong: additional,
        } as Registrations);

        expect(component.calculateAdmissionScore(candidate(20, 1.5, 0.5), 'THPT')).toBe(22);
        expect(component.calculateAdmissionScore(candidate(25.5, 1.5, 0.5), 'THPT')).toBe(26.7);
        expect(component.calculateAdmissionScore(candidate(7, 1, 0.5), 'DH')).toBe(7.5);
        expect(component.calculateAdmissionScore(candidate(8.1, 1, 0.5), 'DH')).toBe(8.5);
        expect(component.calculateAdmissionScore(candidate(29.5, 3, 2), 'THPT')).toBe(29.8);
        expect(component.calculateAdmissionScore(candidate(7, 6, 6), 'DH')).toBe(10);
    });

    it('maps the loaded council data and exports the workbook payload', fakeAsync(() => {
        const council = {
            id: 8,
            tieu_de_hoi_dong: 'Hội đồng tháng 8',
            mo_ta_hoi_dong: '',
            dot_xettuyen_id: 3,
            ngay_xetduyet: '2026-08-17',
            status: 'dang_mo',
        } as HoidongXettuyen;
        assignmentService.query.and.returnValue(of({
            ...emptyResponse,
            data: [
                { id: 1, hoidong_id: 8, tuyensinh_id: 21, ket_qua: '', ghi_chu: 'Đã kiểm tra' },
                { id: 2, hoidong_id: 8, tuyensinh_id: 22, ket_qua: '', ghi_chu: '' },
            ],
        } as never));
        registrationsService.query.and.returnValue(of({
            ...emptyResponse,
            data: [{
                id: 21,
                created_at: '2026-09-01 00:00:00',
                ho_va_ten: ' Nguyễn Văn A ',
                gioi_tinh: 'nam',
                ngay_sinh: '2005-06-15',
                noi_sinh: 9,
                dan_toc: 'Kinh',
                status: 3,
                doituong: 'THPT',
                van_bang_tn: 'Bằng tốt nghiệp THPT',
                vb_chuyenmon_nganh: 'Công nghệ thông tin',
                tn_noicap: 'Sở GD&ĐT Thái Nguyên',
                nam_tn: '2023',
                nganh_dangky: 'Công nghệ thông tin',
                diem_xettuyen: 25.5,
                diem_uutien: 1.5,
                diem_cong: 0.5,
            }, {
                id: 22,
                created_at: '2026-09-02 08:30:00',
                ho_va_ten: 'Trần Thị B',
                gioi_tinh: 'nu',
                status: 3,
                doituong: 'DH',
                vb_chuyenmon: 'Bằng đại học',
                nganh_dangky: 'Công nghệ thông tin',
                diem_xettuyen: 8.1,
                diem_uutien: 1,
                diem_cong: 0.5,
            }],
        } as never));
        locationService.queryLocation.and.returnValues(
            of({ ...emptyResponse, data: [{ id: 9, name: 'Thái Nguyên' }] } as never),
            of({ ...emptyResponse, data: [{ id: 101, name: 'Phường Phan Đình Phùng' }] } as never),
        );
        userService.query.and.returnValue(of({
            ...emptyResponse,
            data: [{ id: 5, display_name: 'Cán bộ tuyển sinh' }],
        } as never));

        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        fixture.componentRef.setInput('hoidong', council);
        fixture.detectChanges();

        fixture.componentInstance.onExportData();
        flushMicrotasks();

        expect(dotXettuyenService.get).toHaveBeenCalledOnceWith(3);
        expect(exportService.exportExcel).toHaveBeenCalledTimes(1);
        const payload = exportService.exportExcel.calls.mostRecent().args[0] as CouncilAdmissionExportPayload;
        expect(payload.council).toEqual(jasmine.objectContaining({
            id: 8,
            name: 'Hội đồng tháng 8',
            reviewDate: '2026-08-17',
        }));
        expect(payload.round).toEqual({
            id: 3,
            name: 'Đợt 1',
            startDate: '2026-08-01',
            endDate: '2026-08-31',
        });
        expect(payload.candidates[0]).toEqual(jasmine.objectContaining({
            id: 21,
            fullName: 'Nguyễn Văn A',
            gender: 'Nam',
            birthDate: '2005-06-15',
            birthPlace: 'Thái Nguyên',
            ethnicity: 'Kinh',
            qualificationGroup: 'THPT',
            qualificationName: 'Bằng tốt nghiệp THPT',
            graduationMajor: 'Công nghệ thông tin',
            graduationInstitution: 'Sở GD&ĐT Thái Nguyên',
            graduationYear: '2023',
            registeredMajorId: 12,
            registeredMajorName: 'Công nghệ thông tin',
            registeredMajorCode: 'CNTT',
            admissionScore: 25.5,
            calculatedAdmissionScore: 26.7,
            result: 'Trúng tuyển',
            note: 'Đã kiểm tra',
        }));
        expect(payload.candidates[1]).toEqual(jasmine.objectContaining({
            id: 22,
            qualificationGroup: 'DH',
            admissionScore: 8.1,
            calculatedAdmissionScore: 8.5,
        }));
        expect(notificationService.toastSuccess).toHaveBeenCalledWith('Xuất dữ liệu xét tuyển thành công');
        expect(fixture.componentInstance.actionLoading()).toBeFalse();
    }));

    it('does not export when a candidate has an unsupported qualification group', () => {
        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        fixture.componentRef.setInput('hoidong', {
            id: 8,
            tieu_de_hoi_dong: 'Hội đồng tháng 8',
            mo_ta_hoi_dong: '',
            dot_xettuyen_id: 3,
            ngay_xetduyet: '2026-08-17',
            status: 'dang_mo',
        } as HoidongXettuyen);
        fixture.detectChanges();
        fixture.componentInstance.records.set([{
            id: 1,
            hoidong_id: 8,
            hoso_id: 21,
            _hoso: {
                id: 21,
                ho_va_ten: 'Nguyễn Văn A',
                gioi_tinh: 'nam',
                doituong: 'SAU_DH',
                status: 3,
            },
        } as never]);

        fixture.componentInstance.onExportData();

        expect(exportService.exportExcel).not.toHaveBeenCalled();
        expect(notificationService.toastError).toHaveBeenCalledWith(
            'Hồ sơ #21 có đối tượng xét tuyển không hợp lệ',
        );
        expect(fixture.componentInstance.actionLoading()).toBeFalse();
    });

    it('exports legacy raw candidates to ExportDlTuyensinhCuService when records are created before 2026-09-01', fakeAsync(() => {
        const council = {
            id: 8,
            tieu_de_hoi_dong: 'Hội đồng tháng 8',
            dot_xettuyen_id: 3,
        } as HoidongXettuyen;
        assignmentService.query.and.returnValue(of({
            ...emptyResponse,
            data: [
                { id: 1, hoidong_id: 8, tuyensinh_id: 21, ket_qua: '', ghi_chu: 'Ghi chú cũ' },
            ],
        } as never));
        registrationsService.query.and.returnValue(of({
            ...emptyResponse,
            data: [{
                id: 21,
                created_at: '2026-08-15 14:00:00',
                ho_va_ten: 'Lê Văn Cũ',
                gioi_tinh: 'Nam',
                ngay_sinh: '2004-03-20',
                noi_sinh: 9,
                dan_toc: 'Tày',
                dien_thoai: '0912345678',
                email: 'levancu@gmail.com',
                cccd: '012345678901',
                ngay_cap_cccd: '2022-01-10',
                dia_chi_nha: '123 Đường Cũ',
                dia_chi_tinh: 9,
                dia_chi_xa: 101,
                doituong: 'KHONG_XAC_DINH',
                nganh_dangky: 'Ngành Chưa Chuẩn Hóa',
                diem_xettuyen: 21.5,
                diem_uutien: 1,
                diem_cong: 0.5,
                van_bang_tn: 'Bằng THPT cũ',
                van_bang_tn_sohieu: 'VB123',
                tn_noicap: 'Sở GD Cũ',
                nam_tn: '2022',
                diachi_nhangiay: 'Thái Nguyên',
                created_by: 5,
                owner_by: 6,
                nguoi_tuvan: 7,
            }],
        } as never));
        locationService.queryLocation.and.callFake((_conditions, _params, table) => of({
            ...emptyResponse,
            data: table === 'regions'
                ? [{ id: 9, name: 'Thái Nguyên' }]
                : [{ id: 101, name: 'Phường Phan Đình Phùng' }],
        } as never));
        userService.query.and.returnValue(of({
            ...emptyResponse,
            data: [
                { id: 5, display_name: 'Cán bộ tuyển sinh' },
                { id: 6, display_name: 'Người nhập hồ sơ' },
                { id: 7, display_name: 'Người duyệt hồ sơ' },
            ],
        } as never));

        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        fixture.componentRef.setInput('hoidong', council);
        fixture.detectChanges();

        fixture.componentInstance.onExportData();
        flushMicrotasks();

        expect(legacyExportService.exportExcel).toHaveBeenCalledTimes(1);
        expect(exportService.exportExcel).not.toHaveBeenCalled();
        const payload = legacyExportService.exportExcel.calls.mostRecent().args[0];
        expect(payload.council.name).toBe('Hội đồng tháng 8');
        expect(payload.candidates.length).toBe(1);
        expect(payload.candidates[0]).toEqual(jasmine.objectContaining({
            id: 21,
            fullName: 'Lê Văn Cũ',
            phone: '0912345678',
            email: 'levancu@gmail.com',
            cccd: '012345678901',
            address: '123 Đường Cũ',
            provinceId: 9,
            wardId: 101,
            registeredMajorName: 'Ngành Chưa Chuẩn Hóa',
            recipientAddress: 'Thái Nguyên',
            createdById: 5,
            ownerById: 6,
            consultantId: 7,
            note: 'Ghi chú cũ',
        }));
        expect(notificationService.toastSuccess).toHaveBeenCalledWith('Xuất dữ liệu xét tuyển thành công');
        expect(fixture.componentInstance.actionLoading()).toBeFalse();
    }));

    it('exports two separate files when council has both legacy and current records', fakeAsync(() => {
        const council = {
            id: 8,
            tieu_de_hoi_dong: 'Hội đồng hỗn hợp',
            dot_xettuyen_id: 3,
        } as HoidongXettuyen;
        assignmentService.query.and.returnValue(of({
            ...emptyResponse,
            data: [
                { id: 1, hoidong_id: 8, tuyensinh_id: 21, ket_qua: '', ghi_chu: 'Cũ' },
                { id: 2, hoidong_id: 8, tuyensinh_id: 22, ket_qua: '', ghi_chu: 'Mới' },
            ],
        } as never));
        registrationsService.query.and.returnValue(of({
            ...emptyResponse,
            data: [{
                id: 21,
                created_at: '2026-08-31 23:59:59',
                ho_va_ten: 'Hồ Sơ Cũ',
                gioi_tinh: 'Nam',
                nganh_dangky: 'Tự do',
            }, {
                id: 22,
                created_at: '2026-09-01 00:00:00',
                ho_va_ten: 'Hồ Sơ Mới',
                gioi_tinh: 'nu',
                ngay_sinh: '2005-06-15',
                noi_sinh: 9,
                dan_toc: 'Kinh',
                status: 3,
                doituong: 'THPT',
                van_bang_tn: 'Bằng tốt nghiệp THPT',
                vb_chuyenmon_nganh: 'Công nghệ thông tin',
                tn_noicap: 'Sở GD&ĐT Thái Nguyên',
                nam_tn: '2023',
                nganh_dangky: 'Công nghệ thông tin',
                diem_xettuyen: 25.5,
                diem_uutien: 1.5,
                diem_cong: 0.5,
            }],
        } as never));
        locationService.queryLocation.and.callFake((_conditions, _params, table) => of({
            ...emptyResponse,
            data: table === 'regions'
                ? [{ id: 9, name: 'Thái Nguyên' }]
                : [{ id: 101, name: 'Phường Phan Đình Phùng' }],
        } as never));
        userService.query.and.returnValue(of({ ...emptyResponse, data: [] } as never));

        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        fixture.componentRef.setInput('hoidong', council);
        fixture.detectChanges();

        fixture.componentInstance.onExportData();
        flushMicrotasks();

        expect(legacyExportService.exportExcel).toHaveBeenCalledTimes(1);
        expect(exportService.exportExcel).toHaveBeenCalledTimes(1);
        expect(notificationService.toastSuccess).toHaveBeenCalledWith('Xuất dữ liệu xét tuyển thành công');
        expect(fixture.componentInstance.actionLoading()).toBeFalse();
    }));

    it('opens edit drawer when a row is clicked by an allowed user', () => {
        authService.userHasRole.and.returnValue(true);
        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        fixture.componentRef.setInput('hoidong', { id: 8 });
        fixture.detectChanges();
        fixture.componentInstance.records.set([{
            id: 1,
            hoidong_id: 8,
            tuyensinh_id: 21,
            _hoso: { id: 21, ho_va_ten: 'Nguyễn Văn A' },
        } as never]);
        fixture.detectChanges();

        const row: HTMLTableRowElement | null = fixture.nativeElement.querySelector('tbody tr');
        row?.click();

        expect(row).not.toBeNull();
        expect(authService.userHasRole).toHaveBeenCalledWith(['admin', 'manager', 'direction']);
        expect(fixture.componentInstance.editDrawerVisible()).toBeTrue();
        expect(fixture.componentInstance.editData()?.ho_va_ten).toBe('Nguyễn Văn A');
    });

    it('opens edit drawer for users with an allowed role', () => {
        authService.userHasRole.and.returnValue(true);
        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        const row = {
            id: 1,
            hoidong_id: 8,
            tuyensinh_id: 21,
            _hoso: { id: 21, ho_va_ten: 'Nguyễn Văn A' },
        } as never;

        fixture.componentInstance.openEditRow(row);

        expect(authService.userHasRole).toHaveBeenCalledWith(['admin', 'manager', 'direction']);
        expect(fixture.componentInstance.editDrawerVisible()).toBeTrue();
        expect(fixture.componentInstance.editData()?.ho_va_ten).toBe('Nguyễn Văn A');
    });

    it('does not open edit drawer for users without an allowed role', () => {
        authService.userHasRole.and.returnValue(false);
        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        const row = {
            id: 1,
            hoidong_id: 8,
            tuyensinh_id: 21,
            _hoso: { id: 21, ho_va_ten: 'Nguyễn Văn A' },
        } as never;

        fixture.componentInstance.openEditRow(row);

        expect(fixture.componentInstance.editDrawerVisible()).toBeFalse();
        expect(fixture.componentInstance.editData()).toBeNull();
    });

    it('reloads data when the edit drawer is hidden', () => {
        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        fixture.componentRef.setInput('hoidong', { id: 8 });
        fixture.detectChanges();
        assignmentService.query.calls.reset();

        fixture.componentInstance.onEditDrawerHide();

        expect(fixture.componentInstance.editData()).toBeNull();
        expect(assignmentService.query).toHaveBeenCalledTimes(1);
    });

    it('filters loaded records by accent-insensitive candidate name', () => {
        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        const records = [{
            id: 1,
            hoidong_id: 8,
            tuyensinh_id: 21,
            _hoso: { id: 21, ho_va_ten: 'Nguyễn Văn Ánh', dien_thoai: '0912345678', cccd: '012345678901' },
        }, {
            id: 2,
            hoidong_id: 8,
            tuyensinh_id: 22,
            _hoso: { id: 22, ho_va_ten: 'Trần Thị Bình', dien_thoai: '0987654321', cccd: '987654321012' },
        }] as never;
        fixture.componentInstance.records.set(records);

        fixture.componentInstance.searchTerm.set('nguyen van anh');

        expect(fixture.componentInstance.filteredRecords().map((row) => row.id)).toEqual([1]);
        expect(fixture.componentInstance.records()).toBe(records);
    });

    it('filters loaded records by partial phone number or CCCD', () => {
        const fixture = TestBed.createComponent(HoidongHosoXetduyetComponent);
        fixture.componentInstance.records.set([{
            id: 1,
            hoidong_id: 8,
            tuyensinh_id: 21,
            _hoso: { id: 21, ho_va_ten: 'Nguyễn Văn A', dien_thoai: '0912 345 678', cccd: '012345678901' },
        }, {
            id: 2,
            hoidong_id: 8,
            tuyensinh_id: 22,
            _hoso: { id: 22, ho_va_ten: 'Trần Thị B', dien_thoai: '0987654321', cccd: '987654321012' },
        }] as never);

        fixture.componentInstance.searchTerm.set('345-678');
        expect(fixture.componentInstance.filteredRecords().map((row) => row.id)).toEqual([1]);

        fixture.componentInstance.searchTerm.set('4321012');
        expect(fixture.componentInstance.filteredRecords().map((row) => row.id)).toEqual([2]);
    });
});
