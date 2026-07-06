import {
    Component,
    computed,
    inject,
    input,
    InputSignal,
    model,
    ModelSignal,
    OnDestroy,
    OnInit,
    QueryList,
    Signal,
    signal,
    TemplateRef,
    viewChild,
    ViewChildren,
    WritableSignal,
} from '@angular/core';
import { Drawer } from 'primeng/drawer';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { InputText } from 'primeng/inputtext';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import {
    DataTableEvent,
    DataTableEventName,
    IctuDataTable,
} from '@models/datatable';
import {
    BehaviorSubject,
    forkJoin,
    map,
    merge,
    Observable,
    of,
    Subject,
    takeUntil,
} from 'rxjs';
import { debounceTime, filter, switchMap, take, tap } from 'rxjs/operators';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import { DatePickerModule } from 'primeng/datepicker';
import { HocSinh } from '@models/hoc-sinh';
import { HocSinhSearchInfo, HocSinhService } from '@services/hoc-sinh.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { HocSinhLopHoc } from '@models/hoc-sinh-lop-hoc';
import { HocSinhLopHocService } from '@services/hoc-sinh-lop-hoc.service';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { ClassPlanningRole } from '../../class-planning.component';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import {
    PhuHuynhSearchInfo,
    PhuHuynhService,
} from '@services/phu-huynh.service';
import { PhuHuynh } from '@models/phu-huynh';
import { MatTooltip } from '@angular/material/tooltip';
import { _10MB } from '@utilities/syscats';
import readXlsxFile, { Row } from 'read-excel-file';
import { HelperClass } from '@utilities/helper';
import { DragAndDropDirective } from '@app/theme/directives/drag-and-drop.directive';
import { SelectModule } from 'primeng/select';
import { ClassesService } from '@app/services/classes.service';

import { Dialog } from 'primeng/dialog';
import { ClassExtend } from '@app/models/class';
import {
    ClassGroupSearchInfo,
    ClassGroupService,
} from '@app/services/class-groups.service';
import { ClassGroup } from '@app/models/class-group';
import { CollapsePanelComponent } from '@app/theme/components/collapse-panel.component';
import { Course } from '@app/models/course';
import { CoursesService } from '@app/services/course.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EmployeesService } from '@app/services/employees.service';
import { Employee } from '@app/models/employee';
type ImportPanelLayout = 'SELECT_FILE' | 'PROCESS';

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

type TmHSViewMode = 'DF' | 'group';

type HocSinhImportRowState =
    | 'INVALID'
    | 'VALID'
    | 'UPLOADING'
    | 'UPLOADING_FAIL'
    | 'REJECTED'
    | 'UPLOADED';

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
    tenphuhuynh: string;
    masohocsinh: string;
    masophuhuynh: string;
    ngaysinhphuhuynh: string;
    gioitinhphuhuynh: string;
    emailphuhuynh: string;
    dienthoaihocsinh: number;
    user_id: number;
    sale_id: number;
    hotenhocsinh: string;
    tenhocsinh: string;
    english_name: string;
    ngaysinhhocsinh: string;
    gioitinhhocsinh: string;
    emailhocsinh: string;
    dienthoaiphuhuynh: string;
    lophoc_chinhquy: string;
    truonghoc_chinhquy: string;
    diachi: string;
    trangthai: number;
    state: HSImportState;
    errorMessage: string;
    referenceObjectId: number;
    checked: boolean;
}

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
        | 'gender'
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

type statepage = 'load' | 'error' | 'success';

interface addStudentOrTA {
    classGroup_id: number;
    index_parent: number;
    classGroup: ClassGroup;
    listTA: Employee[];
}

