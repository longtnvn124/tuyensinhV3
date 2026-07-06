import { Component , ElementRef , inject , input , InputSignal , OnDestroy , OnInit , QueryList , Signal , signal , TemplateRef , viewChild , ViewChildren , WritableSignal } from '@angular/core';
import { AppState } from '@models/app-state';
import { DividerModule } from 'primeng/divider';
import { IctuDataTable } from '@models/datatable';
import { DtoObject , IctuQueryCondition } from '@models/dto';
import { filter , forkJoin , map , Observable , of , Subject , switchMap } from 'rxjs';
import { AuthenticationService } from '@services/authentication.service';
import { ActivatedRoute } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DialogModule } from 'primeng/dialog';
import { AbstractControl , FormBuilder , FormsModule , ReactiveFormsModule } from '@angular/forms';
import { NotificationService } from '@services/notification.service';
import { Editor , Toolbar } from 'ngx-editor';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import { ClassSessionContent } from '@models/class-session-content';
import { ClassSessionContentService } from '@services/class-session-content.service';
import { Course , CourseLectureFormat , LectureType } from '@app/models/course';
import { ClassSessionService } from '@app/services/class-session.service';
import { ClassSession , ClassSessionAdditional , ClassSessionRelative } from '@app/models/class-session';
import { TabsModule } from 'primeng/tabs';
import { LoadingProgressComponent } from '@app/theme/components/loading-progress/loading-progress.component';
import { DomSanitizer } from '@angular/platform-browser';
import { SplitterModule } from 'primeng/splitter';
import { TextareaModule } from 'primeng/textarea';
import { ClassActivity , ContentComment } from '@app/models/class-activities';
import { IctuFormControl2 } from '@app/models/ictu-form-control';
import { ClassActivitiesService } from '@app/services/class-activities.service';
import { CourseLessonPlan , CourseLessonPlanContentItem , CourseLessonPlanContentPageItem } from '@app/models/course-lesson-plan';
import { CourseLesson } from '@app/models/course-lesson';
import { MatButtonModule } from '@angular/material/button';
import { Word } from '@app/models/word';
import { WordsService } from '@app/services/word.service';
import { GrammarService } from '@app/services/grammar.service';
import { IctuFileService } from '@app/services/ictu-file.service';
import { Grammar } from '@app/models/grammar';
import { InputTextModule } from 'primeng/inputtext';
import { SafeHtmlPipe } from '@pipes/safe-html.pipe';
import { IctuMediaLoaderDirective } from '@app/directives/ictu-media-loader.directive';
import { ViewDocument } from '@app/components/view-document/view-document';
import { tokenGetter } from '@app/app.config';
import { TooltipModule } from 'primeng/tooltip';
import { AssignHomeworkComponent } from '@app/components/assign-homework-component/assign-homework-component';
import { Employee } from '@app/models/employee';
import { ClassRelative } from '@app/models/class';
import { ClassesService } from '@app/services/classes.service';
import { ClassCurriculumLectureMediaVideoComponent } from '@app/components/class-curriculums/class-curriculum-lecture-media-video/class-curriculum-lecture-media-video.component';
import { ClassCurriculumLectureMediaAudioComponent } from '@app/components/class-curriculums/class-curriculum-lecture-media-audio/class-curriculum-lecture-media-audio.component';
import { ClassCurriculumLectureMediaPictureComponent } from '@app/components/class-curriculums/class-curriculum-lecture-media-picture/class-curriculum-lecture-media-picture.component';
import { ClassCurriculumLectureMediaDocumentComponent } from '@app/components/class-curriculums/class-curriculum-lecture-media-document/class-curriculum-lecture-media-document.component';
import { CourseLessonMediaDecodePipe } from '@app/pages/class-planning/children/class-planning-curriculum/children/class-planning-curriculum-lecture/course-lesson-media-decode.pipe';

interface CourseLessonPlanContentItemExtend
    extends CourseLessonPlanContentItem {
    wordLECTURE? : Word[];
    grammarLecture? : Grammar[];
}

interface CourseLectureFormatExtend extends CourseLectureFormat {
    isViewAdditional? : boolean;
    teacher_select? : Employee;
}

