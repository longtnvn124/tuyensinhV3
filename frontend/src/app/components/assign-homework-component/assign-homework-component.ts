import {
    Component,
    effect,
    inject,
    input,
    InputSignal,
    OnDestroy,
    OnInit,
    Signal,
    signal,
    viewChild,
    WritableSignal,
} from '@angular/core';
import { AppState } from '@app/models/app-state';
import { AuthenticationService } from '@app/services/authentication.service';
import {
    debounceTime,
    filter,
    forkJoin,
    map,
    Observable,
    of,
    Subject,
    switchMap,
    takeUntil,
} from 'rxjs';
import { LoadingProgressComponent } from '@app/theme/components/loading-progress/loading-progress.component';
import {
    Editor,
    NgxEditorComponent,
    NgxEditorMenuComponent,
    Toolbar,
} from 'ngx-editor';
import {
    CourseLessonTest,
    CourseLessonTestType,
    optionRequiredCourseLessonTest,
    optionStatusCourseLesson,
    optionTypeCourseLessonTest,
} from '@app/models/course-lesson-test';
import {
    DataTableEvent,
    DataTableEventName,
    IctuDataTable2,
} from '@app/models/datatable';
import { IctuFormControl2 } from '@app/models/ictu-form-control';
import {
    AbstractControl,
    FormBuilder,
    FormControl,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { NotificationService } from '@app/services/notification.service';
import { IctuDeletingAnimationControl } from '@app/models/ictu-deleting-animation-control';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { IctuDropdownOption } from '@app/models/ictu-dropdown-option';
import { MatProgressBar } from '@angular/material/progress-bar';
import {
    FILE_EXTENSIONS,
    FileExtensionSupported,
    getFileExtension,
    IctuBasicFile,
} from '@app/models/file';
import { FileIconPipe } from '@app/pipes/file-icon.pipe';
import { SafeHtmlPipe } from '@app/pipes/safe-html.pipe';
import { FormatBytesPipe } from '@app/pipes/format-bytes.pipe';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CourseAttachment } from '@app/models/course';
import { IctuFileUploaderDialogResponse } from '@app/theme/components/ictu-file-uploader/ictu-file-uploader.component';
import { formatBytes, Helper, HelperClass } from '@app/utilities/helper';
import { _1Gb } from '@app/utilities/syscats';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@app/models/dto';
import {
    ClassesAssignment,
    ClassesAssignmentExtend,
} from '@app/models/classes-assignment';
import {
    ClassesAssignmentService,
} from '@app/services/classes-assignment.service';
import { DialogModule } from 'primeng/dialog';
import { DatePicker } from 'primeng/datepicker';
import { MatMenuModule } from '@angular/material/menu';
import { HocSinhLopHoc } from '@app/models/hoc-sinh-lop-hoc';
import { HocSinhLopHocService } from '@app/services/hoc-sinh-lop-hoc.service';
import { CheckboxModule } from 'primeng/checkbox';
import { Drawer } from 'primeng/drawer';
import { MatCheckbox } from '@angular/material/checkbox';
import { ClassSessionService } from '@app/services/class-session.service';
import { ClassSessionRelative } from '@app/models/class-session';
import { DiemDanhService } from '@app/services/diem-danh.service';
import { DiemDanh } from '@app/models/diem-danh';

type EditCourseFormName = 'documents';

interface RemoveFormItemEvent {
    formName: EditCourseFormName;
    index: number;
}
// interface ClassesAssignmentExtend extends ClassesAssignment {
//     category: string;
// }

type ViewModeType = 'default' | 'sample';

type TypeAssign = 'default' | 'additional' | 'updateDefault';

type Mode = 'default' | 'score';

