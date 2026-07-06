import { Component , computed , inject , input , InputSignal , model , ModelSignal , OnDestroy , OnInit , signal , Signal , viewChild , WritableSignal } from '@angular/core';
import { ClassPlanningAnimationLoading , ClassPlanningChildComponent , ClassPlanningRole } from '@pages/class-planning/class-planning.component';
import { Class , ClassLesson , ClassTimeSlot , ClassTimeSlotDay , ClassTimeSlotDayToNumber , ClassTimeSlotDayToString , formatLongDayOfWeekLabel , getLessonTopic , UPDATE_CLASS_SCHEDULE , WeekDayLabel , WeekDayNumber } from '@models/class';
import { AuthenticationService } from '@services/authentication.service';
import { ClassesService } from '@services/classes.service';
import { CoursesService } from '@services/course.service';
import { CoursesLessonService } from '@services/course-lesson.service';
import { ClassSessionService } from '@services/class-session.service';
import { MatDrawer , MatDrawerMode } from '@angular/material/sidenav';
import { BreakpointObserver , BreakpointState } from '@angular/cdk/layout';
import { AppState } from '@models/app-state';
import { Course } from '@models/course';
import { CourseLesson } from '@models/course-lesson';
import { catchError , concatMap , debounce , debounceTime , delay , forkJoin , map , merge , Observable , of , Subject , switchMap , takeUntil , tap , timer } from 'rxjs';
import { ClassSession } from '@models/class-session';
import { Helper } from '@utilities/helper';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { MatButton } from '@angular/material/button';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { NotificationService } from '@services/notification.service';
import { CdkDragDrop , moveItemInArray } from '@angular/cdk/drag-drop';
import { NgClass , NgTemplateOutlet } from '@angular/common';
import { filter } from 'rxjs/operators';
import { BranchTimeSlot , CoSoDaoTao } from '@models/co-so-dao-tao';
import { PhongHoc } from '@models/phong-hoc';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import { PhongHocService } from '@services/phong-hoc.service';
import { Is } from '@utilities/is';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Dialog } from 'primeng/dialog';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { Tooltip } from 'primeng/tooltip';
import { ClassTimeSlotDay2TextPipe } from '@pipes/class-time-slot-day2-text.pipe';
import dayjs , { Dayjs } from 'dayjs';
import WeekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import updateLocale from 'dayjs/plugin/updateLocale';
import weekday from 'dayjs/plugin/weekday';
import { MatTooltip } from '@angular/material/tooltip';
import { TmFormEditClassSessionComponent } from '@pages/admin/children/training-management/children/tm-form-edit-class-session/tm-form-edit-class-session.component';
import { joinSources } from '@utilities/join-sources';
import { Employee } from '@models/employee';
import { assign , cloneDeep , isArray , sortBy } from 'lodash-es';
import { canSessionBeChanged , CanSessionBeChangedPipe } from '@pages/class-planning/children/class-planning-distribution/pipes/can-session-be-changed.pipe';
import { CpdRescheduleClassSessionFormComponent } from '@pages/class-planning/children/class-planning-distribution/cpd-reschedule-class-session-form/cpd-reschedule-class-session-form.component';

/* Monday luôn là 0 trong plugin weekday */
// Kích hoạt plugin updateLocale
dayjs.extend( weekday );
dayjs.extend( updateLocale );
dayjs.extend( isoWeek );
dayjs.extend( WeekOfYear );

// Đặt ngày bắt đầu tuần là thứ Hai (Monday)
dayjs.updateLocale( 'en' , {
    weekStart : 1  // 1 = Monday
} );

/* Monday luôn là 0 trong plugin weekday */

type ClassPlanningDistributionState = AppState | 'empty' | 'submitting' | 'prepareForSynchronization' | 'synchronizeClassSessions' | 'synchronizeClassSessionsFails' | 'resynchronizeClassSessions';

const STATE_TO_ANIMATION : Record<ClassPlanningDistributionState , ClassPlanningAnimationLoading> = {
    loading    : { enable : true , heading : 'Tải thông tin...' } ,
    empty      : { enable : false , heading : '' } ,
    success    : { enable : false , heading : '' } ,
    error      : { enable : false , heading : '' } ,
    submitting : { enable : true , heading : 'Cập nhật thông tin...' } ,
    // requesting                 : { enable : true , heading : 'Kiểm...' } ,
    resynchronizeClassSessions    : { enable : false , heading : '' } ,
    synchronizeClassSessions      : { enable : false , heading : '' } ,
    synchronizeClassSessionsFails : { enable : false , heading : '' } ,
    prepareForSynchronization     : { enable : true , heading : 'Tính toán số lượng buổi học..' }
}

type SynchronizeAnimationDataStatus = 'pending' | 'success' | 'error';

// Bản đồ Method -> Data type
interface ClassSessionRequestionAction {
    update : ClassSessionShort;
    create : ClassSessionShort;
    delete : number;
}

// Generic Request dựa trên MethodMap
type ClassPlanningRequest<M extends keyof ClassSessionRequestionAction = keyof ClassSessionRequestionAction> = {
    [K in M] : { action : K; data : ClassSessionRequestionAction[K]; status : SynchronizeAnimationDataStatus }
}[M];


type ClassSessionShort = Pick<ClassSession , 'topic' | 'title' | 'type' | 'donvi_id' | 'class_id' | 'course_id' | 'course_lesson_id' | 'teacher_id' | 'assistant_id' | 'linhvuc_id' | 'started_at' | 'ended_at' | 'time_slot_order' | 'time_start' | 'time_end' | 'csdt_id' | 'room_id' | 'status' | 'ordering' | 'learning_mode'>

type ClassPlanningTab = 'PROGRAMS' | 'TIME_SLOT_REGISTER' | 'CLASS_TIME_SLOTS';

type ClassTimeSlotRegisterDay = Record<ClassTimeSlotDay , ClassTimeSlotRegisterRoom[]>;

interface ClassTimeSlotRegister {
    timeSlot : BranchTimeSlot,
    days : ClassTimeSlotRegisterDay
}

interface ClassTimeSlotRegisterRoom extends Pick<PhongHoc , 'id' | 'name' | 'code' | 'capacity' | 'status' | 'description' | 'donvi_id' | 'csdt_id'> {
    slug : string;
    assigned : Class[]
}

interface RequestAssignTimeSlot {
    day : ClassTimeSlotDay,
    timeSlot : BranchTimeSlot,
    room : ClassTimeSlotRegisterRoom
}

interface ClassTimeSlotExtended extends ClassTimeSlot {
    weekDayLabel : string;
    timeSlotLabel : string;
    roomLabel : string;
    capacityLabel : string;
}

interface ClassCalendar {
    dayOfWeek : string,
    dayInMonth : string,
    time : string,
    month : string,
    years : string,
    room : string,
    teacher : string,
    teachingAssistant : string,
    status : string,
}

interface ClassSessionCalendar extends ClassSession {
    calendar : ClassCalendar
}

interface DayConfigSession extends ClassTimeSlot {
    timeSlot : BranchTimeSlot
}

export interface DayConfig {
    day : number;      // ISO weekday: 1=Mon,...,7=Sun
    sessions : DayConfigSession[]; // số ca học trong ngày
}

interface GenerateScheduleConfig {
    startDate : string, // Ngày bắt đầu
    daysOfWeek : DayConfig[] //Danh sách ngày học (0 = Thứ 2, ..., 6 = CN)
}

export function daySessionsOfWeek ( classTimeSlots : ClassTimeSlot[] , branchTimeSlots : BranchTimeSlot[] ) : DayConfig[] {
    return cloneDeep<ClassTimeSlot[]>( classTimeSlots ).reduce( ( reducer : DayConfig[] , item : ClassTimeSlot ) : DayConfig[] => {
        const _index2 : number = reducer.findIndex( ( o : DayConfig ) : boolean => o.day === item.order );
        if ( -1 === _index2 ) {
            reducer.push( {
                day      : item.order ,
                sessions : [ {
                    ... item ,
                    timeSlot : branchTimeSlots.find( ( _i : BranchTimeSlot ) : boolean => _i.order === item.slot_order )
                } ]
            } );
        }
        else {
            reducer[ _index2 ].sessions.push( {
                ... item ,
                timeSlot : branchTimeSlots.find( ( _i : BranchTimeSlot ) : boolean => _i.order === item.slot_order )
            } );
            reducer[ _index2 ].sessions = Helper.arraySort( reducer[ _index2 ].sessions , 'slot_order' )
        }
        return reducer;
    } , [] )
}

