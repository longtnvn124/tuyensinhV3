import { Component, computed, inject, OnDestroy, OnInit, Signal, signal, viewChild, WritableSignal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IctuBasePermission, IctuPermissionControl } from '@models/ictu-base-model';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { DataTableEvent, DataTableEventName, IctuDataTable, IctuDataTablePaginatorInfo } from '@models/datatable';
import { IctuFormControl2 } from '@models/ictu-form-control';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { RegistrationStatus, Registrations } from '@app/models/tuyensinh/registrations';
import { Locations } from '@models/location';
import { Role, SysRoleName } from '@models/role';
import { User } from '@models/user';
import { ChuongtrinhDaotao } from '@models/tuyensinh/chuongtrinh-daotao';
import { DotXettuyen } from '@app/models/tuyensinh/dot-xettuyen';
import { Nganhhoc } from '@models/tuyensinh/nganhhoc';
import { RegistrationsService } from '@services/tuyensinh/registrations.service';
import { NganhhocService } from '@services/tuyensinh/nganhhoc.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService, ProgressAnimationEvent } from '@services/notification.service';
import {
    ExpHosoTuyensinhService,
    HosoTuyensinhExportPayload,
} from '@services/tuyensinh/exp-hoso-tuyensinh.service';
import { UserService } from '@services/user.service';
import { RoleService, RoleWithPermissions } from '@services/role.service';
import { LocationService } from '@app/services/location.service';
import { Drawer } from 'primeng/drawer';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { EMPTY, forkJoin, from, Observable, of, Subject } from 'rxjs';
import { concatMap, filter, finalize, map, switchMap, takeUntil, tap, toArray } from 'rxjs/operators';
import { DanToc, TH_XETTUYEN } from '@app/utilities/syscats';
import { Popover } from "primeng/popover";
import { FormThongtinDangkyComponent } from "../form-thongtin-dangky/form-thongtin-dangky.component";
import { TuvanTuyensinhComponent } from '../tuvan-tuyensinh/tuvan-tuyensinh.component';
import { TuyensinhStatus } from '@app/models/tuyensinh/tuyensinh-status';
import { RegistrationsStatusService } from '@app/services/tuyensinh/registrations-status';

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

    private registrationsService = inject(RegistrationsService);
    private dotService = inject(DotXettuyenService);
    private nganhHocService = inject(NganhhocService);

    private locationService = inject(LocationService);
    private userService = inject(UserService);
    private roleService = inject(RoleService);
    private exportService = inject(ExpHosoTuyensinhService);
    private auth = inject(AuthenticationService);
    private notification = inject(NotificationService);
    private fb = inject(FormBuilder);
    private onDestroy$ = new Subject<void>();
    private readonly tuyensinhStatusService = inject(RegistrationsStatusService)

    // ── Permission ──────────────────────────────────────────────

    private getPermissionMenuId(): string {
        const routeSegment = 'hoso-xettuyen';
        const matchesRoute = (value?: string): boolean =>
            value === routeSegment || Boolean(value?.endsWith(`/${routeSegment}`));

        for (const menu of this.auth.userMenu) {
            if (matchesRoute(menu.id) || matchesRoute(menu.url)) return menu.id;

            const child = menu.child?.find(item => matchesRoute(item.id) || matchesRoute(item.url));
            if (child) return child.id;
        }

        return 'hoso-tuyensinh';
    }

    private readonly exportRoles: SysRoleName[] = ['admin', 'direction', 'manager'];

    private isReviewer(): boolean {
        return this.auth.userHasRole(['reviewer']);
    }

    private createPermissionControl(): IctuPermissionControl {
        const menuPermission = this.auth.getUserPermission(this.getPermissionMenuId());
        if (!this.isReviewer()) return new IctuPermissionControl(menuPermission);

        return new IctuPermissionControl({
            view: true,
            create: false,
            update: false,
            delete: false,
        });
    }

    permissionControl: Signal<IctuPermissionControl> = signal<IctuPermissionControl>(
        this.createPermissionControl(),
    );
    readonly canExport = computed((): boolean =>
        !this.isReviewer() && this.auth.userHasRole(this.exportRoles),
    );
    readonly canViewApplication = computed((): boolean => this.isReviewer());
    readonly exportLoading = signal(false);

    listDataStatus: TuyensinhStatus[];
    // readonly statusOptions= TH_XETTUYEN;
    // ── Search / Filter ─────────────────────────────────────────

    searchInfo: {
        search: string;
        status?: RegistrationStatus;
        dotxettuyen_id?: number;
        nganh_dangky?: string;
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
            nganh_dangky: undefined,
            nguoi_tuvan: undefined,
            cccd: undefined,
            dia_chi_tinh: undefined,
            dia_chi_xa: undefined,
            noi_sinh: undefined,
            dan_toc: undefined,
            ctdt_id: undefined,
        };

    // ── Table ───────────────────────────────────────────────────

    dataTable: IctuDataTable<Registrations> = new IctuDataTable<Registrations>();
    state: WritableSignal<'loading' | 'success' | 'error'> = signal<'loading' | 'success' | 'error'>('success');
    private temp: IctuDataTablePaginatorInfo = { paged: 1, resetPaginator: true };

    // ── Filter toggle ───────────────────────────────────────────

    showAdvancedFilter: WritableSignal<boolean> = signal<boolean>(false);
    readonly onlyMyRecords = signal<boolean>(false);// hồ sơ xét duyệt
    readonly onlyByUser = signal<boolean>(false);// hồ sơ của tôi 

    // ── Lookups ─────────────────────────────────────────────────

    dots: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);
    majors: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);
    majorFilterOptions: WritableSignal<IctuDropdownOption<string>[]> = signal<IctuDropdownOption<string>[]>([]);
    programs: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);
    tinhList: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);
    xaList: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);
    users: WritableSignal<User[]> = signal<User[]>([]);

    // ── Static options ──────────────────────────────────────────

    readonly danTocOptions: IctuDropdownOption<string>[] = DanToc.map(d => ({ value: d.name, label: d.label }));
    readonly statusOptions: IctuDropdownOption<number>[] = TH_XETTUYEN.map(s => ({
        value: s.value,
        label: s.label,
    }));

    readonly statusBadgeMap: Record<RegistrationStatus, string> = {
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
    formControl!: IctuFormControl2<Registrations>;
    eventObserver$: Subject<DataTableEvent<Registrations>> = new Subject<DataTableEvent<Registrations>>();
    handelEvent!: Record<DataTableEventName, (data?: Registrations | Registrations[]) => void>;

    // ── Consultation drawer ─────────────────────────────────────

    readonly consultationDrawerVisible = signal<boolean>(false);
    readonly selectedConsultationHoso = signal<Registrations | null>(null);

    // ── View detail drawer ──────────────────────────────────────

    viewDetailVisible: WritableSignal<boolean> = signal<boolean>(false);
    viewDetailData: WritableSignal<Registrations | null> = signal<Registrations | null>(null);

    // ── View application drawer ─────────────────────────────────

    readonly viewDrawerVisible = signal<boolean>(false);
    readonly viewData = signal<Registrations | null>(null);

    // ── Edit drawer ────────────────────────────────────────────

    readonly editDrawerVisible = signal<boolean>(false);
    readonly editData = signal<Registrations | null>(null);

    isAdmin: boolean = this.auth.userHasRole(['admin', 'direction', 'manager']);
    isduyethoso: boolean = this.auth.userHasRole(['duyet_hoso']);
    isreview: boolean = this.auth.userHasRole(['reviewer']);
    isnv: boolean = this.auth.userHasRole(['doi-tac-cv', 'staff']);
    isDoitac: boolean = this.auth.userHasRole(['doi-tac']);

    constructor() {

        this.formControl = new IctuFormControl2<Registrations>({
            dropdownFields: [],
            formGroup: this.fb.group({}),
            objectName: 'hồ sơ xét tuyển',
            drawer: this.drawer,
        });

        this.handelEvent = {
            OPEN_FORM_ADD: (): void => {
                // Phase 2 — drawer form
            },
            OPEN_FORM_UPDATE: (data: Registrations): void => {
                this.editData.set(data);
                this.editDrawerVisible.set(true);
            },
            DELETE_SINGLE_ROW: ({ id }: Registrations): void => {
                this.requestDeletingData([id]);
            },
            DELETE_SELECTED_ROWS: (): void => {
                const ids: number[] = this.dataTable.getSelectedData().map(({ id }: Registrations): number => id);
                if (ids.length) this.requestDeletingData(ids);
            },
            SUBMIT_FORM: (): void => {
                // Phase 2 — drawer form
            },
        };

        this.eventObserver$.pipe(takeUntil(this.onDestroy$)).subscribe(
            ({ name, data }: DataTableEvent<Registrations>): void => this.handelEvent[name](data),
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
                    (r.data ?? []).map(d => ({ value: d.id, label: d.tieude }))),
            ),
            majors: this.nganhHocService.load({ search: '' }, qp).pipe(
                map((r: DtoObject<Nganhhoc[]>): IctuDropdownOption<number>[] =>
                    (r.data ?? []).map(m => ({ value: m.id, label: m.ten_nganh }))),
            ),

            tinhList: this.locationService.queryLocation([], qp, 'regions').pipe(
                map((r: DtoObject<any[]>): IctuDropdownOption<number>[] =>
                    (r.data ?? []).map(t => ({ value: t.id, label: t.name }))),
            ),
            users: this.isAdmin || this.isduyethoso
                ? this.userService.query([], {
                    ...qp,
                    select: 'id,display_name,email',
                }).pipe(map((response: DtoObject<User[]>): User[] => response.data ?? []))
                : of([]),
        }).pipe(takeUntil(this.onDestroy$)).subscribe({
            next: ({ dots, majors, tinhList, users }): void => {
                this.dots.set(dots);
                this.majors.set(majors);
                this.majorFilterOptions.set(majors.map((major): IctuDropdownOption<string> => ({
                    value: major.label,
                    label: major.label,
                })));
                this.tinhList.set(tinhList);
                this.users.set(users);
                this.loadData(1, true);

            },
            error: (): void => this.notification.toastError('Tải danh mục thất bại'),
        });
    }

    // ═════════════════════════════════════════════════════════════
    //  Data
    // ═════════════════════════════════════════════════════════════

    private readonly createdViewRoles: SysRoleName[] = ['doi-tac'];

    private buildConditions(): IctuConditionParam[] {
        const conditions: IctuConditionParam[] = [];
        const s = this.searchInfo;
        const userId = this.auth.user?.id;

        // if (this.onlyMyRecords()) {
        //     conditions.push({
        //         conditionName: this.auth.userHasRole(this.createdViewRoles) ? 'created_by' : 'owner_by',
        //         value: `${userId ?? ''}`,
        //         condition: IctuQueryCondition.equal,
        //     });
        // }

        if (this.onlyMyRecords()) {

            conditions.push({
                conditionName: 'nguoi_tuvan',
                value: userId.toString(),
                condition: IctuQueryCondition.equal,
            })
        } else {
            if (this.isAdmin) {

                if (this.onlyByUser()) {

                    conditions.push({
                        conditionName: 'owner_by',
                        value: userId.toString(),
                        condition: IctuQueryCondition.equal,
                    }
                    );
                }
            }

            // if (this.isduyethoso) {
            //     conditions.push({
            //         conditionName: 'nguoi_tuvan',
            //         value: userId.toString(),
            //         condition: IctuQueryCondition.equal,
            //     })
            // }
            if (this.isreview) {

            }
            if (this.isnv) {
                conditions.push({
                    conditionName: 'owner_by',
                    value: userId.toString(),
                    condition: IctuQueryCondition.equal,
                })
            }
            if (this.isDoitac) {
                conditions.push({
                    conditionName: 'created_by',
                    value: userId.toString(),
                    condition: IctuQueryCondition.equal,
                })
            }
        }




        // if (s.search) {
        //     conditions.push(
        //         { conditionName: 'ho_va_ten', value: `%${s.search}%`, condition: IctuQueryCondition.like },
        //     );
        // }
        if (s.status !== undefined) {
            conditions.push({ conditionName: 'status', value: `${s.status}`, condition: IctuQueryCondition.equal });
        }
        if (s.dotxettuyen_id) {
            conditions.push({ conditionName: 'dotxettuyen_id', value: `${s.dotxettuyen_id}`, condition: IctuQueryCondition.equal });
        }
        if (s.nganh_dangky) {
            conditions.push({ conditionName: 'nganh_dangky', value: s.nganh_dangky, condition: IctuQueryCondition.equal });
        }
        // if (s.cccd) {
        //     conditions.push({ conditionName: 'cccd', value: `%${s.cccd}%`, condition: IctuQueryCondition.like });
        // }
        if (s.dia_chi_tinh) {
            conditions.push({ conditionName: 'dia_chi_tinh', value: `${s.dia_chi_tinh}`, condition: IctuQueryCondition.equal });
        }

        return conditions;
    }

    loadData(paged: number = 1, resetPaginator: boolean = true): void {
        this.state.set('loading');
        this.temp = { paged, resetPaginator };
        const conditions: IctuConditionParam[] = this.buildConditions();
        let queryParams: IctuQueryParams = {
            limit: this.dataTable.paginator.rows(),
            paged,
            order: 'DESC',
            orderby: 'created_at',
        };

        if (this.searchInfo.search) {
            queryParams = { ...queryParams, search: this.searchInfo.search }
        }
        this.registrationsService.query(conditions, queryParams).pipe(
            map((res: DtoObject<Registrations[]>): Registrations[] => {
                if (resetPaginator) return this.dataTable.paginator.setupPaginator(res);
                this.dataTable.paginator.changePage(paged);
                return res.data ?? [];
            }),
            switchMap(m => forkJoin({ data: of(m), dataStatus: this.loopGetSatus(m, []) }))
        ).subscribe({
            next: ({ data, dataStatus }): void => {
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

    onOnlyMyRecordsChange(checked: boolean): void {

        if (checked == true) {
            this.onlyByUser.set(false);
        }
        this.onlyMyRecords.set(checked);
        this.loadData(1, true);
    }

    onOnlyByUserChange(checked: boolean): void {
        console.log(checked);
        this.onlyByUser.set(checked);

        if (checked == true) {
            this.onlyMyRecords.set(false);
        }
        this.loadData(1, true);
    }

    resetFilter(): void {
        this.searchInfo = {
            search: '',
            status: undefined,
            dotxettuyen_id: undefined,
            nganh_dangky: undefined,
            nguoi_tuvan: undefined,
            cccd: undefined,
            dia_chi_tinh: undefined,
            dia_chi_xa: undefined,
            noi_sinh: undefined,
            dan_toc: undefined,
            ctdt_id: undefined,
        };
        // this.onlyMyRecords.set(true);
        this.loadData(1, true);
    }

    // ═════════════════════════════════════════════════════════════
    //  CRUD events
    // ═════════════════════════════════════════════════════════════

    addItem(): void {
        if (!this.permissionControl().canCreate) {
            this.notification.toastError('Bạn không có quyền tạo hồ sơ xét tuyển');
            return;
        }
        this.eventObserver$.next({ name: 'OPEN_FORM_ADD', data: null as unknown as Registrations });
    }

    editItem(data: Registrations): void {
        if (!this.permissionControl().canUpdate) {
            this.notification.toastError('Bạn không có quyền cập nhật hồ sơ xét tuyển');
            return;
        }
        this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
    }

    viewApplication(data: Registrations): void {
        if (!this.canViewApplication()) {
            this.notification.toastError('Bạn không có quyền xem hồ sơ xét tuyển');
            return;
        }
        this.viewData.set({ ...data });
        this.viewDrawerVisible.set(true);
    }

    deleteItem(data: Registrations): void {
        if (!this.permissionControl().canDelete) {
            this.notification.toastError('Bạn không có quyền xóa hồ sơ xét tuyển');
            return;
        }
        this.eventObserver$.next({ name: 'DELETE_SINGLE_ROW', data });
    }

    deleteSelected(): void {
        if (!this.permissionControl().canDelete) {
            this.notification.toastError('Bạn không có quyền xóa hồ sơ xét tuyển');
            return;
        }
        this.eventObserver$.next({ name: 'DELETE_SELECTED_ROWS', data: null as unknown as Registrations });
    }

    submitForm(): void {
        this.eventObserver$.next({ name: 'SUBMIT_FORM', data: null as unknown as Registrations });
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
        if (!this.canExport()) {
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

        this.registrationsService.query(this.buildConditions(), queryParams).pipe(
            switchMap((response: DtoObject<Registrations[]>): Observable<HosoTuyensinhExportPayload> => {
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
            switchMap((payload: HosoTuyensinhExportPayload): Observable<void> => {
                return from(this.exportService.exportExcel(payload));
            }

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
        records: readonly Registrations[],
    ): Observable<HosoTuyensinhExportPayload> {
        const queryParams: IctuQueryParams = { limit: -1, paged: 1 };
        return forkJoin({
            majors: this.nganhHocService.load({ search: '' }, queryParams),

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
                    ma_nganh: major.ma_nganh,
                    ten_nganh: major.ten_nganh,
                })),
                rounds: (responses.rounds.data ?? []).map((round: DotXettuyen) => ({
                    id: round.id,
                    tieude: round.tieude,
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
            map((): IctuDeletingAnimationControl<Registrations> => new IctuDeletingAnimationControl(ids, this.registrationsService)),
            switchMap((ctrl: IctuDeletingAnimationControl<Registrations>): Observable<boolean> => {
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

    openLichSu(row: Registrations): void {
        this.selectedConsultationHoso.set({ ...row });
        this.consultationDrawerVisible.set(true);
    }

    // ═════════════════════════════════════════════════════════════
    //  View detail
    // ═════════════════════════════════════════════════════════════

    viewDetail(row: Registrations): void {
        this.viewDetailData.set(null);
        this.viewDetailVisible.set(true);
        const currentRow: Registrations = this.dataTable.data().find((r: Registrations): boolean => r.id === row.id) ?? row;
        this.registrationsService.get(row.id).pipe(takeUntil(this.onDestroy$)).subscribe({
            next: (data: Registrations): void => {
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

    statusLabel(status: RegistrationStatus | undefined): string {
        return this.statusOptions.find(s => s.value === status)?.label ?? `${status ?? '—'}`;
    }

    statusBadgeClass(status: RegistrationStatus | undefined): string {
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

    userLabel(userId: number | undefined): string {
        if (!userId) return '—';
        const user = this.users().find((item: User): boolean => item.id == userId);
        if (!user) return `#${userId}`;
        return user.email ? `${user.display_name} (${user.email})` : user.display_name;
    }

    private loopGetSatus(arr: Registrations[], data: TuyensinhStatus[]): Observable<TuyensinhStatus[]> {
        const index = arr.findIndex(f => !f['_getStatus']);

        if (index !== -1) {
            const item = arr[index];
            const condition_status: IctuConditionParam[] = [
                {
                    conditionName: 'registration_id',
                    condition: IctuQueryCondition.equal,
                    value: item.id.toString(),
                    orWhere: 'and'
                },
            ];

            arr[index]['_getStatus'] = true;
            return this.tuyensinhStatusService.query(condition_status, { limit: 1, paged: 1, order: 'DESC' }).pipe(switchMap(m => {
                return this.loopGetSatus(arr, [...data, ...m.data])
            }
            ))
        } else {
            return of(data)
        }

    }
    readonly addDuyetVisible = signal<boolean>(false);
    readonly reviewerOptions = signal<User[]>([]);
    readonly selectedReviewerId = signal<number | null>(null);
    readonly reviewerLoading = signal<boolean>(false);
    readonly reviewerSaving = signal<boolean>(false);
    readonly selectedReviewerRecords = computed<Registrations[]>(() => this.dataTable.getSelectedData());

    openFormDuyet(): void {
        if (!this.selectedReviewerRecords().length) {
            this.notification.toastWarning('Vui lòng chọn ít nhất một hồ sơ');
            return;
        }

        this.selectedReviewerId.set(null);
        this.reviewerOptions.set([]);
        this.addDuyetVisible.set(true);
        this.loadReviewerOptions();
    }

    closeReviewerAssignment(): void {
        if (this.reviewerSaving()) return;
        this.addDuyetVisible.set(false);
        this.selectedReviewerId.set(null);
    }

    saveReviewerAssignments(): void {
        const reviewerId: number | null = this.selectedReviewerId();
        const records: Registrations[] = this.selectedReviewerRecords();
        if (!reviewerId || !records.length || this.reviewerSaving()) return;

        this.reviewerSaving.set(true);
        from(records).pipe(
            concatMap((record: Registrations): Observable<unknown> =>
                this.registrationsService.updateRegistration(record.id, { nguoi_tuvan: reviewerId }),
            ),
            toArray(),
            finalize((): void => this.reviewerSaving.set(false)),
            takeUntil(this.onDestroy$),
        ).subscribe({
            next: (): void => {
                this.notification.toastSuccess(`Đã gán cán bộ duyệt cho ${records.length} hồ sơ`);
                this.addDuyetVisible.set(false);
                this.selectedReviewerId.set(null);
                this.loadData(this.temp.paged, false);
            },
            error: (): void => {
                this.notification.toastError('Gán cán bộ duyệt thất bại, quá trình đã dừng');
                this.loadData(this.temp.paged, false);
            },
        });
    }

    private loadReviewerOptions(): void {
        this.reviewerLoading.set(true);
        this.roleService.load().pipe(
            switchMap((roles) => {
                const reviewerRole = roles.find((role): boolean => role.name === 'duyet_hoso');
                if (!reviewerRole) return of([] as User[]);

                const conditions: IctuConditionParam[] = [{
                    conditionName: 'role_ids',
                    condition: IctuQueryCondition.like,
                    value: `%${reviewerRole.id}%`,
                    orWhere: 'and',
                }];
                return this.userService.query(conditions, {
                    limit: -1,
                    select: 'id,display_name,email',
                }).pipe(map((response: DtoObject<User[]>): User[] => response.data ?? []));
            }),
            finalize((): void => this.reviewerLoading.set(false)),
            takeUntil(this.onDestroy$),
        ).subscribe({
            next: (users: User[]): void => this.reviewerOptions.set(users),
            error: (): void => this.notification.toastError('Tải danh sách cán bộ duyệt thất bại'),
        });
    }

    getTime(time: string) {
        if (!time) {
            return '-';
        }
        const date = new Date(time);

        if (isNaN(date.getTime())) {
            return '-';
        }

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    }
}
