import {
    Component,
    computed,
    inject,
    OnDestroy,
    OnInit,
    Signal,
    signal,
    TemplateRef,
    viewChild,
    WritableSignal,
} from '@angular/core';
import { Drawer } from 'primeng/drawer';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { InputText } from 'primeng/inputtext';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import {
    AbstractControl,
    FormBuilder,
    FormControl,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { Select } from 'primeng/select';
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

import { AppState, UploadAnimation } from '@models/app-state';
import { IctuFormControl2 } from '@models/ictu-form-control';

import {
    DataTableEvent,
    DataTableEventName,
    IctuDataTable,
} from '@models/datatable';
import {
    BehaviorSubject,
    firstValueFrom,
    forkJoin,
    map,
    merge,
    Observable,
    Subject,
    switchMap,
    takeUntil,
} from 'rxjs';
import { debounceTime, filter, take } from 'rxjs/operators';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { BacDaoTaoService } from '@services/bac-dao-tao.service';

import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import { DatePickerModule } from 'primeng/datepicker';
import { HocSinh } from '@models/hoc-sinh';
import { HocSinhSearchInfo, HocSinhService } from '@services/hoc-sinh.service';
import { LocationService } from '@services/location.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { _10MB } from '@utilities/syscats';
import readXlsxFile, { Row } from 'read-excel-file';
import { DragAndDropDirective } from '@theme/directives/drag-and-drop.directive';
import { Textarea } from 'primeng/textarea';
import { CommonModule } from '@angular/common';
import { Helper, HelperClass } from '@utilities/helper';
import { MatTooltip } from '@angular/material/tooltip';
import { LopHocSearchInfo, LopHocService } from '@app/services/lop-hoc.service';
import { DialogModule } from 'primeng/dialog';
import { PhuHuynhService } from '@services/phu-huynh.service';
import { HocSinhLopHocService } from '@services/hoc-sinh-lop-hoc.service';
import { PhuHuynh } from '@app/models/phu-huynh';
import { IctuFileService } from '@app/services/ictu-file.service';
import { SafeUrlPipe } from '@pipes/safe-url.pipe';
import {
    IctuImageResizeComponent,
    ImageResizerConfig,
    ImageResizerDto,
} from '@components/ictu-image-resize/ictu-image-resize.component';
import { ICTUStandardFile } from '@app/models/file';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatMenuModule } from '@angular/material/menu';
import { ClassRelative } from '@app/models/class';
import { ParentComponent } from '@components/parent-component/parent-component';
type ImportPanelLayout = 'SELECT_FILE' | 'PROCESS';
type HSImportState =
    | 'prepare'
    | 'invalid'
    | 'waitting'
    | 'uploading'
    | 'uploadingFail'
    | 'uploadingFailHSLH'
    | 'uploaded'
    | 'uploadedHSLH';
type Mode = 'DF' | 'import' | 'phuhuynh';
interface HSImport {
    id: number;
    hocsinh_id: number;
    donvi_id: number;
    // phuhuynh_id: number;
    tenphuhuynh: string;
    code: string;
    masophuhuynh: string;
    ngaysinhphuhuynh: string;
    gioitinhphuhuynh: string;
    emailphuhuynh: string;
    // sdtphuhuynh: number;
    user_id: number;
    sale_id: number;
    full_name: string;
    name: string;
    english_name: string;
    dob: string;
    gender: string;
    email: string;
    dienthoai1: string;
    avata: string;
    // tinh: number;
    // huyen: number;
    // xa: number;
    address: string;
    trangthai: number;
    state: HSImportState;
    errorMessage: string;
    referenceObjectId: number;
    checked: boolean;
}
class ImportPanel<T> {
    readonly step: WritableSignal<ImportPanelLayout>;
    store: T[];
    readonly paged: WritableSignal<number>;
    readonly rows: Signal<number>;
    readonly filtered: WritableSignal<T[]>;
    readonly loadingTitle: WritableSignal<string>;
    readonly indexOffset: Signal<number> = computed(
        (): number => this.rows() * Math.min(0, this.paged() - 1) + 1
    );
    readonly isLoading: Signal<boolean> = computed(
        (): boolean => this.loadingTitle() && this.loadingTitle().length > 0
    );

    constructor(initState: ImportPanelLayout) {
        this.step = signal<ImportPanelLayout>(initState);
        this.rows = signal<number>(20);
        this.paged = signal<number>(1);
        this.store = [];
        this.filtered = signal<T[]>([]);
        this.loadingTitle = signal<string>(null);
    }

    public openSelectLayout(): void {
        this.store = [];
        this.filtered.set([]);
        this.paged.set(1);
    }

    public enableLoading(loadingTitle: string): void {
        this.loadingTitle.set(loadingTitle);
    }

    public disableLoading(): void {
        this.loadingTitle.set(null);
    }
}

type HocSinhImportRowState =
    | 'INVALID'
    | 'VALID'
    | 'UPLOADING'
    | 'UPLOADING_FAIL'
    | 'REJECTED'
    | 'UPLOADED';

interface HocSinhImportRow {
    index: number;
    info: Pick<
        HocSinh,
        | 'donvi_id'
        | 'phuhuynh_id'
        | 'user_id'
        | 'code'
        | 'full_name'
        | 'name'
        | 'english_name'
        | 'dob'
        | 'address'
        | 'avatar'
        | 'nguonden'
        | 'tinh'
        | 'huyen'
        | 'xa'
        | 'address'
        | 'status'
    >;
    hocsinh: HocSinh;
    ready: Signal<boolean>;
    state: WritableSignal<HocSinhImportRowState>;
}

type StudentFieldName = Pick<HocSinh, 'avatar'>;

type FileUploadCategory = 'thumbnail' | 'attachments' | 'photo';

