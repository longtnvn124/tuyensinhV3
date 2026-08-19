import { Component, computed, inject, OnDestroy, OnInit, Signal, signal, viewChild, WritableSignal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IctuBasePermission, IctuPermissionControl } from '@models/ictu-base-model';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { DataTableEvent, DataTableEventName, IctuDataTable, IctuDataTablePaginatorInfo } from '@models/datatable';
import { IctuFormControl2 } from '@models/ictu-form-control';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { HosoStatus, HosoThisinh } from '@app/models/tuyensinh/hoso-thisinh';
import { Locations } from '@models/location';
import { SysRoleName } from '@models/role';
import { User } from '@models/user';
import { ChuongtrinhDaotao } from '@models/tuyensinh/chuongtrinh-daotao';
import { DotXettuyen } from '@app/models/tuyensinh/dot-xettuyen';
import { Nganhhoc } from '@models/tuyensinh/nganhhoc';
import { ChuongtrinhDaotaoService } from '@services/tuyensinh/chuongtrinh-daotao.service';
import { HosoThisinhService } from '@services/tuyensinh/hoso-thisinh.service';
import { NganhhocService } from '@services/tuyensinh/nganhhoc.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService, ProgressAnimationEvent } from '@services/notification.service';
import {
    ExpHosoTuyensinhService,
    HosoTuyensinhExportPayload,
} from '@services/tuyensinh/exp-hoso-tuyensinh.service';
import { UserService } from '@services/user.service';
import { LocationService } from '@app/services/location.service';
import { Drawer } from 'primeng/drawer';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { EMPTY, forkJoin, from, Observable, Subject } from 'rxjs';
import { filter, finalize, map, switchMap, takeUntil, tap } from 'rxjs/operators';
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
    private nganhHocService = inject(NganhhocService);
    private ctdtService = inject(ChuongtrinhDaotaoService);
    private locationService = inject(LocationService);
    private userService = inject(UserService);
    private exportService = inject(ExpHosoTuyensinhService);
    private auth = inject(AuthenticationService);
    private notification = inject(NotificationService);
    private fb = inject(FormBuilder);
    private onDestroy$ = new Subject<void>();

    // ── Permission ──────────────────────────────────────────────

    private readonly exportRoles: SysRoleName[] = ['admin', 'direction', 'manager'];

    permissionControl: Signal<IctuPermissionControl> = signal<IctuPermissionControl>(
        new IctuPermissionControl(this.auth.getUserPermission('hoso-tuyensinh')),
    );
    readonly canExport = computed((): boolean => this.auth.userHasRole(this.exportRoles));
    readonly exportLoading = signal(false);

    // ── Search / Filter ─────────────────────────────────────────

    searchInfo: {
        search: string;
        status?: HosoStatus;
        dotxettuyen_id?: number;
        nganh_id?: number;
        nguoi_tuvan?: number;
        cccd?: string;
        dia_chi_tinh?: number;
        dia_chi_xa?: number;
        noi_sinh?: number;
        dan_toc?: string;
        ctdt_id?: number;
    } = {
        search: '',
        status: undefined,
        dotxettuyen_id: undefined,
        nganh_id: undefined,
        nguoi_tuvan: undefined,
        cccd: undefined,
        dia_chi_tinh: undefined,
        dia_chi_xa: undefined,
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
    readonly statusOptions: IctuDropdownOption<number>[] = TH_XETTUYEN.map(s => ({
        value: s.value,
        label: s.label,
    }));

    readonly statusBadgeMap: Record<HosoStatus, string> = {
        [-1]: 'ictu-badge--danger',
        0: 'ictu-badge--warning',
        1: 'ictu-badge--danger',
        2: 'ictu-badge--info',
        3: 'ictu-badge--success',
        4: 'ictu-badge--secondary',
        5: 'ictu-badge--warning',
        6: 'ictu-badge--success',
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
            majors: this.nganhHocService.load({ search: '' }, qp).pipe(
                map((r: DtoObject<Nganhhoc[]>): IctuDropdownOption<number>[] =>
                    (r.data ?? []).map(m => ({ value: m.id, label: m.name }))),
            ),
            programs: this.ctdtService.query([], qp).pipe(
                map((r: DtoObject<ChuongtrinhDaotao[]>): IctuDropdownOption<number>[] =>
                    (r.data ?? []).map(p => ({ value: p.id, label: `${p.code} — ${p.name}` }))),
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

                                this.loadData(1, true);

                
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
                { conditionName: 'ho_va_ten', value: `%${s.search}%`, condition: IctuQueryCondition.like, orWhere: 'or' },
                { conditionName: 'dien_thoai', value: `%${s.search}%`, condition: IctuQueryCondition.like, orWhere: 'or' },
            );
        }
        if (s.status !== undefined) {
            conditions.push({ conditionName: 'status', value: `${s.status}`, condition: IctuQueryCondition.equal });
        }
        if (s.dotxettuyen_id) {
            conditions.push({ conditionName: 'dotxettuyen_id', value: `${s.dotxettuyen_id}`, condition: IctuQueryCondition.equal });
        }
        if (s.nganh_id) {
            conditions.push({ conditionName: 'nganh_id', value: `${s.nganh_id}`, condition: IctuQueryCondition.equal });
        }
        if (s.nguoi_tuvan) {
            conditions.push({ conditionName: 'nguoi_tuvan', value: `${s.nguoi_tuvan}`, condition: IctuQueryCondition.equal });
        }
        if (s.cccd) {
            conditions.push({ conditionName: 'cccd', value: `%${s.cccd}%`, condition: IctuQueryCondition.like });
        }
        if (s.dia_chi_tinh) {
            conditions.push({ conditionName: 'dia_chi_tinh', value: `${s.dia_chi_tinh}`, condition: IctuQueryCondition.equal });
        }
        if (s.dia_chi_xa) {
            conditions.push({ conditionName: 'dia_chi_xa', value: `${s.dia_chi_xa}`, condition: IctuQueryCondition.equal });
        }
        if (s.noi_sinh) {
            conditions.push({ conditionName: 'noi_sinh', value: `${s.noi_sinh}`, condition: IctuQueryCondition.equal });
        }
        if (s.dan_toc) {
            conditions.push({ conditionName: 'dan_toc', value: s.dan_toc, condition: IctuQueryCondition.equal });
        }
        if (s.ctdt_id) {
            conditions.push({ conditionName: 'ctdt_id', value: `${s.ctdt_id}`, condition: IctuQueryCondition.equal });
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
            dotxettuyen_id: undefined,
            nganh_id: undefined,
            nguoi_tuvan: undefined,
            cccd: undefined,
            dia_chi_tinh: undefined,
            dia_chi_xa: undefined,
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

    onExportData(): void {
        if (!this.auth.userHasRole(this.exportRoles)) {
            this.notification.toastError('Bạn không có quyền xuất dữ liệu hồ sơ');
            return;
        }
        if (this.exportLoading()) return;

        const controlLoading = new Subject<ProgressAnimationEvent>();
        const queryParams: IctuQueryParams = {
            limit: -1,
            paged: 1,
            order: 'DESC',
            orderby: 'created_at',
        };

        this.exportLoading.set(true);
        this.notification.startProgressAnimation(controlLoading, 'Đang xuất dữ liệu hồ sơ');
        controlLoading.next({ percent: 10, heading: 'Đang tải danh sách hồ sơ' });

        this.hosoService.query(this.buildConditions(), queryParams).pipe(
            switchMap((response: DtoObject<HosoThisinh[]>): Observable<HosoTuyensinhExportPayload> => {
                const records = response.data ?? [];
                if (!records.length) {
                    this.notification.toastWarning('Không có dữ liệu hồ sơ để xuất');
                    return EMPTY;
                }

                controlLoading.next({ percent: 35, heading: 'Đang tải dữ liệu danh mục' });
                return this.loadExportPayload(records);
            }),
            tap((): void => {
                controlLoading.next({ percent: 70, heading: 'Đang tạo file Excel' });
            }),
            switchMap((payload: HosoTuyensinhExportPayload): Observable<void> =>
                from(this.exportService.exportExcel(payload)),
            ),
            tap((): void => {
                controlLoading.next({ percent: 100, heading: 'Đã xuất dữ liệu' });
            }),
            finalize((): void => {
                this.exportLoading.set(false);
                controlLoading.complete();
            }),
            takeUntil(this.onDestroy$),
        ).subscribe({
            next: (): void => {
                this.notification.toastSuccess('Xuất dữ liệu hồ sơ thành công');
            },
            error: (): void => {
                this.notification.toastError('Xuất dữ liệu hồ sơ thất bại');
            },
        });
    }

    private loadExportPayload(
        records: readonly HosoThisinh[],
    ): Observable<HosoTuyensinhExportPayload> {
        const queryParams: IctuQueryParams = { limit: -1, paged: 1 };
        return forkJoin({
            majors: this.nganhHocService.load({ search: '' }, queryParams),
            programs: this.ctdtService.query([], queryParams),
            rounds: this.dotService.load({ search: '' }, queryParams),
            regions: this.locationService.queryLocation([], queryParams, 'regions'),
            provinces: this.locationService.queryLocation([], queryParams, 'provinces'),
            users: this.userService.query([], {
                ...queryParams,
                select: 'id,display_name',
            }),
        }).pipe(
            map((responses): HosoTuyensinhExportPayload => ({
                records,
                majors: (responses.majors.data ?? []).map((major: Nganhhoc) => ({
                    id: major.id,
                    code: major.code,
                    name: major.name,
                })),
                programs: (responses.programs.data ?? []).map((program: ChuongtrinhDaotao) => ({
                    id: program.id,
                    code: program.code,
                    name: program.name,
                })),
                rounds: (responses.rounds.data ?? []).map((round: DotXettuyen) => ({
                    id: round.id,
                    name: round.name,
                })),
                regions: (responses.regions.data ?? []).map((region: Locations) => ({
                    id: region.id,
                    name: region.name,
                })),
                provinces: (responses.provinces.data ?? []).map((province: Locations) => ({
                    id: province.id,
                    name: province.name,
                })),
                users: (responses.users.data ?? []).map((user: User) => ({
                    id: user.id,
                    display_name: user.display_name,
                })),
            })),
        );
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

    statusLabel(status: HosoStatus | undefined): string {
        return this.statusOptions.find(s => s.value === status)?.label ?? `${status ?? '—'}`;
    }

    statusBadgeClass(status: HosoStatus | undefined): string {
        return status === undefined
            ? 'ictu-badge--secondary'
            : this.statusBadgeMap[status];
    }

    majorLabel(majorId: number | undefined): string {
        if (!majorId) return '—';
        return this.majors().find(m => m.value == majorId)?.label ?? `#${majorId}`;
    }

    programLabel(programId: number | undefined): string {
        if (!programId) return '—';
        return this.programs().find(p => p.value == programId)?.label ?? `#${programId}`;
    }

    dotLabel(dotId: number | undefined): string {
        if (!dotId) return '—';
        return this.dots().find(d => d.value == dotId)?.label ?? `#${dotId}`;
    }

    tinhLabel(tinhId: number | undefined): string {
        if (!tinhId) return '—';
        return this.tinhList().find(t => t.value == tinhId)?.label ?? `#${tinhId}`;
    }
}
