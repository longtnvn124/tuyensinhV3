import { Component , computed , inject , input , InputSignal , model , ModelSignal , OnDestroy , output , OutputEmitterRef , Signal , signal , WritableSignal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { FormControl , FormGroup , ReactiveFormsModule , Validators } from '@angular/forms';
import { Class , ClassExtend , LEARNING_MODE_OPTIONS , LearningMode } from '@models/class';
import { InputText } from 'primeng/inputtext';
import { AuthenticationService } from '@services/authentication.service';
import { FormGroupType } from '@models/common';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { IctuDropdownOption2 , IctuDropdownOptionElement } from '@models/ictu-dropdown-option';
import { DatePicker } from 'primeng/datepicker';
import { EmployeeControlMultipleComponent } from '@components/form-controls/employee-control-multiple/employee-control-multiple.component';
import { debounceTime , forkJoin , map , merge , Observable , of , Subject , takeUntil } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import { CoursesService } from '@services/course.service';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { CoSoDaoTao } from '@models/co-so-dao-tao';
import { Course } from '@models/course';
import dayjs from 'dayjs';
import { ClassesService } from '@services/classes.service';
import { NotificationService } from '@services/notification.service';
import { distinctUntilChanged } from 'rxjs/operators';
import { ClassPlanningAnimationLoading , ClassPlanningChildComponent , ClassPlanningRole } from '@pages/class-planning/class-planning.component';

type ClassFieldName = Pick<Class , 'name' | 'course_id' | 'started_date' | 'donvi_id' | 'code' | 'desc' | 'duration' | 'teacher_ids' | 'assistant_ids' | 'status' | 'csdt_id' | 'learning_mode'>

type ClassFormGroup = FormGroupType<ClassFieldName>;

type ClassPlanningFormState = 'preload' | 'error' | 'submittingFail' | 'submitting' | 'success';

@Component( {
    selector    : 'class-planning-form' ,
    imports     : [ MatButton , ReactiveFormsModule , InputText , Textarea , Select , DatePicker , EmployeeControlMultipleComponent ] ,
    templateUrl : './class-planning-form.component.html' ,
    styleUrl    : './class-planning-form.component.css'
} )
export class ClassPlanningFormComponent implements OnDestroy , ClassPlanningChildComponent {

    course : ModelSignal<Course> = model.required<Course>();

    role : InputSignal<ClassPlanningRole> = input.required<ClassPlanningRole>();

    classObject : ModelSignal<ClassExtend> = model.required<ClassExtend>();

    animationLoading : ModelSignal<ClassPlanningAnimationLoading> = model.required<ClassPlanningAnimationLoading>();

    updateQueryParams : OutputEmitterRef<number> = output<number>();

    protected readonly formHeading : Signal<string> = computed( () : string => this.classObject() ? 'Cập nhật thông tin lớp học' : 'Thêm lớp học mới' );

    protected readonly state : WritableSignal<ClassPlanningFormState> = signal( 'preload' );

    protected readonly learningModeOptions : Signal<IctuDropdownOptionElement<LearningMode>[]> = signal<IctuDropdownOptionElement<LearningMode>[]>(LEARNING_MODE_OPTIONS);

    protected readonly formValidators : typeof Validators = Validators;

    private auth : AuthenticationService = inject( AuthenticationService );

    private get donviID () : number {
        return this.auth.user?.donvi_id ?? 0;
    }

    protected formGroup : ClassFormGroup = new FormGroup( {
        name          : new FormControl<string>( '' , [ Validators.required , Validators.minLength( 2 ) , Validators.maxLength( 255 ) ] ) ,
        course_id     : new FormControl<number>( 0 , [ Validators.required , Validators.min( 1 ) ] ) ,
        started_date  : new FormControl<string>( '' ) ,
        donvi_id      : new FormControl<number>( this.donviID ) ,
        csdt_id       : new FormControl<number>( 0 , [ Validators.required , Validators.min( 1 ) ] ) ,
        code          : new FormControl<string>( '' ) ,
        desc          : new FormControl<string>( '' ) ,
        duration      : new FormControl<number>( 0 , [ Validators.pattern( /\d/ ) ] ) ,
        teacher_ids   : new FormControl<number[]>( [] ) ,
        assistant_ids : new FormControl<number[]>( [] ) ,
        learning_mode : new FormControl<LearningMode>( 'group' , Validators.required ) ,
        status        : new FormControl<number>( 0 )
    } );

    protected getControl<K extends keyof ClassFieldName> ( key : K ) : FormControl<ClassFieldName[K]> {
        return this.formGroup.get( key as string ) as FormControl<ClassFieldName[K]>;
    }

    private readonly branchesLoader : WritableSignal<IctuDropdownOptionElement<number>[]> = signal( null );

    private readonly courseLoader : WritableSignal<IctuDropdownOption2<Course , number>[]> = signal( null );

    protected readonly branchOptions : Signal<IctuDropdownOptionElement<number>[]> = computed( () : IctuDropdownOptionElement<number>[] => this.branchesLoader() ?? [] );

    protected readonly courseOptions : Signal<IctuDropdownOption2<Course , number>[]> = computed( () : IctuDropdownOption2<Course , number>[] => this.courseLoader() ?? [] );

    protected readonly STATUS_OPTIONS : Signal<IctuDropdownOptionElement<number>[]> = signal<IctuDropdownOptionElement<number>[]>( [
        { value : 0 , label : 'Dừng hoạt động' } ,
        { value : 1 , label : 'Đang hoạt động' }
    ] );

    private destroy$ : Subject<void> = new Subject<void>();

    private loadingObserver$ : Subject<void> = new Subject<void>();

    private submittingObserver$ : Subject<void> = new Subject<void>();

    private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

    private coursesService : CoursesService = inject( CoursesService );

    private classesService : ClassesService = inject( ClassesService );

    private notification : NotificationService = inject( NotificationService );

    constructor () {
        toObservable( this.classObject ).pipe(
            debounceTime( 200 ) ,
            takeUntil( this.destroy$ )
        ).subscribe( ( _class : Class ) : void => {
            this.loadFrom( _class );
        } );

        this.submittingObserver$.pipe(
            debounceTime( 1000 ) ,
            takeUntil( this.destroy$ )
        ).subscribe( () : void => {
            this._submitForm();
        } );

        merge<[ ClassPlanningFormState , ClassPlanningFormState ]>(
            toObservable( this.state ) ,
            of( this.state() )
        ).pipe(
            takeUntil( this.destroy$ ) ,
            distinctUntilChanged()
        ).subscribe( ( state : ClassPlanningFormState ) : void => {
            this.animationLoading.set( {
                enable  : [ 'submitting' , 'preload' ].includes( state ) ,
                heading : state === 'preload' ? 'Tải thông tin...' : 'Cập nhật thông tin...'
            } );
        } );
    }

    private _submitForm () : void {
        if ( this.formGroup.invalid ) {
            this.state.set( 'success' )
        }
        else {
            this.state.set( 'submitting' );
            const info : ClassFieldName = { ... this.formGroup.value } as ClassFieldName;
            if ( info.started_date ) {
                switch ( typeof info.started_date ) {
                    case 'object':
                        info.started_date = dayjs( info.started_date ).format( 'YYYY/MM/DD' );
                        break
                    case 'string':
                        info.started_date = info.started_date ? info.started_date.split( /[\/-]/gmi ).reverse().join( '/' ) : null
                        break
                    default :
                        info.started_date = null;
                        break;
                }
            }
            else {
                info.started_date = null
            }
            if ( this.classObject() ) {
                this.classesService.update( this.classObject().id , info ).pipe(
                    takeUntil( this.destroy$ )
                ).subscribe( {
                    next  : () : void => {
                        this.classObject.update( ( oldInfo : Class ) : Class => Object.assign<Class , Partial<Class>>( oldInfo , info ) );
                        this.notification.toastSuccess( 'Cập nhật thông tin lớp học thành công' );
                        this.loadFrom( this.classObject() );
                    } ,
                    error : () : void => {
                        this.state.set( 'submittingFail' );
                        this.notification.toastError( 'Cập nhật thông tin lớp học thất bại' );
                    }
                } )
            }
            else {
                this.classesService.create( info ).pipe(
                    takeUntil( this.destroy$ )
                ).subscribe( {
                    next  : ( class_id : number ) : void => {
                        this.state.set( 'success' );
                        this.notification.toastSuccess( 'Tạo lớp học mới thành công' );
                        this.updateQueryParams.emit( class_id );
                    } ,
                    error : () : void => {
                        this.state.set( 'submittingFail' );
                        this.notification.toastError( 'Tạo lớp học mới thất bại' );
                    }
                } )
            }
        }
    }

    private loadBranches () : Observable<IctuDropdownOptionElement<number>[]> {
        if ( this.branchesLoader() ) {
            return of( this.branchesLoader() );
        }
        const queryParams : IctuQueryParams = {
            limit      : -1 ,
            paged      : 1 ,
            include    : this.donviID.toString( 10 ) ,
            include_by : 'donvi_id' ,
            order      : 'ASC' ,
            orderby    : 'ten' ,
            select     : 'id,ten'
        };
        return this.coSoDaoTaoService.query( [] , queryParams ).pipe(
            map( ( { data } : DtoObject<CoSoDaoTao[]> ) : IctuDropdownOptionElement<number>[] => data.map( ( csdt : CoSoDaoTao ) : IctuDropdownOptionElement<number> => ( { value : csdt.id , label : csdt.ten } ) ) ) ,
            map( ( branchOptions : IctuDropdownOptionElement<number>[] ) : any => {
                this.branchesLoader.set( branchOptions );
                return branchOptions
            } )
        )
    }

    private loadCourseOptions () : Observable<IctuDropdownOptionElement<number>[]> {
        if ( this.courseLoader() ) {
            return of( this.courseLoader() );
        }
        const queryParams : IctuQueryParams = {
            limit   : -1 ,
            paged   : 1 ,
            order   : 'ASC' ,
            orderby : 'title' ,
            select  : 'id,title,sobaigiang,desc,status'
        };

        const conditions : IctuConditionParam[] = [
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donviID.toString( 10 ) }
        ];

        return this.coursesService.query( conditions , queryParams ).pipe(
            map( ( { data } : DtoObject<Course[]> ) : IctuDropdownOptionElement<number>[] => data.map( ( course : Course ) : IctuDropdownOption2<Course , number> => ( { value : course.id , label : course.title , disabled : course.status === 0 , raw : course } ) ) ) ,
            map( ( courseOptions : IctuDropdownOption2<Course , number>[] ) : any => {
                this.courseLoader.set( courseOptions );
                return courseOptions
            } )
        )
    }

    private loadFrom ( _class : Class ) : void {
        this.loadingObserver$.next();
        forkJoin<{
            course : Observable<IctuDropdownOptionElement<number>[]>,
            branches : Observable<IctuDropdownOptionElement<number>[]>,
        }>( {
            course   : this.loadCourseOptions() ,
            branches : this.loadBranches()
        } ).pipe(
            takeUntil( merge( this.destroy$ , this.loadingObserver$ ) )
        ).subscribe( {
            next  : () : void => {
                if ( _class ) {
                    this.formGroup.reset( {
                        name          : _class.name ,
                        course_id     : _class.course_id ,
                        started_date  : _class.started_date ? dayjs( _class.started_date ).format( 'DD/MM/YYYY' ) : '' ,
                        donvi_id      : _class.donvi_id ,
                        csdt_id       : _class.csdt_id ,
                        code          : _class.code ,
                        desc          : _class.desc ,
                        duration      : _class.duration ,
                        teacher_ids   : _class.teacher_ids ,
                        assistant_ids : _class.assistant_ids ,
                        learning_mode : _class.learning_mode ,
                        status        : _class.status
                    } );
                }
                else {
                    this.formGroup.reset( {
                        name          : '' ,
                        course_id     : 0 ,
                        started_date  : '' ,
                        donvi_id      : this.donviID ,
                        csdt_id       : 0 ,
                        code          : '' ,
                        desc          : '' ,
                        duration      : 0 ,
                        teacher_ids   : [] ,
                        assistant_ids : [] ,
                        learning_mode : 'group' ,
                        status        : 1
                    } );
                }
                this.state.set( 'success' );
            } ,
            error : () : void => {
                this.state.set( 'error' );
            }
        } )
    }

    protected getClassDuration ( { value } : { value : number } ) : void {
        const courseSelected : IctuDropdownOption2<Course , number> = this.courseOptions().find( ( option : IctuDropdownOption2<Course , number> ) : boolean => option.value === value );
        if ( courseSelected ) {
            this.formGroup.get( 'duration' ).setValue( courseSelected.raw.sobaigiang );
        }
        else {
            this.formGroup.get( 'duration' ).setValue( 0 );
        }
    }

    protected reload ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.loadFrom( this.classObject() );
    }

    protected submitData () : void {
        this.state.set( 'submitting' );
        this.submittingObserver$.next();
    }

    ngOnDestroy () : void {
        this.animationLoading.update( () : ClassPlanningAnimationLoading => ( { enable : false , heading : '' } ) );
        this.destroy$.next();
        this.destroy$.complete();
    }
}
