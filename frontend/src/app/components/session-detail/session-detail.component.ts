import { Component , computed , inject , OnDestroy , OnInit , Signal , signal , WritableSignal } from '@angular/core';
import { AppState } from '@app/models/app-state';
import { ClassSession , ClassSessionDetail , ClassSessionFitter } from '@app/models/class-session';
import { IctuDataTable2 } from '@app/models/datatable';
import { ClassActivitiesService } from '@app/services/class-activities.service';
import { ClassMediaService } from '@app/services/class-media.service';
import { ClassSessionService } from '@app/services/class-session.service';
import { LoadingProgressComponent } from '@app/theme/components/loading-progress/loading-progress.component';
import { MatMenu , MatMenuItem , MatMenuTrigger } from '@angular/material/menu';
import { CoSoDaoTao } from '@app/models/co-so-dao-tao';
import { map , merge , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@app/models/dto';
import { CoSoDaoTaoService } from '@app/services/co-so-dao-tao.service';
import { AuthenticationService } from '@app/services/authentication.service';
import { ClassActivityParams } from '@app/models/class-activities';
import { Helper , HelperClass } from '@app/utilities/helper';
import { DatePicker } from 'primeng/datepicker';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { IctuPaginatorComponent } from '@app/theme/components/ictu-paginator/ictu-paginator.component';
import { ClassPlanningCurriculumActivities } from '@app/pages/class-planning/children/class-planning-curriculum/children/class-planning-curriculum-activities/class-planning-curriculum-activities';
import { MatButton } from '@angular/material/button';
import { ViewMediaComponent } from '../view-media/view-media.component';
import { ClassPlanningCurriculumAttendance } from '@app/pages/class-planning/children/class-planning-curriculum/children/class-planning-curriculum-attendance/class-planning-curriculum-attendance';
import { AttendanceSocKet } from '@app/models/diem-danh';
import { cloneDeep } from 'lodash-es';

type SessionDetailMode = 'default' | 'activities' | 'media' | 'attendance';
@Component( {
    selector : 'app-session-detail' ,
    imports  : [ LoadingProgressComponent , MatMenuItem , MatMenuTrigger , MatMenu , DatePicker , CommonModule , TooltipModule , FormsModule , IctuPaginatorComponent , ClassPlanningCurriculumActivities , MatButton , ViewMediaComponent , ClassPlanningCurriculumAttendance ] ,

    templateUrl : './session-detail.component.html' ,
    styleUrl    : './session-detail.component.css'
} )
export default class SessionDetailComponent implements OnInit , OnDestroy {

    public state : WritableSignal<AppState> = signal<AppState>( 'loading' );

    private auth : AuthenticationService = inject( AuthenticationService );

    mode : WritableSignal<SessionDetailMode> = signal<SessionDetailMode>( 'default' );

    private helper = new HelperClass();

    get donViID () : number {
        return this.auth.user.donvi_id;
    }


    setMode ( mode : SessionDetailMode , classSessionDetail : ClassSessionDetail ) : void {
        switch ( mode ) {
            case 'default': {
                this.mode.set( 'default' );
                break;
            }
            case 'activities': {
                this.classSessionSelect.set( classSessionDetail );
                this.mode.set( 'activities' );
                break;
            }
            case 'media': {
                this.classSessionSelect.set( classSessionDetail );
                this.mode.set( 'media' );
                break;
            }
            case 'attendance': {
                this.classSessionSelect.set( classSessionDetail );
                this.mode.set( 'attendance' );
                break;
            }
        }
    }

    classSessionSelect : WritableSignal<ClassSessionDetail> = signal<ClassSessionDetail>( null );

    private destroy$ : Subject<void> = new Subject<void>();

    public dataTableSessionDetail : IctuDataTable2<ClassSessionDetail> =
               new IctuDataTable2<ClassSessionDetail>();

    readonly listAgent : WritableSignal<CoSoDaoTao[]> = signal<CoSoDaoTao[]>( [] );

    readonly activeAgent : WritableSignal<CoSoDaoTao> = signal<CoSoDaoTao>( null );

    readonly activeAgentName : Signal<string> = computed( () : string => this.activeAgent() ? this.activeAgent().ten : 'Chọn cơ sở đào tạo' );

    private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

    private classSessionService : ClassSessionService = inject(
        ClassSessionService
    );

    private classActivityService : ClassActivitiesService = inject(
        ClassActivitiesService
    );

    start_date : Date = new Date();
    end_date : Date   = new Date();

    private classMediaService : ClassMediaService   = inject(
        ClassMediaService
    );
    private classSessionFitter : ClassSessionFitter = {
        donvi_id  : 0 ,
        csdt_id   : 0 ,
        timeStart : '' ,
        timeEnd   : ''
    };

    private readonly loadDataObserver : Subject<void> = new Subject<void>();

    private destroyed$ : Subject<void> = new Subject<void>();

    constructor () {
    }

    ngOnInit () : void {
        this.auth.listen<AttendanceSocKet>( 'diem_danh' ).subscribe( ( res ) : void => {
            const index = this.dataTableSessionDetail.data().findIndex( ( t ) => t.id == res.class_session_id );
            if ( index != -1 ) {
                let _value : ClassSessionDetail[] = cloneDeep( this.dataTableSessionDetail.data() ?? [] );
                let diemdanh                      = _value[ index ].diem_danh;
                const index_diem_danh             = _value[ index ].diem_danh.findIndex( ( t ) => t.hocsinh_id == res.hocsinh_id );
                if ( index_diem_danh != -1 ) {
                    diemdanh[ index_diem_danh ] = {
                        ... diemdanh[ index_diem_danh ] ,
                        status : res.status ,
                        reason : res.reason
                    }
                }
                _value[ index ] = {
                    ... _value[ index ] ,
                    diem_danh                : diemdanh ,
                    class_activity_diem_danh : {
                        dihoc   : diemdanh.filter( ( t ) => t.status == 'PRESENT' || t.status == 'LATE' ).map( ( a ) => a.hocsinh_id ) ?? [] ,
                        nghihoc : diemdanh.filter( ( t ) => t.status == 'UNEXCUSED' || t.status == 'EXCUSED' ).map( ( a ) => a.hocsinh_id ) ?? [] ,
                        dimuon  : diemdanh.filter( ( t ) => t.status == 'LATE' ).map( ( a ) => a.hocsinh_id ) ?? []
                    }
                }
                this.dataTableSessionDetail.fillData( _value );
            }
        } );
        this.loadData( 1 , true );
    }

    private filterByAgent () : Observable<number> {
        if ( this.activeAgent() ) {
            return of( this.activeAgent().id );
        }
        else {
            if ( this.listAgent().length > 0 ) {
                this.activeAgent.set( this.listAgent()[ 0 ] );
                return of( this.activeAgent().id );
            }
            else {
                const conditions : IctuConditionParam[] = [];
                const queryParams : IctuQueryParams     = { limit : -1 , paged : 1 , include : this.donViID , include_by : 'donvi_id' };
                return this.coSoDaoTaoService.query( conditions , queryParams ).pipe(
                    map( ( response : DtoObject<CoSoDaoTao[]> ) : number => {
                        if ( response.data.length ) {
                            this.listAgent.set( response.data );
                            this.activeAgent.set( response.data[ 0 ] );
                            return this.activeAgent().id;
                        }
                        else {
                            return 0;
                        }
                    } )
                )
            }
        }
    }

    loadData ( paged : number , resetPaginator : boolean = true ) : void {
        this.state.set( 'loading' );
        this.loadDataObserver.next();
        this.filterByAgent().pipe(
            takeUntil( merge( this.loadDataObserver , this.destroyed$ ) ) ,
            switchMap( () : Observable<ClassSession[]> => this.loadSession( paged , resetPaginator ) ) ,
            map( ( response : ClassSession[] ) : ClassSessionDetail[] => response.map( ( item : ClassSession ) : ClassSessionDetail => {
                return {
                    ... item ,
                    assistants               : item[ 'assistants' ] ?? null ,
                    class                    : item[ 'class' ] ?? null ,
                    room                     : item[ 'room' ] ?? null ,
                    teacher                  : item[ 'teacher' ] ?? null ,
                    foreign_teacher          : item[ 'foreign_teacher' ] ?? null ,
                    class_activities         : item[ 'class_activities' ] ?? [] ,
                    class_activity_diem_danh : null ,
                    class_medias             : item[ 'class_medias' ] ?? [] ,
                    diem_danh                : item[ 'diem_danh' ] ?? [] ,
                    students                 : item[ 'students' ] ?? []
                }
            } ) )
        ).subscribe( {
            next  : ( response : ClassSessionDetail[] ) : void => {
                let clonedData : ClassSessionDetail[] = Helper.cloneObject( response ?? [] );
                clonedData                            = clonedData.map( ( session ) => {
                    return {
                        ... session ,
                        class_activities         : session.class_activities.filter( ( t ) => t.type != 'DIEM_DANH' ) ,
                        class_activity_diem_danh : {
                            dihoc   : session.diem_danh.filter( ( t ) => t.status == 'PRESENT' || t.status == 'LATE' ).map( ( a ) => a.hocsinh_id ) ?? [] ,
                            nghihoc : session.diem_danh.filter( ( t ) => t.status == 'UNEXCUSED' || t.status == 'EXCUSED' ).map( ( a ) => a.hocsinh_id ) ?? [] ,
                            dimuon  : session.diem_danh.filter( ( t ) => t.status == 'LATE' ).map( ( a ) => a.hocsinh_id ) ?? []
                        }
                    }
                } );
                this.dataTableSessionDetail.fillData( clonedData );
                this.state.set( 'success' );
            } ,
            error : () : void => {
                this.state.set( 'error' );
            }
        } )
    }

    private loadSession ( paged : number , resetPaginator : boolean ) : Observable<ClassSession[]> {
        const start                             = this.start_date.setHours( 0 , 0 , 0 , 0 );
        const end                               = this.end_date.setHours( 23 , 59 , 59 , 999 ); //this.helper.formatSQLDateTime(this.end_date)
        this.start_date                         = new Date( start );
        this.end_date                           = new Date( end );
        this.classSessionFitter                 = {
            csdt_id : this.activeAgent().id , donvi_id : this.donViID , timeStart : this.helper.formatSQLDateTime( this.start_date ) , timeEnd : this.helper.formatSQLDateTime( this.end_date )
        };
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'donvi_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : this.classSessionFitter.donvi_id.toString()
            } ,
            {
                conditionName : 'csdt_id' ,
                condition     : IctuQueryCondition.equal ,
                value         : this.classSessionFitter.csdt_id.toString() ,
                orWhere       : 'and'
            } ,
            {
                conditionName : 'time_start' ,
                condition     : IctuQueryCondition.greaterThanToEqualsTo ,
                value         : this.classSessionFitter.timeStart ,
                orWhere       : 'and'
            } ,
            {
                conditionName : 'time_end' ,
                condition     : IctuQueryCondition.lessThanOrEqualsTo ,
                value         : this.classSessionFitter.timeEnd ,
                orWhere       : 'and'
            }
        ];
        const queryParams : IctuQueryParams     = {
            limit : 20 ,
            paged : paged ,
            with  : 'class,room,teacher,assistants,students,class_activities,class_medias,diem_danh,parent_class'
        };
        return this.classSessionService.query( conditions , queryParams ).pipe(
            map( ( res : DtoObject<ClassSession[]> ) => {
                if ( resetPaginator ) {
                    this.dataTableSessionDetail.paginator.setupPaginator( res );
                }
                else {
                    this.dataTableSessionDetail.paginator.changePage( paged );
                }
                return res.data;
            } )
        );
    }

    private _changeActiveAgent ( agent : CoSoDaoTao ) : void {
        this.activeAgent.set( agent );
        this.loadData( 1 , true );
    }


    protected btnChangeAgent ( agent : CoSoDaoTao ) : void {
        if ( ! this.activeAgent() || this.activeAgent().id !== agent.id ) {
            this._changeActiveAgent( agent );
        }
    }

    onChangePage ( paged : number ) : void {
        this.loadData( paged , false );
    }

    mergeClassActivityParams ( records : { params : ClassActivityParams }[] ) : ClassActivityParams {
        const dihoc   = new Set<number>();
        const nghihoc = new Set<number>();
        const dimuon  = new Set<number>();

        records.forEach( record => {
            record.params?.dihoc?.forEach( id => dihoc.add( id ) );
            record.params?.nghihoc?.forEach( id => nghihoc.add( id ) );
            record.params?.dimuon?.forEach( id => dimuon.add( id ) );
        } );

        return {
            dihoc   : Array.from( dihoc ) ,
            nghihoc : Array.from( nghihoc ) ,
            dimuon  : Array.from( dimuon )
        };
    }

    reload ( event : MouseEvent ) : void {
        this.loadData( this.dataTableSessionDetail.paginator.paged() , false );
        event.preventDefault();
        event.stopPropagation();
    }

    ngOnDestroy () : void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