interface lesson {
    idClassSession : number;
    indexLesson : number;
    indexContentLesson : number;
    classSession : ClassSession;
    lecture_format_extend : CourseLectureFormatExtend[];
    lectureLesson : CourseLessonPlanContentItemExtend[];
    lectureLessonUpdate : CourseLessonPlanContentItemExtend[];
    oderingLesson : number;
    activities : ClassActivity;
    allWord : Word[];
    allGrammar : Grammar[];
}

@Component( {
    selector    : 'app-class-progress-lesson' ,
    imports : [
        DividerModule ,
        MatTooltipModule ,
        DialogModule ,
        FormsModule ,
        MatMenuModule ,
        CommonModule ,
        MatCheckboxModule ,
        TabsModule ,
        LoadingProgressComponent ,
        SplitterModule ,
        TextareaModule ,
        ReactiveFormsModule ,
        MatButtonModule ,
        SafeHtmlPipe ,
        InputTextModule ,
        IctuMediaLoaderDirective ,
        TooltipModule ,
        ViewDocument ,
        AssignHomeworkComponent ,
        ClassCurriculumLectureMediaVideoComponent ,
        ClassCurriculumLectureMediaAudioComponent ,
        ClassCurriculumLectureMediaPictureComponent ,
        ClassCurriculumLectureMediaDocumentComponent ,
        CourseLessonMediaDecodePipe
    ] ,
    templateUrl : './class-progress-lesson.component.html' ,
    styleUrl    : './class-progress-lesson.component.css'
} )
export class ClassProgressLessonComponent implements OnInit , OnDestroy {
    class_id : InputSignal<number> = input.required<number>();

    private destroy$ : Subject<void> = new Subject<void>();

    state : WritableSignal<AppState | 'unauthorized'> = signal<
        AppState | 'unauthorized'
    >( 'loading' );
    class_session_id : InputSignal<number>            = input.required<number>();

    private auth : AuthenticationService = inject( AuthenticationService );

    visibleDialog : boolean = false;

    form_document : CourseLessonPlanContentPageItem = {
        id_file : 0 ,
        start   : 0 ,
        end     : 0
    };

    type_view : LectureType = 'LINK';

    titleLecture : string = '';

    link : string = '';

    private activatedRoute : ActivatedRoute = inject( ActivatedRoute );

    private notification : NotificationService = inject( NotificationService );

    importDialogDirty : WritableSignal<boolean> = signal<boolean>( false );

    readonly importTemplate : Signal<TemplateRef<any>> =
                 viewChild<TemplateRef<any>>( 'importTemplate' );

    @ViewChildren( 'lessonRef' ) lessonRef! : QueryList<ElementRef>;

    originalValueLesson! : Partial<lesson>;

    listClassSessionContent : ClassSessionContent[] = [];

    get donviId () : number {
        return this.auth.user.donvi_id;
    }

    html                                                                                                   = '';
    editor : Editor;
    course : Course;
    listCourseLesson : Pick<CourseLesson , 'id' | 'course_id' | 'title' | 'ordering' | 'parent_id'>[]      = [];
    listCourseLessonUnset : Pick<CourseLesson , 'id' | 'course_id' | 'title' | 'ordering' | 'parent_id'>[] = [];
    listCourseLessonPlan : CourseLessonPlan[]                                                              = [];
    headingLoad : string                                                                                   = 'Loading...';
    toolbar                                                                                                = [
        [ 'bold' , 'italic' , 'underline' ] ,
        [ 'heading' , 'blockquote' , 'code' , 'ordered_list' , 'bullet_list' ] ,
        [ 'link' ] ,
        [ 'text_color' , 'background_color' ] ,
        [ 'align_left' , 'align_center' , 'align_right' , 'align_justify' ]
    ] as Toolbar;

    activeTab : number = 0;

    private getDefaultLesson () : lesson {
        return {
            indexLesson           : -1 ,
            idClassSession        : -1 ,
            indexContentLesson    : -1 ,
            classSession          : null ,
            lecture_format_extend : [] ,
            oderingLesson         : null ,
            activities            : null ,
            lectureLesson         : [] ,
            lectureLessonUpdate   : [] ,
            allWord               : [] ,
            allGrammar            : []
        };
    }

    valueLesson : lesson = this.getDefaultLesson();

    listActivities : ClassActivity[];

    listTeacher : Employee[] = [];

    dataClasses : ClassRelative;