export function branchTimeSlot2SqlDateTime ( date : Dayjs , timeSlot : BranchTimeSlot , type : 'start' | 'end' ) : string {
    const [ hours , minutes ] : string[] = type === 'start' ? timeSlot.start.split( ':' ) : timeSlot.end.split( ':' );

    let _d : Dayjs = date.set( 'hours' , parseInt( hours , 10 ) );
    _d             = _d.set( 'minutes' , parseInt( minutes , 10 ) );
    _d             = _d.set( 'seconds' , 0 );
    return _d.format( 'YYYY-MM-DD HH:mm:ss' );
}

/**
 * Tạo lịch học linh hoạt theo tuần ISO (Thứ 2 = 0, Chủ nhật = 6)
 * @param source Ngày bắt đầu (YYYY-MM-DD)
 * @param config
 */
function generateSchedule ( source : ClassPlanningRequest<'create' | 'update'>[] , { startDate , daysOfWeek } : GenerateScheduleConfig ) : ClassPlanningRequest<'create' | 'update'>[] {
    if ( ! source.length ) {
        return [];
    }
    let current : Dayjs = dayjs( startDate );
    while ( -1 !== source.findIndex( ( i : ClassPlanningRequest<'create' | 'update'> ) : boolean => ! i.data.time_start ) ) {
        const dow : number       = current.weekday();
        const config : DayConfig = daysOfWeek.find( ( d : DayConfig ) : boolean => d.day === dow );
        if ( config ) {
            for ( let i : number = 0 ; i < config.sessions.length ; i++ ) {
                const _index : number = source.findIndex( ( cpr : ClassPlanningRequest<'create'> ) : boolean => ! cpr.data.time_start );
                if ( -1 === _index ) {
                    break;
                }
                else {
                    if ( config.sessions[ i ]?.timeSlot ) {
                        source[ _index ].data.time_slot_order = config.sessions[ i ]?.timeSlot.order;
                        source[ _index ].data.time_start      = branchTimeSlot2SqlDateTime( current , config.sessions[ i ].timeSlot , 'start' );
                        source[ _index ].data.time_end        = branchTimeSlot2SqlDateTime( current , config.sessions[ i ].timeSlot , 'end' );
                        source[ _index ].data.room_id         = config.sessions[ i ].room_id;
                    }
                    else {
                        // source[ _index ].data.started_at = current.format( 'YYYY-MM-DD' );
                        throw new Error( 'Có lỗi xảy ra' );
                    }
                }
            }
        }

        current = current.add( 1 , 'day' );
    }
    return source;
}

function fillLessonInfoToClassSession ( source : ClassPlanningRequest<'create' | 'update'>[] , classLessons : ClassLesson[] , courseLessons : CourseLesson[] , _class : Class ) : ClassPlanningRequest<'create' | 'update'>[] {
    return source.map( ( item : ClassPlanningRequest<'create' | 'update'> , index : number ) : ClassPlanningRequest<'create' | 'update'> => {
        const _courseLesson : CourseLesson = courseLessons.find( ( { id } : CourseLesson ) : boolean => id === classLessons[ index ].course_lesson_id );
        item.data.course_lesson_id         = classLessons[ index ].course_lesson_id;
        // item.data.teacher_id               = _class.teacher_ids.length ? _class.teacher_ids[ 0 ] : 0;
        // item.data.assistant_id             = _class.assistant_ids.length ? _class.assistant_ids[ 0 ] : 0;
        item.data.title = _courseLesson?.title ?? '';
        item.data.topic = _courseLesson ? courseLessons.find( ( { id } : CourseLesson ) : boolean => id === _courseLesson.parent_id )?.title ?? '' : '';
        return item;
    } );
}

interface ClassSessionSyncCellInfo {
    course : Course;
    classObject : Class;
    order : number;
    classLesson : ClassLesson;
    courseLesson : CourseLesson;
    courseLessonParent : CourseLesson;
    classSession : ClassSession;
    branchTimeSlots : BranchTimeSlot[];
}

type ClassSessionSyncCellStatus = 'waiting' | 'processing' | 'success' | 'error';

class ClassSessionSyncCell implements ClassSessionSyncCellInfo {

    readonly course : Course;

    readonly classObject : Class;

    readonly order : number;

    readonly classLesson : ClassLesson;

    readonly courseLesson : CourseLesson;

    readonly courseLessonParent : CourseLesson;

    readonly classSession : ClassSession;

    readonly branchTimeSlots : BranchTimeSlot[];

    private info : ClassSessionSyncCellInfo;

    private readonly service : ClassSessionService;

    get started () : boolean {
        return this.classSession && this.classSession.status !== 0;
    }

    private _status : ClassSessionSyncCellStatus = 'waiting';

    get status () : ClassSessionSyncCellStatus {
        return this._status;
    }

    constructor ( info : ClassSessionSyncCellInfo , service : ClassSessionService ) {
        this.info    = info;
        this.service = service;
        return new Proxy( this , {
            get ( target : ClassSessionSyncCell , prop : string | symbol , receiver ) {
                if ( prop in target ) {
                    return Reflect.get( target , prop , receiver );
                }
                if ( prop in target.info ) {
                    return ( target.info as any )[ prop ];
                }
                return undefined;
            }
        } ) as ClassSessionSyncCell & ClassSessionSyncCellInfo;
    }

    sync () : Observable<any> {
        if ( this.started ) {
            this._status = 'success';
            return of( 1 );
        }
        else {
            this._status = 'processing';
            let request : Observable<any>;
            if ( this.classSession ) {
                if ( ! this.classLesson ) {
                    request = this.delete();
                }
                else {
                    request = this.update();
                }
            }
            else {
                request = this.create();
            }

            return request.pipe(
                tap( () : void => {
                    this._status = 'success';
                } ) ,
                catchError( () : Observable<any> => {
                    this._status = 'error';
                    return of( 0 );
                } ) ,
                delay( 100 )
            )
        }
    }

    private update () : Observable<any> {
        return this.classSession ? this.service.update( this.classSession.id , {
            ordering         : this.order ,
            course_lesson_id : this.classLesson?.course_lesson_id ?? 0 ,
            title            : this.getTitle() ,
            topic            : this.getTopic()
        } ) : this.create();
    }

    private getTitle () : string {
        if ( this.classLesson ) {
            switch ( this.classLesson.type ) {
                case 'activity':
                case 'other':
                    return this.classLesson?.title ?? '';
                default:
                    return this.courseLesson?.title ?? '';
            }
        }
        return '';
    }

    private getTopic () : string {
        return this.classLesson ? getLessonTopic( this.classLesson.type , ( this.courseLessonParent?.title ?? '' ) ) : '';
    }

    private create () : Observable<any> {
        return this.service.create( {
            type             : 'LECTURE' ,
            status           : 0 ,
            ordering         : this.order ,
            class_id         : this.classObject.id ,
            course_id        : this.classObject.course_id ,
            course_lesson_id : this.classLesson?.course_lesson_id ?? 0 ,
            title            : this.getTitle() ,
            topic            : this.getTopic() ,
            csdt_id          : this.classObject.csdt_id ,
            donvi_id         : this.classObject.donvi_id ,
            ended_at         : null ,
            linhvuc_id       : this.course.linhvuc_id ,
            room_id          : 0 ,
            started_at       : null ,
            time_end         : null ,
            time_start       : null ,
            learning_mode    : this.classObject.learning_mode ,
            time_slot_order  : 0 ,
            teacher_id       : 0 ,
            assistant_id     : 0
        } );
    }

    private delete () : Observable<any> {
        return this.service.delete( this.classSession.id );
    }
}

class ClassSessionUpdater implements ClassSessionSyncCellInfo {

    readonly course : Course;

    readonly classObject : Class;

    readonly order : number;

    readonly classLesson : ClassLesson;

    readonly courseLesson : CourseLesson;

    readonly courseLessonParent : CourseLesson;

    readonly classSession : ClassSession;

    readonly branchTimeSlots : BranchTimeSlot[];

    private info : ClassSessionSyncCellInfo;

    private readonly service : ClassSessionService;

    get activated () : boolean {
        return this.classSession && this.classSession.status !== 0;
    }

    constructor ( info : ClassSessionSyncCellInfo , service : ClassSessionService ) {
        this.info    = info;
        this.service = service;
        return new Proxy( this , {
            get ( target : ClassSessionUpdater , prop : string | symbol , receiver ) {
                if ( prop in target ) {
                    return Reflect.get( target , prop , receiver );
                }
                if ( prop in target.info ) {
                    return ( target.info as any )[ prop ];
                }
                return undefined;
            }
        } ) as ClassSessionUpdater & ClassSessionSyncCellInfo;
    }

