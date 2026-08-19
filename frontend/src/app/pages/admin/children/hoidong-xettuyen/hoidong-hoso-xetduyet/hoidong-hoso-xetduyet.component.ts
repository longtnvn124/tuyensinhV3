import {
    Component,
    computed,
    DestroyRef,
    inject,
    input,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { Locations } from '@models/location';
import { DotXettuyen } from '@models/tuyensinh/dot-xettuyen';
import { HoidongHosoThisinh } from '@models/tuyensinh/hoidong-hoso-thisinh';
import { HoidongXettuyen } from '@models/tuyensinh/hoidong-xettuyen';
import { HosoStatus, HosoThisinh } from '@models/tuyensinh/hoso-thisinh';
import { Nganhhoc } from '@models/tuyensinh/nganhhoc';
import { LocationService } from '@services/location.service';
import { NotificationService, ProgressAnimationEvent } from '@services/notification.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import {
    CouncilAdmissionExportPayload,
    CouncilExportCandidate,
    ExpHosoDaduyetService,
    QualificationGroup,
} from '@services/tuyensinh/exp-hoso-daduyet.service';
import { HoidongHosoThisinhService } from '@services/tuyensinh/hoidong-hoso-thisinh.service';
import { HosoThisinhService } from '@services/tuyensinh/hoso-thisinh.service';
import { NganhhocService } from '@services/tuyensinh/nganhhoc.service';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { DOI_TUONG, GENDER, TH_XETTUYEN } from '@utilities/syscats';
import Decimal from 'decimal.js';
import { Popover } from 'primeng/popover';
import {
    catchError,
    finalize,
    forkJoin,
    from,
    last,
    map,
    mergeMap,
    Observable,
    of,
    scan,
    Subject,
    switchMap,
    tap,
} from 'rxjs';

type ReviewDataState = 'loading' | 'data' | 'error';

interface CouncilLookups {
    majors: Nganhhoc[];
    provinceOptions: IctuDropdownOption<number>[];
}

interface CouncilReviewData extends CouncilLookups {
    records: HoidongHosoThisinh[];
}

interface CouncilReviewLoadError {
    error: unknown;
}

interface StatusUpdateItemResult {
    success: boolean;
    errorMessage?: string;
}

interface StatusUpdateResult {
    success: number;
    failed: number;
    errorMessage?: string;
}

interface StatusUpdateConfig {
    status: 3 | -1;
    progressHeading: string;
    successVerb: string;
}

@Component({
    selector: 'app-hoidong-hoso-xetduyet',
    imports: [
        LoadingProgressComponent,
        MatButton,
        MatCheckbox,
        Popover,
    ],
    templateUrl: './hoidong-hoso-xetduyet.component.html',
    styleUrl: './hoidong-hoso-xetduyet.component.css',
    standalone: true,
})
export class HoidongHosoXetduyetComponent {
    readonly hoidong = input<HoidongXettuyen | null>(null);

    readonly state = signal<ReviewDataState>('data');
    readonly actionLoading = signal(false);
    readonly errorMessage = signal('');
    readonly majorOptions = signal<readonly IctuDropdownOption<number>[]>([]);
    readonly provinceOptions = signal<readonly IctuDropdownOption<number>[]>([]);
    readonly records = signal<readonly HoidongHosoThisinh[]>([]);

    private readonly majors = signal<readonly Nganhhoc[]>([]);
    readonly selectedIds = signal<ReadonlySet<number>>(new Set<number>());
    readonly selectedCount = computed((): number => this.selectedIds().size);
    readonly hasSelection = computed((): boolean => this.selectedCount() > 0);
    readonly areAllSelected = computed((): boolean =>
        this.records().length > 0 && this.selectedCount() === this.records().length,
    );
    readonly isSelectionIndeterminate = computed((): boolean =>
        this.selectedCount() > 0 && !this.areAllSelected(),
    );

