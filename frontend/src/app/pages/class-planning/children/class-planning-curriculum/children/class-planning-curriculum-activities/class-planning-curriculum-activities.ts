import {
    Component,
    effect,
    inject,
    input,
    InputSignal,
    model,
    ModelSignal,
    OnDestroy,
    OnInit,
    output,
    signal,
    WritableSignal,
} from '@angular/core';
import { AppState } from '@app/models/app-state';
import {
    ClassActivity,
    ClassActivityExtend,
} from '@app/models/class-activities';
import { IctuDataTable } from '@app/models/datatable';
import { AuthenticationService } from '@app/services/authentication.service';
import { ClassActivitiesService } from '@app/services/class-activities.service';
import { debounceTime, forkJoin, map, Subject } from 'rxjs';
import { LoadingProgressComponent } from '@app/theme/components/loading-progress/loading-progress.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { CommonModule, DatePipe } from '@angular/common';
import { ClassSession, ClassSessionRelative } from '@app/models/class-session';
import { CourseAttachment } from '@app/models/course';
import { CommonImageExtension, CommonVideoExtension, IctuBasicFile, IMAGE_EXTENSIONS_SET, VIDEO_EXTENSIONS_SET } from '@app/models/file';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from '@app/services/notification.service';
import { ClassCurriculumLectureMediaPictureComponent } from "@app/components/class-curriculums/class-curriculum-lecture-media-picture/class-curriculum-lecture-media-picture.component";
import { CourseLessonStructureMedia } from '@app/pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/course-lesson-structure-media';
import { ViewDocument } from "@app/components/view-document/view-document";
import { IctuFileService } from '@app/services/ictu-file.service';
import { tokenGetter } from '@app/app.config';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@app/models/dto';
import { TabsModule } from 'primeng/tabs';
import { DividerModule } from 'primeng/divider';
import { ClassSessionService } from '@app/services/class-session.service';
import { BaseEmployeeInfo } from '@app/models/employee';
import { ClassMedia } from '@app/models/class-media';
import { ClassMediaService } from '@app/services/class-media.service';

import { Report, ReportPartContent } from '@app/models/report';
import { FormsModule } from '@angular/forms';
import { v4 as uuid4 } from 'uuid';
import { ReportEditorComponent } from "@app/components/report-editor/report-editor.component";
import { CheckboxModule } from 'primeng/checkbox';
import { Helper } from '@app/utilities/helper';
import { TextareaModule } from 'primeng/textarea';

type activitiesMode = 'default' | 'report';

@Component({
    selector: 'app-class-planning-curriculum-activities',
    imports: [
        LoadingProgressComponent,
        MatMenuModule,
        MatButtonModule,
        TooltipModule,
        DialogModule,
        DatePipe,
        ClassCurriculumLectureMediaPictureComponent,
        ViewDocument,
        TabsModule,
        DividerModule,
        CommonModule,
        FormsModule,
        ReportEditorComponent,
        CheckboxModule,
        TextareaModule
    ],
    templateUrl: './class-planning-curriculum-activities.html',
    styleUrl: './class-planning-curriculum-activities.css',
})
export class ClassPlanningCurriculumActivities implements OnInit, OnDestroy {
    private activitiesService: ClassActivitiesService = inject(
        ClassActivitiesService
    );

    private classSessionService: ClassSessionService = inject(
        ClassSessionService
    );

    private classMediaService: ClassMediaService = inject(
        ClassMediaService
    );

    class_session: InputSignal<ClassSession> = input.required<ClassSession>();

    class_activities_changed = output<ClassActivity[]>();

    // isApprovedAll: boolean = false;

    teacherClassSession: WritableSignal<BaseEmployeeInfo> = signal<BaseEmployeeInfo>(null);

    private auth: AuthenticationService = inject(AuthenticationService);

    private onDestroy$: Subject<string> = new Subject<string>();

    visibleDialog: boolean = false;

    visibleDialogReview: boolean = false;

    state: WritableSignal<AppState> = signal<AppState>('loading');

    mode: WritableSignal<activitiesMode> = signal<activitiesMode>('default');

    reportValue: WritableSignal<ClassActivityExtend> = signal<ClassActivityExtend>(null);

    reportValueUpload: WritableSignal<Report> = signal<Report>(null);

    get donviId(): number {
        return this.auth.user.donvi_id;
    }


    private fileService: IctuFileService = inject<IctuFileService>(IctuFileService);

    studentMedia: WritableSignal<CourseAttachment[]> = signal<CourseAttachment[]>([]);

    classMediaSession: ClassMedia[] = [];

    reportPartContent: ModelSignal<ReportPartContent[]> = model();

    private previewFileObserver$: Subject<IctuBasicFile> =
        new Subject<IctuBasicFile>();

    dataTable: IctuDataTable<ClassActivityExtend> =
        new IctuDataTable<ClassActivityExtend>();

    dataTableSesssion: IctuDataTable<ClassActivityExtend> =
        new IctuDataTable<ClassActivityExtend>();

    private notification: NotificationService = inject(NotificationService);


    private effectRef = effect(() => {
        const sessionId = this.class_session().id;
        if (sessionId) {
            this.loadData();
        }
    });

    ngOnInit(): void {
    }


    constructor() {
        this.previewFileObserver$
            .pipe(debounceTime(500), takeUntilDestroyed())
            .subscribe((file: IctuBasicFile): void => {
                this.notification.previewFile({ info: [file] });
            });
    }

