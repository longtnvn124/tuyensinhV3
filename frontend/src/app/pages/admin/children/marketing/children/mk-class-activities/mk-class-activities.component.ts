import { Component , computed , inject , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { ContentReviewerActivityComponent } from '@pages/admin/children/content-reviewer/children/content-reviewer-activity/content-reviewer-activity.component';
import { ContentReviewerInfoPipe } from '@pages/admin/children/content-reviewer/pipes/content-reviewer-info.pipe';
import { ContentReviewerMediaComponent } from '@pages/admin/children/content-reviewer/children/content-reviewer-media/content-reviewer-media.component';
import { DatePicker } from 'primeng/datepicker';
import { DatePipe , NgClass , NgOptimizedImage } from '@angular/common';
import { FindInArrayPipe } from '@pipes/find-in-array.pipe';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { NgScrollbar } from 'ngx-scrollbar';
import { Select } from 'primeng/select';
import { AuthenticationService } from '@services/authentication.service';
import { ClassMediaService } from '@services/class-media.service';
import { BranchOption , CoSoDaoTaoService , selectDefaultBranch } from '@services/co-so-dao-tao.service';
import { ClassActivitiesService } from '@services/class-activities.service';
import { filter , map , merge , Observable , Subject , takeUntil } from 'rxjs';
import { AppState } from '@models/app-state';
import { IctuPaginatorControl } from '@theme/components/ictu-paginator/ictu-paginator-control';
import { getMonthBoundaryDates , isSameRange } from '@utilities/helper';
import dayjs from '@setup/dayjs';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { ContentReviewerComment , ContentReviewerData , ContentReviewerMedia } from '@pages/admin/children/content-reviewer/models/content-reviewer-data';
import { CoSoDaoTao } from '@models/co-so-dao-tao';
import { IctuDataTablePaginatorInfo } from '@models/datatable';
import { FormsModule } from '@angular/forms';
import { MatMenu , MatMenuItem , MatMenuTrigger } from '@angular/material/menu';
import { ClassMedia } from '@models/class-media';
import { ClassActivity } from '@models/class-activities';
import { IctuDropdownOptionElement } from '@models/ictu-dropdown-option';
import { ContentReviewerForPipe } from '@pages/admin/children/content-reviewer/pipes/content-reviewer-for.pipe';
import { ContentReviewerGetMembersPipe } from '@pages/admin/children/content-reviewer/pipes/content-reviewer-get-members.pipe';
import { ContentReviewerHasStudentsPipe } from '@pages/admin/children/content-reviewer/pipes/content-reviewer-has-students.pipe';
import { StudentAvatarPipe } from '@pipes/student-avatar.pipe';

type ContentReviewerType = 'ClassMedia' | 'ClassActivity' | 'ClassSpeakingTest';

@Component( {
	selector    : 'app-mk-class-activities' ,
	imports     : [ LoadingProgressComponent , ContentReviewerActivityComponent , ContentReviewerInfoPipe , ContentReviewerMediaComponent , DatePicker , DatePipe , FindInArrayPipe , IctuPaginatorComponent , NgScrollbar , Select , FormsModule , MatMenuTrigger , MatMenu , MatMenuItem , NgClass , ContentReviewerForPipe , ContentReviewerGetMembersPipe , ContentReviewerHasStudentsPipe , NgOptimizedImage , StudentAvatarPipe ] ,
	templateUrl : './mk-class-activities.component.html' ,
	styleUrls   : [ '../../../content-reviewer/css/timeline.css' , './mk-class-activities.component.css' ]
} )
export default class MkClassActivitiesComponent implements OnDestroy {

	private auth : AuthenticationService = inject( AuthenticationService );

	private classMediaService : ClassMediaService = inject( ClassMediaService );

	private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

	private classActivitiesService : ClassActivitiesService = inject( ClassActivitiesService );

	private destroyed$ : Subject<void> = new Subject<void>();

	private filterChangedObserver : Subject<number> = new Subject<number>();

	private reloadDataObserver : Subject<number> = new Subject<number>();

	protected readonly state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	protected readonly paginator : IctuPaginatorControl = new IctuPaginatorControl( { pageLinkSize : 3 , rows : 20 , showFirstLastIcon : false } );

	readonly branches : WritableSignal<BranchOption[]> = signal<BranchOption[]>( [] );

	readonly branchID : WritableSignal<number> = signal<number>( 0 );

	private section : WritableSignal<number> = signal( 1 );

	protected rangeDates : WritableSignal<Date[]> = signal( getMonthBoundaryDates( new Date() ) );

	private readonly dateStart : Signal<string> = computed( () : string => {
		return this.rangeDates()[ 0 ] ? [ dayjs( this.rangeDates()[ 0 ] ).format( 'YYYY-MM-DD' ) , '00:00:00' ].join( ' ' ) : '';
	} );

	private readonly dateEnd : Signal<string> = computed( () : string => {
		return this.rangeDates()[ 1 ] ? [ dayjs( this.rangeDates()[ 1 ] ).format( 'YYYY-MM-DD' ) , '23:23:00' ].join( ' ' ) : '';
	} );

	private _temp : IctuDataTablePaginatorInfo = { paged : 1 , resetPaginator : true };

	get donViID() : number {
		return this.auth.user.donvi_id;
	}

	protected posts : WritableSignal<ContentReviewerData[]> = signal( [] );

	protected contentType : WritableSignal<ContentReviewerType> = signal( 'ClassMedia' );

	protected readonly contentTypeOptions : WritableSignal<IctuDropdownOptionElement<ContentReviewerType>[]> = signal( [
		{ value : 'ClassMedia' , label : 'Media' } ,
		{ value : 'ClassActivity' , label : 'Nhận xét' }
	] );

	protected readonly contentTypeLabel : Signal<string> = computed( () : string => this.contentTypeOptions().find( ( _opt : IctuDropdownOptionElement<ContentReviewerType> ) : boolean => _opt.value === this.contentType() )?.label ?? '' );

	constructor() {
		merge<[ any , any , any ]>(
			toObservable( this.branchID ).pipe( distinctUntilChanged() ) ,
			toObservable( this.rangeDates ).pipe(
				filter( ( rangeDates : Date[] ) : boolean => rangeDates.every( Boolean ) ) ,
				distinctUntilChanged( ( previous : Date[] , current : Date[] ) : boolean => previous ? isSameRange( previous , current ) : false )
			) ,
			toObservable( this.contentType ).pipe( distinctUntilChanged() )
		).pipe(
			takeUntilDestroyed()
		).subscribe( () : void => {
			this.resetFilter();
		} );

		merge<[ IctuDataTablePaginatorInfo , IctuDataTablePaginatorInfo ]>(
			this.filterChangedObserver.asObservable().pipe(
				distinctUntilChanged() ,
				map( () : IctuDataTablePaginatorInfo => ( { paged : 1 , resetPaginator : true } ) )
			) ,
			this.reloadDataObserver.asObservable().pipe(
				distinctUntilChanged() ,
				map( () : IctuDataTablePaginatorInfo => this._temp )
			)
		).pipe(
			takeUntilDestroyed()
		).subscribe( ( { paged , resetPaginator } : IctuDataTablePaginatorInfo ) : void => {
			this._loadData( paged , resetPaginator );
		} );
	}

	private resetFilter() : void {
		this.filterChangedObserver.next( this.section() );
	}

	protected onChangePage( paged : number ) : void {
		this._loadData( paged , false );
	}

	protected reload( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.reloadDataObserver.next( this.section() );
	}

	private increateSectionID() : void {
		this.section.update( ( _num : number ) : number => _num + 1 );
	}

	protected btnChangeAgent( agentID : number ) : void {
		if ( this.branchID() !== agentID ) {
			this.branchID.set( agentID );
		}
	}

	private _loadData( paged : number = 1 , resetPaginator : boolean = true ) : void {
		this._temp = { paged , resetPaginator };
		this.state.set( 'loading' );
		if ( this.branchID() ) {
			this.state.set( 'success' );
			const request$ : Observable<DtoObject<ContentReviewerData[]>> = this.contentType() === 'ClassMedia' ? this._classMediaLoader( paged ) : this._classCommentsLoader( paged );
			request$.pipe(
				takeUntil( this.destroyed$ ) ,
				map( ( response : DtoObject<ContentReviewerData[]> ) : ContentReviewerData[] => {
					if ( resetPaginator ) {
						return this.paginator.setupPaginator( response );
					} else {
						this.paginator.changePage( paged );
						return response.data;
					}
				} )
			).subscribe( {
				next  : ( response : ContentReviewerData[] ) : void => {
					this.increateSectionID();
					this.posts.set( response );
					this.state.set( 'success' );
				} ,
				error : () : void => {
					this.increateSectionID();
					this.state.set( 'error' );
				}
			} );
		} else {
			this.coSoDaoTaoService.loadMyBranches().pipe(
				takeUntil( this.destroyed$ )
			).subscribe( {
				next  : ( branches : CoSoDaoTao[] ) : void => {
					this.increateSectionID();
					this.branches.set( branches );
					this.branchID.set( selectDefaultBranch( this.auth.employee , branches )?.id || 0 );
				} ,
				error : () : void => {
					this.increateSectionID();
					this.state.set( 'error' );
				}
			} );
		}
	}

	private _classMediaLoader( paged : number = 1 ) : Observable<DtoObject<ContentReviewerMedia[]>> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString() } ,
			{ conditionName : 'created_at' , condition : IctuQueryCondition.greaterThanToEqualsTo , value : this.dateStart() , orWhere : 'and' } ,
			{ conditionName : 'created_at' , condition : IctuQueryCondition.lessThanOrEqualsTo , value : this.dateEnd() , orWhere : 'and' } ,
			{ conditionName : 'status' , condition : IctuQueryCondition.equal , value : 'APPROVED' , orWhere : 'and' } ,
			{ conditionName : 'featured' , condition : IctuQueryCondition.equal , value : '1' , orWhere : 'and' }
		];
		const queryParams : IctuQueryParams     = {
			limit   : this.paginator.rows() ,
			paged   : paged ,
			with    : 'employee,objects,class_session,activity_class' ,
			order   : 'ASC' ,
			orderby : 'created_at'
		};
		return this.classMediaService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassMedia[]> ) : DtoObject<ContentReviewerMedia[]> => {
				return {
					... response , data : response.data.map( ( row : ClassMedia ) : ContentReviewerMedia => {
						return {
							... row ,
							dataType       : 'ClassMedia' ,
							employee       : row[ 'employee' ] ,
							objects        : row[ 'objects' ] ,
							activity_class : row[ 'activity_class' ] ,
							class_session  : row[ 'class_session' ] ,
							dirty          : false
						};
					} )
				};
			} )
		);
	}

	private _classCommentsLoader( paged : number = 1 ) : Observable<DtoObject<ContentReviewerComment[]>> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'type' , condition : IctuQueryCondition.equal , value : 'HOAT_DONG' } ,
			{ conditionName : 'created_at' , condition : IctuQueryCondition.greaterThanToEqualsTo , value : this.dateStart() , orWhere : 'and' } ,
			{ conditionName : 'created_at' , condition : IctuQueryCondition.lessThanOrEqualsTo , value : this.dateEnd() , orWhere : 'and' } ,
			{ conditionName : 'status' , condition : IctuQueryCondition.equal , value : 'APPROVED' , orWhere : 'and' } ,
			{ conditionName : 'featured' , condition : IctuQueryCondition.equal , value : '1' , orWhere : 'and' }
		];
		const queryParams : IctuQueryParams     = {
			limit      : this.paginator.rows() ,
			paged      : paged ,
			include    : this.donViID.toString() ,
			include_by : 'donvi_id' ,
			with       : 'employee,objects,class_session,activity_class' ,
			order      : 'ASC' ,
			orderby    : 'created_at'
		};
		return this.classActivitiesService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassActivity[]> ) : DtoObject<ContentReviewerComment[]> => {
				return {
					... response , data : response.data.map( ( row : ClassActivity ) : ContentReviewerComment => {
						return {
							... row ,
							dataType       : 'ClassActivity' ,
							employee       : row[ 'employee' ] ,
							objects        : row[ 'objects' ] ,
							activity_class : row[ 'activity_class' ] ,
							class_session  : row[ 'class_session' ] ,
							dirty          : false
						};
					} )
				};
			} )
		);
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
