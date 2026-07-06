import { Component , computed , inject , model , ModelSignal , OnDestroy , OnInit , output , OutputEmitterRef , Signal , signal , WritableSignal } from '@angular/core';
import { AppState } from '@app/models/app-state';
import { ClassActivity , ClassActivityExtend , ClassActivityStatus } from '@app/models/class-activities';
import { IctuDataTable } from '@app/models/datatable';
import { AuthenticationService } from '@app/services/authentication.service';
import { ClassActivitiesService } from '@app/services/class-activities.service';
import { debounceTime , map , merge , of , Subject , switchMap , takeUntil , Observable } from 'rxjs';
import { LoadingProgressComponent } from '@app/theme/components/loading-progress/loading-progress.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { CommonModule , DatePipe } from '@angular/common';
import { IctuBasicFile } from '@app/models/file';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from '@app/services/notification.service';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@app/models/dto';
import { TabsModule } from 'primeng/tabs';
import { DividerModule } from 'primeng/divider';
import { ReportPartContent } from '@app/models/report';
import { FormsModule } from '@angular/forms';
import { Helper } from '@app/utilities/helper';
import { TextareaModule } from 'primeng/textarea';
import { CoSoDaoTao } from '@app/models/co-so-dao-tao';
import { CoSoDaoTaoService } from '@app/services/co-so-dao-tao.service';
import { IctuPaginatorComponent } from '@app/theme/components/ictu-paginator/ictu-paginator.component';
import { DatePickerModule } from 'primeng/datepicker';
import { ClassSessionService } from '@app/services/class-session.service';
import { ClassSession , ClassSessionFitter } from '@app/models/class-session';
import { IctuDropdownOption } from '@app/models/ictu-dropdown-option';
import { Select } from 'primeng/select';

@Component( {
	selector    : 'app-moderation-comments' ,
	imports     : [ LoadingProgressComponent , MatMenuModule , MatButtonModule , TooltipModule , DialogModule , DatePipe , TabsModule , DividerModule , CommonModule , FormsModule , TextareaModule , IctuPaginatorComponent , DatePickerModule , Select ] ,
	templateUrl : './moderation-comments.component.html' ,
	styleUrl    : './moderation-comments.component.css'
} )
export default class ModerationCommentsComponent implements OnInit , OnDestroy {

	private activitiesService : ClassActivitiesService = inject( ClassActivitiesService );

	private classActivityService : ClassActivitiesService = inject(
		ClassActivitiesService
	);

	readonly listAgent : WritableSignal<CoSoDaoTao[]> = signal<CoSoDaoTao[]>( [] );

	readonly activeAgent : WritableSignal<CoSoDaoTao> = signal<CoSoDaoTao>( null );

	readonly activeAgentName : Signal<string> = computed( () : string => this.activeAgent() ? this.activeAgent().ten : 'Chọn cơ sở đào tạo' );

	private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

	class_activities_changed : OutputEmitterRef<ClassActivity[]> = output<ClassActivity[]>();

	private auth : AuthenticationService = inject( AuthenticationService );

	private destroyed$ : Subject<void> = new Subject<void>();

	state : WritableSignal<AppState | 'update'> = signal<AppState | 'update'>( 'loading' );

	current_date : Date = new Date();

	get donviId() : number {
		return this.auth.user.donvi_id;
	}

	private classSessionService : ClassSessionService = inject( ClassSessionService );

	private classSessionFitter : ClassSessionFitter = {
		donvi_id  : 0 ,
		csdt_id   : 0 ,
		timeStart : '' ,
		timeEnd   : ''
	};

	optionApproved : IctuDropdownOption<number>[] = [
		{ value : 1 , label : 'Đã duyệt' } ,
		{ value : 0 , label : 'Chưa duyệt' }
	];

	approvedOptionSelected : number = 1;

	private readonly loadDataObserver : Subject<void> = new Subject<void>();

	reportPartContent : ModelSignal<ReportPartContent[]> = model();

	private previewFileObserver$ : Subject<IctuBasicFile> = new Subject<IctuBasicFile>();

