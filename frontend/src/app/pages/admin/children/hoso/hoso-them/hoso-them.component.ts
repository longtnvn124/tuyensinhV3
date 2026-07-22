import { NgClass } from '@angular/common';
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
import { FormsModule } from '@angular/forms';
import { IctuDropdownOption, IctuDropdownOption2 } from '@models/ictu-dropdown-option';
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
import { MatButton } from '@angular/material/button';
import { DotXettuyen } from '@app/models/tuyensinh/dot-xettuyen';
import { CtdtItem, ExternalApiResponse, NganhItem } from '@app/models/external-api';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { forkJoin, Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { LocationService } from '@app/services/location.service';
import { Locations } from '@app/models/location';
import { FormThongtinDangkyComponent } from '../form-thongtin-dangky/form-thongtin-dangky.component';

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
        NgClass,
        FormsModule,
        InputText,
        MatButton,
        Select,
        FormThongtinDangkyComponent,
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
    chuongTrinhOptions: WritableSignal<IctuDropdownOption2<CtdtItem, number>[]> =
        signal<IctuDropdownOption2<CtdtItem, number>[]>([]);

    selectedMajorLabel: Signal<string> = computed<string>(() => {
        const id: number | null = this.selectedMajorId();
        if (!id) { return ''; }
        return this.nganhOptions().find((o) => o.value === id)?.label ?? '';
    });

    selectedProgramLabel: Signal<string> = computed<string>(() => {
        const id: number | null = this.selectedProgramId();
        if (!id) { return ''; }
        return this.chuongTrinhOptions().find((o) => o.value === id)?.label ?? '';
    });

    selectedProgramDuration: Signal<string> = computed<string>(() => {
        const id: number | null = this.selectedProgramId();
        if (!id) { return ''; }
        return this.chuongTrinhOptions().find((o) => o.value === id)?.raw?.thoigian_daotao ?? '';
    });

    selectedProgramDegree: Signal<string> = computed<string>(() => {
        const id: number | null = this.selectedProgramId();
        if (!id) { return ''; }
        return this.chuongTrinhOptions().find((o) => o.value === id)?.raw?.danhhieu_totnghiep ?? '';
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

    // ── Static options ──────────────────────────────────────────

    readonly statusOptions: StatusOption[] = [
        { value: 'cho_duyet', label: 'Chờ duyệt', badge: 'ictu-badge--warning' },
        { value: 'da_duyet', label: 'Đã duyệt', badge: 'ictu-badge--info' },
        { value: 'da_nhap_hoc', label: 'Đã nhập học', badge: 'ictu-badge--success' },
        { value: 'bo_hoc', label: 'Bỏ học', badge: 'ictu-badge--secondary' },
        { value: 'huy', label: 'Hủy', badge: 'ictu-badge--danger' },
    ];

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



        const loadDots$: Observable<IctuDropdownOption<number>[]> = this.dotService
            .load({ search: '' }, qp)
            .pipe(
                map(
                    (res: DtoObject<DotXettuyen[]>): IctuDropdownOption<number>[] =>
                        (res.data ?? []).map((d) => ({ value: d.id, label: d.name })),
                ),
            );


        forkJoin({
            majors: loadMajors$,

            dots: loadDots$,

        })
            .pipe(takeUntil(this.onDestroy$))
            .subscribe({
                next: ({ majors, dots, }) => {
                    this.nganhOptions.set(majors);
                    this.dots.set(dots);

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

        if (!majorId) { return; }

        this.apiOutsite.getCtdtListByIdNganh(majorId)
            .pipe(map((res: ExternalApiResponse<CtdtItem[]>): CtdtItem[] => res.data ?? [])).subscribe({
                next: (data) => {
                    const opts: IctuDropdownOption2<CtdtItem, number>[] = data
                        .filter((p) => p.nganh_id === majorId)
                        .map((p) => ({
                            value: p.id,
                            label: `${p.madt ?? ''} — ${p.ten}`,
                            raw: p,
                        }));
                    this.chuongTrinhOptions.set(opts);

                }, error: () => {
                    this.notification.toastError('Tải dữ liệu chương trình học không thành công');
                }
            });
    }

    onProgramChange(programId: number | null): void {
        this.selectedProgramId.set(programId);
    }

    selectProgram(programId: number): void {
        this.selectedProgramId.set(
            this.selectedProgramId() === programId ? null : programId,
        );
    }


    // ════════════════════════════════════════════════════════════
    //  CCCD check
    // ════════════════════════════════════════════════════════════

    onCccdChange(value: string): void {
        this.cccdInput = value.replace(/\D/g, '');
    }

    runCccdCheck(): void {
        const cccd: string = (this.cccdInput || '').trim();
        if (!cccd) {
            this.notification.toastWarning('Vui lòng nhập số CCCD');
            return;
        }
        if (cccd.length !== 12) {
            this.notification.toastWarning('Số CCCD phải gồm đúng 12 chữ số');
            return;
        }
        this.cccdLoading = true;
        this.hosoService.checkCccd(cccd).subscribe({
            next: (res: HosoCheckCccdResult) => {
                this.cccdLoading = false;
                this.cccdResult.set(res);

                if (!res.found || res.record.status === 'bo_hoc') {
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
    //  Reset
    // ════════════════════════════════════════════════════════════

    onReset(): void {
        this.rightState.set('cccd_check');
        this.cccdInput = '';
        this.cccdLoading = false;
        this.cccdResult.set(null);
        this.selectedMajorId.set(null);
        this.selectedProgramId.set(null);
        this.chuongTrinhOptions.set([]);
        this.listHuyen.set([]);
        this.listXa.set([]);
    }

    // ════════════════════════════════════════════════════════════
    //  Helpers
    // ════════════════════════════════════════════════════════════

    majorLabel(majorId: number | undefined | null): string {
        if (!majorId) { return '—'; }
        return this.nganhOptions().find((m) => m.value === majorId)?.label ?? `#${majorId}`;
    }

    programLabel(programId: number | undefined | null): string {
        if (!programId) { return '—'; }
        return this.chuongTrinhOptions().find((p) => p.value === programId)?.label ?? `#${programId}`;
    }

    dotLabel(dotId: number | undefined | null): string {
        if (!dotId) { return '—'; }
        return this.dots().find((d) => d.value === dotId)?.label ?? `#${dotId}`;
    }

    statusLabel(status: string | undefined | null): string {
        if (!status) { return '—'; }
        return this.statusOptions.find((s) => s.value === status)?.label ?? status;
    }

    statusBadgeClass(status: string | undefined | null): string {
        if (!status) { return 'ictu-badge--secondary'; }
        return this.statusOptions.find((s) => s.value === status)?.badge ?? 'ictu-badge--secondary';
    }
}