    setMode(mode: activitiesMode, reportValue?: ClassActivityExtend) {
        switch (mode) {
            case 'default':
                this.mode.set('default');
                break;
            case 'report':
                this.reportValue.set(reportValue);

                const content: ReportPartContent[] = [{ id: uuid4(), heading: 'Nhận xét', content: this.reportValue().comment, type: 'text', files: [] },
                { id: uuid4(), heading: 'media', content: '', type: 'media', files: this.classMediaSession.map((t) => t.media) }]
                // const tam: Report = {
                //     donvi_id: this.donviId,
                //     content: content,
                //     type: 'PERSONAL',
                //     public: 1,
                //     code: '',
                //     object_id: this.reportValue().student_ids[0],
                //     id: -1,
                //     layout_id: 0,
                //     params: null,
                //     is_deleted: null,
                //     deleted_by: null,
                //     created_by: null,
                //     updated_by: null,
                //     created_at: null,
                //     updated_at: null,
                // };
                this.reportPartContent.set(content);
                this.mode.set('report');
                break;
        }
    }

    loadData(): void {
        this.state.set('loading');
        const queryParams: IctuQueryParams = {
            limit: -1,
            paged: 1,
            include: this.donviId,
            include_by: 'donvi_id',
            order: 'ASC',
            with: 'assistants,students',
        };
        const conditions: IctuConditionParam[] = [];
        conditions.push(
            {
                conditionName: 'class_session_id',
                value: this.class_session().id.toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },
            {
                conditionName: 'type',
                value: 'DIEM_DANH',
                condition: IctuQueryCondition.notEqual,
            },
        );
        // this.activitiesService
        //     .query(conditions, queryParams)
        //     .pipe(
        //         map((res): ClassActivityExtend[] => {
        //             return res.data;
        //         })
        //     )
        //     .subscribe({
        //         next: (data: any): void => {
        //             this.dataTable.fillData(data.filter((item: ClassActivityExtend) => item.type == 'HOAT_DONG'));
        //             this.dataTableSesssion.fillData(data.filter((item: ClassActivityExtend) => item.type == 'NHAN_XET'));
        //             this.state.set('success');
        //         },
        //         error: (): void => {
        //             this.state.set('error');
        //         },
        //     });
        forkJoin<[DtoObject<ClassActivity[]>, DtoObject<ClassSession[]>, DtoObject<ClassMedia[]>]>([
            this.activitiesService
                .query(conditions, queryParams),
            this.classSessionService
                .query(
                    [
                        {
                            conditionName: 'id',
                            value: this.class_session().id.toString(),
                            condition: IctuQueryCondition.equal,
                        },
                    ],
                    {
                        limit: 1,
                        paged: 1,
                        with: 'teacher'
                    }
                ),
            this.classMediaService.query([
                {
                    conditionName: 'class_session_id',
                    value: this.class_session().id.toString(),
                    condition: IctuQueryCondition.equal,
                },
            ],
                {
                    limit: -1,
                    paged: 1,
                })
        ])
            .pipe(
                map(
                    ([classActivities, classSessions, classMedia]: [
                        DtoObject<ClassActivity[]>,
                        DtoObject<ClassSessionRelative[]>,
                        DtoObject<ClassMedia[]>
                    ]) => {
                        return {
                            classActivities: classActivities.data,
                            classSessions: classSessions.data,
                            classMedia: classMedia.data
                        };
                    }
                )
            ).subscribe({
                next: ({ classActivities, classSessions, classMedia }) => {
                    const tam = classActivities.filter((item: ClassActivityExtend) => item.type == 'HOAT_DONG').map((t) => {
                        return t;
                    })
                    this.dataTable.fillData(tam);
                    // this.isApprovedAll = this.dataTable.data().filter((item) => item.approved == 0).length == 0;
                    this.onApprovedChange();
                    this.dataTableSesssion.fillData(classActivities.filter((item: ClassActivityExtend) => item.type == 'NHAN_XET'));
                    this.classMediaSession = classMedia.filter((t) => t.type == 'ACTIVITY');
                    if (classSessions.length != 0) {
                        this.teacherClassSession.set(classSessions[0].teacher);
                    }
                    this.state.set('success');
                },
                error: () => {
                    this.state.set('error');
                },

            });

    }

    setStudentMedia(media: CourseAttachment[]): void {
        this.studentMedia.set(media);
        this.visibleDialog = true;
    }

    protected btnPreviewFile(file: IctuBasicFile): void {
        this.previewFileObserver$.next(file);
    }

    reload(event: MouseEvent): void {
        this.loadData();
        event.preventDefault();
        this.effectRef?.destroy();
        event.stopPropagation();
    }

    checkTypeFile(media: IctuBasicFile): string {
        if (IMAGE_EXTENSIONS_SET.has(media.ext as CommonImageExtension)) {
            return 'image';
        } else if (VIDEO_EXTENSIONS_SET.has(media.ext as CommonVideoExtension)) {
            return 'video';
        } else {
            return 'undefine';
        }
    }

    openDialogProfile(): void {
        this.visibleDialog = true;
    }


    setMediaContentClassMedia(file: IctuBasicFile, type: 'picture' | 'video'): CourseLessonStructureMedia {
        return {
            mediaType: type,
            provider: 'upload',
            content: [
                file.location,
                file.id,
                file.name,
                file.title,
                file.ext,
                file.type,
                file.size,
                this.auth.user.id,
            ].join('|'),
        };
    }

    setSrcMedia(file: IctuBasicFile): string {
        const result = !file
            ? ''
            : this.fileService.fileHostingServiceApi +
            'file/' +
            file.name +
            '?token=' +
            tokenGetter();
        return result;
    }

    update_class_activities(class_activities: ClassActivity[]) {
        this.class_activities_changed.emit(class_activities);
    }

    onApprovedChange() {
        this.update_class_activities(this.dataTable.data());
    }

    ngOnDestroy(): void {
        this.onDestroy$.next('OnDestroy');
        this.onDestroy$.complete();
    }
}
