import { Component , computed , inject , input , InputSignal , model , ModelSignal , OnDestroy , output , OutputEmitterRef , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { ClassSession } from '@models/class-session';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButton } from '@angular/material/button';
import { map , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { MatMenu , MatMenuItem , MatMenuTrigger } from '@angular/material/menu';
import { AbstractControl , AsyncValidatorFn , FormControl , FormGroup , ReactiveFormsModule , ValidationErrors } from '@angular/forms';
import { SharedModule } from '@shared/shared.module';
import { AsyncPipe , DatePipe , NgClass , NgStyle } from '@angular/common';
import { PhongHoc } from '@models/phong-hoc';
import { FormGroupType } from '@models/common';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { AppState } from '@models/app-state';
import { ClassSessionService } from '@services/class-session.service';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { IctuDropdownOption2 } from '@models/ictu-dropdown-option';
import { BranchTimeSlot , CoSoDaoTao } from '@models/co-so-dao-tao';
import { BaseEmployeeInfo , Employee , SimpleEmployee } from '@models/employee';
import { joinSources } from '@utilities/join-sources';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import { EmployeesService } from '@services/employees.service';
import { AuthenticationService } from '@services/authentication.service';
import { PhongHocService } from '@services/phong-hoc.service';
import { IctuDropdownOptionMapPipe } from '@pipes/ictu-dropdown-option-map.pipe';
import { FindInArrayPipe } from '@pipes/find-in-array.pipe';
import { ClassesService } from '@services/classes.service';
import { Class } from '@models/class';
import { DatePicker } from 'primeng/datepicker';
import { Str2datePipe } from '@pipes/str2date.pipe';
import dayjs , { Dayjs } from 'dayjs';
import { isArray } from 'lodash-es';
import { StudentAvatarPipe } from '@pipes/student-avatar.pipe';
import { StaffControlComponent } from '@components/form-controls/staff-control/staff-control.component';

type EditClassSessionFormFields = Pick<ClassSession , 'room_id' | 'time_start' | 'time_end' | 'assistant_id' | 'teacher_id' | 'time_slot_order'>

type EditClassSessionFromGroup = FormGroupType<EditClassSessionFormFields>;

type EditClassSessionValidateResponseState = 'success' | 'empty' | 'invalid';

type FormEditState = AppState | EditClassSessionValidateResponseState | 'validating' | 'submitting' | 'submitFail';

type PickClass = Pick<Class , 'id' | 'name' | 'code' | 'total_student' | 'course_id' | 'donvi_id' | 'started_date'>

interface EditClassSessionValidateResponse {
    state : EditClassSessionValidateResponseState,
    classSession : ClassSession,
}

interface EditClassSessionPreloadResponse extends EditClassSessionValidateResponse {
    timeSlots : BranchTimeSlot[];
    employees : BaseEmployeeInfo[];
    classrooms : PhongHoc[];
    classInfo : PickClass;
}

function roomValidator ( service : IctuBaseServiceClass<ClassSession> , classSessionID : number , destroyed : Observable<void> ) : AsyncValidatorFn {
    return ( control : AbstractControl ) : Observable<ValidationErrors | null> => {
        const room_id : number    = control.parent.get( 'room_id' )?.value;
        const time_start : string = control.parent.get( 'time_start' )?.value;
        if ( ! room_id || ! time_start ) {
            return of( null );
        }
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'room_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : room_id.toString()
            } ,
            {
                conditionName : 'time_start' ,
                condition     : IctuQueryCondition.equal ,
                value         : time_start ,
                orWhere       : 'and'
            } ,
            {
                conditionName : 'id' ,
                condition     : IctuQueryCondition.notEqual ,
                value         : classSessionID.toString() ,
                orWhere       : 'and'
            }
        ];
        const queryParams : IctuQueryParams     = {
            paged  : 1 ,
            limit  : 1 ,
            select : 'id,time_start,room_id'
        };
        return service.query( conditions , queryParams ).pipe(
            takeUntil( destroyed ) ,
            map( ( response : DtoObject<ClassSession[]> ) : ValidationErrors | null => {
                return isArray( response.data ) && response.data.length ? { roomNotAvailable : true } : null;
            } )
        )
    };
}

