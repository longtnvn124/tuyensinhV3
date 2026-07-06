import { Component , inject , input , InputSignal , model , ModelSignal , output , OutputEmitterRef , signal , WritableSignal } from '@angular/core';
import { ClassExtended } from '@components/classes/classes';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { debounceTime , map , merge , Observable , Subject , switchMap , takeUntil } from 'rxjs';
import { distinctUntilChanged , filter } from 'rxjs/operators';
import { AppState } from '@models/app-state';
import { NotificationService } from '@services/notification.service';
import { IctuDropdownOption2 } from '@models/ictu-dropdown-option';
import { MatButton } from '@angular/material/button';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { Course } from '@models/course';
import { CoursesService } from '@services/course.service';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { AuthenticationService } from '@services/authentication.service';
import { FindInArrayPipe } from '@pipes/find-in-array.pipe';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';
import { isArray } from 'lodash-es';
import { BUTTON_NO , BUTTON_YES , ButtonBase } from '@models/button';
import { ClassesService } from '@services/classes.service';
import { ClassHistoryService } from '@services/class-history.service';
import { ClassHistory } from '@models/class-history';
import { joinSources } from '@utilities/join-sources';
import { CourseLesson , courseLessons2ClassLessons } from '@models/course-lesson';
import { ClassLesson } from '@models/class';
import { CoursesLessonService } from '@services/course-lesson.service';

type ButtonEventName = 'backForward' | 'submit';

@Component( {
    selector    : 'app-class-course-upgrade' ,
    imports     : [ MatButton , Select , FormsModule , FindInArrayPipe , EmployeePhotoPipe ] ,
    templateUrl : './class-course-upgrade.component.html' ,
    styleUrl    : './class-course-upgrade.component.css'
} )
export class ClassCourseUpgradeComponent {

    /*****************************************************************
     * INPUT
     * ***************************************************************/
    classCourseUpgrade : InputSignal<ClassExtended> = input.required<ClassExtended>();

    /*****************************************************************
     * INPUT
     * ***************************************************************/
    courseOptions : ModelSignal<IctuDropdownOption2<Course , number>[]> = model<IctuDropdownOption2<Course , number>[]>( [] );

    /*****************************************************************
     * OUTPUT
     * ***************************************************************/
    onClose : OutputEmitterRef<boolean> = output<boolean>();

    readonly state : WritableSignal<AppState | ''> = signal( 'loading' );

    private readonly auth : AuthenticationService = inject( AuthenticationService );

    private readonly notification : NotificationService = inject( NotificationService );

    private readonly coursesService : CoursesService = inject( CoursesService );

    private readonly classesService : ClassesService = inject( ClassesService );

    private readonly classHistoryService : ClassHistoryService = inject( ClassHistoryService );

    private readonly coursesLessonService : CoursesLessonService = inject( CoursesLessonService );

    private destroyed$ : Subject<void> = new Subject<void>();

    private loaderObserver : Subject<void> = new Subject<void>();

    private buttonEventsObserver : Subject<ButtonEventName> = new Subject<ButtonEventName>();

    readonly courseSelected : WritableSignal<number> = signal<number>( 0 );

    constructor () {
        toObservable( this.classCourseUpgrade ).pipe(
            takeUntilDestroyed() ,
            debounceTime( 500 ) ,
            filter( Boolean ) ,
            distinctUntilChanged( ( previous : ClassExtended , current : ClassExtended ) : boolean => previous.id === current.id )
        ).subscribe( ( { donvi_id , id } : ClassExtended ) : void => {
            this.loadData( donvi_id , id );
        } );

        this.buttonEventsObserver.asObservable().subscribe( ( value : ButtonEventName ) : void => {
            if ( value === 'backForward' ) {
                this.courseSelected.set( null );
            }
            else {
                this.confirm();
            }
        } );
    }

    private loadData ( donViId : number , class_id : number ) : void {
        if ( this.courseOptions().length ) {
            this.state.set( 'success' );
            return;
        }
        this.state.set( 'loading' );
        this.loaderObserver.next();
        this.courseOptionsLoader( donViId , class_id ).pipe(
            takeUntil( merge( this.loaderObserver , this.destroyed$ ) )
        ).subscribe( {
            next  : ( courseOptions : IctuDropdownOption2<Course , number>[] ) : void => {
                this.courseOptions.set( courseOptions );
                this.state.set( 'success' );
            } ,
            error : () : void => {
                this.state.set( 'error' );
            }
        } )
    }

