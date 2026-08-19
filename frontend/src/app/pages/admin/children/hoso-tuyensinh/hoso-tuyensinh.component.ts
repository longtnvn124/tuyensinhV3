import {
    Component,
    inject,
    OnDestroy,
    OnInit,
    Signal,
    signal,
    viewChild,
    WritableSignal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { IctuBasePermission, IctuPermissionControl } from '@models/ictu-base-model';
import {
    DataTableEvent,
    DataTableEventName,
    IctuDataTable,
    IctuDataTablePaginatorInfo,
} from '@models/datatable';
import { IctuFormControl2 } from '@models/ictu-form-control';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import { DtoObject, IctuQueryParams } from '@models/dto';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { HosoStatus, HosoThisinh } from '@app/models/tuyensinh/hoso-thisinh';
import { Nganhhoc } from '@app/models/tuyensinh/nganhhoc';
import { ChuongtrinhDaotao } from '@app/models/tuyensinh/chuongtrinh-daotao';
import { DotXettuyen } from '@app/models/tuyensinh/dot-xettuyen';
import {
    HosoCheckCccdResult,
    HosoThisinhSearchInfo,
    HosoThisinhService,
} from '@services/tuyensinh/hoso-thisinh.service';
import { NganhhocService } from '@services/tuyensinh/nganhhoc.service';
import { ChuongtrinhDaotaoService } from '@services/tuyensinh/chuongtrinh-daotao.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { Drawer } from 'primeng/drawer';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { UploadPlaceholderComponent } from './upload-placeholder/upload-placeholder.component';
import { OvicImgCropV2Component } from '@app/components/ovic-img-crop-v2/ovic-img-crop-v2.component';
import { DOI_TUONG, GENDER, TH_XETTUYEN } from '@app/utilities/syscats';
import { forkJoin, Observable, Subject } from 'rxjs';
import { filter, map, switchMap, takeUntil } from 'rxjs/operators';
import { LocationService } from '@app/services/location.service';
import { Locations } from '@app/models/location';

interface HosoStatusOption {
    value: HosoStatus;
    label: string;
    badge: string;
}

@Component({
    selector: 'app-hoso-tuyensinh',
    standalone: true,
    imports: [
        Dialog,
        Drawer,
        FormsModule,
        IctuPaginatorComponent,
        InputText,
        LoadingProgressComponent,
        MatButton,
        MatCheckbox,
        NgClass,
        OvicImgCropV2Component,
        ReactiveFormsModule,
        Select,
        Textarea,
        UploadPlaceholderComponent,
    ],
    templateUrl: './hoso-tuyensinh.component.html',
    styleUrl: './hoso-tuyensinh.component.css',
})
export class HosoTuyensinhComponent implements OnInit, OnDestroy, IctuBasePermission {

    // ── Services ────────────────────────────────────────────────
    private locationService: LocationService = inject(LocationService);
    private hosoService: HosoThisinhService = inject(HosoThisinhService);
    private nganhHocService: NganhhocService = inject(NganhhocService);
    private ctdtService: ChuongtrinhDaotaoService = inject(ChuongtrinhDaotaoService);
    private dotService: DotXettuyenService = inject(DotXettuyenService);
    private auth: AuthenticationService = inject(AuthenticationService);
    private notification: NotificationService = inject(NotificationService);
    private fb: FormBuilder = inject(FormBuilder);
    private onDestroy$: Subject<void> = new Subject<void>();

    // ── Permission ──────────────────────────────────────────────

    permissionControl: Signal<IctuPermissionControl> = signal<IctuPermissionControl>(
        new IctuPermissionControl(this.auth.getUserPermission('hoso-tuyensinh')),
    );

    // ── Master state ────────────────────────────────────────────

    masterSearchInfo: HosoThisinhSearchInfo = {
        search: '',
        status: undefined,
        dotxettuyen_id: undefined,
        nganh_id: undefined,
        nguoi_tuvan: undefined,
    };
    masterDataTable: IctuDataTable<HosoThisinh> = new IctuDataTable<HosoThisinh>();
    masterState: WritableSignal<'loading' | 'success' | 'error'> = signal<'loading' | 'success' | 'error'>('success');
    private masterTemp: IctuDataTablePaginatorInfo = { paged: 1, resetPaginator: true };

    // ── Lookups ─────────────────────────────────────────────────

    majors: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);
    programs: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);
    dots: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);

    listTinh: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);
    listXa: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);

    // ── CCCD dialog ────────────────────────────────────────────

    cccdDialogVisible: boolean = false;
    cccdInput: string = '';
    cccdLoading: boolean = false;
    cccdResult: HosoCheckCccdResult | null = null;

    // ── Drawer form ────────────────────────────────────────────

    readonly masterDrawer = viewChild<Drawer>('masterDrawer');
    masterFormControl!: IctuFormControl2<HosoThisinh>;
    masterEventObserver$: Subject<DataTableEvent<HosoThisinh>> = new Subject<DataTableEvent<HosoThisinh>>();
    masterHandelEvent!: Record<DataTableEventName, (data?: HosoThisinh | HosoThisinh[]) => void>;

    // ── Static options ──────────────────────────────────────────

    readonly statusOptions: HosoStatusOption[] = TH_XETTUYEN.map((item) => ({
        value: item.value as HosoStatus,
        label: item.label,
        badge: this.getStatusBadge(item.value as HosoStatus),
    }));

    readonly hinhthucOptions: IctuDropdownOption<string>[] = [
        { value: 'hoc_ba', label: 'Học bạ' },
        { value: 'thpt_quoc_gia', label: 'THPT Quốc gia' },
        { value: 'xet_tuyen_som', label: 'Xét tuyển sớm' },
    ];

    readonly nguonOptions: IctuDropdownOption<string>[] = [
        { value: 'website', label: 'Website' },
        { value: 'doi_tac', label: 'Đối tác' },
        { value: 'truc_tiep', label: 'Trực tiếp' },
    ];

    readonly genderOptions = GENDER;
    readonly doituongOptions = DOI_TUONG;

    constructor() {
        this.masterFormControl = new IctuFormControl2<HosoThisinh>({
            dropdownFields: [],
            formGroup: this.fb.group({
                ho_va_ten: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
                dien_thoai: ['', [Validators.required, Validators.pattern(/^(0[35789])(\d{8})$/)]],
                email: ['', Validators.email],
                ngay_sinh: [''],
                gioi_tinh: ['', Validators.required],
                dan_toc: [''],
                noi_sinh: [null],
                dia_chi_tinh: [null],
                dia_chi_xa: [null],
                dia_chi_nha: [''],
                cccd: [''],
                ngay_cap_cccd: [''],
                noi_cap_cccd: [''],
                nganh_id: [null],
                ctdt_id: [null],
                dotxettuyen_id: [null],
                doituong: ['', Validators.required],
                hinhthuc_xettuyen: ['hoc_ba'],
                submit_from: ['website'],
                van_bang_tn: [''],
                nam_tn: [''],
                sohieu_vb: [''],
                tn_noicap: [''],
                diem_xettuyen: [null],
                vb_chuyenmon: [''],
                vb_chuyenmon_nganh: [''],
                vb_chuyenmon_noicap: [''],
                vb_chuyenmon_sohieu: [''],
                vb_chuyenmon_namtn: [''],
                nguoi_tuvan: [null],
                anh_soyeulylich: ['', Validators.required],
                status: [0, Validators.required],
                status_connent: [0],
                owner_by: [this.auth.user?.id],
            }),
            objectName: 'hồ sơ tuyển sinh',
            drawer: this.masterDrawer as Signal<Drawer>,
        });

        this.masterHandelEvent = {
            OPEN_FORM_ADD: (): void => {
                this.openCccdDialog();
            },
            OPEN_FORM_UPDATE: (data: HosoThisinh): void => {
                this.openEditForm(data);
            },
            DELETE_SINGLE_ROW: ({ id }: HosoThisinh): void => {
                this.requestMasterDeletingData([id]);
            },
            DELETE_SELECTED_ROWS: (): void => {
                const ids: number[] = this.masterDataTable
                    .getSelectedData()
                    .map(({ id }: HosoThisinh): number => id);
                if (ids.length) {
                    this.requestMasterDeletingData(ids);
                }
            },
            SUBMIT_FORM: (): void => {
                this.submitForm();
            },
        };

        this.masterEventObserver$.pipe(takeUntil(this.onDestroy$)).subscribe(
            ({ name, data }: DataTableEvent<HosoThisinh>): void => this.masterHandelEvent[name](data),
        );
    }

    // ════════════════════════════════════════════════════════════
    //  Lifecycle
    // ════════════════════════════════════════════════════════════

    ngOnInit(): void {
        this.loadLookups();
        this.loadMasterData(1, true);
    }

    ngOnDestroy(): void {
        this.onDestroy$.next();
        this.onDestroy$.complete();
    }

    // ════════════════════════════════════════════════════════════
    //  Lookups
    // ════════════════════════════════════════════════════════════

    private loadLookups(): void {
        const qp: IctuQueryParams = { limit: -1 };
        const loadMajors$: Observable<IctuDropdownOption<number>[]> = this.nganhHocService
            .load({ search: '' }, qp)
            .pipe(map((res: DtoObject<Nganhhoc[]>): IctuDropdownOption<number>[] =>
                (res.data ?? []).map((m) => ({ value: m.id, label: m.name })),
            ));
        const loadPrograms$: Observable<IctuDropdownOption<number>[]> = this.ctdtService
            .query([], qp)
            .pipe(map((res: DtoObject<ChuongtrinhDaotao[]>): IctuDropdownOption<number>[] =>
                (res.data ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
            ));
        const loadDots$: Observable<IctuDropdownOption<number>[]> = this.dotService
            .load({ search: '' }, qp)
            .pipe(map((res: DtoObject<DotXettuyen[]>): IctuDropdownOption<number>[] =>
                (res.data ?? []).map((d) => ({ value: d.id, label: d.name })),
            ));

        const tinh$: Observable<IctuDropdownOption<number>[]> =
            this.locationService.queryLocation([], { paged: 1, limit: -1 }, 'regions')
                .pipe(map((res: DtoObject<Locations[]>): IctuDropdownOption<number>[] =>
                    (res.data ?? []).map((location) => ({ value: location.id, label: location.name })),
                ));

        const xaphuong$: Observable<IctuDropdownOption<number>[]> =
            this.locationService.queryLocation([], { paged: 1, limit: -1 }, 'provinces')
                .pipe(map((res: DtoObject<Locations[]>): IctuDropdownOption<number>[] =>
                    (res.data ?? []).map((location) => ({ value: location.id, label: location.name })),
                ));

        forkJoin({
            majors: loadMajors$,
            programs: loadPrograms$,
            dots: loadDots$,
            listTinh: tinh$,
            listXaphuong: xaphuong$,
        })
            .pipe(takeUntil(this.onDestroy$))
            .subscribe({
                next: ({ majors, programs, dots, listTinh, listXaphuong }) => {
                    this.majors.set(majors);
                    this.programs.set(programs);
                    this.dots.set(dots);
                    this.listTinh.set(listTinh);
                    this.listXa.set(listXaphuong);
                },
                error: () => {
                    this.notification.toastError('Tải dữ liệu danh mục thất bại');
                },
            });
    }

    programsByMajor(majorId: number | null): IctuDropdownOption<number>[] {
        if (!majorId) {
            return this.programs();
        }
        return this.programs();
    }

    onMajorChange(majorId: number | null): void {
        this.masterFormControl.formGroup.patchValue({ ctdt_id: null });
        if (!majorId) {
            return;
        }
        this.ctdtService
            .load({ search: '' }, majorId, { limit: -1 })
            .pipe(takeUntil(this.onDestroy$))
            .subscribe({
                next: (res: DtoObject<ChuongtrinhDaotao[]>) => {
                    this.programs.set(
                        (res.data ?? []).map(
                            (p) => ({ value: p.id, label: `${p.code} — ${p.name}` } as IctuDropdownOption<number>),
                        ),
                    );
                },
            });
    }

    // ════════════════════════════════════════════════════════════
    //  Master list
    // ════════════════════════════════════════════════════════════

    loadMasterData(paged: number = 1, resetPaginator: boolean = true): void {
        this.masterState.set('loading');
        this.masterTemp = { paged, resetPaginator };
        const queryParams: Partial<IctuQueryParams> = {
            paged,
            limit: this.masterDataTable.paginator.rows(),
        };
        this.hosoService.load(this.masterSearchInfo, queryParams)
            .pipe(
                map((res: DtoObject<HosoThisinh[]>): HosoThisinh[] => {
                    if (resetPaginator) {
                        return this.masterDataTable.paginator.setupPaginator(res);
                    }
                    this.masterDataTable.paginator.changePage(paged);
                    return res.data ?? [];
                }),
            )
            .subscribe({
                next: (data: HosoThisinh[]) => {
                    this.masterDataTable.fillData(data);
                    this.masterState.set('success');
                },
                error: () => {
                    this.masterState.set('error');
                },
            });
    }

    onSearch(): void {
        this.loadMasterData(1, true);
    }

    onMasterChangePage(paged: number): void {
        this.loadMasterData(paged, false);
    }

    onMasterDrawerHide(): void {
        if (this.masterFormControl.submitted) {
            this.loadMasterData(1, true);
        }
    }

    addHoso(): void {
        this.masterEventObserver$.next({ name: 'OPEN_FORM_ADD', data: null as unknown as HosoThisinh });
    }

    editHoso(row: HosoThisinh): void {
        this.masterEventObserver$.next({ name: 'OPEN_FORM_UPDATE', data: row });
    }

    deleteHoso(row: HosoThisinh): void {
        this.masterEventObserver$.next({ name: 'DELETE_SINGLE_ROW', data: row });
    }

    deleteSelectedHoso(): void {
        this.masterEventObserver$.next({ name: 'DELETE_SELECTED_ROWS', data: null as unknown as HosoThisinh });
    }

    submitMasterForm(): void {
        this.masterEventObserver$.next({ name: 'SUBMIT_FORM', data: null as unknown as HosoThisinh });
    }

    reloadMaster(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.loadMasterData(this.masterTemp.paged, this.masterTemp.resetPaginator);
    }

    // ════════════════════════════════════════════════════════════
    //  CCCD dialog
    // ════════════════════════════════════════════════════════════

    openCccdDialog(): void {
        this.cccdInput = '';
        this.cccdResult = null;
        this.cccdLoading = false;
        this.cccdDialogVisible = true;
    }

    closeCccdDialog(): void {
        this.cccdDialogVisible = false;
    }

    runCccdCheck(): void {
        const cccd: string = (this.cccdInput || '').trim();
        if (!cccd) {
            this.notification.toastWarning('Vui lòng nhập số CCCD');
            return;
        }
        this.cccdLoading = true;
        this.hosoService.checkCccd(cccd).subscribe({
            next: (res: HosoCheckCccdResult) => {
                this.cccdLoading = false;
                this.cccdResult = res;

                if (!res.found || res.record.status === 4) {
                    this.cccdDialogVisible = false;
                    this.masterFormControl.formGroup.reset({
                        ho_va_ten: '',
                        dien_thoai: '',
                        email: '',
                        ngay_sinh: '',
                        gioi_tinh: '',
                        dan_toc: '',
                        noi_sinh: null,
                        dia_chi_tinh: null,
                        dia_chi_xa: null,
                        dia_chi_nha: '',
                        cccd,
                        ngay_cap_cccd: '',
                        noi_cap_cccd: '',
                        nganh_id: null,
                        ctdt_id: null,
                        dotxettuyen_id: null,
                        doituong: '',
                        hinhthuc_xettuyen: 'hoc_ba',
                        submit_from: 'website',
                        van_bang_tn: '',
                        nam_tn: '',
                        sohieu_vb: '',
                        tn_noicap: '',
                        diem_xettuyen: null,
                        vb_chuyenmon: '',
                        vb_chuyenmon_nganh: '',
                        vb_chuyenmon_noicap: '',
                        vb_chuyenmon_sohieu: '',
                        vb_chuyenmon_namtn: '',
                        nguoi_tuvan: null,
                        anh_soyeulylich: '',
                        status: 0,
                        status_connent: 0,
                        owner_by: this.auth.user?.id,
                    });
                    this.masterFormControl.openFormAdd();
                }
            },
            error: () => {
                this.cccdLoading = false;
                this.notification.toastError('Kiểm tra CCCD thất bại. Vui lòng thử lại.');
            },
        });
    }

    // ════════════════════════════════════════════════════════════
    //  Edit form
    // ════════════════════════════════════════════════════════════

    openEditForm(row: HosoThisinh): void {
        this.masterFormControl.formGroup.reset({
            ho_va_ten: row.ho_va_ten ?? '',
            dien_thoai: row.dien_thoai ?? '',
            email: row.email ?? '',
            ngay_sinh: row.ngay_sinh ?? '',
            gioi_tinh: row.gioi_tinh ?? '',
            dan_toc: row.dan_toc ?? '',
            noi_sinh: row.noi_sinh ?? null,
            dia_chi_tinh: row.dia_chi_tinh ?? null,
            dia_chi_xa: row.dia_chi_xa ?? null,
            dia_chi_nha: row.dia_chi_nha ?? '',
            cccd: row.cccd ?? '',
            ngay_cap_cccd: row.ngay_cap_cccd ?? '',
            noi_cap_cccd: row.noi_cap_cccd ?? '',
            nganh_id: row.nganh_id ?? null,
            ctdt_id: row.ctdt_id ?? null,
            dotxettuyen_id: row.dotxettuyen_id ?? null,
            doituong: row.doituong ?? '',
            hinhthuc_xettuyen: row.hinhthuc_xettuyen ?? 'hoc_ba',
            submit_from: row.submit_from ?? 'website',
            van_bang_tn: row.van_bang_tn ?? '',
            nam_tn: row.nam_tn ?? '',
            sohieu_vb: row.sohieu_vb ?? '',
            tn_noicap: row.tn_noicap ?? '',
            diem_xettuyen: row.diem_xettuyen ?? null,
            vb_chuyenmon: row.vb_chuyenmon ?? '',
            vb_chuyenmon_nganh: row.vb_chuyenmon_nganh ?? '',
            vb_chuyenmon_noicap: row.vb_chuyenmon_noicap ?? '',
            vb_chuyenmon_sohieu: row.vb_chuyenmon_sohieu ?? '',
            vb_chuyenmon_namtn: row.vb_chuyenmon_namtn ?? '',
            nguoi_tuvan: row.nguoi_tuvan ?? null,
            anh_soyeulylich: row.anh_soyeulylich ?? '',
            status: row.status ?? 0,
            status_connent: row.status_connent ?? 0,
            owner_by: row.owner_by,
        });
        if (row.nganh_id) {
            this.onMajorChange(row.nganh_id);
        }
        this.masterFormControl.openFormEdit(row);
    }

    submitForm(): void {
        if (!this.masterFormControl.canSubmit) {
            this.masterFormControl.formGroup.markAllAsTouched();
            return;
        }
        const raw: Partial<HosoThisinh> = this.masterFormControl.formGroup.value;
        const info: Partial<HosoThisinh> = { ...raw };
        const request: Observable<any> = this.masterFormControl.isFormAdd
            ? this.hosoService.create(info)
            : this.hosoService.update(this.masterFormControl.object.id, info);
        const message: string = this.masterFormControl.isFormAdd
            ? 'Thêm hồ sơ thành công'
            : 'Cập nhật hồ sơ thành công';
        this.masterFormControl.submit(request).subscribe({
            next: (): void => {
                this.notification.toastSuccess(message, 'Thông báo');
                this.masterFormControl.closeForm();
                this.loadMasterData(1, true);
            },
            error: (): void => {
                this.notification.toastError(message, 'Thông báo');
            },
        });
    }

    // ════════════════════════════════════════════════════════════
    //  Delete
    // ════════════════════════════════════════════════════════════

    private requestMasterDeletingData(ids: number[]): void {
        this.notification.confirmDelete(ids.length).pipe(
            filter((confirm: boolean): boolean => confirm),
            map((): IctuDeletingAnimationControl<HosoThisinh> =>
                new IctuDeletingAnimationControl<HosoThisinh>(ids, this.hosoService),
            ),
            switchMap((deleteController: IctuDeletingAnimationControl<HosoThisinh>): Observable<boolean> => {
                deleteController.run();
                return this.notification.startDeleting(deleteController.progress);
            }),
        ).subscribe({
            next: (success: boolean): void => {
                if (success) {
                    this.notification.toastSuccess('Xóa hồ sơ thành công');
                }
                this.loadMasterData(1, true);
            },
            error: (): void => {
                this.notification.toastError('Xóa hồ sơ thất bại');
                this.loadMasterData(1, true);
            },
        });
    }

    // ════════════════════════════════════════════════════════════
    //  Helpers
    // ════════════════════════════════════════════════════════════

    statusLabel(status: HosoStatus | undefined): string {
        return this.statusOptions.find((item) => item.value === status)?.label ?? `${status ?? '—'}`;
    }

    statusBadgeClass(status: HosoStatus | undefined): string {
        return status === undefined ? 'ictu-badge--secondary' : this.getStatusBadge(status);
    }

    private getStatusBadge(status: HosoStatus): string {
        const badges: Record<HosoStatus, string> = {
            [-1]: 'ictu-badge--danger',
            0: 'ictu-badge--warning',
            1: 'ictu-badge--danger',
            2: 'ictu-badge--info',
            3: 'ictu-badge--success',
            4: 'ictu-badge--secondary',
            5: 'ictu-badge--warning',
            6: 'ictu-badge--success',
        };
        return badges[status];
    }

    majorLabel(majorId: number | undefined): string {
        if (!majorId) {
            return '—';
        }
        return this.majors().find((m) => m.value === majorId)?.label ?? `#${majorId}`;
    }

    programLabel(programId: number | undefined): string {
        if (!programId) {
            return '—';
        }
        return this.programs().find((p) => p.value === programId)?.label ?? `#${programId}`;
    }

    dotLabel(dotId: number | undefined): string {
        if (!dotId) {
            return '—';
        }
        return this.dots().find((d) => d.value === dotId)?.label ?? `#${dotId}`;
    }



    // onChangeTinh(event) {
    //     if (event) {
    //         this.locationService.queryLocation([],{limit:-1,paged:1}, 'provinces').subscribe({
    //             next: (_res) => {
                    
    //                 this.listXa.set(_);
    //             },
    //             error: () => {
    //                 this.notification.toastError("Không tải được Phường/Xã huyện trực thuộc")
    //             }
    //         });
    //     }
    // }
}
