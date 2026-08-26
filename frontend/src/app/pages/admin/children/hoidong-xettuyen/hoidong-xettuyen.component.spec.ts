import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { HoidongXettuyenService } from '@services/tuyensinh/hoidong-xettuyen.service';
import { HoidongXettuyen } from '@models/tuyensinh/hoidong-xettuyen';
import { HoidongXettuyenComponent } from './hoidong-xettuyen.component';

describe('HoidongXettuyenComponent', () => {
    const emptyResponse = {
        data: [],
        draw: 1,
        recordsTotal: 0,
        recordsFiltered: 0,
    };

    const service = jasmine.createSpyObj<HoidongXettuyenService>('HoidongXettuyenService', ['create', 'update', 'load']);
    const dotService = jasmine.createSpyObj<DotXettuyenService>('DotXettuyenService', ['load']);
    const auth = jasmine.createSpyObj<AuthenticationService>('AuthenticationService', ['getUserPermission']);
    const notification = jasmine.createSpyObj<NotificationService>('NotificationService', ['toastSuccess', 'toastError']);

    function createComponent(): HoidongXettuyenComponent {
        dotService.load.and.returnValue(of(emptyResponse));
        service.create.and.returnValue(of(undefined));
        service.update.and.returnValue(of(undefined));
        service.load.and.returnValue(of(emptyResponse));
        auth.getUserPermission.and.returnValue([] as never);

        return TestBed.runInInjectionContext(() => new HoidongXettuyenComponent());
    }

    beforeEach(() => {
        service.create.calls.reset();
        service.update.calls.reset();
        service.load.calls.reset();
        dotService.load.calls.reset();
        notification.toastSuccess.calls.reset();
        notification.toastError.calls.reset();

        TestBed.configureTestingModule({
            providers: [
                { provide: HoidongXettuyenService, useValue: service },
                { provide: DotXettuyenService, useValue: dotService },
                { provide: AuthenticationService, useValue: auth },
                { provide: NotificationService, useValue: notification },
            ],
        });
    });

    it('creates controls matching the HoidongXettuyen interface', () => {
        const component = createComponent();

        component.addItem();

        expect(component.formControl.formGroup.getRawValue()).toEqual({
            tieu_de_hoi_dong: '',
            mo_ta_hoi_dong: '',
            dot_xettuyen_id: null,
            ngay_xettuyen: null,
            status: 'dang_mo',
        });
    });

    it('maps an existing council into the edit form', () => {
        const component = createComponent();
        const council = {
            id: 8,
            tieu_de_hoi_dong: 'Hội đồng tháng 8',
            mo_ta_hoi_dong: 'Xét tuyển đợt bổ sung',
            dot_xettuyen_id: 3,
            ngay_xettuyen: '2026-08-25',
            status: 'da_dong',
        } as HoidongXettuyen;

        component.editItem(council);

        const value = component.formControl.formGroup.getRawValue();
        expect(value).toEqual(jasmine.objectContaining({
            tieu_de_hoi_dong: 'Hội đồng tháng 8',
            mo_ta_hoi_dong: 'Xét tuyển đợt bổ sung',
            dot_xettuyen_id: 3,
            status: 'da_dong',
        }));
        expect(value.ngay_xettuyen).toEqual(new Date('2026-08-25'));
    });

    it('submits a payload using the interface field names', () => {
        const component = createComponent();
        component.addItem();
        component.formControl.formGroup.setValue({
            tieu_de_hoi_dong: 'Hội đồng tháng 8',
            mo_ta_hoi_dong: 'Xét tuyển đợt bổ sung',
            dot_xettuyen_id: 3,
            ngay_xettuyen: new Date(2026, 7, 25),
            status: 'dang_mo',
        });
        component.formControl.formGroup.markAllAsTouched();

        component.submitForm();

        expect(service.create).toHaveBeenCalledOnceWith({
            tieu_de_hoi_dong: 'Hội đồng tháng 8',
            mo_ta_hoi_dong: 'Xét tuyển đợt bổ sung',
            dot_xettuyen_id: 3,
            ngay_xettuyen: '2026-08-25',
            status: 'dang_mo',
        });
    });
});