interface HocSinhExtend extends HocSinh {
    idPhuhuynh: number;
    hotenPhuhuynh: string;
    masoPhuhuynh: string;
    ngaysinhPhuhuynh: string;
    gioitinhPhuhuynh: string;
    vaitroPhuhuynh: string;
    emailPhuhuynh: string;
    dienthoai1Phuhuynh: string;
    diachiPhuhuynh: string;
    trangthaiPhuhuynh: number;
}
@Component({
    selector: 'app-students',
    imports: [
        Drawer,
        IctuPaginatorComponent,
        InputText,
        LoadingProgressComponent,
        MatButton,
        MatCheckbox,
        ReactiveFormsModule,
        Select,
        DragAndDropDirective,
        FormsModule,
        DatePickerModule,
        Textarea,
        CommonModule,
        MatTooltip,
        DialogModule,
        ParentComponent,
        SafeUrlPipe,
        MatMenuModule,
    ],
    templateUrl: './students.html',
    styleUrl: './students.css',
})
export class Students implements OnInit, OnDestroy, IctuBasePermission {
    private observeImportHocSinh$: Subject<string> = new Subject<string>();
    importDialogRef: MatDialogRef<boolean>;
    importDialogDirty: WritableSignal<boolean> = signal<boolean>(false);
    readonly importTemplate: Signal<TemplateRef<any>> =
        viewChild<TemplateRef<any>>('importTemplate');
    private observeOpenFileSelector: Subject<string> = new Subject<string>();

    readonly importPanel: ImportPanel<HocSinhImportRow> = new ImportPanel(
        'SELECT_FILE'
    );

    private helper = new HelperClass();
    optionListTrangThai: IctuDropdownOption<number>[] = [
        { value: 0, label: 'Chưa từng học' },
        { value: 1, label: 'Đã học' },
    ];
    optionListTrangThaiHoc: IctuDropdownOption<number>[] = [
        { value: 0, label: 'Chờ xếp lớp' },
        { value: -1, label: 'Nghỉ học' },
        { value: 1, label: 'Đang học' },
        { value: 2, label: 'Tạm dừng' },
    ];
    optionGioiTinh: IctuDropdownOption<number>[] = [
        { value: 0, label: 'Nam' },
        { value: 1, label: 'Nữ' },
        { value: 2, label: 'Khác' },
    ];
    optionGT: IctuDropdownOption<number>[] = [
        { value: 0, label: 'Tự đến trung tâm' },
        { value: 2, label: 'Học sinh cũ giới thiệu' },
        { value: 3, label: 'Đối tác tuyển sinh' },
        { value: 4, label: 'Có anh, chị, em đã học ở Trung tâm' },
    ];
    optionHuyen: IctuDropdownOption<number>[];
    optionHuyenLoad: IctuDropdownOption<number>[];
    optiondoitac: [] = [];
    optionXaLoad: IctuDropdownOption<number>[];
    optionXa: IctuDropdownOption<number>[];
    private service: HocSinhService = inject(HocSinhService);
    private phuHuynhService: PhuHuynhService = inject(PhuHuynhService);
    private hocSinhLopHocService: HocSinhLopHocService =
        inject(HocSinhLopHocService);
    private auth: AuthenticationService = inject(AuthenticationService);

    private notification: NotificationService = inject(NotificationService);
    // private helperService: He = inject(LocationService);
    private locationsService: LocationService = inject(LocationService);
    private bacDaoTaoService: BacDaoTaoService = inject(BacDaoTaoService);
    private lophocService: LopHocService = inject(LopHocService);
    private cosodaotaoService: CoSoDaoTaoService = inject(CoSoDaoTaoService);
    private fileService: IctuFileService =
        inject<IctuFileService>(IctuFileService);
    get donviId(): number {
        return this.auth.user.donvi_id;
    }
    modeState: WritableSignal<Mode> = signal<Mode>('DF');
    dataHocSinh: WritableSignal<HocSinh> = signal<HocSinh>(null);

    setMode(mode: Mode, hocsinh?: HocSinh) {
        switch (mode) {
            case 'DF':
                this.modeState.set('DF');
                break;
            case 'import':
                this.modeState.set('import');
                break;
            case 'phuhuynh':
                this.modeState.set('phuhuynh');
                this.dataHocSinh.set(hocsinh);
                break;
        }
    }

    onModeChange(newMode: Mode) {
        this.modeState.set(newMode);
    }

    isUploadHSLH: boolean = false;
    ngaysinh: Date;
    tinh_id: number = 0;
    huyen_id: number = 0;
    optionsLopHoc: ClassRelative[] = [];
    class_idSelected: number = 0;
    visibleDialog: boolean = false;
    phuhuynh_id: number = 0;
    cosodaotaoDropdownField: IctuDropdownField = new IctuDropdownField(
        this.cosodaotaoService.loadOptions(this.donviId),
        'Chọn cơ sở đào tạo'
    );
    tinhDropdownField: IctuDropdownField = new IctuDropdownField(
        this.locationsService.loadTinh(),
        'Chọn tỉnh'
    );

    bacDaoTaoDropdownField: IctuDropdownField = new IctuDropdownField(
        this.bacDaoTaoService.loadOptions(this.donviId),
        'Chọn bậc đào tạo'
    );

    state: WritableSignal<AppState> = signal<AppState>('loading');

    private fb: FormBuilder = inject(FormBuilder);

    isListImportDuplicate: WritableSignal<boolean> = signal(false);

    private openFileChooserObserver: Subject<FileUploadCategory> =
        new Subject<FileUploadCategory>();

    readonly drawer: Signal<Drawer> = viewChild<Drawer>('pDrawer');

    private readonly listImport: WritableSignal<HSImport[]> = signal([]);

    readonly importFiltered: Signal<HSImport[]> = computed(() => {
        return this.isListImportDuplicate()
            ? this.listImport().filter((item) => item.state == 'invalid')
            : this.listImport();
    });

    readonly someItemsChecked: Signal<boolean> = computed((): boolean => {
        if (!this.importFiltered().length) {
            return false;
        }
        return this.importFiltered().some((e: HSImport): boolean => e.checked);
    });

    readonly partiallyChecked: Signal<boolean> = computed(
        (): boolean => this.someItemsChecked() && !this.totalChecked()
    );

