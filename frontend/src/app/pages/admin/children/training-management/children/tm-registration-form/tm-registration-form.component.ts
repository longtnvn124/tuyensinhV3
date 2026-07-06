import { Component , computed , inject , input , InputSignal , OnDestroy , OnInit , output , OutputEmitterRef , signal , Signal , WritableSignal } from '@angular/core';
import { LopHoc } from '@app/models/lop-hoc';
import { BranchTimeSlot , CoSoDaoTao } from '@models/co-so-dao-tao';
import { MatButton } from '@angular/material/button';
import { forkJoin , map , merge , Observable , Subject , takeUntil } from 'rxjs';
import { InputText } from 'primeng/inputtext';
import { AbstractControl , FormBuilder , FormGroup , FormsModule , Validators } from '@angular/forms';
import { ClassSession , ClassSessionType } from '@models/class-session';
import { AuthenticationService } from '@services/authentication.service';
import { Textarea } from 'primeng/textarea';
import dayjs , { Dayjs } from 'dayjs';
import WeekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import updateLocale from 'dayjs/plugin/updateLocale';
import { Date2textPipe } from '@app/pipes/date2text.pipe';
import { MatMenu , MatMenuItem , MatMenuTrigger } from '@angular/material/menu';
import { Is } from '@utilities/is';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { toObservable } from '@angular/core/rxjs-interop';
import { AppState } from '@models/app-state';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { ClassSessionService } from '@services/class-session.service';
import { FindInArrayPipe } from '@app/pipes/find-in-array.pipe';
import { NgStyle } from '@angular/common';
import { PhongHoc } from '@models/phong-hoc';
import { PhongHocService } from '@services/phong-hoc.service';
import { CourseLesson } from '@models/course-lesson';
import { CoursesLessonService } from '@services/course-lesson.service';
import { CoursesService } from '@services/course.service';
import { Course } from '@models/course';

// Kích hoạt plugin updateLocale
dayjs.extend( updateLocale );
dayjs.extend( isoWeek );
dayjs.extend( WeekOfYear );

// Đặt ngày bắt đầu tuần là thứ Hai (Monday)
dayjs.updateLocale( 'en' , {
    weekStart : 1  // 1 = Monday
} );

type RegistrationApprovalLang = 'vn' | 'en';

export interface TmCalendarDate {
    order : number; // day of week starts from 0 to 6
    slug : string; // DD-MM-YYYY
    date : Date;
    data : ClassSession[],
    isToday : boolean,
    visible : boolean
}

export interface RegistrationApproval {
    classItem : LopHoc;
    calendarRow : TmCalendarDate;
    coSoDaoTao : CoSoDaoTao;
    lang : RegistrationApprovalLang
}

type ClassSessionBase = Pick<ClassSession , 'title' | 'type' | 'donvi_id' | 'class_id' | 'course_id' | 'course_lesson_id' | 'teacher_id' | 'assistant_id' | 'started_at' | 'ended_at' | 'time_start' | 'time_end' | 'room_id' | 'csdt_id' | 'linhvuc_id' | 'status'>;

type FormClassSession = {
    [K in keyof ClassSessionBase as string] : AbstractControl<any>;
};

const _number2DayName : Record<RegistrationApprovalLang , ( num : number ) => string> = {
    en : ( index : number ) : string => {
        const _numObject : Record<number , string> = {
            0 : 'Monday' ,
            1 : 'Tuesday' ,
            2 : 'Wednesday' ,
            3 : 'Thursday' ,
            4 : 'Friday' ,
            5 : 'Saturday' ,
            6 : 'Sunday'
        }
        return _numObject[ index ] ?? '';
    } ,
    vn : ( index : number ) : string => {
        const _numObject : Record<number , string> = {
            0 : 'Thứ hai' ,
            1 : 'Thứ ba' ,
            2 : 'Thứ tư' ,
            3 : 'Thứ năm' ,
            4 : 'Thứ sáu' ,
            5 : 'Thứ bảy' ,
            6 : 'Chủ nhật'
        }
        return _numObject[ index ] ?? '';
    }
}

const number2DayName : ( index : number , lang : RegistrationApprovalLang ) => string = ( index : number , lang : RegistrationApprovalLang ) : string => _number2DayName[ lang ]( index );

interface ClassTimeSlotOption extends BranchTimeSlot {
    available : boolean;
}

type Lesson = Pick<CourseLesson , 'id' | 'code' | 'title' | 'ordering' | 'course_id' | 'status' | 'donvi_id'>;

