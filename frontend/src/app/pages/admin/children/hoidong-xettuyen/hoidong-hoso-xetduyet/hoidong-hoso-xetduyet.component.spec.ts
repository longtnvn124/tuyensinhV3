import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { LocationService } from '@services/location.service';
import { NotificationService } from '@services/notification.service';
import { ExpHosoDaduyetService } from '@services/tuyensinh/exp-hoso-daduyet.service';
import { HoidongHosoThisinhService } from '@services/tuyensinh/hoidong-hoso-thisinh.service';
import { HosoThisinhService } from '@services/tuyensinh/hoso-thisinh.service';
import { NganhhocService } from '@services/tuyensinh/nganhhoc.service';
import { HoidongHosoXetduyetComponent } from './hoidong-hoso-xetduyet.component';

describe('HoidongHosoXetduyetComponent', () => {
    const emptyResponse = {
        data: [],
        draw: 1,
        recordsTotal: 0,
        recordsFiltered: 0,
    };

    const assignmentService = jasmine.createSpyObj<HoidongHosoThisinhService>('HoidongHosoThisinhService', ['query']);
    const hosoService = jasmine.createSpyObj<HosoThisinhService>('HosoThisinhService', ['query', 'update']);
    const nganhHocService = jasmine.createSpyObj<NganhhocService>('NganhhocService', ['load']);
    const locationService = jasmine.createSpyObj<LocationService>('LocationService', ['queryLocation']);
    const notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', [
        'progressBarWithPercent',
        'startProgressAnimation',
        'toastError',
        'toastSuccess',
    ]);
    const exportService = jasmine.createSpyObj<ExpHosoDaduyetService>('ExpHosoDaduyetService', ['exportExcel']);

    beforeEach(() => {
        assignmentService.query.and.returnValue(of(emptyResponse));
        hosoService.query.and.returnValue(of(emptyResponse));
        nganhHocService.load.and.returnValue(of({
            ...emptyResponse,
            data: [{ id: 12, name: 'Công nghệ thông tin', code: 'CNTT', is_active: true }],
        } as never));
        locationService.queryLocation.and.returnValue(of(emptyResponse));

        TestBed.configureTestingModule({
            imports: [HoidongHosoXetduyetComponent],
            providers: [
                { provide: HoidongHosoThisinhService, useValue: assignmentService },
                { provide: HosoThisinhService, useValue: hosoService },
                { provide: NganhhocService, useValue: nganhHocService },
                { provide: LocationService, useValue: locationService },
                { provide: NotificationService, useValue: notificationService },
                { provide: ExpHosoDaduyetService, useValue: exportService },
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
});