function timeSlotValidator ( service : IctuBaseServiceClass<ClassSession> , classSessionID : number , destroyed : Observable<void> ) : AsyncValidatorFn {
    return ( control : AbstractControl ) : Observable<ValidationErrors | null> => {
        const time_start : string = control.get( 'time_start' )?.value;

        if ( ! time_start ) {
            return of( null );
        }
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'time_start' ,
                condition     : IctuQueryCondition.equal ,
                value         : time_start
            } ,
            {
                conditionName : 'id' ,
                condition     : IctuQueryCondition.notEqual ,
                value         : classSessionID.toString() ,
                orWhere       : 'and'
            }
        ];
        const queryParams : IctuQueryParams     = {
            paged  : 1 ,
            limit  : 1 ,
            select : 'id,time_start,room_id'
        };
        return service.query( conditions , queryParams ).pipe(
            takeUntil( destroyed ) ,
            map( ( response : DtoObject<ClassSession[]> ) : ValidationErrors | null => {
                return isArray( response.data ) && response.data.length ? { slotNotAvailable : true } : null;
            } )
        )
    };
}

function teacherValidator ( service : IctuBaseServiceClass<ClassSession> , classSessionID : number , destroyed : Observable<void> ) : AsyncValidatorFn {
    return ( control : AbstractControl ) : Observable<ValidationErrors | null> => {
        return of( null )
    };
}

function assistantValidator ( service : IctuBaseServiceClass<ClassSession> , classSessionID : number , destroyed : Observable<void> ) : AsyncValidatorFn {
    return ( control : AbstractControl ) : Observable<ValidationErrors | null> => {
        return of( null )
    };
}

type FormValidatorConfigErrorName = 'ROOM_NOT_AVAILABLE' | 'TEACHER_NOT_AVAILABLE' | 'ASSISTANT_NOT_AVAILABLE';

interface FormValidatorConfig<K extends keyof ClassSessionEmployeeField> {
    conditions : IctuConditionParam[],
    queryParams : IctuQueryParams,
    control : K
}

type ClassSessionEmployeeField = Pick<ClassSession , 'assistant_id' | 'teacher_id'>

interface ClassSessionState {
    cssClasses : string;
    label : string;
}

@Component( {
    selector    : 'tm-form-edit-class-session' ,
    standalone  : true ,
    imports     : [ LoadingProgressComponent , MatButton , MatMenuTrigger , MatMenu , MatMenuItem , ReactiveFormsModule , SharedModule , NgStyle , DatePipe , IctuDropdownOptionMapPipe , FindInArrayPipe , DatePicker , Str2datePipe , AsyncPipe , NgClass , StudentAvatarPipe , StaffControlComponent ] ,
    templateUrl : './tm-form-edit-class-session.component.html' ,
    styleUrl    : './tm-form-edit-class-session.component.css'
} )
export class TmFormEditClassSessionComponent implements OnDestroy {

    private phongHocService : PhongHocService = inject( PhongHocService );

    private classSessionService : ClassSessionService = inject( ClassSessionService );

    private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

    private employeesService : EmployeesService = inject( EmployeesService );

    private classesService : ClassesService = inject( ClassesService );

    private auth : AuthenticationService = inject( AuthenticationService );

    /*****************************************************************
     * INPUT
     * ***************************************************************/
    classSessionID : InputSignal<number> = input.required<number>();

    /*****************************************************************
     * MODEL
     * ***************************************************************/
    employeeStore : ModelSignal<Employee[]> = model<Employee[]>();

    /*****************************************************************
     * OUTPUT
     * ***************************************************************/

    readonly employeeList : ModelSignal<SimpleEmployee[]> = model<SimpleEmployee[]>( [] );

    onClose : OutputEmitterRef<boolean> = output<boolean>();

    protected readonly classSession : WritableSignal<ClassSession> = signal( null );

    protected readonly state : WritableSignal<FormEditState> = signal<FormEditState>( 'loading' );

    protected readonly isLoading : Signal<boolean> = computed( () : boolean => [ 'loading' , 'submitting' , 'validating' ].includes( this.state() ) );

    protected readonly loadHeading : Signal<string> = computed( () : string => {
        switch ( this.state() ) {
            case 'submitting':
                return 'Cập nhật dữ liệu...';
            case 'validating':
                return 'Kiểm tra thông tin đăng ký...';
            default:
                return 'Tải xuống dữ liệu...';
        }
    } );

    protected readonly isError : Signal<boolean> = computed( () : boolean => this.state() === 'error' );

    protected readonly isEmpty : Signal<boolean> = computed( () : boolean => this.state() === 'empty' );

    protected readonly enable : Signal<boolean> = computed( () : boolean => this.classSession()?.status === 0 );

