import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HoidongXettuyen } from '@models/tuyensinh/hoidong-xettuyen';
import { HoidongHosoThisinh } from '@models/tuyensinh/hoidong-hoso-thisinh';
import { HosoThisinh } from '@models/tuyensinh/hoso-thisinh';
import { HoidongXettuyenService } from '@services/tuyensinh/hoidong-xettuyen.service';
import { HosoThisinhService } from '@services/tuyensinh/hoso-thisinh.service';
import { IctuPermissionControl } from '@models/ictu-base-model';
import { IctuDataTable, IctuDataTablePaginatorInfo } from '@models/datatable';
import { DtoObject } from '@models/dto';
import { NotificationService } from '@services/notification.service';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { Dialog } from 'primeng/dialog';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { filter, forkJoin, map, Subject } from 'rxjs';

@Component({
    selector: 'app-hoso-list',
    imports: [
        Dialog, FormsModule, IctuPaginatorComponent, InputText, LoadingProgressComponent,
        MatButton, MatCheckbox, Select,
    ],
    templateUrl: './hoso-list.component.html',
    styleUrl: './hoso-list.component.css',
    standalone: true,
})
export class HosoListComponent implements OnChanges, OnDestroy {
    @Input() set hoidong(value: HoidongXettuyen | null) { this._hoidong = value; }
    get hoidong(): HoidongXettuyen | null { return this._hoidong; }
    @Input() permission!: IctuPermissionControl;
    private _hoidong: HoidongXettuyen | null = null;

    state: WritableSignal<'loading' | 'success' | 'error'> = signal<'loading' | 'success' | 'error'>('success');
    dataTable: IctuDataTable<HoidongHosoThisinh> = new IctuDataTable<HoidongHosoThisinh>({ rows: 50 });
    private temp: IctuDataTablePaginatorInfo = { paged: 1, resetPaginator: true };

    candidateMap: WritableSignal<Map<number, HosoThisinh>> = signal<Map<number, HosoThisinh>>(new Map<number, HosoThisinh>());

    assignDialogVisible = false;
    assignSearch = '';
    assignLoading = false;
    assignCandidates: HosoThisinh[] = [];
    selectedAssignIds: Set<number> = new Set<number>();

    readonly ketQuaOptions = [
        { value: '', label: '— Chưa đánh giá —' },
        { value: 'trung_tuyen', label: 'Trúng tuyển' },
        { value: 'khong_trung_tuyen', label: 'Không trúng tuyển' },
    ];

