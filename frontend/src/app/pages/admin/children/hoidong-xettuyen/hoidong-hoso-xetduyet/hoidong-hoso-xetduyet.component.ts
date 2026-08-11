import {
    Component,
    computed,
    DestroyRef,
    inject,
    input,
    output,
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
import { CtdtItem, ExternalApiResponse, NganhItem } from '@models/external-api';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { Locations } from '@models/location';
import { HoidongHosoThisinh } from '@models/tuyensinh/hoidong-hoso-thisinh';
import { HoidongXettuyen } from '@models/tuyensinh/hoidong-xettuyen';
import { HosoThisinh } from '@models/tuyensinh/hoso-thisinh';
import { LocationService } from '@services/location.service';
import { NotificationService, ProgressAnimationEvent } from '@services/notification.service';
import { ApiOutsiteService } from '@services/tuyensinh/api-outsite.service';
import { HoidongHosoThisinhService } from '@services/tuyensinh/hoidong-hoso-thisinh.service';
import { HosoThisinhService } from '@services/tuyensinh/hoso-thisinh.service';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { TH_XETTUYEN } from '@utilities/syscats';
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
import { ExpHosoDaduyetService } from '@services/tuyensinh/exp-hoso-daduyet.service';

type ReviewDataState = 'loading' | 'data' | 'error';

interface CouncilLookups {
    majorOptions: IctuDropdownOption<number>[];
    programOptions: IctuDropdownOption<number>[];
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
    status: 'TRUNG_TUYEN' | 'KHONG_TRUNG_TUYEN';
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
    readonly programOptions = signal<readonly IctuDropdownOption<number>[]>([]);
    readonly provinceOptions = signal<readonly IctuDropdownOption<number>[]>([]);
    readonly records = signal<readonly HoidongHosoThisinh[]>([]);
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
    private readonly apiOutsiteService = inject(ApiOutsiteService);
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
            status: 'TRUNG_TUYEN',
            progressHeading: 'Đang duyệt hồ sơ',
            successVerb: 'duyệt',
        });
    }

    onCancelApprovalSelected(): void {
        this.updateSelectedStatuses({
            status: 'KHONG_TRUNG_TUYEN',
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

    getProgramLabel(programId: number | undefined): string {
        return this.lookupLabel(this.programOptions(), programId);
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

    getStatusLabel(status: string | undefined): string {
        return TH_XETTUYEN.find((item): boolean => item.kyhieu === status)?.label ?? status ?? 'Chưa xét';
    }

    getStatusClass(status: string | undefined): string {
        if (status === 'TRUNG_TUYEN') return 'review-result--approved';
        if (status === 'KHONG_TRUNG_TUYEN') return 'review-result--rejected';
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
        this.majorOptions.set([]);
        this.programOptions.set([]);
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
            majorOptions: this.apiOutsiteService.getNganhList().pipe(
                map((response: ExternalApiResponse<NganhItem[]>): IctuDropdownOption<number>[] =>
                    (response.data ?? [])
                        .filter((item: NganhItem): boolean => item.type === 'nganh')
                        .map((item: NganhItem): IctuDropdownOption<number> => ({
                            value: item.id,
                            label: item.title,
                        })),
                ),
            ),
            programOptions: this.apiOutsiteService.getCtdtList().pipe(
                map((response: ExternalApiResponse<CtdtItem[]>): IctuDropdownOption<number>[] =>
                    (response.data ?? []).map((item: CtdtItem): IctuDropdownOption<number> => ({
                        value: item.id,
                        label: item.ten,
                    })),
                ),
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
        this.majorOptions.set(data.majorOptions);
        this.programOptions.set(data.programOptions);
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

    //----------------------------------------------------------------------------------------------

    //----------- export dataa-------------------

    onExportData(): void {
        if (this.actionLoading()) return;
        const hoidongId = this.hoidong()?.id;
        if (!hoidongId) {
            this.notification.toastError('Không tìm thấy hội đồng xét tuyển');
            return;
        }

        const controlLoading: Subject<ProgressAnimationEvent> = new Subject();
        this.notification.startProgressAnimation(controlLoading, `Đang tải dữ liệu`);

        this.loopGetHdxtDsTs(1, 50, [], 1).pipe(switchMap(m => {

            const xaPhuongIds = Array.from(new Set(m.map(a => a['thi-sinh'] && a['thi-sinh']['dia_chi_xa'] ? a['thi-sinh']['dia_chi_xa'] : 0)))
            controlLoading.next({ percent: 50, heading: 'Đang tải dữ liệu địa chỉ' });

            return forkJoin([
                of(m),
                this.loopGetXa(xaPhuongIds, 50, 1, [])
            ])
        })).subscribe({
            next: ([dtTuyensinh, dataXa]) => {
                console.log(dtTuyensinh, dataXa);
                controlLoading.next({ percent: 100, heading: 'Đã tải xong dữ liệu' });
            },
            error: (e) => {
                this.notification.toastError('Tải dữ liệu không thành công');
                controlLoading.complete();
            }
        })
    }


    // exportExcel() {



    // }

    // exportExcel(){
    //     this.notification.isProcessing(true);
    //     this.loopGetHdxtDsTs(1,50,[],1).pipe(switchMap(m=>{

    //         const xaPhuongIds = Array.from(new Set(m.map(a=>a['thi-sinh'] && a['thi-sinh']['dia_chi_xa'] ? a['thi-sinh']['dia_chi_xa'] : 0)))
    //         return forkJoin([
    //             of(m),
    //             this.loopGetXa(xaPhuongIds, 50,1,[])
    //         ])
    //     })).subscribe({
    //         next:([dtTuyensinh, dataXa])=>{
    //             const data = dtTuyensinh.length > 0 ? dtTuyensinh.map((m,index)=>{
    //                 const thisinh = m['thi-sinh'];

    //                 thisinh['id'] = m.tuyensinh_id;
    //                 thisinh['id_connect'] = m.id;
    //                 thisinh['index_'] = index;

    //                 const thXettuyen = TH_XETTUYEN.find(f=>f.value == thisinh['status'].toString())
    //                 thisinh['name_xettuyen'] = thXettuyen ? thXettuyen.label : '';

    //                 // const  cityfind = this.list_citys.find(f =>f.id  == thisinh.noi_sinh.toString());
    //                 const  cityfind =  this.lookupLabel(this.provinceOptions(), thisinh.noi_sinh );

    //                 thisinh['noi_sinh_name'] = cityfind;

    //                 if (thisinh.nganh_dangky) {
    //                     const find_nganh = this.list_nganh_tuyensinh.find((dt) => dt.ten_nganh === thisinh.nganh_dangky);

    //                         thisinh['ma_nganh_dang_ky'] = find_nganh ?  find_nganh['ma_nganh'] : '';
    //                     }

    //                 const name_tinh = this.list_citys.find(m => m.id.toString() === thisinh.dia_chi_tinh.toString());
    //                 const name_xa = dataXa.find(m => m.id.toString() === thisinh.dia_chi_xa.toString());

    //                 thisinh['dia_chi_ho_khau'] = ( name_tinh ? name_tinh.name + ', ' : '')  + (name_xa ? name_xa.name : '') ;


    //                 const nguoi_tuvan = this.list_user_doitac.find(m => m.id.toString() === thisinh.nguoi_tuvan.toString());
    //                 thisinh['nguoi_tu_van_by_name'] =nguoi_tuvan ?  this.list_user_doitac[index].display_name.toString(): '';

    //                 if (thisinh.created_by) {
    //                     const index = this.list_user_doitac.findIndex(m => m.id.toString() === thisinh.created_by.toString());
    //                     if (index !== -1) {
    //                         thisinh['create_by_name'] = this.list_user_doitac[index].display_name.toString();
    //                     }
    //                 }

    //                 return thisinh;
    //                 }) : [];

    //             if( data.length > 0 ){
    //                 this.expHosoDaduyetService.exportExcel(data, this.selectedHoiDong);
    //             }


    //             this.notification.isProcessing(false);

    //         },error:(e)=>{
    //             this.notification.isProcessing(false);
    //             this.notification.toastError('Tải dữ liệu không thành công');
    //         }
    //     })

    // }

    loopGetHdxtDsTs(
        page: number,
        limit: number,
        data: HoidongHosoThisinh[],
        recordTotal: number
    ): Observable<HoidongHosoThisinh[]> {
        if (data.length >= recordTotal) {
            return of(data);
        }

        const conditions: IctuConditionParam[] = [{
            conditionName: 'hoidong_id',
            condition: IctuQueryCondition.equal,
            value: this.hoidong().id.toString(),
        }];
        const queryParams: IctuQueryParams = {
            limit,
            paged: page,
            with: 'thi-sinh',
        };

        return this.assignmentService.query(conditions, queryParams).pipe(
            switchMap(response => {
                const records = response.data ?? [];
                const accumulatedData = [...data, ...records];

                return records.length === 0
                    ? of(accumulatedData)
                    : this.loopGetHdxtDsTs(
                        page + 1,
                        limit,
                        accumulatedData,
                        response.recordsFiltered
                    );
            })
        );
    }

    private loopGetXa(
        ids: number[],
        limit: number,
        page: number,
        data: Locations[]
    ): Observable<Locations[]> {
        const start = (page - 1) * limit;
        const selectedIds = ids.slice(start, start + limit);

        if (selectedIds.length === 0) {
            return of(data);
        }

        const conditions: IctuConditionParam[] = [{
            conditionName: 'id',
            condition: IctuQueryCondition.equal,
            value: selectedIds.toString(),
            orWhere: 'in',
        }];

        return this.locationService.queryLocation(
            conditions,
            { limit: selectedIds.length, paged: 1 },
            'provinces'
        ).pipe(
            switchMap(response => {
                const accumulatedData = data.concat(response.data ?? []);
                const hasNextPage = start + limit < ids.length;

                return hasNextPage
                    ? this.loopGetXa(ids, limit, page + 1, accumulatedData)
                    : of(accumulatedData);
            })
        );
    }



}