    protected readonly classSessionState : Signal<ClassSessionState> = computed( () : ClassSessionState => {
        let result : ClassSessionState = {
            cssClasses : 'text-muted' ,
            label      : 'Chưa bắt đầu'
        }
        if ( this.classSession() ) {
            switch ( this.classSession().status ) {
                case -1 :
                    return {
                        cssClasses : 'tm-registration-form__text--danger' ,
                        label      : 'Đã hủy'
                    };
                case 1 :
                    return {
                        cssClasses : 'tm-registration-form__text--primary' ,
                        label      : 'Đã bắt đầu'
                    };
                case 2 :
                    let label : string = 'Đã kết thúc';
                    if ( this.classSession().ended_at ) {
                        const d : Dayjs = dayjs( this.classSession().ended_at );
                        label           = `${ label } - [ ${ d.format( 'HH:mm - DD/MM/YYYY' ) } ]`;
                    }
                    return { cssClasses : 'tm-registration-form__text--success' , label };
                default :
                    return result;
            }
        }
        return result;
    } );

    protected readonly classroomFilter : WritableSignal<string> = signal<string>( '' );

    protected readonly classroomOptions : WritableSignal<IctuDropdownOption2<PhongHoc , number>[]> = signal( [] );

    protected readonly filteredClassRooms : Signal<IctuDropdownOption2<PhongHoc , number>[]> = computed( () : IctuDropdownOption2<PhongHoc , number>[] => {
        const textFilter : string = this.classroomFilter() ? this.classroomFilter().trim() : '';
        return textFilter ? this.classroomOptions().filter( ( option : IctuDropdownOption2<PhongHoc , number> ) : boolean => option.raw.name.includes( textFilter ) || option.raw.code.includes( textFilter ) ) : this.classroomOptions();
    } );

    protected readonly classInfo : WritableSignal<PickClass> = signal( null );

    protected readonly timeSlotOptions : WritableSignal<IctuDropdownOption2<BranchTimeSlot , number>[]> = signal( [] );

    private destroyed$ : Subject<void> = new Subject();

    protected formGroup : EditClassSessionFromGroup = new FormGroup( {
        room_id         : new FormControl<number>( 0 ) ,
        teacher_id      : new FormControl<number>( 0 ) ,
        time_end        : new FormControl<string>( '' ) ,
        time_slot_order : new FormControl<number>( 0 ) ,
        time_start      : new FormControl<string>( '' ) ,
        assistant_id    : new FormControl<number>( 0 )
    } );

    protected readonly employees : WritableSignal<BaseEmployeeInfo[]> = signal( [] );

    private get donViID () : number {
        return this.auth.user.donvi_id;
    }

    calendarMenu : Signal<MatMenuTrigger> = viewChild<MatMenuTrigger>( 'calendarMenuTrigger' );

    // private validatorTracking : Record<keyof EditClassSessionFormFields , boolean> = {
    //     room_id         : false ,
    //     assistant_id    : false ,
    //     teacher_id      : false ,
    //     time_slot_order : false ,
    //     time_start      : false ,
    //     time_end        : false
    // };

    protected selectedDate : Date | undefined;

    /***************************** Teachers menu ******************************/
    // protected menuTeacherState : WritableSignal<AppState | 'closed'> = signal( 'closed' );

    // menuTeacher : Signal<MatMenuTrigger> = viewChild<MatMenuTrigger>( 'menuTeacherTrigger' );
    //
    // searchTeacher : WritableSignal<string> = signal( '' );
    //
    // listTeachers : Signal<Employee[]> = computed( () : Employee[] => {
    //     return this.employeeStore() ? this.filterEmployee( 'teacher' , this.searchAssistant() ) : [];
    // } );

    /***************************** Assistants menu ******************************/
    // protected menuAssistantState : WritableSignal<AppState | 'closed'> = signal( 'closed' );
    //
    // menuAssistant : Signal<MatMenuTrigger> = viewChild<MatMenuTrigger>( 'menuAssistantTrigger' );
    //
    // searchAssistant : WritableSignal<string> = signal( '' );
    //
    // listAssistants : Signal<Employee[]> = computed( () : Employee[] => {
    //     return this.employeeStore() ? this.filterEmployee( 'assistant' , this.searchAssistant() ) : [];
    // } );

    // loadEmployeesObserver : Subject<void> = new Subject();

    constructor () {
        toObservable( this.classSessionID ).pipe(
            takeUntilDestroyed()
        ).subscribe( ( classSessionID : number ) : void => {
            // this.formGroup.clearAsyncValidators();
            // this.formGroup.setAsyncValidators( [
            //     roomValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() ) ,
            //     timeSlotValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() ) ,
            //     teacherValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() ) ,
            //     assistantValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() )
            // ] );
            this.loadData( classSessionID );
        } );

        // this.trackValidation( 'room_id' );
        // this.trackValidation( 'time_slot_order' );
        // this.trackValidation( 'teacher_id' );
        // this.trackValidation( 'assistant_id' );

        this.getControl( 'time_start' ).valueChanges.pipe(
            takeUntilDestroyed()
        ).subscribe( ( value : string ) : void => {
            if ( value ) {
                this.selectedDate = new Date( value );
            }
            else {
                this.selectedDate = undefined;
            }
        } );

        // toObservable( this.menuTeacher ).pipe(
        //     takeUntilDestroyed()
        // ).subscribe( ( menu : MatMenuTrigger ) : void => {
        //     this.registerMenuEvent( 'teacher_id' , menu );
        // } );
        //
        // toObservable( this.menuAssistant ).pipe(
        //     takeUntilDestroyed()
        // ).subscribe( ( menu : MatMenuTrigger ) : void => {
        //     this.registerMenuEvent( 'assistant_id' , menu );
        // } );
    }