    dataTableBaiGiang : IctuDataTable<ClassSessionRelative> =
        new IctuDataTable<ClassSessionRelative>();

    isPlayingIndex : number = null;

    currentAudio : HTMLAudioElement = null;

    private classesService : ClassesService = inject( ClassesService );

    private classSessionservice : ClassSessionService =
                inject( ClassSessionService );

    private classSessionContentservice : ClassSessionContentService = inject(
        ClassSessionContentService
    );

    private activitiesService : ClassActivitiesService = inject(
        ClassActivitiesService
    );

    private wordsService : WordsService = inject( WordsService );

    private grammarService : GrammarService = inject( GrammarService );

    private fileService : IctuFileService =
                inject<IctuFileService>( IctuFileService );

    constructor ( private sanitizer : DomSanitizer ) {
    }

    private fb : FormBuilder = inject( FormBuilder );

    private formField ( path : keyof ClassActivity ) : AbstractControl {
        return this.formControl.formGroup.get( path );
    }

    formControl : IctuFormControl2<ClassActivity> =
        new IctuFormControl2<ClassActivity>( {
            dropdownFields : [] ,
            formGroup      : this.fb.group( {
                comment : [ '' ]
            } ) ,
            objectName     : '' ,
            drawer         : null
        } );

    ngOnInit () : void {
        this.state.set( 'loading' );
        this.editor = new Editor();
        if ( ! this.auth.userHasRole( [ 'teaching_assistant' ] ) ) {
            this.state.set( 'unauthorized' );
        }
        else {
            const dataID : number =
                      this.activatedRoute.snapshot.queryParamMap.has( 'id' )
                      ? parseInt(
                          this.activatedRoute.snapshot.queryParamMap.get( 'id' ) ,
                          10
                      )
                      : NaN;
        }
        this.preload().subscribe( {
            next  : () => {
                this.loadData( true );
            } ,
            error : () => {
                this.state.set( 'error' );
            }
        } );
    }

    preload () : Observable<ClassRelative> {
        this.headingLoad = 'Loading...';
        this.state.set( 'loading' );
        return this.dataClasses
               ? of( this.dataClasses )
               : this.classesService.query(
                [
                    {
                        conditionName : 'id' ,
                        value         : this.class_id().toString() ,
                        condition     : IctuQueryCondition.equal
                    }
                ] ,
                {
                    with : 'course,teachers'
                }
            ).pipe(
                map( ( res : DtoObject<ClassRelative[]> ) : ClassRelative => {
                    this.course = res.data[ 0 ].course ?? null;
                    if ( res.data[ 0 ] ) {
                        this.listTeacher = res.data[ 0 ].teachers;
                    }
                    return res[ 0 ];
                } )
            );
    }

