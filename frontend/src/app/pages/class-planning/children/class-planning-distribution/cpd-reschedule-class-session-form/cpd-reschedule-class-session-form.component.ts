import { Component , computed , inject , input , InputSignal , model , ModelSignal , OnDestroy , output , OutputEmitterRef , Signal , signal , WritableSignal } from '@angular/core';
import { ClassSession } from '@models/class-session';
import { DatePicker } from 'primeng/datepicker';
import { SharedModule } from '@shared/shared.module';
import { cloneDeep } from 'lodash-es';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError , concatMap , debounceTime , delay , map , Observable , of , Subject , switchMap , takeUntil , tap } from 'rxjs';
import { Class } from '@models/class';
import { ClassSessionService } from '@services/class-session.service';
import { BranchTimeSlot , CoSoDaoTao } from '@models/co-so-dao-tao';
import { Is } from '@utilities/is';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import dayjs , { Dayjs } from 'dayjs';
import { branchTimeSlot2SqlDateTime , DayConfig , daySessionsOfWeek } from '@pages/class-planning/children/class-planning-distribution/class-planning-distribution.component';
import { NotificationService } from '@services/notification.service';

type RescheduleClassSessionState = 'init' | 'sending' | 'error' | 'success' | 'confirm';

type RescheduleClassSessionDataSate = 'pending' | 'complete' | 'error';

interface RescheduleClassSessionData {
    classSession : ClassSession;
    info : Pick<ClassSession , 'time_start' | 'time_end' | 'time_slot_order' | 'room_id'>,
    state : RescheduleClassSessionDataSate;
}

type ConfirmSateValue = 'init' | 'confirmed' | 'cancelled';

@Component( {
    selector    : 'cpd-reschedule-class-session-form' ,
    imports     : [ DatePicker , SharedModule , DatePipe ] ,
    templateUrl : './cpd-reschedule-class-session-form.component.html' ,
    styleUrl    : './cpd-reschedule-class-session-form.component.css'
} )
export class CpdRescheduleClassSessionFormComponent implements OnDestroy {

    private readonly notification : NotificationService = inject( NotificationService );

    private readonly coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

    private readonly classSessionService : ClassSessionService = inject<ClassSessionService>( ClassSessionService );

    /*****************************************************************
     * INPUT
     * ***************************************************************/
    classSessionID : InputSignal<number> = input.required<number>();

    classSessions : InputSignal<ClassSession[]> = input.required<ClassSession[]>();

    classObject : InputSignal<Class> = input.required<Class>();

    classBranch : ModelSignal<CoSoDaoTao> = model.required<CoSoDaoTao>();

    changed : ModelSignal<boolean> = model<boolean>( false );

    /*****************************************************************
     * OUTPUT
     * ***************************************************************/
    onClose : OutputEmitterRef<boolean> = output<boolean>();

    private readonly selectedClassSession : Signal<ClassSession> = computed( () : ClassSession => this.classSessionID() && this.classSessions()?.length ? this.classSessions().find( ( i : ClassSession ) : boolean => i.id === this.classSessionID() ) : null );

    private readonly elements : Signal<RescheduleClassSessionData[]> = computed( () : RescheduleClassSessionData[] => {
        if ( this.classSessions()?.length && this.selectedClassSession() ) {
            return cloneDeep( this.classSessions().filter( ( i : ClassSession ) : boolean => i.ordering >= this.selectedClassSession().ordering ) ).map( ( classSession : ClassSession ) : RescheduleClassSessionData => {
                return { classSession , info : null , state : 'pending' }
            } );
        }
        else {
            return [];
        }
    } );

    readonly totalElements : Signal<number> = computed( () : number => this.elements().length );

    private readonly syncSuccessCounter : WritableSignal<number> = signal( 0 );

    readonly syncProgress : Signal<number> = computed( () : number => {
        return this.totalElements() ? Math.floor( ( this.syncSuccessCounter() / this.totalElements() ) * 100 ) : 0;
    } );

    readonly minDate : Signal<Date> = computed( () : Date => {
        if ( this.classSessions()?.length && this.selectedClassSession() ) {
            return this.classSessions().reduce( ( reducer : Date , classSession : ClassSession ) : Date => {
                if ( classSession.ordering < this.selectedClassSession().ordering ) {
                    return classSession.time_start ? dayjs( classSession.time_start ).add( 1 , 'day' ).toDate() : null;
                }
                else {
                    return reducer;
                }
            } , null );
        }
        else {
            return null;
        }
    } );

    protected readonly state : WritableSignal<RescheduleClassSessionState> = signal<RescheduleClassSessionState>( 'init' );

    protected readonly date : WritableSignal<Date> = signal( null );

    protected confirmation : WritableSignal<boolean> = signal( true );

    private confirmObserver : Subject<ConfirmSateValue> = new Subject<ConfirmSateValue>();

    private uploadObserver : Subject<void> = new Subject<void>();

    private destroyed$ : Subject<void> = new Subject<void>();