    // private filterEmployee ( role : 'teacher' | 'assistant' , search : string = '' ) : Employee[] {
    //     const matchEmployee : RegExp = role === 'teacher' ? /\|teacher\|/gi : /\|teaching_assistant\|/gi;
    //     return this.employeeStore().filter( ( employee : Employee ) : boolean => {
    //         matchEmployee.lastIndex = 0; // Reset lastIndex mỗi lần kiểm tra
    //         return matchEmployee.test( employee.positions ) ? ( search ? ( employee.full_name.toLowerCase().includes( search.toLowerCase() ) || employee.email.toLowerCase().includes( search.toLowerCase() ) ) : true ) : false;
    //     } );
    // }

    // private trackValidation<K extends keyof EditClassSessionFormFields> ( controlName : K ) : void {
    //     const formControl : FormControl<any> = this.getControl( controlName );
    //     formControl.valueChanges.subscribe( () : void => {
    //         this.validatorTracking[ controlName ] = true;
    //     } );
    //     this.formGroup.statusChanges.subscribe( ( status : FormControlStatus ) : void => {
    //         if ( status !== 'PENDING' ) {
    //             this.validatorTracking[ controlName ] = false;
    //         }
    //     } );
    // }
    //
    // private resetFormAsyncValidators ( classSessionID : number ) : void {
    //     this.resetFormControlAsyncValidator( 'time_start' , [
    //         roomValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() ) ,
    //         timeSlotValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() ) ,
    //         teacherValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() ) ,
    //         assistantValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() )
    //     ] );
    //     this.resetFormControlAsyncValidator( 'room_id' , [
    //         roomValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() ) ,
    //         teacherValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() ) ,
    //         assistantValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() )
    //     ] );
    //     this.resetFormControlAsyncValidator( 'time_slot_order' , [
    //         roomValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() ) ,
    //         timeSlotValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() ) ,
    //         teacherValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() ) ,
    //         assistantValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() )
    //     ] );
    //     this.resetFormControlAsyncValidator( 'teacher_id' , [
    //         teacherValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() )
    //     ] );
    //     this.resetFormControlAsyncValidator( 'assistant_id' , [
    //         assistantValidator( this.classSessionService , classSessionID , this.destroyed$.asObservable() )
    //     ] );
    // }

    // private resetFormControlAsyncValidator<K extends keyof EditClassSessionFormFields> ( key : K , validators : AsyncValidatorFn[] ) : void {
    //     const formControl : FormControl<EditClassSessionFormFields[K]> = this.getControl( key );
    //     formControl.clearAsyncValidators();
    //     formControl.setAsyncValidators( validators );
    //     formControl.updateValueAndValidity( { emitEvent : true } );
    // }