@Component({
    selector: 'class-planning-students',
    standalone: true,
    imports: [
        InputText,
        LoadingProgressComponent,
        MatButton,
        MatCheckbox,
        ReactiveFormsModule,
        FormsModule,
        DatePickerModule,
        CommonModule,
        CheckboxModule,
        DialogModule,
        MatButton,
        IctuPaginatorComponent,
        TooltipModule,
        MatTooltip,
        DragAndDropDirective,
        SelectModule,
        Dialog,
        CollapsePanelComponent,
        MatMenuModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        NgOptimizedImage,
    ],
    templateUrl: './class-planning-students.component.html',
    styleUrl: './class-planning-students.component.css',
})
export class ClassPlanningStudentsComponent
    implements OnInit, OnDestroy, IctuBasePermission {
    class_id: InputSignal<number> = input.required<number>();
    classObject: ModelSignal<ClassExtend> = model.required<ClassExtend>();
    role: InputSignal<ClassPlanningRole> = input.required<ClassPlanningRole>();
    importDialogRef: MatDialogRef<boolean>;
    private observeImportHocSinh$: Subject<string> = new Subject<string>();
    importDialogDirty: WritableSignal<boolean> = signal<boolean>(false);
    readonly importTemplate: Signal<TemplateRef<any>> =
        viewChild<TemplateRef<any>>('importTemplate');
    private observeOpenFileSelector: Subject<string> = new Subject<string>();
    optionListTrangThai: IctuDropdownOption<number>[] = [
        { value: 0, label: 'Đã nghỉ' },
        { value: 1, label: 'Đang học' },
    ];
    optionGioiTinh: IctuDropdownOption<number>[] = [
        { value: 0, label: 'Nam' },
        { value: 1, label: 'Nữ' },
        { value: 2, label: 'Khác' },
    ];
    optionHuyen: IctuDropdownOption<number>[];
    optionHuyenLoad: IctuDropdownOption<number>[];
    optionXaLoad: IctuDropdownOption<number>[];
    optionXa: IctuDropdownOption<number>[];

    private phuHuynhservice: PhuHuynhService = inject(PhuHuynhService);
    private service: HocSinhService = inject(HocSinhService);
    private classStudentService: HocSinhLopHocService =
        inject(HocSinhLopHocService);
    private auth: AuthenticationService = inject(AuthenticationService);
    private notification: NotificationService = inject(NotificationService);
    private classService: ClassesService = inject(ClassesService);
    private cosodaotaoService: CoSoDaoTaoService = inject(CoSoDaoTaoService);
    private classGroupservice: ClassGroupService = inject(ClassGroupService);
    private coursesService: CoursesService = inject(CoursesService);
    private employeeService: EmployeesService = inject(EmployeesService);

    get donviId(): number {
        return this.auth.user.donvi_id;
    }

    get user_id(): number {
        return this.auth.user.id;
    }

    private helper = new HelperClass();

    protected visibleDialogClassGroup: boolean = false;
    protected visibleDialogClassGroupAddStudent: boolean = false;
    protected visibleDialogClassGroupTA: boolean = false;
    classGroupAddStudent: addStudentOrTA = {
        classGroup_id: 0,
        index_parent: -1,
        classGroup: null,
        listTA: [],
    };

    @ViewChildren('collapseMenu')
    collapsePanels!: QueryList<CollapsePanelComponent>;

    isListImportDuplicate: WritableSignal<boolean> = signal(false);

    readonly drawer: Signal<Drawer> = viewChild<Drawer>('pDrawer');

    private readonly listImport: WritableSignal<HSImport[]> = signal([]);

    readonly importFiltered: Signal<HSImport[]> = computed(() => {
        return this.isListImportDuplicate()
            ? this.listImport().filter((item) => item.state == 'invalid')
            : this.listImport();
    });

    readonly viewMode: WritableSignal<TmHSViewMode> =
        signal<TmHSViewMode>('DF');

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

    modeState: WritableSignal<Mode> = signal<Mode>('DF');

    dataHocSinh: WritableSignal<HocSinh> = signal<HocSinh>(null);

    teachingAssistants = [];

    listClassGroupView: any[] = [];

    setMode(mode: Mode, hocsinh?: HocSinh) {
        switch (mode) {
            case 'DF':
                this.modeState.set('DF');
                this.loadData(1, true);
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
    visibleDialog: boolean = false;
    visibleDialogPhuHuynh: boolean = false;
    statePage: statepage = 'load';
    ngaysinh: Date;
    recordsFiltered: number = 0;
    tinh_id: number = 0;
    huyen_id: number = 0;
    hocsinhSelected: HocSinhLopHoc;
    phuHuynhManager: PhuHuynh;
    listPhuHuynh: PhuHuynh[] = [];
    classGroup: ClassGroup[] = [];
    SLGroup: number = 0;
    listHSSearch: HocSinh[] = [];
    listHSselectedcheckbox: HocSinh[] = [];
    state: WritableSignal<AppState | 'unset_class_group'> =
        signal<AppState>('loading');
    course: Course;
    stateDialogPhuHuynh: WritableSignal<statepage> = signal<statepage>('load');
    isLoadInitDone: boolean = false;
    viewAllPlanesMode: boolean = false;
    classData: ClassExtend;
    private fb: FormBuilder = inject(FormBuilder);

    readonly importPanel: ImportPanel<HocSinhImportRow> = new ImportPanel(
        'SELECT_FILE'
    );

    private handelEvent: Record<
        DataTableEventName,
        (data: HocSinhLopHoc) => void
    > = {
            OPEN_FORM_ADD: () => { },
            OPEN_FORM_UPDATE: (data: HocSinhLopHoc): void => { },
            DELETE_SINGLE_ROW: ({ id }: HocSinhLopHoc): void => {
                this.requestAddData([id]);
            },
            DELETE_SELECTED_ROWS: (): void => {
                const ids: number[] = this.dataTable
                    .getSelectedData()
                    .map(({ id }: HocSinhLopHoc): number => id);
                if (ids.length) {
                    this.requestAddData(ids);
                }
            },
            SUBMIT_FORM: (): void => { },
        };

    private eventObserver$: Subject<DataTableEvent<HocSinhLopHoc>> =
        new Subject<DataTableEvent<HocSinhLopHoc>>();

    private onDestroy$: Subject<string> = new Subject<string>();

    private _temp: { paged: number; resetPaginator: boolean } = {
        paged: 1,
        resetPaginator: true,
    };

    private _tempAddHS: { paged: number; resetPaginator: boolean } = {
        paged: 1,
        resetPaginator: true,
    };

    searchInfo: HocSinhSearchInfo = {
        search: '',
    };

    searchInfoAddHS: HocSinhSearchInfo = {
        search: '',
    };

    searchInfoPhuhuynh: PhuHuynhSearchInfo = {
        search: '',
    };

    searchInfoClassGroup: ClassGroupSearchInfo = {
        class_id: 0,
        assistant_id: 0,
    };

    cosodaotaoDropdownField: IctuDropdownField = new IctuDropdownField(
        this.cosodaotaoService.loadOptions(this.donviId),
        'Chọn cơ sở đào tạo'
    );

    dataTable: IctuDataTable<HocSinhLopHoc> =
        new IctuDataTable<HocSinhLopHoc>();

    dataTableEx: HocSinhLopHoc[] = [];

    dataTableClassGroup: IctuDataTable<HocSinhLopHoc> =
        new IctuDataTable<HocSinhLopHoc>();

    dataTableAddHS: IctuDataTable<HocSinh> = new IctuDataTable<HocSinh>();

    permissionControl: Signal<IctuPermissionControl>;

    private observeUploading: Subject<void> = new Subject();

    constructor() {
        this.eventObserver$
            .asObservable()
            .pipe(takeUntil(this.onDestroy$))
            .subscribe(({ name, data }: DataTableEvent<HocSinhLopHoc>): void =>
                this.handelEvent[name](data)
            );
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

    ngOnInit(): void {
        this.permissionControl =
            this.role() == 'training_management'
                ? signal<IctuPermissionControl>(
                    new IctuPermissionControl(
                        this.auth.getUserPermission(
                            'training-management/classes'
                        )
                    )
                )
                : signal<IctuPermissionControl>(
                    new IctuPermissionControl(
                        this.auth.getUserPermission('teacher/students')
                    )
                );

        this.loadData(1, true);
    }

    private requestAddData(ids: number[]): void {
        this.notification
            .confirmDelete(ids.length)
            .pipe(
                filter((confirm: boolean): boolean => confirm),
                map(
                    (): IctuDeletingAnimationControl<HocSinhLopHoc> =>
                        new IctuDeletingAnimationControl(
                            ids,
                            this.classStudentService
                        )
                ),
                switchMap(
                    (
                        deleteController: IctuDeletingAnimationControl<HocSinhLopHoc>
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

    // preload(): Observable<ClassExtend> {
    //     this.state.set('loading');
    //     return this.classData
    //         ? of(this.classData)
    //         : this.classService
    //               .query(
    //                   [
    //                       {
    //                           conditionName: 'id',
    //                           value: this.class_id().toString(),
    //                           condition: IctuQueryCondition.equal,
    //                       },
    //                   ],
    //                   { with: 'course' }
    //               )
    //               .pipe(
    //                   map((res: DtoObject<ClassExtend[]>): ClassExtend => {
    //                       this.classData = res.data[0];
    //                       return this.classData;
    //                   })
    //               );
    // }

    loadData(paged: number = 1, resetPaginator: boolean = true): void {
        this.state.set('loading');
        this.isLoadInitDone = false;
        this.searchInfoClassGroup = {
            class_id: this.class_id(),
            assistant_id: 0,
        };
        this._temp = { paged, resetPaginator };
        let class_group_id: number;
        this.classGroupservice
            .load(this.searchInfoClassGroup, this.donviId, {
                limit: -1,
                paged: 1,
            })
            .pipe(
                map((res): ClassGroup[] => res.data),
                tap((data) => {
                    this.classGroup = data;
                    this.classGroup.push({
                        id: 0,
                        donvi_id: this.donviId,
                        class_id: this.class_id(),
                        assistant_ids: [],
                        name: 'Học sinh chưa phân nhóm',
                    } as ClassGroup);
                }),
                switchMap(() => {
                    if (
                        this.role() === 'teaching_assistant' ||
                        this.role() === 'teacher'
                    ) {
                        class_group_id =
                            this.classObject().course.type !== 'ON_SITE' &&
                                this.role() === 'teaching_assistant'
                                ? this.classGroup.find((item) =>
                                    item.assistant_ids.includes(this.user_id)
                                )?.id || -1
                                : 0;

                        return this.classStudentService.loadNoStop(
                            this.class_id(),
                            this.donviId,
                            { limit: -1, paged: 1 },
                            class_group_id
                        );
                    } else {
                        return this.classStudentService.load(
                            this.class_id(),
                            this.donviId,
                            { limit: -1, paged: 1 }
                        );
                    }
                })
            )
            .subscribe({
                next: (classStudents) => {
                    this.dataTable.fillData(classStudents.data);
                    this.dataTableEx = classStudents.data;
                    this.createListClassGroupView();
                    this.recordsFiltered = classStudents.recordsFiltered;
                    this.isLoadInitDone = true;
                    if (class_group_id == -1) {
                        this.state.set('unset_class_group');
                    } else {
                        this.state.set('success');
                    }
                },
                error: () => {
                    this.state.set('error');
                },
            });

        // forkJoin<[DtoObject<ClassGroup[]>, DtoObject<HocSinhLopHoc[]>]>([
        //     this.classGroupservice.load(
        //         this.searchInfoClassGroup,
        //         this.donviId,
        //         {
        //             limit: -1,
        //             paged: 1,
        //         }
        //     ),
        //     classStudent,
        // ])
        //     .pipe(
        //         map(
        //             ([classGroupRes, res]: [
        //                 DtoObject<ClassGroup[]>,
        //                 DtoObject<HocSinhLopHoc[]>
        //             ]): HocSinhLopHoc[] => {
        //                 this.classGroup = classGroupRes.data;
        //                 this.classGroup.push({
        //                     id: 0,
        //                     donvi_id: this.donviId,
        //                     class_id: this.class_id(),
        //                     assistant_ids: [],
        //                     name: 'Học sinh chưa phân nhóm',
        //                 } as ClassGroup);

        //                 this.recordsFiltered = res.recordsFiltered;
        //                 if (resetPaginator) {
        //                     return this.dataTable.paginator.setupPaginator(res);
        //                 } else {
        //                     this.dataTable.paginator.changePage(paged);
        //                     return res.data;
        //                 }
        //             }
        //         )
        //     )
        //     .subscribe({
        //         next: (data: HocSinhLopHoc[]): void => {
        //             this.dataTable.fillData(data);
        //             this.dataTableEx = data;
        //             this.createListClassGroupView();
        //             this.isLoadInitDone = true;
        //             this.state.set('success');
        //         },
        //         error: (): void => {
        //             this.state.set('error');
        //         },
        //     });
    }

    createListClassGroupView(): void {
        for (let i = 0; i < this.classGroup.length; i++) {
            const tam = this.dataTable
                .data()
                .filter(
                    (item) =>
                        item.class_group_id == this.classGroup[i].id &&
                        item.status != 0
                )
                .map((itemz) => ({
                    ...itemz,
                    isChecked: false,
                }));
            this.classGroup[i].listStudent = tam;
        }
    }

    deleteRow(data: HocSinhLopHoc): void {
        this.eventObserver$.next({ name: 'DELETE_SINGLE_ROW', data });
    }

    addSelectedRows(): void {
        this.eventObserver$.next({ name: 'DELETE_SELECTED_ROWS', data: null });
    }

    editRow(data: HocSinhLopHoc): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
    }

    reload(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.loadData(this._temp.paged, this._temp.resetPaginator);
    }

    reloadAddHS(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.loadAddHS(this._tempAddHS.paged, this._tempAddHS.resetPaginator);
    }

    addNewItem(): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_ADD', data: null });
    }

    submitForm(): void {
        this.eventObserver$.next({ name: 'SUBMIT_FORM', data: null });
    }

    onChangePage(paged: number): void {
        this.loadData(paged, false);
    }

    onChangePageAddHS(paged: number): void {
        this.loadAddHS(paged, false);
    }

    removeVietnameseTones(str: string): string {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase();
    }

    findStudentByName(keyword: string, list: HocSinhLopHoc[]): HocSinhLopHoc[] {
        if (!keyword) return list;
        const cleanKeyword = this.removeVietnameseTones(keyword);

        return list.filter((item) => {
            const name = this.removeVietnameseTones(
                item.hocsinh?.full_name ?? ''
            );
            return name.includes(cleanKeyword);
        });
    }

    onSearchData(): void {
        if (this.searchInfo.search != '' && this.searchInfo.search) {
            const result = this.findStudentByName(
                this.searchInfo.search,
                this.dataTableEx
            );
            this.dataTable.fillData(result);
        } else {
            this.dataTable.fillData(this.dataTableEx);
        }
    }

    onSearchAddHS(): void {
        this.loadAddHS(1, true);
    }

    openDialogAddHS() {
        this.visibleDialog = true;
        this.loadAddHS(1, true);
    }

    addHS() {
        if (this.listHSselectedcheckbox.length != 0) {
            this.statePage = 'load';
            const total_student =
                this.dataTable.data().length +
                this.listHSselectedcheckbox.length;
            const requests = this.listHSselectedcheckbox.map((item) => {
                const info: Partial<HocSinhLopHoc> = {
                    donvi_id: item.donvi_id,
                    class_id: this.class_id(),
                    status: 1,
                    hocsinh_id: item.id,
                };
                return this.classStudentService.create(info);
            });
            forkJoin(requests).subscribe({
                next: () => {
                    this.openOrCloseDialog();
                    this.loadData(1, true);
                    this.classService
                        .update(this.class_id(), {
                            total_student,
                        })
                        .subscribe({
                            next: () => {
                                this.visibleDialog = false;
                                this.loadData(1, true);
                                this.notification.toastSuccess(
                                    'Thêm thành công'
                                );
                                this.statePage = 'success';
                            },
                            error: (err) => {
                                this.notification.toastError(
                                    'Thêm không thành công'
                                );
                            },
                        });
                },
                error: (err) => {
                    this.notification.toastError('Thêm không thành công');
                },
            });

            this.listHSselectedcheckbox = [];
        }
    }

    loadAddHS(paged: number, resetPaginator: boolean) {
        this.statePage = 'load';
        this._tempAddHS = { paged, resetPaginator };
        const ids = this.dataTable.data().map((t) => t.hocsinh_id).join(',');
        this.service
            .load(this.searchInfoAddHS, this.donviId, {
                limit: this.dataTableAddHS.paginator.rows(),
                paged: paged,
                exclude: ids,
                exclude_by: 'id'
            })
            .pipe(
                map((res: DtoObject<HocSinh[]>): HocSinh[] => {
                    if (resetPaginator) {
                        return this.dataTableAddHS.paginator.setupPaginator(
                            res
                        );
                    } else {
                        this.dataTableAddHS.paginator.changePage(paged);
                        return res.data;
                    }
                })
            )
            .subscribe({
                next: (resHS) => {
                    const existingIds = this.dataTable
                        .data()
                        .map((item) => item.hocsinh_id);
                    const listHSSearchTam = resHS.filter(
                        (hs) => !existingIds.includes(hs.id)
                    );
                    this.dataTableAddHS.fillData(listHSSearchTam);
                    this.statePage = 'success';
                },
                error: () => {
                    this.statePage = 'error';
                },
            });
    }

    loadPhuHuynh(row: HocSinhLopHoc) {
        this.stateDialogPhuHuynh.set('load');
        this.phuHuynhservice
            .load(this.searchInfoPhuhuynh, row.hocsinh.phuhuynh_id ?? 0, 0, {
                limit: 1000,
                paged: 1,
            })
            .pipe(
                map((res) => {
                    this.phuHuynhManager = res.data[0];
                    return this.phuHuynhManager;
                })
            )
            .subscribe({
                next: () => {
                    if (this.phuHuynhManager) {
                        this.phuHuynhservice
                            .load(
                                this.searchInfoPhuhuynh,
                                0,
                                this.phuHuynhManager.id ?? 0,
                                {
                                    limit: 1000,
                                    paged: 1,
                                }
                            )
                            .pipe(
                                map(
                                    (
                                        res: DtoObject<PhuHuynh[]>
                                    ): PhuHuynh[] => {
                                        return res.data;
                                    }
                                )
                            )
                            .subscribe({
                                next: (data: PhuHuynh[]): void => {
                                    this.listPhuHuynh = data;
                                    this.listPhuHuynh.unshift(
                                        this.phuHuynhManager
                                    );
                                    this.stateDialogPhuHuynh.set('success');
                                },
                                error: (): void => {
                                    this.stateDialogPhuHuynh.set('error');
                                },
                            });
                    } else {
                        this.stateDialogPhuHuynh.set('success');
                    }
                },
                error: (): void => {
                    this.stateDialogPhuHuynh.set('error');
                },
            });
    }

    saveStatusStudent(event: any, id: number): void {
        const info: Partial<HocSinhLopHoc> = {
            status: event.value,
        };
        const request: Observable<any> = this.classStudentService.update(
            id,
            info
        );
        request.subscribe({
            next: (): void => {
                this.loadData(1, true);
            },
            error: (): void => {
                this.notification.toastError(
                    'Cập nhật không thành công',
                    'Thông báo'
                );
            },
        });
    }

    formatDate(date: Date): string {
        return date.toLocaleDateString('vi-VN');
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

    openOrCloseDialog(): void {
        this.visibleDialog = !this.visibleDialog;
    }

    private _doReload(): void {
        this.loadData(this._temp.paged, this._temp.resetPaginator);
    }

    onInputFile(files: FileList): void {
        if (files.length) {
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
                                        masohocsinh: data[1],
                                        hotenhocsinh: data[2] ?? '',
                                        tenhocsinh: data[2]
                                            ? this.getName(data[2])
                                            : '',
                                        english_name: data[3],
                                        gioitinhhocsinh: data[4] ?? '',
                                        ngaysinhhocsinh:
                                            this.helper.formatSQLDate(
                                                isNaN(
                                                    new Date(data[5]).getTime()
                                                )
                                                    ? new Date()
                                                    : new Date(data[5])
                                            ) ?? '',
                                        dienthoaihocsinh: data[6] ?? '',
                                        emailhocsinh:
                                            data[7] ??
                                            `${this.helper.formatSQLDate(
                                                isNaN(
                                                    new Date(data[5]).getTime()
                                                )
                                                    ? new Date()
                                                    : new Date(data[5])
                                            )}@ams.com`,
                                        lophoc_chinhquy: data[8] ?? '',
                                        truonghoc_chinhquy: data[9] ?? '',
                                        diachi: data[10] ?? '',
                                        masophuhuynh: data[11] ?? 0,
                                        tenphuhuynh: data[12] ?? '',
                                        ngaysinhphuhuynh:
                                            this.helper.formatSQLDate(
                                                isNaN(
                                                    new Date(data[13]).getTime()
                                                )
                                                    ? new Date()
                                                    : new Date(data[13])
                                            ),
                                        gioitinhphuhuynh: data[14] ?? '',
                                        dienthoaiphuhuynh: data[15] ?? '',
                                        emailphuhuynh: data[16] ?? '',
                                        donvi_id: this.donviId,
                                        user_id: 0,
                                        sale_id: 0,
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
                        this.listImport.set(this.filterImportData(_listImport));
                        if (
                            _listImport.filter(
                                (item) => item.state == 'invalid'
                            ).length
                        ) {
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
                        info.dienthoaiphuhuynh != '' ||
                        info.emailphuhuynh != ''
                    ) {
                        const emailPH = info.emailphuhuynh?.trim() || '';
                        const phonePH =
                            info.dienthoaiphuhuynh?.toString().trim() || '';
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
                                    i.dienthoaiphuhuynh
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
                    const emailHS = info.emailhocsinh?.trim() || '';
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
                                i.emailhocsinh?.trim().toLowerCase() ===
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

    private filterImportData(listImport: HSImport[]): HSImport[] {
        const hocsinhData: Pick<HocSinh, 'id' | 'full_name' | 'english_name' | 'dob' | 'gender' | 'avatar' | 'address' | 'phuhuynh_id' | 'code'>[] = this.dataTable
            .data()
            .map((item) => item.hocsinh);
        const masolist = hocsinhData.map((hs) =>
            hs.code.toString().trim().toLowerCase()
        );

        listImport.map((item) => {
            const maso = item.masohocsinh.toString().trim().toLowerCase();
            if (masolist.includes(maso)) {
                item.state = 'invalid';
                item.errorMessage = 'Học sinh đã có trong lớp';
                return item;
            }
            return item;
        });
        return listImport;
    }

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

    getName(fullName: string): string {
        const parts = fullName.trim().split(/\s+/);
        return parts.length ? parts[parts.length - 1] : '';
    }

    openFileSelector(): void {
        this.observeOpenFileSelector.next('open');
    }

    updateStateDialog(): void {
        this.visibleDialog = !this.visibleDialog;
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

    shortenEmailEnd(email: string): string {
        return email
            ? email.length > 15
                ? '...' + email.slice(-15)
                : email
            : '';
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

    ngOnDestroy(): void {
        this.onDestroy$.next('OnDestroy');
        this.onDestroy$.complete();
    }

    openListImportDuplicate() {
        this.isListImportDuplicate.update((isChecked: boolean) => !isChecked);
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
            const infoPhuHuynh: Partial<PhuHuynh> = {
                full_name: requests[index].tenphuhuynh,
                name: this.getName(requests[index].tenphuhuynh),
                code: requests[index].masophuhuynh,
                dob: requests[index].ngaysinhphuhuynh,
                email: requests[index].emailphuhuynh,
                dienthoai1: requests[index].dienthoaiphuhuynh,
                gender: requests[index].gioitinhphuhuynh,
                address: requests[index].diachi,
                trangthai: 1,
                donvi_id: this.donviId,
            };
            const info: Partial<HocSinh> = {
                donvi_id: this.donviId,
                sale_id: 0,
                phuhuynh_id: 0,
                full_name: requests[index].hotenhocsinh,
                name: requests[index].tenhocsinh,
                code: requests[index].masohocsinh,
                email: requests[index].emailhocsinh,
                english_name: requests[index].english_name,
                dob: requests[index].ngaysinhhocsinh,
                gender: requests[index].gioitinhhocsinh,
                regular_school: requests[index].truonghoc_chinhquy,
                regular_class: requests[index].lophoc_chinhquy,
                avatar: '',
                address: requests[index].diachi,
            };
            if (infoPhuHuynh.email != '') {
                this.phuHuynhservice
                    .create(infoPhuHuynh)
                    .pipe(takeUntil(stopSign))
                    .subscribe({
                        next: (res): void => {
                            info.phuhuynh_id = res;
                            this.service
                                .create(info)
                                .pipe(takeUntil(stopSign))
                                .subscribe({
                                    next: (res): void => {
                                        requests[index].state = 'uploaded';
                                        requests[index].hocsinh_id = res;
                                        animation.percent = Math.min(
                                            Math.round(
                                                (animation.percent += step)
                                            ),
                                            100
                                        );
                                        animation.observer.next(
                                            animation.percent
                                        );
                                        this._uploader(
                                            requests,
                                            animation,
                                            step
                                        );
                                    },
                                    error: (err): void => {
                                        requests[index].state = 'uploadingFail';
                                        requests[index].errorMessage =
                                            err.error.message;
                                        this._uploader(
                                            requests,
                                            animation,
                                            step
                                        );
                                    },
                                });
                        },
                        error: (err): void => {
                            requests[index].state = 'uploadingFail';
                            this._uploader(requests, animation, step);
                        },
                    });
            } else {
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
                            requests[index].errorMessage = err.error.message;
                            this._uploader(requests, animation, step);
                        },
                    });
            }
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
            const info: Partial<HocSinhLopHoc> = {
                donvi_id: this.donviId,
                class_id: this.class_id(),
                status: 1,
                hocsinh_id: requests[index].hocsinh_id,
            };
            this.classStudentService
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
        this.loadData(1, true);
        this.classService
            .update(this.class_id(), {
                total_student: this.dataTable.data().length,
            })
            .pipe(takeUntil(this.onDestroy$))
            .subscribe({
                error: () => {
                    this.notification.toastError(
                        'Lưu số lượng học sinh không thành công'
                    );
                },
            });
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
        // this.loadData(1, true);
    }

    checkErrorHocSinh(): boolean {
        if (this.listImport().find((item) => item.state == 'invalid')) {
            return false;
        } else {
            return true;
        }
    }

    checkUploadedHocSinh(): boolean {
        if (this.listImport().find((item) => item.state != 'uploaded')) {
            return true;
        } else {
            return false;
        }
    }

    opendialogPhuHuynh(row: HocSinhLopHoc): void {
        this.listPhuHuynh = [];
        this.loadPhuHuynh(row);
        this.hocsinhSelected = row;
        this.visibleDialogPhuHuynh = true;
    }

    createClassGroup(): void {
        if (
            this.classObject().assistants.length >=
            this.classGroup.length + this.SLGroup
        ) {
            this.state.set('loading');
            let requests = [];

            for (let i = 0; i < this.SLGroup; i++) {
                requests.push(
                    this.classGroupservice.create({
                        donvi_id: this.donviId,
                        class_id: this.class_id(),
                        name: `Nhóm ${i + 1}`,
                    })
                );
            }

            forkJoin(requests).subscribe({
                next: (results) => {
                    this.state.set('success');
                    this.notification.toastSuccess('Tạo nhóm thành công');
                    this.loadData(1, true);
                },
                error: (err) => {
                    this.state.set('success');
                    this.notification.toastError('Tạo nhóm không thành công');
                },
            });
        } else {
            this.notification.toastError(
                'Số lượng nhóm không được vượt quá số lượng trợ giảng'
            );
        }
    }
    protected btnSetViewMode(mode: TmHSViewMode): void {
        this.viewMode.set(mode);
    }

    isPanelOpen(index: number): boolean {
        const panel = this.collapsePanels.get(index);
        return !!panel?.panel?.isShown;
    }

    clickCheckedAll(indexParent: number, checked: boolean) {
        const listStudent = this.classGroup[indexParent].listStudent ?? [];
        for (let stu of listStudent) {
            stu.isChecked = checked;
        }
    }

    clickCheckedOne(indexParent: number, indexChild: number, checked: boolean) {
        const list = this.classGroup[indexParent].listStudent;
        if (list && list[indexChild]) {
            list[indexChild] = { ...list[indexChild], isChecked: checked };
        }
    }

    isAllChecked(indexParent: number): boolean {
        const listStudent = this.classGroup[indexParent].listStudent ?? [];
        return (
            listStudent.length > 0 && listStudent.every((stu) => stu.isChecked)
        );
    }

    hasAnyChecked(indexParent: number): boolean {
        const listStudent = this.classGroup[indexParent].listStudent ?? [];
        return listStudent.some((stu) => stu.isChecked);
    }

    partiallyCheckedStudent(indexParent: number): boolean {
        return (
            this.hasAnyChecked(indexParent) && !this.isAllChecked(indexParent)
        );
    }

    getAllHocSinhInGroup(classGroup_id: number): HocSinhLopHoc[] {
        return this.dataTable
            .data()
            .filter(
                (item) =>
                    item.class_group_id == classGroup_id && item.status != 0
            );
    }

    clickclassGroupAddStudent(index_parent: number): void {
        this.classGroupAddStudent.index_parent = index_parent;
        this.visibleDialogClassGroupAddStudent = true;
    }

    classGroupOptions(): any {
        return this.classGroup.filter((cg) => cg.id !== 0);
    }

    getCheckedStudentIdsByGroup(indexParent: number): number[] {
        const group = this.classGroup[indexParent];
        if (!group || !group.listStudent) {
            return [];
        }
        return group.listStudent
            .filter((stu) => stu.isChecked)
            .map((stu) => stu.id);
    }

    updateClassGroupAddStudent(): void {
        const ids = this.getCheckedStudentIdsByGroup(
            this.classGroupAddStudent.index_parent
        );
        this.state.set('loading');
        const requests = [];

        for (let i = 0; i < ids.length; i++) {
            requests.push(
                this.classStudentService.update(ids[i], {
                    class_group_id: this.classGroupAddStudent.classGroup_id,
                })
            );
        }

        forkJoin(requests).subscribe({
            next: (results) => {
                this.state.set('success');
                this.notification.toastSuccess(
                    'Thay đổi nhóm cho học sinh thành công'
                );
                this.loadData(1, true);
                this.visibleDialogClassGroupAddStudent = false;
            },
            error: (err) => {
                this.state.set('success');
                this.notification.toastError(
                    'Thay đổi nhóm cho học sinh không thành công'
                );
            },
        });
    }

    openOrCloseAllPanels(): void {
        if (this.viewAllPlanesMode) {
            this.viewAllPlanesMode = false;
            this.collapsePanels.forEach((panel) => {
                panel.panel?.hide();
            });
        } else {
            this.viewAllPlanesMode = true;
            this.collapsePanels.forEach((panel) => {
                panel.panel?.show();
            });
        }
    }

    openDialogClassGroupTA(classgroup: ClassGroup, index_parent: number): void {
        this.statePage = 'load';
        this.visibleDialogClassGroupTA = true;
        this.classGroupAddStudent.classGroup_id = classgroup.id;
        this.classGroupAddStudent.classGroup = classgroup;
        this.classGroupAddStudent.index_parent = index_parent;
        const tam = this.classObject().assistant_ids.join(',');
        let assistant_ids: number[] = this.classGroup.flatMap(
            (item) => item.assistant_ids
        );
        const queryParams: IctuQueryParams = {
            limit: -1,
            paged: 1,
            include: tam,
            include_by: 'user_id',
            select: 'id,dob,positions,email,full_name,address,phone,gender,code,linhvuc_id,nationality,user_id,photo,name',
        };

        const conditions: IctuConditionParam[] = [
            {
                conditionName: 'donvi_id',
                condition: IctuQueryCondition.equal,
                value: this.donviId.toString(10),
            },
        ];
        this.employeeService
            .query(conditions, queryParams)
            .pipe(map((res) => res.data))
            .subscribe({
                next: (res) => {
                    this.classGroupAddStudent.listTA = res.filter(
                        (item) => !assistant_ids.includes(item.user_id)
                    );
                    this.statePage = 'success';
                },
                error: (err) => {
                    this.statePage = 'error';
                },
            });
    }

    addClassGroupTA(user: Employee, isDel: boolean): void {
        this.statePage = 'load';
        let assistant_ids =
            this.classGroupAddStudent.classGroup.assistant_ids ?? [];
        if (isDel) {
            assistant_ids = assistant_ids.filter((id) => id !== user.user_id);
        } else {
            assistant_ids = [...assistant_ids, user.user_id];
        }

        const toastSuccess = isDel
            ? 'Xóa trợ giảng thành công'
            : 'Thêm trợ giảng thành công';
        const toastEror = isDel
            ? 'Xóa trợ giảng không thành công'
            : 'Thêm trợ giảng không thành công';
        this.classGroupservice
            .update(this.classGroupAddStudent.classGroup_id, {
                assistant_ids: assistant_ids,
            })
            .subscribe({
                next: () => {
                    this.classGroup[
                        this.classGroupAddStudent.index_parent
                    ].assistants = isDel
                            ? (
                                this.classGroup[
                                    this.classGroupAddStudent.index_parent
                                ].assistants ?? []
                            ).filter((emp) => emp.id !== user.id)
                            : [
                                ...(this.classGroup[
                                    this.classGroupAddStudent.index_parent
                                ].assistants ?? []),
                                user,
                            ];
                    if (isDel) {
                        this.classGroupAddStudent.listTA.push(user);
                    } else {
                        this.classGroupAddStudent.listTA =
                            this.classGroupAddStudent.listTA.filter(
                                (item) => item.user_id != user.user_id
                            );
                    }

                    this.statePage = 'success';
                    this.notification.toastSuccess(toastSuccess);
                },
                error: (err) => {
                    this.statePage = 'success';
                    this.notification.toastError(toastEror);
                },
            });
    }
}