@Component({
    selector: 'app-assign-homework-component',
    imports: [
        LoadingProgressComponent,
        NgxEditorComponent,
        NgxEditorMenuComponent,
        Select,
        ReactiveFormsModule,
        InputText,
        MatButton,
        FormsModule,
        MatProgressBar,
        FileIconPipe,
        SafeHtmlPipe,
        FormatBytesPipe,
        CommonModule,
        TooltipModule,
        DialogModule,
        DatePicker,
        MatMenuModule,
        MatButtonModule,
        CheckboxModule,
        Drawer,
        MatCheckbox,
    ],
    templateUrl: './assign-homework-component.html',
    styleUrl: './assign-homework-component.css',
})
export class AssignHomeworkComponent implements OnInit, OnDestroy {
    class_id: InputSignal<number> = input.required<number>();

    course_lesson_id: InputSignal<number> = input.required<number>();

    class_session_id: InputSignal<number> = input.required<number>();

    canChange: InputSignal<boolean> = input.required<boolean>();

    private auth: AuthenticationService = inject(AuthenticationService);

    get donviId(): number {
        return this.auth.user.donvi_id;
    }

    public typeAssign: WritableSignal<TypeAssign> =
        signal<TypeAssign>('default');

    public state: WritableSignal<AppState> = signal<AppState>('loading');

    private diemdanhService: DiemDanhService = inject(DiemDanhService);

    public toolbar = [
        ['bold', 'italic', 'underline'],
        ['heading', 'blockquote', 'code', 'ordered_list', 'bullet_list'],
        ['link'],
        ['text_color', 'background_color'],
        ['align_left', 'align_center', 'align_right', 'align_justify'],
    ] as Toolbar;

    modeState: WritableSignal<Mode> = signal<Mode>('default');

    classes_assignments_id: number = 0;

    setMode(mode: Mode, classes_assignments_id?: number) {
        switch (mode) {
            case 'default':
                this.modeState.set('default');
                break;
            case 'score':
                this.modeState.set('score');
                this.classes_assignments_id = classes_assignments_id;
                break;
        }
    }

    onModeChange(newMode: Mode) {
        this.modeState.set(newMode);
    }

    public editor: Editor;

    public visibleDialogClassStudent: boolean = false;

    private courseLessonTest: CourseLessonTest[] = [];

    private helper = new HelperClass();

    private fb: FormBuilder = inject(FormBuilder);

    protected deletingFormItemIndex: WritableSignal<number> = signal(-1);

    private removeFormItemObserver: Subject<RemoveFormItemEvent> =
        new Subject<RemoveFormItemEvent>();

    private fileChooserObserver: Subject<void> = new Subject<void>();

    protected readonly optionListType: IctuDropdownOption<CourseLessonTestType>[] =
        optionTypeCourseLessonTest;

    protected readonly optionListRequired: IctuDropdownOption<number>[] =
        optionRequiredCourseLessonTest;

    protected readonly optionListStatus: IctuDropdownOption<number>[] =
        optionStatusCourseLesson;

    protected readonly optionListCategory: IctuDropdownOption<string>[] = [
        { value: 'default', label: 'Bài mẫu' },
        { value: 'additional', label: 'Bài bổ sung' },
    ];

    private eventObserver$: Subject<DataTableEvent<ClassesAssignment>> =
        new Subject<DataTableEvent<ClassesAssignment>>();

    private onDestroy$: Subject<string> = new Subject<string>();

    private destroy$: Subject<void> = new Subject<void>();

    private previewFileObserver$: Subject<IctuBasicFile> =
        new Subject<IctuBasicFile>();

    private service: ClassesAssignmentService = inject(
        ClassesAssignmentService
    );

    private classSessionservice: ClassSessionService = inject(ClassSessionService);

    private serviceHSLH: HocSinhLopHocService = inject(HocSinhLopHocService);

    private notification: NotificationService = inject(NotificationService);

    protected tableAssignDefault: CourseLessonTest[] = [];

    protected dataTableAssignView: IctuDataTable2<CourseLessonTest> =
        new IctuDataTable2<CourseLessonTest>();

    protected dataTableAssignAdditional: IctuDataTable2<ClassesAssignmentExtend> =
        new IctuDataTable2<ClassesAssignmentExtend>();

