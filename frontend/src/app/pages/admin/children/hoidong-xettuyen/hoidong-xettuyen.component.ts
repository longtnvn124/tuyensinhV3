import { Component, OnDestroy, OnInit, Signal, signal, viewChild, WritableSignal, inject } from '@angular/core';
import { IctuBasePermission, IctuPermissionControl } from '@models/ictu-base-model';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { HoidongXettuyenService, HoidongXettuyenSearchInfo } from '@services/tuyensinh/hoidong-xettuyen.service';
import { DotXettuyenService } from '@services/tuyensinh/dot-xettuyen.service';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Drawer } from 'primeng/drawer';
import { IctuFormControl2 } from '@models/ictu-form-control';
import { HoidongXettuyen } from '@app/models/tuyensinh/hoidong-xettuyen';
import { DotXettuyen } from '@app/models/tuyensinh/dot-xettuyen';
import { DataTableEvent, DataTableEventName, IctuDataTable, IctuDataTablePaginatorInfo } from '@models/datatable';
import { filter, map, Observable, Subject, switchMap, takeUntil } from 'rxjs';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import { DtoObject } from '@models/dto';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { InputText } from 'primeng/inputtext';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { HosoListComponent } from './hoso-list/hoso-list.component';

@Component({
    selector: 'app-hoidong-xettuyen',
    imports: [
        DatePicker, Drawer, HosoListComponent, IctuPaginatorComponent, InputText,
        LoadingProgressComponent, MatButton, MatCheckbox, ReactiveFormsModule, Select, FormsModule,
    ],
    templateUrl: './hoidong-xettuyen.component.html',
    styleUrl: './hoidong-xettuyen.component.css',
    standalone: true,
})
export class HoidongXettuyenComponent implements OnInit, OnDestroy, IctuBasePermission {

    statusOptions: IctuDropdownOption<string>[] = [
        { value: 'dang_mo', label: 'Đang mở' },
        { value: 'da_dong', label: 'Đã đóng' },
    ];

    dotOptions: WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>([]);

    detailDrawerVisible = false;
    detailDrawerHeader: WritableSignal<string> = signal<string>('Quản lý hồ sơ thí sinh');

    private service: HoidongXettuyenService = inject(HoidongXettuyenService);
    private dotService: DotXettuyenService = inject(DotXettuyenService);
    searchInfo: HoidongXettuyenSearchInfo = { search: '' };
    dataTable: IctuDataTable<HoidongXettuyen> = new IctuDataTable<HoidongXettuyen>();
    formControl: IctuFormControl2<HoidongXettuyen>;
    readonly drawer = viewChild<Drawer>('masterDrawer');
    eventObserver$: Subject<DataTableEvent<HoidongXettuyen>> = new Subject<DataTableEvent<HoidongXettuyen>>();
    handelEvent!: Record<DataTableEventName, (data?: HoidongXettuyen | HoidongXettuyen[]) => void>;
    state: WritableSignal<'loading' | 'success' | 'error'> = signal<'loading' | 'success' | 'error'>('success');
    private temp: IctuDataTablePaginatorInfo = { paged: 1, resetPaginator: true };

    selectedHoidong: WritableSignal<HoidongXettuyen | null> = signal<HoidongXettuyen | null>(null);

    private auth = inject(AuthenticationService);
    private notification = inject(NotificationService);
    private fb = inject(FormBuilder);
    private onDestroy$: Subject<string> = new Subject<string>();

    permissionControl: Signal<IctuPermissionControl> = signal<IctuPermissionControl>(
        new IctuPermissionControl(this.auth.getUserPermission('hoidong-xettuyen')),
    );

    constructor() {
        this.formControl = new IctuFormControl2<HoidongXettuyen>({
            dropdownFields: [],
            formGroup: this.fb.group({
                name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
                dot_xettuyen_id: [null, Validators.required],
                thoigian_xettuyen: [null, Validators.required],
                status: ['dang_mo'],
            }),
            objectName: 'hội đồng xét tuyển',
            drawer: this.drawer,
        });

        this.handelEvent = {
            OPEN_FORM_ADD: (): void => {
                this.loadDotOptions();
                this.formControl.formGroup.reset({
                    name: '',
                    dot_xettuyen_id: null,
                    thoigian_xettuyen: null,
                    status: 'dang_mo',
                });
                this.formControl.openFormAdd();
            },
            OPEN_FORM_UPDATE: (data: HoidongXettuyen): void => {
                this.loadDotOptions();
                this.formControl.formGroup.reset({
                    name: data.name,
                    dot_xettuyen_id: data.dot_xettuyen_id ?? null,
                    thoigian_xettuyen: data.thoigian_xettuyen ? new Date(data.thoigian_xettuyen) : null,
                    status: data.status || 'dang_mo',
                });
                this.formControl.openFormEdit(data);
            },
            DELETE_SINGLE_ROW: ({ id }: HoidongXettuyen): void => {
                this.requestDeletingData([id]);
            },
            DELETE_SELECTED_ROWS: (): void => {
                const ids: number[] = this.dataTable.getSelectedData().map(({ id }: HoidongXettuyen): number => id);
                if (ids.length) {
                    this.requestDeletingData(ids);
                }
            },
            SUBMIT_FORM: (): void => {
                if (this.formControl.canSubmit) {
                    const info: Partial<HoidongXettuyen> = {
                        name: this.formField('name').value,
                        dot_xettuyen_id: this.formField('dot_xettuyen_id').value,
                        thoigian_xettuyen: this.toDateString(this.formField('thoigian_xettuyen').value),
                        status: this.formField('status').value,
                    };
                    const request: Observable<any> = this.formControl.isFormAdd
                        ? this.service.create(info)
                        : this.service.update(this.formControl.object.id, info);
                    const message: string = this.formControl.isFormAdd
                        ? 'Thêm hội đồng xét tuyển thành công'
                        : 'Cập nhật hội đồng xét tuyển thành công';
                    this.formControl.submit(request).subscribe({
                        next: (): void => {
                            this.notification.toastSuccess(message, 'Thông báo');
                            if (this.formControl.isFormAdd) {
                                this.formControl.formGroup.reset({
                                    name: '',
                                    dot_xettuyen_id: null,
                                    thoigian_xettuyen: null,
                                    status: 'dang_mo',
                                });
                            } else {
                                this.formControl.closeForm();
                            }
                            this.loadData(1, true);
                        },
                        error: (): void => {
                            this.notification.toastError(message, 'Thông báo');
                        },
                    });
                }
            },
        };

        this.eventObserver$.asObservable().pipe(takeUntil(this.onDestroy$)).subscribe(({ name, data }: DataTableEvent<HoidongXettuyen>): void =>
            this.handelEvent[name](data),
        );
    }

