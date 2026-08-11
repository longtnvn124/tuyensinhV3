import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject, signal, WritableSignal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { ButtonBase, BUTTON_CANCEL, BUTTON_CONFIRMED } from '@app/models/button';
import { IctuDataTable, IctuDataTablePaginatorInfo } from '@models/datatable';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { ExternalApiResponse, NganhItem } from '@models/external-api';
import { IctuPermissionControl } from '@models/ictu-base-model';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { Locations } from '@models/location';
import { HoidongHosoThisinh } from '@models/tuyensinh/hoidong-hoso-thisinh';
import { HoidongXettuyen } from '@models/tuyensinh/hoidong-xettuyen';
import { HosoThisinh } from '@models/tuyensinh/hoso-thisinh';
import { LocationService } from '@services/location.service';
import { NotificationService } from '@services/notification.service';
import { ApiOutsiteService } from '@services/tuyensinh/api-outsite.service';
import { HoidongHosoThisinhService } from '@services/tuyensinh/hoidong-hoso-thisinh.service';
import { HosoThisinhService } from '@services/tuyensinh/hoso-thisinh.service';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { DOI_TUONG } from '@utilities/syscats';
import { Dialog } from 'primeng/dialog';
import { catchError, filter, finalize, forkJoin, from, last, map, mergeMap, of, scan, Subject, switchMap, takeUntil, tap } from 'rxjs';

@Component({
    selector: 'app-hoso-list',
    imports: [
        Dialog, IctuPaginatorComponent, LoadingProgressComponent, MatButton, MatCheckbox,
    ],
    templateUrl: './hoso-list.component.html',
    styleUrl: './hoso-list.component.css',
    standalone: true,
})
export class HosoListComponent implements OnInit, OnChanges, OnDestroy {
    @Input() set hoidong(value: HoidongXettuyen | null) { this._hoidong = value; }
    get hoidong(): HoidongXettuyen | null { return this._hoidong; }
    @Input() permission!: IctuPermissionControl;
    private _hoidong: HoidongXettuyen | null = null;

    state: WritableSignal<'loading' | 'success' | 'error'> = signal<'loading' | 'success' | 'error'>('success');
    dataTable: IctuDataTable<HoidongHosoThisinh> = new IctuDataTable<HoidongHosoThisinh>({ rows: 50 });
    private temp: IctuDataTablePaginatorInfo = { paged: 1, resetPaginator: true };

    readonly majorOptions = signal<IctuDropdownOption<number>[]>([]);
    readonly provinceOptions = signal<IctuDropdownOption<number>[]>([]);

    assignDialogVisible = false;
    assignLoading = false;
    assignCandidates: HosoThisinh[] = [];
    selectedAssignIds: Set<number> = new Set<number>();
    selectedAssignedIds: ReadonlySet<number> = new Set<number>();
    removeLoading = false;

    private readonly assignmentService = inject(HoidongHosoThisinhService);
    private readonly hosoService = inject(HosoThisinhService);
    private readonly apiOutsiteService = inject(ApiOutsiteService);
    private readonly locationService = inject(LocationService);
    private readonly notification = inject(NotificationService);
    private readonly dataLoad$ = new Subject<void>();
    private readonly onDestroy$ = new Subject<void>();


    private readonly progress = new Subject<number>();