    readonly totalChecked: Signal<boolean> = computed((): boolean => {
        if (!this.importFiltered().length) {
            return false;
        }
        return this.importFiltered().every((e: HSImport): boolean => e.checked);
    });

    private destroy$: Subject<void> = new Subject<void>();

    private dialog: MatDialog = inject(MatDialog);

    private _formGroup: FormGroup = new FormGroup({
        code: new FormControl('', [
            Validators.required,
            Validators.minLength(1),
            Validators.maxLength(255),
        ]),
        full_name: new FormControl('', [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(255),
        ]),
        avatar: new FormControl(''),
        english_name: new FormControl(''),
        // csdt_ids: new FormControl(0, [Validators.required, Validators.min(1)]),
        donvi_id: new FormControl(this.donviId),
        gender: new FormControl('', [Validators.required, Validators.min(0)]),
        email: new FormControl('', []),
        phone: new FormControl(''),
        regular_school: new FormControl(''),
        regular_class: new FormControl(''),
        tinh: new FormControl(0),
        dob: new FormControl('', [
            Validators.required,
            Validators.minLength(11),
            Validators.maxLength(11),
        ]),
        huyen: new FormControl(0),
        xa: new FormControl(0),
        address: new FormControl(''),
        nguonden: new FormControl(0, [Validators.required, Validators.min(0)]),
        status: new FormControl(0),

        // --------- Phụ huynh ----------
        idPhuhuynh: new FormControl(0),
        hotenPhuhuynh: new FormControl('', [
            Validators.required,
            Validators.minLength(1),
            Validators.maxLength(255),
        ]),
        masoPhuhuynh: new FormControl('', [
            Validators.required,
            Validators.minLength(1),
            Validators.maxLength(255),
        ]),
        ngaysinhPhuhuynh: new FormControl(new Date(1990, 9, 1)),
        gioitinhPhuhuynh: new FormControl(''),
        vaitroPhuhuynh: new FormControl('', [
            Validators.required,
            Validators.minLength(1),
            Validators.maxLength(255),
        ]),
        emailPhuhuynh: new FormControl('', [
            Validators.required,
            Validators.maxLength(255),
        ]),
        dienthoai1Phuhuynh: new FormControl('', [
            Validators.required,
            Validators.minLength(1),
            Validators.maxLength(255),
        ]),
        diachiPhuhuynh: new FormControl('', [
            Validators.required,
            Validators.minLength(1),
            Validators.maxLength(255),
        ]),
        trangthaiPhuhuynh: new FormControl(0),
    });

    formControl: IctuFormControl2<HocSinhExtend> =
        new IctuFormControl2<HocSinhExtend>({
            dropdownFields: [
                this.bacDaoTaoDropdownField,
                this.tinhDropdownField,
                this.cosodaotaoDropdownField,
            ],
            formGroup: this._formGroup,
            objectName: 'học sinh',
            drawer: this.drawer,
        });