interface LessonRegistration extends Lesson {
    heading : string;
    completed : boolean; // đã hoàn thành
    assigned : boolean; // đã được phân công
    moment : string; // Thời gian đã học hoặc thời gian đăng ký học của bài học hiện tại
}

interface ClassRoomRegistration extends PhongHoc {
    heading : string,
    _available : boolean
}

type ShortClassSession = Pick<ClassSession , 'id' | 'class_id' | 'type' | 'status' | 'time_start' | 'started_at' | 'ended_at' | 'course_lesson_id'>

interface RegistrationData {
    lessons : Lesson[],
    classSession : ShortClassSession[],
    courseInfo : CourseInfo,
    classRooms : PhongHoc[]
}

type CourseInfo = Pick<Course , 'id' | 'title' | 'donvi_id' | 'desc' | 'bacdaotao_id' | 'linhvuc_id' | 'duration' | 'status'>;

@Component( {
    selector    : 'tm-registration-form' ,
    imports     : [ MatButton , InputText , Textarea , Date2textPipe , MatMenu , MatMenuTrigger , MatMenuItem , LoadingProgressComponent , FindInArrayPipe , FormsModule , NgStyle ] ,
    templateUrl : './tm-registration-form.component.html' ,
    styleUrl    : './tm-registration-form.component.css'
} )
export class TmRegistrationFormComponent implements OnInit , OnDestroy {

    private auth : AuthenticationService = inject( AuthenticationService );

    private coursesService : CoursesService = inject( CoursesService );

    private coursesLessonService : CoursesLessonService = inject( CoursesLessonService );

    private classSessionService : ClassSessionService = inject( ClassSessionService );

    private phongHocService : PhongHocService = inject( PhongHocService );

    private fb : FormBuilder = inject<FormBuilder>( FormBuilder );

    registration : InputSignal<RegistrationApproval> = input.required<RegistrationApproval>();

    public readonly assignDate : Signal<string> = computed( () : string => {
        if ( this.registration() ) {
            const _dayJs : Dayjs       = dayjs( this.registration().calendarRow.date );
            const _prefix : string     = number2DayName( _dayJs.weekday() , this.registration().lang );
            const _dateFormat : string = this.registration().lang === 'vn' ? _dayJs.format( 'DD/MM/YYYY' ) : _dayJs.format( 'DD MMM YYYY' );
            return `${ _prefix }, ${ _dateFormat }`;
        }
        else {
            return '__, -- ---- -----';
        }
    } );

    public readonly availableTimeSlot : Signal<ClassTimeSlotOption[]> = computed( () : ClassTimeSlotOption[] => {
        if ( this.registration() && this.registration().coSoDaoTao.time_slots && Is.array( this.registration().coSoDaoTao.time_slots ) ) {
            const _usedTimeList : string[] = this.registration().calendarRow.data.map( ( r : ClassSession ) : string => r.time_start ).filter( Boolean );
            return this.registration().coSoDaoTao.time_slots.map( ( node : BranchTimeSlot ) : ClassTimeSlotOption => ( { ... node , available : ! _usedTimeList.includes( node.start ) } ) );
        }
        else {
            return [];
        }
    } );

    onClose : OutputEmitterRef<boolean> = output<boolean>(); // Declare an output signal

    private destroy$ : Subject<void> = new Subject();

    formGroup : FormGroup = this.fb.group( {
        title            : [ '' , [ Validators.maxLength( 100 ) ] ] ,
        type             : [ 'LECTURE' ] ,
        donvi_id         : [ this.auth.user.donvi_id , [ Validators.required ] ] ,
        class_id         : [ 0 , [ Validators.required ] ] ,
        course_id        : [ 0 , [ Validators.required ] ] ,
        course_lesson_id : [ 0 ] ,
        teacher_id       : [ 0 ] ,
        assistant_id     : [ 0 ] ,
        started_at       : [ '' ] ,
        ended_at         : [ '' ] ,
        time_start       : [ '' , [ Validators.required ] ] ,
        time_end         : [ '' , [ Validators.required ] ] ,
        room_id          : [ 0 , [ Validators.required ] ] ,
        csdt_id          : [ 0 , [ Validators.required ] ] ,
        linhvuc_id       : [ 0 , [ Validators.required ] ]
    } );

    readonly state : WritableSignal<AppState> = signal<AppState>( 'loading' );

    public readonly isLoading : Signal<boolean> = computed( () : boolean => this.state() === 'loading' );

    public readonly loadHeading : Signal<string> = computed( () : string => this.state() === 'loading' ? 'Tải xuống dữ liệu...' : 'Cập nhật dữ liệu...' );

    public readonly isError : Signal<boolean> = computed( () : boolean => this.state() === 'error' );