    sync ( prev : ClassSessionUpdater ) : Observable<boolean> {
        if ( this.activated ) {
            return of( true );
        }
        else {
            let request : Observable<any>;
            if ( this.classSession ) {
                if ( ! this.classLesson ) {
                    request = this.delete();
                }
                else {
                    request = this.update();
                }
            }
            else {
                request = this.create( prev );
            }
            return request;
        }
    }

    private update () : Observable<boolean> {
        return this.service.update( this.classSession.id , {
            ordering         : this.order ,
            course_lesson_id : this.classLesson?.course_lesson_id ?? 0 ,
            title            : this.getTitle() ,
            topic            : this.getTopic()
        } ).pipe( map( () : boolean => true ) )
    }

    private getTitle () : string {
        if ( this.classLesson ) {
            switch ( this.classLesson.type ) {
                case 'activity':
                case 'other':
                    return this.classLesson?.title ?? '';
                default:
                    return this.courseLesson?.title ?? '';
            }
        }
        return '';
    }

    private getTopic () : string {
        return this.classLesson ? getLessonTopic( this.classLesson.type , ( this.courseLessonParent?.title ?? '' ) ) : '';
    }

    private schedule ( prev : ClassSessionUpdater ) : Pick<ClassSession , 'time_slot_order' | 'time_start' | 'time_end' | 'room_id'> {
        let result : Pick<ClassSession , 'time_slot_order' | 'time_start' | 'time_end' | 'room_id'> = null;
        try {
            if ( isArray( prev.classObject.time_slots ) && prev.classSession && prev.classSession.time_start ) {
                let current : Dayjs            = dayjs( prev.classSession.time_start );
                const daysOfWeek : DayConfig[] = daySessionsOfWeek( prev.classObject.time_slots , prev.branchTimeSlots );
                const todayConfig : DayConfig  = daysOfWeek.find( ( d : DayConfig ) : boolean => d.day === current.weekday() );
                if ( todayConfig && todayConfig.sessions.length && Math.max( ... todayConfig.sessions.map( ( _daySession : DayConfigSession ) : number => _daySession.slot_order ) ) > prev.classSession.time_slot_order ) {
                    const nextDayConfigSession : DayConfigSession = todayConfig.sessions.find( ( u : DayConfigSession ) : boolean => u.slot_order > prev.classSession.time_slot_order );
                    if ( nextDayConfigSession.timeSlot ) {
                        result = {
                            time_slot_order : nextDayConfigSession.timeSlot.order ,
                            time_start      : branchTimeSlot2SqlDateTime( current , nextDayConfigSession.timeSlot , 'start' ) ,
                            time_end        : branchTimeSlot2SqlDateTime( current , nextDayConfigSession.timeSlot , 'end' ) ,
                            room_id         : nextDayConfigSession.room_id
                        }
                    }
                }
                else {
                    let _timeCounter : number = 0;
                    while ( _timeCounter <= 30 ) {
                        current                  = current.add( 1 , 'day' );
                        const config : DayConfig = daysOfWeek.find( ( d : DayConfig ) : boolean => d.day === current.weekday() );
                        if ( config?.sessions[ 0 ]?.timeSlot ) {
                            result = {
                                time_slot_order : config.sessions[ 0 ].timeSlot.order ,
                                time_start      : branchTimeSlot2SqlDateTime( current , config.sessions[ 0 ].timeSlot , 'start' ) ,
                                time_end        : branchTimeSlot2SqlDateTime( current , config.sessions[ 0 ].timeSlot , 'end' ) ,
                                room_id         : config.sessions[ 0 ].room_id
                            }
                            return result;
                        }
                    }
                }
            }
        }
        catch ( e ) {
            return result;
        }
        return result;
    }

    private create ( prev : ClassSessionUpdater ) : Observable<boolean> {
        const teacherIDs : number[]                = this.classObject.teacher_ids;
        const assistantIDs : number[]              = this.classObject.assistant_ids;
        const index : number                       = Math.max( 0 , this.order - 1 );
        const classSession : Partial<ClassSession> = assign<Partial<ClassSession> , Pick<ClassSession , 'time_slot_order' | 'time_start' | 'time_end' | 'room_id'>>( {
            type             : 'LECTURE' ,
            status           : 0 ,
            ordering         : this.order ,
            class_id         : this.classObject.id ,
            course_id        : this.classObject.course_id ,
            course_lesson_id : this.classLesson?.course_lesson_id ?? 0 ,
            title            : this.getTitle() ,
            topic            : this.getTopic() ,
            csdt_id          : this.classObject.csdt_id ,
            donvi_id         : this.classObject.donvi_id ,
            ended_at         : null ,
            linhvuc_id       : this.course.linhvuc_id ,
            room_id          : 0 ,
            started_at       : null ,
            time_end         : null ,
            time_start       : null ,
            learning_mode    : this.classObject.learning_mode ,
            time_slot_order  : 0 ,
            teacher_id       : teacherIDs.length ? teacherIDs[ index % teacherIDs.length ] : 0 ,
            assistant_id     : assistantIDs.length ? assistantIDs[ index % assistantIDs.length ] : 0
        } , this.schedule( prev ) )
        return this.service.create( classSession ).pipe(
            map( ( id : number ) : boolean => {
                this.info.classSession = <ClassSession> { ... classSession , id };
                return true;
            } )
        )
    }

    private delete () : Observable<any> {
        return this.service.delete( this.classSession.id ).pipe(
            map( () : boolean => true )
        )
    }
}

interface SynchronizeCurriculumWithClassSessionsDto {
    classSessions : ClassSession[],
    branchTimeSlots : BranchTimeSlot[],
    courseLessons : CourseLesson[]
}

@Component( {
    selector    : 'class-planning-distribution' ,
    imports     : [ MatButton , MatProgressBar , Dialog , LoadingProgressComponent , Tooltip , NgClass , ClassTimeSlotDay2TextPipe , NgTemplateOutlet , MatTooltip , TmFormEditClassSessionComponent , CanSessionBeChangedPipe , CpdRescheduleClassSessionFormComponent ] ,
    templateUrl : './class-planning-distribution.component.html' ,
    styleUrl    : './class-planning-distribution.component.css'
} )
export class ClassPlanningDistributionComponent implements OnInit , OnDestroy , ClassPlanningChildComponent {

    course : ModelSignal<Course> = model.required<Course>();

    classObject : ModelSignal<Class> = model.required<Class>();

    role : InputSignal<ClassPlanningRole> = input.required<ClassPlanningRole>();

    animationLoading : ModelSignal<ClassPlanningAnimationLoading> = model.required<ClassPlanningAnimationLoading>();

    private readonly classID : Signal<number> = computed( () : number => this.classObject()?.id ?? 0 );

    private readonly courseID : Signal<number> = computed( () : number => this.classObject()?.course_id ?? 0 );

    private readonly auth : AuthenticationService = inject( AuthenticationService );

    private readonly classesService : ClassesService = inject( ClassesService );

    private readonly coursesService : CoursesService = inject( CoursesService );

    private readonly coursesLessonService : CoursesLessonService = inject( CoursesLessonService );

    private readonly classSessionService : ClassSessionService = inject( ClassSessionService );

    private readonly coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

    private readonly phongHocService : PhongHocService = inject( PhongHocService );

    private readonly notification : NotificationService = inject( NotificationService );

    protected readonly drawerMode : WritableSignal<MatDrawerMode> = signal( 'side' );

    private readonly breakpointObserver : BreakpointObserver = inject( BreakpointObserver );

    protected readonly sidebar : Signal<MatDrawer | undefined> = viewChild<MatDrawer>( MatDrawer );

    protected readonly state : WritableSignal<ClassPlanningDistributionState> = signal<AppState>( 'loading' );

    private readonly courseLessons : WritableSignal<CourseLesson[]> = signal( null );

    protected readonly classSessionCalendar : WritableSignal<ClassSessionCalendar[]> = signal( [] );

    protected readonly maxActivatedSessionOrdering : Signal<number> = computed( () : number => Math.max( 0 , ... this.classSessionCalendar().filter( ( s : ClassSessionCalendar ) : boolean => s.status !== 0 ).map( ( s : ClassSessionCalendar ) : number => s.ordering ) ) );

    private readonly tasksQueue : WritableSignal<ClassPlanningRequest[]> = signal( [] );

    protected readonly animationPercent : Signal<number> = computed( () : number => {
        return this.tasksQueue().length ? Math.floor( ( this.tasksQueue().reduce( ( totalSuccess : number , item : { status : SynchronizeAnimationDataStatus } ) : number => totalSuccess + ( item.status === 'success' ? 1 : 0 ) , 0 ) / this.tasksQueue().length ) * 100 ) : 0;
    } );