    private handelEvent: Record<
        DataTableEventName,
        (data: HocSinhExtend) => void
    > = {
            OPEN_FORM_ADD: (): void => {
                this.formControl.formGroup.reset({
                    code: '',
                    full_name: '',
                    english_name: '',
                    csdt_ids: 0,
                    avatar: '',
                    donvi_id: this.donviId,
                    gender: 'Nam',
                    email: '',
                    tinh: null,
                    dob: new Date(2020, 9, 1),
                    phone: '',
                    huyen: null,
                    xa: null,
                    address: '',
                    nguonden: 0,
                    status: 0,
                    hotenPhuhuynh: '',
                    masoPhuhuynh: '',
                    ngaysinhPhuhuynh: new Date(1990, 9, 1),
                    gioitinhPhuhuynh: 'Nam',
                    vaitroPhuhuynh: '',
                    emailPhuhuynh: '',
                    dienthoai1Phuhuynh: '',
                    diachiPhuhuynh: '',
                    trangthaiPhuhuynh: 1,
                });
                this.formField('email').enable();
                this.formField('emailPhuhuynh').enable();
                this.formControl.openFormAdd();
            },
            OPEN_FORM_UPDATE: (data: HocSinhExtend): void => {
                // this.getHuyenXaUpdate(data.tinh, data.huyen);
                const dataconvert = { ...data };
                this.loadPhuhuynh(data.phuhuynh_id).subscribe({
                    next: (res) => {
                        dataconvert.hotenPhuhuynh = res[0].full_name;
                        dataconvert.masoPhuhuynh = res[0].code;
                        dataconvert.ngaysinhPhuhuynh = res[0].dob;
                        dataconvert.gioitinhPhuhuynh = res[0].gender;
                        dataconvert.vaitroPhuhuynh = res[0].vaitro;
                        dataconvert.emailPhuhuynh = res[0].email;
                        dataconvert.diachiPhuhuynh = res[0].address;
                        dataconvert.dienthoai1Phuhuynh = res[0].dienthoai1;

                        dataconvert.trangthaiPhuhuynh = res[0].trangthai;
                        this.formControl.formGroup.reset({
                            idPhuhuynh: data.phuhuynh_id,
                            code: dataconvert.code,
                            full_name: dataconvert.full_name,
                            avatar: dataconvert.avatar,
                            english_name: dataconvert.english_name,
                            donvi_id: this.donviId,
                            gender: dataconvert.gender,
                            tinh: dataconvert.tinh,
                            dob: new Date(dataconvert.dob),
                            huyen: dataconvert.huyen,
                            xa: dataconvert.xa,
                            address: dataconvert.address,
                            nguonden: dataconvert.nguonden,
                            status: dataconvert.status,
                            hotenPhuhuynh: dataconvert.hotenPhuhuynh,
                            masoPhuhuynh: dataconvert.masoPhuhuynh,
                            ngaysinhPhuhuynh: new Date(
                                dataconvert.ngaysinhPhuhuynh
                            ),
                            regular_class: dataconvert.regular_class,
                            regular_school: dataconvert.regular_school,
                            phone: dataconvert.phone,
                            email: dataconvert.email,
                            gioitinhPhuhuynh: dataconvert.gioitinhPhuhuynh,
                            vaitroPhuhuynh: dataconvert.vaitroPhuhuynh,
                            emailPhuhuynh: dataconvert.emailPhuhuynh,
                            dienthoai1Phuhuynh: dataconvert.dienthoai1Phuhuynh,
                            diachiPhuhuynh: dataconvert.diachiPhuhuynh,
                            trangthaiPhuhuynh: dataconvert.trangthaiPhuhuynh,
                        });
                    },
                });
                this.formField('emailPhuhuynh').disable();
                this.formField('email').disable();
                this.formControl.openFormEdit(data);
            },
            DELETE_SINGLE_ROW: ({ id }: HocSinhExtend): void => {
                this.requestDeletingData([id]);
            },
            DELETE_SELECTED_ROWS: (): void => {
                const ids: number[] = this.dataTable
                    .getSelectedData()
                    .map(({ id }: HocSinhExtend): number => id);
                if (ids.length) {
                    this.requestDeletingData(ids);
                }
            },
            SUBMIT_FORM: (): void => {
                if (this.formControl.canSubmit) {
                    const infoPhuHuynh: Partial<PhuHuynh> = {
                        full_name: this.formField('hotenPhuhuynh').value,
                        name: this.getName(this.formField('hotenPhuhuynh').value),
                        code: this.formField('masoPhuhuynh').value,
                        dob: this.helper.formatSQLDate(
                            this.formField('ngaysinhPhuhuynh').value
                        ),
                        email: this.formField('emailPhuhuynh').value,
                        dienthoai1: this.formField('dienthoai1Phuhuynh').value,
                        gender: this.formField('gioitinhPhuhuynh').value,
                        address: this.formField('diachiPhuhuynh').value,
                        trangthai: this.formField('trangthaiPhuhuynh').value,
                        vaitro: this.formField('vaitroPhuhuynh').value
                    };
                    const requestPhuhuynh: Observable<any> = this.formControl
                        .isFormAdd
                        ? this.phuHuynhService.create(infoPhuHuynh)
                        : this.phuHuynhService.update(
                            this.formField('idPhuhuynh').value,
                            infoPhuHuynh
                        );
                    const message: string = this.formControl.isFormAdd
                        ? 'Thêm mới thành công'
                        : 'Cập nhật thành công';
                    const messageErorr: string = this.formControl.isFormAdd
                        ? 'Thêm mới không thành công'
                        : 'Cập nhật không thành công';
                    this.formControl.submit(requestPhuhuynh).subscribe({
                        next: (res): void => {
                            const info: Partial<HocSinhExtend> = {
                                code: this.formField('code').value,
                                full_name: this.formField('full_name').value,
                                avatar: this.formField('avatar').value,
                                phuhuynh_id: res,
                                english_name: this.formField('english_name').value,
                                name: this.getName(
                                    this.formField('full_name').value
                                ),
                                donvi_id: this.formField('donvi_id').value,
                                address: this.formField('address').value,
                                tinh: this.formField('tinh').value,
                                dob: this.helper.formatSQLDate(
                                    this.formField('dob').value
                                ),
                                regular_class:
                                    this.formField('regular_class').value,
                                regular_school:
                                    this.formField('regular_school').value,
                                phone: this.formField('phone').value,
                                email: this.formField('email').value,
                                // huyen: this.formField('huyen').value,
                                // xa: this.formField('xa').value,
                                gender: this.formField('gender').value,
                                nguonden: this.formField('nguonden').value,
                                status: this.formField('status').value,
                            };
                            const request: Observable<any> = this.formControl
                                .isFormAdd
                                ? this.service.create(info)
                                : this.service.update(
                                    this.formControl.object.id,
                                    info
                                );
                            request.subscribe({
                                next: () => {
                                    this.notification.toastSuccess(
                                        message,
                                        'Thông báo'
                                    );
                                    if (this.formControl.isFormAdd) {
                                        this.formControl.formGroup.reset({
                                            code: '',
                                            full_name: '',
                                            english_name: '',
                                            csdt_ids: 0,
                                            avatar: '',
                                            donvi_id: this.donviId,
                                            gender: 'Nam',
                                            email: '',
                                            tinh: null,
                                            dob: new Date(2020, 9, 1),
                                            phone: '',
                                            huyen: null,
                                            xa: null,
                                            address: '',
                                            nguonden: 0,
                                            status: 0,
                                            hotenPhuhuynh: '',
                                            masoPhuhuynh: '',
                                            ngaysinhPhuhuynh: new Date(1990, 9, 1),
                                            gioitinhPhuhuynh: 'Nam',
                                            vaitroPhuhuynh: '',
                                            emailPhuhuynh: '',
                                            dienthoai1Phuhuynh: '',
                                            diachiPhuhuynh: '',
                                            trangthaiPhuhuynh: 1,
                                        });
                                    } else {
                                        this.formControl.closeForm();
                                    }
                                },
                                error: () => {
                                    this.notification.toastError(
                                        messageErorr,
                                        'Thông báo'
                                    );
                                },
                            });
                        },
                        error: (): void => {
                            this.notification.toastError(messageErorr, 'Thông báo');
                        },
                    });
                }
            },
        };

    private eventObserver$: Subject<DataTableEvent<HocSinh>> = new Subject<
        DataTableEvent<HocSinh>
    >();

    private onDestroy$: Subject<string> = new Subject<string>();

    private _temp: { paged: number; resetPaginator: boolean } = {
        paged: 1,
        resetPaginator: true,
    };

    searchInfo: HocSinhSearchInfo = {
        search: '',
    };
    lopHocSreachInfo: LopHocSearchInfo = {
        search: '',
        namhoc: new Date().getFullYear(),
    };
    dataTable: IctuDataTable<HocSinh> = new IctuDataTable<HocSinh>();

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

    private observeUploading: Subject<void> = new Subject();

