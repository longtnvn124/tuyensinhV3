import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { IctuQueryCondition } from '@models/dto';
import { Registrations } from '@models/tuyensinh/registrations';
import { User } from '@models/user';
import { AuthenticationService } from '@services/authentication.service';
import { LocationService } from '@services/location.service';
import { NotificationService } from '@services/notification.service';
import { UserService } from '@services/user.service';
import { ChuongtrinhDaotaoService } from '@services/tuyensinh/chuongtrinh-daotao.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { RegistrationsService } from '@services/tuyensinh/registrations.service';
import { NganhhocService } from '@services/tuyensinh/nganhhoc.service';
import { ParentsService } from '@services/tuyensinh/parents';
import { TuyensinhStatusService } from '@services/tuyensinh/tuyensinh-status.service';
import { TH_XETTUYEN } from '@utilities/syscats';
import { FormThongtinDangkyComponent } from './form-thongtin-dangky.component';

describe('FormThongtinDangkyComponent status access', () => {
    let activeRole = '';
    const authenticationService = jasmine.createSpyObj<AuthenticationService>('AuthenticationService', ['userHasRole'], {
        user: { id: 7 } as User,
    });
    const registrationsService = jasmine.createSpyObj<RegistrationsService>('RegistrationsService', [
        'updateRegistration',
        'addRegistration',
    ]);
    const notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', [
        'isProcessing',
        'toastSuccess',
        'toastError',
    ]);
    const locationService = jasmine.createSpyObj<LocationService>('LocationService', ['queryLocation']);
    const userService = jasmine.createSpyObj<UserService>('UserService', ['query']);
    const nganhhocService = jasmine.createSpyObj<NganhhocService>('NganhhocService', ['load']);
    const dotXettuyenService = jasmine.createSpyObj<DotXettuyenService>('DotXettuyenService', ['query']);

    beforeEach(() => {
        activeRole = '';
        authenticationService.userHasRole.calls.reset();
        authenticationService.userHasRole.and.callFake((roles: string[]) => roles.includes(activeRole));
        registrationsService.updateRegistration.calls.reset();
        registrationsService.addRegistration.calls.reset();
        registrationsService.updateRegistration.and.returnValue(of({}));
        registrationsService.addRegistration.and.returnValue(of(1));
        locationService.queryLocation.calls.reset();
        userService.query.calls.reset();
        nganhhocService.load.calls.reset();
        dotXettuyenService.query.calls.reset();
        locationService.queryLocation.and.returnValue(of({ data: [] } as never));
        userService.query.and.returnValue(of({ data: [] } as never));
        nganhhocService.load.and.returnValue(of({ data: [] } as never));
        dotXettuyenService.query.and.returnValue(of({ data: [] } as never));

        TestBed.configureTestingModule({
            providers: [
                FormBuilder,
                { provide: AuthenticationService, useValue: authenticationService },
                { provide: RegistrationsService, useValue: registrationsService },
                { provide: TuyensinhStatusService, useValue: {} },
                { provide: NganhhocService, useValue: nganhhocService },
                { provide: ChuongtrinhDaotaoService, useValue: {} },
                { provide: LocationService, useValue: locationService },
                { provide: NotificationService, useValue: notificationService },
                { provide: UserService, useValue: userService },
                { provide: ParentsService, useValue: {} },
                { provide: DotXettuyenService, useValue: dotXettuyenService },
            ],
        });
    });

    function createComponent(role: string): FormThongtinDangkyComponent {
        activeRole = role;
        return TestBed.runInInjectionContext(() => new FormThongtinDangkyComponent());
    }

    for (const role of ['admin', 'manager', 'direction']) {
        it(`allows ${role} to update status`, () => {
            expect(createComponent(role).canUpdateStatus()).toBeTrue();
        });
    }

    it('does not allow other roles to update status', () => {
        expect(createComponent('staff').canUpdateStatus()).toBeFalse();
    });

    it('loads only the active numeric admission round', () => {
        const component = createComponent('admin');

        component.loadLookups();

        expect(dotXettuyenService.query).toHaveBeenCalledWith([
            {
                conditionName: 'status',
                condition: IctuQueryCondition.equal,
                value: '1',
                orWhere: 'and',
            },
        ], { limit: 1, paged: 1 });
    });

    it('disables the entire form for reviewer', () => {
        const component = createComponent('reviewer');

        expect(component.formData.disabled).toBeTrue();
    });

    it('does not submit updates for reviewer', () => {
        const component = createComponent('reviewer');
        component.dataId = 12;

        component.submitData();

        expect(registrationsService.updateRegistration).not.toHaveBeenCalled();
        expect(registrationsService.addRegistration).not.toHaveBeenCalled();
    });

    it('builds status options from TH_XETTUYEN', () => {
        const component = createComponent('admin');

        expect(component.statusOptions).toEqual(TH_XETTUYEN.map(({ label, value }) => ({ label, value })));
    });

    it('patches the current status when editing a record', () => {
        const component = createComponent('admin');
        const record = {
            id: 12,
            ho_va_ten: 'Nguyen Van A',
            dien_thoai: '0912345678',
            gioi_tinh: 'nam',
            status: 3,
            status_connect: 0,
            doituong: '00',
            anh_soyeulylich: 'so-yeu-ly-lich.jpg',
            owner_by: 7,
        } as Registrations;

        component.getFormData(record);

        expect(component.formData.controls['status'].value).toBe(3);
    });

    it('does not send status updates for other roles', () => {
        const component = createComponent('staff');
        component.dataId = 12;
        component.formData.patchValue({
            ho_va_ten: 'Nguyen Van A',
            ngay_sinh: '2000-01-01',
            dien_thoai: '0912345678',
            gioi_tinh: 'nam',
            dan_toc: 'Kinh',
            cccd: '012345678901',
            anh_soyeulylich: 'so-yeu-ly-lich.jpg',
            status: 3,
        });
        Object.values(component.formData.controls).forEach((control) => {
            control.clearValidators();
            control.updateValueAndValidity();
        });

        component.submitData();

        const payload = registrationsService.updateRegistration.calls.mostRecent().args[1];
        expect(payload.status).toBeUndefined();
    });
});
