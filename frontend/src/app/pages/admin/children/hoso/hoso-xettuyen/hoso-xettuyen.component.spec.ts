import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { AuthenticationService } from '@services/authentication.service';
import { LocationService } from '@services/location.service';
import { NotificationService } from '@services/notification.service';
import { ChuongtrinhDaotaoService } from '@services/tuyensinh/chuongtrinh-daotao.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { RegistrationsService } from '@services/tuyensinh/registrations.service';
import { NganhhocService } from '@services/tuyensinh/nganhhoc.service';
import { ExpHosoTuyensinhService } from '@services/tuyensinh/exp-hoso-tuyensinh.service';
import { UserService } from '@services/user.service';
import { RoleService } from '@services/role.service';
import { IctuQueryCondition } from '@models/dto';
import { SysRoleName } from '@models/role';
import { HosoXettuyenComponent } from './hoso-xettuyen.component';

describe('HosoXettuyenComponent lookup services', () => {
    const emptyResponse = {
        data: [],
        draw: 1,
        recordsTotal: 0,
        recordsFiltered: 0,
    };

    const registrationsService = jasmine.createSpyObj<RegistrationsService>('RegistrationsService', ['query', 'updateRegistration']);
    const dotService = jasmine.createSpyObj<DotXettuyenService>('DotXettuyenService', ['load']);
    const nganhHocService = jasmine.createSpyObj<NganhhocService>('NganhhocService', ['load']);
    const ctdtService = jasmine.createSpyObj<ChuongtrinhDaotaoService>('ChuongtrinhDaotaoService', ['query']);
    const locationService = jasmine.createSpyObj<LocationService>('LocationService', ['queryLocation']);
    const userService = jasmine.createSpyObj<UserService>('UserService', ['query', 'load']);
    const roleService = jasmine.createSpyObj<RoleService>('RoleService', ['loadWithPermissions']);
    const exportService = jasmine.createSpyObj<ExpHosoTuyensinhService>('ExpHosoTuyensinhService', ['exportExcel']);
    const authService = jasmine.createSpyObj<AuthenticationService>(
        'AuthenticationService',
        ['getUserPermission', 'userHasRole'],
        { userMenu: [], user: { id: 7 } as never },
    );
    const notificationService = jasmine.createSpyObj<NotificationService>(
        'NotificationService',
        ['toastError', 'toastSuccess', 'toastWarning'],
    );

    beforeEach(() => {
        registrationsService.query.calls.reset();
        registrationsService.updateRegistration.calls.reset();
        userService.query.calls.reset();
        userService.load.calls.reset();
        roleService.loadWithPermissions.calls.reset();
        notificationService.toastError.calls.reset();
        notificationService.toastSuccess.calls.reset();
        notificationService.toastWarning.calls.reset();

        registrationsService.query.and.returnValue(of(emptyResponse));
        dotService.load.and.returnValue(of(emptyResponse));
        nganhHocService.load.and.returnValue(of({
            ...emptyResponse,
            data: [{ id: 11, ten_nganh: 'Công nghệ thông tin', ma_nganh: '7480201', status: 1 }],
        } as never));
        ctdtService.query.and.returnValue(of({
            ...emptyResponse,
            data: [{
                id: 21,
                major_id: 11,
                name: 'Chương trình chuẩn',
                code: 'CNTT',
                is_active: true,
            }],
        } as never));
        locationService.queryLocation.and.returnValue(of(emptyResponse));
        userService.query.and.returnValue(of(emptyResponse));
        userService.load.and.returnValue(of(emptyResponse));
        roleService.loadWithPermissions.and.returnValue(of([]));
        registrationsService.updateRegistration.and.returnValue(of(1));
        authService.getUserPermission.and.returnValue({ view: true, create: true, update: true, delete: true });
        authService.userHasRole.and.callFake((roles: SysRoleName[]): boolean => roles.includes('reviewer'));

        TestBed.configureTestingModule({
            providers: [
                FormBuilder,
                { provide: RegistrationsService, useValue: registrationsService },
                { provide: DotXettuyenService, useValue: dotService },
                { provide: NganhhocService, useValue: nganhHocService },
                { provide: ChuongtrinhDaotaoService, useValue: ctdtService },
                { provide: LocationService, useValue: locationService },
                { provide: UserService, useValue: userService },
                { provide: RoleService, useValue: roleService },
                { provide: ExpHosoTuyensinhService, useValue: exportService },
                { provide: AuthenticationService, useValue: authService },
                { provide: NotificationService, useValue: notificationService },
            ],
        });
    });

    it('loads ngành and chương trình from internal services', () => {
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());

        component.ngOnInit();

        expect(nganhHocService.load).toHaveBeenCalledWith({ search: '' }, { limit: -1 });
        expect(ctdtService.query).toHaveBeenCalledWith([], { limit: -1 });
        expect(component.majors()).toEqual([{ value: 11, label: 'Công nghệ thông tin' }]);
        expect(component.majorFilterOptions()).toEqual([{ value: 'Công nghệ thông tin', label: 'Công nghệ thông tin' }]);
        expect(component.programs()).toEqual([{ value: 21, label: 'CNTT — Chương trình chuẩn' }]);
    });

    it('loads users and resolves owner and reviewer labels for admin', () => {
        authService.userHasRole.and.callFake((roles: SysRoleName[]): boolean => roles.includes('admin'));
        userService.query.and.returnValue(of({
            ...emptyResponse,
            data: [
                { id: 7, display_name: 'Nguyễn A', email: 'a@example.test' },
                { id: 8, display_name: 'Trần B', email: '' },
            ],
        } as never));
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());

        component.ngOnInit();

        expect(component.isAdmin).toBeTrue();
        expect(userService.query).toHaveBeenCalledWith([], {
            limit: -1,
            select: 'id,display_name,email',
        });
        expect(component.userLabel(7)).toBe('Nguyễn A (a@example.test)');
        expect(component.userLabel(8)).toBe('Trần B');
        expect(component.userLabel(undefined)).toBe('—');
    });

    it('does not load users for non-admin roles', () => {
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());

        component.ngOnInit();

        expect(component.isAdmin).toBeFalse();
        expect(userService.query).not.toHaveBeenCalled();
    });

    it('filters by nganh_dangky using the selected ten_nganh', () => {
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());
        component.searchInfo.nganh_dangky = 'Công nghệ thông tin';

        component.loadData();

        expect(registrationsService.query).toHaveBeenCalledWith([
            {
                conditionName: 'owner_by',
                value: '7',
                condition: IctuQueryCondition.equal,
            },
            {
                conditionName: 'nganh_dangky',
                value: 'Công nghệ thông tin',
                condition: IctuQueryCondition.equal,
            },
        ], jasmine.any(Object));
    });

    it('forces reviewer permissions to view-only and blocks export', () => {
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());

        expect(component.permissionControl().canView).toBeTrue();
        expect(component.permissionControl().canCreate).toBeFalse();
        expect(component.permissionControl().canUpdate).toBeFalse();
        expect(component.permissionControl().canDelete).toBeFalse();
        expect(component.canExport()).toBeFalse();
    });

    it('filters reviewer records by owner_by by default', () => {
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());

        component.loadData();

        expect(component.onlyMyRecords()).toBeTrue();
        expect(registrationsService.query).toHaveBeenCalledWith([
            {
                conditionName: 'owner_by',
                value: '7',
                condition: IctuQueryCondition.equal,
            },
        ], jasmine.any(Object));
    });

    it('filters doi-tac records by created_by', () => {
        authService.userHasRole.and.callFake((roles: SysRoleName[]): boolean => roles.includes('doi-tac'));
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());

        component.loadData();

        expect(registrationsService.query).toHaveBeenCalledWith([
            {
                conditionName: 'created_by',
                value: '7',
                condition: IctuQueryCondition.equal,
            },
        ], jasmine.any(Object));
    });

    ['staff', 'doi-tac-cv'].forEach((role: SysRoleName): void => {
        it(`filters ${role} records by owner_by without nguoi_tuvan`, () => {
            authService.userHasRole.and.callFake((roles: SysRoleName[]): boolean => roles.includes(role));
            const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());

            component.loadData();

            expect(registrationsService.query).toHaveBeenCalledWith([
                {
                    conditionName: 'owner_by',
                    value: '7',
                    condition: IctuQueryCondition.equal,
                },
            ], jasmine.any(Object));
        });
    });

    it('loads records without ownership conditions when the checkbox is disabled', () => {
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());
        component.onlyMyRecords.set(false);

        component.loadData();

        expect(registrationsService.query).toHaveBeenCalledWith([], jasmine.any(Object));
    });

    it('reloads page one when the ownership checkbox changes', () => {
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());
        spyOn(component, 'loadData');

        component.onOnlyMyRecordsChange(false);

        expect(component.onlyMyRecords()).toBeFalse();
        expect(component.loadData).toHaveBeenCalledWith(1, true);
    });

    it('enables the ownership filter again when filters are reset', () => {
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());
        component.onlyMyRecords.set(false);
        spyOn(component, 'loadData');

        component.resetFilter();

        expect(component.onlyMyRecords()).toBeTrue();
        expect(component.loadData).toHaveBeenCalledWith(1, true);
    });

    it('opens the application view drawer for reviewer', () => {
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());
        const record = { id: 12, ho_va_ten: 'Nguyễn Văn A' } as unknown as Parameters<typeof component.viewApplication>[0];

        component.viewApplication(record);

        expect(component.canViewApplication()).toBeTrue();
        expect(component.viewData()).toEqual(record);
        expect(component.viewDrawerVisible()).toBeTrue();
    });

    it('blocks the application view drawer for non-reviewer roles', () => {
        authService.userHasRole.and.returnValue(false);
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());
        const record = { id: 12, ho_va_ten: 'Nguyễn Văn A' } as unknown as Parameters<typeof component.viewApplication>[0];

        component.viewApplication(record);

        expect(component.canViewApplication()).toBeFalse();
        expect(component.viewData()).toBeNull();
        expect(component.viewDrawerVisible()).toBeFalse();
        expect(notificationService.toastError).toHaveBeenCalledWith('Bạn không có quyền xem hồ sơ xét tuyển');
    });

    it('does not open reviewer assignment when no records are selected', () => {
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());

        component.openFormDuyet();

        expect(component.addDuyetVisible()).toBeFalse();
        expect(notificationService.toastWarning).toHaveBeenCalledWith('Vui lòng chọn ít nhất một hồ sơ');
        expect(roleService.loadWithPermissions).not.toHaveBeenCalled();
    });

    it('loads and deduplicates users from roles containing duyet_hoso', () => {
        roleService.loadWithPermissions.and.returnValue(of([
            { id: 1, name: 'reviewer', title: 'Duyệt 1', ucase_ids: [{ id: 'duyet_hoso', pms: '1.1.1.1' }] },
            { id: 2, name: 'staff', title: 'Duyệt 2', ucase_ids: [{ id: 'duyet_hoso', pms: '1.0.0.0' }] },
            { id: 3, name: 'manager', title: 'Khác', ucase_ids: [{ id: 'other', pms: '1.1.1.1' }] },
        ] as never));
        userService.load.and.callFake(({ role_id }) => of({
            ...emptyResponse,
            data: role_id === 1
                ? [{ id: 7, display_name: 'Nguyễn A', email: 'a@example.test' }]
                : [
                    { id: 7, display_name: 'Nguyễn A', email: 'a@example.test' },
                    { id: 8, display_name: 'Trần B', email: 'b@example.test' },
                ],
        } as never));
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());
        component.dataTable.fillData([{ id: 10 }, { id: 11 }] as never);
        component.dataTable.selectRow(true);

        component.openFormDuyet();

        expect(userService.load.calls.allArgs().map(([info]) => info.role_id)).toEqual([1, 2]);
        expect(component.reviewerOptions()).toEqual([
            { value: 7, label: 'Nguyễn A (a@example.test)' },
            { value: 8, label: 'Trần B (b@example.test)' },
        ]);
        expect(component.addDuyetVisible()).toBeTrue();
    });

    it('updates selected records sequentially and reloads after success', () => {
        const firstUpdate = new Subject<number>();
        registrationsService.updateRegistration.and.callFake((id: number) => id === 10 ? firstUpdate : of(1));
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());
        component.dataTable.fillData([{ id: 10 }, { id: 11 }] as never);
        component.dataTable.selectRow(true);
        component.selectedReviewerId.set(7);
        spyOn(component, 'loadData');

        component.saveReviewerAssignments();

        expect(registrationsService.updateRegistration).toHaveBeenCalledOnceWith(10, { nguoi_tuvan: 7 });
        firstUpdate.next(1);
        firstUpdate.complete();

        expect(registrationsService.updateRegistration.calls.allArgs()).toEqual([
            [10, { nguoi_tuvan: 7 }],
            [11, { nguoi_tuvan: 7 }],
        ]);
        expect(notificationService.toastSuccess).toHaveBeenCalledWith('Đã gán cán bộ duyệt cho 2 hồ sơ');
        expect(component.addDuyetVisible()).toBeFalse();
        expect(component.loadData).toHaveBeenCalled();
    });

    it('stops sequential updates on the first error and reloads', () => {
        registrationsService.updateRegistration.and.callFake((id: number) =>
            id === 10 ? throwError(() => new Error('failed')) : of(1),
        );
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());
        component.dataTable.fillData([{ id: 10 }, { id: 11 }] as never);
        component.dataTable.selectRow(true);
        component.selectedReviewerId.set(7);
        spyOn(component, 'loadData');

        component.saveReviewerAssignments();

        expect(registrationsService.updateRegistration).toHaveBeenCalledOnceWith(10, { nguoi_tuvan: 7 });
        expect(notificationService.toastError).toHaveBeenCalledWith('Gán cán bộ duyệt thất bại, quá trình đã dừng');
        expect(component.loadData).toHaveBeenCalled();
    });
});