    constructor() {
        this.eventObserver$
            .asObservable()
            .pipe(takeUntil(this.onDestroy$))
            .subscribe(({ name, data }: DataTableEvent<HocSinhExtend>): void =>
                this.handelEvent[name](data)
            );
        this.openFileChooserObserver
            .pipe(takeUntilDestroyed(), debounceTime(500))
            .subscribe((category: FileUploadCategory): void => {
                this.handleFileChooser[category]();
            });
        //import
        this.observeImportHocSinh$
            .asObservable()
            .pipe(
                takeUntil(this.onDestroy$),
                map((): MatDialog => this.notification.matDialog),
                debounceTime(250)
            )
            .subscribe((importDialog: MatDialog): void => {
                this.importDialogDirty.set(false);
                const dialogRef: MatDialogRef<boolean> = importDialog.open(
                    this.importTemplate(),
                    {
                        disableClose: true,
                        maxHeight: '100vh',
                        minHeight: '100vh',
                        minWidth: '100vw',
                        maxWidth: '100vw',
                    }
                );
                dialogRef.afterClosed().subscribe((dirty: boolean): void => {
                    if (dirty) {
                        this._doReload();
                    }
                });
                this.importDialogRef = dialogRef;
            });

        this.observeOpenFileSelector
            .asObservable()
            .pipe(takeUntil(this.onDestroy$), debounceTime(250))
            .subscribe((): void => {
                const inputElement: HTMLInputElement = Object.assign(
                    document.createElement<'input'>('input'),
                    {
                        type: 'file',
                        accept: '.xlsx',
                        multiple: false,
                    }
                );

                inputElement.oncancel = (): void => {
                    setTimeout((): void => inputElement.remove(), 1000);
                };

                inputElement.onchange = (): void => {
                    this.onInputFile(inputElement.files);
                    setTimeout((): void => inputElement.remove(), 1000);
                };

                inputElement.click();
            });
    }

