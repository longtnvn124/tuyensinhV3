import { Component , computed , inject , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { NgScrollbar } from 'ngx-scrollbar';
import { Tooltip } from 'primeng/tooltip';
import { CheckAssignmentProgress , DiemDanh } from '@models/diem-danh';
import { debounceTime , map , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { AppState } from '@models/app-state';
import { IctuDataTable } from '@models/datatable';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@shared/shared.module';
import { IctuDropdownOption , IctuDropdownOptionElement } from '@models/ictu-dropdown-option';
import { IctuDropdownOptionMapPipe } from '@pipes/ictu-dropdown-option-map.pipe';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { DiemDanhService } from '@services/diem-danh.service';
import dayjs from '@setup/dayjs';
import { SafeUrlPipe } from '@pipes/safe-url.pipe';
import { studentAvatar } from '@models/hoc-sinh';
import { FindInArrayPipe } from '@pipes/find-in-array.pipe';
import { DatePipe , NgClass } from '@angular/common';
import { ClassesService } from '@services/classes.service';
import { Class } from '@models/class';
import { joinSources } from '@utilities/join-sources';
import { assign } from 'lodash-es';
import { distinctUntilChanged } from 'rxjs/operators';
import { Dialog } from 'primeng/dialog';
import { ClassSession } from '@models/class-session';
import { ScheduleRemedialSessionFormComponent } from '@components/schedule-remedial-session-form/schedule-remedial-session-form.component';
import { ClassSessionService } from '@services/class-session.service';
import { Select } from 'primeng/select';

type ScheduleRemedialSessionAlternativeSession = Pick<ClassSession , 'id' | 'time_start' | 'diem_danh_ids'>;

export interface ScheduleRemedialSession extends DiemDanh {
	class_session? : Pick<ClassSession , 'id' | 'topic' | 'title' | 'type' | 'course_id' | 'course_lesson_id' | 'time_start'>
	lblDeadline : string,
	isOnTime : boolean,
	studentAvatar : string, // student Avatar
	alternativeSession : ScheduleRemedialSessionAlternativeSession
}

interface ScheduleRemedialSessionFilter {
	classID : number;
	status : number;
}

interface ScheduleRemedialSessionDto {
	classes : IctuDropdownOptionElement<number>[],
	diemDanh : DtoObject<DiemDanh[]>,
	alternativeSessions : ScheduleRemedialSessionAlternativeSession[]
}

@Component( {
	selector    : 'app-schedule-remedial-session' ,
	standalone  : true ,
	imports     : [ IctuPaginatorComponent , LoadingProgressComponent , NgScrollbar , Tooltip , ReactiveFormsModule , SharedModule , IctuDropdownOptionMapPipe , SafeUrlPipe , FindInArrayPipe , NgClass , Dialog , ScheduleRemedialSessionFormComponent , DatePipe , Select ] ,
	templateUrl : './schedule-remedial-session.component.html' ,
	styleUrl    : './schedule-remedial-session.component.css'
} )
export default class ScheduleRemedialSessionComponent implements OnDestroy {

	private auth : AuthenticationService = inject( AuthenticationService );

	private notification : NotificationService = inject( NotificationService );

	private classSessionService : ClassSessionService = inject( ClassSessionService );

	private classesService : ClassesService = inject( ClassesService );

	private diemDanhService : DiemDanhService = inject( DiemDanhService );

	private destroyed$ : Subject<void> = new Subject<void>();

	get donViID() : number {
		return this.auth.user.donvi_id;
	}

	get userID() : number {
		return this.auth.user.id;
	}

	state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	dataTable : IctuDataTable<ScheduleRemedialSession> = new IctuDataTable<ScheduleRemedialSession>();

	readonly syncItems : WritableSignal<ScheduleRemedialSession[]> = signal<ScheduleRemedialSession[]>( [] );

	readonly enableProgress : Signal<boolean> = computed( () : boolean => this.syncItems().length > 0 );

	readonly syncSuccessItemsCounter : WritableSignal<number> = signal( 0 );

	readonly syncProgress : Signal<number> = computed( () : number => {
		return this.syncItems().length ? Math.floor( ( this.syncSuccessItemsCounter() / this.syncItems().length ) * 100 ) : 0;
	} );

	visibleDialog : boolean = false;

	private _temp : { paged : number; resetPaginator : boolean } = {
		paged          : 1 ,
		resetPaginator : true
	};

	readonly stateOptions : Signal<IctuDropdownOption<CheckAssignmentProgress>[]> = signal( [
		{ value : 1 , label : 'Chưa xếp lịch' } ,
		{ value : 2 , label : 'Đã xếp lịch' } ,
		{ value : 3 , label : 'Đã hoàn thành' }
	] );

	readonly checkInStatusCssClassOptions : Signal<IctuDropdownOptionElement<CheckAssignmentProgress>[]> = signal( [
		{ value : 1 , label : 'ictu-badge--primary' } ,
		{ value : 2 , label : 'ictu-badge--warning' } ,
		{ value : 3 , label : 'ictu-badge--success' }
	] );

	readonly filterBy : WritableSignal<ScheduleRemedialSessionFilter> = signal( {
		classID : 0 ,
		status  : 1
	} );

	filterByStatus : Signal<number> = computed( () : number => this.filterBy().status );

	filterByClassID : Signal<number> = computed( () : number => this.filterBy().classID );

	readonly classOptions : WritableSignal<IctuDropdownOptionElement<number>[]> = signal( [] );

	private readonly makeScheduleObserver : Subject<ScheduleRemedialSession> = new Subject<ScheduleRemedialSession>();

	private readonly makeScheduleForGroupObserver : Subject<void> = new Subject<void>();

	protected readonly activeItems : WritableSignal<ScheduleRemedialSession[]> = signal( [] );

	protected readonly activeItemIDs : Signal<number[]> = computed( () : number[] => this.activeItems().map( ( { id } : ScheduleRemedialSession ) : number => id ) );

	constructor() {
		toObservable( this.filterBy ).pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged( ( p : ScheduleRemedialSessionFilter , c : ScheduleRemedialSessionFilter ) : boolean => c.classID === p.classID && c.status === p.status ) ,
			debounceTime( 100 )
		).subscribe( () : void => {
			this.loadData( 1 , true );
		} );

		this.makeScheduleObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			debounceTime( 200 )
		).subscribe( () : void => {
			this.visibleDialog = true;
		} );

		this.makeScheduleForGroupObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			debounceTime( 200 )
		).subscribe( () : void => {
			this.visibleDialog = true;
		} );
	}

	private loadData( paged : number = 1 , resetPaginator : boolean = true ) : void {
		this.state.set( 'loading' );
		joinSources<ScheduleRemedialSessionDto>( {
			classes             : this.loadClasses() ,
			diemDanh            : this.loadDiemDanh( paged ) ,
			alternativeSessions : of( [] )
		} ).pipe(
			takeUntil( this.destroyed$ ) ,
			switchMap( ( response : ScheduleRemedialSessionDto ) : Observable<ScheduleRemedialSessionDto> => {
				return this.filterByStatus() >= 2 ? this.loadAlternativeSessions( response ) : of( response );
			} ) ,
			map( ( { diemDanh , alternativeSessions } : ScheduleRemedialSessionDto ) : DtoObject<ScheduleRemedialSession[]> => {
				const toDay : dayjs.Dayjs              = dayjs( new Date() );
				const data : ScheduleRemedialSession[] = diemDanh.data.map( ( item : DiemDanh ) : ScheduleRemedialSession => {
					const _deadline : dayjs.Dayjs = item.deadline ? dayjs( item.deadline ) : null;
					return {
						... item ,
						lblDeadline        : _deadline ? _deadline.format( 'DD/MM/YYYY' ) : '' ,
						isOnTime           : _deadline ? toDay.isBefore( _deadline ) : true ,
						studentAvatar      : studentAvatar( item.hocsinh ) ,
						alternativeSession : alternativeSessions.find( ( i : ScheduleRemedialSessionAlternativeSession ) : boolean => i.diem_danh_ids.includes( item.id ) )
					};
				} );
				return assign( diemDanh , { data } );
			} ) ,
			map( ( response : DtoObject<ScheduleRemedialSession[]> ) : ScheduleRemedialSession[] => {
				if ( resetPaginator ) {
					return this.dataTable.paginator.setupPaginator( response );
				} else {
					this.dataTable.paginator.changePage( paged );
					return response.data;
				}
			} )
		).subscribe( {
			next  : ( data : ScheduleRemedialSession[] ) : void => {
				this.dataTable.fillData( data );
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'error' );
			}
		} );
	}

	private loadAlternativeSessions( scheduleRemedialSessionDto : ScheduleRemedialSessionDto ) : Observable<ScheduleRemedialSessionDto> {
		const checkInList : DiemDanh[] = scheduleRemedialSessionDto.diemDanh.data;
		if ( !checkInList.length ) {
			return of( scheduleRemedialSessionDto );
		}
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString( 10 ) }
		];
		const queryParams : IctuQueryParams     = {
			limit  : -1 ,
			paged  : 1 ,
			select : 'id,time_start,diem_danh_ids'
		};
		queryParams[ 'diem_danh_ids' ]          = checkInList.map( ( d : DiemDanh ) : number => d.id ).join( ',' );
		return this.classSessionService.query( conditions , queryParams ).pipe(
			takeUntil( this.destroyed$ ) ,
			map( ( response : DtoObject<ClassSession[]> ) : ScheduleRemedialSessionAlternativeSession[] => response.data ) ,
			map( ( alternativeSessions : ScheduleRemedialSessionAlternativeSession[] ) : ScheduleRemedialSessionDto => assign( scheduleRemedialSessionDto , { alternativeSessions } ) )
		);
	}

	private loadClasses() : Observable<IctuDropdownOptionElement<number>[]> {
		if ( this.classOptions().length ) {
			return of( this.classOptions() );
		}
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString( 10 ) } ,
			{ conditionName : 'parent_id' , condition : IctuQueryCondition.equal , value : '0' , orWhere : 'and' } ,
			{ conditionName : 'status' , condition : IctuQueryCondition.equal , value : '1' , orWhere : 'and' }
		];
		const queryParams : IctuQueryParams     = {
			limit  : -1 ,
			paged  : 1 ,
			select : 'id,name,donvi_id,status'
		};
		return this.classesService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<Class[]> ) : IctuDropdownOptionElement<number>[] => {
				this.classOptions.set( [ {
					label    : 'Tất cả các lớp' ,
					value    : 0 ,
					disabled : false
				} , ... response.data.map( ( { id , name } : Class ) : IctuDropdownOptionElement<number> => ( { value : id , label : name , disabled : false } ) ) ] );
				return this.classOptions();
			} )
		);
	}

	private loadDiemDanh( paged : number ) : Observable<DtoObject<DiemDanh[]>> {
		const conditions : IctuConditionParam[] = [
			{
				conditionName : 'assigned_teacher' ,
				condition     : IctuQueryCondition.equal ,
				value         : this.userID.toString( 10 )
			} ,
			{
				conditionName : 'donvi_id' ,
				condition     : IctuQueryCondition.equal ,
				value         : this.donViID.toString( 10 ) ,
				orWhere       : 'and'
			} ,
			{
				conditionName : 'progress' ,
				condition     : IctuQueryCondition.equal ,
				value         : this.filterByStatus().toString( 10 ) ,
				orWhere       : 'and'
			}
		];
		if ( this.filterByClassID() ) {
			conditions.push( {
				conditionName : 'class_id' ,
				condition     : IctuQueryCondition.equal ,
				value         : this.filterByClassID().toString( 10 ) ,
				orWhere       : 'and'
			} );
		}
		const queryParams : IctuQueryParams = {
			limit : this.dataTable.paginator.rows() ,
			// select : 'id,donvi_id,class_id,progress,assigned_teacher,deadline,class_session_id,hocsinh_id,phuhuynh_id' ,
			with : 'class_session,hocsinh,phuhuynh,class' ,
			paged
		};
		return this.diemDanhService.query( conditions , queryParams );
	}

	onChangePage( paged : number ) : void {
		this.loadData( paged , false );
	}

	reload( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData( this._temp.paged , this._temp.resetPaginator );
	}

	protected btnChangeFilter( info : Partial<ScheduleRemedialSessionFilter> ) : void {
		this.filterBy.update( ( _filter : ScheduleRemedialSessionFilter ) : ScheduleRemedialSessionFilter => assign( { ... _filter } , info ) );
	}

	// protected btnMakeSchedule ( item : ScheduleRemedialSession ) : void {
	//     this.selectedItem.set( item );
	//     this.makeScheduleObserver.next( item );
	// }

	protected btnMakeSchedule( item : ScheduleRemedialSession ) : void {
		this.activeItems.set( [ item ] );
		this.makeScheduleForGroupObserver.next();
	}

	protected btnMakeScheduleForGroup() : void {
		if ( this.dataTable.getSelectedData().length ) {
			this.activeItems.set( this.dataTable.getSelectedData() );
			this.makeScheduleForGroupObserver.next();
		}
	}

	protected btnCloseDialog( dirty : boolean ) : void {
		this.visibleDialog = false;
		this.activeItems.set( [] );
		if ( dirty ) {
			this.loadData( this._temp.paged , this._temp.resetPaginator );
		}
	}

	protected btnSaveForm() : void {
		this.visibleDialog = false;
		// if ( this.formGroup.valid ) {
		//     this.updateItem( this.formGroup.value )
		// }
	}

	private updateItem( info : Partial<ClassSession> ) : void {
		/*this.updateItemsSequentially( this.syncItems() , info ).pipe(
		 takeUntil( this.destroyed$ )
		 ).subscribe( {
		 next  : ( success : boolean ) : void => {
		 if ( success ) {
		 this.notification.toastSuccess( 'Thao tác thành công' );
		 }
		 this.closeUpdateProgress( true );
		 } ,
		 error : () : void => {
		 this.closeUpdateProgress( true );
		 }
		 } );*/
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