    ngOnInit(): void {
        this.loadLookups();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['hoidong']) {
            this.loadData(1, true);
        }
    }

    loadData(paged: number = 1, resetPaginator: boolean = true): void {
        this.dataLoad$.next();
        this.selectedAssignedIds = new Set<number>();
        const hoidongId = this._hoidong?.id;
        if (!hoidongId) {
            this.dataTable.fillData([]);
            this.state.set('success');
            return;
        }
        this.state.set('loading');
        this.temp = { paged, resetPaginator };

        this.assignmentService.loadByHoidong(hoidongId, {
            limit: this.dataTable.paginator.rows(),
            paged,
        }).pipe(
            switchMap((assigned: DtoObject<HoidongHosoThisinh[]>) => {
                const hosoIds: number[] = assigned.data.map((row: HoidongHosoThisinh): number => row.hoso_id);
                if (!hosoIds.length) {
                    return of(assigned);
                }

                const hosoConditions: IctuConditionParam[] = [{
                    conditionName: 'id',
                    condition: IctuQueryCondition.equal,
                    value: hosoIds.toString(),
                    orWhere: 'in',
                }];
                return this.hosoService.query(hosoConditions, { limit: -1 }).pipe(
                    map((hosoResponse: DtoObject<HosoThisinh[]>): DtoObject<HoidongHosoThisinh[]> => {
                        const hosoById = new Map<number, HosoThisinh>(
                            hosoResponse.data.map((hoso: HosoThisinh): [number, HosoThisinh] => [hoso.id, hoso]),
                        );
                        return {
                            ...assigned,
                            data: assigned.data.map((row: HoidongHosoThisinh): HoidongHosoThisinh => ({
                                ...row,
                                _hoso: hosoById.get(row.hoso_id) ?? null,
                            })),
                        };
                    }),
                );
            }),
            takeUntil(this.dataLoad$),
            takeUntil(this.onDestroy$),
        ).subscribe({
            next: (res: DtoObject<HoidongHosoThisinh[]>): void => {
                if (resetPaginator) {
                    this.dataTable.paginator.setupPaginator(res);
                } else {
                    this.dataTable.paginator.changePage(paged);
                }
                this.dataTable.fillData(res.data ?? []);
                this.state.set('success');
            },
            error: (): void => {
                this.state.set('error');
            },
        });
    }

    onSearch(): void {
        this.loadData(1, true);
    }

    onChangePage(paged: number): void {
        this.loadData(paged, false);
    }

    reload(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.loadData(this.temp.paged, this.temp.resetPaginator);
    }

    getCandidate(row: HoidongHosoThisinh): HosoThisinh | undefined {
        return row._hoso ?? undefined;
    }

    // ═══ Assign dialog ═══

    openAssignDialog(): void {
        if (!this._hoidong?.id) return;
        this.selectedAssignIds = new Set<number>();
        this.loadCandidates();
        this.assignDialogVisible = true;
    }

    loadCandidates(): void {
        this.assignLoading = true;
        this.hosoService.load({ search: '', dot_xet_tuyen_id: this._hoidong?.dot_xettuyen_id }, { limit: 500, paged: 1 }).subscribe({
            next: (res: DtoObject<HosoThisinh[]>): void => {
                const assigned = new Set<number>(this.dataTable.data().map((r: HoidongHosoThisinh): number => r.hoso_id));
                this.assignCandidates = res.data.filter((c: HosoThisinh): boolean => !assigned.has(c.id));
                this.assignLoading = false;
            },
            error: (): void => {
                this.assignLoading = false;
                this.notification.toastError('Tải danh sách thí sinh thất bại');
            },
        });
    }

    isCandidateSelected(id: number): boolean {
        return this.selectedAssignIds.has(id);
    }

    toggleCandidate(id: number): void {
        if (this.selectedAssignIds.has(id)) {
            this.selectedAssignIds.delete(id);
        } else {
            this.selectedAssignIds.add(id);
        }
    }

    toggleSelectAllCandidates(): void {
        if (this.selectedAssignIds.size === this.assignCandidates.length) {
            this.selectedAssignIds = new Set<number>();
        } else {
            this.selectedAssignIds = new Set<number>(this.assignCandidates.map((c: HosoThisinh): number => c.id));
        }
    }

    allCandidatesChecked(): boolean {
        return this.assignCandidates.length > 0 && this.selectedAssignIds.size === this.assignCandidates.length;
    }

    confirmAssign(): void {
        const ids: number[] = Array.from(this.selectedAssignIds);
        const hoidongId: number | undefined = this._hoidong?.id;
        if (this.assignLoading || !ids.length || !hoidongId) return;

        const total: number = ids.length;
        this.assignLoading = true;
        this.notification.progressBarWithPercent(
            this.progress.asObservable(),
            'Đang gán hồ sơ vào hội đồng',
        );
        this.progress.next(0);

        from(ids).pipe(
            mergeMap(
                (hosoId: number) => this.assignmentService.create({ hoidong_id: hoidongId, hoso_id: hosoId }).pipe(
                    switchMap(() => this.hosoService.update(hosoId, { status_connent: 1 })),
                    map((): boolean => true),
                    catchError(() => of(false)),
                ),
                5,
            ),
            scan(
                (result: { success: number; failed: number }, isSuccess: boolean) => ({
                    success: result.success + Number(isSuccess),
                    failed: result.failed + Number(!isSuccess),
                }),
                { success: 0, failed: 0 },
            ),
            tap(({ success, failed }): void => {
                this.progress.next(Math.round(((success + failed) / total) * 100));
            }),
            last(),
            finalize((): void => {
                this.assignLoading = false;
            }),
            takeUntil(this.onDestroy$),
        ).subscribe(({ success, failed }): void => this.afterAssign(success, failed));
    }

    private afterAssign(success: number, failed: number): void {
        if (success > 0) {
            this.notification.toastSuccess(`Đã gán ${success} hồ sơ vào hội đồng`);
        }
        if (failed > 0) {
            this.notification.toastError(`${failed} hồ sơ gán thất bại`);
        }
        this.assignDialogVisible = false;
        this.loadData(1, true);
    }

    cancelAssign(): void {
        this.assignDialogVisible = false;
        this.selectedAssignIds = new Set<number>();
    }

    // ═══ Remove assigned ═══

    isAssignedSelected(id: number): boolean {
        return this.selectedAssignedIds.has(id);
    }

    toggleAssigned(id: number): void {
        const nextSelection = new Set<number>(this.selectedAssignedIds);
        if (nextSelection.has(id)) {
            nextSelection.delete(id);
        } else {
            nextSelection.add(id);
        }
        this.selectedAssignedIds = nextSelection;
    }

    toggleSelectAllAssigned(): void {
        if (this.allAssignedChecked()) {
            this.selectedAssignedIds = new Set<number>();
            return;
        }
        this.selectedAssignedIds = new Set<number>(
            this.dataTable.data().map((row: HoidongHosoThisinh): number => row.id),
        );
    }

    allAssignedChecked(): boolean {
        const rows = this.dataTable.data();
        return rows.length > 0 && rows.every((row: HoidongHosoThisinh): boolean => this.selectedAssignedIds.has(row.id));
    }

    isAssignedSelectionIndeterminate(): boolean {
        return this.selectedAssignedIds.size > 0 && !this.allAssignedChecked();
    }

    removeAssigned(row?: HoidongHosoThisinh): void {
        const assignments: HoidongHosoThisinh[] = row
            ? [row]
            : this.dataTable.data()
                .filter((item: HoidongHosoThisinh): boolean => this.selectedAssignedIds.has(item.id));
        if (this.removeLoading || !assignments.length) return;

        const total: number = assignments.length;
        this.removeLoading = true;
        this.notification.confirm({
            buttons: [BUTTON_CONFIRMED, BUTTON_CANCEL],
            heading: 'Xác nhận',
            message: `Bạn có chắc chắn muốn xóa ${total} hồ sơ khỏi hội đồng?`,
        }).pipe(
            filter((button: ButtonBase): boolean => button.name === BUTTON_CONFIRMED.name),
            tap((): void => {
                this.notification.progressBarWithPercent(
                    this.progress.asObservable(),
                    'Đang xóa hồ sơ khỏi hội đồng',
                );
                this.progress.next(0);
            }),
            switchMap(() => from(assignments).pipe(
                mergeMap(
                    (assignment: HoidongHosoThisinh) => this.assignmentService.delete(assignment.id).pipe(
                        switchMap(() => this.hosoService.update(assignment.hoso_id, { status_connent: 0 })),
                        map((): boolean => true),
                        catchError(() => of(false)),
                    ),
                    5,
                ),
                scan(
                    (result: { success: number; failed: number }, isSuccess: boolean) => ({
                        success: result.success + Number(isSuccess),
                        failed: result.failed + Number(!isSuccess),
                    }),
                    { success: 0, failed: 0 },
                ),
                tap(({ success, failed }): void => {
                    this.progress.next(Math.round(((success + failed) / total) * 100));
                }),
                last(),
            )),
            finalize((): void => {
                this.removeLoading = false;
            }),
            takeUntil(this.onDestroy$),
        ).subscribe(({ success, failed }): void => this.afterRemoveAssigned(success, failed));
    }

    private afterRemoveAssigned(success: number, failed: number): void {
        this.selectedAssignedIds = new Set<number>();
        if (success > 0) {
            this.notification.toastSuccess(`Đã xóa ${success} hồ sơ khỏi hội đồng`);
            this.loadData(this.dataTable.paginator.paged() || 1, false);
        }
        if (failed > 0) {
            this.notification.toastError(`${failed} hồ sơ xóa thất bại`);
        }
    }

    getMajorLabel(majorId: number | undefined): string {
        return this.majorOptions().find((item: IctuDropdownOption<number>): boolean => item.value === majorId)?.label ?? '---';
    }

    formatBirthday(birthday: string | undefined): string {
        if (!birthday) return '---';
        const datePart = birthday.slice(0, 10);
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
        return match ? `${match[3]}/${match[2]}/${match[1]}` : birthday;
    }

    getDoiTuongLabel(code: string | undefined): string {
        return DOI_TUONG.find((item): boolean => item.value === code)?.label ?? code ?? '---';
    }

    getNoiSinhLabel(noiSinh: string | number | undefined): string {
        if (noiSinh === undefined || noiSinh === null || noiSinh === '') return '---';
        if (typeof noiSinh === 'string') return noiSinh;
        return this.provinceOptions().find((item: IctuDropdownOption<number>): boolean => item.value === noiSinh)?.label ?? `${noiSinh}`;
    }

    private loadLookups(): void {
        const queryParams: IctuQueryParams = { limit: -1 };
        forkJoin({
            majors: this.apiOutsiteService.getNganhList().pipe(
                map((response: ExternalApiResponse<NganhItem[]>): IctuDropdownOption<number>[] =>
                    (response.data ?? [])
                        .filter((item: NganhItem): boolean => item.type === 'nganh')
                        .map((item: NganhItem): IctuDropdownOption<number> => ({ value: item.id, label: item.title })),
                ),
            ),
            provinces: this.locationService.queryLocation([], queryParams, 'regions').pipe(
                map((response: DtoObject<Locations[]>): IctuDropdownOption<number>[] =>
                    (response.data ?? []).map((item: Locations): IctuDropdownOption<number> => ({ value: item.id, label: item.name })),
                ),
            ),
        }).pipe(takeUntil(this.onDestroy$)).subscribe({
            next: ({ majors, provinces }): void => {
                this.majorOptions.set(majors);
                this.provinceOptions.set(provinces);
            },
            error: (): void => {
                this.notification.toastError('Tải dữ liệu ngành học và nơi sinh thất bại');
            },
        });
    }

    ngOnDestroy(): void {
        this.dataLoad$.next();
        this.dataLoad$.complete();
        this.onDestroy$.next();
        this.onDestroy$.complete();
        this.progress.complete();
    }
}
