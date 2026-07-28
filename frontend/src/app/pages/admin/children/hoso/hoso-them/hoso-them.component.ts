import { NgClass } from '@angular/common';
import {
    Component,
    computed,
    inject,
    OnInit,
    signal,
    WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IctuDropdownOption, IctuDropdownOption2 } from '@models/ictu-dropdown-option';
import { ApiOutsiteService } from '@services/tuyensinh/api-outsite.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { NotificationService } from '@services/notification.service';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MatButton } from '@angular/material/button';
import { DotXettuyen } from '@app/models/tuyensinh/dot-xettuyen';
import { CtdtItem, ExternalApiResponse, NganhItem } from '@app/models/external-api';
import { DtoObject, IctuQueryParams } from '@models/dto';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormThongtinDangkyComponent } from '../form-thongtin-dangky/form-thongtin-dangky.component';

@Component({
    selector: 'app-hoso-them',
    standalone: true,
    imports: [
        FormsModule,
        MatButton,
        Select,
        FormThongtinDangkyComponent,
    ],
    templateUrl: './hoso-them.component.html',
    styleUrl: './hoso-them.component.css',
})
export class HosoThemComponent implements OnInit {

    // ── Services ────────────────────────────────────────────────

    private dotService: DotXettuyenService = inject(DotXettuyenService);
    private apiOutsite: ApiOutsiteService = inject(ApiOutsiteService);
    private notification: NotificationService = inject(NotificationService);

    // ── Left panel ──────────────────────────────────────────────

    selectedMajorId: WritableSignal<number | null> = signal<number | null>(null);
    selectedProgramId: WritableSignal<number | null> = signal<number | null>(null);

    nganhOptions: WritableSignal<IctuDropdownOption<number>[]> =
        signal<IctuDropdownOption<number>[]>([]);
    chuongTrinhOptions: WritableSignal<IctuDropdownOption2<CtdtItem, number>[]> =
        signal<IctuDropdownOption2<CtdtItem, number>[]>([]);

    selectedMajorLabel = computed<string>(() => {
        const id = this.selectedMajorId();
        if (!id) { return ''; }
        return this.nganhOptions().find((o) => o.value === id)?.label ?? '';
    });

    selectedProgramLabel = computed<string>(() => {
        const id = this.selectedProgramId();
        if (!id) { return ''; }
        return this.chuongTrinhOptions().find((o) => o.value === id)?.label ?? '';
    });

    selectedProgramDuration = computed<string>(() => {
        const id = this.selectedProgramId();
        if (!id) { return ''; }
        return this.chuongTrinhOptions().find((o) => o.value === id)?.raw?.thoigian_daotao ?? '';
    });

    selectedProgramDegree = computed<string>(() => {
        const id = this.selectedProgramId();
        if (!id) { return ''; }
        return this.chuongTrinhOptions().find((o) => o.value === id)?.raw?.danhhieu_totnghiep ?? '';
    });

    readonly showForm = computed(() => !!this.selectedMajorId() && !!this.selectedProgramId());

    // ── Lookups ─────────────────────────────────────────────────

    dots: WritableSignal<IctuDropdownOption<number>[]> =
        signal<IctuDropdownOption<number>[]>([]);

    // ════════════════════════════════════════════════════════════
    //  Lifecycle
    // ════════════════════════════════════════════════════════════

    ngOnInit(): void {
        this.loadLookups();
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
            .subscribe({
                next: ({ majors, dots }) => {
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

    selectProgram(programId: number): void {
        this.selectedProgramId.set(
            this.selectedProgramId() === programId ? null : programId,
        );
    }

    // ════════════════════════════════════════════════════════════
    //  Reset
    // ════════════════════════════════════════════════════════════

    onReset(): void {
        this.selectedMajorId.set(null);
        this.selectedProgramId.set(null);
        this.chuongTrinhOptions.set([]);
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
}
