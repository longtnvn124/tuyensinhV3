import {
    Component,
    computed,
    inject,
    OnDestroy,
    OnInit,
    Signal,
    signal,
    WritableSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppState } from '@models/app-state';
import { AuthenticationService } from '@services/authentication.service';
import { firstValueFrom, map, Observable, Subject, switchMap, takeUntil } from 'rxjs';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { CommonModule, NgClass } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { DividerModule } from 'primeng/divider';
import { MatButton } from '@angular/material/button';
import { Tooltip } from 'primeng/tooltip';
import { ClassSessionService } from '@app/services/class-session.service';
import {
    ClassSession,
    ClassSessionCommand,
    ClassSessionRelative,
} from '@app/models/class-session';
import { ClassProgressAttendanceComponent } from './children/class-progress-attendance/class-progress-attendance.component';
import { SysRoleName } from '@models/role';
import { ClassProgressLessonComponent } from './children/class-progress-lesson/class-progress-lesson.component';
import { ClassPlanningAdditionalLessonComponent } from '../class-planning/children/class-planning-additional-lesson/class-planning-additional-lesson.component';
import { LopHocService } from '@app/services/lop-hoc.service';
import { CourseLesson } from '@models/course-lesson';
import { Helper, HelperClass } from '@utilities/helper';
import { ClassRelative } from '@app/models/class';
import { AssignHomeworkComponent } from '@app/components/assign-homework-component/assign-homework-component';
import { ClassesAssignmentService } from '@app/services/classes-assignment.service';
import {
    ClassesAssignment,
    ClassesAssignmentExtend,
} from '@app/models/classes-assignment';
import { DialogModule } from 'primeng/dialog';
import { ClassesService } from '@app/services/classes.service';
import { ConfirmComponent, ConfirmDialogData } from '@app/theme/components/confirm/confirm.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ButtonBase } from '@app/models/button';
import { ClassActivitiesService } from '@app/services/class-activities.service';
import { ClassActivity } from '@app/models/class-activities';

type ClassPlanningMenuName =
    | 'attendance'
    | 'students'
    | 'session'
    | 'activities'
    | 'assign';

type ClassProgressMenuItem = {
    name: ClassPlanningMenuName;
    label: string;
};

type ClassSessionStatus = {
    label: string;
    value: number;
};

@Component({
    selector: 'app-class-progress',
    standalone: true,
    imports: [
        NgClass,
        LoadingProgressComponent,
        MatMenuModule,
        DividerModule,
        MatButton,
        Tooltip,
        ClassProgressAttendanceComponent,
        CommonModule,
        ClassProgressLessonComponent,
        ClassPlanningAdditionalLessonComponent,
        AssignHomeworkComponent,
        DialogModule,
    ],
    templateUrl: './class-progress.component.html',
    styleUrl: './class-progress.component.css',
})
export default class ClassProgressComponent implements OnInit, OnDestroy {
    private activatedRoute: ActivatedRoute = inject(ActivatedRoute);

    private router: Router = inject(Router);

    private service: ClassSessionService = inject(ClassSessionService);

    private assignService: ClassesAssignmentService = inject(
        ClassesAssignmentService
    );

    private classService: ClassesService = inject(ClassesService);

    private auth: AuthenticationService = inject(AuthenticationService);

    get donviId(): number {
        return this.auth.user.donvi_id;
    }

    private activitiesService: ClassActivitiesService = inject(
        ClassActivitiesService
    );

    private dialog: MatDialog = inject(MatDialog);

    private dataConfirm: ConfirmDialogData = {
        heading: 'Bạn có chắc chắn bắt đầu buổi học không?',
        message: 'Sau khi bắt đầu buổi học, bạn có thể chỉnh sửa thông tin buổi học.',
        buttons: [
            {
                name: 'yes',
                label: 'Có',
                icon: 'ti ti-check',
                class: 'p-button-primary p-button-rounded'
            },
            {
                name: 'no',
                label: 'Không',
                icon: 'ti ti-x',
                class: 'p-button-secondary p-button-rounded'
            }
        ]
    };