    protected readonly classTimeSlots : WritableSignal<ClassTimeSlotExtended[]> = signal( [] );

    private readonly destroyed$ : Subject<void> = new Subject<void>();

    private readonly requestSynchronizationObserver : Subject<void> = new Subject<void>();

    get donViID () : number {
        return this.auth.user?.donvi_id ?? 0;
    }

    protected readonly activeTab : WritableSignal<ClassPlanningTab> = signal( 'PROGRAMS' );

    private loadAllClassTimeSlotsObserver : Subject<void> = new Subject<void>();

    protected readonly classBranch : WritableSignal<CoSoDaoTao> = signal( null );

    private classRooms : WritableSignal<PhongHoc[]> = signal( [] );

    protected readonly classTimeSlotRegisters : WritableSignal<ClassTimeSlotRegister[]> = signal<ClassTimeSlotRegister[]>( null );

    private requestAssignTimeSlot : WritableSignal<RequestAssignTimeSlot> = signal( null );

    protected readonly requestAssignTimeSlotSlug : Signal<string> = computed( () : string => {
        return this.requestAssignTimeSlot() ? [ this.requestAssignTimeSlot().day , this.requestAssignTimeSlot().timeSlot.order , this.requestAssignTimeSlot().room.id ].join( '-' ) : ''
    } );

    protected readonly requestAssignTimeDay : Signal<string> = computed( () : string => {
        return this.requestAssignTimeSlot() ? ClassTimeSlotDayToString( this.requestAssignTimeSlot().day ) : '';
    } );

    protected readonly requestAssignTimeLabelTime : Signal<string> = computed( () : string => {
        return this.requestAssignTimeSlot() ? `${ this.requestAssignTimeSlot().timeSlot.name } : ${ this.requestAssignTimeSlot().timeSlot.start } - ${ this.requestAssignTimeSlot().timeSlot.end }` : '';
    } );

    protected readonly requestAssignTimeLabelRoom : Signal<string> = computed( () : string => this.requestAssignTimeSlot()?.room.name );

    protected readonly requestAssignTimeLabelRoomCapacity : Signal<string> = computed( () : string => `Sức chứa ${ this.requestAssignTimeSlot()?.room.capacity } người` );

    private confirmAssignTimeSlotObserver : Subject<RequestAssignTimeSlot> = new Subject<RequestAssignTimeSlot>();

    private changeAssignTimeSlotObserver : Subject<RequestAssignTimeSlot> = new Subject<RequestAssignTimeSlot>();

    protected visibleDialog : boolean = false;

    protected readonly enableDialogAnimation : WritableSignal<boolean> = signal( false );

    protected readonly sectionShowTimeSlots : WritableSignal<AppState> = signal( 'loading' );

    private readonly selectUpdateSection : WritableSignal<ClassSessionCalendar> = signal( null );

    protected readonly updateSectionID : Signal<number> = computed( () : number => this.selectUpdateSection()?.id ?? 0 );

    protected visibleUpdateSectionDialog : boolean = false;

    // private readonly resynchronizeClassSessionsQueue : WritableSignal<ClassSessionSyncCell[]> = signal( [] );

    // protected readonly resynchronizeClassSessionsAnimation : Signal<number> = computed( () : number => {
    //     return this.resynchronizeClassSessionsQueue().length ? Math.floor( ( this.resynchronizeClassSessionsQueue().reduce( ( totalSuccess : number , item : ClassSessionSyncCell ) : number => totalSuccess + ( item.status === 'success' ? 1 : 0 ) , 0 ) / this.resynchronizeClassSessionsQueue().length ) * 100 ) : 0;
    // } );

    // readonly employeeStore : WritableSignal<Employee[]> = signal( [] );
    public employeeStore : Employee[] = [];

    private readonly syncSuccessCounter : WritableSignal<number> = signal( 0 );

    private readonly totalSyncItems : WritableSignal<number> = signal( 0 );

    protected readonly syncProgress : Signal<number> = computed( () : number => {
        return this.totalSyncItems() ? Math.floor( ( this.syncSuccessCounter() / this.totalSyncItems() ) * 100 ) : 0;
    } );

    private syncAllClassSessionsObserver : Subject<void> = new Subject<void>();

    protected visibleRescheduleSectionDialog : boolean = false;

    protected readonly rescheduleSectionID : WritableSignal<number> = signal( 0 );

    readonly dirty : WritableSignal<boolean> = signal( false );