    private formField(path: keyof HocSinhExtend): AbstractControl {
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
                    (): IctuDeletingAnimationControl<HocSinh> =>
                        new IctuDeletingAnimationControl(ids, this.service)
                ),
                switchMap(
                    (
                        deleteController: IctuDeletingAnimationControl<HocSinh>
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

    loadPhuhuynh(id_phuphuynh: number): Observable<PhuHuynh[]> {
        const queryParams: IctuQueryParams = {
            limit: 1,
            paged: 1,
        };
        const conditions: IctuConditionParam[] = [
            {
                conditionName: 'id',
                condition: IctuQueryCondition.equal,
                value: id_phuphuynh.toString(),
            },
        ];
        return this.phuHuynhService.query(conditions, queryParams).pipe(
            map((res) => {
                return res.data;
            })
        );
    }
    private preload() {
        this.lophocService
            .load(this.lopHocSreachInfo, this.donviId, 0, {
                limit: -1,
                paged: 1,
            })
            .pipe(
                map((res) => {
                    this.optionsLopHoc = res.data;
                    return this.optionsLopHoc;
                })
            );
    }

    loadData(paged: number = 1, resetPaginator: boolean = true): void {
        this.state.set('loading');
        this._temp = { paged, resetPaginator };
        this.tinhDropdownField.load();
        this.bacDaoTaoDropdownField.load();
        this.cosodaotaoDropdownField.load();
        forkJoin<
            [
                IctuDropdownOption<number>[],
                IctuDropdownOption<number>[],
                IctuDropdownOption<number>[],
                DtoObject<HocSinh[]>
            ]
        >([
            this.tinhDropdownField.load(),
            this.bacDaoTaoDropdownField.load(),
            this.cosodaotaoDropdownField.load(),
            this.service.load(this.searchInfo, this.donviId, {
                limit: this.dataTable.paginator.rows(),
                paged,
            }),
        ])
            .pipe(
                map(
                    ([_, __, ___, res]: [
                        IctuDropdownOption<number>[],
                        IctuDropdownOption<number>[],
                        IctuDropdownOption<number>[],
                        DtoObject<HocSinh[]>
                    ]): HocSinh[] => {
                        if (resetPaginator) {
                            return this.dataTable.paginator.setupPaginator(
                                res
                            );
                        } else {
                            this.dataTable.paginator.changePage(
                                paged
                            );
                            return res.data;
                        }
                    }
                )
            )
            .subscribe({
                next: (data: HocSinh[]): void => {
                    this.dataTable.fillData(data);
                    this.loadHuyen(true);
                    this.loadXa(true);
                    this.state.set('success');
                },
                error: (): void => {
                    this.state.set('error');
                },
            });
    }

    deleteRow(data: HocSinh): void {
        this.eventObserver$.next({ name: 'DELETE_SINGLE_ROW', data });
    }

    deleteSelectedRows(): void {
        this.eventObserver$.next({ name: 'DELETE_SELECTED_ROWS', data: null });
    }

    editRow(data: HocSinh): void {
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

    loadHuyen(isload: boolean) {
        if (isload == false) {
            this.tinh_id = this.formField('tinh').value;
            this.locationsService
                .loadHuyen(this.tinh_id)
                .subscribe((response) => {
                    this.optionHuyen = response.data.map((huyen) => ({
                        label: huyen.name,
                        value: huyen.id,
                    }));
                });
        } else {
            this.locationsService
                .loadAllhuyenxa(
                    'districts',
                    this.getIds(this.dataTable.data(), true)
                )
                .subscribe((response) => {
                    this.optionHuyenLoad = response.data.map((huyen) => ({
                        label: huyen.name,
                        value: huyen.id,
                    }));
                });
        }
    }

    loadXa(isload: boolean) {
        if (isload == false) {
            this.huyen_id = this.formField('huyen').value;
            this.locationsService
                .loadXa(this.huyen_id)
                .subscribe((response) => {
                    this.optionXa = response.data.map((xa) => ({
                        label: xa.name,
                        value: xa.id,
                    }));
                });
        } else {
            this.locationsService
                .loadAllhuyenxa(
                    'wards',
                    this.getIds(this.dataTable.data(), false)
                )
                .subscribe((response) => {
                    this.optionXaLoad = response.data.map((xa) => ({
                        label: xa.name,
                        value: xa.id,
                    }));
                });
        }
    }

    getName(fullName: string): string {
        const parts = fullName.trim().split(/\s+/);
        return parts.length ? parts[parts.length - 1] : '';
    }

    getIds(list: any[], isHuyen: boolean) {
        if (isHuyen) {
            return Array.from(new Set(list.map((item) => item.huyen))).join(
                ','
            );
        } else {
            return Array.from(new Set(list.map((item) => item.xa))).join(',');
        }
    }

    joinDiachi(tinh: number, huyen: number, xa: number, diachi: string) {
        let tinh1 = this.tinhDropdownField?.options()
            ? this.tinhDropdownField
                .options()
                .find((item) => item.value === tinh)?.label ||
            'Chưa nhập tỉnh'
            : 'Chưa nhập tỉnh';

        let huyen1 = this.optionHuyenLoad
            ? this.optionHuyenLoad.find((item) => item.value === huyen)
                ?.label || 'Chưa nhập huyện'
            : 'Chưa nhập huyện';

        let xa1 = this.optionXaLoad
            ? this.optionXaLoad.find((item) => item.value === xa)?.label ||
            'Chưa nhập xã'
            : 'Chưa nhập xã';

        return `${tinh1} - ${huyen1} - ${xa1} - ${diachi}`;
    }

    getHuyenXaUpdate(parent_idTinh: number, parent_idHuyen: number) {
        this.locationsService.loadHuyen(parent_idTinh).subscribe((response) => {
            this.optionHuyen = response.data.map((huyen) => ({
                label: huyen.name,
                value: huyen.id,
            }));
        });

        this.locationsService.loadXa(parent_idHuyen).subscribe((response) => {
            this.optionXa = response.data.map((xa) => ({
                label: xa.name,
                value: xa.id,
            }));
        });
    }

    //import
    openImportingFromFile(): void {
        this.closeImportingFromFile(false);
        this.importPanel.disableLoading();
        this.observeImportHocSinh$.next('create');
    }

    closeImportingFromFile(dirty: boolean): void {
        if (this.importDialogRef) {
            this.importDialogRef.close(dirty);
        }
    }

    downloadFileImportSample(): void {
        this.notification.downloadLocalFile(
            'files/samples/import-HocSinh.xlsx',
            'dacms-file-mau-import-hoc-sinh'
        );
    }

    private _doReload(): void {
        this.loadData(this._temp.paged, this._temp.resetPaginator);
    }

    onInputFile(files: FileList): void {
        if (files.length) {
            // Chú ý thời gian đọc file có thể lâu hơn với file có dung lượng lớn, nên để loading để người dùng nhận
            // biết hệ thống đang chạy
            this.importPanel.enableLoading('Xử lý file...');
            switch (true) {
                case !files[0].name.toLowerCase().endsWith('.xlsx'):
                    this.notification.toastError(
                        'Hệ thống chỉ chấm nhận file định dạng .xlsx',
                        'Lỗi định dạng File!'
                    );
                    this.importPanel.disableLoading();
                    break;
                case files[0].size >= _10MB:
                    this.notification.toastError(
                        'Hệ thống chỉ hỗ trợ file có dung lượng từ 10Mb trở xuống',
                        'File dung lượng quá lớn!'
                    );
                    this.importPanel.disableLoading();
                    break;
                default:
                    readXlsxFile(files[0]).then((rows: Row[]): void => {
                        this.setMode('import');
                        const dataFromRow1 = [];

                        for (let i = 1; i < rows.length; i++) {
                            const row = rows[i];
                            if (!row[0]) break;
                            dataFromRow1.push(row);
                        }

                        const _listImport: HSImport[] = this.validateImportData(
                            dataFromRow1.map(
                                (data, index: number): HSImport => {
                                    const info: HSImport = {
                                        id: index,
                                        donvi_id: this.donviId,
                                        tenphuhuynh: data[1] ?? '',
                                        user_id: 0,
                                        sale_id: 0,
                                        masophuhuynh: data[2] ?? 0,
                                        ngaysinhphuhuynh:
                                            this.helper.formatSQLDate(
                                                isNaN(
                                                    new Date(data[3]).getTime()
                                                )
                                                    ? new Date()
                                                    : new Date(data[3])
                                            ),
                                        emailphuhuynh: data[4] ?? '',
                                        dienthoai1: data[5] ?? '',
                                        gioitinhphuhuynh: data[6] ?? '',
                                        email:
                                            data[7] ??
                                            `${this.helper.formatSQLDate(
                                                isNaN(
                                                    new Date(data[11]).getTime()
                                                )
                                                    ? new Date()
                                                    : new Date(data[11])
                                            )}@ams.com`,
                                        full_name: data[8] ?? '',
                                        name: data[8]
                                            ? this.getName(data[8])
                                            : '',
                                        code: data[9],
                                        english_name: data[10],
                                        dob:
                                            this.helper.formatSQLDate(
                                                new Date(data[11])
                                            ) ?? '',
                                        gender: data[12] ?? '',
                                        avata: '',
                                        address: data[12] ?? '',
                                        trangthai: 1,
                                        state: 'prepare',
                                        errorMessage: '',
                                        referenceObjectId: 0,
                                        checked: false,
                                        hocsinh_id: 0,
                                    };
                                    return info;
                                }
                            )
                        );
                        this.importPanel.disableLoading();
                        this.closeImportingFromFile(this.importDialogDirty());
                        this.listImport.set(_listImport);
                        console.log(_listImport);

                        if (
                            _listImport.filter(
                                (item) => item.state == 'invalid'
                            ).length
                        ) {
                            this.updateStateDialog();
                        }
                    });
                    break;
            }
        }
    }
    private validateImportData(listImport: HSImport[]): HSImport[] {
        if (listImport && listImport.length) {
            return listImport
                .filter((item) => item.state != 'uploaded')
                .map((i) => {
                    i.state = 'prepare';
                    return i;
                })
                .map((info: HSImport): HSImport => {
                    if (
                        info.tenphuhuynh != '' ||
                        info.gioitinhphuhuynh != '' ||
                        info.masophuhuynh != '' ||
                        info.dienthoai1 != '' ||
                        info.emailphuhuynh != ''
                    ) {
                        const emailPH = info.emailphuhuynh?.trim() || '';
                        const phonePH =
                            info.dienthoai1?.toString().trim() || '';
                        const isEmailPHValid =
                            /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(
                                emailPH
                            );
                        const isPhonePHValid = /^\d{6,}$/.test(phonePH);
                        if (!emailPH) {
                            info.state = 'invalid';
                            info.errorMessage = 'Thiếu Email phụ huynh';
                        } else if (!phonePH) {
                            info.state = 'invalid';
                            info.errorMessage = 'Thiếu SĐT phụ huynh';
                        } else if (!isEmailPHValid) {
                            info.state = 'invalid';
                            info.errorMessage =
                                'Email phụ huynh không đúng định dạng';
                        } else if (!isPhonePHValid) {
                            info.state = 'invalid';
                            info.errorMessage =
                                'SĐT phụ huynh không đúng định dạng';
                        } else {
                            const dupEmailPH = listImport.find(
                                (i) =>
                                    i.id !== info.id &&
                                    i.state === 'prepare' &&
                                    i.emailphuhuynh?.trim().toLowerCase() ===
                                    emailPH.toLowerCase()
                            );
                            const dupPhonePH = listImport.find(
                                (i) =>
                                    i.id !== info.id &&
                                    i.state === 'prepare' &&
                                    i.dienthoai1
                                        ?.toString()
                                        .trim()
                                        .toLowerCase() === phonePH.toLowerCase()
                            );
                            if (dupEmailPH) {
                                info.state = 'invalid';
                                info.errorMessage = 'Trùng Email phụ huynh';
                                info.referenceObjectId = dupEmailPH.id;
                            } else if (dupPhonePH) {
                                info.state = 'invalid';
                                info.errorMessage = 'Trùng SĐT phụ huynh';
                                info.referenceObjectId = dupPhonePH.id;
                            } else {
                                info.errorMessage = '';
                                info.state = 'prepare';
                            }
                        }
                    }
                    const emailHS = info.email?.trim() || '';
                    const isEmailHSValid =
                        /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(
                            emailHS
                        );

                    if (!isEmailHSValid) {
                        info.state = 'invalid';
                        info.errorMessage =
                            'Email học sinh không đúng định dạng';
                    } else {
                        const dupEmailHS = listImport.find(
                            (i) =>
                                i.id !== info.id &&
                                i.state === 'prepare' &&
                                i.email?.trim().toLowerCase() ===
                                emailHS.toLowerCase()
                        );

                        if (dupEmailHS) {
                            info.state = 'invalid';
                            info.errorMessage = 'Trùng Email học sinh';
                            info.referenceObjectId = dupEmailHS.id;
                        } else {
                            info.errorMessage = '';
                            info.state = 'prepare';
                        }
                    }

                    return info;
                });
        } else {
            return [];
        }
    }
    getIDDropDown(option: IctuDropdownOption<number>[], label: string) {
        const tam = option.find((item) =>
            item.label.toLowerCase().includes(label.toLowerCase())
        );

        return tam ? tam.value : 0;
    }

    selectRow(item: HSImport): void {
        this.listImport.update((data: HSImport[]): HSImport[] => {
            return [
                ...data.map((row: HSImport): HSImport => {
                    if (row.id === item.id) {
                        row.checked = !item.checked;
                    }
                    return row;
                }),
            ];
        });
    }

    checkAll(checked: boolean) {
        this.listImport.update((data: HSImport[]): HSImport[] => {
            return [
                ...data.map((row: HSImport): HSImport => {
                    if (
                        -1 !==
                        this.importFiltered().findIndex((o) => o.id === row.id)
                    ) {
                        row.checked = checked;
                    }
                    return row;
                }),
            ];
        });
    }

    checkErrorHocSinh(): boolean {
        if (this.listImport().find((item) => item.state == 'invalid')) {
            return false;
        } else {
            return true;
        }
    }

    // checkupdaloadedSuccess(): boolean {
    //     if (this.listImport().find((item) => item.state != 'uploaded' && item.state != 'uploadedHSLH')) {
    //         return true;
    //     } else {
    //         return false;
    //     }
    // }
    checkUploadedHocSinh(): boolean {
        if (this.listImport().find((item) => item.state != 'uploaded')) {
            return true;
        } else {
            return false;
        }
    }

    deleteHocSinhImport(item: HSImport) {
        this.notification.confirmDelete(1).subscribe((result: boolean) => {
            if (result) {
                this.listImport.update((list: HSImport[]) => [
                    ...list.filter((i) => i.id !== item.id),
                ]);
            }
        });
    }
    deleteSelectedHocSinhImport() {
        this.notification
            .confirmDelete(
                this.importFiltered().filter((i) => i.checked).length
            )
            .subscribe((result: boolean) => {
                if (result) {
                    const ids: number[] = this.importFiltered()
                        .filter((i) => i.checked)
                        .map((o) => o.id);
                    this.listImport.update((list: HSImport[]) => [
                        ...list.filter((i) => !ids.includes(i.id)),
                    ]);
                }
            });
    }

    private _uploader(
        requests: HSImport[],
        animation: UploadAnimation,
        step: number
    ): void {
        const index: number = requests.findIndex((r) => r.state === 'waitting');
        const stopSign: Observable<any> = merge(
            this.observeUploading,
            this.onDestroy$
        );
        if (index !== -1) {
            const infoPhuHuynh: any = {
                hoten: requests[index].tenphuhuynh,
                maso: requests[index].masophuhuynh,
                ngaysinh: requests[index].ngaysinhphuhuynh,
                email: requests[index].email,
                dienthoai1: requests[index].dienthoai1,
                gioitinh: requests[index].gioitinhphuhuynh,
                diachi: requests[index].address,
                trangthai: 1,
            };
            this.phuHuynhService
                .create(infoPhuHuynh)
                .pipe(takeUntil(stopSign))
                .subscribe({
                    next: (res1): void => {
                        const info: any = {
                            donvi_id: this.donviId,
                            user_id: 0,
                            sale_id: 0,
                            phuhuynh_id: res1,
                            full_name: requests[index].full_name,
                            name: requests[index].name,
                            code: requests[index].code,
                            english_name: requests[index].english_name,
                            dob: requests[index].dob,
                            gender: requests[index].gender,
                            avatar: '',
                            address: requests[index].address,
                        };
                        this.service
                            .create(info)
                            .pipe(takeUntil(stopSign))
                            .subscribe({
                                next: (res): void => {
                                    requests[index].state = 'uploaded';
                                    requests[index].hocsinh_id = res;
                                    animation.percent = Math.min(
                                        Math.round((animation.percent += step)),
                                        100
                                    );
                                    animation.observer.next(animation.percent);
                                    this._uploader(requests, animation, step);
                                },
                                error: (err): void => {
                                    requests[index].state = 'uploadingFail';
                                    requests[index].errorMessage =
                                        err.error.message;
                                    this._uploader(requests, animation, step);
                                },
                            });
                    },
                    error: (err): void => {
                        requests[index].state = 'uploadingFail';
                        this._uploader(requests, animation, step);
                    },
                });
        } else {
            animation.observer.complete();
        }
        stopSign.pipe(take(1)).subscribe(() => animation.observer.complete());
    }
    private _uploaderHSLH(
        requests: HSImport[],
        animation: UploadAnimation,
        step: number
    ): void {
        const index: number = requests.findIndex((r) => r.state === 'uploaded');
        const stopSign: Observable<any> = merge(
            this.observeUploading,
            this.onDestroy$
        );
        if (index !== -1) {
            const info: Partial<any> = {
                donvi_id: this.donviId,
                class_id: this.class_idSelected,
                status: 1,
                hocsinh_id: requests[index].hocsinh_id,
            };
            this.hocSinhLopHocService
                .create(info)
                .pipe(takeUntil(stopSign))
                .subscribe({
                    next: (res): void => {
                        requests[index].state = 'uploadedHSLH';
                        animation.percent = Math.min(
                            Math.round((animation.percent += step)),
                            100
                        );
                        animation.observer.next(animation.percent);
                        this._uploaderHSLH(requests, animation, step);
                    },
                    error: (err): void => {
                        requests[index].state = 'uploadingFailHSLH';
                        this._uploaderHSLH(requests, animation, step);
                    },
                });
        } else {
            animation.observer.complete();
        }
        stopSign.pipe(take(1)).subscribe(() => animation.observer.complete());
    }

    addHocSinhLopHoc() {
        if (this.class_idSelected) {
            this.isUploadHSLH = true;
            const requests = this.listImport().filter((item) =>
                ['uploaded'].includes(item.state)
            );
            if (requests.length) {
                this.importPanel.enableLoading('Thêm học sinh vào lớp...');
                this.closeImportingFromFile(this.importDialogDirty());
                // clear previous uploading
                this.observeUploading.next();
                const step: number = 100 / requests.length;
                const animation: UploadAnimation = {
                    title: 'Uploading...',
                    percent: 0,
                    observer: new BehaviorSubject<number>(0),
                };
                this.notification.progressBarWithPercent(
                    animation.observer,
                    animation.title
                );
                this._uploaderHSLH(requests, animation, step);
            } else {
                this.notification.toastSuccess(
                    'Tất cả học sinh đã được thêm vào lớp'
                );
            }
        } else {
            this.notification.toastError('Bạn chưa chọn lớp');
        }
    }
    submitImport() {
        const requests = this.listImport()
            .filter((item) =>
                ['uploadingFail', 'waitting', 'prepare'].includes(item.state)
            )
            .map((t) => {
                t.state = 'waitting';
                return t;
            });
        if (requests.length) {
            this.importPanel.enableLoading('Xử lý file...');
            this.closeImportingFromFile(this.importDialogDirty());
            // clear previous uploading
            this.observeUploading.next();
            const step: number = 100 / requests.length;
            const animation: UploadAnimation = {
                title: 'Uploading...',
                percent: 0,
                observer: new BehaviorSubject<number>(0),
            };
            this.notification.progressBarWithPercent(
                animation.observer,
                animation.title
            );
            this._uploader(requests, animation, step);
        } else {
            this.notification.toastError('Không có học sinh nào cần upload');
        }
        this.loadData(1, true);
    }

    updateStateDialog(): void {
        this.visibleDialog = !this.visibleDialog;
    }

    openListImportDuplicate() {
        this.isListImportDuplicate.update((isChecked: boolean) => !isChecked);
    }

    openFileSelector(): void {
        this.observeOpenFileSelector.next('open');
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

    protected getControl<K extends keyof StudentFieldName>(
        key: K
    ): FormControl<StudentFieldName[K]> {
        return this._formGroup.get(key as string) as FormControl<
            StudentFieldName[K]
        >;
    }

    protected callFileChooser(category: FileUploadCategory): void {
        this.openFileChooserObserver.next(category);
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
        attachments: (): void => { },
        thumbnail: function (): void {
            throw new Error('Function not implemented.');
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

    private async resizeCourseThumbnail(file: File): Promise<any> {
        try {
            const result: ImageResizerDto = await firstValueFrom(
                this.imageResize(file, { aspectRatio: 16 / 16, format: 'png' })
            );
            if (!result.error) {
                this.formControl.state.set('LOADING');
                const fileName: string = `student-avatar-${Date.now()}.png`;
                const fileLogo: File = Helper.blobToFile(
                    result.data.blob,
                    fileName
                );
                this.fileService
                    .upload(fileLogo, { public: 1, tag: 'student-avatar' })
                    .pipe(takeUntil(this.destroy$))
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

    ngOnDestroy(): void {
        this.onDestroy$.next('OnDestroy');
        this.onDestroy$.complete();
    }
}
