import { Component , computed , inject , input , InputSignal , OnDestroy , OnInit , Signal , signal , WritableSignal } from '@angular/core';
import { ClassPlanningRole } from '@pages/class-planning/class-planning.component';
import { debounceTime , map , merge , Observable , Subject , takeUntil } from 'rxjs';
import { AppState } from '@models/app-state';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { CdkDragDrop , CdkDropList } from '@angular/cdk/drag-drop';
import { DatePipe , NgClass } from '@angular/common';
import { Tooltip } from 'primeng/tooltip';
import { TmCalendarDate } from '@pages/admin/children/training-management/children/tm-registration-form/tm-registration-form.component';
import dayjs , { Dayjs } from 'dayjs';
import { ClassSession } from '@models/class-session';
import { toObservable } from '@angular/core/rxjs-interop';
import updateLocale from 'dayjs/plugin/updateLocale';
import isoWeek from 'dayjs/plugin/isoWeek';
import WeekOfYear from 'dayjs/plugin/weekOfYear';
import { ClassSessionService } from '@services/class-session.service';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { AuthenticationService } from '@services/authentication.service';

type DateAssignmentViewMode = 'week' | 'month';

interface ClassSessionAssignment extends ClassSession {
    disabled? : boolean;
}

interface RegistrationApproval {
    object : ClassSessionAssignment;
    calendarRow : TmCalendarDate;
}


// Kích hoạt plugin updateLocale
dayjs.extend( updateLocale );
dayjs.extend( isoWeek );
dayjs.extend( WeekOfYear );

// Đặt ngày bắt đầu tuần là thứ Hai (Monday)
dayjs.updateLocale( 'en' , {
    weekStart : 1  // 1 = Monday
} );

@Component( {
    selector    : 'app-cp-lesson-date-assignment' ,
    imports     : [ LoadingProgressComponent , CdkDropList , DatePipe , Tooltip , NgClass ] ,
    templateUrl : './cp-lesson-date-assignment.component.html' ,
    styleUrl    : './cp-lesson-date-assignment.component.css'
} )
export class CpLessonDateAssignmentComponent implements OnInit , OnDestroy {

    class_id : InputSignal<number> = input.required<number>();

    role : InputSignal<ClassPlanningRole> = input.required<ClassPlanningRole>();

    private destroy$ : Subject<void> = new Subject();

    protected readonly state : WritableSignal<AppState> = signal( 'loading' );

    readonly selectDate : WritableSignal<Date> = signal<Date>( new Date() );

    readonly weekDays : Signal<TmCalendarDate[]> = computed( () : TmCalendarDate[] => {
        return [ ... Array.from( { length : 7 } , ( _ : any , index : number ) : number => index ) ].reduce( ( reducer : TmCalendarDate[] , index : number ) : TmCalendarDate[] => {
            const _dayjs : Dayjs = dayjs( this.monday() ).add( index , 'days' );
            return [ ... reducer , {
                order   : index ,
                data    : [] ,
                date    : _dayjs.toDate() ,
                slug    : _dayjs.format( 'DD-MM-YYYY' ) ,
                isToday : dayjs( new Date() ).format( 'DD-MM-YYYY' ) === _dayjs.format( 'DD-MM-YYYY' ) ,
                visible : true
            } ];
        } , new Array<TmCalendarDate>() );
    } );

    readonly monthDays : Signal<TmCalendarDate[]> = computed( () : TmCalendarDate[] => {
        const _firstDayOfMonth : Dayjs           = dayjs( this.selectDate() ).startOf( 'month' );
        const totalEmptyElements : number        = _firstDayOfMonth.weekday();
        const _fillEmptyDates : TmCalendarDate[] = Array.from<number>( { length : totalEmptyElements } ).fill( 0 ).reduce( ( reducer : TmCalendarDate[] , _ : number , index : number ) : TmCalendarDate[] => {
            const _dayjs : Dayjs = _firstDayOfMonth.subtract( ( totalEmptyElements - index ) , 'days' );
            return [ ... reducer , {
                order   : -1 ,
                data    : [] ,
                date    : _dayjs.toDate() ,
                slug    : _dayjs.format( 'DD-MM-YYYY' ) ,
                isToday : false ,
                visible : false
            } ]
        } , new Array<TmCalendarDate>() );
        return [
            ... _fillEmptyDates ,
            ... Array.from( { length : dayjs( this.selectDate() ).daysInMonth() } , ( _ : any , index : number ) : number => index ).reduce( ( reducer : TmCalendarDate[] , index : number ) : TmCalendarDate[] => {
                const _dayjs : Dayjs = _firstDayOfMonth.add( index , 'days' );
                return [ ... reducer , {
                    order   : index ,
                    data    : [] ,
                    date    : _dayjs.toDate() ,
                    slug    : _dayjs.format( 'DD-MM-YYYY' ) ,
                    isToday : dayjs( new Date() ).format( 'DD-MM-YYYY' ) === _dayjs.format( 'DD-MM-YYYY' ) ,
                    visible : true
                } ]
            } , new Array<TmCalendarDate>() ) ];
    } );

