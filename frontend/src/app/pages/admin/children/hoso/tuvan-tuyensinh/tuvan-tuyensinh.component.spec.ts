import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { HosoThisinh } from '@models/tuyensinh/hoso-thisinh';
import { LichsuTuvan } from '@models/tuyensinh/lichsu-tuvan';
import { User } from '@models/user';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { LichsuTuvanService } from '@services/tuyensinh/lichsu-tuvan.service';
import { TuvanTuyensinhComponent } from './tuvan-tuyensinh.component';

describe('TuvanTuyensinhComponent readOnly', () => {
    const lichsuTuvanService = jasmine.createSpyObj<LichsuTuvanService>('LichsuTuvanService', ['query', 'create', 'delete']);
    const authenticationService = jasmine.createSpyObj<AuthenticationService>('AuthenticationService', ['userHasRole'], {
        user: { id: 7 } as User,
    });
    const notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', [
        'toastSuccess',
        'toastError',
        'confirmDelete',
    ]);

    const hoso = {
        id: 12,
        ho_va_ten: 'Nguyen Van A',
        dien_thoai: '0912345678',
        gioi_tinh: 'NAM',
        status: 'MOI',
        status_connent: 0,
        doituong: '00',
        anh_soyeulylich: 'so-yeu-ly-lich.jpg',
        owner_by: 7,
    } as unknown as HosoThisinh;
    const history = { id: 3, hoso_id: 12, user_id: 7 } as LichsuTuvan;

    beforeEach(() => {
        lichsuTuvanService.query.calls.reset();
        lichsuTuvanService.create.calls.reset();
        lichsuTuvanService.delete.calls.reset();
        authenticationService.userHasRole.calls.reset();
        authenticationService.userHasRole.and.returnValue(false);
        lichsuTuvanService.query.and.returnValue(of({
            data: [],
            draw: 1,
            recordsTotal: 0,
            recordsFiltered: 0,
        }));

        TestBed.configureTestingModule({
            providers: [
                FormBuilder,
                { provide: AuthenticationService, useValue: authenticationService },
                { provide: NotificationService, useValue: notificationService },
                { provide: LichsuTuvanService, useValue: lichsuTuvanService },
            ],
        });
    });

    function createComponent(): TuvanTuyensinhComponent {
        return TestBed.runInInjectionContext(() => new TuvanTuyensinhComponent());
    }

    it('keeps the history view when showForm is called in read-only mode', () => {
        const component = createComponent();
        component.readOnly = true;
        component.hoso = hoso;

        component.showForm();

        expect(component.viewState()).toBe('history');
    });

    it('does not create a history entry in read-only mode', () => {
        const component = createComponent();
        component.readOnly = true;
        component.hoso = hoso;

        component.submit();

        expect(lichsuTuvanService.create).not.toHaveBeenCalled();
    });

    it('does not delete a history entry in read-only mode', () => {
        const component = createComponent();
        component.readOnly = true;
        component.hoso = hoso;

        component.deleteHistory(history);

        expect(notificationService.confirmDelete).not.toHaveBeenCalled();
        expect(lichsuTuvanService.delete).not.toHaveBeenCalled();
    });
});