    loadData ( isSetLessonPlan? : boolean ) {
        this.headingLoad = 'Loading...';
        this.state.set( 'loading' );
        forkJoin<[ DtoObject<ClassSessionContent[]> , DtoObject<ClassSession[]> , DtoObject<ClassActivity[]> ]>( [
            this.classSessionContentservice.query( [
                {
                    conditionName : 'class_id' ,
                    value         : this.class_id().toString() ,
                    condition     : IctuQueryCondition.equal
                }
            ] , {
                limit      : -1 ,
                paged      : 1 ,
                include    : this.donviId ,
                include_by : 'donvi_id'
            } ) ,
            this.classSessionservice.query(
                [
                    {
                        conditionName : 'course_id' ,
                        value         : this.course.id.toString() ,
                        condition     : IctuQueryCondition.equal ,
                        orWhere       : 'and'
                    } ,
                    {
                        conditionName : 'class_id' ,
                        value         : this.class_id().toString() ,
                        condition     : IctuQueryCondition.equal ,
                        orWhere       : 'and'
                    } ,
                    {
                        conditionName : 'parent_class_id' ,
                        value         : this.class_id().toString() ,
                        condition     : IctuQueryCondition.equal ,
                        orWhere       : 'or'
                    } ,
                    {
                        conditionName : 'course_id' ,
                        value         : this.course.id.toString() ,
                        condition     : IctuQueryCondition.equal ,
                        orWhere       : 'and'
                    }
                ] ,
                {
                    limit : -1 ,
                    paged : 1 ,
                    with  : 'teacher,course_lesson,course_lesson_plan'
                }
            ) ,
            this.activitiesService.query(
                [
                    {
                        conditionName : 'class_id' ,
                        condition     : IctuQueryCondition.equal ,
                        value         : this.class_id().toString() ,
                        orWhere       : 'and'
                    } ,
                    {
                        conditionName : 'type' ,
                        condition     : IctuQueryCondition.equal ,
                        value         : 'NHAN_XET' ,
                        orWhere       : 'and'
                    } ,
                    {
                        conditionName : 'created_by' ,
                        condition     : IctuQueryCondition.equal ,
                        value         : this.auth.user.id.toString() ,
                        orWhere       : 'and'
                    }
                ] ,
                {
                    limit      : -1 ,
                    paged      : 1 ,
                    include    : this.donviId ,
                    include_by : 'donvi_id'
                }
            )
        ] ).pipe(
            map(
                ( [ classSessionsContent , classSessions , classActivities ] : [
                    DtoObject<ClassSessionContent[]> ,
                    DtoObject<ClassSessionAdditional[]> ,
                    DtoObject<ClassActivity[]>
                ] ) => {
                    return {
                        classSessionsContent : classSessionsContent.data ,
                        classSessions        : classSessions.data ,
                        classActivities      : classActivities.data
                    };
                }
            )
        ).subscribe( {
            next  : ( { classSessionsContent , classSessions , classActivities } ) => {
                this.dataTableBaiGiang.fillData( classSessions );
                if ( isSetLessonPlan ) {
                    this.listCourseLesson     = classSessions.map( ( e ) => e.course_lesson );
                    this.listCourseLessonPlan = classSessions.filter( Boolean ).map( ( e ) => {
                        return e.course_lesson_plan
                    } );
                }
                this.listClassSessionContent = classSessionsContent;
                this.listActivities          = classActivities;
                this.sortListClassLesson();
                if ( this.class_session_id() != 0 ) {
                    this.valueLesson.idClassSession = this.class_session_id();
                }
                else {
                    const firstStatus0              = this.dataTableBaiGiang.data().find( ( item ) => item.status != 2 );
                    this.valueLesson.idClassSession = firstStatus0.id;
                }
                this.state.set( 'success' );
                this.setLessonSelect();
                setTimeout( () => {
                    this.scrollToLessonAfterLoad(
                        this.valueLesson.idClassSession
                    );
                } );
            } ,
            error : () => {
                this.state.set( 'error' );
            }

        } );

    }

    setLessonSelect () : void {
        const lesson      = this.dataTableBaiGiang.data().find( ( item ) => item.id == this.valueLesson.idClassSession );
        const indexLesson = this.dataTableBaiGiang.data().findIndex( ( item ) => item.id == this.valueLesson.idClassSession );
        this.selectLesson(
            indexLesson ,
            this.getCourseLessonPlan( lesson.course_lesson_id ) ,
            this.valueLesson.idClassSession ,
            lesson
        );
    }

    sortListClassLesson () : void {
        const compareValues = this.dataTableBaiGiang.data().sort( ( a , b ) => a.ordering - b.ordering );
        ;
        // for (let i = 0; i < tam.length; i++) {
        //     if (tam[i].course_lesson_id == 0) {
        //         tam[i].course_lesson_id = this.listCourseLessonUnset[0].id;
        //         break;
        //     }
        // }
        this.dataTableBaiGiang.fillData( compareValues );
    }

    generateCommentList ( data : CourseLectureFormat[] ) : ContentComment[] {
        return data.map( ( item ) => ( {
            title   : item.title ,
            slug    : item.slug ,
            comment : ''
        } ) );
    }

