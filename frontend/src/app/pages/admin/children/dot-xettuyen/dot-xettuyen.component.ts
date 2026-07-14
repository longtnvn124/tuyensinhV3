import { Component, inject, OnDestroy, OnInit, Signal, signal, viewChild, WritableSignal } from '@angular/core';
import { IctuBasePermission, IctuPermissionControl } from '@models/ictu-base-model';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { DotXettuyenService, DotXettuyenSearchInfo } from '@app/services/tuyensinh/dot-xettuyen.service';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Drawer } from 'primeng/drawer';
import { IctuFormControl2 } from '@models/ictu-form-control';
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
import { Textarea } from 'primeng/textarea';
import { DatePicker } from 'primeng/datepicker';

const dateRangeValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const start = group.get('thoi_gian_bat_dau')?.value;
    const end = group.get('thoi_gian_ket_thuc')?.value;
    if (!start || !end) return null;
    return new Date(start) < new Date(end) ? null : { dateRange: true };
};

@Component({
    selector: 'app-dot-xettuyen',
    imports: [DatePicker, Drawer, IctuPaginatorComponent, InputText, LoadingProgressComponent, MatButton, MatCheckbox, ReactiveFormsModule, Select, Textarea, FormsModule],
    templateUrl: './dot-xettuyen.component.html',
    styleUrl: './dot-xettuyen.component.css',
    standalone: true,
})
export class DotXettuyenComponent implements OnInit, OnDestroy, IctuBasePermission {

    optionList: IctuDropdownOption<string>[] = [
        { value: 'da_dong', label: 'Đã đóng' },
        { value: 'dang_mo', label: 'Đang mở' },
    ];

    private service: DotXettuyenService = inject(DotXettuyenService);
    private timejs
    searchInfo: DotXettuyenSearchInfo = { search: '' };
    dataTable: IctuDataTable<DotXettuyen> = new IctuDataTable<DotXettuyen>();
    formControl: IctuFormControl2<DotXettuyen>;
    readonly drawer = viewChild<Drawer>('masterDrawer');
    eventObserver$: Subject<DataTableEvent<DotXettuyen>> = new Subject<DataTableEvent<DotXettuyen>>();
    handelEvent!: Record<DataTableEventName, (data?: DotXettuyen | DotXettuyen[]) => void>;
    state: WritableSignal<'loading' | 'success' | 'error'> = signal<'loading' | 'success' | 'error'>('success');
    private temp: IctuDataTablePaginatorInfo = { paged: 1, resetPaginator: true };

    private auth = inject(AuthenticationService);
    private notification = inject(NotificationService);
    private fb = inject(FormBuilder);
    private onDestroy$: Subject<string> = new Subject<string>();

    permissionControl: Signal<IctuPermissionControl> = signal<IctuPermissionControl>(new IctuPermissionControl(this.auth.getUserPermission('dot-xettuyen')));

