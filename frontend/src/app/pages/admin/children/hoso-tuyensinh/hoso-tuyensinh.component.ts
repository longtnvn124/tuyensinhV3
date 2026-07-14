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
import { AbstractControl } from '@angular/forms';
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
import { HosoThisinh } from '@app/models/tuyensinh/hoso-thisinh';
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
import { forkJoin, Observable, Subject } from 'rxjs';
import { filter, map, switchMap, takeUntil } from 'rxjs/operators';

type HosoStatus = 'cho_duyet' | 'da_duyet' | 'da_nhap_hoc' | 'bo_hoc' | 'huy';

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
        dot_dangky_id: undefined,
        major_id: undefined,
        nguoi_tuvan_id: undefined,
    };
    masterDataTable: IctuDataTable<HosoThisinh> = new IctuDataTable<HosoThisinh>();
    masterState: WritableSignal<'loading' | 'success' | 'error'> = signal<'loading' | 'success' | 'error'>('success');
    private masterTemp: IctuDataTablePaginatorInfo = { paged: 1, resetPaginator: true };

    // ── Lookups ─────────────────────────────────────────────────

    majors: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);
    programs: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);
    dots: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);

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

    readonly statusOptions: HosoStatusOption[] = [
        { value: 'cho_duyet', label: 'Chờ duyệt', badge: 'ictu-badge--warning' },
        { value: 'da_duyet', label: 'Đã duyệt', badge: 'ictu-badge--info' },
        { value: 'da_nhap_hoc', label: 'Đã nhập học', badge: 'ictu-badge--success' },
        { value: 'bo_hoc', label: 'Bỏ học', badge: 'ictu-badge--secondary' },
        { value: 'huy', label: 'Hủy', badge: 'ictu-badge--danger' },
    ];

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

    constructor() {
        this.masterFormControl = new IctuFormControl2<HosoThisinh>({
            dropdownFields: [],
            formGroup: this.fb.group({
                // §5.1 Personal info
                full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
                phone: ['', [Validators.required, Validators.pattern(/^(0[35789])(\d{8})$/)]],
                email: ['', [Validators.email]],
                birthday: [''],
                dan_toc: [''],
                noi_sinh: [''],
                address: [''],
                // §5.2 CCCD
                cccd: [''],
                cccd_ngaycap: [''],
                cccd_noicap: [''],
                // §5.3 Xét tuyển
                major_id: [null],
                program_id: [null],
                dot_dangky_id: [null],
                hinhthuc_xettuyen: ['hoc_ba'],
                nguon_dang_ky: ['website'],
                // §5.4 Văn bằng TN THPT
                vb_tn: [''],
                vb_tn_nam: [''],
                vb_tn_sohieu: [''],
                diem_xettuyen: [null],
                // §5.5 Văn bằng chuyên môn
                vb_chuyenmon: [''],
                vb_chuyenmon_nganh: [''],
                vb_chuyenmon_noicap: [''],
                // §5.7 Phân công
                nguoi_tuvan_id: [null],
                // §5.8 Trạng thái
                status: ['cho_duyet', [Validators.required]],
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

        forkJoin({
            majors: loadMajors$,
            programs: loadPrograms$,
            dots: loadDots$,
        })
            .pipe(takeUntil(this.onDestroy$))
            .subscribe({
                next: ({ majors, programs, dots }) => {
                    this.majors.set(majors);
                    this.programs.set(programs);
                    this.dots.set(dots);
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
        this.masterFormControl.formGroup.patchValue({ program_id: null });
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

                if (!res.found || res.record.status === 'bo_hoc') {
                    this.cccdDialogVisible = false;
                    this.masterFormControl.formGroup.reset({
                        full_name: '',
                        phone: '',
                        email: '',
                        birthday: '',
                        dan_toc: '',
                        noi_sinh: '',
                        address: '',
                        cccd,
                        cccd_ngaycap: '',
                        cccd_noicap: '',
                        major_id: null,
                        program_id: null,
                        dot_dangky_id: null,
                        hinhthuc_xettuyen: 'hoc_ba',
                        nguon_dang_ky: 'website',
                        vb_tn: '',
                        vb_tn_nam: '',
                        vb_tn_sohieu: '',
                        diem_xettuyen: null,
                        vb_chuyenmon: '',
                        vb_chuyenmon_nganh: '',
                        vb_chuyenmon_noicap: '',
                        nguoi_tuvan_id: null,
                        status: 'cho_duyet',
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
            full_name: row.full_name ?? '',
            phone: row.phone ?? '',
            email: row.email ?? '',
            birthday: row.birthday ?? '',
            dan_toc: row.dan_toc ?? '',
            noi_sinh: row.noi_sinh ?? '',
            address: row.address ?? '',
            cccd: row.cccd ?? '',
            cccd_ngaycap: row.cccd_ngaycap ?? '',
            cccd_noicap: row.cccd_noicap ?? '',
            major_id: row.major_id ?? null,
            program_id: row.program_id ?? null,
            dot_dangky_id: row.dot_dangky_id ?? null,
            hinhthuc_xettuyen: row.hinhthuc_xettuyen ?? 'hoc_ba',
            nguon_dang_ky: row.nguon_dang_ky ?? 'website',
            vb_tn: row.vb_tn ?? '',
            vb_tn_nam: row.vb_tn_nam ?? '',
            vb_tn_sohieu: row.vb_tn_sohieu ?? '',
            diem_xettuyen: row.diem_xettuyen ?? null,
            vb_chuyenmon: row.vb_chuyenmon ?? '',
            vb_chuyenmon_nganh: row.vb_chuyenmon_nganh ?? '',
            vb_chuyenmon_noicap: row.vb_chuyenmon_noicap ?? '',
            nguoi_tuvan_id: row.nguoi_tuvan_id ?? null,
            status: row.status ?? 'cho_duyet',
        });
        if (row.major_id) {
            this.onMajorChange(row.major_id);
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

    statusLabel(status: string | undefined): string {
        return this.statusOptions.find((s) => s.value === status)?.label ?? status ?? '—';
    }

    statusBadgeClass(status: string | undefined): string {
        return this.statusOptions.find((s) => s.value === status)?.badge ?? 'ictu-badge--secondary';
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

    private masterFormField(path: keyof HosoThisinh): AbstractControl | null {
        return this.masterFormControl.formGroup.get(path);
    }
}