    selectLesson (
        index : number ,
        lesson : CourseLessonPlan ,
        idClassSession : number ,
        classSession : ClassSession
    ) {
        this.state.set( 'loading' );
        this.valueLesson              = this.getDefaultLesson();
        this.valueLesson.classSession = classSession;
        if ( index != this.valueLesson.indexLesson ) {
            this.valueLesson.idClassSession     = idClassSession;
            this.valueLesson.indexLesson        = index;
            this.valueLesson.oderingLesson      = classSession.ordering;
            this.valueLesson.indexContentLesson = 0;
            if ( classSession.course_lesson_id != 0 ) {
                for ( let item of this.course.lecture_format ) {
                    this.valueLesson.lecture_format_extend.push( {
                        ... item ,
                        isViewAdditional : false
                    } );
                    const existed : CourseLessonPlanContentItem =
                              lesson.content.find( ( c : any ) => c.slug === item.slug );
                    const pushed : CourseLessonPlanContentItem  = {
                        fileID     : item.fileID ?? 0 ,
                        totalPages : item.totalPages ?? 0 ,
                        order      : item.order ,
                        title      : item.title ,
                        slug       : item.slug ,
                        type       : item.type ,
                        content    : existed?.content ?? '' ,
                        page       : existed?.page
                                     ? existed.page
                                     : { start : 0 , end : 0 , id_file : 0 } ,
                        words      : existed?.words ? [ ... existed.words ] : [] ,
                        grammars   : existed?.grammars ? [ ... existed.grammars ] : []
                    };
                    this.valueLesson.lectureLesson.push( pushed );
                }

                // const tam: ClassSessionContent = this.listClassSessionContent.find(
                //     (item: ClassSessionContent): boolean =>
                //         item.course_lesson_id ===
                //         this.valueLesson.classSession.course_lesson_id
                // );
                // for (let item of this.course.lecture_format) {
                //     let existed: CourseLessonPlanContentItem = null;
                //     if (tam) {
                //         existed = tam.content.find(
                //             (c: any): boolean => c.slug === item.slug
                //         );
                //     }
                //     const pushed: CourseLessonPlanContentItem = {
                //         fileID: item.fileID ?? 0,
                //         totalPages: item.totalPages ?? 0,
                //         order: item.order,
                //         title: item.title,
                //         slug: item.slug,
                //         type: item.type,
                //         content: existed?.content ?? '',
                //         page: existed?.page
                //             ? existed.page
                //             : { start: 0, end: 0, id_file: 0 },
                //         words: existed?.words ? [...existed.words] : [],
                //         grammars: existed?.grammars ? [...existed.grammars] : [],
                //     };
                //     this.valueLesson.lectureLessonUpdate.push(pushed);
                // }
                for ( let item of this.valueLesson.lectureLesson ) {
                    if ( item.type == 'VOCABULARY' ) {
                        if ( item.words.length != 0 ) {
                            this.loadWord( item.words ).subscribe( {
                                next  : ( data : Word[] ) : void => {
                                    item.wordLECTURE = data;
                                } ,
                                error : () : void => {
                                    this.state.set( 'error' );
                                }
                            } );
                        }
                        else {
                            item.wordLECTURE = [];
                        }
                    }
                    else if ( item.type == 'EXAMPLE_SENTENCES' ) {
                        if ( item.grammars.length != 0 ) {
                            this.loadGrammar( item.grammars ).subscribe( {
                                next  : ( data : Grammar[] ) : void => {
                                    item.grammarLecture = data;
                                } ,
                                error : () : void => {
                                    this.state.set( 'error' );
                                }
                            } );
                        }
                        else {
                            item.grammarLecture = [];
                        }
                    }
                }
                if ( this.getAllIdWord( 'word' ).length != 0 ) {
                    this.loadWord( this.getAllIdWord( 'word' ) ).subscribe( {
                        next  : ( data : Word[] ) : void => {
                            this.valueLesson.allWord = data;
                        } ,
                        error : () : void => {
                            this.state.set( 'error' );
                        }
                    } );
                }
                else {
                    this.valueLesson.allWord = [];
                }
                if ( this.getAllIdWord( 'grammar' ).length != 0 ) {
                    this.loadGrammar( this.getAllIdWord( 'grammar' ) ).subscribe( {
                        next  : ( data : Grammar[] ) : void => {
                            this.valueLesson.allGrammar = data;
                        } ,
                        error : () : void => {
                            this.state.set( 'error' );
                        }
                    } );
                }
                else {
                    this.valueLesson.allGrammar = [];
                }
            }
        }
        else {
            this.valueLesson = this.getDefaultLesson();
        }

        const activities = this.listActivities.find(
            ( item ) => item.class_session_id == this.valueLesson.idClassSession
        );
        if ( activities ) {
            this.valueLesson.activities = activities;
        }

        // if ( activities ) {
        // 	this.valueLesson.activities = activities;
        // }
        // else {
        // 	this.valueLesson.activities = {
        // 		id      : 0 ,
        // 		type    : 'NHAN_XET' ,
        // 		content : this.generateCommentList( this.course.lecture_format )
        // 	} as ClassActivity;
        // }
        // this.formControl.formGroup.reset( {
        // 	content : this.valueLesson.activities.content ? this.valueLesson.activities.content.find(
        // 		( item ) =>
        // 			item.slug == this.valueLesson.slugStructureSelected
        // 	).comment : ''
        // } );
        this.formControl.formGroup.reset( {
            comment : this.valueLesson.activities
                      ? this.valueLesson.activities.comment
                      : ''
        } );
        this.state.set( 'success' );
    }