	dataTable : IctuDataTable<ClassActivityExtend> = new IctuDataTable<ClassActivityExtend>();

	dataSession : ClassSession[] = [];

	private notification : NotificationService = inject( NotificationService );

	ngOnInit() : void {
		this.loadData( 1 , true );
	}

	constructor() {
		this.previewFileObserver$.pipe(
			debounceTime( 500 ) ,
			takeUntilDestroyed()
		).subscribe( ( file : IctuBasicFile ) : void => {
			this.notification.previewFile( { info : [ file ] } );
		} );
	}

	loadDataSession( paged : number , resetPaginator : boolean = true ) : Observable<ClassActivity[]> {
		this.state.set( 'loading' );
		const start                             = this.current_date.setHours( 0 , 0 , 0 , 0 );
		const end                               = this.current_date.setHours( 23 , 59 , 59 , 999 );
		const start_date                        = new Date( '2025-11-05 00:00:00' );
		const end_date                          = new Date( end );
		this.classSessionFitter                 = {
			csdt_id   : this.activeAgent().id ,
			donvi_id  : this.donviId ,
			timeStart : Helper.formatSQLDateTime( start_date ) ,
			timeEnd   : Helper.formatSQLDateTime( end_date )
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
			} ,
			{
				conditionName : 'status' ,
				condition     : IctuQueryCondition.equal ,
				value         : '2' ,
				orWhere       : 'and'
			}
		];
		const queryParams : IctuQueryParams     = {
			limit : -1 ,
			paged : 1 ,
			with  : 'class,parent_class'
		};
		return this.classSessionService.query( conditions , queryParams ).pipe(
			switchMap( res => {
				this.dataSession = res.data;
				return this.loadDataActivities( paged , resetPaginator );
			} )
		);
	}

	loadDataActivities( paged : number , resetPaginator : boolean ) : Observable<ClassActivity[]> {
		const ids                             = this.dataSession.length != 0 ? this.dataSession.map( item => item.id ).join( ',' ) : '-1';
		let conditions : IctuConditionParam[] = [ {
			conditionName : 'type' ,
			condition     : IctuQueryCondition.equal ,
			value         : 'HOAT_DONG'
		} ];
		if ( this.approvedOptionSelected == 2 ) {
			conditions.push( {
				conditionName : 'approved' ,
				condition     : IctuQueryCondition.equal ,
				value         : '1' ,
				orWhere       : 'and'
			} , {
				conditionName : 'is_approved' ,
				condition     : IctuQueryCondition.equal ,
				value         : '0' ,
				orWhere       : 'and'
			} );
		} else if ( this.approvedOptionSelected == 1 ) {
			conditions.push( {
				conditionName : 'approved' ,
				condition     : IctuQueryCondition.equal ,
				value         : '1' ,
				orWhere       : 'and'
			} , {
				conditionName : 'is_approved' ,
				condition     : IctuQueryCondition.equal ,
				value         : '1' ,
				orWhere       : 'and'
			} );
		} else {
			conditions.push( {
				conditionName : 'approved' ,
				condition     : IctuQueryCondition.equal ,
				value         : '0' ,
				orWhere       : 'and'
			} );
		}
		return this.activitiesService.query( conditions , {
			limit      : 20 ,
			paged      : paged ,
			include    : ids ,
			include_by : 'class_session_id' ,
			order      : 'ASC' ,
			with       : 'assistants,students'
		} ).pipe(
			map( ( response : DtoObject<ClassActivity[]> ) : ClassActivity[] => {
				if ( resetPaginator ) {
					this.dataTable.paginator.setupPaginator( response );
				} else {
					this.dataTable.paginator.changePage( paged );
				}
				return response.data;
			} )
		);
	}

	private filterByAgent() : Observable<number> {
		if ( this.activeAgent() ) {
			return of( this.activeAgent().id );
		} else {
			if ( this.listAgent().length > 0 ) {
				this.activeAgent.set( this.listAgent()[ 0 ] );
				return of( this.activeAgent().id );
			} else {
				const conditions : IctuConditionParam[] = [];
				const queryParams : IctuQueryParams     = { limit : -1 , paged : 1 , include : this.donviId , include_by : 'donvi_id' };
				return this.coSoDaoTaoService.query( conditions , queryParams ).pipe(
					map( ( response : DtoObject<CoSoDaoTao[]> ) : number => {
						if ( response.data.length ) {
							this.listAgent.set( response.data );
							this.activeAgent.set( response.data[ 0 ] );
							return this.activeAgent().id;
						} else {
							return 0;
						}
					} )
				);
			}
		}
	}

	loadData( paged : number , resetPaginator : boolean = true ) : void {
		this.state.set( 'loading' );
		this.loadDataObserver.next();
		this.filterByAgent().pipe(
			takeUntil( merge( this.loadDataObserver , this.destroyed$ ) ) ,
			switchMap( () : Observable<ClassActivity[]> => this.loadDataSession( paged , resetPaginator ) ) ,
			map( ( response : ClassActivity[] ) : ClassActivityExtend[] => response.map( ( item : ClassActivity ) : ClassActivityExtend => {
				return {
					... item ,
					comment_origin : item.comment_origin ?? item.comment
				};
			} ) )
		).subscribe( {
			next  : ( response : ClassActivityExtend[] ) : void => {
				this.dataTable.fillData( response );
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'error' );
			}
		} );
	}


	onChangePage( paged : number ) : void {
		this.loadData( paged , false );
	}

	reload( event : MouseEvent ) : void {
		this.loadData( this.dataTable.paginator.paged() , false );
		event.preventDefault();
		event.stopPropagation();
	}

	update_class_activities( class_activities : ClassActivity[] ) {
		this.class_activities_changed.emit( class_activities );
	}

	onApprovedChange() {
		this.update_class_activities( this.dataTable.data() );
	}

	getCommentOld( index : number ) : void {
		// const comment_origin = this.dataTable.data()[index].comment_origin;
		this.dataTable.data()[ index ]._ictuDataTableRowChecked = false;
		// this.dataTable.data()[index].comment = comment_origin;
	}

	editComment( index : number ) : void {
		this.dataTable.data()[ index ]._ictuDataTableRowChecked = !this.dataTable.data()[ index ]._ictuDataTableRowChecked;
	}

	private _changeActiveAgent( agent : CoSoDaoTao ) : void {
		this.activeAgent.set( agent );
		this.loadData( 1 , true );
	}

	protected btnChangeAgent( agent : CoSoDaoTao ) : void {
		if ( !this.activeAgent() || this.activeAgent().id !== agent.id ) {
			this._changeActiveAgent( agent );
		}
	}

	updateApprovedActivities( index : number , status : ClassActivityStatus ) : void {
		this.state.set( 'update' );
		const item                        = this.dataTable.data()[ index ];
		let info : Partial<ClassActivity> = { status };
		if ( item.comment != item.comment_origin ) {
			info = { ... info , comment_origin : item.comment_origin , comment : item.comment };
		}
		this.classActivityService.update( item.id , info ).subscribe( {
			next  : () => {
				// let _value = Helper.cloneObject(this.dataTable.data() ?? []);
				if ( this.approvedOptionSelected == 0 ) {
					this.dataTable.fillData( this.dataTable.data().filter( i => i.id != item.id ) );
				} else {
					this.dataTable.data()[ index ]._ictuDataTableRowChecked = false;
				}
				this.state.set( 'success' );
				this.notification.toastSuccess( 'Duyệt hoạt động thành công' , 'Thông báo' );
			} ,
			error : () => {
				this.state.set( 'success' );
				this.notification.toastError( 'Duyệt hoạt động không thành công' , 'Thông báo' );
			}
		} );
	}

	loadActivitiesSelect() : void {
		this.loadDataActivities( 1 , true ).pipe(
			map( ( response : ClassActivity[] ) : ClassActivityExtend[] => response.map( ( item : ClassActivity ) : ClassActivityExtend => {
				return {
					... item ,
					comment_origin : item.comment_origin ?? item.comment
				};
			} ) )
		).subscribe( {
			next  : ( response : ClassActivityExtend[] ) : void => {
				this.dataTable.fillData( response );
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'success' );
			}
		} );
	}


	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
