import { Component , computed , inject , input , InputSignal , model , ModelSignal , OnDestroy , OnInit , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { ClassPlanningAnimationLoading , ClassPlanningChildComponent , ClassPlanningRole } from '@pages/class-planning/class-planning.component';
import { MatDrawer , MatDrawerContainer , MatDrawerContent , MatDrawerMode } from '@angular/material/sidenav';
import { BreakpointObserver , BreakpointState } from '@angular/cdk/layout';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { AppState } from '@models/app-state';
import { Class , ClassLesson , classLesson2Extend , ClassLessonExtend , ClassRelative , normalizeClassLesson } from '@models/class';
import { Course , CourseLectureFormat } from '@models/course';
import { CourseLesson , courseLessons2ClassLessons } from '@models/course-lesson';
import { debounceTime , distinctUntilChanged , map , merge , Observable , of , Subject , switchMap , takeUntil , timer } from 'rxjs';
import { CoursesService } from '@services/course.service';
import { CoursesLessonService } from '@services/course-lesson.service';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { ClassesService } from '@services/classes.service';
import { AuthenticationService } from '@services/authentication.service';
import { ClassSession } from '@models/class-session';
import { ClassSessionService } from '@services/class-session.service';
import { DatePipe , NgClass } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { CdkDrag , CdkDragDrop , CdkDragHandle , CdkDropList , moveItemInArray } from '@angular/cdk/drag-drop';
import { NotificationService } from '@services/notification.service';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { state , style , trigger } from '@angular/animations';
import { Tooltip } from 'primeng/tooltip';
import { ClassLectureService } from '@services/class-lecture.service';
import { ClassLecture } from '@models/class-lecture';
import { CoursesLessonPlanService } from '@services/course-lesson-plan.service';
import { CourseLessonPlan , CourseLessonPlanContentItem } from '@models/course-lesson-plan';
import { ComingSoonComponent } from '@components/coming-soon/coming-soon.component';
import { FormsModule } from '@angular/forms';
import { MatMenu , MatMenuContent , MatMenuTrigger } from '@angular/material/menu';
import { ClassPlanningCurriculumAttendance } from '@pages/class-planning/children/class-planning-curriculum/children/class-planning-curriculum-attendance/class-planning-curriculum-attendance';
import { ClassPlanningCurriculumActivities } from '@pages/class-planning/children/class-planning-curriculum/children/class-planning-curriculum-activities/class-planning-curriculum-activities';
import { joinSources } from '@utilities/join-sources';
import { EmployeeCardComponent } from '@components/employee-card/employee-card.component';
import { cloneDeep , isArray } from 'lodash-es';
import { Dialog } from 'primeng/dialog';
import { ClassPlanningCurriculumAddNewComponent } from '@pages/class-planning/children/class-planning-curriculum/children/class-planning-curriculum-add-new/class-planning-curriculum-add-new.component';
import { ClassPlanningCurriculumLectureComponent } from '@pages/class-planning/children/class-planning-curriculum/children/class-planning-curriculum-lecture/class-planning-curriculum-lecture.component';
import { ClassLessonExtendLabelPipe } from '@pages/class-planning/children/class-planning-curriculum/pipes/class-lesson-extend-label.pipe';
import { v4 as uuid4 } from 'uuid';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';
import { MatTooltip } from '@angular/material/tooltip';
import { MatProgressBar } from '@angular/material/progress-bar';

export interface SynchronizeAnimation {
    enable : boolean,
    percent : number,
}

export interface CourseLessonChapter extends CourseLesson {
    children : CourseLesson[];
}

type ClassLessonContentTab = 'lecture' | 'checkin' | 'activities' | 'documents' | 'test';

export interface ClassLessonLectureContent extends CourseLessonPlanContentItem {
    _teacherPost : string;
}

type TeachingAssignmentMethod = 'AUTO_50_50' | 'MANUALLY';

interface LoadDataDto {
    course : Course;
    courseLessons : CourseLesson[];
    classSessions : ClassSession[];
}

type ClassLessonUpdateInfo = Pick<Class , 'curriculum' | 'sync_required' | 'duration'>

interface ClassLessonUpdateResponse {
    info : ClassLessonUpdateInfo;
    classCurriculums : ClassLessonExtend[]
}

@Component( {
    selector    : 'class-planning-curriculum' ,
    imports : [ MatDrawerContainer , MatDrawer , MatDrawerContent , LoadingProgressComponent , NgClass , MatButton , CdkDropList , CdkDrag , Tooltip , ComingSoonComponent , FormsModule , MatMenu , MatMenuContent , MatMenuTrigger , ClassPlanningCurriculumAttendance , ClassPlanningCurriculumActivities , CdkDragHandle , EmployeeCardComponent , Dialog , ClassPlanningCurriculumAddNewComponent , ClassPlanningCurriculumLectureComponent , ClassLessonExtendLabelPipe , EmployeePhotoPipe , MatTooltip , DatePipe , MatProgressBar ] ,
    templateUrl : './class-planning-curriculum.component.html' ,
    styleUrl    : './class-planning-curriculum.component.css' ,
    animations  : [
        trigger( 'btnToggleSidebar' , [
            state( 'collapsed' , style( {
                'left'       : 'calc( (-1 * var(--btn-toggle-size-bar-width)) - 5px)' ,
                'opacity'    : '0' ,
                'visibility' : 'hidden'
            } ) ) ,
            state( 'opened' , style( {
                'left'       : '0' ,
                'opacity'    : '1' ,
                'visibility' : 'visible'
            } ) )
        ] )
    ]
} )
export class ClassPlanningCurriculumComponent implements OnInit , OnDestroy , ClassPlanningChildComponent {

    classObject : ModelSignal<Class> = model.required<Class>();

    course : ModelSignal<Course> = model.required<Course>();

    role : InputSignal<ClassPlanningRole> = input.required<ClassPlanningRole>();

    animationLoading : ModelSignal<ClassPlanningAnimationLoading> = model.required<ClassPlanningAnimationLoading>();

    protected readonly classID : Signal<number> = computed( () : number => this.classObject()?.id ?? 0 );

    private readonly courseID : Signal<number> = computed( () : number => this.classObject()?.course_id ?? 0 );

    private readonly notification : NotificationService = inject( NotificationService );

    private readonly auth : AuthenticationService = inject( AuthenticationService );

    private readonly classesService : ClassesService = inject( ClassesService );

    private readonly coursesService : CoursesService = inject( CoursesService );

    private readonly coursesLessonService : CoursesLessonService = inject( CoursesLessonService );

    private readonly coursesLessonPlanService : CoursesLessonPlanService = inject( CoursesLessonPlanService );

    private readonly classLectureService : ClassLectureService = inject( ClassLectureService );

    private readonly classSessionService : ClassSessionService = inject( ClassSessionService );

    protected readonly drawerMode : WritableSignal<MatDrawerMode> = signal( 'side' );

    private readonly breakpointObserver : BreakpointObserver = inject( BreakpointObserver );

    protected readonly sidebar : Signal<MatDrawer | undefined> = viewChild<MatDrawer>( MatDrawer );

    protected readonly state : WritableSignal<AppState> = signal<AppState>( 'loading' );

    readonly courseLessons : WritableSignal<CourseLesson[]> = signal( null );

    protected readonly classSessions : WritableSignal<ClassSession[]> = signal( [] );

    private readonly animation : WritableSignal<SynchronizeAnimation> = signal<SynchronizeAnimation>( { enable : false , percent : 0 } );

    protected readonly enableAnimation : Signal<boolean> = computed( () : boolean => this.animation().enable );

    protected readonly animationPercent : Signal<number> = computed( () : number => this.animation().percent );

    protected readonly classCurriculums : WritableSignal<ClassLessonExtend[]> = signal( [] );

    protected readonly dirty : WritableSignal<boolean> = signal( false );

    protected readonly isEmpty : Signal<boolean> = computed( () : boolean => this.state() === 'success' && ! this.classCurriculums().length );

    protected readonly lastActivatedLessonOrdering : Signal<number> = computed( () : number => this.classCurriculums().reduce( ( reducer : number , lesson : ClassLessonExtend ) : number => lesson.state.activated ? Math.max( reducer , lesson.ordering ) : reducer , 0 ) );

    protected readonly activeCourseLesson : WritableSignal<ClassLessonExtend> = signal( null );

    protected readonly activeLessonCode : Signal<string> = computed( () : string => this.activeCourseLesson()?.code ?? '' );

    private readonly destroyed$ : Subject<void> = new Subject<void>();

    private readonly requestCreatingClassCurriculumObserver$ : Subject<void> = new Subject<void>();

    private readonly donViID : Signal<number> = signal<number>( this.auth.user?.donvi_id ?? 0 );

    protected readonly toggleSidebarMode : WritableSignal<'collapsed' | 'opened'> = signal( 'collapsed' );

    protected readonly lessonContentTab : WritableSignal<ClassLessonContentTab> = signal( 'lecture' );

    protected readonly classSession : WritableSignal<ClassSession> = signal( null );

    protected readonly lessonContentState : WritableSignal<AppState> = signal( 'loading' );

    protected readonly lessonContentLoadingLbl : Signal<string> = computed( () : string => {
        switch ( this.lessonContentTab() ) {
            case 'lecture':
                return 'Tải thông tin bài giảng...';
            case 'activities':
                return 'Tải thông tin hoạt động...';
            case 'checkin':
                return 'Tải thông tin điểm danh...';
            default:
                return 'Tải thông tin...';
        }
    } );

    protected readonly classLessonContentTabLecture : WritableSignal<ClassLessonLectureContent[]> = signal( [] );

    private loadLessonContentObserver$ : Subject<void> = new Subject<void>();

    private loadLessonContent : Record<ClassLessonContentTab , () => void> = {
        activities : () : void => {
        } ,
        checkin    : () : void => {
        } ,
        lecture    : () : void => {
            if ( this.activeCourseLesson().type && [ 'other' , 'activity' ].includes( this.activeCourseLesson().type ) ) {
                this.lessonContentState.set( 'success' );
            }
            else {
                this.lessonContentState.set( 'loading' );
                joinSources<{
                    classLecture : ClassLecture,
                    courseLessonPlan : CourseLessonPlan
                }>( {
                    courseLessonPlan : this.getCourseLessonPlanByCourseLessonId( this.activeCourseLesson().course_lesson_id ) ,
                    classLecture     : this.getClassLectureByCourseLessonId( this.activeCourseLesson().course_lesson_id )
                } ).pipe(
                    takeUntil( merge( this.loadLessonContentObserver$ , this.destroyed$ ) )
                ).subscribe( {
                    next  : ( { classLecture , courseLessonPlan } : { classLecture : ClassLecture, courseLessonPlan : CourseLessonPlan } ) : void => {
                        // not done
                        const courseLectureFormat : CourseLectureFormat[]             = isArray( this.course().lecture_format ) ? cloneDeep<CourseLectureFormat[]>( this.course().lecture_format ) : [];
                        const courseLessonPlanContent : CourseLessonPlanContentItem[] = isArray( courseLessonPlan.content ) ? courseLessonPlan.content : [];
                        const uniqueSlugs : string[]                                  = [ ... new Set( [ ... courseLectureFormat.map( ( i : CourseLectureFormat ) : string => i.slug ) , ... courseLessonPlanContent.map( ( i : CourseLectureFormat ) : string => i.slug ) ] ) ];
                        this.classLessonContentTabLecture.set( uniqueSlugs.map( ( slug : string ) : ClassLessonLectureContent => {
                            const _index : number                    = courseLectureFormat.findIndex( ( i : CourseLectureFormat ) : boolean => i.slug === slug );
                            const item : CourseLessonPlanContentItem = courseLessonPlanContent.find( ( i : CourseLessonPlanContentItem ) : boolean => i.slug === slug );
                            if ( item ) {
                                if ( -1 !== _index ) {
                                    return {
                                        ... courseLectureFormat[ _index ] ,
                                        content      : item.content ,
                                        page         : item.page ,
                                        words        : item.words ,
                                        grammars     : item.grammars ,
                                        _teacherPost : null
                                    };
                                }
                                else {
                                    return { ... item , _teacherPost : null };
                                }
                            }
                            else {
                                if ( -1 !== _index ) {
                                    return {
                                        ... courseLectureFormat[ _index ] ,
                                        _teacherPost : null
                                    };
                                }
                                else {
                                    return null;
                                }
                            }
                        } ).filter( Boolean ) );
                        this.lessonContentState.set( 'success' );
                    } ,
                    error : () : void => {
                        this.lessonContentState.set( 'error' );
                    }
                } )
            }
        } ,
        documents  : () : void => {
        } ,
        test       : () : void => {
        }
    }

    protected readonly curriculumTemp : WritableSignal<ClassLesson[]> = signal( [] );

    protected readonly emptySectionState : WritableSignal<'button' | 'form'> = signal( 'button' );

    protected readonly teachingAssignmentMethod : WritableSignal<TeachingAssignmentMethod> = signal( 'AUTO_50_50' );

    protected readonly teachingAssignmentMethodLabel : Record<TeachingAssignmentMethod , string> = {
        AUTO_50_50 : 'Chia đều đan xen' ,
        MANUALLY   : 'Thủ công'
    }

    protected visibleAddClassLessonDialog : boolean = false;

    private removeClassCurriculumObserver : Subject<string> = new Subject<string>();

    readonly confirmDeleteElement : WritableSignal<string> = signal( '' );

    constructor () {
        toObservable( this.sidebar ).pipe(
            takeUntilDestroyed()
        ).subscribe( ( matDrawer : MatDrawer ) : void => {
            merge<[ boolean , boolean , boolean ]>(
                matDrawer.closedStart.pipe( map( () : boolean => false ) ) ,
                matDrawer.openedStart.pipe( map( () : boolean => true ) ) ,
                matDrawer.openedChange
            ).pipe(
                distinctUntilChanged() ,
                takeUntil( this.destroyed$ )
            ).subscribe( ( isSidebarOpened : boolean ) : void => {
                this.toggleSidebarMode.set( isSidebarOpened ? 'collapsed' : 'opened' );
            } )
        } );

        this.requestCreatingClassCurriculumObserver$.pipe(
            takeUntilDestroyed() ,
            debounceTime( 1000 )
        ).subscribe( () : void => {
            this.planClassCurriculum();
        } );

        this.breakpointObserver.observe( [ '(min-width: 1025px)' , '(max-width: 1024.98px)' ] ).pipe(
            takeUntilDestroyed()
        ).subscribe( ( result : BreakpointState ) : void => {
            if ( result.breakpoints[ '(max-width: 1024.98px)' ] ) {
                this.drawerMode.set( 'over' );
            }
            else if ( result.breakpoints[ '(min-width: 1025px)' ] ) {
                this.drawerMode.set( 'side' );
            }
        } );

        // toObservable( this.teachingAssignmentMethod ).pipe(
        // 	takeUntilDestroyed()
        // ).subscribe( ( method : TeachingAssignmentMethod ) : void => {
        // 	this.teachingAssignmentHandle( method );
        // } )

        // this.removeClassCurriculumObserver.asObservable().pipe(
        //     takeUntilDestroyed() ,
        //     debounceTime( 500 )
        // ).subscribe( ( code : string ) : void => {
        //     this.classCurriculums.update( ( _list : ClassLessonExtend[] ) : ClassLessonExtend[] => {
        //         return _list.filter( ( _lesson : ClassLessonExtend ) : boolean => _lesson.code !== code );
        //     } );
        //     this.dirty.set( true );
        // } )

        this.removeClassCurriculumObserver.asObservable().pipe(
            takeUntilDestroyed() ,
            debounceTime( 500 )
        ).subscribe( ( code : string ) : void => {
            this.confirmDeleteClassCurriculum( code );
        } )
    }

    ngOnInit () : void {
        this.loadData();
    }

    private getCourseLessonPlanByCourseLessonId ( course_lesson_id : number ) : Observable<CourseLessonPlan> {
        const conditions : IctuConditionParam[] = [
            { conditionName : 'course_lessons_id' , condition : IctuQueryCondition.equal , value : course_lesson_id.toString( 10 ) } ,
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID().toString( 10 ) , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = {
            limit  : 1 ,
            paged  : 1 ,
            select : 'id,donvi_id,course_lessons_id,content'
        };

        return this.coursesLessonPlanService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<CourseLessonPlan[]> ) : CourseLessonPlan => response.data.length ? response.data[ 0 ] : null )
        )
    }

    private getClassLectureByCourseLessonId ( course_lesson_id : number ) : Observable<ClassLecture> {
        let user_id_teacher : number = this.activeCourseLesson().relation.classSession?.teacher_id ?? 0;
        // if ( this.activeCourseLesson()._classSession?.teacher_id ) {
        // 	user_id_teacher = this.activeCourseLesson()._classSession?.teacher_id
        // }
        // else if ( this.activeCourseLesson()._classSession?.user_id_foreign_teacher ) {
        // 	user_id_teacher = this.activeCourseLesson()._classSession?.user_id_foreign_teacher
        // }
        if ( user_id_teacher ) {
            return this.classLectureService.getClassLessonLecture( {
                class_id : this.classID() ,
                donvi_id : this.donViID() ,
                user_id_teacher ,
                course_lesson_id
            } )
        }
        else {
            return of( null );
        }
    }

    private planClassCurriculum () : void {
        this.loadCourseLessons( this.courseID() ).pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( {
            next  : ( courseLessons : CourseLesson[] ) : void => {
                // const chapters : CourseLessonChapter[] = sortBy<CourseLessonChapter>( courseLessons.filter( ( i : CourseLesson ) : boolean => i.parent_id === 0 ).map( ( p : CourseLesson ) : CourseLessonChapter => {
                //     const children : CourseLesson[] = sortBy<CourseLesson>( courseLessons.filter( ( c : CourseLesson ) : boolean => c.parent_id === p.id ) , 'ordering' );
                //     return { ... p , children };
                // } ) , 'ordering' );
                // const lessons : CourseLesson[]         = chapters.reduce( ( _reducer : CourseLesson[] , item : CourseLesson ) : CourseLesson[] => {
                //     _reducer.push( ... item[ 'children' ] );
                //     return _reducer;
                // } , new Array<CourseLesson>() );
                // const curriculum : ClassLesson[]       = lessons.map( ( { id } : CourseLesson , index : number ) : ClassLesson => ( { course_lesson_id : id , teacher_id : 0 , ordering : 1 + index } ) );

                const curriculum : ClassLesson[] = courseLessons2ClassLessons( courseLessons );
                if ( this.classObject().teacher_ids.length ) {
                    this.curriculumTemp.set( curriculum );
                    this.setTeachingAssignmentMethod( 'AUTO_50_50' , true );
                    this.emptySectionState.set( 'form' );
                }
                else {
                    this.updateCurriculumToClass( curriculum );
                }
                this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : false , heading : '' } ) );
            } ,
            error : () : void => {
                this.notification.toastError( 'Khởi tạo chương trình học thất bại' );
                this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : false , heading : '' } ) );
            }
        } );
    }

    // protected updateTeachingAssignmentToCurriculum () : void {
    //     const ids : number[] = this.classObject().teacher_ids;
    //     switch ( this.teachingAssignmentMethod() ) {
    //         case 'AUTO_50_50':
    //             this.curriculumTemp.update( ( classLessons : ClassLesson[] ) : ClassLesson[] => {
    //                 return classLessons.map( ( _classLesson : ClassLesson , index : number ) : ClassLesson => {
    //                     // return { ... _classLesson , teacher_id : ( index % 2 === 0 ) ? ids[ 0 ] : ids[ 1 ] }
    //                     return { ... _classLesson , teacher_id : ids[ index % ids.length ] }
    //                 } );
    //             } );
    //             this.updateCurriculumToClass( this.curriculumTemp() );
    //             break;
    //         case 'MANUALLY':
    //             break;
    //         default:
    //             break;
    //     }
    // }

    protected btnCreateClassCurriculumsForFirstTime () : void {
        this.updateCurriculumToClass( this.curriculumTemp() );
    }

    private updateCurriculumToClass ( curriculum : ClassLesson[] ) : void {
        this.animation.set( { enable : true , percent : 0 } );
        this.classesService.update( this.classID() , { curriculum } ).pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( {
            next  : () : void => {
                this.classObject.update( ( _class : Class ) : Class => {
                    return { ... _class , curriculum };
                } );
                this.notification.toastSuccess( 'Khởi tạo chương trình học thành công' );
                this.animation.set( { enable : true , percent : 100 } );
                timer( 1000 ).pipe(
                    takeUntil( this.destroyed$ )
                ).subscribe( () : void => {
                    this.animation.set( { enable : false , percent : 0 } );
                    this.loadData();
                } )
            } ,
            error : () : void => {
                this.animation.set( { enable : false , percent : 0 } );
                this.notification.toastError( 'Khởi tạo chương trình học thất bại' );
            }
        } )
    }

    /*    private createClassCurriculum () : void {
     this.animation.set( { enable : true , percent : 0 } );
     this.loadCourseLessons( this.courseID() ).pipe(
     switchMap( ( courseLessons : CourseLesson[] ) : Observable<ClassLesson[]> => {
     const chapters : CourseLessonChapter[] = sortBy<CourseLessonChapter>( courseLessons.filter( ( i : CourseLesson ) : boolean => i.parent_id === 0 ).map( ( p : CourseLesson ) : CourseLessonChapter => {
     const children : CourseLesson[] = sortBy<CourseLesson>( courseLessons.filter( ( c : CourseLesson ) : boolean => c.parent_id === p.id ) , 'ordering' );
     return { ... p , children };
     } ) , 'ordering' );
     const lessons : CourseLesson[]         = chapters.reduce( ( _reducer : CourseLesson[] , item : CourseLesson ) : CourseLesson[] => {
     _reducer.push( ... item[ 'children' ] );
     return _reducer;
     } , new Array<CourseLesson>() );
     const curriculum : ClassLesson[]       = lessons.map( ( { id } : CourseLesson , index : number ) : ClassLesson => ( { course_lesson_id : id , teacher_id : 0 , ordering : 1 + index } ) );
     return this.classesService.update( this.classID() , { curriculum } ).pipe( map( () : ClassLesson[] => curriculum ) )
     } ) ,
     takeUntil( this.destroyed$ )
     ).subscribe( {
     next  : ( curriculum : ClassLesson[] ) : void => {
     this.classObject.update( ( _class : Class ) : Class => {
     return { ... _class , curriculum };
     } );
     this.notification.toastSuccess( 'Khởi tạo chương trình học thành công' );
     this.animation.set( { enable : true , percent : 100 } );
     timer( 1000 ).pipe(
     takeUntil( this.destroyed$ )
     ).subscribe( () : void => {
     this.animation.set( { enable : false , percent : 0 } );
     this.loadData();
     } )
     } ,
     error : () : void => {
     this.animation.set( { enable : false , percent : 0 } );
     this.notification.toastError( 'Khởi tạo chương trình học thất bại' );
     }
     } );
     }*/

    private loadCourseLessons ( course_id : number ) : Observable<CourseLesson[]> {
        if ( this.courseLessons() ) {
            return of( this.courseLessons() );
        }

        const conditions : IctuConditionParam[] = [
            { conditionName : 'course_id' , condition : IctuQueryCondition.equal , value : course_id.toString() } ,
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID().toString() , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = {
            limit : -1 ,
            paged : 1
        };
        return this.coursesLessonService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<CourseLesson[]> ) : CourseLesson[] => {
                this.courseLessons.set( response.data );
                return response.data;
            } )
        )
    }

    private loadCourse ( course_id : number ) : Observable<Course> {
        if ( this.course() ) {
            return of( this.course() );
        }
        const conditions : IctuConditionParam[] = [
            { conditionName : 'id' , condition : IctuQueryCondition.equal , value : course_id.toString() } ,
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID().toString() , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = {
            limit : 1 ,
            paged : 1
        };
        return this.coursesService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<Course[]> ) : Course => {
                if ( response.data.length ) {
                    this.course.set( response.data[ 0 ] );
                }
                return this.course();
            } )
        )
    }

    private loadClassSessions ( class_id : number , course_id : number ) : Observable<ClassSession[]> {
        const conditions : IctuConditionParam[] = [
            { conditionName : 'class_id' , condition : IctuQueryCondition.equal , value : class_id.toString() } ,
            { conditionName : 'course_id' , condition : IctuQueryCondition.equal , value : course_id.toString() , orWhere : 'and' } ,
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID().toString() , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = {
            limit   : -1 ,
            paged   : 1 ,
            order   : 'ASC' ,
            orderby : 'time_start' ,
            with    : 'assistants,teacher'
        };
        return this.classSessionService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<ClassSession[]> ) : ClassSession[] => response.data )
        )
    }

    private loadCourseLessonsByRole () : Observable<CourseLesson[]> {
        if ( this.role() === 'teacher' ) {
            const conditions : IctuConditionParam[] = [
                {
                    conditionName : 'id' ,
                    value         : this.classID().toString( 10 ) ,
                    condition     : IctuQueryCondition.equal
                } ,
                {
                    conditionName : 'donvi_id' ,
                    value         : this.donViID().toString( 10 ) ,
                    condition     : IctuQueryCondition.equal ,
                    orWhere       : 'and'
                }
            ];
            const queryParams : IctuQueryParams     = {
                limit : 1 ,
                paged : 1 ,
                with  : 'teachers,assistants,lessons,lesson_plan'
            };
            return this.classesService.query( conditions , queryParams ).pipe(
                map( ( response : DtoObject<ClassRelative[]> ) : CourseLesson[] => response.data[ 0 ]?.lessons ?? [] )
            )
        }
        else {
            return this.loadCourseLessons( this.courseID() );
        }
    }

    private loadData () : void {
        const curriculum : ClassLesson[] = this.classObject().curriculum ? cloneDeep<ClassLesson[]>( this.classObject().curriculum ).map( normalizeClassLesson ) : [];
        if ( curriculum.length ) {
            this.state.set( 'loading' );
            this.dirty.set( false );
            joinSources<LoadDataDto>( {
                course        : this.loadCourse( this.courseID() ) ,
                courseLessons : this.loadCourseLessonsByRole() ,
                classSessions : this.loadClassSessions( this.classID() , this.courseID() )
            } ).pipe(
                takeUntil( this.destroyed$ )
                // map( ( { courseLessons , classSessions } : LoadDataDto ) : ClassLessonExtend[] => {
                //     this.courseLessons.set( courseLessons );
                //     this.classSessions.set( classSessions );
                // return curriculum.map( ( classLesson : ClassLesson ) : ClassLessonExtend => {
                //     const classSession : ClassSession       = classSessions.find( ( i : ClassSession ) : boolean => i.course_lesson_id === classLesson.course_lesson_id ) ?? null;
                //     const courseLesson : CourseLesson       = courseLessons.find( ( c : CourseLesson ) : boolean => c.id === classLesson.course_lesson_id ) ?? null;
                //     const parentCourseLesson : CourseLesson = courseLesson ? courseLessons.find( ( c : CourseLesson ) : boolean => c.id === courseLesson.parent_id ) : null
                //     return classLesson2Extend( { classLesson , classSession , courseLesson , parentCourseLesson } );
                // } );
                // } )
            ).subscribe( {
                next  : ( { courseLessons , classSessions } : LoadDataDto ) : void => {
                    const classLessons : ClassLessonExtend[] = curriculum.map( ( classLesson : ClassLesson ) : ClassLessonExtend => {
                        const classSession : ClassSession       = classSessions.find( ( _classSession : ClassSession ) : boolean => _classSession.ordering === classLesson.ordering ) ?? null;
                        const courseLesson : CourseLesson       = courseLessons.find( ( c : CourseLesson ) : boolean => c.id === classLesson.course_lesson_id ) ?? null;
                        const parentCourseLesson : CourseLesson = courseLesson ? courseLessons.find( ( c : CourseLesson ) : boolean => c.id === courseLesson.parent_id ) : null
                        return classLesson2Extend( { classLesson , classSession , courseLesson , parentCourseLesson } );
                    } );
                    this.courseLessons.set( courseLessons );
                    this.classSessions.set( classSessions );
                    this.classCurriculums.set( classLessons );
                    this.state.set( 'success' );
                } ,
                error : () : void => {
                    this.state.set( 'error' );
                }
            } )
        }
        else {
            this.state.set( 'success' );
        }
    }

    protected reload ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.loadData();
    }

    protected btnSelectSession ( lesson : ClassLessonExtend ) : void {
        if ( this.activeLessonCode() !== lesson.code ) {
            this.activeCourseLesson.set( lesson );
            this.startLoadingLessonContent();
        }
    }

    protected btnRequestCreatingClassCurriculum () : void {
        this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : true , heading : 'Tải chương trình học tiêu chuẩn...' } ) );
        this.requestCreatingClassCurriculumObserver$.next();
    }

    protected btnCollapsedMenu () : void {
        void this.sidebar()?.close();
    }

    protected btnExpandMenu () : void {
        void this.sidebar()?.open();
    }

    protected changeClassLessonsOrder ( event : CdkDragDrop<ClassLessonExtend[]> ) : void {
        if ( event.currentIndex === event.previousIndex ) {
            return;
        }
        if (
            this.classCurriculums()[ event.previousIndex ].state.activated
            || this.classCurriculums()[ event.previousIndex ].ordering <= this.lastActivatedLessonOrdering()
            || this.classCurriculums()[ event.currentIndex ].state.activated
            || this.classCurriculums()[ event.currentIndex ].ordering <= this.lastActivatedLessonOrdering()
        ) {
            this.notification.toastWarning( 'Không thể thay đổi vị trí của bài học đã bắt đầu.' );
        }
        else {
            const list : ClassLessonExtend[] = cloneDeep<ClassLessonExtend[]>( this.classCurriculums() );
            moveItemInArray( list , event.previousIndex , event.currentIndex );
            this.classCurriculums.set( list );
            this.dirty.set( true );
            this.notification.toastInfo( 'Thứ tự bài học đã được thay đổi. Vui lòng chọn lưu lại để thay đổi được áp dụng.' );
        }
    }

    protected changeLessonContentTab ( tabName : ClassLessonContentTab ) : void {
        if ( tabName !== this.lessonContentTab() ) {
            this.lessonContentTab.set( tabName );
            this.startLoadingLessonContent();
        }
    }

    protected btnReloadingLessonContent ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.startLoadingLessonContent();
    }

    private startLoadingLessonContent () : void {
        this.loadLessonContentObserver$.next();
        this.loadLessonContent[ this.lessonContentTab() ]();
    }

    protected setTeachingAssignmentMethod ( method : TeachingAssignmentMethod , force : boolean = false ) : void {
        if ( method === 'AUTO_50_50' ) {
            this.teachingAssignmentMethod.set( method );
        }
        else {
            this.notification.toastInfo( 'Chức năng đang phát triển. Vui lòng quay lại sau.' );
        }
    }

    protected saveClassCurriculum () : void {
        if ( this.dirty() ) {
            this.state.set( 'loading' );
            const response : ClassLessonUpdateResponse = this.prepareForUpdate( cloneDeep<ClassLessonExtend[]>( this.classCurriculums() ) );
            this.classesService.update( this.classID() , response.info ).pipe(
                takeUntil( this.destroyed$ )
            ).subscribe( {
                next  : () : void => {
                    this.applyChanges( response );
                    this.state.set( 'success' );
                    this.dirty.set( false );
                    this.notification.toastSuccess( 'Cập nhật thành công.' );
                } ,
                error : () : void => {
                    this.state.set( 'success' );
                }
            } );
        }
    }

    protected closeAddClassLessonDialog ( dirty : boolean ) : void {
        if ( dirty ) {
            this.loadData();
        }
        this.visibleAddClassLessonDialog = false;
    }

    protected btnAddClassLesson () : void {
        this.visibleAddClassLessonDialog = true;
    }

    protected btnRemoveClassCurriculum ( code : string ) : void {
        this.confirmDeleteElement.set( code );
        this.removeClassCurriculumObserver.next( code );
    }

    private prepareForUpdate ( classCurriculums : ClassLessonExtend[] ) : ClassLessonUpdateResponse {
        const curriculums : ClassLessonExtend[] = classCurriculums.map( ( lesson : ClassLessonExtend , index : number ) : ClassLessonExtend => {
            if ( lesson.state.complete ) {
                return lesson;
            }
            else {
                return { ... lesson , ordering : 1 + index }
            }
        } );
        return {
            classCurriculums : curriculums ,
            info             : {
                curriculum    : curriculums.map( ( lesson : ClassLessonExtend ) : ClassLesson => ( {
                    ordering         : lesson.ordering ,
                    teacher_id       : lesson.teacher_id ?? 0 ,
                    course_lesson_id : lesson.course_lesson_id ?? 0 ,
                    type             : lesson.type ?? 'lesson' ,
                    title            : lesson.title ?? '' ,
                    code             : lesson.code ?? uuid4()
                } ) ) ,
                sync_required : 1 ,
                duration      : curriculums.length
            }
        }
    }

    private applyChanges ( { info , classCurriculums } : ClassLessonUpdateResponse ) : void {
        this.classObject.update( ( _classObject : Class ) : Class => {
            return { ... _classObject , ... info };
        } );
        this.classCurriculums.set( classCurriculums );
    }

    private confirmDeleteClassCurriculum ( code : string ) : void {
        this.notification.confirmDelete2().pipe(
            takeUntil( this.destroyed$ ) ,
            switchMap( ( confirmed : boolean ) : Observable<{ changed : boolean, response : ClassLessonUpdateResponse }> => {
                if ( confirmed ) {
                    this.state.set( 'loading' );
                    const classCurriculums : ClassLessonExtend[] = cloneDeep<ClassLessonExtend[]>( this.classCurriculums() ).filter( ( classLessonExtend : ClassLessonExtend ) : boolean => classLessonExtend.code !== code );
                    const response : ClassLessonUpdateResponse   = this.prepareForUpdate( classCurriculums );
                    return this.classesService.update( this.classID() , response.info ).pipe(
                        map( () : { changed : boolean, response : ClassLessonUpdateResponse } => ( { changed : true , response } ) )
                    )
                }
                else {
                    return of( { changed : false , response : null } )
                }
            } )
        ).subscribe( {
            next  : ( { changed , response } : { changed : boolean, response : ClassLessonUpdateResponse } ) : void => {
                if ( changed ) {
                    this.applyChanges( response );
                    this.notification.toastSuccess( 'Xóa thành công.' );
                    this.state.set( 'success' );
                }
                this.confirmDeleteElement.set( '' );
            } ,
            error : () : void => {
                this.confirmDeleteElement.set( '' );
                this.state.set( 'success' );
            }
        } )
    }

    protected avoidCloseMenuByClicking ( event : MouseEvent | KeyboardEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
    }

    ngOnDestroy () : void {
        this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : false , heading : '' } ) );
        this.destroyed$.next();
        this.destroyed$.complete();
    }

}