    public dataTableClassStudent: IctuDataTable2<HocSinhLopHoc> =
        new IctuDataTable2<HocSinhLopHoc>();

    public listDiemDanh: DiemDanh[] = [];

    public listAllClassStudentSelect: WritableSignal<HocSinhLopHoc[]> = signal<
        HocSinhLopHoc[]
    >([]);

    public listAllClassStudentUnSelect: WritableSignal<HocSinhLopHoc[]> =
        signal<HocSinhLopHoc[]>([]);

    readonly drawer: Signal<Drawer> = viewChild<Drawer>('pDrawer');

    readonly viewMode: WritableSignal<ViewModeType> =
        signal<ViewModeType>('default');

    formControl: IctuFormControl2<ClassesAssignment> =
        new IctuFormControl2<ClassesAssignment>({
            dropdownFields: [],
            formGroup: this.fb.group({
                id: [0],
                donvi_id: [this.donviId],
                course_lesson_id: [0, [Validators.required]],
                course_lesson_test_id: [0],
                class_session_id: [0],
                class_id: [0, [Validators.required]],
                student_ids: [[], [Validators.required]],
                title: [
                    '',
                    [
                        Validators.required,
                        Validators.minLength(2),
                        Validators.maxLength(255),
                    ],
                ],
                type: ['', [Validators.required]],
                files: [[]],
                content: [
                    '',
                    [
                        Validators.required,
                        Validators.minLength(2),
                        Validators.maxLength(255),
                    ],
                ],
                time_start: ['', [Validators.required]],
                time_end: [''],
                config: [''],
                time: [0],
                bank_id: [0],
            }),
            objectName: 'bài tập',
            drawer: this.drawer,
        });

    constructor() {
        this.removeFormItemObserver
            .pipe(takeUntilDestroyed(), debounceTime(500))
            .subscribe(({ formName, index }: RemoveFormItemEvent): void => {
                switch (formName) {
                    case 'documents':
                        const _value: CourseAttachment[] = Helper.cloneObject(
                            this.getControl('files').value ?? []
                        );
                        this.getControl('files').setValue(
                            _value.filter(
                                (_: CourseAttachment, idx: number): boolean =>
                                    idx !== index
                            ),
                            { emitEvent: true }
                        );
                        this.getControl('files').markAsTouched();
                        break;
                }
                this.deletingFormItemIndex.set(-1);
            });
        this.eventObserver$
            .asObservable()
            .pipe(takeUntil(this.onDestroy$))
            .subscribe(
                ({
                    name,
                    data,
                }: DataTableEvent<ClassesAssignmentExtend>): void =>
                    this.handelEvent[name](data)
            );
        this.previewFileObserver$
            .pipe(debounceTime(500), takeUntilDestroyed())
            .subscribe((file: IctuBasicFile): void => {
                this.notification.previewFile({ info: [file] });
            });

        this.fileChooserObserver
            .pipe(debounceTime(500), takeUntilDestroyed())
            .subscribe((): void => {
                this.openFileChooserOnDocumentTab();
            });
    }

    private formField(path: keyof ClassesAssignmentExtend): AbstractControl {
        return this.formControl.formGroup.get(path);
    }
    protected btnSetViewMode(mode: ViewModeType): void {
        this.viewMode.set(mode);
    }