    private loadBranchTimeSlots ( branchID : number , donViID : number ) : Observable<BranchTimeSlot[]> {
        if ( ! branchID ) {
            return of( [] );
        }
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'id' ,
                condition     : IctuQueryCondition.equal ,
                value         : branchID.toString()
            } ,
            {
                conditionName : 'donvi_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : donViID.toString() ,
                orWhere       : 'and'
            }
        ];
        const queryParams : IctuQueryParams     = {
            paged  : 1 ,
            limit  : 1 ,
            select : 'id,donvi_id,time_slots'
        };
        return this.coSoDaoTaoService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<CoSoDaoTao[]> ) : BranchTimeSlot[] => isArray( response.data ) && response.data.length ? response.data.pop().time_slots : [] )
        );
    }

    private loadEmployees ( donViID : number ) : Observable<BaseEmployeeInfo[]> {
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'positions' ,
                condition     : IctuQueryCondition.like ,
                value         : '%|teacher|%'
            } ,
            {
                conditionName : 'positions' ,
                condition     : IctuQueryCondition.like ,
                value         : '%|teaching_assistant|%' ,
                orWhere       : 'or'
            }
        ];
        const queryParams : IctuQueryParams     = {
            paged      : 1 ,
            limit      : -1 ,
            select     : 'id,full_name,email,phone,gender,photo,positions' ,
            include    : donViID.toString() ,
            include_by : 'donvi_id'
        };
        return this.employeesService.query( conditions , queryParams , 'all' ).pipe(
            map( ( response : DtoObject<Employee[]> ) : BaseEmployeeInfo[] => isArray( response.data ) ? response.data : [] )
        )
    }

    private loadClassrooms ( branchID : number , donViID : number ) : Observable<PhongHoc[]> {
        if ( ! branchID ) {
            return of( [] );
        }
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'csdt_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : branchID.toString()
            } ,
            {
                conditionName : 'donvi_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : donViID.toString() ,
                orWhere       : 'and'
            }
        ];
        const queryParams : IctuQueryParams     = {
            paged  : 1 ,
            limit  : -1 ,
            select : 'id,code,status,donvi_id,name,capacity,csdt_id'
        };
        return this.phongHocService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<PhongHoc[]> ) : PhongHoc[] => isArray( response.data ) ? response.data : [] )
        );
    }

    private loadClassInfo ( classID : number , donViID : number ) : Observable<PickClass> {
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'id' ,
                condition     : IctuQueryCondition.equal ,
                value         : classID.toString()
            } ,
            {
                conditionName : 'donvi_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : donViID.toString() ,
                orWhere       : 'and'
            }
        ];
        const queryParams : IctuQueryParams     = {
            paged  : 1 ,
            limit  : 1 ,
            select : 'id,name,code,total_student,course_id,donvi_id,started_date'
        };
        return this.classesService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<Class[]> ) : PickClass => response.data.length ? response.data.pop() : null )
        );
    }

    private loadData ( classSessionID : number ) : void {
        this.state.set( 'loading' );
        const conditions : IctuConditionParam[] = [
            { conditionName : 'id' , condition : IctuQueryCondition.equal , value : classSessionID.toString() } ,
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString() , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = { paged : 1 , limit : 1 , with : 'hocsinh' };
        this.classSessionService.query( conditions , queryParams ).pipe(
            takeUntil( this.destroyed$ ) ,
            map( ( response : DtoObject<ClassSession[]> ) : EditClassSessionValidateResponse => {
                if ( isArray( response.data ) && response.data.length > 0 ) {
                    return {
                        state        : response.data[ 0 ].status <= 0 ? 'success' : 'invalid' ,
                        classSession : response.data[ 0 ]
                    }
                }
                else {
                    return {
                        state        : 'empty' ,
                        classSession : null
                    }
                }
            } ) ,
            switchMap( ( { state , classSession } : EditClassSessionValidateResponse ) : Observable<EditClassSessionPreloadResponse> => {
                if ( state !== 'empty' ) {
                    return joinSources<EditClassSessionPreloadResponse>( {
                        state        : of( state ) ,
                        classSession : of( classSession ) ,
                        timeSlots    : this.loadBranchTimeSlots( classSession.csdt_id , classSession.donvi_id ) ,
                        employees    : this.loadEmployees( classSession.donvi_id ) ,
                        classrooms   : this.loadClassrooms( classSession.csdt_id , classSession.donvi_id ) ,
                        classInfo    : this.loadClassInfo( Math.max( classSession.class_id , classSession.parent_class_id ) , classSession.donvi_id )
                    } );
                }
                else {
                    return of( { state , classSession , timeSlots : [] , employees : [] , classrooms : [] , classInfo : null } );
                }
            } )
        ).subscribe( ( { state , classSession , timeSlots , employees , classrooms , classInfo } : EditClassSessionPreloadResponse ) : void => {
            if ( state !== 'empty' ) {
                this.classInfo.set( classInfo );
                this.timeSlotOptions.set( timeSlots.map( ( node : BranchTimeSlot ) : IctuDropdownOption2<BranchTimeSlot , number> => ( { value : node.order , label : `${ node.name } - [${ node.start } ~ ${ node.end }]` , raw : node } ) ) )
                this.classroomOptions.set( classrooms.map( ( classroom : PhongHoc ) : IctuDropdownOption2<PhongHoc , number> => ( {
                    value    : classroom.id ,
                    label    : `[${ classroom.code }] - ${ classroom.name }` ,
                    disabled : classroom.status === 0 ,
                    raw      : classroom
                } ) ) );
                this.classSession.set( classSession );
                this.employees.set( employees );
                this.formGroup.reset( {
                    room_id         : classSession.room_id ,
                    teacher_id      : classSession.teacher_id ,
                    time_end        : classSession.time_end ? dayjs( classSession.time_end ).format( 'YYYY-MM-DD HH:mm:ss' ) : '' ,
                    time_slot_order : classSession.time_slot_order ,
                    time_start      : classSession.time_start ? dayjs( classSession.time_start ).format( 'YYYY-MM-DD HH:mm:ss' ) : '' ,
                    assistant_id    : classSession.assistant_id
                } );

                if ( classSession.status !== 0 ) {
                    this.formGroup.disable();
                }
            }
            else {
                this.classInfo.set( null );
                this.classSession.set( null );
                this.classroomOptions.set( [] );
                this.employees.set( [] );
                this.timeSlotOptions.set( [] );
                this.formGroup.reset( {
                    room_id         : 0 ,
                    teacher_id      : 0 ,
                    time_end        : '' ,
                    time_slot_order : 0 ,
                    time_start      : '' ,
                    assistant_id    : 0
                } );
            }
            this.state.set( state );
        } );
    }

    protected getControl<K extends keyof EditClassSessionFormFields> ( key : K ) : FormControl<EditClassSessionFormFields[K]> {
        return this.formGroup.controls[ key ];
    }

    protected btnCancel () : void {
        this.onClose.emit( false );
    }

    protected btnSave () : void {
        if ( this.formGroup.valid ) {
            this.state.set( 'validating' );
            this.validateFormInfo( this.formGroup.value ).pipe(
                takeUntil( this.destroyed$ ) ,
                switchMap( ( errors : ValidationErrors ) : Observable<number> => {
                    if ( Object.keys( errors ).length ) {
                        this.formGroup.setErrors( errors );
                        this.formGroup.markAllAsTouched();
                        return of( 0 );
                    }
                    else {
                        const info : Partial<{
                            room_id : number
                            time_start : string
                            time_end : string
                            assistant_id : number
                            teacher_id : number
                            time_slot_order : number
                        }>                                                          = { ... this.formGroup.value };
                        const option : IctuDropdownOption2<BranchTimeSlot , number> = this.timeSlotOptions().find( ( i : IctuDropdownOption2<BranchTimeSlot , number> ) : boolean => i.value === parseInt( info.time_slot_order.toString( 10 ) , 10 ) );
                        if ( info.time_start && option ) {
                            const _dayJs : Dayjs = dayjs( info.time_start );
                            info.time_start      = `${ _dayJs.format( 'YYYY-MM-DD' ) } ${ option.raw.start }:00`;
                            info.time_end        = `${ _dayJs.format( 'YYYY-MM-DD' ) } ${ option.raw.end }:00`;
                        }
                        else {
                            info.time_start = '';
                            info.time_end   = '';
                        }
                        return this.classSessionService.update( this.classSessionID() , info )
                    }
                } ) ,
                map( ( n : number ) : boolean => !! n )
            ).subscribe( {
                next  : ( success : boolean ) : void => {
                    if ( success ) {
                        this.onClose.emit( true );
                    }
                    this.state.set( 'success' );
                } ,
                error : () : void => {
                    this.state.set( 'success' );
                }
            } )
        }
    }

    private validateFormInfo ( formValue : Partial<EditClassSessionFormFields> ) : Observable<ValidationErrors> {
        return of( {} ).pipe(
            switchMap( ( errors : ValidationErrors ) : Observable<ValidationErrors> => this.isRoomAvailable( formValue , errors ) ) ,
            switchMap( ( errors : ValidationErrors ) : Observable<ValidationErrors> => Object.keys( errors ).length ? of( errors ) : this.isAssignedEmployeesAvailable( formValue , errors ) )
            // switchMap( ( errors : ValidationErrors ) : Observable<ValidationErrors> => Object.keys( errors ).length ? of( errors ) : this.isEmployeeAvailable( 'teacher_id' , formValue , errors ) ) ,
            // switchMap( ( errors : ValidationErrors ) : Observable<ValidationErrors> => Object.keys( errors ).length ? of( errors ) : ( formValue.teacher_id && formValue.teacher_id !== formValue.assistant_id ? this.isEmployeeAvailable( 'assistant_id' , formValue , errors ) : of( errors ) ) )
        )
    }

    private isRoomAvailable ( formValue : Partial<EditClassSessionFormFields> , errors : ValidationErrors ) : Observable<ValidationErrors> {
        if ( ! formValue.room_id || ! formValue.time_start || ! formValue.time_slot_order || ! formValue.room_id ) {
            return of( errors );
        }
        const _dayJs : Dayjs                    = dayjs( formValue.time_start );
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'room_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : formValue.room_id.toString( 10 )
            } ,
            {
                conditionName : 'time_start' ,
                condition     : IctuQueryCondition.greaterThan ,
                value         : _dayJs.format( 'YYYY-MM-DD 00:00:00' ) ,
                orWhere       : 'and'
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
                value         : formValue.time_slot_order.toString( 10 ) ,
                orWhere       : 'and'
            } ,
            {
                conditionName : 'id' ,
                condition     : IctuQueryCondition.notEqualTo ,
                value         : this.classSessionID().toString() ,
                orWhere       : 'and'
            } ,
            {
                conditionName : 'donvi_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : this.classSession().donvi_id.toString( 10 ) ,
                orWhere       : 'and'
            }
        ];
        const queryParams : IctuQueryParams     = {
            paged  : 1 ,
            limit  : 1 ,
            select : 'id,time_start,room_id,donvi_id,time_slot_order'
        };
        return this._formValidator( { conditions , queryParams , control : 'room_id' } , errors )
    }

    private isEmployeeAvailable<K extends keyof ClassSessionEmployeeField> ( control : K , formValue : Partial<EditClassSessionFormFields> , errors : ValidationErrors ) : Observable<ValidationErrors> {
        if ( ! formValue[ control ] || ! formValue.time_start || ! formValue.time_slot_order ) {
            return of( errors );
        }
        const _dayJs : Dayjs                    = dayjs( formValue.time_start );
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'time_start' ,
                condition     : IctuQueryCondition.greaterThan ,
                value         : _dayJs.format( 'YYYY-MM-DD 00:00:00' ) ,
                orWhere       : 'and'
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
                value         : formValue.time_slot_order.toString( 10 ) ,
                orWhere       : 'and'
            } ,
            {
                conditionName : 'id' ,
                condition     : IctuQueryCondition.notEqualTo ,
                value         : this.classSessionID().toString() ,
                orWhere       : 'and'
            } ,
            {
                conditionName : 'donvi_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : this.classSession().donvi_id.toString( 10 ) ,
                orWhere       : 'and'
            } ,
            {
                conditionName : control ,
                condition     : IctuQueryCondition.equal ,
                value         : formValue[ control ].toString() ,
                orWhere       : 'and'
            }
        ];
        const queryParams : IctuQueryParams     = {
            paged  : 1 ,
            limit  : 1 ,
            select : [ 'id' , 'time_start' , 'time_slot_order' , control ].join( ',' )
        };
        return this._formValidator( { conditions , queryParams , control } , errors )
    }

    private isAssignedEmployeesAvailable ( formValue : Partial<EditClassSessionFormFields> , errors : ValidationErrors ) : Observable<ValidationErrors> {
        const employeeIDs : number[] = [];
        if ( formValue.teacher_id ) {
            employeeIDs.push( formValue.teacher_id );
        }

        if ( formValue.assistant_id ) {
            employeeIDs.push( formValue.assistant_id );
        }
        const uniqueEmployeeIDs : number[] = [ ... new Set( employeeIDs ) ];
        if ( ! formValue.room_id || ! formValue.time_start || ! formValue.time_slot_order || ! formValue.room_id || ! uniqueEmployeeIDs.length ) {
            return of( errors );
        }
        const _dayJs : Dayjs                    = dayjs( formValue.time_start );
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'time_start' ,
                condition     : IctuQueryCondition.greaterThan ,
                value         : _dayJs.format( 'YYYY-MM-DD 00:00:00' ) ,
                orWhere       : 'and'
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
                value         : formValue.time_slot_order.toString( 10 ) ,
                orWhere       : 'and'
            } ,
            {
                conditionName : 'id' ,
                condition     : IctuQueryCondition.notEqualTo ,
                value         : this.classSessionID().toString() ,
                orWhere       : 'and'
            }
        ];

        const queryParams : IctuQueryParams = {
            paged      : 1 ,
            limit      : -1 ,
            select     : 'id,time_start,donvi_id,time_slot_order,teacher_id,assistant_id' ,
            include    : this.classSession().donvi_id.toString( 10 ) ,
            include_by : 'donvi_id'
        };
        return this.classSessionService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<ClassSession[]> ) : ValidationErrors => {
                if ( response.data.length === 0 ) {
                    return errors;
                }
                else {
                    return response.data.reduce( ( reducer : ValidationErrors , { teacher_id , assistant_id } : ClassSession ) : ValidationErrors => {
                        if ( formValue.teacher_id && [ teacher_id , assistant_id ].includes( formValue.teacher_id ) ) {
                            reducer[ 'TEACHER_NOT_AVAILABLE' ] = true;
                        }
                        if ( formValue.assistant_id && [ teacher_id , assistant_id ].includes( formValue.assistant_id ) ) {
                            reducer[ 'ASSISTANT_NOT_AVAILABLE' ] = true;
                        }
                        return reducer
                    } , errors );
                }
            } )
        )
    }

    private _formValidator ( { conditions , queryParams , control } : FormValidatorConfig<any> , errors : ValidationErrors ) : Observable<ValidationErrors> {
        return this.classSessionService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<ClassSession[]> ) : ValidationErrors => {
                if ( response.data.length === 0 ) {
                    return errors;
                }
                else {
                    const errorName : FormValidatorConfigErrorName = control === 'room_id' ? 'ROOM_NOT_AVAILABLE' : ( control === 'teacher_id' ? 'TEACHER_NOT_AVAILABLE' : 'ASSISTANT_NOT_AVAILABLE' )
                    this.getControl( control ).setErrors( { errorName } )
                    return { ... errors , [ errorName ] : true };
                }
            } )
        )
    }

    protected btnReload ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
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

    // private storeEmployeesLoader () : Observable<Employee[]> {
    //     this.loadEmployeesObserver.next();
    //     const conditions : IctuConditionParam[] = [
    //         { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString( 10 ) } ,
    //         { conditionName : 'csdt_id' , condition : IctuQueryCondition.equal , value : this.classSession().csdt_id.toString( 10 ) , orWhere : 'and' }
    //     ];
    //     const queryParams : IctuQueryParams     = {
    //         paged   : 1 ,
    //         limit   : -1 ,
    //         order   : 'ASC' ,
    //         orderby : 'full_name'
    //     };
    //     return this.employeesService.query( conditions , queryParams , 'all' ).pipe(
    //         takeUntil( merge( this.loadEmployeesObserver , this.destroyed$ ) ) ,
    //         map( ( response : DtoObject<Employee[]> ) : Employee[] => response.data ) ,
    //         map( ( employees : Employee[] ) : Employee[] => {
    //             this.employeeStore.set( employees );
    //             return this.employeeStore();
    //         } )
    //     )
    // }

    /**
     * Action when teacher menu opened
     * */
    // private menuTeacherOpened<K extends keyof ClassSessionEmployeeField> ( controlName : K ) : void {
    //     if ( this.employeeStore().length ) {
    //         if ( controlName === 'teacher_id' ) {
    //             this.menuTeacherState.set( 'success' );
    //         }
    //         else {
    //             this.menuAssistantState.set( 'success' );
    //         }
    //     }
    //     else {
    //         if ( controlName === 'teacher_id' ) {
    //             this.menuTeacherState.set( 'loading' );
    //         }
    //         else {
    //             this.menuAssistantState.set( 'loading' );
    //         }
    //         this.storeEmployeesLoader().subscribe( {
    //             next  : () : void => {
    //                 if ( controlName === 'teacher_id' ) {
    //                     this.menuTeacherState.set( 'success' );
    //                 }
    //                 else {
    //                     this.menuAssistantState.set( 'success' );
    //                 }
    //             } ,
    //             error : () : void => {
    //                 if ( controlName === 'teacher_id' ) {
    //                     this.menuTeacherState.set( 'error' );
    //                 }
    //                 else {
    //                     this.menuAssistantState.set( 'error' );
    //                 }
    //             }
    //         } );
    //     }
    // }

    /**
     * Action when teacher menu closed
     * */
    // private menuTeacherClosed<K extends keyof ClassSessionEmployeeField> ( controlName : K ) : void {
    //     if ( controlName === 'teacher_id' ) {
    //         this.menuTeacherState.set( 'closed' );
    //     }
    //     else {
    //         this.menuAssistantState.set( 'closed' );
    //     }
    // }

    // protected reloadListEmployees<K extends keyof ClassSessionEmployeeField> ( controlName : K , event : MouseEvent ) : void {
    //     event.preventDefault();
    //     event.stopPropagation();
    //     this.menuTeacherOpened( controlName );
    // }
    //
    // private registerMenuEvent<K extends keyof ClassSessionEmployeeField> ( controlName : K , menu : MatMenuTrigger ) : void {
    //     menu.menuClosed.asObservable().pipe(
    //         takeUntil( this.destroyed$ )
    //     ).subscribe( () : void => {
    //         this.menuTeacherClosed( controlName );
    //     } );
    //
    //     menu.menuOpened.asObservable().pipe(
    //         takeUntil( this.destroyed$ )
    //     ).subscribe( () : void => {
    //         this.menuTeacherOpened( controlName );
    //     } );
    // }
    //
    // protected setClassSessionEmployee<K extends keyof ClassSessionEmployeeField> ( controlName : K , userID : number ) : void {
    //     this.getControl( controlName ).setValue( userID );
    //     this.getControl( controlName ).markAsTouched();
    //     if ( controlName === 'teacher_id' ) {
    //         this.menuTeacher().closeMenu();
    //     }
    //     else {
    //         this.menuAssistant().closeMenu();
    //     }
    // }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
