import { Component, inject, OnDestroy, OnInit, Signal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { IctuDataTable, IctuDataTablePaginatorInfo } from '@models/datatable';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { CtdtItem, ExternalApiResponse, NganhItem } from '@models/external-api';
import { IctuBasePermission, IctuPermissionControl } from '@models/ictu-base-model';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { Locations } from '@models/location';
import { DotXettuyen } from '@models/tuyensinh/dot-xettuyen';
import { HosoThisinh } from '@models/tuyensinh/hoso-thisinh';
import { AuthenticationService } from '@services/authentication.service';
import { LocationService } from '@services/location.service';
import { ApiOutsiteService } from '@services/tuyensinh/api-outsite.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { HosoThisinhService } from '@services/tuyensinh/hoso-thisinh.service';
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

interface HosoKhongTrungTuyenSearchInfo {
    search: string;
    dot_xet_tuyen_id?: number;
    nganhhoc_id?: number;
    cccd?: string;
    tinh_id?: number;
    noi_sinh?: string;
    dan_toc?: string;
}

const NON_ADMITTED_STATUS = 'KHONG_TRUNG_TUYEN';

@Component({
    selector: 'app-hoso-khongtrungtuyen',
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
    templateUrl: './hoso-khongtrungtuyen.component.html',
    styleUrl: './hoso-khongtrungtuyen.component.css',
})
export class HosoKhongtrungtuyenComponent implements OnInit, OnDestroy, IctuBasePermission {
    private readonly hosoService = inject(HosoThisinhService);
    private readonly dotService = inject(DotXettuyenService);
    private readonly apiOutsiteService = inject(ApiOutsiteService);
    private readonly locationService = inject(LocationService);
    private readonly authenticationService = inject(AuthenticationService);
    private readonly onDestroy$ = new Subject<void>();

    readonly permissionControl: Signal<IctuPermissionControl> = signal(
        new IctuPermissionControl(this.authenticationService.getUserPermission('hoso-khongtrungtuyen')),
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
    readonly statusOptions: IctuDropdownOption<string>[] = TH_XETTUYEN
        .filter((item) => item.show)
        .map((item) => ({ value: item.kyhieu, label: item.label }));

    searchInfo: HosoKhongTrungTuyenSearchInfo = this.emptySearchInfo();
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

    statusLabel(status: string | undefined): string {
        return this.statusOptions.find((item) => item.value === status)?.label ?? status ?? '—';
    }

    statusBadgeClass(status: string | undefined): string {
        return status === NON_ADMITTED_STATUS ? 'ictu-badge--danger' : 'ictu-badge--secondary';
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
        return typeof tinh === 'number' ? this.lookupLabel(this.tinhList(), tinh) : (tinh || '—');
    }

    private loadLookups(): void {
        const queryParams: IctuQueryParams = { limit: -1 };
        forkJoin({
            dots: this.dotService.load({ search: '' }, queryParams).pipe(
                map((response: DtoObject<DotXettuyen[]>): IctuDropdownOption<number>[] =>
                    (response.data ?? []).map((item: DotXettuyen) => ({ value: item.id, label: item.name })),
                ),
            ),
            majors: this.apiOutsiteService.getNganhList().pipe(
                map((response: ExternalApiResponse<NganhItem[]>): IctuDropdownOption<number>[] =>
                    (response.data ?? [])
                        .filter((item: NganhItem) => item.type === 'nganh')
                        .map((item: NganhItem) => ({ value: item.id, label: item.title })),
                ),
            ),
            programs: this.apiOutsiteService.getCtdtList().pipe(
                map((response: ExternalApiResponse<CtdtItem[]>): IctuDropdownOption<number>[] =>
                    (response.data ?? []).map((item: CtdtItem) => ({
                        value: item.id,
                        label: `${item.madt ?? ''} — ${item.ten}`,
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
                value: NON_ADMITTED_STATUS,
                condition: IctuQueryCondition.equal,
            },
        ];

        if (searchInfo.search.trim()) {
            const search = `%${searchInfo.search.trim()}%`;
            conditions.push(
                { conditionName: 'full_name', value: search, condition: IctuQueryCondition.like, orWhere: 'or' },
                { conditionName: 'phone', value: search, condition: IctuQueryCondition.like, orWhere: 'or' },
            );
        }
        if (searchInfo.dot_xet_tuyen_id) {
            conditions.push({ conditionName: 'dot_xet_tuyen_id', value: `${searchInfo.dot_xet_tuyen_id}`, condition: IctuQueryCondition.equal });
        }
        if (searchInfo.nganhhoc_id) {
            conditions.push({ conditionName: 'nganhhoc_id', value: `${searchInfo.nganhhoc_id}`, condition: IctuQueryCondition.equal });
        }
        if (searchInfo.cccd?.trim()) {
            conditions.push({ conditionName: 'cccd', value: `%${searchInfo.cccd.trim()}%`, condition: IctuQueryCondition.like });
        }
        if (searchInfo.tinh_id) {
            conditions.push({ conditionName: 'tinh_id', value: `${searchInfo.tinh_id}`, condition: IctuQueryCondition.equal });
        }
        if (searchInfo.noi_sinh?.trim()) {
            conditions.push({ conditionName: 'noi_sinh', value: `%${searchInfo.noi_sinh.trim()}%`, condition: IctuQueryCondition.like });
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
        return options.find((item) => item.value === id)?.label ?? `#${id}`;
    }

    private emptySearchInfo(): HosoKhongTrungTuyenSearchInfo {
        return {
            search: '',
            dot_xet_tuyen_id: undefined,
            nganhhoc_id: undefined,
            cccd: undefined,
            tinh_id: undefined,
            noi_sinh: undefined,
            dan_toc: undefined,
        };
    }
}
