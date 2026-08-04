import { Component, inject, OnDestroy, OnInit, Signal, signal, viewChild, WritableSignal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IctuBasePermission, IctuPermissionControl } from '@models/ictu-base-model';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { DataTableEvent, DataTableEventName, IctuDataTable, IctuDataTablePaginatorInfo } from '@models/datatable';
import { IctuFormControl2 } from '@models/ictu-form-control';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { HosoThisinh } from '@app/models/tuyensinh/hoso-thisinh';
import { CtdtItem, ExternalApiResponse, NganhItem } from '@models/external-api';
import { DotXettuyen } from '@app/models/tuyensinh/dot-xettuyen';
import { HosoThisinhService } from '@services/tuyensinh/hoso-thisinh.service';
import { ApiOutsiteService } from '@services/tuyensinh/api-outsite.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { LocationService } from '@app/services/location.service';
import { Drawer } from 'primeng/drawer';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { forkJoin, Observable, Subject } from 'rxjs';
import { filter, map, switchMap, takeUntil } from 'rxjs/operators';
import { DanToc, TH_XETTUYEN } from '@app/utilities/syscats';
import { Popover } from "primeng/popover";
import { FormThongtinDangkyComponent } from "../form-thongtin-dangky/form-thongtin-dangky.component";
import { TuvanTuyensinhComponent } from '../tuvan-tuyensinh/tuvan-tuyensinh.component';

@Component({
    selector: 'app-hoso-xettuyen',
    imports: [
    Drawer, FormsModule, IctuPaginatorComponent, InputText, LoadingProgressComponent,
    MatButton, MatCheckbox, ReactiveFormsModule, Select,
    Popover, FormThongtinDangkyComponent, TuvanTuyensinhComponent
],
    templateUrl: './hoso-xettuyen.component.html',
    styleUrl: './hoso-xettuyen.component.css',
    standalone: true,
})
export class HosoXettuyenComponent implements OnInit, OnDestroy, IctuBasePermission {

    // ── Services ────────────────────────────────────────────────

    private hosoService = inject(HosoThisinhService);
    private dotService = inject(DotXettuyenService);
    private apiOutsite = inject(ApiOutsiteService);
    private locationService = inject(LocationService);
    private auth = inject(AuthenticationService);
    private notification = inject(NotificationService);
    private fb = inject(FormBuilder);
    private onDestroy$ = new Subject<void>();

    // ── Permission ──────────────────────────────────────────────

    permissionControl: Signal<IctuPermissionControl> = signal<IctuPermissionControl>(
        new IctuPermissionControl(this.auth.getUserPermission('hoso-tuyensinh')),
    );

    // ── Search / Filter ─────────────────────────────────────────

    searchInfo: {
        search: string;
        status?: string;
        dot_xet_tuyen_id?: number;
        nganhhoc_id?: number;
        nguoi_tuvan_id?: number;
        cccd?: string;
        tinh_id?: number;
        xa_id?: number;
        noi_sinh?: string;
        dan_toc?: string;
        ctdt_id?: number;
    } = {
        search: '',
        status: undefined,
        dot_xet_tuyen_id: undefined,
        nganhhoc_id: undefined,
        nguoi_tuvan_id: undefined,
        cccd: undefined,
        tinh_id: undefined,
        xa_id: undefined,
        noi_sinh: undefined,
        dan_toc: undefined,
        ctdt_id: undefined,
    };

    // ── Table ───────────────────────────────────────────────────

    dataTable: IctuDataTable<HosoThisinh> = new IctuDataTable<HosoThisinh>();
    state: WritableSignal<'loading' | 'success' | 'error'> = signal<'loading' | 'success' | 'error'>('success');
    private temp: IctuDataTablePaginatorInfo = { paged: 1, resetPaginator: true };

    // ── Filter toggle ───────────────────────────────────────────

    showAdvancedFilter: WritableSignal<boolean> = signal<boolean>(false);

    // ── Lookups ─────────────────────────────────────────────────