    private readonly destroyRef = inject(DestroyRef);
    private readonly assignmentService = inject(HoidongHosoThisinhService);
    private readonly hosoService = inject(HosoThisinhService);
    private readonly dotXettuyenService = inject(DotXettuyenService);
    private readonly nganhHocService = inject(NganhhocService);
    private readonly locationService = inject(LocationService);
    private readonly notification = inject(NotificationService);
    private readonly expHosoDaduyetService = inject(ExpHosoDaduyetService);
    private readonly loadRequest$ = new Subject<HoidongXettuyen | null>();
    private readonly progress$ = new Subject<number>();

    constructor() {
        this.loadRequest$.pipe(
            tap((hoidong: HoidongXettuyen | null): void => this.prepareForLoad(hoidong)),
            switchMap((hoidong: HoidongXettuyen | null): Observable<CouncilReviewData | CouncilReviewLoadError | null> =>
                hoidong
                    ? this.loadCouncilData(hoidong).pipe(
                        catchError((error: unknown): Observable<CouncilReviewLoadError> => of({ error })),
                    )
                    : of(null),
            ),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe((data: CouncilReviewData | CouncilReviewLoadError | null): void => {
            if (this.isLoadError(data)) {
                this.errorMessage.set(this.getErrorMessage(data.error));
                this.state.set('error');
                return;
            }
            this.applyLoadedData(data);
        });

        toObservable(this.hoidong).pipe(
            takeUntilDestroyed(this.destroyRef),
        ).subscribe((hoidong: HoidongXettuyen | null): void => {
            this.loadRequest$.next(hoidong);
        });
    }

    reload(): void {
        this.loadRequest$.next(this.hoidong());
    }

    isSelected(id: number): boolean {
        return this.selectedIds().has(id);
    }

    toggleRow(id: number): void {
        if (this.actionLoading()) return;
        const nextSelection = new Set(this.selectedIds());
        if (nextSelection.has(id)) {
            nextSelection.delete(id);
        } else {
            nextSelection.add(id);
        }
        this.selectedIds.set(nextSelection);
    }

    toggleAll(): void {
        if (this.actionLoading()) return;
        if (this.areAllSelected()) {
            this.clearSelection();
            return;
        }
        this.selectedIds.set(new Set(this.records().map((row: HoidongHosoThisinh): number => row.id)));
    }

    clearSelection(): void {
        this.selectedIds.set(new Set<number>());
    }

    onApproveSelected(): void {
        this.updateSelectedStatuses({
            status: 3,
            progressHeading: 'Đang duyệt hồ sơ',
            successVerb: 'duyệt',
        });
    }

    onCancelApprovalSelected(): void {
        this.updateSelectedStatuses({
            status: -1,
            progressHeading: 'Đang hủy duyệt hồ sơ',
            successVerb: 'hủy duyệt',
        });
    }



    getCandidate(row: HoidongHosoThisinh): HosoThisinh | null {
        return row._hoso ?? null;
    }

    getMajorLabel(majorId: number | undefined): string {
        return this.lookupLabel(this.majorOptions(), majorId);
    }

    getProvinceLabel(province: string | number | undefined): string {
        if (province === undefined || province === null || province === '') {
            return '---';
        }
        if (typeof province === 'string') {
            return province;
        }
        return this.lookupLabel(this.provinceOptions(), province, `${province}`);
    }

    getStatusLabel(status: HosoStatus | undefined): string {
        return TH_XETTUYEN.find((item): boolean => item.value === status)?.label
            ?? `${status ?? 'Chưa xét'}`;
    }

    getStatusClass(status: HosoStatus | undefined): string {
        if (status === 3) return 'review-result--approved';
        if (status === -1) return 'review-result--rejected';
        return 'review-result--pending';
    }

    formatDate(value: string | undefined): string {
        if (!value) return '---';
        const datePart = value.slice(0, 10);
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
        return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
    }

    private prepareForLoad(hoidong: HoidongXettuyen | null): void {
        this.clearSelection();
        this.records.set([]);
        this.majors.set([]);
        this.majorOptions.set([]);
        this.provinceOptions.set([]);
        this.errorMessage.set('');
        this.state.set(hoidong ? 'loading' : 'data');
    }

    private loadCouncilData(hoidong: HoidongXettuyen): Observable<CouncilReviewData> {
        return this.loadLookups().pipe(
            switchMap((lookups: CouncilLookups): Observable<CouncilReviewData> =>
                this.loadRecords(hoidong.id).pipe(
                    map((records: HoidongHosoThisinh[]): CouncilReviewData => ({
                        ...lookups,
                        records,
                    })),
                ),
            ),
        );
    }

    private loadLookups(): Observable<CouncilLookups> {
        const queryParams: IctuQueryParams = { limit: -1 };
        return forkJoin({
            majors: this.nganhHocService.load({ search: '' }, queryParams).pipe(
                map((response: DtoObject<Nganhhoc[]>): Nganhhoc[] => response.data ?? []),
            ),
            provinceOptions: this.locationService.queryLocation([], queryParams, 'regions').pipe(
                map((response: DtoObject<Locations[]>): IctuDropdownOption<number>[] =>
                    (response.data ?? []).map((item: Locations): IctuDropdownOption<number> => ({
                        value: item.id,
                        label: item.name,
                    })),
                ),
            ),
        });
    }

    private loadRecords(hoidongId: number): Observable<HoidongHosoThisinh[]> {
        const queryParams: IctuQueryParams = {
            limit: -1,
            order: 'DESC',
            orderby: 'created_at',
        };
        const assignmentConditions: IctuConditionParam[] = [{
            conditionName: 'hoidong_id',
            condition: IctuQueryCondition.equal,
            value: `${hoidongId}`,
        }];

        return forkJoin({
            assignments: this.assignmentService.query(assignmentConditions, queryParams),
            candidates: this.hosoService.query([], { limit: -1 }),
        }).pipe(
            map(({ assignments, candidates }): HoidongHosoThisinh[] =>
                this.hydrateRecords(assignments.data ?? [], candidates.data ?? []),
            ),
        );
    }

    private hydrateRecords(
        assignments: readonly HoidongHosoThisinh[],
        candidates: readonly HosoThisinh[],
    ): HoidongHosoThisinh[] {
        const candidatesById = new Map<number, HosoThisinh>(
            candidates.map((candidate: HosoThisinh): [number, HosoThisinh] => [candidate.id, candidate]),
        );
        return assignments.map((row: HoidongHosoThisinh): HoidongHosoThisinh => ({
            ...row,
            _hoso: candidatesById.get(row.hoso_id) ?? null,
        }));
    }

    private applyLoadedData(data: CouncilReviewData | null): void {
        if (!data) return;
        this.majors.set(data.majors);
        this.majorOptions.set(data.majors.map((item: Nganhhoc): IctuDropdownOption<number> => ({
            value: item.id,
            label: item.name,
        })));
        this.provinceOptions.set(data.provinceOptions);
        this.records.set(data.records);
        this.state.set('data');
    }

    private lookupLabel(
        options: readonly IctuDropdownOption<number>[],
        value: number | undefined,
        fallback = '---',
    ): string {
        return options.find((item: IctuDropdownOption<number>): boolean => item.value === value)?.label ?? fallback;
    }

    private updateSelectedStatuses(config: StatusUpdateConfig): void {
        if (this.actionLoading()) return;

        const selectedIds = this.selectedIds();
        const selectedRecords = this.records().filter(
            (row: HoidongHosoThisinh): boolean => selectedIds.has(row.id),
        );
        if (!selectedRecords.length) return;

        const total = selectedRecords.length;
        this.actionLoading.set(true);
        this.notification.progressBarWithPercent(this.progress$.asObservable(), config.progressHeading);
        this.progress$.next(0);

        from(selectedRecords).pipe(
            mergeMap(
                (record: HoidongHosoThisinh): Observable<StatusUpdateItemResult> =>
                    this.hosoService.update(record.hoso_id, { status: config.status }).pipe(
                        map((): StatusUpdateItemResult => ({ success: true })),
                        catchError((error: unknown): Observable<StatusUpdateItemResult> => of({
                            success: false,
                            errorMessage: this.getErrorMessage(
                                error,
                                'Đã xảy ra lỗi khi cập nhật hồ sơ. Vui lòng thử lại.',
                            ),
                        })),
                    ),
                5,
            ),
            scan(
                (result: StatusUpdateResult, item: StatusUpdateItemResult): StatusUpdateResult => ({
                    success: result.success + Number(item.success),
                    failed: result.failed + Number(!item.success),
                    errorMessage: result.errorMessage ?? item.errorMessage,
                }),
                { success: 0, failed: 0 },
            ),
            tap(({ success, failed }: StatusUpdateResult): void => {
                this.progress$.next(Math.round(((success + failed) / total) * 100));
            }),
            last(),
            finalize((): void => this.actionLoading.set(false)),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe((result: StatusUpdateResult): void => {
            if (result.success > 0) {
                this.notification.toastSuccess(`Đã ${config.successVerb} ${result.success} hồ sơ`);
                this.clearSelection();
                this.reload();
            }
            if (result.failed > 0) {
                const detail = result.errorMessage ? `: ${result.errorMessage}` : '';
                this.notification.toastError(`${result.failed} hồ sơ cập nhật thất bại${detail}`);
            }
        });
    }

    private isLoadError(data: CouncilReviewData | CouncilReviewLoadError | null): data is CouncilReviewLoadError {
        return data !== null && 'error' in data;
    }

    private getErrorMessage(
        error: unknown,
        fallback = 'Đã xảy ra lỗi khi tải hồ sơ. Vui lòng thử lại.',
    ): string {
        if (this.hasNestedMessage(error)) {
            return error.error.message;
        }
        if (error instanceof Error && error.message) {
            return error.message;
        }
        if (this.hasMessage(error)) {
            return error.message;
        }
        return fallback;
    }

    private hasNestedMessage(error: unknown): error is { error: { message: string } } {
        return typeof error === 'object'
            && error !== null
            && 'error' in error
            && this.hasMessage(error.error);
    }

    private hasMessage(error: unknown): error is { message: string } {
        return typeof error === 'object'
            && error !== null
            && 'message' in error
            && typeof error.message === 'string'
            && error.message.length > 0;
    }

    onExportData(): void {
        if (this.actionLoading()) return;

        const council = this.hoidong();
        if (!council?.id) {
            this.notification.toastError('Không tìm thấy hội đồng xét tuyển');
            return;
        }
        if (!council.dot_xettuyen_id) {
            this.notification.toastError('Hội đồng chưa có đợt xét tuyển');
            return;
        }
        if (!this.records().length) {
            this.notification.toastError('Hội đồng chưa có hồ sơ để xuất');
            return;
        }

        const controlLoading = new Subject<ProgressAnimationEvent>();
        this.actionLoading.set(true);
        this.notification.startProgressAnimation(controlLoading, 'Đang xuất dữ liệu');
        controlLoading.next({ percent: 10, heading: 'Đang tải thông tin đợt xét tuyển' });

        this.dotXettuyenService.get(council.dot_xettuyen_id).pipe(
            map((round: DotXettuyen): CouncilAdmissionExportPayload =>
                this.createExportPayload(council, round, this.records()),
            ),
            tap((): void => {
                controlLoading.next({ percent: 50, heading: 'Đang tạo file Excel' });
            }),
            switchMap((payload: CouncilAdmissionExportPayload): Observable<void> =>
                from(this.expHosoDaduyetService.exportExcel(payload)),
            ),
            tap((): void => {
                controlLoading.next({ percent: 100, heading: 'Đã xuất dữ liệu' });
            }),
            finalize((): void => {
                this.actionLoading.set(false);
                controlLoading.complete();
            }),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe({
            next: (): void => {
                this.notification.toastSuccess('Xuất dữ liệu xét tuyển thành công');
            },
            error: (error: unknown): void => {
                this.notification.toastError(this.getErrorMessage(
                    error,
                    'Không thể xuất dữ liệu xét tuyển. Vui lòng thử lại.',
                ));
            },
        });
    }

    private createExportPayload(
        council: HoidongXettuyen,
        round: DotXettuyen,
        records: readonly HoidongHosoThisinh[],
    ): CouncilAdmissionExportPayload {
        return {
            council: {
                id: council.id,
                name: council.name,
                reviewDate: council.thoigian_xettuyen,
            },
            round: {
                id: round.id,
                name: round.name,
                startDate: round.thoi_gian_bat_dau,
                endDate: round.thoi_gian_ket_thuc,
            },
            documents: {
                meetingDate: council.thoigian_xettuyen,
                preparedDate: new Date().toISOString().slice(0, 10),
            },
            candidates: records.map((record: HoidongHosoThisinh): CouncilExportCandidate =>
                this.mapExportCandidate(record),
            ),
        };
    }

    private mapExportCandidate(record: HoidongHosoThisinh): CouncilExportCandidate {
        const candidate = record._hoso;
        if (!candidate) {
            throw new Error(`Không tìm thấy dữ liệu hồ sơ #${record.hoso_id}`);
        }

        const qualificationGroup = this.getQualificationGroup(candidate.doituong, candidate.id);
        const qualification = DOI_TUONG.find((item): boolean => item.value === qualificationGroup);
        const majorId = candidate.nganh_id ?? 0;
        const major = this.majors().find((item: Nganhhoc): boolean => item.id === majorId);
        const genderValue = candidate.gioi_tinh?.trim().toLowerCase();
        const gender = GENDER.find((item): boolean =>
            item.value === genderValue || item.key.toLowerCase() === genderValue,
        );
        const isHighSchool = qualificationGroup === 'THPT';

        return {
            id: candidate.id,
            fullName: candidate.ho_va_ten.trim(),
            gender: gender?.label ?? candidate.gioi_tinh ?? '',
            birthDate: candidate.ngay_sinh,
            birthPlace: this.lookupLabel(this.provinceOptions(), candidate.noi_sinh, ''),
            ethnicity: candidate.dan_toc ?? '',
            qualificationGroup,
            qualificationName: isHighSchool
                ? candidate.van_bang_tn?.trim() || qualification?.label.trim() || ''
                : candidate.vb_chuyenmon?.trim() || qualification?.label.trim() || '',
            graduationMajor: candidate.vb_chuyenmon_nganh?.trim() ?? '',
            graduationInstitution: isHighSchool
                ? candidate.tn_noicap ?? ''
                : candidate.vb_chuyenmon_noicap ?? '',
            graduationYear: isHighSchool
                ? candidate.nam_tn ?? ''
                : candidate.vb_chuyenmon_namtn ?? '',
            registeredMajorId: majorId,
            registeredMajorName: major?.name ?? '',
            registeredMajorCode: major?.code ?? '',
            admissionScore: this.calculateAdmissionScore(candidate, qualificationGroup),
            result: TH_XETTUYEN.find((item): boolean => item.value === candidate.status)?.label
                ?? TH_XETTUYEN.find((item): boolean =>
                    item.kyhieu === record.ket_qua?.trim().toUpperCase(),
                )?.label
                ?? record.ket_qua?.trim()
                ?? '',
            note: record.ghi_chu?.trim() || candidate.content?.trim(),
        };
    }

    private calculateAdmissionScore(
        candidate: HosoThisinh,
        qualificationGroup: QualificationGroup,
    ): number | undefined {
        if (candidate.diem_xettuyen === undefined || candidate.diem_xettuyen === null) {
            return undefined;
        }

        const originalScore = new Decimal(candidate.diem_xettuyen);
        const priorityScore = new Decimal(candidate.diem_uutien ?? 0);
        const additionalScore = new Decimal(candidate.diem_cong ?? 0);
        const maximumScore = qualificationGroup === 'THPT' ? new Decimal(30) : new Decimal(10);
        const scale = qualificationGroup === 'THPT' ? new Decimal(7.5) : new Decimal(2.5);
        const actualPriorityScore = maximumScore
            .minus(originalScore)
            .dividedBy(scale)
            .times(priorityScore.plus(additionalScore));

        return originalScore
            .plus(actualPriorityScore)
            .toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
            .toNumber();
    }

    private getQualificationGroup(value: string | undefined, candidateId: number): QualificationGroup {
        const normalizedValue = value?.trim().toUpperCase();
        if (normalizedValue === 'DH'
            || normalizedValue === 'CD'
            || normalizedValue === 'TC'
            || normalizedValue === 'THPT') {
            return normalizedValue;
        }
        throw new Error(`Hồ sơ #${candidateId} có đối tượng xét tuyển không hợp lệ`);
    }
}
