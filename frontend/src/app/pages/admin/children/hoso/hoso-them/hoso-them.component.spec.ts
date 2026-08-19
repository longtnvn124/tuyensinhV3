import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { NotificationService } from '@services/notification.service';
import { ChuongtrinhDaotaoService } from '@services/tuyensinh/chuongtrinh-daotao.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { NganhhocService } from '@services/tuyensinh/nganhhoc.service';
import { HosoThemComponent } from './hoso-them.component';

describe('HosoThemComponent lookup services', () => {
    const emptyResponse = {
        data: [],
        draw: 1,
        recordsTotal: 0,
        recordsFiltered: 0,
    };

    const dotService = jasmine.createSpyObj<DotXettuyenService>('DotXettuyenService', ['load']);
    const nganhHocService = jasmine.createSpyObj<NganhhocService>('NganhhocService', ['load']);
    const ctdtService = jasmine.createSpyObj<ChuongtrinhDaotaoService>('ChuongtrinhDaotaoService', ['load']);
    const notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', ['toastError']);

    beforeEach(() => {
        dotService.load.and.returnValue(of(emptyResponse));
        nganhHocService.load.and.returnValue(of({
            ...emptyResponse,
            data: [{ id: 11, name: 'Công nghệ thông tin', code: '7480201', is_active: true }],
        } as never));
        ctdtService.load.and.returnValue(of({
            ...emptyResponse,
            data: [{
                id: 21,
                major_id: 11,
                name: 'Chương trình chuẩn',
                code: 'CNTT',
                thoi_gian_dao_tao: '4 năm',
                danh_hieu_tot_nghiep: 'Kỹ sư',
                is_active: true,
            }],
        } as never));

        TestBed.configureTestingModule({
            providers: [
                { provide: DotXettuyenService, useValue: dotService },
                { provide: NganhhocService, useValue: nganhHocService },
                { provide: ChuongtrinhDaotaoService, useValue: ctdtService },
                { provide: NotificationService, useValue: notificationService },
            ],
        });
    });

    it('loads ngành from the internal service', () => {
        const component = TestBed.runInInjectionContext(() => new HosoThemComponent());

        component.ngOnInit();

        expect(nganhHocService.load).toHaveBeenCalledWith({ search: '' }, { limit: -1 });
        expect(component.nganhOptions()).toEqual([{ value: 11, label: 'Công nghệ thông tin' }]);
    });

    it('loads chương trình by major from the internal service', () => {
        const component = TestBed.runInInjectionContext(() => new HosoThemComponent());

        component.onMajorChange(11);

        expect(ctdtService.load).toHaveBeenCalledWith({ search: '' }, 11, { limit: -1 });
        expect(component.chuongTrinhOptions()).toEqual([{
            value: 21,
            label: 'CNTT — Chương trình chuẩn',
            raw: jasmine.objectContaining({ id: 21, major_id: 11 }),
        }]);
        component.selectProgram(21);
        expect(component.selectedProgramDuration()).toBe('4 năm');
        expect(component.selectedProgramDegree()).toBe('Kỹ sư');
    });
});
