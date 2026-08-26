import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DotXettuyen } from '@models/tuyensinh/dot-xettuyen';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { DotXettuyenComponent } from './dot-xettuyen.component';

describe('DotXettuyenComponent contract', () => {
    const service = jasmine.createSpyObj<DotXettuyenService>('DotXettuyenService', [
        'load',
        'create',
        'update',
    ]);
    const authService = jasmine.createSpyObj<AuthenticationService>('AuthenticationService', [
        'getUserPermission',
    ]);
    const notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', [
        'toastSuccess',
        'toastError',
    ]);

    beforeEach(() => {
        service.load.and.returnValue(of({ data: [], recordsTotal: 0 } as never));
        service.create.and.returnValue(of({} as never));
        service.update.and.returnValue(of({} as never));
        authService.getUserPermission.and.returnValue({ view: true, create: true, update: true, delete: true });

        TestBed.configureTestingModule({
            providers: [
                FormBuilder,
                { provide: DotXettuyenService, useValue: service },
                { provide: AuthenticationService, useValue: authService },
                { provide: NotificationService, useValue: notificationService },
            ],
        });
    });

    function createComponent(): DotXettuyenComponent {
        return TestBed.runInInjectionContext(() => new DotXettuyenComponent());
    }

    it('uses numeric status options and defaults new rounds to open', () => {
        const component = createComponent();

        component.addItem();

        expect(component.optionList).toEqual([
            { value: 0, label: 'Đã đóng' },
            { value: 1, label: 'Đang mở' },
        ]);
        expect(component.formControl.formGroup.get('status')?.value).toBe(1);
    });

    it('preserves closed status and reads mota when editing', () => {
        const component = createComponent();
        const round = {
            id: 3,
            name: 'Đợt 1',
            thoi_gian_bat_dau: '2026-08-01',
            thoi_gian_ket_thuc: '2026-08-31',
            mota: 'Đợt tháng 8',
            status: 0,
        } as unknown as DotXettuyen;

        component.editItem(round);

        expect(component.formControl.formGroup.get('mota')?.value).toBe('Đợt tháng 8');
        expect(component.formControl.formGroup.get('status')?.value).toBe(0);
    });

    it('submits mota, numeric status and SQL date strings', () => {
        const component = createComponent();
        component.addItem();
        component.formControl.formGroup.setValue({
            name: 'Đợt 1',
            thoi_gian_bat_dau: new Date(2026, 7, 1),
            thoi_gian_ket_thuc: new Date(2026, 7, 31),
            mota: 'Đợt tháng 8',
            status: 1,
        });
        component.formControl.formGroup.markAllAsTouched();
        spyOn(component.formControl, 'closeForm');

        component.submitForm();

        expect(service.create).toHaveBeenCalledWith(jasmine.objectContaining({
            name: 'Đợt 1',
            thoi_gian_bat_dau: '2026-08-01',
            thoi_gian_ket_thuc: '2026-08-31',
            mota: 'Đợt tháng 8',
            status: 1,
        }));
    });
});
