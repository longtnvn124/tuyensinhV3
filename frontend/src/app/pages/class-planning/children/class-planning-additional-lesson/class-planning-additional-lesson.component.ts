import {
    Component,
    ElementRef,
    inject,
    input,
    InputSignal,
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
import { AppState } from '@models/app-state';
import { DividerModule } from 'primeng/divider';
import { IctuDataTable } from '@models/datatable';
import { formatBytes, Helper, HelperClass } from '@utilities/helper';
import { DtoObject, IctuQueryCondition } from '@models/dto';
import {
    catchError,
    debounceTime,
    delay,
    filter,
    firstValueFrom,
    forkJoin,
    map,
    merge,
    Observable,
    of,
    Subject,
    switchMap,
    takeUntil,
} from 'rxjs';

import { AuthenticationService } from '@services/authentication.service';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DialogModule } from 'primeng/dialog';
import {
    AbstractControl,
    AsyncValidatorFn,
    FormBuilder,
    FormControl,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { NotificationService } from '@services/notification.service';
import {
    Editor,
    NgxEditorComponent,
    NgxEditorMenuComponent,
    toHTML,
    Toolbar,
} from 'ngx-editor';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { _10MB, _1Gb } from '@utilities/syscats';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ClassSessionContent } from '@models/class-session-content';
import { ClassSessionContentService } from '@services/class-session-content.service';
import { ClassSessionService } from '@services/class-session.service';
import { ClassSession, ClassSessionAdditional, ClassSessionRelative } from '@models/class-session';
import { CollapsePanelComponent } from '@app/theme/components/collapse-panel.component';
import { Course, CourseAttachment, LectureType } from '@app/models/course';
import { TabsModule } from 'primeng/tabs';
import { IctuFormControl2 } from '@app/models/ictu-form-control';
import { SplitterModule } from 'primeng/splitter';
import { CourseLesson } from '@app/models/course-lesson';
import {
    CourseLessonPlan,
    CourseLessonPlanContentItem,
    CourseLessonPlanContentPageItem,
} from '@app/models/course-lesson-plan';
import { TooltipModule } from 'primeng/tooltip';
import { Word, WordTypeSelection } from '@app/models/word';
import { Grammar } from '@app/models/grammar';
import { BacDaoTaoService } from '@app/services/bac-dao-tao.service';
import {
    IctuDropdownField,
    IctuDropdownOption,
} from '@app/models/ictu-dropdown-option';
import { WordsService } from '@app/services/word.service';
import { GrammarService } from '@app/services/grammar.service';
import { IctuFileService } from '@app/services/ictu-file.service';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { FILE_EXTENSIONS, FileExtensionSupported, getFileExtension, IctuBasicFile, ICTUStandardFile } from '@app/models/file';
import {
    IctuImageResizeComponent,
    ImageResizerConfig,
    ImageResizerDto,
} from '@app/components/ictu-image-resize/ictu-image-resize.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InputTextModule } from 'primeng/inputtext';
import { SafeHtmlPipe } from '@pipes/safe-html.pipe';
import { TextareaModule } from 'primeng/textarea';
import { IctuMediaLoaderDirective } from '@app/directives/ictu-media-loader.directive';
import { ViewDocument } from '@app/components/view-document/view-document';
import { tokenGetter } from '@app/app.config';
import { Class, ClassRelative } from '@app/models/class';
import { ClassesService } from '@app/services/classes.service';
import { IctuDropdownOptionMapPipe } from '@app/pipes/ictu-dropdown-option-map.pipe';
import { LoadingProgressComponent } from '@app/theme/components/loading-progress/loading-progress.component';
import { AssignHomeworkComponent } from "@app/components/assign-homework-component/assign-homework-component";
import { IctuFileUploaderDialogResponse } from '@app/theme/components/ictu-file-uploader/ictu-file-uploader.component';
import { MatProgressBar } from "@angular/material/progress-bar";
import { FileIconPipe } from '@app/pipes/file-icon.pipe';
import { FormatBytesPipe } from '@app/pipes/format-bytes.pipe';
import { NgScrollbar } from 'ngx-scrollbar';
import { ClassCurriculumLectureMediaVideoComponent } from "@app/components/class-curriculums/class-curriculum-lecture-media-video/class-curriculum-lecture-media-video.component";
import { ClassCurriculumLectureMediaAudioComponent } from "@app/components/class-curriculums/class-curriculum-lecture-media-audio/class-curriculum-lecture-media-audio.component";
import { ClassCurriculumLectureMediaPictureComponent } from "@app/components/class-curriculums/class-curriculum-lecture-media-picture/class-curriculum-lecture-media-picture.component";
import { ClassCurriculumLectureMediaDocumentComponent } from "@app/components/class-curriculums/class-curriculum-lecture-media-document/class-curriculum-lecture-media-document.component";
import { CourseLessonMediaDecodePipe } from '../class-planning-curriculum/children/class-planning-curriculum-lecture/course-lesson-media-decode.pipe';
import { EditCourseLessonStructureMediaComponent } from '@app/pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/edit-course-lesson-structure-media.component';
type additionalMode = 'all' | 'assign';

interface CourseLessonPlanContentItemExtend extends CourseLessonPlanContentItem {
    wordLECTURE?: Word[];
    grammarLecture?: Grammar[];
    isViewUpdated: boolean;
    isViewOriginal: boolean;
}


interface ClassSessionContentExtend extends ClassSessionContent {
    content_media: string;
}

interface lesson {
    idClassSession: number;
    indexLesson: number;
    indexContentLesson: number;
    oderingLesson: number;
    classSession: ClassSession;
    lectureLesson: CourseLessonPlanContentItemExtend[];
    lectureLessonUpdate: CourseLessonPlanContentItemExtend[];
    indexLectureLessonUpdate: number;
    isUpdatelectureLesson: boolean;
}