    private handelEvent: Record<
        DataTableEventName,
        (data: ClassesAssignmentExtend) => void
    > = {
            OPEN_FORM_ADD: (): void => {
                this.formControl.formGroup.reset({
                    id: 0,
                    donvi_id: this.donviId,
                    course_lesson_id: this.course_lesson_id(),
                    course_lesson_test_id: 0,
                    class_session_id: this.class_session_id(),
                    class_id: this.class_id(),
                    student_ids: [],
                    title: '',
                    type: 'TU_LUAN',
                    files: [],
                    content: '',
                    time_start: new Date(),
                    time_end: '',
                    config: '',
                    time: 0,
                    bank_id: 0,
                });
                this.setAllListClassStudentTestUnSelect();
                this.formControl.openFormAdd();
            },
            OPEN_FORM_UPDATE: (data: ClassesAssignmentExtend): void => {
                this.formControl.formGroup.reset({
                    id: data.id,
                    donvi_id: data.donvi_id,
                    class_id: data.class_id,
                    student_ids: data.student_ids,
                    title: data.title,
                    content: data.content,
                    time_start: new Date(data.time_start),
                    time_end: data.time_end ? new Date(data.time_end) : '',
                    course_lesson_test_id: data.course_lesson_test_id,
                    course_lesson_id: data.course_lesson_id,
                    class_session_id: data.class_session_id,
                    type: data.type,
                    bank_id: data.bank_id,
                    config: data.config,
                    files: data.files,
                    time: data.time,
                });
                this.setListClassStudentTestSelect();
                this.formControl.openFormEdit(data);
            },
            DELETE_SINGLE_ROW: ({ id }: ClassesAssignmentExtend): void => {
                this.requestDeletingData([id]);
            },
            DELETE_SELECTED_ROWS: (): void => {
                const ids: number[] = this.dataTableAssignAdditional
                    .getSelectedData()
                    .map(({ id }: ClassesAssignmentExtend): number => id);
                if (ids.length) {
                    this.requestDeletingData(ids);
                }
            },
            SUBMIT_FORM: (): void => {
                if (
                    this.formControl.canSubmit ||
                    this.formFilledAndValidStudent_ids
                ) {
                    const info: Partial<ClassesAssignmentExtend> = {
                        donvi_id: this.formField('donvi_id').value,
                        class_id: this.formField('class_id').value,
                        student_ids: this.formField('student_ids').value,
                        title: this.formField('title').value,
                        content: this.formField('content').value,
                        time_start: this.helper.formatSQLDateTime(
                            this.formField('time_start').value
                        ),
                        time_end:
                            this.formField('time_end').value != ''
                                ? this.helper.formatSQLDateTime(
                                    this.formField('time_end').value
                                )
                                : null,
                        course_lesson_test_id: this.formField(
                            'course_lesson_test_id'
                        ).value,
                        course_lesson_id: this.formField('course_lesson_id').value,
                        class_session_id: this.formField('class_session_id').value,
                        type: this.formField('type').value,
                        bank_id: this.formField('bank_id').value,
                        config: this.formField('config').value,
                        files: this.formField('files').value,
                        time: this.formField('time').value,
                    };
                    const message: string = this.formControl.isFormAdd
                        ? 'Giao bài tập thành công'
                        : 'Cập nhật thành công';
                    const messageError: string = this.formControl.isFormAdd
                        ? 'Giao bài không tập thành công'
                        : 'Cập nhật không thành công';
                    if (this.typeAssign() != 'default') {
                        const request: Observable<any> = this.formControl.isFormAdd
                            ? this.service.create(info)
                            : this.service.update(this.formControl.object.id, info);
                        this.formControl.submit(request).subscribe({
                            next: (): void => {
                                this.notification.toastSuccess(
                                    message,
                                    'Thông báo'
                                );
                                if (this.formControl.isFormAdd) {
                                    this.formControl.formGroup.reset({
                                        id: 0,
                                        donvi_id: this.donviId,
                                        course_lesson_id: 0,
                                        course_lesson_test_id: 0,
                                        class_id: 0,
                                        student_ids: [],
                                        title: '',
                                        type: '',
                                        files: [],
                                        content: '',
                                        time_start: new Date(),
                                        time_end: '',
                                        config: '',
                                        time: 0,
                                        bank_id: 0,
                                    });
                                } else {
                                    this.formControl.closeForm();
                                    this.loadCourseLessonTestAdditional();
                                }
                            },
                            error: (): void => {
                                this.notification.toastError(
                                    messageError,
                                    'Thông báo'
                                );
                            },
                        });
                    } else {
                        const requests = this.dataTableAssignView
                            .data()
                            .map((item) => {
                                const newInfo = {
                                    ...info,
                                    course_lesson_test_id: item.id,
                                };
                                return this.service.create(newInfo);
                            });
                        this.state.set('loading');
                        forkJoin(requests).subscribe({
                            next: () => {
                                this.notification.toastSuccess(
                                    message,
                                    'Thông báo'
                                );
                                this.formControl.closeForm();
                                this.loadCourseLessonTestAdditional();
                                this.state.set('success');
                            },
                            error() {
                                this.notification.toastError(
                                    messageError,
                                    'Thông báo'
                                );
                                this.loadCourseLessonTestAdditional();
                                this.state.set('success');
                            },
                        });
                    }
                }
            },
        };