    constructor() {
        this.formControl = new IctuFormControl2<DotXettuyen>({
            dropdownFields: [],
            formGroup: this.fb.group(
                {
                    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
                    thoi_gian_bat_dau: [null, Validators.required],
                    thoi_gian_ket_thuc: [null, Validators.required],
                    mo_ta: [''],
                    status: ['dang_mo'],
                },
                { validators: dateRangeValidator },
            ),
            objectName: 'đợt xét tuyển',
            drawer: this.drawer,
        });

        this.handelEvent = {
            OPEN_FORM_ADD: (): void => {
                this.formControl.formGroup.reset({
                    name: '',
                    thoi_gian_bat_dau: null,
                    thoi_gian_ket_thuc: null,
                    mo_ta: '',
                    status: 'dang_mo',
                });
                this.formControl.openFormAdd();
            },
            OPEN_FORM_UPDATE: (data: DotXettuyen): void => {
                this.formControl.formGroup.reset({
                    name: data.name,
                    thoi_gian_bat_dau: data.thoi_gian_bat_dau ? new Date(data.thoi_gian_bat_dau) : null,
                    thoi_gian_ket_thuc: data.thoi_gian_ket_thuc ? new Date(data.thoi_gian_ket_thuc) : null,
                    mo_ta: data.mo_ta || '',
                    status: data.status || 'dang_mo',
                });
                this.formControl.openFormEdit(data);
            },
            DELETE_SINGLE_ROW: ({ id }: DotXettuyen): void => {
                this.requestDeletingData([id]);
            },
            DELETE_SELECTED_ROWS: (): void => {
                const ids: number[] = this.dataTable.getSelectedData().map(({ id }: DotXettuyen): number => id);
                if (ids.length) {
                    this.requestDeletingData(ids);
                }
            },
            SUBMIT_FORM: (): void => {
                if (this.formControl.canSubmit) {
                    const info: Partial<DotXettuyen> = {
                        name: this.formField('name').value,
                        thoi_gian_bat_dau: this.toDateString(this.formField('thoi_gian_bat_dau').value),
                        thoi_gian_ket_thuc: this.toDateString(this.formField('thoi_gian_ket_thuc').value),
                        mo_ta: this.formField('mo_ta').value,
                        status: this.formField('status').value,
                    };

                    const request: Observable<any> = this.formControl.isFormAdd
                        ? this.service.create(info)
                        : this.service.update(this.formControl.object.id, info);
                    const message: string = this.formControl.isFormAdd
                        ? 'Thêm đợt xét tuyển thành công'
                        : 'Cập nhật đợt xét tuyển thành công';
                    this.formControl.submit(request).subscribe({
                        next: (): void => {
                            this.notification.toastSuccess(message, 'Thông báo');
                            this.formControl.closeForm();
                            this.loadData(1, true);
                        },
                        error: (): void => {
                            this.notification.toastError(message, 'Thông báo');
                        },
                    });
                }
            },
        };

        this.eventObserver$.asObservable().pipe(takeUntil(this.onDestroy$)).subscribe(({ name, data }: DataTableEvent<DotXettuyen>): void =>
            this.handelEvent[name](data),
        );
    }

    private formField(path: keyof DotXettuyen): AbstractControl {
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

    ngOnInit(): void {
        this.loadData(1, true);
    }

    loadData(paged: number = 1, resetPaginator: boolean = true): void {
        this.state.set('loading');
        this.temp = { paged, resetPaginator };
        this.service.load(this.searchInfo, { limit: this.dataTable.paginator.rows(), paged }).pipe(
            map((res: DtoObject<DotXettuyen[]>): DotXettuyen[] => {
                if (resetPaginator) {
                    return this.dataTable.paginator.setupPaginator(res);
                } else {
                    this.dataTable.paginator.changePage(paged);
                    return res.data;
                }
            }),
        ).subscribe({
            next: (data: DotXettuyen[]): void => {
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
            map((): IctuDeletingAnimationControl<DotXettuyen> => new IctuDeletingAnimationControl(ids, this.service)),
            switchMap((deleteController: IctuDeletingAnimationControl<DotXettuyen>): Observable<boolean> => {
                deleteController.run();
                return this.notification.startDeleting(deleteController.progress);
            }),
        ).subscribe({
            next: (success: boolean): void => {
                if (success) {
                    this.notification.toastSuccess('Xóa đợt xét tuyển thành công');
                }
                this.loadData(1, true);
            },
            error: (): void => {
                this.notification.toastError('Xóa đợt xét tuyển thất bại');
            },
        });
    }

    onSearch(): void {
        this.loadData(1, true);
    }

    onChangePage(paged: number): void {
        this.loadData(paged, false);
    }

    onDrawerHide(): void {
        if (this.formControl.submitted) {
            this.loadData(1, true);
        }
    }

    addItem(): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_ADD', data: null });
    }

    editItem(data: DotXettuyen): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
    }

    deleteItem(data: DotXettuyen): void {
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

    formatDateRange(row: DotXettuyen): string {
        if (!row.thoi_gian_bat_dau || !row.thoi_gian_ket_thuc) return '---';
        const start = new Date(row.thoi_gian_bat_dau);
        const end = new Date(row.thoi_gian_ket_thuc);
        const fmt = (d: Date): string =>
            `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        return `${fmt(start)} → ${fmt(end)}`;
    }

    ngOnDestroy(): void {
        this.onDestroy$.next('OnDestroy');
        this.onDestroy$.complete();
    }
}