    dots: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);
    majors: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);
    programs: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);
    tinhList: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);
    xaList: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);

    // ── Static options ──────────────────────────────────────────

    readonly danTocOptions: IctuDropdownOption<string>[] = DanToc.map(d => ({ value: d.name, label: d.label }));
    readonly statusOptions: IctuDropdownOption<string>[] = TH_XETTUYEN
        .filter(s => s.show)
        .map(s => ({ value: s.kyhieu, label: s.label }));

    readonly statusBadgeMap: Record<string, string> = {
        KHOI_TAO: 'ictu-badge--warning',
        THIEU_HOSO: 'ictu-badge--danger',
        CHOKQ_XET_TUYEN: 'ictu-badge--info',
        TRUNG_TUYEN: 'ictu-badge--success',
        KHONG_TRUNG_TUYEN: 'ictu-badge--danger',
        CHUA_NHAP_HOC: 'ictu-badge--secondary',
        NHAP_HOC_THIEU: 'ictu-badge--warning',
        NHAP_HOC_OK: 'ictu-badge--success',
    };

    // ── Drawer & Event system ───────────────────────────────────

    readonly drawer = viewChild<Drawer>('masterDrawer');
    formControl!: IctuFormControl2<HosoThisinh>;
    eventObserver$: Subject<DataTableEvent<HosoThisinh>> = new Subject<DataTableEvent<HosoThisinh>>();
    handelEvent!: Record<DataTableEventName, (data?: HosoThisinh | HosoThisinh[]) => void>;

    // ── Consultation drawer ─────────────────────────────────────

    readonly consultationDrawerVisible = signal<boolean>(false);
    readonly selectedConsultationHoso = signal<HosoThisinh | null>(null);

    // ── View detail drawer ──────────────────────────────────────

    viewDetailVisible: WritableSignal<boolean> = signal<boolean>(false);
    viewDetailData: WritableSignal<HosoThisinh | null> = signal<HosoThisinh | null>(null);

    // ── Edit drawer ────────────────────────────────────────────

    readonly editDrawerVisible = signal<boolean>(false);
    readonly editData = signal<HosoThisinh | null>(null);

    constructor() {
        this.formControl = new IctuFormControl2<HosoThisinh>({
            dropdownFields: [],
            formGroup: this.fb.group({}),
            objectName: 'hồ sơ xét tuyển',
            drawer: this.drawer,
        });

        this.handelEvent = {
            OPEN_FORM_ADD: (): void => {
                // Phase 2 — drawer form
            },
            OPEN_FORM_UPDATE: (data: HosoThisinh): void => {
                this.editData.set(data);
                this.editDrawerVisible.set(true);
            },
            DELETE_SINGLE_ROW: ({ id }: HosoThisinh): void => {
                this.requestDeletingData([id]);
            },
            DELETE_SELECTED_ROWS: (): void => {
                const ids: number[] = this.dataTable.getSelectedData().map(({ id }: HosoThisinh): number => id);
                if (ids.length) this.requestDeletingData(ids);
            },
            SUBMIT_FORM: (): void => {
                // Phase 2 — drawer form
            },
        };

        this.eventObserver$.pipe(takeUntil(this.onDestroy$)).subscribe(
            ({ name, data }: DataTableEvent<HosoThisinh>): void => this.handelEvent[name](data),
        );
    }

    // ═════════════════════════════════════════════════════════════
    //  Lifecycle
    // ═════════════════════════════════════════════════════════════

    ngOnInit(): void {
        this.loadLookups();
        this.loadData(1, true);
    }

    ngOnDestroy(): void {
        this.onDestroy$.next();
        this.onDestroy$.complete();
    }

    // ═════════════════════════════════════════════════════════════
    //  Lookups
    // ═════════════════════════════════════════════════════════════

    private loadLookups(): void {
        const qp: IctuQueryParams = { limit: -1 };
        forkJoin({
            dots: this.dotService.load({ search: '' }, qp).pipe(
                map((r: DtoObject<DotXettuyen[]>): IctuDropdownOption<number>[] =>
                    (r.data ?? []).map(d => ({ value: d.id, label: d.name }))),
            ),
            majors: this.apiOutsite.getNganhList().pipe(
                map((r: ExternalApiResponse<NganhItem[]>): IctuDropdownOption<number>[] =>
                    (r.data ?? [])
                        .filter(m => m.type === 'nganh')
                        .map(m => ({ value: m.id, label: m.title }))),
            ),
            programs: this.apiOutsite.getCtdtList().pipe(
                map((r: ExternalApiResponse<CtdtItem[]>): IctuDropdownOption<number>[] =>
                    (r.data ?? []).map(p => ({ value: p.id, label: `${p.madt ?? ''} — ${p.ten}` }))),
            ),
            tinhList: this.locationService.queryLocation([], qp, 'regions').pipe(
                map((r: DtoObject<any[]>): IctuDropdownOption<number>[] =>
                    (r.data ?? []).map(t => ({ value: t.id, label: t.name }))),
            ),
            
        }).pipe(takeUntil(this.onDestroy$)).subscribe({
            next: ({ dots, majors, programs, tinhList }): void => {
                this.dots.set(dots);
                this.majors.set(majors);
                this.programs.set(programs);
                this.tinhList.set(tinhList);
                
            },
            error: (): void => this.notification.toastError('Tải danh mục thất bại'),
        });
    }

    // ═════════════════════════════════════════════════════════════
    //  Data
    // ═════════════════════════════════════════════════════════════

    private buildConditions(): IctuConditionParam[] {
        const conditions: IctuConditionParam[] = [];
        const s = this.searchInfo;

        if (s.search) {
            conditions.push(
                { conditionName: 'full_name', value: `%${s.search}%`, condition: IctuQueryCondition.like, orWhere: 'or' },
                { conditionName: 'phone', value: `%${s.search}%`, condition: IctuQueryCondition.like, orWhere: 'or' },
            );
        }
        if (s.status) {
            conditions.push({ conditionName: 'status', value: s.status, condition: IctuQueryCondition.equal });
        }
        if (s.dot_xet_tuyen_id) {
            conditions.push({ conditionName: 'dot_xet_tuyen_id', value: `${s.dot_xet_tuyen_id}`, condition: IctuQueryCondition.equal });
        }
        if (s.nganhhoc_id) {
            conditions.push({ conditionName: 'nganhhoc_id', value: `${s.nganhhoc_id}`, condition: IctuQueryCondition.equal });
        }
        if (s.nguoi_tuvan_id) {
            conditions.push({ conditionName: 'nguoi_tuvan_id', value: `${s.nguoi_tuvan_id}`, condition: IctuQueryCondition.equal });
        }
        if (s.cccd) {
            conditions.push({ conditionName: 'cccd', value: `%${s.cccd}%`, condition: IctuQueryCondition.like });
        }
        if (s.tinh_id) {
            conditions.push({ conditionName: 'tinh_id', value: `${s.tinh_id}`, condition: IctuQueryCondition.equal });
        }
        if (s.xa_id) {
            conditions.push({ conditionName: 'xa_id', value: `${s.xa_id}`, condition: IctuQueryCondition.equal });
        }
        if (s.noi_sinh) {
            conditions.push({ conditionName: 'noi_sinh', value: `%${s.noi_sinh}%`, condition: IctuQueryCondition.like });
        }
        if (s.dan_toc) {
            conditions.push({ conditionName: 'dan_toc', value: s.dan_toc, condition: IctuQueryCondition.equal });
        }
        if (s.ctdt_id) {
            conditions.push({ conditionName: 'program_id', value: `${s.ctdt_id}`, condition: IctuQueryCondition.equal });
        }
        return conditions;
    }

    loadData(paged: number = 1, resetPaginator: boolean = true): void {
        this.state.set('loading');
        this.temp = { paged, resetPaginator };
        const conditions: IctuConditionParam[] = this.buildConditions();
        const queryParams: IctuQueryParams = {
            limit: this.dataTable.paginator.rows(),
            paged,
            order: 'DESC',
            orderby: 'created_at',
        };
        this.hosoService.query(conditions, queryParams).pipe(
            map((res: DtoObject<HosoThisinh[]>): HosoThisinh[] => {
                if (resetPaginator) return this.dataTable.paginator.setupPaginator(res);
                this.dataTable.paginator.changePage(paged);
                return res.data ?? [];
            }),
        ).subscribe({
            next: (data: HosoThisinh[]): void => {
                this.dataTable.fillData(data);
                this.state.set('success');
            },
            error: (): void => this.state.set('error'),
        });
    }

    // ═════════════════════════════════════════════════════════════
    //  Filter
    // ═════════════════════════════════════════════════════════════

    onSearch(): void {
        this.loadData(1, true);
    }

    onChangePage(paged: number): void {
        this.loadData(paged, false);
    }

    toggleAdvancedFilter(): void {
        this.showAdvancedFilter.update(v => !v);
    }

    applyFilter(): void {
        this.loadData(1, true);
    }

    resetFilter(): void {
        this.searchInfo = {
            search: '',
            status: undefined,
            dot_xet_tuyen_id: undefined,
            nganhhoc_id: undefined,
            nguoi_tuvan_id: undefined,
            cccd: undefined,
            tinh_id: undefined,
            xa_id: undefined,
            noi_sinh: undefined,
            dan_toc: undefined,
            ctdt_id: undefined,
        };
        this.loadData(1, true);
    }

    // ═════════════════════════════════════════════════════════════
    //  CRUD events
    // ═════════════════════════════════════════════════════════════

    addItem(): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_ADD', data: null as unknown as HosoThisinh });
    }

    editItem(data: HosoThisinh): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
    }

    deleteItem(data: HosoThisinh): void {
        this.eventObserver$.next({ name: 'DELETE_SINGLE_ROW', data });
    }

    deleteSelected(): void {
        this.eventObserver$.next({ name: 'DELETE_SELECTED_ROWS', data: null as unknown as HosoThisinh });
    }

    submitForm(): void {
        this.eventObserver$.next({ name: 'SUBMIT_FORM', data: null as unknown as HosoThisinh });
    }

    onDrawerHide(): void {
        if (this.formControl.submitted) this.loadData(1, true);
    }

    reload(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.loadData(this.temp.paged, this.temp.resetPaginator);
    }

    onEditSaved(): void {
        this.editDrawerVisible.set(false);
        this.editData.set(null);
        this.loadData(1, true);
    }

    // ═════════════════════════════════════════════════════════════
    //  Delete
    // ═════════════════════════════════════════════════════════════

    private requestDeletingData(ids: number[]): void {
        this.notification.confirmDelete(ids.length).pipe(
            filter((confirm: boolean): boolean => confirm),
            map((): IctuDeletingAnimationControl<HosoThisinh> => new IctuDeletingAnimationControl(ids, this.hosoService)),
            switchMap((ctrl: IctuDeletingAnimationControl<HosoThisinh>): Observable<boolean> => {
                ctrl.run();
                return this.notification.startDeleting(ctrl.progress);
            }),
        ).subscribe({
            next: (success: boolean): void => {
                if (success) this.notification.toastSuccess('Xóa hồ sơ thành công');
                this.loadData(1, true);
            },
            error: (): void => {
                this.notification.toastError('Xóa hồ sơ thất bại');
                this.loadData(1, true);
            },
        });
    }

    // ═════════════════════════════════════════════════════════════
    //  Consultation history
    // ═════════════════════════════════════════════════════════════

    openLichSu(row: HosoThisinh): void {
        this.selectedConsultationHoso.set({ ...row });
        this.consultationDrawerVisible.set(true);
    }

    // ═════════════════════════════════════════════════════════════
    //  View detail
    // ═════════════════════════════════════════════════════════════

    viewDetail(row: HosoThisinh): void {
        this.viewDetailData.set(null);
        this.viewDetailVisible.set(true);
        const currentRow: HosoThisinh = this.dataTable.data().find((r: HosoThisinh): boolean => r.id === row.id) ?? row;
        this.hosoService.get(row.id).pipe(takeUntil(this.onDestroy$)).subscribe({
            next: (data: HosoThisinh): void => {
                this.viewDetailData.set(data);
            },
            error: (): void => {
                this.viewDetailData.set(currentRow);
            },
        });
    }

    // ═════════════════════════════════════════════════════════════
    //  Label helpers
    // ═════════════════════════════════════════════════════════════

    statusLabel(status: string | undefined): string {
        return this.statusOptions.find(s => s.value === status)?.label ?? status ?? '—';
    }

    statusBadgeClass(status: string | undefined): string {
        return this.statusBadgeMap[status ?? ''] ?? 'ictu-badge--secondary';
    }

    majorLabel(majorId: number | undefined): string {
        if (!majorId) return '—';
        return this.majors().find(m => m.value === majorId)?.label ?? `#${majorId}`;
    }

    programLabel(programId: number | undefined): string {
        if (!programId) return '—';
        return this.programs().find(p => p.value === programId)?.label ?? `#${programId}`;
    }

    dotLabel(dotId: number | undefined): string {
        if (!dotId) return '—';
        return this.dots().find(d => d.value === dotId)?.label ?? `#${dotId}`;
    }

    tinhLabel(tinhId: number | undefined): string {
        if (!tinhId) return '—';
        return this.tinhList().find(t => t.value == tinhId)?.label ?? `#${tinhId}`;
    }
}