    private requestDeletingData(ids: number[]): void {
        this.notification
            .confirmDelete(ids.length)
            .pipe(
                filter((confirm: boolean): boolean => confirm),
                map(
                    (): IctuDeletingAnimationControl<ClassesAssignment> =>
                        new IctuDeletingAnimationControl(ids, this.service)
                ),
                switchMap(
                    (
                        deleteController: IctuDeletingAnimationControl<ClassesAssignment>
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

                    this.loadCourseLessonTestAdditional();
                },
                error: (): void => {
                    this.notification.toastError('Xóa thất bại');
                },
            });
    }

    private effectRef = effect(() => {
        const classId = this.class_id();
        const sessionId = this.course_lesson_id();
        if (classId && sessionId) {
            this.firstload().subscribe({
                next: (res) => {
                    this.loadCourseLessonTestAdditional();
                },
                error(err) {
                    this.state.set('error');
                },
            });
        }
    });

    ngOnInit(): void {
        this.editor = new Editor();
        this.firstload().subscribe({
            next: (res) => {
                this.loadCourseLessonTestAdditional();
            },
            error(err) {
                this.state.set('error');
            },
        });
    }

    // preload(): Observable<CourseLessonTest[]> {
    //     this.state.set('loading');
    //     return this.courseLessonTest.length != 0
    //         ? of(this.courseLessonTest)
    //         : this.classesservice
    //               .query(
    //                   [
    //                       {
    //                           conditionName: 'id',
    //                           value: this.class_id().toString(),
    //                           condition: IctuQueryCondition.equal,
    //                       },
    //                   ],
    //                   {
    //                       with: 'course_lesson_tests',
    //                   }
    //               )
    //               .pipe(
    //                   map(
    //                       (
    //                           res: DtoObject<ClassRelative[]>
    //                       ): CourseLessonTest[] => {
    //                           this.courseLessonTest =
    //                               res.data[0].course_lesson_tests ?? [];
    //                           return res[0];
    //                       }
    //                   )
    //               );
    // }

    firstload(): Observable<CourseLessonTest[]> {
        this.state.set('loading');
        const conditions: IctuConditionParam[] = [
            {
                conditionName: 'donvi_id',
                value: this.auth.user.donvi_id.toString(10),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },
            {
                conditionName: 'id',
                value: this.class_session_id().toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },

        ];
        const queryParams: IctuQueryParams = {
            limit: -1,
            paged: 1,
            with: 'course_lesson_tests'
        };
        const classSession$ =
            // this.courseLessonTest.length !== 0
            //     ? of({
            //         data: [{ course_lesson_tests: this.courseLessonTest }],
            //     })
            //     : 
            this.classSessionservice
                .query(conditions, queryParams);
        const classStudent$ =
            // this.dataTableClassStudent.data().length !== 0
            //     ? of({
            //         data: this.dataTableClassStudent,
            //     })
            //     : 
            this.serviceHSLH.load(this.class_id(), this.donviId, {
                limit: -1,
                paged: 1,
            });

        const attendance$ = this.diemdanhService.load(this.class_session_id(), this.donviId, {
            limit: -1,
            paged: 1,
        });

        return forkJoin({
            classSession: classSession$,
            classStudent: classStudent$,
            attendance: attendance$
        }).pipe(
            map(
                ({
                    classSession,
                    classStudent,
                    attendance
                }: {
                    classSession: DtoObject<ClassSessionRelative[]>;
                    classStudent: DtoObject<HocSinhLopHoc[]>;
                    attendance: DtoObject<DiemDanh[]>;
                }): CourseLessonTest[] => {
                    this.courseLessonTest =
                        classSession.data?.[0]?.course_lesson_tests ?? [];
                    this.dataTableClassStudent.fillData(classStudent.data);
                    this.listDiemDanh = attendance.data;
                    return this.courseLessonTest;
                }
            )
        );
    }

