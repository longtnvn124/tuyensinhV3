import { Component , inject , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { ClassMedia } from '@app/models/class-media';
import { AuthenticationService } from '@app/services/authentication.service';
import { MatMenuModule } from '@angular/material/menu';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject , catchError , debounceTime , delay , map , merge , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { CoSoDaoTao } from '@app/models/co-so-dao-tao';
import { CoSoDaoTaoService , selectDefaultBranch } from '@app/services/co-so-dao-tao.service';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@app/models/dto';
import { ClassSessionService } from '@app/services/class-session.service';
import { ClassSession } from '@app/models/class-session';
import { AppState } from '@app/models/app-state';
import { LoadingProgressComponent } from '@app/theme/components/loading-progress/loading-progress.component';
import { Select } from 'primeng/select';
import { ClassMediaService } from '@app/services/class-media.service';
import { IctuDropdownOption } from '@app/models/ictu-dropdown-option';
import { DatePickerModule } from 'primeng/datepicker';
import { CarouselModule } from 'primeng/carousel';
import { NotificationService } from '@app/services/notification.service';
import { TooltipModule } from 'primeng/tooltip';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { FindInArrayPipe } from '@pipes/find-in-array.pipe';
import dayjs from '@setup/dayjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { NgScrollbar } from 'ngx-scrollbar';
import { DatePipe } from '@angular/common';
import { ModerationMediaControlComponent } from '@pages/admin/children/moderation/children/moderation-media-control/moderation-media-control.component';

type ClassMediaModerationSession = Pick<ClassSession , 'id' | 'topic' | 'title' | 'type' | 'donvi_id' | 'class_id' | 'learning_mode' | 'course_id' | 'course_lesson_id' | 'csdt_id' | 'status' | 'media_approved' | 'time_start'>

export type ClassMediaModerationMedia = Pick<ClassMedia , 'id' | 'donvi_id' | 'class_id' | 'class_session_id' | 'type' | 'student_ids' | 'media' | 'status' | 'students' | 'employee' | 'created_by'>

interface ClassMediaModeration {
	session : ClassMediaModerationSession,
	media : ClassMediaModerationMedia[],
	updated : boolean
}

interface updateMediaApproveStatusDto {
	status : ClassMediaModerationMedia['status'],
	session : ClassMediaModerationSession,
	media : ClassMediaModerationMedia
}

interface AnimationUploadingData {
	observer : Subject<number>;
	success : boolean;
	total : number;
	completed : number;
}

@Component( {
	selector    : 'app-moderation-media' ,
	imports     : [ MatMenuModule , CheckboxModule , FormsModule , LoadingProgressComponent , Select , DatePickerModule , CarouselModule , TooltipModule , FindInArrayPipe , NgScrollbar , DatePipe , ModerationMediaControlComponent ] ,
	templateUrl : './moderation-media.component.html' ,
	styleUrl    : './moderation-media.component.css'
} )
export default class ModerationMediaComponent implements OnDestroy {

	private auth : AuthenticationService = inject( AuthenticationService );

	private classMediaService : ClassMediaService = inject( ClassMediaService );

	readonly branches : WritableSignal<CoSoDaoTao[]> = signal<CoSoDaoTao[]>( [] );

	readonly branchID : WritableSignal<number> = signal<number>( 0 );

	private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

	private classSessionService : ClassSessionService = inject( ClassSessionService );

	private destroyed$ : Subject<void> = new Subject<void>();

	protected readonly state : WritableSignal<AppState | 'update'> = signal<AppState | 'update'>( 'loading' );

	private notification : NotificationService = inject( NotificationService );

	protected filterByDate : WritableSignal<Date> = signal<Date>( new Date() );

	protected filterByStatus : WritableSignal<number> = signal<number>( 0 );

	get donViId() : number {
		return this.auth.user.donvi_id;
	}

	readonly approveOptions : Signal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>( [
		{ value : -1 , label : 'Không đạt' } ,
		{ value : 1 , label : 'Đã duyệt' } ,
		{ value : 0 , label : 'Chưa duyệt' }
	] );

	private readonly loadDataObserver : Subject<void> = new Subject<void>();

	readonly classMediaModeration : WritableSignal<ClassMediaModeration[]> = signal<ClassMediaModeration[]>( [] );

	private updateMediaApproveStatusObserver : Subject<updateMediaApproveStatusDto> = new Subject<updateMediaApproveStatusDto>();

	private progressObserver : BehaviorSubject<number> = new BehaviorSubject<number>( 0 );

	constructor() {
		merge(
			toObservable( this.filterByStatus ).pipe(
				distinctUntilChanged()
			) ,
			toObservable( this.branchID ).pipe(
				distinctUntilChanged()
			) ,
			toObservable( this.filterByDate ).pipe(
				distinctUntilChanged( ( previous : Date , current : Date ) : boolean => [ current.getDate() , current.getMonth() , current.getFullYear() ].join( '-' ) === [ previous.getDate() , previous.getMonth() , previous.getFullYear() ].join( '-' ) )
			)
		).pipe(
			takeUntilDestroyed() ,
			debounceTime( 200 )
		).subscribe( () : void => {
			this.loadData();
		} );

		this.updateMediaApproveStatusObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 )
		).subscribe( ( info : updateMediaApproveStatusDto ) : void => {
			this.updateMediaApproveStatus( info );
		} );
	}

	private loadClassSessions( branchID : number ) : Observable<ClassMediaModerationSession[]> {
		const conditions : IctuConditionParam[] = [
			{
				conditionName : 'donvi_id' ,
				condition     : IctuQueryCondition.equal ,
				value         : this.donViId.toString( 10 )
			} ,
			{
				conditionName : 'csdt_id' ,
				condition     : IctuQueryCondition.equal ,
				value         : branchID.toString() ,
				orWhere       : 'and'
			} ,
			{
				conditionName : 'status' ,
				condition     : IctuQueryCondition.equal ,
				value         : '2' ,
				orWhere       : 'and'
			} ,
			{
				conditionName : 'time_start' ,
				condition     : IctuQueryCondition.greaterThanToEqualsTo ,
				value         : dayjs( this.filterByDate() ).format( 'YYYY-MM-DD 00:00:00' ) ,
				orWhere       : 'and'
			} ,
			{
				conditionName : 'time_start' ,
				condition     : IctuQueryCondition.lessThanOrEqualsTo ,
				value         : dayjs( this.filterByDate() ).format( 'YYYY-MM-DD 23:59:00' ) ,
				orWhere       : 'and'
			}
		];
		const queryParams : IctuQueryParams     = {
			limit  : -1 ,
			paged  : 1 ,
			with   : 'class,parent_class' ,
			select : 'id,topic,title,type,donvi_id,class_id,learning_mode,course_id,course_lesson_id,csdt_id,status,media_approved,time_start'
		};
		return this.classSessionService.query( conditions , queryParams ).pipe(
			map( ( res : DtoObject<ClassSession[]> ) : ClassMediaModerationSession[] => res.data )
		);
	}

	private loadBranch() : Observable<CoSoDaoTao[]> {
		const conditions : IctuConditionParam[] = [];
		const queryParams : IctuQueryParams     = {
			limit      : -1 ,
			paged      : 1 ,
			include    : this.donViId.toString() ,
			include_by : 'donvi_id' ,
			select     : 'id,donvi_id,ten,address'
		};
		return this.coSoDaoTaoService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<CoSoDaoTao[]> ) : CoSoDaoTao[] => response.data )
		);
	}

	private loadClassMedia( sessions : ClassMediaModerationSession[] ) : Observable<ClassMediaModeration[]> {
		if ( !sessions.length ) {
			return of( [] );
		}
		const conditions : IctuConditionParam[] = [
			{
				conditionName : 'donvi_id' ,
				condition     : IctuQueryCondition.equal ,
				value         : this.donViId.toString()
			} ,
			{
				conditionName : 'type' ,
				condition     : IctuQueryCondition.equal ,
				value         : 'ACTIVITY' ,
				orWhere       : 'and'
			}
		];
		switch ( this.filterByStatus() ) {
			case -1 :
				conditions.push(
					{
						conditionName : 'approved' ,
						condition     : IctuQueryCondition.equal ,
						value         : '1' ,
						orWhere       : 'and'
					} ,
					{
						conditionName : 'is_approved' ,
						condition     : IctuQueryCondition.equal ,
						value         : '-1' ,
						orWhere       : 'and'
					}
				);
				break;
			case 0 :
				conditions.push(
					{
						conditionName : 'approved' ,
						condition     : IctuQueryCondition.equal ,
						value         : '0' ,
						orWhere       : 'and'
					} ,
					{
						conditionName : 'is_approved' ,
						condition     : IctuQueryCondition.equal ,
						value         : '0' ,
						orWhere       : 'and'
					}
				);
				break;
			case 1 :
				conditions.push(
					{
						conditionName : 'approved' ,
						condition     : IctuQueryCondition.equal ,
						value         : '1' ,
						orWhere       : 'and'
					} ,
					{
						conditionName : 'is_approved' ,
						condition     : IctuQueryCondition.equal ,
						value         : '1' ,
						orWhere       : 'and'
					}
				);
				break;
		}
		const queryParams : IctuQueryParams = {
			limit      : -1 ,
			paged      : 1 ,
			with       : 'students,employee' ,
			select     : 'id,donvi_id,class_id,class_session_id,type,student_ids,media,approved,is_approved,created_by' ,
			include    : sessions.map( ( i : ClassMediaModerationSession ) : number => i.id ).join( ',' ) ,
			include_by : 'class_session_id'
		};
		return this.classMediaService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassMedia[]> ) : ClassMediaModeration[] => {
				return sessions.map( ( session : ClassMediaModerationSession ) : ClassMediaModeration => ( {
					session ,
					media   : response.data.filter( ( o : ClassMedia ) : boolean => o.class_session_id === session.id ) ,
					updated : false
				} ) );
			} )
		);
	}

	private loadData() : void {
		this.state.set( 'loading' );
		this.loadDataObserver.next();
		if ( this.branchID() ) {
			const progressObserver : BehaviorSubject<number> = new BehaviorSubject<number>( 0 );
			this.progressObserver                            = progressObserver;
			this.loadClassSessions( this.branchID() ).pipe(
				takeUntil( merge( this.loadDataObserver , this.destroyed$ ) ) ,
				switchMap( ( response : ClassMediaModerationSession[] ) : Observable<ClassMediaModeration[]> => this.loadClassMedia( response ) ) ,
				switchMap( ( classMediaModeration : ClassMediaModeration[] ) : Observable<{ classMediaModeration : ClassMediaModeration[], success : boolean }> => {
					if ( this.filterByStatus() === 0 ) {
						const totalUpdateElements : number = classMediaModeration.filter( ( i : ClassMediaModeration ) : boolean => !i.session.media_approved && !i.media.length ).length;
						if ( totalUpdateElements ) {
							this.notification.progressBarWithPercent( progressObserver.asObservable() , 'Cập nhật dữ liệu' ).subscribe();
							return this.markSessionAsCompletedWithoutMedia( classMediaModeration , { observer : progressObserver , total : totalUpdateElements , success : true , completed : 0 } );
						} else {
							return of( { classMediaModeration , success : true } );
						}
					} else {
						return of( { classMediaModeration , success : true } );
					}
				} )
			).subscribe( {
				next  : ( { classMediaModeration , success } : { classMediaModeration : ClassMediaModeration[], success : boolean } ) : void => {
					if ( success ) {
						this.classMediaModeration.set( classMediaModeration.filter( ( i : ClassMediaModeration ) : boolean => i.media.length > 0 ) );
						this.state.set( 'success' );
					} else {
						this.state.set( 'error' );
					}
					progressObserver.complete();
					this.progressObserver = undefined;
				} ,
				error : () : void => {
					this.state.set( 'error' );
					progressObserver.complete();
					this.progressObserver = undefined;
				}
			} );
		} else {
			this.loadBranch().pipe(
				takeUntil( merge( this.loadDataObserver , this.destroyed$ ) )
			).subscribe( {
				next  : ( branches : CoSoDaoTao[] ) : void => {
					this.branches.set( branches );
					this.branchID.set( selectDefaultBranch( this.auth.employee , branches )?.id || 0 );
				} ,
				error : () : void => {
					this.state.set( 'error' );
				}
			} );
		}
	}

	protected btnChangeAgent( agentID : number ) : void {
		if ( this.branchID() !== agentID ) {
			this.branchID.set( agentID );
		}
	}

	protected reload( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData();
	}

	protected btnUpdateMediaApproveStatus( status : ClassMediaModerationMedia['status'] , session : ClassMediaModerationSession , media : ClassMediaModerationMedia ) : void {
		this.updateMediaApproveStatusObserver.next( { status , session , media } );
	}

	private updateMediaApproveStatus( { status , media , session } : updateMediaApproveStatusDto ) : void {
		const progressObserver : BehaviorSubject<number> = new BehaviorSubject<number>( 0 );
		this.progressObserver                            = progressObserver;
		this.classMediaService.update( media.id , { status } ).pipe(
			takeUntil( this.destroyed$ ) ,
			switchMap( () : Observable<{ classMediaModeration : ClassMediaModeration[], success : boolean }> => {
				const classMediaModeration : ClassMediaModeration[] = [ ... this.classMediaModeration() ].map( ( row : ClassMediaModeration ) : ClassMediaModeration => {
					if ( row.session.id === session.id ) {
						row.media = row.media.filter( ( _media : ClassMediaModerationMedia ) : boolean => _media.id !== media.id );
					}
					row.updated = false;
					return row;
				} );
				if ( this.filterByStatus() === 0 ) {
					const totalUpdateElements : number = classMediaModeration.filter( ( i : ClassMediaModeration ) : boolean => !i.updated && !i.media.length ).length;
					if ( totalUpdateElements ) {
						this.notification.progressBarWithPercent( progressObserver.asObservable() , 'Cập nhật dữ liệu' ).subscribe();
						return this.markSessionAsCompletedWithoutMedia( classMediaModeration , { observer : progressObserver , total : totalUpdateElements , success : true , completed : 0 } );
					} else {
						return of( {
							classMediaModeration ,
							success : true
						} );
					}
				} else {
					return of( {
						classMediaModeration ,
						success : true
					} );
				}
			} )
		).subscribe( {
			next  : ( { classMediaModeration , success } : { classMediaModeration : ClassMediaModeration[], success : boolean } ) : void => {
				if ( success ) {
					this.classMediaModeration.set( classMediaModeration.filter( ( i : ClassMediaModeration ) : boolean => i.media.length > 0 ) );
					this.state.set( 'success' );
				} else {
					this.state.set( 'error' );
				}
				progressObserver.next( 100 );
				this.progressObserver = undefined;
			} ,
			error : () : void => {
				progressObserver.complete();
				this.progressObserver = undefined;
				this.state.set( 'error' );
			}
		} );
	}

	private markSessionAsCompletedWithoutMedia( classMediaModeration : ClassMediaModeration[] , info : AnimationUploadingData ) : Observable<{ classMediaModeration : ClassMediaModeration[], success : boolean }> {
		const index : number = classMediaModeration.findIndex( ( i : ClassMediaModeration ) : boolean => !i.updated && !i.media.length );
		if ( -1 !== index ) {
			return this.classSessionService.update( classMediaModeration[ index ].session.id , { media_approved : 1 } ).pipe(
				takeUntil( this.destroyed$ ) ,
				map( () : { classMediaModeration : ClassMediaModeration[], info : AnimationUploadingData } => {
					classMediaModeration[ index ].updated = true;
					info.completed += 1;
					info.observer.next( ( ( info.completed * 100 ) / info.total ) );
					return { classMediaModeration , info };
				} ) ,
				delay( 500 ) ,
				switchMap( ( response : { classMediaModeration : ClassMediaModeration[], info : AnimationUploadingData } ) : Observable<{ classMediaModeration : ClassMediaModeration[], success : boolean }> => {
					// const newClassMediaModeration : ClassMediaModeration[] = classMediaModeration.filter( ( _ : ClassMediaModeration , _index : number ) : boolean => _index !== index );
					return this.markSessionAsCompletedWithoutMedia( response.classMediaModeration , response.info );
				} ) ,
				catchError( () : Observable<{ classMediaModeration : ClassMediaModeration[], success : boolean }> => {
					classMediaModeration[ index ].updated = true;
					return this.markSessionAsCompletedWithoutMedia( classMediaModeration , { ... info , success : false } );
				} )
			);
		} else {
			return of( { classMediaModeration , success : info.success } );
		}
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
		if ( this.progressObserver ) {
			this.progressObserver.complete();
		}
	}
}