    private readonly data : WritableSignal<RegistrationData> = signal<RegistrationData>( null );

    // choose lesson
    public readonly lessonRegistration : Signal<LessonRegistration[]> = computed( () : LessonRegistration[] => {
        return this.data() ? this.data().lessons.map( ( l : Lesson ) : LessonRegistration => {
            const _assignedSession : ShortClassSession = this.data().classSession.find( ( t : ShortClassSession ) : boolean => t.course_lesson_id === l.id );
            const _date : string                       = ! _assignedSession ? '' : _assignedSession.started_at ? _assignedSession.started_at ? _assignedSession.time_start : _assignedSession.time_start : '';
            const completed : boolean                  = ! _assignedSession ? false : _assignedSession.status > 0;
            const assigned : boolean                   = ! _assignedSession ? false : _assignedSession.status >= 0;
            const moment : string                      = _date ? dayjs( _date ).format( 'DD/MM/YYYY HH:mm' ) : '';
            const _arrName : string[]                  = [ l.ordering ? `[${ l.ordering }] - ${ l.title }` : l.title ];
            // if ( l.page ) {
            //     _arrName.push( '(' , this.registration().lang === 'vn' ? 'trang' : 'page' , l.page , ')' );
            // }
            return { ... l , completed , assigned , moment , heading : _arrName.join( ' ' ) };
        } ) : [];
    } );

    public readonly curriculumFilter : WritableSignal<string> = signal<string>( '' );

    public readonly curriculums : Signal<LessonRegistration[]> = computed( () : LessonRegistration[] => this.curriculumFilter() ? this.lessonRegistration().filter( ( { title , ordering } : LessonRegistration ) : boolean => [ title , ordering ].join( ' ' ).includes( this.curriculumFilter() ) ) : this.lessonRegistration() );

    public readonly courseInfo : Signal<CourseInfo> = computed( () : CourseInfo => this.data()?.courseInfo );

    // choose classrooms
    public readonly listClassRooms : Signal<ClassRoomRegistration[]> = computed( () : ClassRoomRegistration[] => {
        return this.data() ? this.data().classRooms.map( ( _room : PhongHoc ) : ClassRoomRegistration => {
            const _arrHeading : string[] = [ _room.name ];
            if ( _room.code ) {
                _arrHeading.unshift( `${ _room.code } -` );
            }
            return { ... _room , heading : _arrHeading.join( ' ' ) , _available : true }
        } ) : [];
    } );

    public readonly classroomFilter : WritableSignal<string> = signal<string>( '' );

    public readonly filteredClassRooms : Signal<ClassRoomRegistration[]> = computed( () : ClassRoomRegistration[] => this.classroomFilter() ? this.listClassRooms().filter( ( { name , code , description } : ClassRoomRegistration ) : boolean => [ name , code , description ].join( ' ' ).includes( this.classroomFilter() ) ) : this.listClassRooms() );

    private onRegistrationChanges : Observable<RegistrationApproval> = toObservable( this.registration );

    private loadDataObserver : Subject<void> = new Subject<void>();

    get donviId () : number {
        return this.auth.user.donvi_id;
    }

    ngOnInit () : void {
        this.onRegistrationChanges.pipe(
            takeUntil( this.destroy$ )
        ).subscribe( () : void => this.loadData() )
    }

    private loadData () : void {
        this.loadDataObserver.next();
        this.state.set( 'loading' );
        forkJoin<{
            lessons : Observable<Lesson[]>,
            classSession : Observable<ShortClassSession[]>,
            courseInfo : Observable<CourseInfo>,
            classRooms : Observable<PhongHoc[]>,
        }>( {
            lessons      : this.loadLessons( this.registration().classItem.course_id , this.donviId ) ,
            classSession : this.loadClassSession( this.registration().classItem.id ) ,
            courseInfo   : this.loadCourseInfo( this.registration().classItem.course_id , this.donviId ) ,
            classRooms   : this.loadClassrooms( this.registration().coSoDaoTao.id , this.donviId )
        } ).pipe(
            takeUntil( merge( this.loadDataObserver , this.destroy$ ) )
        ).subscribe( {
            next  : ( data : RegistrationData ) : void => {
                this.data.set( data );
                this.state.set( 'success' );
            } ,
            error : () : void => {
                this.state.set( 'error' );
            }
        } )
    }

