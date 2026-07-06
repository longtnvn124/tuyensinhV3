import {
    Component,
    EventEmitter,
    inject,
    input,
    InputSignal,
    OnDestroy,
    OnInit,
    output,
    Output,
    Signal,
    signal,
    viewChild,
    WritableSignal,
} from '@angular/core';
import { Drawer } from 'primeng/drawer';
import { InputText } from 'primeng/inputtext';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import {
    AbstractControl,
    AsyncValidatorFn,
    FormBuilder,
    FormControl,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import {
    IctuBasePermission,
    IctuPermissionControl,
} from '@models/ictu-base-model';
import {
    IctuDropdownField,
    IctuDropdownOption,
} from '@models/ictu-dropdown-option';

import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';

import { AppState } from '@models/app-state';
import { IctuFormControl2 } from '@models/ictu-form-control';

import {
    DataTableEvent,
    DataTableEventName,
    IctuDataTable,
} from '@models/datatable';
import { firstValueFrom, forkJoin, map, merge, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { catchError, debounceTime, delay, filter, tap } from 'rxjs/operators';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';

import { DatePickerModule } from 'primeng/datepicker';
import { LocationService } from '@services/location.service';
import { _10MB } from '@utilities/syscats';
import { Textarea } from 'primeng/textarea';
import { CommonModule } from '@angular/common';
import { Helper, HelperClass } from '@utilities/helper';
import { DialogModule } from 'primeng/dialog';
import { PhuHuynh } from '@models/phu-huynh';
import {
    PhuHuynhSearchInfo,
    PhuHuynhService,
} from '@services/phu-huynh.service';
import { HocSinh } from '@app/models/hoc-sinh';
import { SafeUrlPipe } from '@app/pipes/safe-url.pipe';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    IctuImageResizeComponent,
    ImageResizerConfig,
    ImageResizerDto,
} from '@components/ictu-image-resize/ictu-image-resize.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { IctuFileService } from '@app/services/ictu-file.service';
import { ICTUStandardFile } from '@app/models/file';
import { MatMenuModule } from "@angular/material/menu";
import { Organization } from '@app/models/organization';
import { OrganizationSearchInfo, OrganizationService } from '@app/services/organization.service';
import { Select } from 'primeng/select';
type Mode = 'DF' | 'import' | 'phuhuynh';
type FileUploadCategory = 'photo';
@Component({
    selector: 'app-parent-component',
    imports: [
        Drawer,
        InputText,
        LoadingProgressComponent,
        MatButton,
        MatCheckbox,
        ReactiveFormsModule,
        FormsModule,
        DatePickerModule,
        Textarea,
        CommonModule,
        DialogModule,
        SafeUrlPipe,
        MatMenuModule,
        Select
    ],
    templateUrl: './parent-component.html',
    styleUrl: './parent-component.css',
})
export class ParentComponent implements OnInit, OnDestroy, IctuBasePermission {
    private helper = new HelperClass();

    optionVaiTro: IctuDropdownOption<number>[] = [
        { value: 0, label: 'Bố/Mẹ' },
        { value: -1, label: 'Cô/Chú' },
        { value: 1, label: 'Bác/Bá' },
        { value: 2, label: 'Ông/Bà' },
    ];
    optiongender: IctuDropdownOption<number>[] = [
        { value: 0, label: 'Nam' },
        { value: 1, label: 'Nữ' },
        { value: 2, label: 'Khác' },
    ];
    optionHuyen: IctuDropdownOption<number>[];
    optionHuyenLoad: IctuDropdownOption<number>[];
    optiondoitac: [] = [];
    optionXaLoad: IctuDropdownOption<number>[];
    optionXa: IctuDropdownOption<number>[];

    private service: PhuHuynhService = inject(PhuHuynhService);

    private organizationService: OrganizationService = inject(OrganizationService);

    public organizationValidatorObserver: Subject<void> = new Subject();

    studentObject: InputSignal<HocSinh> = input.required<HocSinh>();

    private auth: AuthenticationService = inject(AuthenticationService);

    private notification: NotificationService = inject(NotificationService);

    private locationsService: LocationService = inject(LocationService);

    get donviId(): number {
        return this.auth.user.donvi_id;
    }

    organizationSearchInfo: OrganizationSearchInfo = {
        search: null
    }

    modeChange = output<Mode>();

    setMode(mode: Mode) {
        this.modeChange.emit(mode);
    }
    tinh_id: number = 0;
    class_idSelected: number = 0;
    visibleDialog = false;
    tinhDropdownField: IctuDropdownField = new IctuDropdownField(
        this.locationsService.loadTinh(),
        'Chọn tỉnh'
    );

    organizationDropdownField: IctuDropdownOption<number>[] = [];

    private dialog: MatDialog = inject(MatDialog);

    state: WritableSignal<AppState> = signal<AppState>('loading');

    private fileService: IctuFileService = inject<IctuFileService>(IctuFileService);

    private fb: FormBuilder = inject(FormBuilder);

    isListImportDuplicate: WritableSignal<boolean> = signal(false);

    readonly drawer: Signal<Drawer> = viewChild<Drawer>('pDrawer');

    private openFileChooserObserver: Subject<FileUploadCategory> =
        new Subject<FileUploadCategory>();

    formControl: IctuFormControl2<PhuHuynh> = new IctuFormControl2<PhuHuynh>({
        dropdownFields: [],
        formGroup: this.fb.group({
            full_name: [
                '',
                [
                    Validators.required,
                    Validators.minLength(1),
                    Validators.maxLength(255),
                ],
            ],
            code: [
                '',
                [
                    Validators.required,
                    Validators.minLength(1),
                    Validators.maxLength(255),
                ],
            ],
            dob: [''],
            gender: [''],
            vaitro: ['', [Validators.required]],
            email: ['', Validators.required],
            dienthoai1: [
                '',
                [
                    Validators.required,
                    Validators.minLength(10),
                    Validators.maxLength(10),
                ],
            ],
            dienthoai2: [''],
            tinh: [0],
            // huyen: [0],
            // xa: [0],
            address: [''],
            nghenghiep: [''],
            chucvu: [''],
            organization_id: [0],
            trangthai: [0],
            avatar: ['']
        }),
        objectName: 'phụ huynh',
        drawer: this.drawer,
    });

    private handelEvent: Record<DataTableEventName, (data: PhuHuynh) => void> =
        {
            OPEN_FORM_ADD: (): void => {
                this.formControl.formGroup.reset({
                    full_name: '',
                    code: '',
                    dob: new Date(),
                    avatar: '',
                    gender: 'Nam',
                    vaitro: '',
                    email: '',
                    dienthoai1: '',
                    dienthoai2: '',
                    tinh: 0,
                    address: '',
                    nghenghiep: '',
                    chucvu: '',
                    organization_id: 0,
                    trangthai: 1,
                });
                this.formField('email').enable();
                this.formControl.openFormAdd();
            },
            OPEN_FORM_UPDATE: (data: PhuHuynh): void => {
                this.formControl.formGroup.reset({
                    full_name: data.full_name,
                    code: data.code,
                    dob: new Date(data.dob),
                    avatar: data.avatar,
                    gender: data.gender,
                    vaitro: data.vaitro,
                    email: data.email,
                    dienthoai1: data.dienthoai1,
                    dienthoai2: data.dienthoai2,
                    tinh: data.tinh,
                    address: data.address,
                    nghenghiep: data.nghenghiep,
                    chucvu: data.chucvu,
                    organization_id: data.organization_id,
                    trangthai: data.trangthai,
                });
                this.formField('email').disable();
                this.formControl.openFormEdit(data);
            },
            DELETE_SINGLE_ROW: ({ id }: PhuHuynh): void => {
                this.requestDeletingData([id]);
            },
            DELETE_SELECTED_ROWS: (): void => {
                const ids: number[] = this.dataTable
                    .getSelectedData()
                    .map(({ id }: PhuHuynh): number => id);
                if (ids.length) {
                    this.requestDeletingData(ids);
                }
            },
            SUBMIT_FORM: (): void => {
                if (this.formControl.canSubmit) {
                    let info: Partial<PhuHuynh> = {
                        full_name: this.formField('full_name').value,
                        name: this.getTen(this.formField('full_name').value),
                        code: this.formField('code').value,
                        dob: this.helper.formatSQLDate(
                            this.formField('dob').value
                        ),
                        avatar: this.formField('avatar').value,
                        gender: this.formField('gender').value,
                        vaitro: this.formField('vaitro').value,
                        email: this.formField('email').value,
                        dienthoai1: this.formField('dienthoai1').value,
                        dienthoai2: this.formField('dienthoai2').value,
                        tinh: this.formField('tinh').value,
                        // huyen: this.formField('huyen').value,
                        // xa: this.formField('xa').value,
                        address: this.formField('address').value,
                        nghenghiep: this.formField('nghenghiep').value,
                        chucvu: this.formField('chucvu').value,
                        organization_id: this.formField('organization_id').value || 0,
                        trangthai: this.formField('trangthai').value,
                    };
                    if (this.formControl.isFormAdd) {
                        info.parent_id = this.phuHuynhManager.id;
                    }
                    const request: Observable<PhuHuynh> = this.formControl
                        .isFormAdd
                        ? this.service.create(info)
                        : this.service.update(this.formControl.object.id, info);
                    const message: string = this.formControl.isFormAdd
                        ? 'Thêm mới thành công'
                        : 'Cập nhật thành công';
                    if (!this.isNumber(this.formField('organization_id').value)) {
                        this.organizationService.create({ name: this.formField('organization_id').value, donvi_id: this.donviId }).pipe(
                            map(res => {
                                info.organization_id = res;
                                return res;
                            }),
                            switchMap(() => {
                                return this.formControl.submit(request);
                            }
                            )).subscribe({
                                next: (): void => {
                                    this.notification.toastSuccess(
                                        message,
                                        'Thông báo'
                                    );
                                    if (this.formControl.isFormAdd) {
                                        this.formControl.formGroup.reset({
                                            full_name: '',
                                            code: '',
                                            dob: new Date(),
                                            gender: 'Nam',
                                            vaitro: '',
                                            email: '',
                                            dienthoai1: '',
                                            dienthoai2: '',
                                            tinh: 0,
                                            huyen: 0,
                                            xa: 0,
                                            address: '',
                                            // nghenghiep: 0,
                                            // chucvu: 0,
                                            // organization_id: 0,
                                            trangthai: 1,
                                        });
                                    } else {
                                        this.formControl.closeForm();
                                    }
                                },
                                error: (): void => {
                                    this.notification.toastError(message, 'Thông báo');
                                },
                            });
                    } else {
                        this.formControl.submit(request).subscribe({
                            next: (): void => {
                                this.notification.toastSuccess(
                                    message,
                                    'Thông báo'
                                );
                                if (this.formControl.isFormAdd) {
                                    this.formControl.formGroup.reset({
                                        full_name: '',
                                        code: '',
                                        dob: new Date(),
                                        gender: 'Nam',
                                        vaitro: '',
                                        email: '',
                                        dienthoai1: '',
                                        dienthoai2: '',
                                        tinh: 0,
                                        huyen: 0,
                                        xa: 0,
                                        address: '',
                                        nghenghiep: '',
                                        chucvu: '',
                                        organization_id: 0,
                                        trangthai: 1,
                                    });
                                } else {
                                    this.formControl.closeForm();
                                }
                            },
                            error: (): void => {
                                this.notification.toastError(message, 'Thông báo');
                            },
                        });
                    }

                }
            },
        };

    private eventObserver$: Subject<DataTableEvent<PhuHuynh>> = new Subject<
        DataTableEvent<PhuHuynh>
    >();

    private onDestroy$: Subject<string> = new Subject<string>();

    private _temp: { paged: number; resetPaginator: boolean } = {
        paged: 1,
        resetPaginator: true,
    };

    searchInfo: PhuHuynhSearchInfo = {
        search: '',
    };

    dataTable: IctuDataTable<PhuHuynh> = new IctuDataTable<PhuHuynh>();
    phuHuynhManager: PhuHuynh;

    permissionControl: Signal<IctuPermissionControl> = this.auth.userHasRole([
        'ceo',
    ])
        ? signal<IctuPermissionControl>(
            new IctuPermissionControl(
                this.auth.getUserPermission('ceo/students')
            )
        )
        : signal<IctuPermissionControl>(
            new IctuPermissionControl(
                this.auth.getUserPermission('training-management/students')
            )
        );

    constructor() {
        this.eventObserver$
            .asObservable()
            .pipe(takeUntil(this.onDestroy$))
            .subscribe(({ name, data }: DataTableEvent<PhuHuynh>): void =>
                this.handelEvent[name](data)
            );
        this.openFileChooserObserver
            .pipe(takeUntilDestroyed(), debounceTime(500))
            .subscribe((category: FileUploadCategory): void => {
                this.handleFileChooser[category]();
            });
    }
    private handleFileChooser: Record<FileUploadCategory, () => void> = {
        photo: (): void => {
            const inputTag: HTMLInputElement = Object.assign<
                HTMLInputElement,
                Pick<HTMLInputElement, 'type' | 'accept' | 'multiple'>
            >(document.createElement('input'), {
                type: 'file',
                accept: 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon',
                multiple: false,
            });
            inputTag.onchange = (): void => {
                if (inputTag.files.length) {
                    const _file: File = this.validateImageInputFile(
                        inputTag.files.item(0)
                    );
                    if (_file) {
                        void this.resizeCourseThumbnail(_file);
                    }
                }
                setTimeout((): void => inputTag.remove(), 1000);
            };
            inputTag.click();
        },
    };

    private imageResize(
        file: File,
        config?: Partial<ImageResizerConfig>
    ): Observable<ImageResizerDto> {
        const _defaultConfig: Partial<ImageResizerConfig> = {
            resizeToWidth: 300,
            aspectRatio: 3 / 2,
            format: 'png',
            dataUrl: URL.createObjectURL(file),
        };

        const dialogRef: MatDialogRef<
            IctuImageResizeComponent,
            ImageResizerDto
        > = this.dialog.open(IctuImageResizeComponent, {
            data: Object.assign<
                Partial<ImageResizerConfig>,
                Partial<ImageResizerConfig>
            >(_defaultConfig, config ?? {}),
            disableClose: true,
            panelClass: 'image-resizer-panel',
        });

        return dialogRef.afterClosed();
    }

    private async resizeCourseThumbnail(file: File): Promise<any> {
        try {
            const result: ImageResizerDto = await firstValueFrom(
                this.imageResize(file, { aspectRatio: 16 / 16, format: 'png' })
            );
            if (!result.error) {
                this.formControl.state.set('LOADING');
                const fileName: string = `parent-avatar-${Date.now()}.png`;
                const fileLogo: File = Helper.blobToFile(
                    result.data.blob,
                    fileName
                );
                this.fileService
                    .upload(fileLogo, { public: 1, tag: 'parent-avatar' })
                    .pipe(takeUntil(this.onDestroy$))
                    .subscribe({
                        next: ({ name }: ICTUStandardFile): void => {
                            this.getControl('avatar').setValue(
                                Helper.removeSlashes(
                                    this.fileService.fileHostingServiceApi
                                ) +
                                '/file/' +
                                name
                            );
                            this.getControl('avatar').markAsTouched({
                                emitEvent: true,
                            });
                            this.formControl.state.set('READY');
                        },
                        error: (): void => {
                            this.notification.toastError(
                                'Upload file thất bại'
                            );
                        },
                    });
            }
        } catch (e) {
            console.log(e);
        }
    }

    private validateImageInputFile(file: File): File {
        switch (true) {
            case file.size >= _10MB:
                this.notification.toastError(
                    'Dung lượng file không được vượt quá 10MB'
                );
                return null;
            case !['jpg', 'png', 'jpeg', 'gif'].includes(
                file.name.toLowerCase().split('.').pop()
            ):
                this.notification.toastError(
                    'Chỉ chấp nhận file có định dạng jpg, png, jpeg, gif'
                );
                return null;
            default:
                return file;
        }
    }

    private formField(path: keyof PhuHuynh): AbstractControl {
        return this.formControl.formGroup.get(path);
    }

    ngOnInit(): void {
        this.loadData(1, true);
    }

    private requestDeletingData(ids: number[]): void {
        this.notification
            .confirmDelete(ids.length)
            .pipe(
                filter((confirm: boolean): boolean => confirm),
                map(
                    (): IctuDeletingAnimationControl<PhuHuynh> =>
                        new IctuDeletingAnimationControl(ids, this.service)
                ),
                switchMap(
                    (
                        deleteController: IctuDeletingAnimationControl<PhuHuynh>
                    ): Observable<boolean> => {
                        deleteController.run();
                        return this.notification.startDeleting(
                            deleteController.progress
                        );
                    }
                )
            )
            .subscribe({
                next: (success: boolean): void => {
                    if (success) {
                        this.notification.toastSuccess('Xóa thành công');
                    }
                    this.loadData(1, true);
                },
                error: (): void => {
                    this.notification.toastError('Xóa thất bại');
                },
            });
    }
    loadData(paged: number = 1, resetPaginator: boolean = true): void {
        this.state.set('loading');
        this._temp = { paged, resetPaginator };

        this.service
            .load(this.searchInfo, this.studentObject().phuhuynh_id, 0, {
                limit: 20,
                paged: 1,
            })
            .pipe(
                map(res => res.data?.[0] ?? null),
                tap(manager => (this.phuHuynhManager = manager)),
                switchMap(manager => {
                    if (!manager) {
                        return of<PhuHuynh[]>([]);
                    }
                    return forkJoin([
                        this.tinhDropdownField.load(),
                        this.organizationService.load(this.donviId, { search: null }, { limit: -1 }),
                        this.service.load(
                            this.searchInfo,
                            0,
                            manager.id,
                            {
                                limit: this.dataTable.paginator.rows(),
                                paged,
                            }
                        ),
                    ]).pipe(
                        map(([_, organization, res]) => {
                            this.organizationDropdownField = organization.data.map(
                                (dvct: Organization): IctuDropdownOption<number> => ({
                                    value: dvct.id,
                                    label: dvct.name
                                })
                            );
                            if (resetPaginator) {
                                return this.dataTable.paginator.setupPaginator(res);
                            } else {
                                this.dataTable.paginator.changePage(paged);
                                return res.data;
                            }
                        })
                    );
                })
            )
            .subscribe({
                next: (data: PhuHuynh[]) => {
                    this.dataTable.fillData(data);
                    this.state.set('success');
                },
                error: () => {
                    this.state.set('error');
                },
            });
    }


    deleteRow(data: PhuHuynh): void {
        this.eventObserver$.next({ name: 'DELETE_SINGLE_ROW', data });
    }

    deleteSelectedRows(): void {
        this.eventObserver$.next({ name: 'DELETE_SELECTED_ROWS', data: null });
    }

    editRow(data: PhuHuynh): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
    }

    reload(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.loadData(this._temp.paged, this._temp.resetPaginator);
    }

    addNewItem(): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_ADD', data: null });
    }

    submitForm(): void {
        this.eventObserver$.next({ name: 'SUBMIT_FORM', data: null });
    }

    onDrawerHide(): void {
        if (this.formControl.submitted) {
            this.loadData(1, true);
        }
    }

    onChangePage(paged: number): void {
        this.loadData(paged, false);
    }

    onSearchData(): void {
        this.loadData(1, true);
    }

    getTen(fullName: string): string {
        const parts = fullName.trim().split(/\s+/);
        return parts.length ? parts[parts.length - 1] : '';
    }

    updateStateDialog(): void {
        this.visibleDialog = !this.visibleDialog;
    }

    openListImportDuplicate() {
        this.isListImportDuplicate.update((isChecked: boolean) => !isChecked);
    }

    getidfromOption(label: string): number {
        return this.optiondoitac.find((item) => item == label) ?? 0;
    }

    shortenEmailEnd(email: string): string {
        return email
            ? email.length > 15
                ? '...' + email.slice(-15)
                : email
            : '';
    }
    protected getControl<K extends keyof PhuHuynh>(
        key: K
    ): FormControl<PhuHuynh[K]> {
        return this.formControl.formGroup.get(key as string) as FormControl<
            PhuHuynh[K]
        >;
    }

    protected callFileChooser(category: FileUploadCategory): void {
        this.openFileChooserObserver.next(category);
    }

    organizationValidator(): AsyncValidatorFn {
        this.organizationValidatorObserver.next();
        return (control: AbstractControl) => {
            if (!control.value) return of(null);
            this.organizationSearchInfo.search = control.value.toString();
            return this.organizationService.load(this.donviId, this.organizationSearchInfo, { limit: -1, paged: 1 }).pipe(
                delay(2000),
                map((res: any) => {
                    if (res && Array.isArray(res.data) && res.data.length > 0) {
                        return { isFill: true };
                    } else {
                        return null;
                    }
                }),
                takeUntil(merge(this.onDestroy$, this.organizationValidatorObserver)),
                catchError(() => of(null))
            );
        };
    }

    isNumber(value: string): boolean {
        return !isNaN(Number(value));
    }


    onChange(value: string): void {
        if (value == '' || value) {
            this.formField('organization_id').markAsTouched();
        }else{
            this.formField('organization_id').markAsUntouched();
        }
    }

    ngOnDestroy(): void {
        this.onDestroy$.next('OnDestroy');
        this.onDestroy$.complete();
    }
}
