import { Component, inject, OnDestroy, OnInit, Signal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { IctuDataTable, IctuDataTablePaginatorInfo } from '@models/datatable';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { IctuBasePermission, IctuPermissionControl } from '@models/ictu-base-model';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { Locations } from '@models/location';
import { ChuongtrinhDaotao } from '@models/tuyensinh/chuongtrinh-daotao';
import { DotXettuyen } from '@models/tuyensinh/dot-xettuyen';
import { HosoStatus, HosoThisinh } from '@models/tuyensinh/hoso-thisinh';
import { Nganhhoc } from '@models/tuyensinh/nganhhoc';
import { AuthenticationService } from '@services/authentication.service';
import { LocationService } from '@services/location.service';
import { ChuongtrinhDaotaoService } from '@services/tuyensinh/chuongtrinh-daotao.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { HosoThisinhService } from '@services/tuyensinh/hoso-thisinh.service';
import { NganhhocService } from '@services/tuyensinh/nganhhoc.service';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { DanToc, TH_XETTUYEN } from '@utilities/syscats';
import { Drawer } from 'primeng/drawer';
import { InputText } from 'primeng/inputtext';
import { Popover } from 'primeng/popover';
import { Select } from 'primeng/select';
import { forkJoin, map, Subject, takeUntil } from 'rxjs';

import { TuvanTuyensinhComponent } from '../tuvan-tuyensinh/tuvan-tuyensinh.component';

type ViewState = 'idle' | 'loading' | 'success' | 'error' | 'forbidden';
type DetailState = 'idle' | 'loading' | 'success' | 'error';

interface HosoTrungTuyenSearchInfo {
    search: string;
    dotxettuyen_id?: number;
    nganh_id?: number;
    cccd?: string;
    dia_chi_tinh?: number;
    noi_sinh?: number;
    dan_toc?: string;
}

const ADMITTED_STATUS: HosoStatus = 3;

@Component({
    selector: 'app-hoso-trungtuyen',
    standalone: true,
    imports: [
        Drawer,
        FormsModule,
        IctuPaginatorComponent,
        InputText,
        LoadingProgressComponent,
        MatButton,
        Popover,
        Select,
        TuvanTuyensinhComponent,
    ],
    templateUrl: './hoso-trungtuyen.component.html',
    styleUrl: './hoso-trungtuyen.component.css',
})
export class HosoTrungtuyenComponent implements OnInit, OnDestroy, IctuBasePermission {
    private readonly hosoService = inject(HosoThisinhService);
    private readonly dotService = inject(DotXettuyenService);
    private readonly nganhHocService = inject(NganhhocService);
    private readonly ctdtService = inject(ChuongtrinhDaotaoService);
    private readonly locationService = inject(LocationService);
    private readonly authenticationService = inject(AuthenticationService);
    private readonly onDestroy$ = new Subject<void>();

    readonly permissionControl: Signal<IctuPermissionControl> = signal(
        new IctuPermissionControl(this.authenticationService.getUserPermission('hoso-trungtuyen')),
    );
    readonly state = signal<ViewState>('idle');
    readonly detailState = signal<DetailState>('idle');
    readonly dataTable = new IctuDataTable<HosoThisinh>();
    readonly dots = signal<IctuDropdownOption<number>[]>([]);
    readonly majors = signal<IctuDropdownOption<number>[]>([]);
    readonly programs = signal<IctuDropdownOption<number>[]>([]);
    readonly tinhList = signal<IctuDropdownOption<number>[]>([]);
    readonly consultationDrawerVisible = signal(false);
    readonly selectedConsultationHoso = signal<HosoThisinh | null>(null);
    readonly viewDetailVisible = signal(false);
    readonly viewDetailData = signal<HosoThisinh | null>(null);
    readonly selectedDetailId = signal<number | null>(null);

    readonly danTocOptions: IctuDropdownOption<string>[] = DanToc.map((item) => ({
        value: item.name,
        label: item.label,
    }));
    searchInfo: HosoTrungTuyenSearchInfo = this.emptySearchInfo();
    private lastRequest: IctuDataTablePaginatorInfo = { paged: 1, resetPaginator: true };

    ngOnInit(): void {
        if (!this.permissionControl().canView) {
            this.state.set('forbidden');
            return;
        }

        this.loadLookups();
        this.loadData();
    }

    ngOnDestroy(): void {
        this.onDestroy$.next();
        this.onDestroy$.complete();
    }

    loadData(paged: number = 1, resetPaginator: boolean = true): void {
        if (!this.permissionControl().canView) {
            this.state.set('forbidden');
            return;
        }

        this.state.set('loading');
        this.lastRequest = { paged, resetPaginator };
        const queryParams: IctuQueryParams = {
            limit: this.dataTable.paginator.rows(),
            paged,
            order: 'DESC',
            orderby: 'created_at',
        };

        this.hosoService.query(this.buildConditions(), queryParams).pipe(
            takeUntil(this.onDestroy$),
            map((response: DtoObject<HosoThisinh[]>): HosoThisinh[] => {
                if (resetPaginator) {
                    this.dataTable.paginator.setupPaginator(response);
                } else {
                    this.dataTable.paginator.changePage(paged);
                }
                return response.data ?? [];
            }),
        ).subscribe({
            next: (data: HosoThisinh[]): void => {
                this.dataTable.fillData(data);
                this.state.set('success');
            },
            error: (): void => {
                this.dataTable.fillData([]);
                this.state.set('error');
            },
        });
    }

    onSearch(): void {
        this.loadData(1, true);
    }

    applyFilter(popover?: Popover): void {
        popover?.hide();
        this.loadData(1, true);
    }

    resetFilter(popover?: Popover): void {
        this.searchInfo = this.emptySearchInfo();
        popover?.hide();
        this.loadData(1, true);
    }

    onChangePage(paged: number): void {
        this.loadData(paged, false);
    }

    reload(event?: Event): void {
        event?.preventDefault();
        this.loadData(this.lastRequest.paged, this.lastRequest.resetPaginator);
    }

    openLichSu(row: HosoThisinh): void {
        this.selectedConsultationHoso.set({ ...row });
        this.consultationDrawerVisible.set(true);
    }

    closeConsultation(): void {
        this.consultationDrawerVisible.set(false);
        this.selectedConsultationHoso.set(null);
    }

    viewDetail(row: HosoThisinh): void {
        this.selectedDetailId.set(row.id);
        this.viewDetailData.set(null);
        this.detailState.set('loading');
        this.viewDetailVisible.set(true);
        this.loadDetail(row.id);
    }

    retryDetail(): void {
        const id = this.selectedDetailId();
        if (id !== null) {
            this.loadDetail(id);
        }
    }

    closeDetail(): void {
        this.viewDetailVisible.set(false);
        this.viewDetailData.set(null);
        this.selectedDetailId.set(null);
        this.detailState.set('idle');
    }

    statusLabel(status: HosoStatus | string | undefined): string {
        if (status === undefined || status === '') {
            return '—';
        }
        const normalizedStatus = `${status}`.trim().toUpperCase();
        return TH_XETTUYEN.find((item) =>
            `${item.value}` === normalizedStatus || item.kyhieu === normalizedStatus,
        )?.label ?? `${status}`;
    }

    statusBadgeClass(status: HosoStatus | string | undefined): string {
        const normalizedStatus = `${status ?? ''}`.trim().toUpperCase();
        return normalizedStatus === `${ADMITTED_STATUS}` || normalizedStatus === 'TRUNG_TUYEN'
            ? 'ictu-badge--success'
            : 'ictu-badge--secondary';
    }

    majorLabel(majorId: number | undefined): string {
        return this.lookupLabel(this.majors(), majorId);
    }

    programLabel(programId: number | undefined): string {
        return this.lookupLabel(this.programs(), programId);
    }

    dotLabel(dotId: number | undefined): string {
        return this.lookupLabel(this.dots(), dotId);
    }

    tinhLabel(tinh: string | number | undefined): string {
        return typeof tinh == 'number' ? this.lookupLabel(this.tinhList(), tinh) : (tinh || '—');
    }

    private loadLookups(): void {
        const queryParams: IctuQueryParams = { limit: -1 };
        forkJoin({
            dots: this.dotService.load({ search: '' }, queryParams).pipe(
                map((response: DtoObject<DotXettuyen[]>): IctuDropdownOption<number>[] =>
                    (response.data ?? []).map((item: DotXettuyen) => ({ value: item.id, label: item.name })),
                ),
            ),
            majors: this.nganhHocService.load({ search: '' }, queryParams).pipe(
                map((response: DtoObject<Nganhhoc[]>): IctuDropdownOption<number>[] =>
                    (response.data ?? []).map((item: Nganhhoc) => ({ value: item.id, label: item.name })),
                ),
            ),
            programs: this.ctdtService.query([], queryParams).pipe(
                map((response: DtoObject<ChuongtrinhDaotao[]>): IctuDropdownOption<number>[] =>
                    (response.data ?? []).map((item: ChuongtrinhDaotao) => ({
                        value: item.id,
                        label: `${item.code} — ${item.name}`,
                    })),
                ),
            ),
            provinces: this.locationService.queryLocation([], queryParams, 'regions').pipe(
                map((response: DtoObject<Locations[]>): IctuDropdownOption<number>[] =>
                    (response.data ?? []).map((item: Locations) => ({ value: item.id, label: item.name })),
                ),
            ),
        }).pipe(takeUntil(this.onDestroy$)).subscribe({
            next: ({ dots, majors, programs, provinces }): void => {
                this.dots.set(dots);
                this.majors.set(majors);
                this.programs.set(programs);
                this.tinhList.set(provinces);
            },
        });
    }

    private buildConditions(): IctuConditionParam[] {
        const searchInfo = this.searchInfo;
        const conditions: IctuConditionParam[] = [
            {
                conditionName: 'status',
                value: `${ADMITTED_STATUS}`,
                condition: IctuQueryCondition.equal,
            },
        ];

        if (searchInfo.search.trim()) {
            const search = `%${searchInfo.search.trim()}%`;
            conditions.push(
                { conditionName: 'ho_va_ten', value: search, condition: IctuQueryCondition.like, orWhere: 'or' },
                { conditionName: 'dien_thoai', value: search, condition: IctuQueryCondition.like, orWhere: 'or' },
            );
        }
        if (searchInfo.dotxettuyen_id) {
            conditions.push({ conditionName: 'dotxettuyen_id', value: `${searchInfo.dotxettuyen_id}`, condition: IctuQueryCondition.equal });
        }
        if (searchInfo.nganh_id) {
            conditions.push({ conditionName: 'nganh_id', value: `${searchInfo.nganh_id}`, condition: IctuQueryCondition.equal });
        }
        if (searchInfo.cccd?.trim()) {
            conditions.push({ conditionName: 'cccd', value: `%${searchInfo.cccd.trim()}%`, condition: IctuQueryCondition.like });
        }
        if (searchInfo.dia_chi_tinh) {
            conditions.push({ conditionName: 'dia_chi_tinh', value: `${searchInfo.dia_chi_tinh}`, condition: IctuQueryCondition.equal });
        }
        if (searchInfo.noi_sinh) {
            conditions.push({ conditionName: 'noi_sinh', value: `${searchInfo.noi_sinh}`, condition: IctuQueryCondition.equal });
        }
        if (searchInfo.dan_toc) {
            conditions.push({ conditionName: 'dan_toc', value: searchInfo.dan_toc, condition: IctuQueryCondition.equal });
        }
        return conditions;
    }

    private loadDetail(id: number): void {
        this.detailState.set('loading');
        this.hosoService.get(id).pipe(takeUntil(this.onDestroy$)).subscribe({
            next: (data: HosoThisinh): void => {
                if (this.selectedDetailId() !== id) {
                    return;
                }
                this.viewDetailData.set({ ...data });
                this.detailState.set('success');
            },
            error: (): void => {
                if (this.selectedDetailId() !== id) {
                    return;
                }
                this.viewDetailData.set(null);
                this.detailState.set('error');
            },
        });
    }

    private lookupLabel(options: IctuDropdownOption<number>[], id: number | undefined): string {
        if (!id) {
            return '—';
        }
        return options.find((item) => item.value == id)?.label ?? `#${id}`;
    }

    private emptySearchInfo(): HosoTrungTuyenSearchInfo {
        return {
            search: '',
            dotxettuyen_id: undefined,
            nganh_id: undefined,
            cccd: undefined,
            dia_chi_tinh: undefined,
            noi_sinh: undefined,
            dan_toc: undefined,
        };
    }
}
