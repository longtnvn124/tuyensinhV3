import {
    Component,
    computed,
    inject,
    OnDestroy,
    OnInit,
    Signal,
    signal,
    WritableSignal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { HosoThisinh } from '@app/models/tuyensinh/hoso-thisinh';
import {
    HosoCheckCccdResult,
    HosoThisinhService,
} from '@services/tuyensinh/hoso-thisinh.service';
import { ApiOutsiteService } from '@services/tuyensinh/api-outsite.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { NotificationService } from '@services/notification.service';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { MatButton } from '@angular/material/button';
import { UploadPlaceholderComponent } from '../../hoso-tuyensinh/upload-placeholder/upload-placeholder.component';
import { DotXettuyen } from '@app/models/tuyensinh/dot-xettuyen';
import { CtdtItem, ExternalApiResponse, NganhItem } from '@app/models/external-api';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { forkJoin, Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { LocationService } from '@app/services/location.service';
import { Locations } from '@app/models/location';

type RightPanelState = 'cccd_check' | 'existing' | 'form';

interface StatusOption {
    value: string;
    label: string;
    badge: string;
}

@Component({
    selector: 'app-hoso-them',
    standalone: true,
    imports: [
    FormsModule,
    InputText,
    MatButton,
    NgClass,
    ReactiveFormsModule,
    Select,
    Textarea,
    UploadPlaceholderComponent,
 
],
    templateUrl: './hoso-them.component.html',
    styleUrl: './hoso-them.component.css',
})
export class HosoThemComponent implements OnInit, OnDestroy {

    // ── Services ────────────────────────────────────────────────

    private locationService: LocationService = inject(LocationService);
    private hosoService: HosoThisinhService = inject(HosoThisinhService);
    private dotService: DotXettuyenService = inject(DotXettuyenService);
    private apiOutsite: ApiOutsiteService = inject(ApiOutsiteService);
    private notification: NotificationService = inject(NotificationService);
    private fb: FormBuilder = inject(FormBuilder);
    private onDestroy$: Subject<void> = new Subject<void>();

    // ── Right panel state ───────────────────────────────────────

    rightState = signal<RightPanelState>('cccd_check');

    // ── CCCD check ──────────────────────────────────────────────

    cccdInput: string = '';
    cccdLoading: boolean = false;
    cccdResult: WritableSignal<HosoCheckCccdResult | null> =
        signal<HosoCheckCccdResult | null>(null);

    /** Narrowed record for safe template access on the discriminated union. */
    existingRecord: Signal<HosoThisinh | null> = computed<HosoThisinh | null>(() => {
        const r: HosoCheckCccdResult | null = this.cccdResult();
        return r && r.found ? r.record : null;
    });

    // ── Left panel ──────────────────────────────────────────────

    selectedMajorId: WritableSignal<number | null> = signal<number | null>(null);
    selectedProgramId: WritableSignal<number | null> = signal<number | null>(null);

    nganhOptions: WritableSignal<IctuDropdownOption<number>[]> =
        signal<IctuDropdownOption<number>[]>([]);
    chuongTrinhOptions: WritableSignal<IctuDropdownOption<number>[]> =
        signal<IctuDropdownOption<number>[]>([]);

    selectedMajorLabel: Signal<string> = computed<string>(() => {
        const id: number | null = this.selectedMajorId();
        if (!id) {return '';}
        return this.nganhOptions().find((o) => o.value === id)?.label ?? '';
    });

    selectedProgramLabel: Signal<string> = computed<string>(() => {
        const id: number | null = this.selectedProgramId();
        if (!id) {return '';}
        return this.chuongTrinhOptions().find((o) => o.value === id)?.label ?? '';
    });

    // ── Lookups ─────────────────────────────────────────────────

    dots: WritableSignal<IctuDropdownOption<number>[]> =
        signal<IctuDropdownOption<number>[]>([]);

    listTinh: WritableSignal<IctuDropdownOption<number>[]> =
        signal<IctuDropdownOption<number>[]>([]);
    listHuyen: WritableSignal<IctuDropdownOption<number>[]> =
        signal<IctuDropdownOption<number>[]>([]);
    listXa: WritableSignal<IctuDropdownOption<number>[]> =
        signal<IctuDropdownOption<number>[]>([]);

    // Raw location data for cascade
    private rawProvinces: WritableSignal<Locations[]> = signal<Locations[]>([]);

    // Raw program data for cascade (from external API)
    private rawCtdtList: WritableSignal<CtdtItem[]> = signal<CtdtItem[]>([]);

    // ── Static options ──────────────────────────────────────────

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

    readonly statusOptions: StatusOption[] = [
        { value: 'cho_duyet', label: 'Chờ duyệt', badge: 'ictu-badge--warning' },
        { value: 'da_duyet', label: 'Đã duyệt', badge: 'ictu-badge--info' },
        { value: 'da_nhap_hoc', label: 'Đã nhập học', badge: 'ictu-badge--success' },
        { value: 'bo_hoc', label: 'Bỏ học', badge: 'ictu-badge--secondary' },
        { value: 'huy', label: 'Hủy', badge: 'ictu-badge--danger' },
    ];

    // ── Form ────────────────────────────────────────────────────

    formGroup = this.fb.group({
        // Personal info
        full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
        phone: ['', [Validators.required, Validators.pattern(/^(0[35789])(\d{8})$/)]],
        email: ['', [Validators.email]],
        birthday: [''],
        tinh_id: [null as number | null],
        huyen_id: [null as number | null],
        xa_id: [null as number | null],
        address: [''],
        noi_sinh: [''],
        dan_toc: [''],
        nguon_dang_ky: ['website'],
        hinhthuc_xettuyen: ['hoc_ba'],
        // CCCD
        cccd: [''],
        cccd_ngaycap: [''],
        cccd_noicap: [''],
        // Xét tuyển
        major_id: [null as number | null],
        program_id: [null as number | null],
        dot_dangky_id: [null as number | null],
        // Văn bằng THPT
        vb_tn: [''],
        vb_tn_nam: [''],
        vb_tn_sohieu: [''],
        diem_xettuyen: [null as number | null],
        // Văn bằng chuyên môn
        vb_chuyenmon: [''],
        vb_chuyenmon_nganh: [''],
        vb_chuyenmon_noicap: [''],
        // Hidden
        status: ['cho_duyet'],
    });

    submitting: WritableSignal<boolean> = signal<boolean>(false);

    // ════════════════════════════════════════════════════════════
    //  Lifecycle
    // ════════════════════════════════════════════════════════════

    ngOnInit(): void {
        this.loadLookups();
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

        const loadMajors$: Observable<IctuDropdownOption<number>[]> = this.apiOutsite
            .getNganhList()
            .pipe(
                map(
                    (res: ExternalApiResponse<NganhItem[]>): IctuDropdownOption<number>[] =>
                        (res.data ?? []).filter(n => n.type === 'nganh').map((m) => ({
                            value: m.id,
                            label: m.title,
                        })),
                ),
            );

        const loadCtdt$: Observable<CtdtItem[]> = this.apiOutsite
            .getCtdtList()
            .pipe(map((res: ExternalApiResponse<CtdtItem[]>): CtdtItem[] => res.data ?? []));

        const loadDots$: Observable<IctuDropdownOption<number>[]> = this.dotService
            .load({ search: '' }, qp)
            .pipe(
                map(
                    (res: DtoObject<DotXettuyen[]>): IctuDropdownOption<number>[] =>
                        (res.data ?? []).map((d) => ({ value: d.id, label: d.name })),
                ),
            );

        const loadTinh$: Observable<IctuDropdownOption<number>[]> = this.locationService
            .queryLocation([], qp, 'regions')
            .pipe(
                map(
                    (res: DtoObject<Locations[]>): IctuDropdownOption<number>[] =>
                        (res.data ?? []).map((l) => ({ value: l.id, label: l.name })),
                ),
            );

        const loadProvinces$: Observable<Locations[]> = this.locationService
            .queryLocation([], qp, 'provinces')
            .pipe(map((res: DtoObject<Locations[]>): Locations[] => res.data ?? []));

        forkJoin({
            majors: loadMajors$,
            ctdt: loadCtdt$,
            dots: loadDots$,
            tinh: loadTinh$,
            provinces: loadProvinces$,
        })
            .pipe(takeUntil(this.onDestroy$))
            .subscribe({
                next: ({ majors, ctdt, dots, tinh, provinces }) => {
                    this.nganhOptions.set(majors);
                    this.rawCtdtList.set(ctdt);
                    this.dots.set(dots);
                    this.listTinh.set(tinh);
                    this.rawProvinces.set(provinces);
                },
                error: () => {
                    this.notification.toastError('Tải dữ liệu danh mục thất bại');
                },
            });
    }

    // ════════════════════════════════════════════════════════════
    //  Left panel handlers
    // ════════════════════════════════════════════════════════════

    onMajorChange(majorId: number | null): void {
        this.selectedMajorId.set(majorId);
        this.selectedProgramId.set(null);
        this.chuongTrinhOptions.set([]);
        this.formGroup.patchValue({ major_id: majorId, program_id: null });

        if (!majorId) {return;}

        const opts: IctuDropdownOption<number>[] = this.rawCtdtList()
            .filter((p) => p.nganh_id === majorId)
            .map((p) => ({
                value: p.id,
                label: `${p.madt ?? ''} — ${p.ten}`,
            }));
        this.chuongTrinhOptions.set(opts);
    }

    onProgramChange(programId: number | null): void {
        this.selectedProgramId.set(programId);
        this.formGroup.patchValue({ program_id: programId });
    }

    // ════════════════════════════════════════════════════════════
    //  Location cascade
    // ════════════════════════════════════════════════════════════

    onTinhChange(tinhId: number | null): void {
        this.formGroup.patchValue({ huyen_id: null, xa_id: null });
        this.listHuyen.set([]);
        this.listXa.set([]);

        if (!tinhId) {return;}

        const filtered: IctuDropdownOption<number>[] = this.rawProvinces()
            .filter((p) => p.parent_id === tinhId)
            .map((p) => ({ value: p.id, label: p.name }));
        this.listHuyen.set(filtered);
    }

    onHuyenChange(huyenId: number | null): void {
        this.formGroup.patchValue({ xa_id: null });
        this.listXa.set([]);

        if (!huyenId) {return;}

        const conditions: IctuConditionParam[] = [
            {
                conditionName: 'parent_id',
                value: `${huyenId}`,
                condition: IctuQueryCondition.equal,
            },
        ];
        this.locationService
            .queryLocation(conditions, { limit: -1 }, 'districts')
            .pipe(takeUntil(this.onDestroy$))
            .subscribe({
                next: (res: DtoObject<Locations[]>) => {
                    this.listXa.set(
                        (res.data ?? []).map((l) => ({ value: l.id, label: l.name })),
                    );
                },
                error: () => {
                    this.listXa.set([]);
                },
            });
    }

    // ════════════════════════════════════════════════════════════
    //  CCCD check
    // ════════════════════════════════════════════════════════════

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
                this.cccdResult.set(res);

                if (!res.found || res.record.status === 'bo_hoc') {
                    this.formGroup.patchValue({ cccd });
                    this.rightState.set('form');
                } else {
                    this.rightState.set('existing');
                }
            },
            error: () => {
                this.cccdLoading = false;
                this.notification.toastError('Kiểm tra CCCD thất bại. Vui lòng thử lại.');
            },
        });
    }

    backToCccdCheck(): void {
        this.cccdResult.set(null);
        this.rightState.set('cccd_check');
    }

    // ════════════════════════════════════════════════════════════
    //  Form actions
    // ════════════════════════════════════════════════════════════

    onSubmit(): void {
        if (this.formGroup.invalid) {
            this.formGroup.markAllAsTouched();
            return;
        }
        this.submitting.set(true);

        const raw: Partial<HosoThisinh> = this.formGroup.value as Partial<HosoThisinh>;
        raw.major_id = this.selectedMajorId();
        raw.program_id = this.selectedProgramId();

        this.hosoService.create(raw).subscribe({
            next: () => {
                this.submitting.set(false);
                this.notification.toastSuccess('Thêm hồ sơ thành công', 'Thông báo');
                this.fullReset();
            },
            error: () => {
                this.submitting.set(false);
                this.notification.toastError('Thêm hồ sơ thất bại', 'Thông báo');
            },
        });
    }

    onReset(): void {
        this.fullReset();
    }

    onResetForm(): void {
        this.formGroup.reset({
            nguon_dang_ky: 'website',
            hinhthuc_xettuyen: 'hoc_ba',
            status: 'cho_duyet',
        });
        const cccdVal: string = (this.cccdInput || '').trim();
        if (cccdVal) {
            this.formGroup.patchValue({ cccd: cccdVal });
        }
    }

    private fullReset(): void {
        this.rightState.set('cccd_check');
        this.cccdInput = '';
        this.cccdLoading = false;
        this.cccdResult.set(null);
        this.selectedMajorId.set(null);
        this.selectedProgramId.set(null);
        this.chuongTrinhOptions.set([]);
        this.listHuyen.set([]);
        this.listXa.set([]);
        this.formGroup.reset({
            nguon_dang_ky: 'website',
            hinhthuc_xettuyen: 'hoc_ba',
            status: 'cho_duyet',
        });
    }

    // ════════════════════════════════════════════════════════════
    //  Helpers
    // ════════════════════════════════════════════════════════════

    majorLabel(majorId: number | undefined | null): string {
        if (!majorId) {return '—';}
        return this.nganhOptions().find((m) => m.value === majorId)?.label ?? `#${majorId}`;
    }

    programLabel(programId: number | undefined | null): string {
        if (!programId) {return '—';}
        return this.chuongTrinhOptions().find((p) => p.value === programId)?.label ?? `#${programId}`;
    }

    dotLabel(dotId: number | undefined | null): string {
        if (!dotId) {return '—';}
        return this.dots().find((d) => d.value === dotId)?.label ?? `#${dotId}`;
    }

    statusLabel(status: string | undefined | null): string {
        if (!status) {return '—';}
        return this.statusOptions.find((s) => s.value === status)?.label ?? status;
    }

    statusBadgeClass(status: string | undefined | null): string {
        if (!status) {return 'ictu-badge--secondary';}
        return this.statusOptions.find((s) => s.value === status)?.badge ?? 'ictu-badge--secondary';
    }
}