    private getCourseOptions ( donvi_id : number ) : Observable<IctuDropdownOption2<Course , number>[]> {
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'donvi_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : donvi_id.toString( 10 )
            } ,
            {
                conditionName : 'status' ,
                condition     : IctuQueryCondition.equal ,
                value         : '1' ,
                orWhere       : 'and'
            }
        ];
        const queryParams : IctuQueryParams     = {
            paged  : 1 ,
            limit  : -1 ,
            select : 'id,status,donvi_id,type,title,code,thumbnail,sobaigiang'
        };
        return this.coursesService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<Course[]> ) : IctuDropdownOption2<Course , number>[] => response.data.map( ( raw : Course ) : IctuDropdownOption2<Course , number> => ( { value : raw.id , label : raw.title , disabled : true , raw } ) ) )
        );
    }

    private courseOptionsLoader ( donvi_id : number , class_id : number ) : Observable<IctuDropdownOption2<Course , number>[]> {
        return joinSources<{
            courseOptions : IctuDropdownOption2<Course , number>[],
            completedCourseIDs : number[]
        }>( {
            courseOptions      : this.getCourseOptions( donvi_id ) ,
            completedCourseIDs : this.getCompletedCourseIDs( donvi_id , class_id )
        } ).pipe(
            map( ( { courseOptions , completedCourseIDs } : {
                courseOptions : IctuDropdownOption2<Course , number>[],
                completedCourseIDs : number[]
            } ) : IctuDropdownOption2<Course , number>[] => {
                const exceptedCourseIDs : number[] = [ this.classCourseUpgrade().course_id , ... completedCourseIDs ].filter( Boolean );
                return courseOptions.map( ( _option : IctuDropdownOption2<Course , number> ) : IctuDropdownOption2<Course , number> => ( { ... _option , disabled : exceptedCourseIDs.includes( _option.value ) } ) );
            } )
        )
    }

    private getCompletedCourseIDs ( donvi_id : number , class_id : number ) : Observable<number[]> {
        const conditions : IctuConditionParam[] = [ {
            conditionName : 'class_id' ,
            condition     : IctuQueryCondition.equal ,
            value         : class_id.toString()
        } ];
        const queryParams : IctuQueryParams     = {
            paged      : 1 ,
            limit      : -1 ,
            include_by : 'donvi_id' ,
            include    : donvi_id.toString( 10 ) ,
            select     : 'id,class_id,donvi_id,course_id'
        };
        return this.classHistoryService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<ClassHistory[]> ) : number[] => isArray( response.data ) ? response.data.map( ( h : ClassHistory ) : number => h.course_id ) : [] )
        )
    }

    btnClose ( dirty : boolean ) : void {
        this.onClose.emit( dirty );
    }

    buttonEvent ( value : ButtonEventName ) : void {
        this.buttonEventsObserver.next( value );
    }

    btnReload () : void {
        const { donvi_id , id } : ClassExtended = this.classCourseUpgrade();
        this.loadData( donvi_id , id );
    }

    private confirm () : void {
        this.notification.confirm( {
            heading : 'Xác nhận hành động!' ,
            message : 'Bạn có chắc chắn muốn thực hiện thao tác khởi tạo chương trình học không?' ,
            buttons : [ BUTTON_NO , BUTTON_YES ]
        } ).pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( ( response : ButtonBase ) : void => {
            if ( response.name === BUTTON_YES.name ) {
                this.createNewClassCourse();
            }
        } )
    }

    private createNewClassCourse () : void {
        this.state.set( 'loading' );
        joinSources<{
            createClassHistory : number,
            courseLessons : CourseLesson[]
        }>( {
            createClassHistory : this.classHistoryService.create( {
                donvi_id      : this.classCourseUpgrade().donvi_id ,
                course_id     : this.classCourseUpgrade().course_id ,
                course_name   : this.classCourseUpgrade().course?.title ?? '' ,
                csdt_id       : this.classCourseUpgrade().csdt_id ,
                class_id      : this.classCourseUpgrade().id ,
                curriculum    : this.classCourseUpgrade().curriculum ,
                time_slots    : this.classCourseUpgrade().time_slots ,
                teacher_ids   : this.classCourseUpgrade().teacher_ids ,
                assistant_ids : this.classCourseUpgrade().assistant_ids ,
                total_student : this.classCourseUpgrade().total_student ,
                total_lessons : ( isArray( this.classCourseUpgrade().curriculum ) ? this.classCourseUpgrade().curriculum : [] ).length
            } ) ,
            courseLessons      : this.loadCourseLessons( this.courseSelected() , this.classCourseUpgrade().donvi_id )
        } ).pipe(
            takeUntil( this.destroyed$ ) ,
            switchMap( ( { courseLessons } : { courseLessons : CourseLesson[] } ) : Observable<any> => {
                const classLessons : ClassLesson[] = courseLessons2ClassLessons( courseLessons );
                return this.classesService.update( this.classCourseUpgrade().id , {
                    course_id     : this.courseSelected() ,
                    curriculum    : classLessons ,
                    duration      : classLessons.length ,
                    sync_required : 0
                } );
            } )
        ).subscribe( {
            next  : () : void => {
                this.notification.toastSuccess( 'Khởi tạo chương trình học thành công.' );
                this.btnClose( true );
            } ,
            error : () : void => {
                this.notification.toastError( 'Khởi tạo chương trình học thất bại.' );
                this.state.set( 'success' );
            }
        } )
    }

    private loadCourseLessons ( course_id : number , donvi_id : number ) : Observable<CourseLesson[]> {
        const conditions : IctuConditionParam[] = [
            { conditionName : 'course_id' , condition : IctuQueryCondition.equal , value : course_id.toString() } ,
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : donvi_id.toString() , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = {
            limit : -1 ,
            paged : 1
        };
        return this.coursesLessonService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<CourseLesson[]> ) : CourseLesson[] => {
                return response.data;
            } )
        )
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }

}
