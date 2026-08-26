import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthenticationService } from '@services/authentication.service';
import { LocationService } from '@services/location.service';
import { ChuongtrinhDaotaoService } from '@services/tuyensinh/chuongtrinh-daotao.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { NganhhocService } from '@services/tuyensinh/nganhhoc.service';
import { RegistrationsService } from '@services/tuyensinh/registrations.service';
import { IctuQueryCondition } from '@models/dto';
import { HosoKhongtrungtuyenComponent } from './hoso-khongtrungtuyen.component';

describe('HosoKhongtrungtuyenComponent', () => {
    const emptyResponse = {
        data: [],
        draw: 1,
        recordsTotal: 0,
        recordsFiltered: 0,
    };

    const registrationsService = jasmine.createSpyObj<RegistrationsService>('RegistrationsService', ['query', 'get']);
    const dotService = jasmine.createSpyObj<DotXettuyenService>('DotXettuyenService', ['load']);
    const nganhHocService = jasmine.createSpyObj<NganhhocService>('NganhhocService', ['load']);
    const ctdtService = jasmine.createSpyObj<ChuongtrinhDaotaoService>('ChuongtrinhDaotaoService', ['query']);
    const locationService = jasmine.createSpyObj<LocationService>('LocationService', ['queryLocation']);
    const authService = jasmine.createSpyObj<AuthenticationService>('AuthenticationService', ['getUserPermission']);

    function createComponent(canView: boolean): HosoKhongtrungtuyenComponent {
        authService.getUserPermission.and.returnValue({
            view: canView,
            create: true,
            update: true,
            delete: true,
        });
        registrationsService.query.and.returnValue(of(emptyResponse));
        dotService.load.and.returnValue(of(emptyResponse));
        nganhHocService.load.and.returnValue(of({
            ...emptyResponse,
            data: [{ id: 11, ten_nganh: 'Công nghệ thông tin', ma_nganh: '7480201', status: 1 }],
        } as never));
        ctdtService.query.and.returnValue(of(emptyResponse));
        locationService.queryLocation.and.returnValue(of(emptyResponse));

        return TestBed.runInInjectionContext(() => new HosoKhongtrungtuyenComponent());
    }

    beforeEach(() => {
        registrationsService.query.calls.reset();
        registrationsService.get.calls.reset();
        dotService.load.calls.reset();
        nganhHocService.load.calls.reset();
        ctdtService.query.calls.reset();
        locationService.queryLocation.calls.reset();
        authService.getUserPermission.calls.reset();

        TestBed.configureTestingModule({
            providers: [
                { provide: RegistrationsService, useValue: registrationsService },
                { provide: DotXettuyenService, useValue: dotService },
                { provide: NganhhocService, useValue: nganhHocService },
                { provide: ChuongtrinhDaotaoService, useValue: ctdtService },
                { provide: LocationService, useValue: locationService },
                { provide: AuthenticationService, useValue: authService },
            ],
        });
    });

    it('does not call data APIs when the user cannot view records', () => {
        const component = createComponent(false);

        component.ngOnInit();

        expect(component.state()).toBe('forbidden');
        expect(registrationsService.query).not.toHaveBeenCalled();
        expect(dotService.load).not.toHaveBeenCalled();
        expect(nganhHocService.load).not.toHaveBeenCalled();
        expect(ctdtService.query).not.toHaveBeenCalled();
        expect(locationService.queryLocation).not.toHaveBeenCalled();
    });

    it('always queries records with the non-admitted status', () => {
        const component = createComponent(true);

        component.ngOnInit();

        const conditions = registrationsService.query.calls.mostRecent().args[0];
        expect(conditions).toContain(jasmine.objectContaining({
            conditionName: 'status',
            value: 'KHONG_TRUNG_TUYEN',
            condition: IctuQueryCondition.equal,
        }));
    });

    it('filters by nganh_dangky using the selected ten_nganh', () => {
        const component = createComponent(true);
        component.ngOnInit();
        component.searchInfo.nganh_dangky = 'Công nghệ thông tin';
        registrationsService.query.calls.reset();

        component.loadData();

        const conditions = registrationsService.query.calls.mostRecent().args[0];
        expect(component.majors()).toEqual([{ value: 11, label: 'Công nghệ thông tin' }]);
        expect(component.majorFilterOptions()).toEqual([{ value: 'Công nghệ thông tin', label: 'Công nghệ thông tin' }]);
        expect(conditions).toContain(jasmine.objectContaining({
            conditionName: 'nganh_dangky',
            value: 'Công nghệ thông tin',
            condition: IctuQueryCondition.equal,
        }));
    });

    it('keeps the non-admitted status after resetting filters', () => {
        const component = createComponent(true);
        component.ngOnInit();
        component.searchInfo.search = 'Nguyen Van A';
        component.searchInfo.cccd = '012345678901';
        registrationsService.query.calls.reset();

        component.resetFilter();

        expect(component.searchInfo.search).toBe('');
        expect(component.searchInfo.cccd).toBeUndefined();
        const conditions = registrationsService.query.calls.mostRecent().args[0];
        expect(conditions).toContain(jasmine.objectContaining({
            conditionName: 'status',
            value: 'KHONG_TRUNG_TUYEN',
        }));
    });
});