    private loadLessons ( khoahoc_id : number , donvi_id : number ) : Observable<Lesson[]> {
        const conditions : IctuConditionParam[] = [
            { conditionName : 'khoahoc_id' , condition : IctuQueryCondition.equal , value : khoahoc_id.toString() } ,
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : donvi_id.toString() , orWhere : 'and' } ,
            { conditionName : 'trangthai' , condition : IctuQueryCondition.equal , value : '1' , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = {
            limit   : -1 ,
            paged   : 1 ,
            select  : 'id,code,name,ordering,page,khoahoc_id,textbook,trangthai' ,
            order   : 'ASC' ,
            orderby : 'ordering'
        }
        return this.coursesLessonService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<CourseLesson[]> ) : Lesson[] => response.data.map( ( { id , code , title , ordering , course_id , status , donvi_id } : CourseLesson ) : Lesson => ( { id , code , title , ordering , course_id , status , donvi_id } ) ) )
        )
    }

    private loadClassSession ( class_id : number ) : Observable<ShortClassSession[]> {
        const conditions : IctuConditionParam[] = [
            { conditionName : 'class_id' , condition : IctuQueryCondition.equal , value : class_id.toString() } ,
            { conditionName : 'status' , condition : IctuQueryCondition.greaterThanToEqualsTo , value : '0' }
        ];
        const queryParams : IctuQueryParams     = {
            limit  : -1 ,
            paged  : 1 ,
            select : 'id,class_id,type,status,time_start,started_at,ended_at,course_lesson_id'
        };
        return this.classSessionService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<ClassSession[]> ) : ShortClassSession[] => response.data.map( ( { id , class_id , type , status , time_start , started_at , ended_at , course_lesson_id } : ClassSession ) : ShortClassSession => ( { id , class_id , type , status , time_start , started_at , ended_at , course_lesson_id } ) ) )
        )
    }

    private loadCourseInfo ( khoahoc_id : number , donvi_id : number ) : Observable<CourseInfo> {
        const conditions : IctuConditionParam[] = [
            { conditionName : 'id' , condition : IctuQueryCondition.equal , value : khoahoc_id.toString() } ,
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : donvi_id.toString() , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = {
            limit  : 1 ,
            paged  : 1 ,
            select : 'id,name,donvi_id,desc,bacdaotao_id,linhvuc_id,thoiluong,trangthai'
        }
        return this.coursesService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<Course[]> ) : CourseInfo => response.data.length ? ( response.data[ 0 ] as CourseInfo ) : null )
        );
    }

    private loadClassrooms ( csdt_id : number , donvi_id : number ) : Observable<PhongHoc[]> {
        const conditions : IctuConditionParam[] = [
            { conditionName : 'csdt_id' , condition : IctuQueryCondition.equal , value : csdt_id.toString() } ,
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : donvi_id.toString() , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = {
            limit   : -1 ,
            paged   : 1 ,
            select  : 'id,name,description,code,csdt_id,capacity,donvi_id,status' ,
            order   : 'ASC' ,
            orderby : 'name'
        }
        return this.phongHocService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<PhongHoc[]> ) : PhongHoc[] => response.data )
        );
    }

    public btnReload ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.loadData();
    }

    public get f () : FormClassSession {
        return this.formGroup.controls
    }

    public btnCancel () : void {
        this.onClose.emit( false );
    }

    public btnSave () : void {
    }

    public btnChangeType ( type : ClassSessionType ) : void {
        this.f[ 'type' ].setValue( type );
    }

    public registerTimeSlot ( timeSlot : ClassTimeSlotOption ) : void {
        if ( timeSlot.available ) {
            const [ _hoursStart , _minuteStart ] : number[] = timeSlot.start.split( ':' ).map( ( t : string ) : number => parseInt( t ) );
            const [ _hoursEnd , _minuteEnd ] : number[]     = timeSlot.end.split( ':' ).map( ( t : string ) : number => parseInt( t ) );
            const _dayJsStart : Dayjs                       = dayjs( this.registration().calendarRow.date );
            this.f[ 'time_start' ].setValue( _dayJsStart.set( 'hours' , _hoursStart ).set( 'minutes' , _minuteStart ).set( 'second' , 0 ).format( 'YYYY-MM-DD HH:mm:ss' ) );
            this.f[ 'time_end' ].setValue( _dayJsStart.set( 'hours' , _hoursEnd ).set( 'minutes' , _minuteEnd ).set( 'second' , 0 ).format( 'YYYY-MM-DD HH:mm:ss' ) );
        }
    }

    public registerLesson ( lesson : LessonRegistration ) : void {
        this.f[ 'course_lesson_id' ].setValue( lesson.id );
    }

    public registerClassroom ( room : ClassRoomRegistration ) : void {
        this.f[ 'room_id' ].setValue( room.id );
    }

    public avoidCloseMenuByClicking ( event : MouseEvent | KeyboardEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
    }

    ngOnDestroy () : void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