type WordFieldName = Pick<Word, 'thumbnail' | 'audio'>;
type FileUploadCategory = 'thumbnail' | 'audio';
type EditCourseFormName = 'documents';
interface RemoveFormItemEvent {
    formName: EditCourseFormName;
    index: number;
}
@Component({
    selector: 'app-class-planning-additional-lesson',
    imports: [
        DividerModule,
        MatButton,
        MatTooltipModule,
        DialogModule,
        FormsModule,
        MatMenuModule,
        NgxEditorComponent,
        NgxEditorMenuComponent,
        CommonModule,
        MatCheckboxModule,
        LoadingProgressComponent,
        TabsModule,
        SplitterModule,
        ReactiveFormsModule,
        TooltipModule,
        MultiSelectModule,
        SelectModule,
        IctuDropdownOptionMapPipe,
        InputTextModule,
        SafeHtmlPipe,
        CollapsePanelComponent,
        TextareaModule,
        IctuMediaLoaderDirective,
        ViewDocument,
        AssignHomeworkComponent,
        MatProgressBar,
        FileIconPipe,
        FormatBytesPipe,
        NgScrollbar,
        ClassCurriculumLectureMediaVideoComponent,
        ClassCurriculumLectureMediaAudioComponent,
        ClassCurriculumLectureMediaPictureComponent,
        ClassCurriculumLectureMediaDocumentComponent,
        EditCourseLessonStructureMediaComponent,
        CourseLessonMediaDecodePipe,
    ],
    templateUrl: './class-planning-additional-lesson.component.html',
    styleUrl: './class-planning-additional-lesson.component.css',
})
export class ClassPlanningAdditionalLessonComponent
    implements OnInit, OnDestroy {
    class_id: InputSignal<number> = input.required<number>();
    class_session_id: InputSignal<number> = input.required<number>();
    isBoSung: boolean = true;
    visibleDialogMedia: boolean = false;
    private destroy$: Subject<void> = new Subject<void>();
    private fb: FormBuilder = inject(FormBuilder);
    state: WritableSignal<AppState | 'unauthorized' | 'upload'> = signal<
        AppState | 'unauthorized' | 'upload'
    >('loading');
    private auth: AuthenticationService = inject(AuthenticationService);

    private notification: NotificationService = inject(NotificationService);

    importDialogRef: MatDialogRef<boolean>;

    importDialogDirty: WritableSignal<boolean> = signal<boolean>(false);
    readonly importTemplate: Signal<TemplateRef<any>> =
        viewChild<TemplateRef<any>>('importTemplate');

    @ViewChildren('collapseMenu1')
    collapsePanels1!: QueryList<CollapsePanelComponent>;

    @ViewChildren('lessonRef') lessonRef!: QueryList<ElementRef>;

    optionLoaiTu = WordTypeSelection;

    originalValueLesson!: Partial<lesson>;
    listClassSessionContent: ClassSessionContent[] = [];
    isPlayingIndex: number | null = null;
    currentAudio: HTMLAudioElement | null = null;

    get donviId(): number {
        return this.auth.user.donvi_id;
    }

    html = '';
    editors: { [key: number]: Editor } = {};
    editor: Editor;
    course: Course;
    listCourseLesson: Pick<CourseLesson, 'id' | 'course_id' | 'title' | 'ordering' | 'parent_id'>[] = [];
    // listCourseLessonUnset: CourseLesson[] = [];
    listCourseLessonPlan: CourseLessonPlan[] = [];
    headingLoad: string = 'Loading...';
    isAddWord: boolean = false;
    toolbar = [
        ['bold', 'italic', 'underline'],
        ['heading', 'blockquote', 'code', 'ordered_list', 'bullet_list'],
        ['link'],
        ['text_color', 'background_color'],
        ['align_left', 'align_center', 'align_right', 'align_justify'],
    ] as Toolbar;

    viewMode: WritableSignal<additionalMode> = signal<additionalMode>('all');

    btnSetViewMode(viewMode: additionalMode) {
        switch (viewMode) {
            case 'all':
                this.viewMode.set('all');
                break;
            case 'assign':
                this.viewMode.set('assign');
                break;
        }
    }

    thoiluongLesson: number = 0;

    structureLesson: CourseLessonPlanContentItem[] = [];

    soluongAddLesson: number;

    private getDefaultLesson(): lesson {
        return {
            indexLesson: -1,
            idClassSession: -1,
            indexContentLesson: -1,
            classSession: null,
            oderingLesson: null,
            lectureLesson: [],
            lectureLessonUpdate: [],
            indexLectureLessonUpdate: 0,
            isUpdatelectureLesson: false,
        };
    }

    valueLesson: lesson = this.getDefaultLesson();

    valueEditor: CourseLessonPlanContentItem[] = [];

    valueEditorContentTam: string = '';

    visibleDialogAddLesson: boolean = false;

    visibleDialogWord: boolean = false;

    listWordOld: Word[] = [];

    visibleDialog: boolean = false;

    form_document: CourseLessonPlanContentPageItem = {
        id_file: 0,
        start: 0,
        end: 0,
    };

    type_view: LectureType = 'LINK';

    titleLecture: string = '';

    link: string = '';

    activeTab: number = 0;

    @ViewChildren('collapseMenu')
    collapsePanels!: QueryList<CollapsePanelComponent>;

    dataTableBaiGiang: IctuDataTable<ClassSessionRelative> =
        new IctuDataTable<ClassSessionRelative>();

    private classesservice: ClassesService = inject(ClassesService);

    private bacDaoTaoService: BacDaoTaoService = inject(BacDaoTaoService);

    private classSessionservice: ClassSessionService =
        inject(ClassSessionService);

    private classSessionContentservice: ClassSessionContentService = inject(
        ClassSessionContentService
    );

    private wordsService: WordsService = inject(WordsService);

    private grammarService: GrammarService = inject(GrammarService);

    private fileService: IctuFileService =
        inject<IctuFileService>(IctuFileService);

    bacDaoTaoDropdownField: IctuDropdownField = new IctuDropdownField(
        this.bacDaoTaoService.loadOptions(this.donviId),
        'Chọn bậc đào tạo'
    );

    private dialog: MatDialog = inject(MatDialog);

    private openFileChooserObserver: Subject<FileUploadCategory> =
        new Subject<FileUploadCategory>();
    private fileChooserObserver: Subject<void> = new Subject<void>();

    private previewFileObserver$: Subject<IctuBasicFile> =
        new Subject<IctuBasicFile>();

    protected deletingFormItemIndex: WritableSignal<number> = signal(-1);

    private removeFormItemObserver: Subject<RemoveFormItemEvent> =
        new Subject<RemoveFormItemEvent>();

    private helper = new HelperClass();

    private _temp: { paged: number; resetPaginator: boolean } = {
        paged: 1,
        resetPaginator: true,
    };

    private onDestroy$: Subject<string> = new Subject<string>();

    constructor() {
        this.openFileChooserObserver
            .pipe(takeUntilDestroyed(), debounceTime(500))
            .subscribe((category: FileUploadCategory): void => {
                this.handleFileChooser[category]();
            });
        this.fileChooserObserver
            .pipe(debounceTime(500), takeUntilDestroyed())
            .subscribe((): void => {
                this.openFileChooserOnDocumentTab();
            });
        this.removeFormItemObserver
            .pipe(takeUntilDestroyed(), debounceTime(500))
            .subscribe(({ formName, index }: RemoveFormItemEvent): void => {
                switch (formName) {
                    case 'documents':
                        const _value: CourseAttachment[] = Helper.cloneObject(
                            this.getControlAttachment('attachments').value ?? []
                        );
                        this.getControlAttachment('attachments').setValue(
                            _value.filter(
                                (_: CourseAttachment, idx: number): boolean =>
                                    idx !== index
                            ),
                            { emitEvent: true }
                        );
                        this.getControlAttachment('attachments').markAsTouched();
                        break;
                }
                this.deletingFormItemIndex.set(-1);
            });
        this.previewFileObserver$
            .pipe(debounceTime(500), takeUntilDestroyed())
            .subscribe((file: IctuBasicFile): void => {
                this.notification.previewFile({ info: [file] });
            });
    }

    // private _doReload(): void {
    //     this.loadData(this._temp.paged, this._temp.resetPaginator);
    // }

    private formField(path: keyof ClassSessionContentExtend): AbstractControl {
        return this.formControl.formGroup.get(path);
    }

    formControl: IctuFormControl2<ClassSessionContentExtend> =
        new IctuFormControl2<ClassSessionContentExtend>({
            dropdownFields: [],
            formGroup: this.fb.group({
                attachments: [],
                content_media: [''],
            }),
            objectName: '',
            drawer: null,
        });
    public titleWordValidatorObserver: Subject<void> = new Subject();
    formControlWord: IctuFormControl2<Word> = new IctuFormControl2<Word>({
        dropdownFields: [this.bacDaoTaoDropdownField],
        formGroup: new FormGroup({
            id: new FormControl(0),
            title: new FormControl(
                '',
                [Validators.required],
                [this.checkWordPresent()]
            ),
            type: new FormControl('', [Validators.required]),
            audio: new FormControl(null),
            bacdaotao_ids: new FormControl([]),
            thumbnail: new FormControl(''),
            define: new FormControl(''),
            transcription: new FormControl(''),
        }),
        objectName: 'từ vựng',
        drawer: null,
    });

    private formFieldWord(path: keyof Word): AbstractControl {
        return this.formControlWord.formGroup.get(path);
    }

    ngOnInit(): void {
        this.state.set('loading');
        this.editor = new Editor();
        if (!this.auth.userHasRole(['teacher'])) {
            this.state.set('unauthorized');
        }
        this.formControl.formGroup
            .get('content_media')!
            .valueChanges
            .subscribe(value => {
                this.onContentMediaChanged(value);
            });
        this.preload().subscribe({
            next: () => {
                this.loadData(1, true, true);
            },
            error: () => {
                this.state.set('error');
            },
        });
    }

    preload(): Observable<Class> {
        return forkJoin<[IctuDropdownOption<number>[], DtoObject<Class[]>]>([
            this.bacDaoTaoDropdownField.load(),

            this.classesservice.query(
                [
                    {
                        conditionName: 'id',
                        value: this.class_id().toString(),
                        condition: IctuQueryCondition.equal,
                    },
                ],
                {
                    with: 'course',
                }
            ),
        ]).pipe(
            map(
                ([_, res]: [
                    IctuDropdownOption<number>[],
                    DtoObject<ClassRelative[]>
                ]): ClassRelative => {
                    this.course = res.data[0].course ?? null;
                    if (res.data[0]) {
                        this.course.lecture_format.forEach((section, index) => {
                            this.editors[index] = new Editor();
                        });
                    }
                    return res[0];
                }
            )
        );
    }


    loadData(paged: number, resetPaginator: boolean, isSetLessonPlan?: boolean) {
        this.headingLoad = 'Loading...';
        this.state.set('loading');
        this._temp = { paged, resetPaginator };
        forkJoin<[DtoObject<ClassSessionContent[]>, DtoObject<ClassSession[]>]>([
            this.classSessionContentservice.query([
                {
                    conditionName: 'class_id',
                    value: this.class_id().toString(),
                    condition: IctuQueryCondition.equal,
                },
            ], {
                limit: -1,
                paged: 1,
                include: this.donviId,
                include_by: 'donvi_id',
            },),
            this.classSessionservice
                .query(
                    [
                        {
                            conditionName: 'course_id',
                            value: this.course.id.toString(),
                            condition: IctuQueryCondition.equal,
                            orWhere: 'and'
                        },
                        {
                            conditionName: 'class_id',
                            value: this.class_id().toString(),
                            condition: IctuQueryCondition.equal,
                            orWhere: 'and'
                        },
                        {
                            conditionName: 'parent_class_id',
                            value: this.class_id().toString(),
                            condition: IctuQueryCondition.equal,
                            orWhere: 'or'
                        },
                        {
                            conditionName: 'course_id',
                            value: this.course.id.toString(),
                            condition: IctuQueryCondition.equal,
                            orWhere: 'and'
                        },
                    ],
                    {
                        limit: -1,
                        paged: 1,
                        with: 'teacher,course_lesson,course_lesson_plan'
                    }
                )
        ])
            .pipe(
                map(
                    ([classSessionContent, classSessions]: [
                        DtoObject<ClassSessionContent[]>,
                        DtoObject<ClassSessionAdditional[]>
                    ]) => {
                        return {
                            classSessionContent: classSessionContent.data,
                            classSessions: classSessions.data,
                        };
                    }
                )
            ).subscribe({
                next: ({ classSessionContent, classSessions }) => {
                    this.dataTableBaiGiang.fillData(classSessions);
                    if (isSetLessonPlan) {
                        this.listCourseLesson = classSessions.map((e) => e.course_lesson);
                        this.listCourseLessonPlan = classSessions.filter(Boolean).map((e) => {
                            return e.course_lesson_plan
                        });
                    }
                    this.listClassSessionContent = classSessionContent;
                    this.sortListClassLesson();
                    if (this.class_session_id() != 0) {
                        this.valueLesson.idClassSession = this.class_session_id();
                    } else {
                        const firstStatus0 = this.dataTableBaiGiang
                            .data()
                            .find((item) => item.status != 2);
                        this.valueLesson.idClassSession = firstStatus0.id;
                    }
                    this.setLessonSelect();
                    this.state.set('success');

                    setTimeout(() => {
                        this.scrollToLessonAfterLoad(
                            this.valueLesson.idClassSession
                        );
                    });
                },
                error: () => {
                    this.state.set('error');
                },

            });
    }

    openOrCloseEditorCourseLesson() {
        if (this.isBoSung) {
            this.isBoSung = false;
            this.valueEditor[this.valueLesson.indexContentLesson].content =
                this.valueEditorContentTam;
        } else {
            const tam = this.listClassSessionContent.find(
                (item) =>
                    item.course_lesson_id == this.valueLesson.idClassSession
            );
            this.valueEditor = !tam
                ? this.valueLesson.lectureLesson
                : tam.content;
            const slugOrder = new Map(
                this.course.lecture_format.map((item, index) => [
                    item.slug,
                    index,
                ])
            );
            this.valueEditor = this.valueEditor.sort((a, b) => {
                return (
                    (slugOrder.get(a.slug) ?? Infinity) -
                    (slugOrder.get(b.slug) ?? Infinity)
                );
            });
            this.valueEditorContentTam =
                this.valueEditor[this.valueLesson.indexContentLesson].content;
            this.isBoSung = true;
        }
    }

    // getContentViewValueEditor(): string {
    //     // const tam = this.listClassSessionContent.find(
    //     //     (item) => item.course_lesson_id == this.valueLesson.idClassSession
    //     // );

    //     // return tam
    //     //     ? tam.content.find(
    //     //           (item) =>
    //     //               item.slug == this.valueLesson.structureLessonSelect.slug
    //     //       ).content
    //     //     : this.valueLesson.structureLessonSelect.content;
    //     return this.valueLesson.structureLessonSelect.content;
    // }

    isAdded(index: number): boolean {


        const tam = this.listClassSessionContent.find(
            (item) => item.course_lesson_id == this.valueLesson.idClassSession
        );

        for (let item of tam.content) {
            if (
                item.slug == this.valueLesson[index].slug &&
                item.content != this.valueLesson[index].content
            ) {
                return true;
            }
        }
        return false;
    }

    sortListClassLesson(): void {
        const compareValues = this.dataTableBaiGiang.data().sort((a, b) => a.ordering - b.ordering);
        // this.listCourseLessonUnset = this.listCourseLesson.filter(
        //     (item) => !compareValues.includes(item.id)
        // );
        // const tam = this.dataTableBaiGiang;
        // for (let i = 0; i < tam.length; i++) {
        //     if (tam[i].course_lesson_id == 0) {
        //         tam[i].course_lesson_id = this.listCourseLessonUnset[0]?.id;
        //         break;
        //     }
        // }
        this.dataTableBaiGiang.fillData(compareValues);
    }

    saveClassSessionContent() {
        this.state.set('loading');
        if (this.valueLesson.lectureLesson[this.valueLesson.indexLectureLessonUpdate].type == 'MEDIA') {
            this.valueLesson.lectureLessonUpdate[this.valueLesson.indexLectureLessonUpdate].content = this.formField('content_media').value;
        }
        const tam = this.listClassSessionContent.find(
            (item) =>
                item.course_lesson_id ==
                this.valueLesson.classSession.course_lesson_id
        );
        let content: any[] = [];

        this.valueLesson.lectureLessonUpdate.forEach((item, index) => {
            let base: CourseLessonPlanContentItem = {
                fileID: item.fileID ?? 0,
                totalPages: item.totalPages ?? 0,
                slug: item.slug,
                title: item.title,
                type: item.type,
                content: item.type == 'MEDIA' ? item.content : this.ensureHtmlContent(item.content, index) ?? '',
                order: item.order ?? index + 1
            };

            if (item.type === 'EXCERPT_FROM_DOCUMENT') {
                base = { ...base, page: item.page };
            } else if (item.type === 'VOCABULARY') {
                base = { ...base, words: item.words };
            } else if (item.type === 'EXAMPLE_SENTENCES') {
                base = { ...base, grammars: item.grammars };
            }

            content.push(base);
        });

        const info: Partial<ClassSessionContent> = {
            donvi_id: this.donviId,
            class_id: this.class_id(),
            course_lesson_id: this.valueLesson.classSession.course_lesson_id,
            content,
            class_session_id: this.valueLesson.idClassSession,
            attachments: this.getControlAttachment('attachments').value
        };
        const request: Observable<any> = !tam
            ? this.classSessionContentservice.create(info)
            : this.classSessionContentservice.update(tam.id, info);
        const message: string = !tam
            ? 'Thêm mới thành công'
            : 'Cập nhật thành công';
        const messageError: string = !tam
            ? 'Thêm mới không thành công'
            : 'Cập nhật không thành công';
        request.subscribe({
            next: (): void => {
                this.valueLesson.isUpdatelectureLesson = false;
                this.visibleDialogMedia = false;
                this.loadData(this._temp.paged, this._temp.resetPaginator);
                this.notification.toastSuccess(message, 'Thông báo');
            },
            error: (): void => {
                this.state.set('success');
                this.notification.toastError(messageError, 'Thông báo');
            },
        });
    }

    setLessonSelect(): void {
        const lesson = this.dataTableBaiGiang
            .data()
            .find((item) => item.id == this.valueLesson.idClassSession);
        const indexLesson = this.dataTableBaiGiang
            .data()
            .findIndex((item) => item.id == this.valueLesson.idClassSession);
        this.selectLesson(
            indexLesson,
            this.getCourseLessonPlan(lesson.course_lesson_id),
            this.valueLesson.idClassSession,
            lesson
        );
    }


    selectLesson(
        index: number,
        lesson: CourseLessonPlan,
        idClassSession: number,
        classSession: ClassSession
    ) {
        this.state.set('loading');
        this.valueLesson = this.getDefaultLesson();
        this.valueLesson.classSession = classSession;
        if (index != this.valueLesson.indexLesson) {
            this.valueLesson.idClassSession = idClassSession;
            this.valueLesson.indexLesson = index;
            this.valueLesson.oderingLesson = classSession.ordering;
            this.valueLesson.indexContentLesson = 0;
            if (classSession.course_lesson_id != 0) {
                for (let item of this.course.lecture_format) {
                    const existed = lesson.content.find(
                        (c: any) => c.slug === item.slug
                    );
                    const pushed: CourseLessonPlanContentItemExtend = {
                        fileID: item.fileID ?? 0,
                        totalPages: item.totalPages ?? 0,
                        order: item.order,
                        title: item.title,
                        slug: item.slug,
                        type: item.type,
                        content: existed?.content ?? null,
                        page: existed?.page
                            ? existed.page
                            : { start: 0, end: 0, id_file: 0 },
                        words: existed?.words ? [...existed.words] : [],
                        grammars: existed?.grammars ? [...existed.grammars] : [],
                        grammarLecture: [],
                        wordLECTURE: [],
                        isViewUpdated: false,
                        isViewOriginal: false,
                    };
                    this.valueLesson.lectureLesson.push(pushed);
                }

                const tam = this.listClassSessionContent.find(
                    (item) =>
                        item.course_lesson_id ==
                        this.valueLesson.classSession.course_lesson_id
                );
                this.formControl.formGroup.reset({
                    attachments: tam?.attachments ?? []
                });
                for (let item of this.course.lecture_format) {
                    let existed;
                    if (tam) {
                        existed = tam.content.find(
                            (c: any) => c.slug === item.slug
                        );
                    }
                    const pushed: CourseLessonPlanContentItemExtend = {
                        fileID: item.fileID ?? 0,
                        totalPages: item.totalPages ?? 0,
                        order: item.order,
                        title: item.title,
                        slug: item.slug,
                        type: item.type,
                        content: existed?.content ?? null,
                        page: existed?.page
                            ? existed.page
                            : { start: 0, end: 0, id_file: 0 },
                        words: existed?.words ? [...existed.words] : [],
                        grammars: existed?.grammars ? [...existed.grammars] : [],
                        grammarLecture: [],
                        wordLECTURE: [],
                        isViewUpdated: false,
                        isViewOriginal: false,
                    };
                    this.valueLesson.lectureLessonUpdate.push(pushed);
                }
                for (let item of this.valueLesson.lectureLesson) {
                    if (item.type == 'VOCABULARY') {
                        if (item.words.length != 0) {
                            this.loadWord(item.words).subscribe({
                                next: (data: Word[]): void => {
                                    item.wordLECTURE = data;
                                },
                                error: (): void => {
                                    this.state.set('error');
                                },
                            });
                        } else {
                            item.wordLECTURE = [];
                        }
                    } else if (item.type == 'EXAMPLE_SENTENCES') {
                        if (item.grammars.length != 0) {
                            this.loadGrammar(item.grammars).subscribe({
                                next: (data: Grammar[]): void => {
                                    item.grammarLecture = data;
                                },
                                error: (): void => {
                                    this.state.set('error');
                                },
                            });
                        } else {
                            item.grammarLecture = [];
                        }
                    }
                }
                for (let item of this.valueLesson.lectureLessonUpdate) {
                    if (item.type == 'VOCABULARY') {
                        if (item.words.length != 0) {
                            this.loadWord(item.words).subscribe({
                                next: (data: Word[]): void => {
                                    item.wordLECTURE = data;
                                },
                                error: (): void => {
                                    this.state.set('error');
                                },
                            });
                        } else {
                            item.wordLECTURE = [];
                        }
                    } else if (item.type == 'EXAMPLE_SENTENCES') {
                        if (item.grammars.length != 0) {
                            this.loadGrammar(item.grammars).subscribe({
                                next: (data: Grammar[]): void => {
                                    item.grammarLecture = data;
                                },
                                error: (): void => {
                                    this.state.set('error');
                                },
                            });
                        } else {
                            item.grammarLecture = [];
                        }
                    }
                }
            }
        } else {
            this.valueLesson = this.getDefaultLesson();
        }

        this.valueLesson.isUpdatelectureLesson = false;

        this.state.set('success');
    }

    // selectStructureLesson(index: number, slug: string) {
    //     this.valueLesson.indexContentLesson = index;
    //     this.valueLesson.structureLessonSelect =
    //         this.valueLesson.structureLesson.find((item) => item.slug == slug);
    //     this.valueLesson.slugStructureSelected = slug;
    //     this.updateFormFieldBySlug(slug);
    // }

    // updateFormFieldBySlug(slug: string): void {
    //     let content = '';
    //     try {
    //         content = this.valueLesson.lectureLessonUpdate.find(
    //             (item) => item.slug == slug
    //         ).content;
    //     } catch (e) {
    //         content = '';
    //     }
    //     this.formControl.formGroup.reset({
    //         content: content,
    //     });
    // }

    // updateStructureLessonUpdate(): void {
    //     const index = this.valueLesson.structureLessonUpdate.findIndex(
    //         (item) => item.slug == this.valueLesson.slugStructureSelected
    //     );
    //     this.valueLesson.structureLessonUpdate[index] = {
    //         ...this.valueLesson.structureLessonUpdate[index],
    //         content: this.formField('content').value,
    //     };
    // }

    reload(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.preload().subscribe({
            next: () => {
                this.loadData(this._temp.paged, this._temp.resetPaginator);
            },
            error: () => {
                this.state.set('error');
            },
        });
    }

    onChangePage(paged: number): void {
        this.valueLesson = this.getDefaultLesson();
        this.loadData(paged, false);
    }

    getCourseLessonPlan(course_lesson_id: number): CourseLessonPlan {
        const result = course_lesson_id != 0 ? this.listCourseLessonPlan.find(
            (item) => item?.course_lessons_id == course_lesson_id
        ) : null;
        return result;
    }

    protected getControl<K extends keyof WordFieldName>(
        key: K
    ): FormControl<WordFieldName[K]> {
        return this.formControlWord.formGroup.get(key as string) as FormControl<
            WordFieldName[K]
        >;
    }

    protected callFileChooser(category: FileUploadCategory): void {
        this.openFileChooserObserver.next(category);
    }

    private handleFileChooser: Record<FileUploadCategory, () => void> = {
        thumbnail: (): void => {
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
                        void this.resizeCourseThumbnail(_file, 'thumbnail');
                    }
                }
                setTimeout((): void => inputTag.remove(), 1000);
            };
            inputTag.click();
        },
        audio: (): void => {
            const inputTag: HTMLInputElement = Object.assign<
                HTMLInputElement,
                Pick<HTMLInputElement, 'type' | 'accept' | 'multiple'>
            >(document.createElement('input'), {
                type: 'file',
                accept: 'audio/mp3',
                multiple: false,
            });

            inputTag.onchange = (): void => {
                if (inputTag.files.length) {
                    const _file: File = this.validateAudioInputFile(
                        inputTag.files.item(0)
                    );
                    if (_file) {
                        void this.resizeCourseThumbnail(_file, 'audio');
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

    private validateAudioInputFile(file: File): File {
        switch (true) {
            case file.size >= _10MB:
                this.notification.toastError(
                    'Dung lượng file không được vượt quá 10MB'
                );
                return null;
            case !['mp3'].includes(file.name.toLowerCase().split('.').pop()):
                this.notification.toastError(
                    'Chỉ chấp nhận file có định dạng mp3'
                );
                return null;
            default:
                return file;
        }
    }

    private async resizeCourseThumbnail(
        file: File,
        type: FileUploadCategory
    ): Promise<any> {
        try {
            if (type == 'thumbnail') {
                const result: ImageResizerDto = await firstValueFrom(
                    this.imageResize(file, {
                        aspectRatio: 16 / 16,
                        format: 'png',
                    })
                );
                if (!result.error) {
                    this.formControlWord.state.set('LOADING');
                    const fileName: string = `word-thumbnail-${Date.now()}.png`;
                    const fileLogo: File = Helper.blobToFile(
                        result.data.blob,
                        fileName
                    );
                    this.fileService
                        .upload(fileLogo, { public: 1, tag: 'word-thumbnail' })
                        .pipe(takeUntil(this.destroy$))
                        .subscribe({
                            next: ({
                                id,
                                name,
                                title,
                                url,
                                ext,
                                type,
                                size,
                                location,
                            }: ICTUStandardFile): void => {
                                this.getControl('thumbnail').setValue({
                                    id,
                                    name,
                                    title,
                                    url,
                                    ext,
                                    type,
                                    size,
                                    location,
                                });
                                this.getControl('thumbnail').markAsTouched({
                                    emitEvent: true,
                                });
                                this.formControlWord.state.set('READY');
                            },
                            error: (): void => {
                                this.notification.toastError(
                                    'Upload file thất bại'
                                );
                            },
                        });
                }
            } else {
                this.formControlWord.state.set('LOADING');
                // const fileName: string = `word-audio-${Date.now()}.png`;
                // const fileLogo: File = Helper.blobToFile(
                //     result.data.blob,
                //     fileName
                // );
                this.fileService
                    .upload(file, { public: 1, tag: 'word-audio' })
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: ({
                            id,
                            name,
                            title,
                            url,
                            ext,
                            type,
                            size,
                            location,
                        }: ICTUStandardFile): void => {
                            this.getControl('audio').setValue({
                                id,
                                name,
                                title,
                                url,
                                ext,
                                type,
                                size,
                                location,
                            });
                            this.getControl('audio').markAsTouched({
                                emitEvent: true,
                            });
                            this.formControlWord.state.set('READY');
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

    loadWord(listWordLecture: number[]): Observable<Word[]> {
        this.state.set('loading');
        const stringWord =
            listWordLecture.length != 0 ? listWordLecture.join(',') : '-1';
        return this.wordsService.load(stringWord, this.donviId).pipe(
            map((res: DtoObject<Word[]>): Word[] => {
                return res.data;
            })
        );
    }

    checkWordPresent(): AsyncValidatorFn {
        this.titleWordValidatorObserver.next();

        return (control: AbstractControl) => {
            if (!control.value) return of(null);
            if (!this.isAddWord) return of(null);
            return this.wordsService.findWord(control.value, this.donviId).pipe(
                delay(2000),
                map((res: any) => {
                    if (res && Array.isArray(res.data) && res.data.length > 0) {
                        this.listWordOld = res.data;
                        return { wordTaken: true };
                    } else {
                        return null;
                    }
                }),
                takeUntil(
                    merge(this.onDestroy$, this.titleWordValidatorObserver)
                ),
                catchError(() => of(null))
            );
        };
    }

    openDialogWord(isAdd: boolean, data?: Word): void {
        this.isAddWord = isAdd;
        if (isAdd) {
            this.formControlWord.formGroup.reset({
                title: '',
                type: 'DANH_TU',
                audio: '',
                bacdaotao_ids: [],
                thumbnail: '',
                define: '',
                transcription: '',
            });
            this.visibleDialogWord = true;
        } else {
            this.formControlWord.formGroup.reset({
                id: data.id,
                title: data.title,
                type: data.type,
                audio: data.audio,
                bacdaotao_ids: data.bacdaotao_ids,
                thumbnail: data.thumbnail,
                define: data.define,
                transcription: data.transcription,
            });
            this.visibleDialogWord = true;
        }

        this.formControlWord.state.set('READY');
    }

    saveWord(): void {
        this.state.set('upload');
        const info: Partial<Word> = {
            title: this.formFieldWord('title').value,
            type: this.formFieldWord('type').value,
            audio: this.formFieldWord('audio').value,
            bacdaotao_ids: this.formFieldWord('bacdaotao_ids').value,
            thumbnail: this.formFieldWord('thumbnail').value,
            define: this.formFieldWord('define').value,
            transcription: this.formFieldWord('transcription').value,
            donvi_id: this.donviId,
        };
        const request = this.isAddWord
            ? this.wordsService.create(info)
            : this.wordsService.update(this.formFieldWord('id').value, info);
        const message: string = this.isAddWord
            ? 'Thêm mới thành công'
            : 'Cập nhật thành công';
        const messageErorr: string = this.isAddWord
            ? 'Thêm mới không thành công'
            : 'Cập nhật không thành công';
        this.visibleDialogWord = false;
        this.formControlWord.submit(request).subscribe({
            next: (res) => {
                this.addWord(res);
                this.notification.toastSuccess(message, 'Thông báo');
            },
            error: (err) => {
                this.state.set('success');
                this.notification.toastError(messageErorr, 'Thông báo');
            },
        });
    }

    addWord(idword: number): void {
        const index = this.valueLesson.indexLectureLessonUpdate;
        this.valueLesson.lectureLessonUpdate[index].words.push(idword);
        this.onUserInput();
        this.loadWord(
            this.valueLesson.lectureLessonUpdate[index].words
        ).subscribe({
            next: (res) => {
                this.valueLesson.lectureLessonUpdate[index].wordLECTURE = res;
                this.state.set('success');
            },
            error: () => {
                this.state.set('error');
            },
        });
        this.resetDialogWord();
    }

    delWord(idWord: number): void {
        const index = this.valueLesson.indexLectureLessonUpdate;
        this.valueLesson.lectureLessonUpdate[index].words =
            this.valueLesson.lectureLessonUpdate[index].words.filter(
                (item) => item != idWord
            );
        this.valueLesson.lectureLessonUpdate[index].wordLECTURE =
            this.valueLesson.lectureLessonUpdate[index].wordLECTURE.filter(
                (item) => item.id != idWord
            );
        this.onUserInput();
    }

    resetDialogWord(): void {
        this.formControlWord.formGroup.reset({
            id: 0,
            title: '',
            type: 'DANH_TU',
            audio: '',
            bacdaotao_ids: '',
            thumbnail: '',
            define: '',
            transcription: '',
        });
        this.visibleDialogWord = false;
    }

    isPanel1Open(index: number): boolean {
        const panel = this.collapsePanels1.get(index);
        return !!panel?.panel?.isShown;
    }

    getConversationText(item: Grammar): string {
        return item.response
            ? `${item.prompt} - ${item.response}`
            : item.prompt;
    }

    loadGrammar(listIds: number[]): Observable<Grammar[]> {
        const stringWord = listIds.length != 0 ? listIds.join(',') : '-1';
        return this.grammarService.load(stringWord, this.donviId).pipe(
            map((res: DtoObject<Grammar[]>): Grammar[] => {
                return res.data;
            })
        );
    }

    addGramar(idGramar: number): void {
        const index = this.valueLesson.indexLectureLessonUpdate;
        this.valueLesson.lectureLessonUpdate[index].grammars.push(idGramar);
        this.onUserInput();
        this.loadGrammar(
            this.valueLesson.lectureLessonUpdate[index].grammars
        ).subscribe({
            next: (res) => {
                this.valueLesson.lectureLessonUpdate[index].grammarLecture =
                    res;
                this.state.set('success');
            },
            error: () => {
                this.state.set('error');
            },
        });
    }

    saveGrammar(idGrammar: number, isAdd: boolean): void {
        this.state.set('upload');
        let data;
        if (!isAdd) {
            data = this.valueLesson.lectureLessonUpdate[
                this.valueLesson.indexLectureLessonUpdate
            ].grammarLecture.find((item) => item.id == idGrammar);
        }
        const info: Partial<Grammar> = isAdd
            ? {
                prompt: 'Câu mới',
                response: '',
                translation: '',
                donvi_id: this.donviId,
            }
            : {
                prompt: data.prompt,
                response: data.response,
                translation: data.translation,
                donvi_id: this.donviId,
            };
        const request = isAdd
            ? this.grammarService.create(info)
            : this.grammarService.update(data.id, info);
        const message: string = isAdd
            ? 'Thêm mới thành công'
            : 'Cập nhật thành công';
        const messageErorr: string = isAdd
            ? 'Thêm mới không thành công'
            : 'Cập nhật không thành công';
        request.subscribe({
            next: (res) => {
                if (isAdd) {
                    this.addGramar(res);
                }
                this.state.set('success');
                this.notification.toastSuccess(message, 'Thông báo');
            },
            error: (err) => {
                this.state.set('success');
                this.notification.toastError(messageErorr, 'Thông báo');
            },
        });
    }

    delGrammar(idGrammar: number): void {
        const index = this.valueLesson.indexLectureLessonUpdate;
        this.valueLesson.lectureLessonUpdate[index].grammars =
            this.valueLesson.lectureLessonUpdate[index].grammars.filter(
                (item) => item != idGrammar
            );
        this.valueLesson.lectureLessonUpdate[index].grammarLecture =
            this.valueLesson.lectureLessonUpdate[index].grammarLecture.filter(
                (item) => item.id != idGrammar
            );
        this.onUserInput();
    }

    updateIndexLectureUpdate(index: number): void {
        this.valueLesson.indexLectureLessonUpdate = index;
    }

    onUserInput() {
        this.valueLesson.isUpdatelectureLesson = true;
    }

    setSrcAudio(file: any): string {
        const result = !file
            ? ''
            : this.fileService.fileHostingServiceApi +
            'file/' +
            file.id +
            '?token=' +
            tokenGetter();

        return result;
    }

    toggleAudio(url: string, index: number) {
        if (!url) return;
        if (this.isPlayingIndex === index && this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.isPlayingIndex = null;
            return;
        }
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        this.currentAudio = new Audio(url);
        this.currentAudio.play();
        this.isPlayingIndex = index;
        this.currentAudio.onended = () => {
            this.isPlayingIndex = null;
        };
    }

    setValueDialog(
        titleLecture: string,
        type_view: LectureType,
        link: string,
        form_document?: CourseLessonPlanContentPageItem
    ): void {
        this.type_view = type_view;
        this.titleLecture = titleLecture;
        if (type_view == 'LINK') {
            if (link != '') {
                this.link = link;
                this.visibleDialog = true;
            } else {
                this.notification.toastError('Chưa có tài liệu', 'Thông báo');
            }
        } else {
            if (
                form_document.id_file !== 0 ||
                form_document.start !== 0 ||
                form_document.end !== 0
            ) {
                this.form_document = form_document;
                this.visibleDialog = true;
            } else {
                this.notification.toastError(
                    'Tài liệu chưa được trích xuất',
                    'Thông báo'
                );
            }
        }
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
            multiple: true,
        });
        panel.onchange = (): void => {
            if (panel.files?.length) {
                const files = Array.from(panel.files);
                for (const file of files) {
                    this.preUploadFileOnDocumentTab(file);
                }
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
                    .pipe(takeUntil(this.onDestroy$))
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
                                        this.getControlAttachment('attachments').value ?? []
                                    );
                                _value.push(_newDocument);
                                this.getControlAttachment('attachments').setValue(_value, {
                                    emitEvent: true,
                                });
                                this.getControlAttachment('attachments').markAsTouched();
                            }
                        }
                    );
                break;
        }
    }

    protected btnCallFileChooser(): void {
        this.fileChooserObserver.next();
    }

    protected btnPreviewFile(file: IctuBasicFile): void {
        this.previewFileObserver$.next(file);
    }

    protected btnRemoveFormItem(
        index: number,
        formName: EditCourseFormName
    ): void {
        this.deletingFormItemIndex.set(index);
        this.removeFormItemObserver.next({ index, formName });
    }

    public getControlAttachment<K extends keyof ClassSessionContent>(
        key: K
    ): FormControl<ClassSessionContent[K]> {
        return this.formControl.formGroup.get(key as string) as FormControl<
            ClassSessionContent[K]
        >;
    }

    openDialogFile(): void {
        this.visibleDialogMedia = true;
    }



    onTabChange(value: any) {
        this.activeTab = value;
    }

    scrollToLessonAfterLoad(lessonId: number) {
        if (!this.lessonRef) return;

        const index = this.dataTableBaiGiang
            .data()
            .findIndex((item) => item.id === lessonId);
        if (index < 0) return;
        const scroll = () => {
            const el = this.lessonRef.toArray()[index];
            if (el) {
                el.nativeElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }
        };
        if (this.lessonRef.toArray().length > index) {
            scroll();
        } else {
            const sub = this.lessonRef.changes.subscribe(() => {
                if (this.lessonRef.toArray().length > index) {
                    scroll();
                    sub.unsubscribe();
                }
            });
        }
    }

    ensureHtmlContent(value: any, index: number): string {
        if (!value) return '';
        if (typeof value === 'string') {
            const trimmed = value.trim();

            const textOnly = trimmed
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, '')
                .trim();

            return textOnly.length > 0 ? trimmed : '';
        }
        if (typeof value === 'object' && value.type === 'doc') {
            const html = toHTML(value, this.editors[index].schema).trim();

            const textOnly = html
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, '')
                .trim();

            return textOnly.length > 0 ? html : '';
        }

        return '';
    }

    updateTypeViewLecture(type_view: string, index: number): void {
        switch (type_view) {
            case 'original':
                this.valueLesson.lectureLesson[index].isViewOriginal = !this.valueLesson.lectureLesson[index].isViewOriginal;
                break;
            case 'update':
                if (this.valueLesson.lectureLesson[this.valueLesson.indexLectureLessonUpdate].type == 'MEDIA') {
                    this.valueLesson.lectureLessonUpdate[this.valueLesson.indexLectureLessonUpdate].content = this.formField('content_media').value;
                }
                if (this.valueLesson.indexLectureLessonUpdate != index) {
                    this.valueLesson.lectureLesson[this.valueLesson.indexLectureLessonUpdate].isViewUpdated = false;
                }
                this.valueLesson.indexLectureLessonUpdate = index;
                if (!this.valueLesson.lectureLessonUpdate[index].content) {
                    this.valueLesson.lectureLessonUpdate[index].content = this.valueLesson.lectureLesson[index].content;
                }
                if (!this.valueLesson.lectureLessonUpdate[index].wordLECTURE || this.valueLesson.lectureLessonUpdate[index].wordLECTURE.length == 0) {
                    this.valueLesson.lectureLessonUpdate[index].words = [...this.valueLesson.lectureLesson[index].words];
                    this.valueLesson.lectureLessonUpdate[index].wordLECTURE = this.valueLesson.lectureLesson[index].wordLECTURE;
                }
                if (!this.valueLesson.lectureLessonUpdate[index].grammarLecture || this.valueLesson.lectureLessonUpdate[index].grammarLecture.length == 0) {
                    this.valueLesson.lectureLessonUpdate[index].grammars = [...this.valueLesson.lectureLesson[index].grammars];
                    this.valueLesson.lectureLessonUpdate[index].grammarLecture = [...this.valueLesson.lectureLesson[index].grammarLecture];
                }
                if (this.valueLesson.lectureLesson[index].type == 'MEDIA') {
                    const content =
                        this.valueLesson.lectureLessonUpdate[index]?.content?.trim()
                            ? this.valueLesson.lectureLessonUpdate[index].content
                            : this.valueLesson.lectureLesson[index]?.content ?? '';
                    this.formField('content_media').setValue(content);
                }
                this.valueLesson.lectureLesson[index].isViewUpdated = !this.valueLesson.lectureLesson[index].isViewUpdated;
                break;

        }
    }

    // updateTypeViewLecture(type_view: string, index: number): void {
    //     switch (type_view) {
    //         case 'original':
    //             this.valueLesson.lectureLesson[index].isViewOriginal = !this.valueLesson.lectureLesson[index].isViewOriginal;
    //             break;
    //         case 'update':
    //             if (this.valueLesson.lectureLesson[this.valueLesson.indexLectureLessonUpdate].type == 'MEDIA') {
    //                 this.valueLesson.lectureLessonUpdate[this.valueLesson.indexLectureLessonUpdate].content = this.formField('content_media').value;
    //             }
    //             if (this.valueLesson.indexLectureLessonUpdate != index) {
    //                 this.valueLesson.lectureLesson[this.valueLesson.indexLectureLessonUpdate].isViewUpdated = false;
    //             }
    //             this.valueLesson.indexLectureLessonUpdate = index;
    //             switch (this.valueLesson.lectureLesson[this.valueLesson.indexLectureLessonUpdate].type) {
    //                 case ('MEDIA'):
    //                     const content =
    //                         this.valueLesson.lectureLessonUpdate[index]?.content?.trim()
    //                             ? this.valueLesson.lectureLessonUpdate[index].content
    //                             : this.valueLesson.lectureLesson[index]?.content ?? '';
    //                     this.formField('content_media').setValue(content);
    //                     break;
    //                 case ('TEXT'):
    //                     if (!this.valueLesson.lectureLessonUpdate[index].content) {
    //                         this.valueLesson.lectureLessonUpdate[index].content = this.valueLesson.lectureLesson[index].content;
    //                     }
    //                     break;
    //                 case ('VOCABULARY'):
    //                     if (!this.valueLesson.lectureLessonUpdate[index].wordLECTURE || this.valueLesson.lectureLessonUpdate[index].wordLECTURE.length == 0) {
    //                         this.valueLesson.lectureLessonUpdate[index].words = [...this.valueLesson.lectureLesson[index].words];
    //                         this.valueLesson.lectureLessonUpdate[index].wordLECTURE = this.valueLesson.lectureLesson[index].wordLECTURE;
    //                     }
    //                     break;
    //                 case ('EXAMPLE_SENTENCES'):
    //                     if (!this.valueLesson.lectureLessonUpdate[index].grammarLecture || this.valueLesson.lectureLessonUpdate[index].grammarLecture.length == 0) {
    //                         this.valueLesson.lectureLessonUpdate[index].grammars = [...this.valueLesson.lectureLesson[index].grammars];
    //                         this.valueLesson.lectureLessonUpdate[index].grammarLecture = [...this.valueLesson.lectureLesson[index].grammarLecture];
    //                     }
    //                     break;
    //                 default:
    //                     if (!this.valueLesson.lectureLessonUpdate[index].content) {
    //                         this.valueLesson.lectureLessonUpdate[index].content = this.valueLesson.lectureLesson[index].content;
    //                     }
    //                     break;
    //             }
    //             this.valueLesson.lectureLesson[index].isViewUpdated = !this.valueLesson.lectureLesson[index].isViewUpdated;
    //             break;
    //     }
    // }

    onContentMediaChanged(value: any): void {
        // this.valueLesson.lectureLesson[this.valueLesson.indexLectureLessonUpdate].content = value;

        this.valueLesson.isUpdatelectureLesson = true;
    }

    getValueContentLecture(type: string, index: number): any {
        switch (type) {
            case ('MEDIA'):
            case ('LINK'):
            case ('TEXT'):
                if (this.valueLesson.lectureLessonUpdate[index].content && this.valueLesson.lectureLessonUpdate[index].content != '' && !this.isEmptyHtml(this.valueLesson.lectureLessonUpdate[index].content)) {
                    return this.valueLesson.lectureLessonUpdate[index].content;
                } else {
                    return this.valueLesson.lectureLesson[index].content;
                }
            case ('VOCABULARY'):
                if (this.valueLesson.lectureLessonUpdate[index].wordLECTURE && this.valueLesson.lectureLessonUpdate[index].wordLECTURE.length != 0) {
                    return this.valueLesson.lectureLessonUpdate[index].wordLECTURE;
                } else {
                    return this.valueLesson.lectureLesson[index].wordLECTURE;
                }
            case ('EXAMPLE_SENTENCES'):
                if (this.valueLesson.lectureLessonUpdate[index].grammarLecture && this.valueLesson.lectureLessonUpdate[index].grammarLecture.length != 0) {
                    return this.valueLesson.lectureLessonUpdate[index].grammarLecture;
                } else {
                    return this.valueLesson.lectureLesson[index].grammarLecture;
                }
        }
    }

    isEmptyHtml(html: string): boolean {
        if (!html) return true;

        const text = html
            .replace(/<br\s*\/?>/gi, '')
            .replace(/<\/?p>/gi, '')
            .replace(/<\/?div>/gi, '')
            .replace(/&nbsp;/gi, '')
            .trim();

        return text.length === 0;
    }


    ngOnDestroy(): void {
        this.editor.destroy();
    }
}