    private service = inject(HoidongXettuyenService);
    private hosoService = inject(HosoThisinhService);
    private notification = inject(NotificationService);
    private onDestroy$ = new Subject<string>();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['hoidong']) {
            if (this._hoidong?.id) {
                this.loadData(1, true);
            } else {
                this.dataTable.fillData([]);
                this.candidateMap.set(new Map<number, HosoThisinh>());
            }
        }
    }

    loadData(paged: number = 1, resetPaginator: boolean = true): void {
        const hoidongId = this._hoidong?.id;
        if (!hoidongId) return;
        this.state.set('loading');
        this.temp = { paged, resetPaginator };
        forkJoin({
            assigned: this.service.getAssignedHoso(hoidongId, { limit: this.dataTable.paginator.rows(), paged }),
            candidates: this.hosoService.load({ search: '' }, { limit: 500, paged: 1 }),
        }).pipe(
            map(({ assigned, candidates }: { assigned: DtoObject<HoidongHosoThisinh[]>; candidates: DtoObject<HosoThisinh[]> }): { rows: HoidongHosoThisinh[]; map: Map<number, HosoThisinh> } => {
                const map = new Map<number, HosoThisinh>();
                const candidateList: HosoThisinh[] = candidates?.data ?? [];
                for (const c of candidateList) {
                    map.set(c.id, c);
                }
                if (resetPaginator) {
                    this.dataTable.paginator.setupPaginator(assigned);
                } else {
                    this.dataTable.paginator.changePage(paged);
                }
                return { rows: assigned?.data ?? [], map };
            }),
        ).subscribe({
            next: ({ rows, map }: { rows: HoidongHosoThisinh[]; map: Map<number, HosoThisinh> }): void => {
                this.candidateMap.set(map);
                this.dataTable.fillData(rows);
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
        return this.candidateMap().get(row.registration_id);
    }

    // ═══ Assign dialog ═══

    openAssignDialog(): void {
        if (!this._hoidong?.id) return;
        this.assignSearch = '';
        this.selectedAssignIds = new Set<number>();
        this.loadCandidates();
        this.assignDialogVisible = true;
    }

    loadCandidates(): void {
        this.assignLoading = true;
        this.hosoService.load({ search: this.assignSearch }, { limit: 200, paged: 1 }).subscribe({
            next: (res: DtoObject<HosoThisinh[]>): void => {
                const assigned = new Set<number>(this.dataTable.data().map((r: HoidongHosoThisinh): number => r.registration_id));
                this.assignCandidates = res.data.filter((c: HosoThisinh): boolean => !assigned.has(c.id));
                this.assignLoading = false;
            },
            error: (): void => {
                this.assignLoading = false;
                this.notification.toastError('Tải danh sách thí sinh thất bại');
            },
        });
    }

    onAssignSearchKeyup(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.loadCandidates();
        }
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
        if (!ids.length || !this._hoidong?.id) return;
        const hoidongId: number = this._hoidong.id;
        const total: number = ids.length;
        let success: number = 0;
        let failed: number = 0;
        ids.forEach((registrationId: number): void => {
            this.service.assignHoso({ hoidong_id: hoidongId, registration_id: registrationId }).subscribe({
                next: (): void => {
                    success++;
                    if (success + failed === total) {
                        this.afterAssign(success, failed);
                    }
                },
                error: (): void => {
                    failed++;
                    if (success + failed === total) {
                        this.afterAssign(success, failed);
                    }
                },
            });
        });
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

    // ═══ Inline edit: ket_qua + ghi_chu ═══

    changeKetQua(row: HoidongHosoThisinh, value: string): void {
        if (value === row.ket_qua) return;
        this.service.updateKetQua(row.id, { ket_qua: value }).subscribe({
            next: (): void => {
                const updated: HoidongHosoThisinh[] = this.dataTable.data().map((r: HoidongHosoThisinh): HoidongHosoThisinh =>
                    r.id === row.id ? { ...r, ket_qua: value } : r,
                );
                this.dataTable.fillData(updated);
                this.notification.toastSuccess('Đã cập nhật kết quả xét tuyển');
            },
            error: (): void => {
                this.notification.toastError('Cập nhật kết quả thất bại');
            },
        });
    }

    updateGhiChu(row: HoidongHosoThisinh, value: string): void {
        if ((value || '') === (row.ghi_chu || '')) return;
        this.service.updateKetQua(row.id, { ghi_chu: value || '' }).subscribe({
            next: (): void => {
                const updated: HoidongHosoThisinh[] = this.dataTable.data().map((r: HoidongHosoThisinh): HoidongHosoThisinh =>
                    r.id === row.id ? { ...r, ghi_chu: value || '' } : r,
                );
                this.dataTable.fillData(updated);
            },
            error: (): void => {
                this.notification.toastError('Cập nhật ghi chú thất bại');
            },
        });
    }

    // ═══ Remove assigned ═══

    removeAssigned(row: HoidongHosoThisinh): void {
        this.notification.confirmDelete(1).pipe(filter((c: boolean): boolean => c)).subscribe({
            next: (): void => {
                this.service.removeAssignedHoso(row.id).subscribe({
                    next: (): void => {
                        this.notification.toastSuccess('Đã xóa hồ sơ khỏi hội đồng');
                        this.loadData(this.dataTable.paginator.paged() || 1, false);
                    },
                    error: (): void => {
                        this.notification.toastError('Xóa hồ sơ thất bại');
                    },
                });
            },
        });
    }

    ngOnDestroy(): void {
        this.onDestroy$.next('done');
        this.onDestroy$.complete();
    }
}