    isDone ( item : ClassSession ) : boolean {
        if ( item.status == 2 ) {
            return true;
        }
        else {
            return false;
        }
    }

    getSafeHtmlContent ( str : string ) {
        const raw   = str;
        const fixed = raw.replace( /\\"/g , '"' );
        return this.sanitizer.bypassSecurityTrustHtml( fixed );
    }

    // getContentViewValueEditor ( isUpdate : boolean ) {
    // 	let result = '';
    // 	if ( isUpdate ) {
    // 		let tam = '';
    // 		try {
    // 			tam = this.valueLesson.structureLessonUpdate.find(
    // 				( item ) =>
    // 					item.slug == this.valueLesson.slugStructureSelected
    // 			).content;
    // 		}
    // 		catch ( e ) {
    // 			tam = '';
    // 		}
    // 		result = tam;
    // 	}
    // 	else {
    // 		result = this.valueLesson.structureLessonSelect.content;
    // 	}
    // 	return this.getSafeHtmlContent( result );
    // }

    getDataLectureLessonUpdate ( teacher_id : number ) : void {
    }

    reload ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.preload().subscribe( {
            next  : () => {
                this.loadData();
            } ,
            error : () => {
                this.state.set( 'error' );
            }
        } );
    }

    setOriginalValue () : void {
        this.originalValueLesson = {
            oderingLesson : this.valueLesson.oderingLesson ,
            lectureLesson : this.valueLesson.lectureLesson
        };
    }

    submitComment () : void {
        this.headingLoad = 'Đang cập nhật...';
        this.state.set( 'loading' );
        // this.updateContentFormFieldBySlug();
        const info : Partial<ClassActivity> = {
            class_id         : this.class_id() ,
            class_session_id : this.class_session_id() ,
            type             : 'NHAN_XET' ,
            // content: this.valueLesson.activities.content,
            comment  : this.formField( 'comment' ).value ,
            donvi_id : this.donviId
        };
        const requests                      = ! this.valueLesson.activities
                                              ? this.activitiesService.create( info )
                                              : this.activitiesService.update(
                this.valueLesson.activities.id ,
                info
            );
        requests.subscribe( {
            next  : () => {
                this.notification.toastSuccess(
                    'Nhận xét thành công' ,
                    'Thông báo'
                );
                this.loadData();
            } ,
            error : () => {
                this.state.set( 'success' );
                this.notification.toastError(
                    'Nhận xét không thành công' ,
                    'Thông báo'
                );
            }
        } );
    }

    onChangePage ( paged : number ) : void {
        this.valueLesson = this.getDefaultLesson();
        this.loadData();
    }

    deleteRow ( id : number ) : void {
        this.requestDeletingData( [ id ] );
    }

    private requestDeletingData ( ids : number[] ) : void {
        this.notification.confirmDelete( ids.length ).pipe(
            filter( ( confirm : boolean ) : boolean => confirm ) ,
            map(
                () : IctuDeletingAnimationControl<ClassSession> =>
                    new IctuDeletingAnimationControl(
                        ids ,
                        this.classSessionservice
                    )
            ) ,
            switchMap(
                (
                    deleteController : IctuDeletingAnimationControl<ClassSession>
                ) : Observable<boolean> => {
                    deleteController.run();
                    return this.notification.startDeleting(
                        deleteController.progress
                    );
                }
            )
        ).subscribe( {
            next  : ( success : boolean ) : void => {
                if ( success ) {
                    this.notification.toastSuccess( 'Xóa thành công' );
                }
                this.loadData();
            } ,
            error : () : void => {
                this.notification.toastError( 'Xóa thất bại' );
            }
        } );
    }