    setCourseLessonTestOld(): void {
        const tam = this.dataTableAssignAdditional
            .data()
            .filter((item) => item.course_lesson_test_id != 0)
            .map((item) => item.course_lesson_test_id);
        const result = this.courseLessonTest.filter(
            (item) =>
                item.course_lesson_id == this.course_lesson_id() &&
                !tam.includes(item.id)
        );
        this.tableAssignDefault = result;
    }

    loadCourseLessonTestAdditional(): void {
        this.state.set('loading');
        this.service
            .load(this.class_session_id(), this.donviId, this.class_id())
            .pipe(
                map(
                    (
                        res: DtoObject<ClassesAssignment[]>
                    ): ClassesAssignment[] => {
                        return res.data;
                    }
                )
            )
            .subscribe({
                next: (data: ClassesAssignmentExtend[]) => {
                    this.dataTableAssignAdditional.fillData(data);
                    this.setCourseLessonTestOld();
                    this.state.set('success');
                },
                error: (err) => {
                    this.state.set('error');
                },
            });
    }

    deleteRow(data: ClassesAssignmentExtend): void {
        this.eventObserver$.next({ name: 'DELETE_SINGLE_ROW', data });
    }

    deleteSelectedRows(): void {
        this.eventObserver$.next({ name: 'DELETE_SELECTED_ROWS', data: null });
    }

