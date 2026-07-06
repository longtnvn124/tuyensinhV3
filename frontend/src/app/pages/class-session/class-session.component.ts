import { Component , computed , inject , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { filter , map , Observable , Subject , switchMap , takeUntil } from 'rxjs';
import { AppState } from '@models/app-state';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { SysRoleName } from '@models/role';
import { ActivatedRoute , ParamMap , Router } from '@angular/router';
import { ClassSession , ClassSessionCommand } from '@models/class-session';
import { AuthenticationService } from '@services/authentication.service';
import { ClassesService } from '@services/classes.service';
import { Class } from '@models/class';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { joinSources } from '@utilities/join-sources';
import { ClassSessionService } from '@services/class-session.service';
import { DatePipe , NgClass } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { Tooltip } from 'primeng/tooltip';
import { BUTTON_NO , BUTTON_YES , ButtonBase } from '@models/button';
import { Helper } from '@utilities/helper';
import { NotificationService } from '@services/notification.service';
import { ClassSessionButtonPipe } from '@pages/class-session/pipes/class-session-button.pipe';
import { ClassSessionAttendanceComponent } from '@pages/class-session/children/class-session-attendance/class-session-attendance.component';
import { ClassSessionAssignmentsComponent } from '@pages/class-session/children/class-session-assignments/class-session-assignments.component';
import { ClassSessionDetailComponent } from '@pages/class-session/children/class-session-detail/class-session-detail.component';

type ClassSessionTabName = 'attendance' | 'sessions' | 'assignment';

type ClassSessionTab = {
	label : string;
	name : ClassSessionTabName;
	icon : string
};

type ChangeStatusEventName = 'confirm' | 'process';

interface ChangeStatusEvent {
	name : ChangeStatusEventName;
	session : number;
}

@Component( {
	selector    : 'app-class-session' ,
	imports     : [ LoadingProgressComponent , DatePipe , MatButton , Tooltip , NgClass , ClassSessionButtonPipe , ClassSessionAttendanceComponent , ClassSessionAssignmentsComponent , ClassSessionDetailComponent ] ,
	templateUrl : './class-session.component.html' ,
	styleUrl    : './class-session.component.css'
} )
export default class ClassSessionComponent implements OnDestroy {

	private auth : AuthenticationService = inject( AuthenticationService );

	private router : Router = inject( Router );

	private activatedRoute : ActivatedRoute = inject( ActivatedRoute );

	private classService : ClassesService = inject( ClassesService );

	private classSessionService : ClassSessionService = inject( ClassSessionService );

	private notification : NotificationService = inject( NotificationService );

	protected readonly state : WritableSignal<AppState | 'unauthorized' | 'invalid' | 'notFound'> = signal( 'loading' );

	private loadDataObserver : Subject<number> = new Subject<number>();

	private destroyed$ : Subject<void> = new Subject<void>();

	private session : WritableSignal<number> = signal( 0 );

	private command : WritableSignal<ClassSessionCommand> = signal( null );

	protected readonly role : Signal<SysRoleName> = computed( () : SysRoleName => this.command()?.role ?? null );

	protected classObject : WritableSignal<Class> = signal( null );

	protected classSession : WritableSignal<ClassSession> = signal( null );

	private readonly acceptedRoles : Signal<SysRoleName[]> = signal( [ 'teaching_assistant' , 'teacher' , 'training_management' ] );

	protected readonly navList : Signal<ClassSessionTab[]> = signal<ClassSessionTab[]>( [
		{ label : 'Nội dung giảng dạy' , name : 'sessions' , icon : 'fa-classic fa-light fa-book-open' } ,
		{ label : 'Điểm danh' , name : 'attendance' , icon : 'fa-classic fa-light fa-user-check' } ,
		{ label : 'Bài tập về nhà' , name : 'assignment' , icon : 'fa-classic fa-light fa-file-pen' }
	] );

	protected readonly activeMenu : WritableSignal<ClassSessionTabName> = signal( 'attendance' );

	protected readonly timePassed : WritableSignal<string> = signal( '' );

	private changeStatusEventObserver : Subject<ChangeStatusEvent> = new Subject<ChangeStatusEvent>();

	protected readonly userCanChangeData : Signal<boolean> = computed( () : boolean => {
		return [ this.classSession().assistant_id , this.classSession().teacher_id ].filter( Boolean ).includes( this.auth.user.id );
	} );

	constructor() {
		this.loadDataObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this.loadData();
		} );

		toObservable( this.command ).pipe(
			takeUntilDestroyed() ,
			filter( Boolean ) ,
			distinctUntilChanged( ( previous : ClassSessionCommand , current : ClassSessionCommand ) : boolean => previous?.id === current.id )
		).subscribe( () : void => {
			this.triggerLoadData();
		} );

		this.activatedRoute.queryParamMap.pipe(
			takeUntilDestroyed() ,
			filter( ( queryParamMap : ParamMap ) : boolean => queryParamMap.has( 'hashcode' ) ) ,
			map( ( queryParamMap : ParamMap ) : ClassSessionCommand => this.decryptCode( queryParamMap.get( 'hashcode' ) ) )
		).subscribe( ( command : ClassSessionCommand ) : void => {
			if (
				command.role
				&& this.auth.userHasRole( this.acceptedRoles() )
				&& this.acceptedRoles().includes( command.role )
				&& this.auth.user.id === command.userId
			) {
				this.command.set( command );
				console.log( command );
			} else {
				this.state.set( 'unauthorized' );
			}
		} );

		this.changeStatusEventObserver.pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged( ( previous : ChangeStatusEvent , current : ChangeStatusEvent ) : boolean => previous?.session === current.session )
		).subscribe( ( event : ChangeStatusEvent ) : void => {
			switch ( event.name ) {
				case 'confirm':
					this.confirmChangeSessionStatus();
					break;
				case 'process':
					this.increateClassSessionStatus();
					break;
				default:
					break;
			}
		} );
	}

	private decryptCode( encrypted : string ) : ClassSessionCommand {
		const _default : ClassSessionCommand = { userId : 0 , class_id : 0 , id : 0 , role : 'parent' };
		if ( encrypted ) {
			try {
				const str : string = this.auth.decrypt( encrypted );
				return str ? Object.assign<ClassSessionCommand , any>( _default , JSON.parse( str ) ) : null;
			} catch ( e ) {
				return _default;
			}
		}
		return _default;
	}

	private loadData() : void {
		this.state.set( 'loading' );
		joinSources<{ classObject : Class, classSession : ClassSession }>( {
			classObject  : this.loadClassObject( this.command().class_id ) ,
			classSession : this.loadClassSession( this.command().id )
		} ).subscribe( {
			next  : ( { classObject , classSession } : { classObject : Class, classSession : ClassSession } ) : void => {
				if ( classObject && classSession ) {
					this.classObject.set( classObject );
					this.classSession.set( classSession );
					this.state.set( 'success' );
				} else {
					this.state.set( 'notFound' );
				}
				this.increateSession();
			} ,
			error : () : void => {
				this.increateSession();
				this.state.set( 'error' );
			}
		} );
	}

	private loadClassObject( classID : number ) : Observable<Class> {
		const conditions : IctuConditionParam[] = [ { conditionName : 'id' , value : classID.toString() , condition : IctuQueryCondition.equal } ];
		const queryParams : IctuQueryParams     = {
			limit : 1 ,
			paged : 1
		};
		return this.classService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<Class[]> ) : Class => response.data.length ? response.data[ 0 ] : null )
		);
	}

	private loadClassSession( id : number ) : Observable<ClassSession> {
		const conditions : IctuConditionParam[] = [ {
			conditionName : 'id' ,
			value         : id.toString() ,
			condition     : IctuQueryCondition.equal
		} ];
		const queryParams : IctuQueryParams     = {
			limit : 1 ,
			paged : 1
		};
		return this.classSessionService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassSession[]> ) : ClassSession => response.data.length ? response.data[ 0 ] : null )
		);
	}

	protected btnReload( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.triggerLoadData();
	}

	private triggerLoadData() : void {
		this.loadDataObserver.next( this.session() );
	}

	private increateSession() : void {
		this.session.update( ( value : number ) : number => 1 + value );
	}

	protected backToClassList() : void {
		if ( this.role() == 'teaching_assistant' ) {
			void this.router.navigate( [ 'admin/teaching-assistant/calendar' ] );
		} else {
			void this.router.navigate( [ 'admin/teacher/schedule' ] );
		}
	}

	protected selectMenu( name : ClassSessionTabName ) : void {
		this.activeMenu.set( name );
	}

	protected changeSessionStatus() : void {
		if ( [ 0 , 1 ].includes( this.classSession().status ) ) {
			this.changeStatusEventObserver.next( {
				session : this.session() ,
				name    : 'confirm'
			} );
		}
	}

	private confirmChangeSessionStatus() : void {
		this.notification.confirm( {
			heading : 'Xác nhận bắt đầu buổi học ' ,
			message : 'Bạn có chắc chắn bắt đầu buổi học không?' ,
			buttons : [ BUTTON_NO , BUTTON_YES ]
		} ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( confirmedButton : ButtonBase ) : void => {
				this.increateSession();
				if ( confirmedButton.name === BUTTON_YES.name ) {
					this.increateClassSessionStatus();
				}
			} ,
			error : () : void => {
				this.increateSession();
			}
		} );
	}

	private increateClassSessionStatus() : void {
		this.state.set( 'loading' );
		const status : number             = Math.min( 2 , 1 + this.classSession().status );
		const currentSQLDateTime : string = Helper.formatSQLDateTime( new Date() );
		let info : Partial<ClassSession>  = status === 1 ? { status , started_at : currentSQLDateTime } : { status , ended_at : currentSQLDateTime };
		this.classSessionService.update( this.command().id , info ).pipe(
			takeUntil( this.destroyed$ ) ,
			switchMap( () : Observable<ClassSession> => this.loadClassSession( this.command().id ) )
		).subscribe( {
			next  : ( response : ClassSession ) : void => {
				this.classSession.set( response );
				this.state.set( 'success' );
				this.increateSession();
			} ,
			error : () : void => {
				this.state.set( 'success' );
				this.increateSession();
			}
		} );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
