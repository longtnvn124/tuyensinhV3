import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { HosoThisinh } from '@models/tuyensinh/hoso-thisinh';
import { User } from '@models/user';
import { AuthenticationService } from '@services/authentication.service';
import { LocationService } from '@services/location.service';
import { NotificationService } from '@services/notification.service';
import { UserService } from '@services/user.service';
import { ChuongtrinhDaotaoService } from '@services/tuyensinh/chuongtrinh-daotao.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { HosoThisinhService } from '@services/tuyensinh/hoso-thisinh.service';
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
    const hosoService = jasmine.createSpyObj<HosoThisinhService>('HosoThisinhService', [
        'updateTuyensinh',
        'addTuyensinh',
    ]);
    const notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', [
        'isProcessing',
        'toastSuccess',
        'toastError',
    ]);

    beforeEach(() => {
        activeRole = '';
        authenticationService.userHasRole.calls.reset();
        authenticationService.userHasRole.and.callFake((roles: string[]) => roles.includes(activeRole));
        hosoService.updateTuyensinh.calls.reset();
        hosoService.addTuyensinh.calls.reset();
        hosoService.updateTuyensinh.and.returnValue(of({}));
        hosoService.addTuyensinh.and.returnValue(of(1));

        TestBed.configureTestingModule({
            providers: [
                FormBuilder,
                { provide: AuthenticationService, useValue: authenticationService },
                { provide: HosoThisinhService, useValue: hosoService },
                { provide: TuyensinhStatusService, useValue: {} },
                { provide: NganhhocService, useValue: {} },
                { provide: ChuongtrinhDaotaoService, useValue: {} },
                { provide: LocationService, useValue: {} },
                { provide: NotificationService, useValue: notificationService },
                { provide: UserService, useValue: {} },
                { provide: ParentsService, useValue: {} },
                { provide: DotXettuyenService, useValue: {} },
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
            status_connent: 0,
            doituong: '00',
            anh_soyeulylich: 'so-yeu-ly-lich.jpg',
            owner_by: 7,
        } as HosoThisinh;

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

        component.submitData();

        const payload = hosoService.updateTuyensinh.calls.mostRecent().args[1];
        expect(payload.status).toBeUndefined();
    });
});
