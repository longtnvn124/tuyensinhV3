import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { LocationService } from '@services/location.service';
import { NotificationService } from '@services/notification.service';
import { HoidongHosoThisinhService } from '@services/tuyensinh/hoidong-hoso-thisinh.service';
import { HosoThisinhService } from '@services/tuyensinh/hoso-thisinh.service';
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
    const hosoService = jasmine.createSpyObj<HosoThisinhService>('HosoThisinhService', ['load']);
    const nganhHocService = jasmine.createSpyObj<NganhhocService>('NganhhocService', ['load']);
    const locationService = jasmine.createSpyObj<LocationService>('LocationService', ['queryLocation']);
    const notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', ['toastError']);

    function createComponent(): HosoListComponent {
        assignmentService.loadByHoidong.and.returnValue(of(emptyResponse));
        hosoService.load.and.returnValue(of(emptyResponse));
        nganhHocService.load.and.returnValue(of({
            ...emptyResponse,
            data: [{ id: 12, name: 'Công nghệ thông tin', code: 'CNTT', is_active: true }],
        } as never));
        locationService.queryLocation.and.returnValue(of(emptyResponse));

        return TestBed.runInInjectionContext(() => new HosoListComponent());
    }

    beforeEach(() => {
        assignmentService.loadByHoidong.calls.reset();
        hosoService.load.calls.reset();
        nganhHocService.load.calls.reset();
        locationService.queryLocation.calls.reset();
        notificationService.toastError.calls.reset();

        TestBed.configureTestingModule({
            providers: [
                { provide: HoidongHosoThisinhService, useValue: assignmentService },
                { provide: HosoThisinhService, useValue: hosoService },
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
        expect(component.majorOptions()).toEqual([{ value: 12, label: 'Công nghệ thông tin' }]);
    });

    it('filters candidates by the council admission round when opening the dialog', () => {
        const component = createComponent();
        component.hoidong = hoidong;

        component.openAssignDialog();

        expect(component.assignIncludeCurrentRound).toBeTrue();
        expect(hosoService.load).toHaveBeenCalledWith(
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
        expect(hosoService.load).toHaveBeenCalledWith(
            { search: '', dotxettuyen_id: undefined },
            { limit: 500, paged: 1 },
        );
    });

    it('adds the admission round back to the query when the checkbox is selected', () => {
        const component = createComponent();
        component.hoidong = hoidong;
        component.assignIncludeCurrentRound = false;

        component.onAssignRoundFilterChange(true);

        expect(hosoService.load).toHaveBeenCalledWith(
            { search: '', dotxettuyen_id: 3 },
            { limit: 500, paged: 1 },
        );
    });

    it('passes the candidate name search to HosoThisinhService', () => {
        const component = createComponent();
        component.hoidong = hoidong;
        component.assignSearch = 'Nguyễn Văn A';

        component.onAssignSearch();

        expect(hosoService.load).toHaveBeenCalledWith(
            { search: 'Nguyễn Văn A', dotxettuyen_id: 3 },
            { limit: 500, paged: 1 },
        );
    });

    it('ignores an older candidate response after filters change', () => {
        const component = createComponent();
        const oldRequest = new Subject<never>();
        const newRequest = new Subject<never>();
        component.hoidong = hoidong;
        hosoService.load.and.returnValues(oldRequest, newRequest);

        component.loadCandidates();
        component.onAssignRoundFilterChange(false);
        newRequest.next({ data: [{ id: 2 }] } as never);
        oldRequest.next({ data: [{ id: 1 }] } as never);

        expect(component.assignCandidates.map(({ id }) => id)).toEqual([2]);
    });
});