    private helper = new HelperClass();

    private destroy$: Subject<void> = new Subject<void>();

    readonly state: WritableSignal<
        AppState | 'unauthorized' | 'invalid' | 'notFound'
    > = signal<AppState | 'unauthorized' | 'invalid' | 'notFound'>('loading');

    readonly navList: WritableSignal<ClassProgressMenuItem[]> = signal<
        ClassProgressMenuItem[]
    >([
        { label: 'Nội dung giảng dạy', name: 'session' },
        { label: 'Học sinh', name: 'attendance' },
        { label: 'Giao bài tập về nhà', name: 'assign' },
    ]);

    protected readonly menuList: WritableSignal<ClassSessionStatus[]> = signal<
        ClassSessionStatus[]
    >([
        { label: 'Chưa bắt đầu', value: 0 },
        { label: 'Đã bắt đầu', value: 1 },
        { label: 'Đã kết thúc', value: 2 },
    ]);

    readonly activeMenu: WritableSignal<ClassPlanningMenuName> =
        signal<ClassPlanningMenuName>('attendance');

    protected readonly classSession: WritableSignal<ClassSessionRelative> =
        signal(null);

    protected readonly className: Signal<string> = computed(
        (): string => this.classSession()?.class?.name ?? ''
    );

    protected readonly sessionStart: Signal<string> = computed(
        (): string => this.classSession()?.time_start ?? null
    );

    protected readonly classSessionState: Signal<ClassSessionStatus> = computed(
        (): ClassSessionStatus =>
            this.classSession()
                ? this.menuList().reduce(
                    (
                        reducer: ClassSessionStatus,
                        state: ClassSessionStatus
                    ): ClassSessionStatus =>
                        state.value === this.classSession().status
                            ? state
                            : reducer,
                    null
                )
                : null
    );

    protected readonly classSessionStateLabel: Signal<string> = computed(
        (): string =>
            this.classSessionState()
                ? this.classSessionState().label
                : 'Không xác dịnh'
    );

    protected readonly canChanges: Signal<boolean> = computed(
        (): boolean =>
            !!(this.classSessionState() && this.classSessionState().value === 1)
    );

    private readonly extractedInfo: WritableSignal<ClassSessionCommand> =
        signal(null);

    protected readonly role: Signal<SysRoleName> = computed(
        (): SysRoleName => this.extractedInfo()?.role ?? null
    );

    protected readonly classID: Signal<number> = computed(
        (): number => this.extractedInfo()?.class_id ?? 0
    );

    protected readonly classSessionID: Signal<number> = computed(
        (): number => this.extractedInfo()?.id ?? 0
    );

    visibleDialog: boolean = false;

    visibleDialogClassSesssionOn: boolean = false;

    visibleDialogSkipStatus: boolean = false;

    visibleDialogConfirm: boolean = false;

    classValue: ClassRelative;

    classSessionValue: ClassSession[];

    classSessionOn: ClassSession[];

    course_lesson_id: number = 0;

    contentDialogSkipStatus: string = '';

    ngOnInit(): void {
        if (
            !this.auth.userHasRole([
                'teaching_assistant',
                'teacher',
                'training_management',
            ])
        ) {
            this.state.set('unauthorized');
        } else {
            const extractedInfo: ClassSessionCommand =
                this.activatedRoute.snapshot.queryParamMap.has('hashcode')
                    ? this.decryptCode(
                        this.activatedRoute.snapshot.queryParamMap.get(
                            'hashcode'
                        )
                    )
                    : null;
            if (
                extractedInfo.role &&
                typeof extractedInfo.id === 'number' &&
                [
                    'teaching_assistant',
                    'teacher',
                    'training_management',
                ].includes(extractedInfo.role) &&
                extractedInfo.userId === this.auth.user.id
            ) {
                this.extractedInfo.set(extractedInfo);
                this.loadData();
            } else {
                this.state.set('invalid');
            }
        }
    }