    readonly viewMode : WritableSignal<DateAssignmentViewMode> = signal<DateAssignmentViewMode>( 'week' );

    readonly monday : Signal<Date> = computed( () : Date => {
        return dayjs( this.selectDate() ).startOf( 'isoWeek' ).toDate();
    } );

    readonly heading : Signal<string> = computed( () : string => {
        let suffix : string = '';
        if ( this.viewMode() === 'week' ) {
            suffix = `tuần ${ dayjs( this.monday() ).week() } (${ dayjs( this.monday() ).format( 'DD/MM/YYYY' ) } - ${ dayjs( this.monday() ).add( 6 , 'days' ).format( 'DD/MM/YYYY' ) })`;
        }
        else {
            suffix = `tháng ${ ( 1 + this.selectDate().getMonth() ) } năm ${ this.selectDate().getFullYear() } `;
        }
        return `Lịch học ${ suffix }`;
    } );

    private readonly draggedClass : WritableSignal<ClassSessionAssignment> = signal<ClassSessionAssignment>( null );

    public readonly registrationApproval : WritableSignal<RegistrationApproval> = signal<RegistrationApproval>( null );

    private readonly openRegistrationApprovalObserver : Observable<RegistrationApproval> = toObservable<RegistrationApproval>( this.registrationApproval );

    private classSessionService : ClassSessionService = inject<ClassSessionService>( ClassSessionService );

    private auth : AuthenticationService = inject<AuthenticationService>( AuthenticationService );

    private readonly _selectDateObserver : Observable<Date> = toObservable<Date>( this.selectDate );

    private readonly _viewModeObserver : Observable<DateAssignmentViewMode> = toObservable<DateAssignmentViewMode>( this.viewMode );

    get donviID () : number {
        return this.auth.user?.donvi_id ?? 0;
    }

    ngOnInit () : void {
        merge<any>( this._selectDateObserver , this._viewModeObserver ).pipe(
            takeUntil( this.destroy$ ) ,
            debounceTime( 100 )
        ).subscribe( () : void => {
            this.loadData();
        } );
    }

    protected onDragStarted ( classItem : ClassSessionAssignment ) : void {
        this.draggedClass.set( classItem );
    }

    protected onDragMoved () : void {
        // Tùy chỉnh khi đang kéo để làm mờ các lớp khác
    }

    protected onDragEnded () : void {
        this.draggedClass.set( null );
    }

    private assignClassToDate ( object : ClassSessionAssignment , calendarRow : TmCalendarDate ) : void {
        const registration : RegistrationApproval = { object , calendarRow };
        this.registrationApproval.set( JSON.parse( JSON.stringify( registration ) ) ); // for safe pls
    }

    protected onDrop ( event : CdkDragDrop<ClassSessionAssignment[] , ClassSessionAssignment[] , ClassSessionAssignment> , date : TmCalendarDate ) : void {
        this.assignClassToDate( event.item.data , date );
        this.draggedClass.set( null );
    }

    protected btnSetViewMode ( mode : DateAssignmentViewMode ) : void {
        this.viewMode.set( mode );
    }

    protected btnNextDate () : void {
        this.selectDate.update( ( selectDate : Date ) : Date => {
            const _dayJs : Dayjs = dayjs( selectDate );
            return this.viewMode() === 'week' ? _dayJs.add( 1 , 'week' ).toDate() : _dayJs.add( 1 , 'month' ).toDate();
        } );
    }

    protected btnPrevDate () : void {
        this.selectDate.update( ( selectDate : Date ) : Date => {
            const _dayJs : Dayjs = dayjs( selectDate );
            return this.viewMode() === 'week' ? _dayJs.subtract( 1 , 'week' ).toDate() : _dayJs.subtract( 1 , 'month' ).toDate();
        } );
    }

    protected btnResetToCurrentDate () : void {
        this.selectDate.set( new Date() );
    }

    private loadData () : void {
        this.state.set( 'loading' );
        const conditions : IctuConditionParam[] = [
            { conditionName : 'class_id' , condition : IctuQueryCondition.equal , value : this.class_id().toString( 10 ) }
        ];
        if ( this.viewMode() === 'week' ) {
            conditions.push( { conditionName : 'class_id' , condition : IctuQueryCondition.equal , value : this.class_id().toString( 10 ) , orWhere : 'and' } )
        }
        const queryParams : IctuQueryParams = {
            include    : this.donviID ,
            include_by : 'donvi_id' ,
            limit      : -1 ,
            paged      : 1
        };
        this.classSessionService.query( conditions , queryParams ).pipe(
            takeUntil( this.destroy$ ) ,
            map( ( response : DtoObject<ClassSession[]> ) : ClassSession[] => response.data )
        ).subscribe( {
            next  : ( data : ClassSession[] ) : void => {
                this.state.set( 'success' );
            } ,
            error : () : void => {
                this.state.set( 'error' );
            }
        } )
    }

    reload ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.loadData();
    }

    ngOnDestroy () : void {
        this.destroy$.next();
        this.destroy$.complete();
    }

}