    getTitleClassSession ( course_lesson_id : number ) : string {
        const result = this.listCourseLesson.find(
            ( item ) => item.id == course_lesson_id
        );
        return result ? result.title : '';
    }

    getCourseLessonPlan ( course_lesson_id : number ) : CourseLessonPlan {
        const result = course_lesson_id != 0 ? this.listCourseLessonPlan.find(
            ( item ) => item?.course_lessons_id == course_lesson_id
        ) : null;
        return result;
    }

    loadWord ( listWordLecture : number[] ) : Observable<Word[]> {
        this.state.set( 'loading' );
        const stringWord =
                  listWordLecture.length != 0 ? listWordLecture.join( ',' ) : '-1';
        return this.wordsService.load( stringWord , this.donviId ).pipe(
            map( ( res : DtoObject<Word[]> ) : Word[] => {
                return res.data;
            } )
        );
    }

    getConversationText ( item : Grammar ) : string {
        return item.response
               ? `${ item.prompt } - ${ item.response }`
               : item.prompt;
    }

    loadGrammar ( listIds : number[] ) : Observable<Grammar[]> {
        const stringWord = listIds.length != 0 ? listIds.join( ',' ) : '-1';
        return this.grammarService.load( stringWord , this.donviId ).pipe(
            map( ( res : DtoObject<Grammar[]> ) : Grammar[] => {
                return res.data;
            } )
        );
    }

    getTeacherUpdateLecture ( lecture_format : CourseLectureFormat ) : Employee[] {
        let result : Employee[] = [];
        for ( let teacher of this.listTeacher ) {
            const classSessionUpdate : ClassSessionContent =
                      this.listClassSessionContent.find(
                          ( item : ClassSessionContent ) : boolean =>
                              item.course_lesson_id ===
                              this.valueLesson.classSession.course_lesson_id &&
                              item.created_by == teacher.user_id
                      );
            if ( classSessionUpdate ) {
                const lectureUpdate = classSessionUpdate.content.find(
                    ( item ) => item.slug == lecture_format.slug
                );
                if (
                    lecture_format.type != 'EXCERPT_FROM_DOCUMENT' &&
                    lecture_format.type != 'LINK'
                ) {
                    if ( lecture_format.type == 'TEXT' ) {
                        if (
                            lectureUpdate.content &&
                            lectureUpdate.content != ''
                        ) {
                            result.push( teacher );
                        }
                    }
                    else if ( lecture_format.type == 'EXAMPLE_SENTENCES' ) {
                        if ( lectureUpdate.grammars.length != 0 ) {
                            result.push( teacher );
                        }
                    }
                    else if ( lecture_format.type == 'VOCABULARY' ) {
                        if ( lectureUpdate.words.length != 0 ) {
                            result.push( teacher );
                        }
                    }
                }
            }
        }
        return result;
    }

    getLectureUpdateByTeacher (
        user_id_teacher : number ,
        slug : string
    ) : CourseLessonPlanContentItemExtend {
        let result : CourseLessonPlanContentItemExtend[] = [];
        const classSessionUpdate : ClassSessionContent   =
                  this.listClassSessionContent.find(
                      ( item : ClassSessionContent ) : boolean =>
                          item.course_lesson_id ===
                          this.valueLesson.classSession.course_lesson_id &&
                          item.created_by == user_id_teacher
                  );
        for ( let item of this.course.lecture_format ) {
            let existed : CourseLessonPlanContentItem = null;
            if ( classSessionUpdate ) {
                existed = classSessionUpdate.content.find(
                    ( c : any ) : boolean => c.slug === item.slug
                );
            }
            const pushed : CourseLessonPlanContentItem = {
                fileID     : item.fileID ?? 0 ,
                totalPages : item.totalPages ?? 0 ,
                order      : item.order ,
                title      : item.title ,
                slug       : item.slug ,
                type       : item.type ,
                content    : existed?.content ?? '' ,
                page       : existed?.page
                             ? existed.page
                             : { start : 0 , end : 0 , id_file : 0 } ,
                words      : existed?.words ? [ ... existed.words ] : [] ,
                grammars   : existed?.grammars ? [ ... existed.grammars ] : []
            };
            result.push( pushed );
        }
        const lectureResult : CourseLessonPlanContentItemExtend = result.find(
            ( item ) => item.slug == slug
        );
        if ( lectureResult.type == 'VOCABULARY' ) {
            if ( lectureResult.words.length != 0 ) {
                lectureResult.wordLECTURE = this.valueLesson.allWord.filter(
                    ( item ) => lectureResult.words.includes( item.id )
                );
            }
            else {
                return lectureResult;
            }
        }
        else if ( lectureResult.type == 'EXAMPLE_SENTENCES' ) {
            if ( lectureResult.grammars.length != 0 ) {
                lectureResult.grammarLecture =
                    this.valueLesson.allGrammar.filter( ( item ) =>
                        lectureResult.grammars.includes( item.id )
                    );
            }
            else {
                lectureResult.grammarLecture = [];
            }
        }

        return lectureResult;
    }

