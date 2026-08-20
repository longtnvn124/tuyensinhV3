import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthenticationService } from '@services/authentication.service';
import { LocationService } from '@services/location.service';
import { NotificationService } from '@services/notification.service';
import { ChuongtrinhDaotaoService } from '@services/tuyensinh/chuongtrinh-daotao.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { HosoThisinhService } from '@services/tuyensinh/hoso-thisinh.service';
import { NganhhocService } from '@services/tuyensinh/nganhhoc.service';
import { ExpHosoTuyensinhService } from '@services/tuyensinh/exp-hoso-tuyensinh.service';
import { UserService } from '@services/user.service';
import { SysRoleName } from '@models/role';
import { HosoXettuyenComponent } from './hoso-xettuyen.component';

describe('HosoXettuyenComponent lookup services', () => {
    const emptyResponse = {
        data: [],
        draw: 1,
        recordsTotal: 0,
        recordsFiltered: 0,
    };

    const hosoService = jasmine.createSpyObj<HosoThisinhService>('HosoThisinhService', ['query']);
    const dotService = jasmine.createSpyObj<DotXettuyenService>('DotXettuyenService', ['load']);
    const nganhHocService = jasmine.createSpyObj<NganhhocService>('NganhhocService', ['load']);
    const ctdtService = jasmine.createSpyObj<ChuongtrinhDaotaoService>('ChuongtrinhDaotaoService', ['query']);
    const locationService = jasmine.createSpyObj<LocationService>('LocationService', ['queryLocation']);
    const userService = jasmine.createSpyObj<UserService>('UserService', ['query']);
    const exportService = jasmine.createSpyObj<ExpHosoTuyensinhService>('ExpHosoTuyensinhService', ['exportExcel']);
    const authService = jasmine.createSpyObj<AuthenticationService>(
        'AuthenticationService',
        ['getUserPermission', 'userHasRole'],
        { userMenu: [], user: { id: 7 } as never },
    );
    const notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', ['toastError']);

    beforeEach(() => {
        hosoService.query.and.returnValue(of(emptyResponse));
        dotService.load.and.returnValue(of(emptyResponse));
        nganhHocService.load.and.returnValue(of({
            ...emptyResponse,
            data: [{ id: 11, name: 'Công nghệ thông tin', code: '7480201', is_active: true }],
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
        authService.getUserPermission.and.returnValue({ view: true, create: true, update: true, delete: true });
        authService.userHasRole.and.callFake((roles: SysRoleName[]): boolean => roles.includes('reviewer'));

        TestBed.configureTestingModule({
            providers: [
                FormBuilder,
                { provide: HosoThisinhService, useValue: hosoService },
                { provide: DotXettuyenService, useValue: dotService },
                { provide: NganhhocService, useValue: nganhHocService },
                { provide: ChuongtrinhDaotaoService, useValue: ctdtService },
                { provide: LocationService, useValue: locationService },
                { provide: UserService, useValue: userService },
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
        expect(component.programs()).toEqual([{ value: 21, label: 'CNTT — Chương trình chuẩn' }]);
    });

    it('forces reviewer permissions to view-only and blocks export', () => {
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());

        expect(component.permissionControl().canView).toBeTrue();
        expect(component.permissionControl().canCreate).toBeFalse();
        expect(component.permissionControl().canUpdate).toBeFalse();
        expect(component.permissionControl().canDelete).toBeFalse();
        expect(component.canExport()).toBeFalse();
    });

    it('loads the full list for reviewer without ownership conditions', () => {
        const component = TestBed.runInInjectionContext(() => new HosoXettuyenComponent());

        component.loadData();

        expect(hosoService.query).toHaveBeenCalledWith([], jasmine.any(Object));
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
});
