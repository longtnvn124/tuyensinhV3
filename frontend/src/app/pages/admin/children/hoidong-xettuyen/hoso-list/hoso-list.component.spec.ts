import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { LocationService } from '@services/location.service';
import { NotificationService } from '@services/notification.service';
import { HoidongHosoThisinhService } from '@services/tuyensinh/hoidong-hoso-thisinh.service';
import { RegistrationsService } from '@services/tuyensinh/registrations.service';
import { NganhhocService } from '@services/tuyensinh/nganhhoc.service';
import { HoidongXettuyen } from '@models/tuyensinh/hoidong-xettuyen';
import { HosoListComponent } from './hoso-list.component';

describe('HosoListComponent', () => {
    const emptyResponse = {
        data: [],
        draw: 1,
        recordsTotal: 0,
        recordsFiltered: 0,
    };
    const hoidong = {
        id: 8,
        dot_xettuyen_id: 3,
    } as HoidongXettuyen;

    const assignmentService = jasmine.createSpyObj<HoidongHosoThisinhService>('HoidongHosoThisinhService', ['loadByHoidong']);
    const registrationsService = jasmine.createSpyObj<RegistrationsService>('RegistrationsService', ['load']);
    const nganhHocService = jasmine.createSpyObj<NganhhocService>('NganhhocService', ['load']);
    const locationService = jasmine.createSpyObj<LocationService>('LocationService', ['queryLocation']);
    const notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', ['toastError']);

    function createComponent(): HosoListComponent {
        assignmentService.loadByHoidong.and.returnValue(of(emptyResponse));
        registrationsService.load.and.returnValue(of(emptyResponse));
        nganhHocService.load.and.returnValue(of({
            ...emptyResponse,
            data: [{ id: 12, ten_nganh: 'Công nghệ thông tin', ma_nganh: 'CNTT', status: 1 }],
        } as never));
        locationService.queryLocation.and.returnValue(of(emptyResponse));

        return TestBed.runInInjectionContext(() => new HosoListComponent());
    }

    beforeEach(() => {
        assignmentService.loadByHoidong.calls.reset();
        registrationsService.load.calls.reset();
        nganhHocService.load.calls.reset();
        locationService.queryLocation.calls.reset();
        notificationService.toastError.calls.reset();

        TestBed.configureTestingModule({
            providers: [
                { provide: HoidongHosoThisinhService, useValue: assignmentService },
                { provide: RegistrationsService, useValue: registrationsService },
                { provide: NganhhocService, useValue: nganhHocService },
                { provide: LocationService, useValue: locationService },
                { provide: NotificationService, useValue: notificationService },
            ],
        });
    });

    it('loads major labels from NganhhocService', () => {
        const component = createComponent();

        component.ngOnInit();

        expect(nganhHocService.load).toHaveBeenCalledWith({ search: '' }, { limit: -1 });
        expect(component.majorOptions()).toEqual([{ value: 'Công nghệ thông tin', label: 'Công nghệ thông tin' }]);
    });

    it('filters candidates by the council admission round when opening the dialog', () => {
        const component = createComponent();
        component.hoidong = hoidong;

        component.openAssignDialog();

        expect(component.assignIncludeCurrentRound).toBeTrue();
        expect(registrationsService.load).toHaveBeenCalledWith(
            { search: '', dotxettuyen_id: 3 },
            { limit: 500, paged: 1 },
        );
    });

    it('removes the admission round from the query when the checkbox is cleared', () => {
        const component = createComponent();
        component.hoidong = hoidong;
        component.selectedAssignIds = new Set([21]);

        component.onAssignRoundFilterChange(false);

        expect(component.selectedAssignIds.size).toBe(0);
        expect(registrationsService.load).toHaveBeenCalledWith(
            { search: '', dotxettuyen_id: undefined },
            { limit: 500, paged: 1 },
        );
    });

    it('adds the admission round back to the query when the checkbox is selected', () => {
        const component = createComponent();
        component.hoidong = hoidong;
        component.assignIncludeCurrentRound = false;

        component.onAssignRoundFilterChange(true);

        expect(registrationsService.load).toHaveBeenCalledWith(
            { search: '', dotxettuyen_id: 3 },
            { limit: 500, paged: 1 },
        );
    });

    it('passes the candidate name search to RegistrationsService', () => {
        const component = createComponent();
        component.hoidong = hoidong;
        component.assignSearch = 'Nguyễn Văn A';

        component.onAssignSearch();

        expect(registrationsService.load).toHaveBeenCalledWith(
            { search: 'Nguyễn Văn A', dotxettuyen_id: 3 },
            { limit: 500, paged: 1 },
        );
    });

    it('ignores an older candidate response after filters change', () => {
        const component = createComponent();
        const oldRequest = new Subject<never>();
        const newRequest = new Subject<never>();
        component.hoidong = hoidong;
        registrationsService.load.and.returnValues(oldRequest, newRequest);

        component.loadCandidates();
        component.onAssignRoundFilterChange(false);
        newRequest.next({ data: [{ id: 2 }] } as never);
        oldRequest.next({ data: [{ id: 1 }] } as never);

        expect(component.assignCandidates.map(({ id }) => id)).toEqual([2]);
    });
});