    toggleAudio ( url : string , index : number ) {
        if ( ! url ) return;
        if ( this.isPlayingIndex === index && this.currentAudio ) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.isPlayingIndex           = null;
            return;
        }
        if ( this.currentAudio ) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        this.currentAudio = new Audio( url );
        this.currentAudio.play();
        this.isPlayingIndex       = index;
        this.currentAudio.onended = () => {
            this.isPlayingIndex = null;
        };
    }

    scrollToLessonAfterLoad ( lessonId : number ) {
        if ( ! this.lessonRef ) return;

        const index = this.dataTableBaiGiang.data().findIndex( ( item ) => item.id === lessonId );
        if ( index < 0 ) return;
        const scroll = () => {
            const el = this.lessonRef.toArray()[ index ];
            if ( el ) {
                el.nativeElement.scrollIntoView( {
                    behavior : 'smooth' ,
                    block    : 'center'
                } );
            }
        };
        if ( this.lessonRef.toArray().length > index ) {
            scroll();
        }
        else {
            const sub = this.lessonRef.changes.subscribe( () => {
                if ( this.lessonRef.toArray().length > index ) {
                    scroll();
                    sub.unsubscribe();
                }
            } );
        }
    }

    setValueDialog (
        titleLecture : string ,
        type_view : LectureType ,
        link : string ,
        form_document? : CourseLessonPlanContentPageItem
    ) : void {
        this.type_view    = type_view;
        this.titleLecture = titleLecture;
        if ( type_view == 'LINK' ) {
            if ( link != '' ) {
                this.link          = link;
                this.visibleDialog = true;
            }
            else {
                this.notification.toastError( 'Chưa có tài liệu' , 'Thông báo' );
            }
        }
        else {
            if (
                form_document.id_file !== 0 ||
                form_document.start !== 0 ||
                form_document.end !== 0
            ) {
                this.form_document = form_document;
                this.visibleDialog = true;
            }
            else {
                this.notification.toastError(
                    'Tài liệu chưa được trích xuất' ,
                    'Thông báo'
                );
            }
        }
    }

    setSrcAudio ( file : any ) : string {
        const result = ! file
                       ? ''
                       : this.fileService.fileHostingServiceApi +
                         'file/' +
                         file.id +
                         '?token=' +
                         tokenGetter();

        return result;
    }

    setViewAdditional ( index : number , teacher : Employee ) {
        this.valueLesson.lecture_format_extend[ index ].isViewAdditional =
            ! this.valueLesson.lecture_format_extend[ index ].isViewAdditional;
        if ( this.valueLesson.lecture_format_extend[ index ].isViewAdditional ) {
            this.valueLesson.lecture_format_extend[ index ].teacher_select =
                teacher;
        }
        else {
            this.valueLesson.lecture_format_extend[ index ].teacher_select = null;
        }
    }

    getViewAdditional ( index : number ) {
        return this.valueLesson.lecture_format_extend[ index ].isViewAdditional;
    }

    onTabChange ( value : any ) {
        this.activeTab = value;
    }

    getAllIdWord ( type : string ) : number[] {
        return Array.from(
            new Set(
                this.listClassSessionContent.flatMap( ( item ) => item.content ).filter( ( c ) =>
                    Array.isArray( type == 'word' ? c.words : c.grammars )
                ).flatMap( ( c ) => ( type == 'word' ? c.words : c.grammars ) )
            )
        );
    }

    ngOnDestroy () : void {
        this.editor.destroy();
        this.destroy$.next();
        this.destroy$.complete();
    }
}
