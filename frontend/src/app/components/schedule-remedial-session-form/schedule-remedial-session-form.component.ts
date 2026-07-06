import { Component , computed , inject , input , InputSignal , model , ModelSignal , OnDestroy , output , OutputEmitterRef , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { DiemDanhService } from '@services/diem-danh.service';
import { catchError , concatMap , debounceTime , delay , map , merge , Observable , of , Subject , switchMap , takeUntil , tap } from 'rxjs';
import { AppState } from '@models/app-state';
import { DiemDanh } from '@models/diem-danh';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { FormControl , FormGroup , FormsModule , ReactiveFormsModule , Validators } from '@angular/forms';
import { ClassSession , ClassSessionType } from '@models/class-session';
import { FormGroupType } from '@models/common';
import { MatButton } from '@angular/material/button';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { ClassSessionService } from '@services/class-session.service';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { joinSources } from '@utilities/join-sources';
import { assign , cloneDeep , isArray } from 'lodash-es';
import { Course } from '@models/course';
import { DatePipe , NgClass , NgStyle } from '@angular/common';
import { FindInArrayPipe } from '@pipes/find-in-array.pipe';
import { MatMenu , MatMenuItem , MatMenuTrigger } from '@angular/material/menu';
import { IctuDropdownOption2 } from '@models/ictu-dropdown-option';
import { PhongHoc } from '@models/phong-hoc';
import { BranchTimeSlot , CoSoDaoTao } from '@models/co-so-dao-tao';
import dayjs , { Dayjs } from 'dayjs';
import { DatePicker } from 'primeng/datepicker';
import { Str2datePipe } from '@pipes/str2date.pipe';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import { BranchTimeSlotInfoPipe } from '@pipes/branch-time-slot-info.pipe';
import { ScheduleRemedialSession } from '@components/schedule-remedial-session/schedule-remedial-session.component';
import { distinctUntilChanged , filter } from 'rxjs/operators';
import { PhongHocService } from '@services/phong-hoc.service';
import { StudentAvatarPipe } from '@pipes/student-avatar.pipe';
import { HocSinh } from '@models/hoc-sinh';

type ScheduleRemedialSessionState = AppState | 'checking' | 'checkingFail' | 'submitting' | 'emptyOfficialSession';

type ClassSessionFormFields = Pick<ClassSession , 'topic' | 'title' | 'type' | 'donvi_id' | 'class_id' | 'course_id' | 'course_lesson_id' | 'teacher_id' | 'assistant_id' | 'linhvuc_id' | 'time_start' | 'time_end' | 'time_slot_order' | 'csdt_id' | 'room_id' | 'status' | 'ordering' | 'student_ids' | 'diem_danh_ids' | 'parent_id' | 'parent_class_id'>

type ClassSessionForm = FormGroupType<ClassSessionFormFields>;

interface ClassSessionWithCourse extends ClassSession {
    course : Pick<Course , 'id' | 'type' | 'title' | 'code'>
}

interface CheckDataResponse {
    timeSlots : IctuDropdownOption2<BranchTimeSlot , number>[],
    officialClassSession : ClassSessionWithCourse,
    currentSession : ClassSession,
    classrooms : PhongHoc[];
}

type ScheduleRemedialSessionStudent = Pick<HocSinh , 'id' | 'full_name' | 'english_name' | 'dob' | 'gender' | 'avatar' | 'address'>;

@Component( {
    selector    : 'schedule-remedial-session-form' ,
    imports     : [ FormsModule , MatButton , ReactiveFormsModule , LoadingProgressComponent , DatePipe , FindInArrayPipe , NgClass , MatMenuTrigger , MatMenu , MatMenuItem , NgStyle , DatePicker , Str2datePipe , BranchTimeSlotInfoPipe , StudentAvatarPipe ] ,
    templateUrl : './schedule-remedial-session-form.component.html' ,
    styleUrl    : './schedule-remedial-session-form.component.css'
} )
export class ScheduleRemedialSessionFormComponent implements OnDestroy {

    private auth : AuthenticationService = inject( AuthenticationService );

    private notification : NotificationService = inject( NotificationService );

    private classSessionService : ClassSessionService = inject( ClassSessionService );

    private diemDanhService : DiemDanhService = inject( DiemDanhService );

    private phongHocService : PhongHocService = inject( PhongHocService );

    private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

    private destroyed$ : Subject<void> = new Subject<void>();

    /*****************************************************************
     * INPUT
     * ***************************************************************/
    scheduleRemedialSession : InputSignal<ScheduleRemedialSession[]> = input.required<ScheduleRemedialSession[]>();

    /*****************************************************************
     * MODEL
     * ***************************************************************/
    timeSlotOptions : ModelSignal<IctuDropdownOption2<BranchTimeSlot , number>[]> = model<IctuDropdownOption2<BranchTimeSlot , number>[]>( null );

    /*****************************************************************
     * MODEL
     * ***************************************************************/
    classrooms : ModelSignal<PhongHoc[]> = model<PhongHoc[]>( null );

    /*****************************************************************
     * OUTPUT
     * ***************************************************************/
    onClose : OutputEmitterRef<boolean> = output<boolean>();

    readonly students : Signal<ScheduleRemedialSessionStudent[]> = computed( () : ScheduleRemedialSessionStudent[] => {
        if ( this.currentSession() ) {
            return this.currentSession().hocsinh
        }
        else {
            return this.scheduleRemedialSession().length ? this.scheduleRemedialSession().map( ( { hocsinh } : ScheduleRemedialSession ) : ScheduleRemedialSessionStudent => cloneDeep( hocsinh ) ) : []
        }
    } )

    readonly state : WritableSignal<ScheduleRemedialSessionState> = signal<ScheduleRemedialSessionState>( 'checking' );

    readonly syncItems : WritableSignal<number[]> = signal<number[]>( [ 123 ] );

    readonly enableProgress : Signal<boolean> = computed( () : boolean => this.syncItems().length > 0 );

    readonly syncSuccessItemsCounter : WritableSignal<number> = signal( 0 );

    readonly syncProgress : Signal<number> = computed( () : number => {
        return this.syncItems().length ? Math.floor( ( this.syncSuccessItemsCounter() / this.syncItems().length ) * 100 ) : 0;
    } );

    readonly formGroup : ClassSessionForm = new FormGroup( {
        topic            : new FormControl<string>( '' ) ,
        title            : new FormControl<string>( '' ) ,
        type             : new FormControl<ClassSessionType>( 'LECTURE' ) ,
        donvi_id         : new FormControl<number>( 0 ) ,
        class_id         : new FormControl<number>( 0 ) ,
        course_id        : new FormControl<number>( 0 ) ,
        course_lesson_id : new FormControl<number>( 0 ) ,
        teacher_id       : new FormControl<number>( 0 ) ,
        assistant_id     : new FormControl<number>( 0 ) ,
        linhvuc_id       : new FormControl<number>( 0 ) ,
        time_start       : new FormControl<string>( '' , [ Validators.required , Validators.minLength( 1 ) ] ) ,
        time_end         : new FormControl<string>( '' ) ,
        time_slot_order  : new FormControl<number>( 0 , [ Validators.required , Validators.min( 1 ) ] ) ,
        csdt_id          : new FormControl<number>( 0 ) ,
        room_id          : new FormControl<number>( 0 ) ,
        status           : new FormControl<number>( 0 ) ,
        ordering         : new FormControl<number>( 0 ) ,
        parent_id        : new FormControl<number>( 0 ) ,
        parent_class_id  : new FormControl<number>( 0 ) ,
        student_ids      : new FormControl<number[]>( [] ) ,
        diem_danh_ids    : new FormControl<number[]>( [] )
    } );

    private dirty : boolean = false;

    private readonly officialClassSession : WritableSignal<ClassSessionWithCourse> = signal( null );

    readonly course : Signal<ClassSessionWithCourse['course']> = computed( () : ClassSessionWithCourse['course'] => {
        return this.officialClassSession() ? this.officialClassSession().course : null;
    } );

    private readonly currentSession : WritableSignal<ClassSession> = signal( null );

    private get userID () : number {
        return this.auth.user.id;
    }

    private get donViID () : number {
        return this.auth.user.donvi_id;
    }

    calendarMenu : Signal<MatMenuTrigger> = viewChild<MatMenuTrigger>( 'calendarMenuTrigger' );

    protected selectedDate : Date | undefined;

    protected readonly timeSlotMenuState : WritableSignal<AppState> = signal( 'loading' );

    protected readonly classroomMenuState : WritableSignal<AppState> = signal( 'loading' );

    protected readonly availableClassrooms : WritableSignal<PhongHoc[]> = signal( [] );

    private checkDataObserver : Subject<void> = new Subject<void>();

    private loadAvailableClassRoomsObserver : Subject<void> = new Subject<void>();

    private checkAvailableTeacherTimeSlotObserver : Subject<void> = new Subject<void>();

    private submittingFailureFlag : boolean = false;

    private submitFormObserver : Subject<Partial<ClassSessionFormFields>> = new Subject<Partial<ClassSessionFormFields>>();

    private reloadObserver : Subject<void> = new Subject<void>();

    constructor () {
        merge(
            toObservable( this.scheduleRemedialSession ) ,
            this.reloadObserver
        ).pipe(
            takeUntilDestroyed() ,
            debounceTime( 500 )
        ).subscribe( () : void => {
            this.checkData()
        } );

        this.submitFormObserver.asObservable().pipe(
            takeUntilDestroyed() ,
            debounceTime( 500 )
        ).subscribe( ( value : Partial<ClassSessionFormFields> ) : void => {
            this.submitForm( value );
        } );
    }

    private getOfficialClassSession ( diemDanh : DiemDanh ) : Observable<ClassSessionWithCourse> {
        return this.classSessionService.get( diemDanh.class_session_id , { with : 'course' } ) as Observable<ClassSessionWithCourse>;
    }

    private getCurrentSession ( diemDanh : DiemDanh[] ) : Observable<ClassSession> {
        const conditions : IctuConditionParam[] = [
            { conditionName : 'parent_id' , condition : IctuQueryCondition.equal , value : diemDanh[ 0 ].class_session_id.toString( 10 ) }
        ]
        const queryParams : IctuQueryParams     = {
            limit      : 1 ,
            paged      : 1 ,
            include    : diemDanh[ 0 ].donvi_id.toString() ,
            include_by : 'donvi_id' ,
            with       : 'hocsinh'
        }
        queryParams[ 'diem_danh_ids' ]          = diemDanh.map( ( { id } : DiemDanh ) : number => id ).join( ',' );
        return this.classSessionService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<ClassSession[]> ) : ClassSession => isArray( response.data ) ? response.data.shift() : null )
        )
    }

    private loadTimeSlots ( diemDanh : DiemDanh ) : Observable<IctuDropdownOption2<BranchTimeSlot , number>[]> {
        if ( this.timeSlotOptions() ) {
            return of( this.timeSlotOptions() )
        }
        if ( ! diemDanh.csdt_id ) {
            this.timeSlotOptions.set( [] );
            return of( this.timeSlotOptions() )
        }
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'id' ,
                condition     : IctuQueryCondition.equal ,
                value         : diemDanh.csdt_id.toString()
            } ,
            {
                conditionName : 'donvi_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : diemDanh.donvi_id.toString() ,
                orWhere       : 'and'
            }
        ];
        const queryParams : IctuQueryParams     = {
            paged  : 1 ,
            limit  : 1 ,
            select : 'id,donvi_id,time_slots'
        };
        return this.coSoDaoTaoService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<CoSoDaoTao[]> ) : IctuDropdownOption2<BranchTimeSlot , number>[] => {
                const _list : BranchTimeSlot[] = isArray( response.data ) && response.data.length ? response.data.pop().time_slots : [];
                this.timeSlotOptions.set( _list.map( ( raw : BranchTimeSlot ) : IctuDropdownOption2<BranchTimeSlot , number> => {
                    return {
                        value    : raw.order ,
                        label    : raw.name ,
                        disabled : false ,
                        raw
                    }
                } ) );
                return this.timeSlotOptions();
            } )
        );
    }

    private checkData () : void {
        if ( this.scheduleRemedialSession().length ) {
            this.state.set( 'checking' );
            this.checkDataObserver.next();
            joinSources<CheckDataResponse>( {
                timeSlots            : this.loadTimeSlots( this.scheduleRemedialSession()[ 0 ] ) ,
                classrooms           : this.loadClassrooms( this.scheduleRemedialSession()[ 0 ].csdt_id ) ,
                officialClassSession : this.getOfficialClassSession( this.scheduleRemedialSession()[ 0 ] ) ,
                currentSession       : this.getCurrentSession( this.scheduleRemedialSession() )
            } ).pipe(
                takeUntil( merge( this.checkDataObserver , this.destroyed$ ) )
            ).subscribe( {
                next  : ( { officialClassSession , currentSession } : CheckDataResponse ) : void => {
                    if ( officialClassSession ) {
                        this.currentSession.set( currentSession );
                        this.officialClassSession.set( officialClassSession );
                        const values : ClassSessionFormFields = {
                            topic    : officialClassSession.topic ,
                            title    : officialClassSession.title ,
                            type     : officialClassSession.type ,
                            donvi_id : officialClassSession.donvi_id ,
                            // class_id         : officialClassSession.class_id ,
                            class_id         : 0 ,
                            course_id        : officialClassSession.course_id ,
                            course_lesson_id : officialClassSession.course_lesson_id ,
                            parent_id        : officialClassSession.id ,
                            parent_class_id  : officialClassSession.class_id ,
                            teacher_id       : this.userID ,
                            assistant_id     : this.userID ,
                            linhvuc_id       : officialClassSession.linhvuc_id ,
                            time_start       : null ,
                            time_end         : null ,
                            time_slot_order  : 0 ,
                            csdt_id          : officialClassSession.csdt_id ,
                            room_id          : 0 ,
                            status           : 0 ,
                            ordering         : officialClassSession.ordering ,
                            student_ids      : currentSession ? currentSession.student_ids : this.scheduleRemedialSession().map( ( { hocsinh_id } : ScheduleRemedialSession ) : number => hocsinh_id ) ,
                            diem_danh_ids    : currentSession ? currentSession.diem_danh_ids : this.scheduleRemedialSession().map( ( { id } : ScheduleRemedialSession ) : number => id )
                        }
                        if ( currentSession ) {
                            values.time_start      = currentSession.time_start ? dayjs( currentSession.time_start ).format( 'YYYY-MM-DD' ) : null;
                            values.time_slot_order = currentSession?.time_slot_order ?? 0;
                            values.room_id         = currentSession?.room_id ?? 0;
                            this.formGroup.reset( values );
                            setTimeout( () => {
                                this.checkAvailableTeacherTimeSlot( false );
                                this.getAvailableClassRooms();
                            } , 100 );
                        }
                        else {
                            this.formGroup.reset( values );
                        }
                        this.registerFormEvents();
                        this.state.set( 'success' );
                    }
                    else {
                        this.state.set( 'emptyOfficialSession' );
                    }
                } ,
                error : () : void => {
                    this.state.set( 'checkingFail' );
                }
            } )
        }
    }

    protected reload ( event : Event ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.reloadObserver.next();
    }

    private registerFormEvents () : void {
        this.getControl( 'time_start' ).valueChanges.pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( ( value : string ) : void => {
            if ( value ) {
                this.selectedDate = new Date( value );
            }
            else {
                this.selectedDate = undefined;
            }
        } );

        merge<[ any , any ]>(
            this.getControl( 'time_slot_order' ).valueChanges.pipe(
                filter( Boolean ) ,
                debounceTime( 500 ) ,
                distinctUntilChanged()
            ) ,
            this.loadAvailableClassRoomsObserver.asObservable().pipe(
                debounceTime( 200 )
            )
        ).pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( () : void => {
            this.getAvailableClassRooms();
        } );

        merge<[ any , any ]>(
            this.getControl( 'time_start' ).valueChanges.pipe(
                filter( Boolean ) ,
                debounceTime( 500 ) ,
                distinctUntilChanged()
            ) ,
            this.checkAvailableTeacherTimeSlotObserver.asObservable().pipe(
                debounceTime( 200 )
            )
        ).pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( () : void => {
            this.checkAvailableTeacherTimeSlot( true );
        } );

        this.getControl( 'time_slot_order' ).valueChanges.pipe(
            takeUntil( merge( this.checkDataObserver , this.destroyed$ ) ) ,
            debounceTime( 200 ) ,
            distinctUntilChanged()
        ).subscribe( () : void => {
            this.getControl( 'room_id' ).setValue( 0 );
            this.getControl( 'room_id' ).markAsTouched();
        } );
    }

    private getAvailableClassRooms () : void {
        this.classroomMenuState.set( 'loading' );
        joinSources<{
            classrooms : PhongHoc[],
            classSession : ClassSession[]
        }>( {
            classrooms   : this.loadClassrooms( this.scheduleRemedialSession()[ 0 ].csdt_id ) ,
            classSession : this.getExistClassSessionsOnDate( this.getControl( 'time_start' ).value , this.getControl( 'time_slot_order' ).value )
        } ).pipe(
            takeUntil( merge( this.getControl( 'time_slot_order' ).valueChanges , this.destroyed$ ) )
        ).subscribe( {
            next  : ( { classrooms , classSession } : { classrooms : PhongHoc[], classSession : ClassSession[] } ) : void => {
                const registeredClassroomIDs : number[] = classSession.map( ( s : ClassSession ) : number => s.room_id );
                this.availableClassrooms.set( classrooms.filter( ( _classRoom : PhongHoc ) : boolean => ! registeredClassroomIDs.includes( _classRoom.id ) ) );
                this.classroomMenuState.set( 'success' );
            } ,
            error : () : void => {
                this.classroomMenuState.set( 'error' );
            }
        } );
    }

    private getExistClassSessionsOnDate ( timeStart : string , timeSlotOrder : number ) : Observable<ClassSession[]> {
        const _dayJs : Dayjs                    = dayjs( timeStart );
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'time_start' ,
                condition     : IctuQueryCondition.greaterThan ,
                value         : _dayJs.format( 'YYYY-MM-DD 00:00:00' )
            } ,
            {
                conditionName : 'time_start' ,
                condition     : IctuQueryCondition.lessThan ,
                value         : _dayJs.format( 'YYYY-MM-DD 23:59:00' ) ,
                orWhere       : 'and'
            } ,
            {
                conditionName : 'time_slot_order' ,
                condition     : IctuQueryCondition.equal ,
                value         : timeSlotOrder.toString( 10 ) ,
                orWhere       : 'and'
            } ,
            {
                conditionName : 'donvi_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : this.donViID.toString( 10 ) ,
                orWhere       : 'and'
            }
        ];
        const queryParams : IctuQueryParams     = {
            paged  : 1 ,
            limit  : 1 ,
            select : 'id,time_start,room_id,donvi_id,time_slot_order'
        };
        return this.classSessionService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<ClassSession[]> ) : ClassSession[] => response.data )
        )
    }

    private loadClassrooms ( csdt_id : number ) : Observable<PhongHoc[]> {
        if ( this.classrooms()?.length ) {
            return of( this.classrooms() );
        }
        else {
            const conditions : IctuConditionParam[] = [
                { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString( 10 ) } ,
                { conditionName : 'csdt_id' , condition : IctuQueryCondition.equal , value : csdt_id.toString( 10 ) , orWhere : 'and' }
            ];
            const queryParams : IctuQueryParams     = {
                limit  : -1 ,
                paged  : 1 ,
                select : 'id,name,code,csdt_id,capacity,donvi_id,status'
            }
            return this.phongHocService.query( conditions , queryParams ).pipe(
                map( ( response : DtoObject<PhongHoc[]> ) : PhongHoc[] => {
                    this.classrooms.set( response.data );
                    return this.classrooms();
                } )
            )
        }
    }

    protected regetAvailableClassRooms ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.loadAvailableClassRoomsObserver.next();
    }

    protected btnSaveForm () : void {
        this.state.set( 'submitting' );
        this.submitFormObserver.next( cloneDeep( this.formGroup.value ) )
    }

    private submitForm ( value : Partial<ClassSessionFormFields> ) : void {
        this.state.set( 'submitting' );
        this.syncItems.set( value.diem_danh_ids );
        const option : IctuDropdownOption2<BranchTimeSlot , number> = this.timeSlotOptions().find( ( i : IctuDropdownOption2<BranchTimeSlot , number> ) : boolean => i.value === parseInt( value.time_slot_order.toString( 10 ) , 10 ) );
        if ( value.time_start && option ) {
            const _dayJs : Dayjs = dayjs( value.time_start );
            value.time_start     = `${ _dayJs.format( 'YYYY-MM-DD' ) } ${ option.raw.start }:00`;
            value.time_end       = `${ _dayJs.format( 'YYYY-MM-DD' ) } ${ option.raw.end }:00`;
        }
        else {
            value.time_start = '';
            value.time_end   = '';
        }
        let submitRequest : Observable<any>;
        switch ( true ) {
            case !! this.currentSession():
                submitRequest = this.classSessionService.update( this.currentSession().id , value );
                break;
            case this.submittingFailureFlag:
                // check if previous session submit completed
                submitRequest = this.getCurrentSession( this.scheduleRemedialSession() ).pipe(
                    switchMap( ( session : ClassSession ) : Observable<any> => session ? this.classSessionService.update( session.id , value ) : this.classSessionService.create( value ) )
                );
                break;
            default:
                submitRequest = this.classSessionService.create( value )
                break;
        }
        submitRequest.pipe(
            takeUntil( this.destroyed$ ) ,
            switchMap( () : Observable<boolean> => this.updateDiemDanhProgressSequentially() )
        ).subscribe( {
            next  : ( success : boolean ) : void => {
                if ( success ) {
                    this.submittingFailureFlag = false;
                    this.notification.toastSuccess( 'Đăng ký lịch học thành công' );
                    this.onClose.emit( true );
                }
                else {
                    this.submittingFailureFlag = true;
                    this.state.set( 'success' );
                    this.notification.toastSuccess( 'Quá trình đăng ký lịch học thất bại. Vui lòng thực hiện lại.' );
                }
            } ,
            error : () : void => {
                this.submittingFailureFlag = true;
                this.state.set( 'success' );
            }
        } )
    }

    private updateDiemDanhProgressSequentially () : Observable<boolean> {
        this.syncSuccessItemsCounter.set( 0 );
        return this.syncItems().reduce( ( reducer : Observable<number> , diemDanhID : number ) : Observable<number> => {
            return reducer.pipe(
                concatMap( ( complete : number ) : Observable<number> => {
                    return this.diemDanhService.update( diemDanhID , { progress : 2 } ).pipe(
                        map( () : number => ( 1 + complete ) ) ,
                        catchError( () : Observable<number> => of( complete ) ) ,  // Nếu có lỗi, vẫn tiếp tục
                        tap( ( totalComplete : number ) : void => {
                            this.syncSuccessItemsCounter.set( totalComplete );
                        } ) ,
                        delay( 100 )
                    )
                } )
            )
        } , of( 0 ) ).pipe(
            map( ( totalCompleted : number ) : boolean => ( this.syncItems().length === totalCompleted ) )
        );
    }

    protected btnCloseDialog () : void {
        this.onClose.emit( this.dirty );
    }

    protected getControl<T extends keyof ClassSessionFormFields> ( field : T ) : FormControl<ClassSessionFormFields[T]> {
        return this.formGroup.controls[ field ];
    }

    protected resetControl<T extends keyof ClassSessionFormFields> ( field : T , value : ClassSessionFormFields[T] ) : void {
        const control : FormControl<ClassSessionFormFields[T]> = this.getControl( field );
        control.reset( value );
    }

    protected avoidCloseMenuByClicking ( event : MouseEvent | KeyboardEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
    }

    protected registerClassroom ( roomID : number ) : void {
        this.getControl( 'room_id' ).setValue( roomID );
        this.getControl( 'room_id' ).markAsTouched();
    }

    protected registerTimeSlot ( option : IctuDropdownOption2<BranchTimeSlot , number> ) : void {
        this.getControl( 'time_slot_order' ).setValue( option.value );
        this.getControl( 'time_slot_order' ).markAsTouched();
    }

    protected registerDate ( date : Date ) : void {
        this.calendarMenu().closeMenu();
        this.getControl( 'time_start' ).setValue( dayjs( date ).format( 'YYYY-MM-DD' ) );
        this.getControl( 'time_start' ).markAsTouched();
    }

    private checkAvailableTeacherTimeSlot ( resetRelatedFields : boolean ) : void {
        this.timeSlotOptions.update( ( list : IctuDropdownOption2<BranchTimeSlot , number>[] ) : IctuDropdownOption2<BranchTimeSlot , number>[] => list.map( ( item : IctuDropdownOption2<BranchTimeSlot , number> ) : IctuDropdownOption2<BranchTimeSlot , number> => assign<IctuDropdownOption2<BranchTimeSlot , number> , Pick<IctuDropdownOption2<BranchTimeSlot , number> , 'disabled'>>( item , { disabled : true } ) ) );
        const timeStart : string = this.getControl( 'time_start' ).value;
        if ( timeStart ) {
            this.timeSlotMenuState.set( 'loading' );
            const _dayJs : Dayjs                    = dayjs( timeStart );
            const conditions : IctuConditionParam[] = [
                { conditionName : 'teacher_id' , condition : IctuQueryCondition.equal , value : this.userID.toString( 10 ) } ,
                { conditionName : 'time_start' , condition : IctuQueryCondition.greaterThan , value : _dayJs.format( 'YYYY-MM-DD 00:00:00' ) , orWhere : 'and' } ,
                { conditionName : 'time_start' , condition : IctuQueryCondition.lessThan , value : _dayJs.format( 'YYYY-MM-DD 23:59:00' ) , orWhere : 'and' } ,
                { conditionName : 'status' , condition : IctuQueryCondition.equal , value : '0' , orWhere : 'and' } ,
                { conditionName : 'assistant_id' , condition : IctuQueryCondition.equal , value : this.userID.toString( 10 ) , orWhere : 'or' } ,
                { conditionName : 'time_start' , condition : IctuQueryCondition.greaterThan , value : _dayJs.format( 'YYYY-MM-DD 00:00:00' ) , orWhere : 'and' } ,
                { conditionName : 'time_start' , condition : IctuQueryCondition.lessThan , value : _dayJs.format( 'YYYY-MM-DD 23:59:00' ) , orWhere : 'and' } ,
                { conditionName : 'status' , condition : IctuQueryCondition.equal , value : '0' , orWhere : 'and' }
            ];
            const queryParams : IctuQueryParams     = {
                paged      : 1 ,
                limit      : -1 ,
                select     : 'time_start,teacher_id,donvi_id,assistant_id,time_slot_order,status' ,
                include    : this.donViID.toString( 10 ) ,
                include_by : 'donvi_id'
            };
            if ( this.currentSession() ) {
                queryParams[ 'exclude' ]    = this.currentSession().id;
                queryParams[ 'exclude_by' ] = 'id';
            }
            this.classSessionService.query( conditions , queryParams ).pipe(
                takeUntil(
                    merge<[ any , any , any ]>(
                        this.getControl( 'time_start' ).valueChanges ,
                        this.checkAvailableTeacherTimeSlotObserver ,
                        this.destroyed$
                    )
                ) ,
                map( ( response : DtoObject<ClassSession[]> ) : ClassSession[] => response.data )
            ).subscribe( {
                next  : ( classSessions : ClassSession[] ) : void => {
                    const registeredSlotOrdIds : number[] = classSessions.map( ( i : ClassSession ) : number => i.time_slot_order );
                    this.timeSlotOptions.update( ( list : IctuDropdownOption2<BranchTimeSlot , number>[] ) : IctuDropdownOption2<BranchTimeSlot , number>[] => list.map( ( item : IctuDropdownOption2<BranchTimeSlot , number> ) : IctuDropdownOption2<BranchTimeSlot , number> => assign<IctuDropdownOption2<BranchTimeSlot , number> , Pick<IctuDropdownOption2<BranchTimeSlot , number> , 'disabled'>>( item , { disabled : registeredSlotOrdIds.includes( item.value ) } ) ) );
                    if ( resetRelatedFields && this.getControl( 'time_slot_order' ).value && registeredSlotOrdIds.includes( Number( this.getControl( 'time_slot_order' ).value ) ) ) {
                        this.getControl( 'time_slot_order' ).setValue( 0 );
                        this.getControl( 'room_id' ).setValue( 0 );
                    }
                    this.timeSlotMenuState.set( 'success' );
                } ,
                error : () : void => {
                    this.timeSlotMenuState.set( 'error' );
                }
            } )
        }
    }

    protected btnRecheckAvailableTeacherTimeSlot ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.checkAvailableTeacherTimeSlotObserver.next();
    }

    ngOnDestroy () : void {
        this.destroyed$.next()
        this.destroyed$.complete();
    }
}