    editRow(data: ClassesAssignmentExtend): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
    }

    reload(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.loadCourseLessonTestAdditional();
    }

    addNewItem(): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_ADD', data: null });
    }

    submitForm(): void {
        this.eventObserver$.next({ name: 'SUBMIT_FORM', data: null });
    }

    onDrawerHide(): void {
        if (this.formControl.submitted) {
            this.loadCourseLessonTestAdditional();
        }
    }

    public getControl<K extends keyof ClassesAssignment>(
        key: K
    ): FormControl<ClassesAssignment[K]> {
        return this.formControl.formGroup.get(key as string) as FormControl<
            ClassesAssignment[K]
        >;
    }

    protected btnRemoveFormItem(
        index: number,
        formName: EditCourseFormName
    ): void {
        this.deletingFormItemIndex.set(index);
        this.removeFormItemObserver.next({ index, formName });
    }

    protected btnPreviewFile(file: IctuBasicFile): void {
        this.previewFileObserver$.next(file);
    }

    protected btnCallFileChooser(): void {
        this.fileChooserObserver.next();
    }

    private openFileChooserOnDocumentTab(): void {
        const panel: HTMLInputElement = Object.assign<
            HTMLInputElement,
            Pick<HTMLInputElement, 'type' | 'accept' | 'multiple'>
        >(document.createElement('input'), {
            type: 'file',
            accept: FILE_EXTENSIONS.map(
                (ext: FileExtensionSupported): string => `.${ext}`
            ).join(', '),
            multiple: false,
        });
        panel.onchange = (): void => {
            if (panel.files.length) {
                this.preUploadFileOnDocumentTab(panel.files.item(0));
            }
            setTimeout((): void => panel.remove(), 1000);
        };
        panel.click();
    }

    private preUploadFileOnDocumentTab(file: File): void {
        const ext: FileExtensionSupported | string = getFileExtension(file);
        switch (true) {
            case !FILE_EXTENSIONS.includes(<FileExtensionSupported>ext):
                this.notification.toastError(
                    'Định dạng file chưa được hỗ trợ - ' + ext
                );
                break;
            case file.size > _1Gb:
                this.notification.toastError(
                    'Dung lượng file quá lớn - ' + formatBytes(file.size, 2)
                );
                break;
            default:
                this.notification
                    .uploadFile({
                        file,
                        fileAttributes: {
                            tag: 'course-attachments',
                            public: 0,
                        },
                    })
                    .pipe(takeUntil(this.destroy$))
                    .subscribe(
                        (response: IctuFileUploaderDialogResponse): void => {
                            if (response.success) {
                                const _newDocument: CourseAttachment = {
                                    location: 'local',
                                    title: '',
                                    link: '',
                                    file: {
                                        id: response.info.id,
                                        name: response.info.name,
                                        title: response.info.title,
                                        url: response.info.url,
                                        ext: response.info.ext,
                                        type: response.info.type,
                                        size: response.info.size,
                                        location: response.info.location,
                                    },
                                };
                                const _value: CourseAttachment[] =
                                    Helper.cloneObject(
                                        this.getControl('files').value ?? []
                                    );
                                _value.push(_newDocument);
                                this.getControl('files').setValue(_value, {
                                    emitEvent: true,
                                });
                                this.getControl('files').markAsTouched();
                            }
                        }
                    );
                break;
        }
    }

    setListClassStudentTestSelect(): void {
        this.dataTableClassStudent.data().map((item, index) => {
            if (this.formField('student_ids').value.includes(item.hocsinh_id)) {
                this.dataTableClassStudent.selectRow(true, index);
            }
        });
    }

    setAllListClassStudentTestUnSelect(): void {
        if (this.typeAssign() != 'additional') {
            const ids = this.listDiemDanh.filter((t) => t.status == 'PRESENT').map((e) => e.hocsinh_id);
            this.dataTableClassStudent.data().map((item, index) => {
                if (ids.includes(item.hocsinh_id)) {
                    this.dataTableClassStudent.selectRow(true, index);
                }
            });
            this.formField('student_ids').markAsTouched();
            this.updateListClassStudentTestSelect();
        } else {
            this.dataTableClassStudent.selectRow(false);
        }
    }

    updateListClassStudentTestSelect(): void {
        const result = this.dataTableClassStudent
            .data()
            .filter((item) => item._ictuDataTableRowChecked == true)
            .map((item) => item.hocsinh_id);
        this.formField('student_ids').setValue(result);
        this.formField('student_ids').markAsTouched();
        this.visibleDialogClassStudent = false;
    }

    getLengthClassStudent(is_all: boolean): number {
        if (is_all) {
            return this.dataTableClassStudent.data().length;
        } else {
            return this.dataTableClassStudent
                .data()
                .filter((item) => item._ictuDataTableRowChecked == true).length;
        }
    }

    public get formFilledAndValidStudent_ids(): boolean {
        return (
            this.formField('student_ids').touched &&
            this.formField('student_ids').valid
        );
    }

    settypeAssign(typeAssign: TypeAssign, item?: CourseLessonTest): void {
        switch (typeAssign) {
            case 'additional':
                this.typeAssign.set('additional');
                break;
            case 'default':
                this.typeAssign.set('default');
                this.dataTableAssignView.fillData(this.tableAssignDefault);
                break;
            case 'updateDefault':
                this.typeAssign.set('updateDefault');
                this.dataTableAssignView.fillData([item]);
                break;
        }
    }

    checkAssign(): boolean {
        let result: boolean = true;
        const courseLessonTestListID = this.tableAssignDefault.map((d) => d.id);
        const courseClassesAssignmentID = this.dataTableAssignAdditional
            .data()
            .map((item) => item.course_lesson_test_id);
        if (courseLessonTestListID.length != 0) {
            result = courseLessonTestListID.every((item) =>
                courseClassesAssignmentID.includes(item)
            );
        }
        return result;
    }

    ngOnDestroy(): void {
        this.onDestroy$.next('OnDestroy');
        this.effectRef?.destroy();
        this.onDestroy$.complete();
    }
}