    private formField(path: keyof HoidongXettuyen): AbstractControl {
        return this.formControl.formGroup.get(path as string);
    }

    private toDateString(value: Date | string | null | undefined): string {
        if (!value) return '';
        const d = value instanceof Date ? value : new Date(value);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private loadDotOptions(): void {
        if (this.dotOptions().length) return;
        this.dotService.load({ search: '' }, { limit: 100, paged: 1, order: 'DESC', orderby: 'created_at' }).subscribe({
            next: (res: DtoObject<DotXettuyen[]>): void => {
                const opts: IctuDropdownOption<number>[] = res.data.map((d: DotXettuyen): IctuDropdownOption<number> => ({
                    value: d.id,
                    label: d.name,
                }));
                this.dotOptions.set(opts);
            },
        });
    }

    ngOnInit(): void {
        this.loadData(1, true);
    }

    loadData(paged: number = 1, resetPaginator: boolean = true): void {
        this.state.set('loading');
        this.temp = { paged, resetPaginator };
        this.service.load(this.searchInfo, { limit: this.dataTable.paginator.rows(), paged }).pipe(
            map((res: DtoObject<HoidongXettuyen[]>): HoidongXettuyen[] => {
                if (resetPaginator) {
                    return this.dataTable.paginator.setupPaginator(res);
                } else {
                    this.dataTable.paginator.changePage(paged);
                    return res.data;
                }
            }),
        ).subscribe({
            next: (data: HoidongXettuyen[]): void => {
                this.dataTable.fillData(data);
                this.state.set('success');
            },
            error: (): void => {
                this.state.set('error');
            },
        });
    }

    private requestDeletingData(ids: number[]): void {
        this.notification.confirmDelete(ids.length).pipe(
            filter((confirm: boolean): boolean => confirm),
            map((): IctuDeletingAnimationControl<HoidongXettuyen> => new IctuDeletingAnimationControl(ids, this.service)),
            switchMap((deleteController: IctuDeletingAnimationControl<HoidongXettuyen>): Observable<boolean> => {
                deleteController.run();
                return this.notification.startDeleting(deleteController.progress);
            }),
        ).subscribe({
            next: (success: boolean): void => {
                if (success) {
                    this.notification.toastSuccess('Xóa hội đồng xét tuyển thành công');
                }
                this.loadData(1, true);
            },
            error: (): void => {
                this.notification.toastError('Xóa hội đồng xét tuyển thất bại');
            },
        });
    }

    onSearch(): void {
        this.loadData(1, true);
    }

    onChangePage(paged: number): void {
        this.loadData(paged, false);
    }

    onMasterDrawerHide(): void {
        if (this.formControl.submitted) {
            this.loadData(1, true);
        }
    }

    addItem(): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_ADD', data: null });
    }

    editItem(data: HoidongXettuyen): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
    }

    deleteItem(data: HoidongXettuyen): void {
        this.eventObserver$.next({ name: 'DELETE_SINGLE_ROW', data });
    }

    deleteSelected(): void {
        this.eventObserver$.next({ name: 'DELETE_SELECTED_ROWS', data: null });
    }

    submitForm(): void {
        this.eventObserver$.next({ name: 'SUBMIT_FORM', data: null });
    }

    reload(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.loadData(this.temp.paged, this.temp.resetPaginator);
    }

    openHosoList(item: HoidongXettuyen): void {
        this.selectedHoidong.set(item);
        this.detailDrawerHeader.set(`Hồ sơ thí sinh — ${item.name}`);
        this.detailDrawerVisible = true;
    }

    onDetailDrawerHide(): void {
        this.selectedHoidong.set(null);
    }

    formatDate(value: string | null | undefined): string {
        if (!value) return '---';
        const d = new Date(value);
        if (isNaN(d.getTime())) return '---';
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }

    getDotName(dotId: number): string {
        const found = this.dotOptions().find(o => o.value === dotId);
        return found ? found.label : '---';
    }

    ngOnDestroy(): void {
        this.onDestroy$.next('OnDestroy');
        this.onDestroy$.complete();
    }
}