    constructor () {
        toObservable( this.state ).pipe(
            map( ( state : ClassPlanningDistributionState ) : ClassPlanningAnimationLoading => STATE_TO_ANIMATION[ state ] ) ,
            takeUntilDestroyed()
        ).subscribe( ( config : ClassPlanningAnimationLoading ) : void => {
            this.animationLoading.update( () : ClassPlanningAnimationLoading => ( config ) );
        } );

        toObservable( this.activeTab ).pipe(
            filter( ( tab : ClassPlanningTab ) : boolean => tab === 'TIME_SLOT_REGISTER' ) ,
            debounceTime( 500 ) ,
            takeUntilDestroyed()
        ).subscribe( () : void => {
            this.loadAllClassTimeSlots();
        } );

        this.confirmAssignTimeSlotObserver.pipe(
            map( ( data : RequestAssignTimeSlot ) : boolean => !! data ) ,
            debounce( ( visible : boolean ) : Observable<number> => timer( visible ? 500 : 0 ) ) ,
            takeUntilDestroyed()
        ).subscribe( ( visible : boolean ) : void => {
            this.visibleDialog = visible;
            if ( ! visible ) {
                this.requestAssignTimeSlot.set( null );
            }
        } );

        this.changeAssignTimeSlotObserver.pipe(
            debounceTime( 500 ) ,
            takeUntilDestroyed()
        ).subscribe( ( info : RequestAssignTimeSlot ) : void => {
            this.updateAssignTimeSlot( info );
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

        this.requestSynchronizationObserver.pipe(
            takeUntilDestroyed() ,
            debounceTime( 1000 )
        ).subscribe( () : void => {
            this.synchronizeCurriculumWithClassSessions();
        } );

        toObservable( this.selectUpdateSection ).pipe(
            takeUntilDestroyed() ,
            filter( Boolean ) ,
            debounceTime( 500 )
        ).subscribe( () : void => {
            this.visibleUpdateSectionDialog = true;
        } );

        toObservable( this.rescheduleSectionID ).pipe(
            takeUntilDestroyed() ,
            filter( Boolean ) ,
            debounceTime( 500 )
        ).subscribe( ( id : number ) : void => {
            this.visibleRescheduleSectionDialog = true;
        } )

        this.syncAllClassSessionsObserver.asObservable().pipe(
            takeUntilDestroyed() ,
            debounceTime( 1000 )
        ).subscribe( () : void => {
            this.syncAllClassSessions();
        } );
    }

    ngOnInit () : void {
        this.loadData();
    }

    /**
     * synchronizeCurriculumWithClassSessions
     * Đồng bộ hóa chương trình giảng dạy với các buổi học
     * */
    private synchronizeCurriculumWithClassSessions () : void {
        const branchID : number = this.classObject()?.csdt_id ?? 0;
        if ( branchID ) {
            this.loadClassSessions( this.classID() ).pipe(
                takeUntil( this.destroyed$ ) ,
                switchMap( ( classSessions : ClassSession[] ) : Observable<SynchronizeCurriculumWithClassSessionsDto> => {
                    if ( this.classObject().curriculum.length === 0 || this.classObject().curriculum.length === classSessions.length ) {
                        return of( {
                            classSessions ,
                            branchTimeSlots : [] ,
                            courseLessons   : []
                        } );
                    }
                    else {
                        return joinSources<SynchronizeCurriculumWithClassSessionsDto>( {
                            classSessions   : of( classSessions ) ,
                            branchTimeSlots : this.loadBranchTimeSlots( branchID ) ,
                            courseLessons   : this.loadCourseLessons( this.courseID() )
                        } )
                    }
                } )
            ).subscribe( {
                next  : ( { classSessions , branchTimeSlots , courseLessons } : SynchronizeCurriculumWithClassSessionsDto ) : void => {
                    const totalLessons : number         = this.classObject().curriculum.length;
                    const totalCreatedSessions : number = classSessions.length;
                    if ( totalLessons === 0 || totalLessons === totalCreatedSessions ) {
                        this.loadData();
                    }
                    else {
                        if ( branchTimeSlots.length ) {
                            if ( totalLessons > totalCreatedSessions ) {
                                let startDate : Dayjs;
                                switch ( true ) {
                                    case classSessions.length > 0 :
                                        startDate = dayjs( this.classObject().started_date );
                                        startDate = startDate.add( 1 , 'day' );
                                        break;
                                    case !! this.classObject().started_date:
                                        startDate = dayjs( this.classObject().started_date );
                                        startDate = startDate.subtract( 1 , 'day' );
                                        break;
                                    default:
                                        startDate = dayjs( new Date() );
                                        break;
                                }
                                const daysOfWeek : DayConfig[]     = cloneDeep<ClassTimeSlot[]>( [ ... this.classObject().time_slots ] ).reduce( ( reducer : DayConfig[] , item : ClassTimeSlot ) : DayConfig[] => {
                                    const _index2 : number = reducer.findIndex( ( o : DayConfig ) : boolean => o.day === item.order );
                                    if ( -1 === _index2 ) {
                                        reducer.push( {
                                            day      : item.order ,
                                            sessions : [ {
                                                ... item ,
                                                timeSlot : branchTimeSlots.find( ( _i : BranchTimeSlot ) : boolean => _i.order === item.slot_order )
                                            } ]
                                        } );
                                    }
                                    else {
                                        reducer[ _index2 ].sessions.push( {
                                            ... item ,
                                            timeSlot : branchTimeSlots.find( ( _i : BranchTimeSlot ) : boolean => _i.order === item.slot_order )
                                        } );
                                        reducer[ _index2 ].sessions = Helper.arraySort( reducer[ _index2 ].sessions , 'slot_order' )
                                    }
                                    return reducer;
                                } , [] );
                                const totalMissedSessions : number = totalLessons - totalCreatedSessions;
                                try {
                                    const teacherIDs : number[]                                      = this.classObject().teacher_ids;
                                    const assistantIDs : number[]                                    = this.classObject().assistant_ids;
                                    let _animationData : ClassPlanningRequest<'create' | 'update'>[] = [ ... Array.from( { length : totalMissedSessions } , ( _ : any , index : number ) : number => index ) ].reduce( ( reducer : ClassPlanningRequest<'create'>[] , index : number ) : ClassPlanningRequest<'create'>[] => {
                                        reducer.push( {
                                            action : 'create' ,
                                            data   : {
                                                type             : 'LECTURE' ,
                                                status           : 0 ,
                                                ordering         : 1 + index ,
                                                class_id         : this.classID() ,
                                                course_id        : this.course().id ,
                                                course_lesson_id : 0 ,
                                                csdt_id          : this.classObject().csdt_id ,
                                                donvi_id         : this.donViID ,
                                                ended_at         : null ,
                                                linhvuc_id       : this.course().linhvuc_id ,
                                                room_id          : 0 ,
                                                started_at       : null ,
                                                topic            : '' ,
                                                title            : '' ,
                                                time_end         : null ,
                                                time_start       : null ,
                                                learning_mode    : this.classObject().learning_mode ,
                                                time_slot_order  : 0 ,
                                                teacher_id       : teacherIDs.length ? teacherIDs[ index % teacherIDs.length ] : 0 ,
                                                assistant_id     : assistantIDs.length ? assistantIDs[ index % assistantIDs.length ] : 0
                                            } ,
                                            status : 'pending'
                                        } );
                                        return reducer;
                                    } , new Array<ClassPlanningRequest<'create' | 'update'>> );
                                    _animationData                                                   = generateSchedule( _animationData , { startDate : startDate.format( 'YYYY-MM-DD' ) , daysOfWeek } );
                                    _animationData                                                   = fillLessonInfoToClassSession( _animationData , this.classObject().curriculum , courseLessons , this.classObject() );
                                    this.tasksQueue.set( _animationData );
                                }
                                catch ( error ) {
                                    this.notification.toastError( error );
                                }
                            }
                            else {
                                // Tổng số buổi học dư thùa
                                const totalExtraSessions : number             = totalCreatedSessions - totalLessons;
                                const _animationData : ClassPlanningRequest[] = [ ... Array.from( { length : totalExtraSessions } , ( _ : any , index : number ) : number => index ) ].reduce( ( reducer : ClassPlanningRequest[] ) : ClassPlanningRequest[] => {
                                    reducer.push( { action : 'delete' , data : 0 , status : 'pending' } );
                                    return reducer;
                                } , new Array<ClassPlanningRequest> );
                                this.tasksQueue.set( _animationData );
                            }
                            this._startCreateClassSessions();
                        }
                        else {
                            this.notification.toastError( 'Cơ sở đào tạo chưa cấu hình khung giờ học!' )
                            this.loadData();
                        }
                    }
                } ,
                error : () : void => {
                    this.loadData();
                }
            } );
        }
        else {
            this.notification.toastError( 'Lớp học chưa được khai báo cơ sở đào tạo!' );
            this.loadData();
        }
    }

    private _startCreateClassSessions () : void {
        this.state.set( 'synchronizeClassSessions' );
        const _source : ClassLesson[]    = cloneDeep( this.classObject().curriculum );
        const curriculum : ClassLesson[] = UPDATE_CLASS_SCHEDULE( _source , [ ... this.tasksQueue().map( ( i : ClassPlanningRequest ) : ClassLesson => ( { ordering : i.data[ 'ordering' ] , teacher_id : 0 , course_lesson_id : 0 } ) ) ] );
        this.classesService.update( this.classID() , { curriculum , sync_required : 1 } ).pipe(
            takeUntil( this.destroyed$ ) ,
            switchMap( () : Observable<boolean> => {
                this.classObject.update( ( _class : Class ) : Class => ( { ... _class , curriculum } ) );
                return this._crateClassSessionIteratively();
            } ) ,
            delay( 1000 ) ,
            switchMap( ( allRequestsSuccess : boolean ) : Observable<boolean> => {
                if ( allRequestsSuccess ) {
                    return this.classesService.update( this.classID() , { sync_required : 0 } ).pipe(
                        map( () : boolean => true )
                    )
                }
                else {
                    return of( false );
                }
            } )
        ).subscribe( {
            next  : ( allRequestsSuccess : boolean ) : void => {
                if ( allRequestsSuccess ) {
                    this.classObject.update( ( _class : Class ) : Class => ( { ... _class , sync_required : 0 } ) );
                    this.loadData();
                }
                else {
                    this.state.set( 'synchronizeClassSessionsFails' );
                }
            } ,
            error : () : void => {
                this.state.set( 'synchronizeClassSessionsFails' );
            }
        } );
    }

    private _crateClassSessionIteratively () : Observable<boolean> {
        const _list : ClassPlanningRequest[] = this.tasksQueue();
        const pendingIndex : number          = _list.findIndex( ( i : ClassPlanningRequest ) : boolean => i.status === 'pending' );
        if ( pendingIndex === -1 ) {
            return of( ! _list.some( ( _info : ClassPlanningRequest ) : boolean => _info.status === 'error' ) );
        }
        else {
            return this.classSessionService.create( _list[ pendingIndex ].data as ClassSessionShort ).pipe(
                delay( 200 ) ,
                switchMap( () : Observable<boolean> => {
                    _list[ pendingIndex ].status = 'success';
                    this.tasksQueue.set( [ ... _list ] );
                    return this._crateClassSessionIteratively();
                } ) ,
                catchError( () : Observable<boolean> => {
                    _list[ pendingIndex ].status = 'error';
                    this.tasksQueue.set( [ ... _list ] );
                    return this._crateClassSessionIteratively();
                } )
            )
        }
    }

    private loadCourseLessons ( course_id : number ) : Observable<CourseLesson[]> {
        if ( this.courseLessons() ) {
            return of( this.courseLessons() );
        }
        const conditions : IctuConditionParam[] = [
            { conditionName : 'course_id' , condition : IctuQueryCondition.equal , value : course_id.toString() } ,
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString() , orWhere : 'and' }
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
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString() , orWhere : 'and' }
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

    private loadClassSessions ( class_id : number , params? : IctuQueryParams ) : Observable<ClassSession[]> {
        const conditions : IctuConditionParam[]     = [
            { conditionName : 'class_id' , condition : IctuQueryCondition.equal , value : class_id.toString() } ,
            { conditionName : 'course_id' , condition : IctuQueryCondition.equal , value : this.courseID().toString() , orWhere : 'and' } ,
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString() , orWhere : 'and' }
        ];
        const _defaultQueryParams : IctuQueryParams = {
            limit   : -1 ,
            paged   : 1 ,
            order   : 'ASC' ,
            orderby : 'ordering,time_start'
        };
        const queryParams : IctuQueryParams         = params ? { ... _defaultQueryParams , ... params } : _defaultQueryParams;
        return this.classSessionService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<ClassSession[]> ) : ClassSession[] => response.data )
        )
    }

    private loadData () : void {
        this.state.set( 'loading' );
        forkJoin<{
            course : Observable<Course>,
            classSessions : Observable<ClassSession[]>
        }>( {
            course        : this.loadCourse( this.courseID() ) ,
            classSessions : this.loadClassSessions( this.classID() , { with : 'teacher,room,assistants' } )
        } ).pipe(
            takeUntil( this.destroyed$ ) ,
            map( ( { classSessions } : { classSessions : ClassSession[] } ) : ClassSession[] => classSessions )
        ).subscribe( {
            next  : ( classSessions : ClassSession[] ) : void => {
                this.classSessionCalendar.set( classSessions.map( ( classSession : ClassSession ) : ClassSessionCalendar => {
                    const dateStart : Dayjs  = classSession.time_start ? dayjs( classSession.time_start ) : null;
                    const dateEnd : Dayjs    = classSession.time_end ? dayjs( classSession.time_end ) : null;
                    const arrTime : string[] = [ dateStart ? dateStart.format( 'HH:mm' ) : '' , dateEnd ? dateEnd.format( 'HH:mm' ) : '' ];
                    return {
                        ... classSession ,
                        calendar : {
                            dayOfWeek         : formatLongDayOfWeekLabel( dateStart ? WeekDayLabel( dateStart.weekday() as WeekDayNumber ) : '------' ) ,
                            dayInMonth        : dateStart ? dateStart.format( 'DD' ) : '--:--' ,
                            time              : arrTime.filter( Boolean ).join( ' - ' ) ,
                            month             : 'Tháng ' + ( dateStart ? dateStart.format( 'MM' ) : '' ) ,
                            years             : dateStart ? dateStart.format( 'YYYY' ) : '----' ,
                            room              : classSession[ 'room' ]?.name ?? '' ,
                            teacher           : classSession[ 'teacher' ]?.full_name ?? '.........................' ,
                            teachingAssistant : classSession[ 'assistants' ]?.full_name ?? '.........................' ,
                            status            : ''
                        }
                    }
                } ) );
                this.state.set( 'success' );
            } ,
            error : () : void => {
                this.state.set( 'error' );
            }
        } );
    }

    protected reload ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.loadData();
    }

    protected btnPrepareForSynchronization () : void {
        this.state.set( 'prepareForSynchronization' );
        this.requestSynchronizationObserver.next();
    }

    protected activeTabContent ( tab : ClassPlanningTab ) : void {
        if ( tab === 'TIME_SLOT_REGISTER' ) {
            this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : true , heading : 'Tải danh sách đăng ký lịch học...' } ) );
        }
        else if ( tab === 'CLASS_TIME_SLOTS' ) {
            this.loadClassTimeslots();
        }
        this.activeTab.set( tab );
    }

    protected drop ( event : CdkDragDrop<ClassSessionCalendar[]> ) : void {
        const items : ClassSessionCalendar[] = [ ... this.classSessionCalendar() ];
        moveItemInArray( items , event.previousIndex , event.currentIndex );
    }

    private loadClassTimeslots () : void {
        if ( this.sectionShowTimeSlots() !== 'success' ) {
            this.loadAllClassTimeSlotsObserver.next();
            const branchID : number                = this.classObject()?.csdt_id ?? 0;
            const classTimeSlots : ClassTimeSlot[] = this.classObject() && Is.array( this.classObject().time_slots ) ? cloneDeep( this.classObject().time_slots ) : [];
            if ( branchID && classTimeSlots.length ) {
                this.sectionShowTimeSlots.set( 'loading' );
                joinSources<{
                    rooms : PhongHoc[],
                    timeSlots : BranchTimeSlot[],
                }>( {
                    rooms     : this.loadBranchRooms( branchID ) ,
                    timeSlots : this.loadBranchTimeSlots( branchID )
                } ).pipe(
                    takeUntil( merge( this.loadAllClassTimeSlotsObserver , this.destroyed$ ) ) ,
                    map( ( { rooms , timeSlots } : { rooms : PhongHoc[], timeSlots : BranchTimeSlot[] } ) : ClassTimeSlotExtended[] => {
                        return classTimeSlots.map( ( _classTimeSlot : ClassTimeSlot ) : ClassTimeSlotExtended => {
                            const _timeSlot : BranchTimeSlot = timeSlots.find( ( s : BranchTimeSlot ) : boolean => s.order === _classTimeSlot.slot_order );
                            const _room : PhongHoc           = rooms.find( ( r : PhongHoc ) : boolean => r.id === _classTimeSlot.room_id );
                            return {
                                ... _classTimeSlot ,
                                timeSlotLabel : _timeSlot ? `${ _timeSlot.name } : ${ _timeSlot.start } - ${ _timeSlot.end }` : '' ,
                                roomLabel     : _room ? _room.name : `Phòng học [${ _classTimeSlot.room_id }] không tồn tại` ,
                                weekDayLabel  : ClassTimeSlotDayToString( _classTimeSlot.day ) ,
                                capacityLabel : _room ? `${ _room.capacity } người` : '???'
                            }
                        } );
                    } )
                ).subscribe( {
                    next  : ( response : ClassTimeSlotExtended[] ) : void => {
                        this.classTimeSlots.set( response );
                        this.sectionShowTimeSlots.set( 'success' );
                    } ,
                    error : () : void => {
                        this.sectionShowTimeSlots.set( 'error' );
                    }
                } );
            }
            else {
                this.sectionShowTimeSlots.set( 'success' );
            }
        }
    }

    protected reloadClassTimeslots ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.loadClassTimeslots();
    }

    private loadAllClassTimeSlots () : void {
        this.loadAllClassTimeSlotsObserver.next();
        const branchID : number = this.classObject()?.csdt_id ?? 0;
        if ( branchID ) {
            joinSources<{
                classes : Class[],
                rooms : PhongHoc[],
                timeSlots : BranchTimeSlot[],
            }>( {
                classes   : this.loadBranchClasses( branchID ) ,
                rooms     : this.loadBranchRooms( branchID ) ,
                timeSlots : this.loadBranchTimeSlots( branchID )
            } ).pipe(
                takeUntil( merge( this.loadAllClassTimeSlotsObserver , this.destroyed$ ) ) ,
                map( ( response : { classes : Class[], timeSlots : BranchTimeSlot[], rooms : PhongHoc[] } ) : ClassTimeSlotRegister[] => {
                    const classTimeSlotRegisterStructure : ClassTimeSlotRegister[] = cloneDeep<BranchTimeSlot[]>( response.timeSlots.length ? response.timeSlots : [] ).map( ( timeSlot : BranchTimeSlot ) : ClassTimeSlotRegister => {
                        return {
                            timeSlot ,
                            days : {
                                monday    : cloneDeep( response.rooms ).map( ( room : PhongHoc ) : ClassTimeSlotRegisterRoom => {
                                    return { ... room , assigned : [] , slug : `monday-${ timeSlot.order }-${ room.id }` }
                                } ) ,
                                tuesday   : cloneDeep( response.rooms ).map( ( room : PhongHoc ) : ClassTimeSlotRegisterRoom => {
                                    return { ... room , assigned : [] , slug : `tuesday-${ timeSlot.order }-${ room.id }` }
                                } ) ,
                                wednesday : cloneDeep( response.rooms ).map( ( room : PhongHoc ) : ClassTimeSlotRegisterRoom => {
                                    return { ... room , assigned : [] , slug : `wednesday-${ timeSlot.order }-${ room.id }` }
                                } ) ,
                                thursday  : cloneDeep( response.rooms ).map( ( room : PhongHoc ) : ClassTimeSlotRegisterRoom => {
                                    return { ... room , assigned : [] , slug : `thursday-${ timeSlot.order }-${ room.id }` }
                                } ) ,
                                friday    : cloneDeep( response.rooms ).map( ( room : PhongHoc ) : ClassTimeSlotRegisterRoom => {
                                    return { ... room , assigned : [] , slug : `friday-${ timeSlot.order }-${ room.id }` }
                                } ) ,
                                saturday  : cloneDeep( response.rooms ).map( ( room : PhongHoc ) : ClassTimeSlotRegisterRoom => {
                                    return { ... room , assigned : [] , slug : `saturday-${ timeSlot.order }-${ room.id }` }
                                } ) ,
                                sunday    : cloneDeep( response.rooms ).map( ( room : PhongHoc ) : ClassTimeSlotRegisterRoom => {
                                    return { ... room , assigned : [] , slug : `sunday-${ timeSlot.order }-${ room.id }` }
                                } )
                            }
                        }
                    } );

                    const rows : ClassTimeSlotRegisterRoom[] = classTimeSlotRegisterStructure.reduce( ( reducer : ClassTimeSlotRegisterRoom[] , _timeSlotRegister : ClassTimeSlotRegister ) : any[] => {
                        reducer.push(
                            ... _timeSlotRegister.days.monday ,
                            ... _timeSlotRegister.days.tuesday ,
                            ... _timeSlotRegister.days.wednesday ,
                            ... _timeSlotRegister.days.thursday ,
                            ... _timeSlotRegister.days.friday ,
                            ... _timeSlotRegister.days.saturday ,
                            ... _timeSlotRegister.days.sunday
                        );
                        return reducer;
                    } , [] );

                    response.classes.forEach( ( _class : Class ) : void => {
                        if ( _class.time_slots && Is.array( _class.time_slots ) && _class.time_slots.length ) {
                            _class.time_slots.forEach( ( __timeSlot : ClassTimeSlot ) : void => {
                                const __index : number = rows.findIndex( ( i : ClassTimeSlotRegisterRoom ) : boolean => i.slug === `${ __timeSlot.day }-${ __timeSlot.slot_order }-${ __timeSlot.room_id }` )
                                if ( __index !== -1 ) {
                                    rows[ __index ].assigned.push( _class );
                                }
                            } );
                        }
                    } );
                    return classTimeSlotRegisterStructure;
                } )
            ).subscribe( {
                next  : ( response : ClassTimeSlotRegister[] ) : void => {
                    this.classTimeSlotRegisters.set( response );
                    this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : false , heading : '' } ) );
                } ,
                error : () : void => {
                    this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : false , heading : '' } ) );
                }
            } )
        }
        else {
            this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : false , heading : '' } ) );
        }
    }

    private loadBranchClasses ( branchID : number ) : Observable<Class[]> {
        const conditions : IctuConditionParam[] = [
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString() } ,
            { conditionName : 'csdt_id' , condition : IctuQueryCondition.equal , value : branchID.toString() , orWhere : 'and' } ,
            { conditionName : 'status' , condition : IctuQueryCondition.equal , value : '1' , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = {
            limit   : -1 ,
            paged   : 1 ,
            order   : 'ASC' ,
            orderby : 'name'
        };
        return this.classesService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<Class[]> ) : Class[] => response.data )
        )
    }

    private loadBranchTimeSlots ( branchID : number ) : Observable<BranchTimeSlot[]> {
        if ( this.classBranch()?.id === branchID ) {
            return of( Is.array( this.classBranch().time_slots ) ? this.classBranch().time_slots : [] )
        }
        const conditions : IctuConditionParam[] = [
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString() } ,
            { conditionName : 'id' , condition : IctuQueryCondition.equal , value : branchID.toString() , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = { limit : 1 , paged : 1 };
        return this.coSoDaoTaoService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<CoSoDaoTao[]> ) : WritableSignal<CoSoDaoTao> => {
                this.classBranch.set( response.data.length ? response.data[ 0 ] : null );
                return this.classBranch;
            } ) ,
            map( ( classBranch : WritableSignal<CoSoDaoTao> ) : BranchTimeSlot[] => Is.array( classBranch().time_slots ) ? classBranch().time_slots : [] )
        )
    }

    private loadBranchRooms ( branchID : number ) : Observable<PhongHoc[]> {
        if ( this.classRooms().length && this.classRooms()[ 0 ].csdt_id === branchID ) {
            return of( this.classRooms() )
        }
        else {
            const conditions : IctuConditionParam[] = [
                { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString() } ,
                { conditionName : 'csdt_id' , condition : IctuQueryCondition.equal , value : branchID.toString() , orWhere : 'and' } ,
                { conditionName : 'status' , condition : IctuQueryCondition.equal , value : '1' , orWhere : 'and' }
            ];
            const queryParams : IctuQueryParams     = { limit : -1 , paged : 1 , select : 'id,name,code,capacity,status,description,donvi_id,csdt_id' };
            return this.phongHocService.query( conditions , queryParams ).pipe(
                map( ( response : DtoObject<PhongHoc[]> ) : PhongHoc[] => {
                    this.classRooms.set( response.data );
                    return this.classRooms();
                } )
            )
        }
    }

    protected btnChooseClassTimeSlot ( day : ClassTimeSlotDay , timeSlot : BranchTimeSlot , room : ClassTimeSlotRegisterRoom ) : void {
        this.requestAssignTimeSlot.set( { day , timeSlot , room } );
        this.confirmAssignTimeSlotObserver.next( { day , timeSlot , room } );
    }

    protected btnClosePanel () : void {
        this.confirmAssignTimeSlotObserver.next( null );
    }

    protected btnSavePanel () : void {
        this.enableDialogAnimation.set( true );
        this.changeAssignTimeSlotObserver.next( this.requestAssignTimeSlot() );
    }

    protected updateAssignTimeSlot ( info : RequestAssignTimeSlot ) : void {
        // this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : true , heading : 'Cập nhật thông tin' } ) );
        const newTimeLoad : ClassTimeSlot  = {
            branch_id  : this.classObject().csdt_id ,
            room_id    : info.room.id , // mã phòng học
            slot_order : info.timeSlot.order , // order của slot đã đăng ký
            day        : info.day ,
            order      : ClassTimeSlotDayToNumber[ info.day ]
        }
        const _slots : ClassTimeSlot[]     = this.classObject().time_slots && Is.array( this.classObject().time_slots ) ? cloneDeep( this.classObject().time_slots ) : []
        const time_slots : ClassTimeSlot[] = sortBy( [ ... _slots , newTimeLoad ] , 'order' );
        this.classesService.update( this.classID() , { time_slots } ).pipe(
            switchMap( () : Observable<number> => {
                this.classObject.update( ( _class : Class ) : Class => ( { ... _class , time_slots } ) );
                this.sectionShowTimeSlots.set( 'loading' );
                this.enableDialogAnimation.set( false );
                this.btnClosePanel();
                this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : true , heading : 'Tải danh sách đăng ký lịch học...' } ) );
                return timer( 100 );
            } ) ,
            switchMap( () : Observable<number> => timer( 100 ) ) ,
            takeUntil( this.destroyed$ )
        ).subscribe( {
            next  : () : void => {
                this.loadAllClassTimeSlots();
                this.notification.toastSuccess( 'Đăng ký lich học thành công' );
            } ,
            error : () : void => {
                this.enableDialogAnimation.set( false );
            }
        } );
    }

    protected deleteClassTimeSlot ( itemIndex : number ) : void {
        this.notification.confirmDelete( 1 ).subscribe( ( confirm : boolean ) : void => {
            if ( confirm ) {
                const time_slots : ClassTimeSlot[] = cloneDeep( this.classObject().time_slots ).filter( ( _ : ClassTimeSlot , index : number ) : boolean => index !== itemIndex );
                this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : true , heading : 'Xóa lịch đăng ký...' } ) );
                this.classesService.update( this.classID() , { time_slots } ).pipe(
                    switchMap( () : Observable<number> => {
                        this.classObject.update( ( _class : Class ) : Class => ( { ... _class , time_slots } ) );
                        this.classTimeSlots.update( ( _classTimeSlots : ClassTimeSlotExtended[] ) : ClassTimeSlotExtended[] => {
                            return cloneDeep( _classTimeSlots ).filter( ( _ : ClassTimeSlot , index : number ) : boolean => index !== itemIndex );
                        } );
                        return timer( 200 );
                    } ) ,
                    takeUntil( this.destroyed$ )
                ).subscribe( {
                    next  : () : void => {
                        this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : false , heading : '' } ) );
                        this.notification.toastSuccess( 'Xóa lịch đăng ký thành công' )
                    } ,
                    error : () : void => {
                        this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : false , heading : '' } ) );
                        this.notification.toastError( 'Xóa lịch đăng ký thất bại' )
                    }
                } )
            }
        } )
    }

    protected btnUpdateSection ( section : ClassSessionCalendar ) : void {
        if ( canSessionBeChanged( section , this.maxActivatedSessionOrdering() ) ) {
            this.selectUpdateSection.set( section );
        }
    }

    protected btnRescheduleClassSessions ( startSection : ClassSessionCalendar ) : void {
        if ( canSessionBeChanged( startSection , this.maxActivatedSessionOrdering() ) ) {
            this.dirty.set( false );
            this.rescheduleSectionID.set( startSection.id );
        }
    }

    protected closeDialog ( dirty : boolean ) : void {
        this.selectUpdateSection.set( null );
        this.rescheduleSectionID.set( 0 );
        this.visibleUpdateSectionDialog     = false;
        this.visibleRescheduleSectionDialog = false;
        if ( dirty ) {
            this.loadData();
        }
    }

    // not done yet.
    // protected btnSyncClassSessionWidthClassCurriculums ( event : MouseEvent ) : void {
    //     event.preventDefault();
    //     event.stopPropagation();
    //     // refill the order of lessons to class sessions
    //     this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : true , heading : 'Tải xuống thông tin...' } ) );
    //     joinSources<{
    //         courseLessons : CourseLesson[],
    //         sessions : ClassSession[]
    //     }>( {
    //         sessions      : this.loadClassSessions( this.classID() ) ,
    //         courseLessons : this.loadCourseLessons( this.courseID() )
    //     } ).pipe(
    //         takeUntil( this.destroyed$ )
    //     ).subscribe( {
    //         next  : ( { sessions , courseLessons } : { courseLessons : CourseLesson[], sessions : ClassSession[] } ) : void => {
    //             const classLessons : ClassLesson[]                  = cloneDeep( this.classObject().curriculum );
    //             const _arrLoop : number[]                           = Helper.createNumberArray( Math.max( classLessons.length , sessions.length ) );
    //             const updateAnimationCells : ClassSessionSyncCell[] = _arrLoop.reduce( ( reducer : ClassSessionSyncCell[] , _ : number , index : number ) : ClassSessionSyncCell[] => {
    //                 const courseLesson : CourseLesson = classLessons[ index ] ? courseLessons.find( ( o : CourseLesson ) : boolean => o.id === classLessons[ index ].course_lesson_id ) : null;
    //                 // console.log( courseLesson );
    //                 reducer.push( new ClassSessionSyncCell( {
    //                     order              : 1 + index ,
    //                     classLesson        : classLessons[ index ] ,
    //                     classObject        : this.classObject() ,
    //                     course             : this.course() ,
    //                     classSession       : sessions[ index ] ,
    //                     courseLesson       : courseLesson ?? null ,
    //                     courseLessonParent : courseLesson ? courseLessons.find( ( o : CourseLesson ) : boolean => o.id === courseLesson.parent_id ) : null
    //                 } , this.classSessionService ) );
    //                 return reducer;
    //             } , new Array<ClassSessionSyncCell>() );
    //             this.resynchronizeClassSessionsQueue.set( updateAnimationCells );
    //             this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : false , heading : '' } ) );
    //             this.startResyncingClassSessions();
    //         } ,
    //         error : () : void => {
    //             this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : false , heading : '' } ) );
    //         }
    //     } );
    // }

    // private startResyncingClassSessions () : void {
    //     if ( this.resynchronizeClassSessionsQueue().length ) {
    //         this.state.set( 'resynchronizeClassSessions' );
    //         this.loopResyncingClassSessions();
    //     }
    //     else {
    //         this.loadData();
    //     }
    // }

    // private loopResyncingClassSessions () : void {
    //     const index : number = this.resynchronizeClassSessionsQueue().findIndex( ( i : ClassSessionSyncCell ) : boolean => i.status === 'waiting' );
    //     if ( -1 === index ) {
    //         this.classesService.update( this.classID() , { sync_required : 0 } ).pipe(
    //             takeUntil( this.destroyed$ )
    //         ).subscribe( {
    //             next  : () : void => {
    //                 this.classObject.update( ( _class : Class ) : Class => ( { ... _class , sync_required : 0 } ) );
    //                 this.loadData();
    //             } ,
    //             error : () : void => {
    //                 this.loadData();
    //             }
    //         } )
    //     }
    //     else {
    //         this.resynchronizeClassSessionsQueue()[ index ].sync().pipe(
    //             takeUntil( this.destroyed$ )
    //         ).subscribe( {
    //             next  : () : void => {
    //                 this.resynchronizeClassSessionsQueue.update( ( _tasks : ClassSessionSyncCell[] ) : ClassSessionSyncCell[] => ( [ ... _tasks ] ) );
    //                 this.loopResyncingClassSessions();
    //             } ,
    //             error : () : void => {
    //                 this.loopResyncingClassSessions();
    //             }
    //         } )
    //     }
    // }

    protected btnSyncAllClassSessions ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.syncAllClassSessionsObserver.next();
        this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : true , heading : 'Tải xuống thông tin...' } ) );
    }

    private syncAllClassSessions () : void {
        this.prepareForTheSynchronization().pipe(
            takeUntil( this.destroyed$ ) ,
            switchMap( ( sessionsToUpdate : ClassSessionUpdater[] ) : Observable<boolean> => this.updateClassSessionsSequentially( sessionsToUpdate ) )
        ).subscribe( {
            next  : ( success : boolean ) : void => {
                if ( success ) {
                    this.classObject.update( ( _class : Class ) : Class => ( { ... _class , sync_required : 0 } ) );
                }
                else {
                    this.notification.toastError( 'Quá trình đồng bộ dữ liệu bị gián đoạn!' );
                }
                this.loadData();
            } ,
            error : () : void => {
                this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : false , heading : '' } ) );
                this.loadData();
            }
        } )
    }

    private prepareForTheSynchronization () : Observable<ClassSessionUpdater[]> {
        const branchID : number = this.classObject()?.csdt_id ?? 0;
        return branchID ? joinSources<{
            courseLessons : CourseLesson[],
            sessions : ClassSession[],
            branchTimeSlots : BranchTimeSlot[],
        }>( {
            sessions        : this.loadClassSessions( this.classID() ) ,
            courseLessons   : this.loadCourseLessons( this.courseID() ) ,
            branchTimeSlots : this.loadBranchTimeSlots( branchID )
        } ).pipe(
            map( ( { sessions , courseLessons , branchTimeSlots } : { courseLessons : CourseLesson[], sessions : ClassSession[], branchTimeSlots : BranchTimeSlot[] } ) : ClassSessionUpdater[] => {
                const classLessons : ClassLesson[] = cloneDeep( this.classObject().curriculum );
                const _arrLoop : number[]          = Helper.createNumberArray( Math.max( classLessons.length , sessions.length ) );
                return _arrLoop.reduce( ( reducer : ClassSessionUpdater[] , _ : number , index : number ) : ClassSessionUpdater[] => {
                    const courseLesson : CourseLesson = classLessons[ index ] ? courseLessons.find( ( o : CourseLesson ) : boolean => o.id === classLessons[ index ].course_lesson_id ) : null;
                    reducer.push( new ClassSessionUpdater( {
                        order              : 1 + index ,
                        classLesson        : classLessons[ index ] ,
                        classObject        : this.classObject() ,
                        course             : this.course() ,
                        classSession       : sessions[ index ] ,
                        courseLesson       : courseLesson ,
                        courseLessonParent : courseLesson ? courseLessons.find( ( o : CourseLesson ) : boolean => o.id === courseLesson.parent_id ) : null ,
                        branchTimeSlots    : branchTimeSlots
                    } , this.classSessionService ) );
                    return reducer;
                } , new Array<ClassSessionUpdater>() );
            } )
        ) : of( [] );
    }

    private updateClassSessionsSequentially ( sessionsToUpdate : ClassSessionUpdater[] ) : Observable<boolean> {
        this.totalSyncItems.set( sessionsToUpdate.length );
        this.syncSuccessCounter.set( 0 );
        this.state.set( 'resynchronizeClassSessions' );
        return sessionsToUpdate.reduce( ( reducer : Observable<number> , session : ClassSessionUpdater , index : number ) : Observable<number> => {
            return reducer.pipe(
                concatMap( ( complete : number ) : Observable<number> => {
                    const prev : ClassSessionUpdater = index > 0 ? sessionsToUpdate[ ( index - 1 ) ] : null;
                    return session.sync( prev ).pipe(
                        map( ( success : boolean ) : number => success ? ( 1 + complete ) : complete ) ,
                        catchError( () : Observable<number> => of( complete ) ) , // Nếu có lỗi, vẫn tiếp tục
                        tap( ( _completed : number ) : void => this.syncSuccessCounter.update( () : number => _completed ) ) , // update counter
                        delay( 100 )
                    );
                } )
            );
        } , of( 0 ) ).pipe(
            map( ( totalCompleted : number ) : boolean => ( this.totalSyncItems() === totalCompleted ) ) ,
            switchMap( ( success : boolean ) : Observable<boolean> => {
                return success ? this.classesService.update( this.classID() , { sync_required : 0 } ).pipe( map( () : boolean => success ) ) : of( success );
            } )
        )
    }

    ngOnDestroy () : void {
        this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : false , heading : '' } ) );
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