    constructor () {
        this.confirmObserver.pipe(
            takeUntilDestroyed() ,
            debounceTime( 500 )
        ).subscribe( ( confirm : ConfirmSateValue ) : void => {
            switch ( confirm ) {
                case 'confirmed':
                    this.process();
                    break;
                case 'cancelled':
                    this.date.set( null );
                    break;
                default:
                    break;
            }
        } );

        this.uploadObserver.pipe(
            takeUntilDestroyed() ,
            debounceTime( 500 )
        ).subscribe( () : void => {
            this.process();
        } )
    }

    btnClose () : void {
        this.onClose.emit( this.changed() );
    }

    btnConfirm ( value : ConfirmSateValue ) : void {
        this.confirmObserver.next( value );
    }

    private process () : void {
        this.syncSuccessCounter.set( 0 );
        this.state.set( 'sending' );
        const branchID : number = this.classObject()?.csdt_id ?? 0;
        const donViID : number  = this.classObject()?.donvi_id ?? 0;
        if ( branchID && donViID ) {
            this.changed.set( true );
            this.loadBranchTimeSlots( branchID , donViID ).pipe(
                takeUntil( this.destroyed$ ) ,
                map( ( branchTimeSlots : BranchTimeSlot[] ) : RescheduleClassSessionData[] => this.schedule( branchTimeSlots ) ) ,
                switchMap( ( data : RescheduleClassSessionData[] ) : Observable<boolean> => this.updateClassSessionsSequentially( data ) )
            ).subscribe( {
                next  : ( success : boolean ) : void => {
                    if ( success ) {
                        this.state.set( 'success' );
                        this.notification.toastSuccess( 'Cập nhật lịch thành công.' );
                    }
                    else {
                        this.state.set( 'error' );
                    }
                } ,
                error : () : void => {
                    this.state.set( 'error' );
                }
            } )
        }
        else {
            this.state.set( 'init' );
            this.notification.toastError( 'Không tìm thấy thông tin cơ sở đào tạo của lớp học.' );
        }
    }

    private schedule ( branchTimeSlots : BranchTimeSlot[] ) : RescheduleClassSessionData[] {
        if ( branchTimeSlots.length ) {
            const elements : RescheduleClassSessionData[] = cloneDeep<RescheduleClassSessionData[]>( this.elements() ).map( ( _i : RescheduleClassSessionData ) : RescheduleClassSessionData => ( { ... _i , info : null , state : 'pending' } ) )
            const daysOfWeek : DayConfig[]                = daySessionsOfWeek( this.classObject().time_slots , branchTimeSlots );
            let current : Dayjs                           = dayjs( this.date() );
            while ( -1 !== elements.findIndex( ( o : RescheduleClassSessionData ) : boolean => ! o.info ) ) {
                const dow : number       = current.weekday();
                const config : DayConfig = daysOfWeek.find( ( d : DayConfig ) : boolean => d.day === dow );
                if ( config ) {
                    for ( let i : number = 0 ; i < config.sessions.length ; i++ ) {
                        const _index : number = elements.findIndex( ( o : RescheduleClassSessionData ) : boolean => ! o.info );
                        if ( -1 === _index ) {
                            break;
                        }
                        else {
                            if ( config.sessions[ i ]?.timeSlot ) {
                                elements[ _index ].info = {
                                    time_slot_order : config.sessions[ i ]?.timeSlot.order ,
                                    time_start      : branchTimeSlot2SqlDateTime( current , config.sessions[ i ].timeSlot , 'start' ) ,
                                    time_end        : branchTimeSlot2SqlDateTime( current , config.sessions[ i ].timeSlot , 'end' ) ,
                                    room_id         : config.sessions[ i ].room_id
                                }
                            }
                            else {
                                elements[ _index ].info = {
                                    time_slot_order : 0 ,
                                    time_start      : '' ,
                                    time_end        : '' ,
                                    room_id         : 0
                                }
                            }
                        }
                    }
                }
                current = current.add( 1 , 'day' );
            }
            return elements;
        }
        else {
            return [];
        }
    }

    private updateClassSessionsSequentially ( list : RescheduleClassSessionData[] ) : Observable<boolean> {
        return list.reduce( ( reducer : Observable<number> , item : RescheduleClassSessionData ) : Observable<number> => {
            return reducer.pipe(
                concatMap( ( complete : number ) : Observable<number> => {
                    return this.classSessionService.update( item.classSession.id , item.info ).pipe(
                        map( () : number => ( 1 + complete ) ) ,
                        catchError( () : Observable<number> => of( complete ) ) , // Nếu có lỗi, vẫn tiếp tục
                        tap( ( totalComplete : number ) : void => this.syncSuccessCounter.update( () : number => totalComplete ) ) , // update counter
                        delay( 100 )
                    );
                } )
            );
        } , of( 0 ) ).pipe(
            map( ( totalCompleted : number ) : boolean => ( this.totalElements() === totalCompleted ) )
        )
    }

    private loadBranchTimeSlots ( branchID : number , donViID : number ) : Observable<BranchTimeSlot[]> {
        if ( this.classBranch()?.id === branchID ) {
            return of( Is.array( this.classBranch().time_slots ) ? this.classBranch().time_slots : [] )
        }
        const conditions : IctuConditionParam[] = [
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : donViID.toString() } ,
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

    btnReupload () : void {
        this.uploadObserver.next();
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