    private decryptCode(encrypted: string): ClassSessionCommand {
        if (encrypted) {
            try {
                const str: string = this.auth.decrypt(encrypted);
                return str
                    ? Object.assign<ClassSessionCommand, any>(
                        {
                            userId: 0,
                            class_id: 0,
                            id: 0,
                            role: 'teaching_assistant',
                        },
                        JSON.parse(str)
                    )
                    : null;
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    private loadData(): void {
        this.state.set('loading');
        const conditions: IctuConditionParam[] = [
            {
                conditionName: 'class_id',
                value: this.classID().toString(),
                condition: IctuQueryCondition.equal,
            },
            {
                conditionName: 'parent_class_id',
                value: this.classID().toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'or',
            },
        ];
        const queryParams: IctuQueryParams = {
            limit: -1,
            paged: 1,
            with: 'class,parent_class,hocsinh,extra_students',
            include: this.auth.user.donvi_id.toString(10),
            include_by: 'donvi_id',
        };
        this.state.set('loading');

        this.service.query(conditions, queryParams).pipe(
            map(({ data }: DtoObject<ClassSession[]>): ClassSession[] => data.map((item: ClassSession): ClassSession => {
                if (item.parent_class) {
                    item['class'] = item.parent_class;
                }
                return item;
            })),
            map((data: ClassSession[]): ClassSession => {
                this.classSessionValue = data;
                return data.find(
                    (item) => item.id == this.classSessionID()
                ) ?? null;
            }),

            switchMap((classSession: ClassSessionRelative) => {
                this.classSession.set(classSession);
                return this.classService.query(
                    [
                        {
                            conditionName: 'id',
                            // value: classSession.class_id.toString(),
                            value: this.classID().toString(),
                            condition: IctuQueryCondition.equal,
                        },
                    ],
                    {
                        with: 'course,lessons,lesson_plan,course_lesson_tests',
                    }
                ).pipe(
                    map((res: DtoObject<ClassRelative[]>) => ({
                        classSession,
                        classValue: res.data[0]
                    }))
                );
            }),

            takeUntil(this.destroy$)
        )
            .subscribe({
                next: ({ classSession, classValue }) => {
                    if (!classValue) {
                        this.state.set('notFound');
                        return;
                    }

                    this.classValue = classValue;

                    this.classValue.lessons = Helper.arraySort(
                        this.classValue.lessons.filter(
                            (item: CourseLesson) => item.parent_id !== 0
                        ),
                        'ordering'
                    );

                    // ===== xử lý course_lesson_id =====
                    if (classSession.course_lesson_id === 0) {
                        for (const item of this.classSessionValue) {
                            if (item.course_lesson_id !== 0) {
                                this.course_lesson_id = item.course_lesson_id;
                                break;
                            }
                        }

                        if (!this.course_lesson_id) {
                            this.course_lesson_id = this.classValue.lessons[0]?.id;
                        } else {
                            const idx = this.classValue.lessons.findIndex(
                                l => l.id === this.course_lesson_id
                            );
                            if (idx > -1 && idx + 1 < this.classValue.lessons.length) {
                                this.course_lesson_id =
                                    this.classValue.lessons[idx + 1].id;
                            }
                        }
                    }
                    this.state.set('success');
                },
                error: () => {
                    this.state.set('error');
                }
            });

    }

    reload(e: MouseEvent): void {
        e.preventDefault();
        e.stopPropagation();
        this.loadData();
    }

    selectMenu(nav: ClassProgressMenuItem): void {
        this.activeMenu.set(nav.name);
    }

    backToClassList(): void {
        if (this.role() == 'teaching_assistant') {
            void this.router.navigate(['admin/teaching-assistant/calendar']);
        } else {

            void this.router.navigate(['admin/teacher/schedule']);
        }
    }

    updateClassSessionStatus(status: number): void {
        if (status > this.classSession().status) {
            if (status - this.classSession().status != 1) {
                this.contentDialogSkipStatus = 'Bạn không thể kết thúc buổi học khi chưa bắt đầu buổi học.';
                this.visibleDialogSkipStatus = true;
            } else if (status == 1) {
                this.state.set('loading');
                this.loadClassSessionOn().subscribe({
                    next: (res) => {
                        this.state.set('success');
                        if (res == true) {
                            this.dataConfirm.heading = 'Bạn có chắc chắn bắt đầu buổi học không?';
                            this.dataConfirm.message = 'Sau khi bắt đầu buổi học, bạn có thể chỉnh sửa thông tin buổi học.';
                            this.confirmUpdateStatus(status);
                        } else {
                            this.visibleDialogClassSesssionOn = true;
                        }
                    },
                    error: () => {
                        this.state.set('error');
                    }
                });
            } else if (status == 2) {
                this.state.set('loading');
                this.loadClassActivitiesDiemDanh().subscribe({
                    next: (res) => {
                        if (res == true) {
                            this.loadAssign().subscribe({
                                next: (res) => {
                                    this.state.set('success');
                                    if (res == true) {
                                        this.dataConfirm.heading = 'Bạn có chắc chắn kết thúc buổi học không?';
                                        this.dataConfirm.message = 'Sau khi kết thúc buổi học, bạn không thể chỉnh sửa thông tin buổi học.';
                                        this.confirmUpdateStatus(status);
                                    } else {
                                        this.visibleDialog = true;
                                    }
                                },
                                error: () => {
                                    this.state.set('error');
                                }
                            });
                        } else {
                            this.contentDialogSkipStatus = 'Bạn không thể kết thúc buổi học khi chưa thực hiện điểm danh cho buổi học.';
                            this.visibleDialogSkipStatus = true;
                        }
                    }, error: () => {
                        this.state.set('error');
                    }
                });
            }
        } else {
            if (status == this.classSession().status) {
                this.contentDialogSkipStatus = 'Bạn không thể cập nhật trạng thái buổi học trùng trạng thái hiện tại.';
                this.visibleDialogSkipStatus = true;
            }
            else if (status == 1) {
                this.contentDialogSkipStatus = 'Bạn không thể bắt đầu buổi học khi đã kết thúc buổi học.';
                this.visibleDialogSkipStatus = true;
            } else if (status == 0 && this.classSession().status == 2) {
                this.contentDialogSkipStatus = 'Bạn không thể quay lại trạng thái chưa bắt đầu khi buổi học đã được kết thúc.';
                this.visibleDialogSkipStatus = true;
            } else if (status == 0 && this.classSession().status == 1) {
                this.contentDialogSkipStatus = 'Bạn không thể quay lại trạng thái chưa bắt đầu khi buổi học đã được bắt đầu.';
                this.visibleDialogSkipStatus = true;
            }
        }
    }

    updateClassSession(status: number): void {
        this.state.set('loading');
        let info: Partial<ClassSession> = {
            status,
        }
        if (status == 1) {
            info.started_at = this.helper.formatSQLDateTime(new Date());
        } else if (status == 2) {
            info.ended_at = this.helper.formatSQLDateTime(new Date())
        }
        this.service
            .update(this.classSessionID(), info)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (): void => {
                    let info: Partial<ClassSession> = {
                        status,
                    }
                    if (status == 1) {
                        info.started_at = this.helper.formatSQLDateTime(new Date());
                    } else if (status == 2) {
                        info.ended_at = this.helper.formatSQLDateTime(new Date())
                    }
                    this.classSession.update(
                        (data: ClassSessionRelative): ClassSessionRelative => ({
                            ...data,
                            status,
                        })
                    );
                    this.state.set('success');
                },
                error: (): void => {
                    this.state.set('success');
                },
            });
    }

    getRole(): string {
        if (this.auth.userHasRole(['teaching_assistant'])) {
            return 'teaching_assistant';
        } else if (this.auth.userHasRole(['teacher'])) {
            return 'teacher';
        } else {
            this.state.set('unauthorized');
            return 'unauthorized';
        }
    }

    loadAssign(): Observable<boolean> {
        return this.assignService
            .load(
                this.classSession().id,
                this.donviId,
                this.classID()
            )
            .pipe(
                map((res: DtoObject<ClassesAssignment[]>): boolean => {
                    let result: boolean = true;
                    const courseLessonTestListID =
                        this.classValue.course_lesson_tests
                            .filter(
                                (item) =>
                                    item.course_lesson_id ==
                                    this.classSession().course_lesson_id
                            )
                            .map((d) => d.id);
                    const courseClassesAssignmentID = res.data.map(
                        (item) => item.course_lesson_test_id
                    );
                    if (courseLessonTestListID.length != 0) {
                        result = courseLessonTestListID.every((item) =>
                            courseClassesAssignmentID.includes(item)
                        );
                    }
                    return result;
                })
            );
    }

    loadClassSessionOn(): Observable<boolean> {
        const conditions: IctuConditionParam[] = [
            {
                conditionName: 'donvi_id',
                value: this.auth.user.donvi_id.toString(10),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },
            {
                conditionName: 'class_id',
                value: this.classID().toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },
            {
                conditionName: 'ordering',
                value: this.classSession().ordering.toString(),
                condition: IctuQueryCondition.lessThan,
                orWhere: 'and',
            },
            {
                conditionName: 'status',
                value: '2',
                condition: IctuQueryCondition.lessThan,
                orWhere: 'and',
            },
        ];
        const queryParams: IctuQueryParams = {
            limit: -1,
            paged: 1,
            with: 'class',
        };
        return this.service
            .query(conditions, queryParams
            )
            .pipe(
                map((res: DtoObject<ClassSession[]>): boolean => {
                    let result: boolean = true;
                    if (res.data.length > 0) {
                        this.classSessionOn = res.data;
                        result = false;
                    }
                    return result;
                })
            );
    }

    loadClassActivitiesDiemDanh(): Observable<boolean> {
        const conditions: IctuConditionParam[] = [
            {
                conditionName: 'donvi_id',
                value: this.auth.user.donvi_id.toString(10),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },
            {
                conditionName: 'class_session_id',
                value: this.classSessionID().toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },
            {
                conditionName: 'type',
                value: 'DIEM_DANH',
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },
        ];
        const queryParams: IctuQueryParams = {
            limit: -1,
            paged: 1,
        };
        return this.activitiesService
            .query(conditions, queryParams
            )
            .pipe(
                map((res: DtoObject<ClassActivity[]>): boolean => {
                    let result: boolean = false;
                    if (res.data.length > 0) {
                        result = true;
                    }
                    return result;
                })
            );
    }

    confirmUpdateStatus(status: number): void {
        void this._handleConfirm(status);
    }


    confirm(data: ConfirmDialogData): Observable<ButtonBase> {
        const dialogRef: MatDialogRef<ConfirmComponent> = this.dialog.open(ConfirmComponent, {
            data,
            disableClose: true,
            panelClass: 'ictu-app-notification'
        });
        return dialogRef.afterClosed();
    }

    private async _handleConfirm(status: number): Promise<void> {
        const confirm: string = await firstValueFrom(this.confirm(this.dataConfirm)).then((u: ButtonBase): string => (u.name));
        if (confirm === 'yes') {
            this.updateClassSession(status);
        }
    }

    startTime = '2026-01-27 09:45:00';

    timePassed = signal<string>('');

    calcTimePassed() {
        const start = new Date(this.startTime.replace(' ', 'T')).getTime();
        const now = Date.now();
        const diff = now - start;

        if (diff < 0) {
            this.timePassed.set('Chưa bắt đầu');
            return;
        }

        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        this.timePassed.set(`${h} giờ ${m} phút`);
    }




    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
