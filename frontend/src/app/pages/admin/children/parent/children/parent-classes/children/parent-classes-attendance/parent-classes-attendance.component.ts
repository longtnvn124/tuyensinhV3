import { Component , computed , inject , input , InputSignal , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { ParentClassesChild } from '@pages/admin/children/parent/children/parent-classes/model/parent-classes-child';
import { map , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { AppState } from '@models/app-state';
import { ParentClassesData } from '@pages/admin/children/parent/children/parent-classes/parent-classes.component';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { ClassSessionService } from '@services/class-session.service';
import { ClassSession } from '@models/class-session';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { DatePipe , NgClass , NgOptimizedImage } from '@angular/common';
import { PublicAssetPipe } from '@pipes/public-asset.pipe';
import { StudentAvatarPipe } from '@pipes/student-avatar.pipe';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { DiemDanh } from '@models/diem-danh';
import { filter as _filter , find , map as _map , find as _find , orderBy } from 'lodash-es';
import { BaseEmployeeInfo } from '@models/employee';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';
import { UserInitialsPipe } from '@pipes/user-initials.pipe';
import { IctuDropdownOptionElement } from '@models/ictu-dropdown-option';
import { IctuDropdownOptionMapPipe } from '@pipes/ictu-dropdown-option-map.pipe';
import { DiemDanhService } from '@services/diem-danh.service';
import { BranchTimeSlot , CoSoDaoTao } from '@models/co-so-dao-tao';
import { joinSources } from '@utilities/join-sources';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';

type ParentAttendanceStatus = 'PRESENT' | 'UNEXCUSED' | 'EXCUSED' | 'LATE';

type AttendanceRecordSession = Pick<ClassSession , 'id' | 'topic' | 'title' | 'type' | 'class_id' | 'learning_mode' | 'course_id' | 'course_lesson_id' | 'teacher_id' | 'assistant_id' | 'time_start' | 'time_slot_order' | 'room_id' | 'status'>

interface AttendanceRecord extends Pick<DiemDanh , 'id' | 'class_session_id' | 'class_id' | 'hocsinh_id' | 'course_id' | 'reason' | 'status' | 'class_session_id_parent' | 'parent_id' | 'created_at'> {
	shift : string;
	room : string;
	session : AttendanceRecordSession;
	classDate : string;
	assistant : BaseEmployeeInfo,
	teacher : BaseEmployeeInfo
}

interface AttendanceSummary {
	total : number,
	present : number,
	late : number,
	unexcused : number,
	excused : number,
}

type BranchTimeSlots = CoSoDaoTao['time_slots'];

interface ParentClassesAttendanceResponse {
	timeSlots : BranchTimeSlots;
	checkins : DiemDanh[];
	sessions : AttendanceRecordSession[];
}

@Component( {
	selector    : 'parent-classes-attendance' ,
	standalone  : true ,
	imports     : [ LoadingProgressComponent , NgOptimizedImage , PublicAssetPipe , StudentAvatarPipe , DatePipe , FormsModule , InputText , EmployeePhotoPipe , UserInitialsPipe , NgClass , IctuDropdownOptionMapPipe ] ,
	templateUrl : './parent-classes-attendance.component.html' ,
	styleUrl    : './parent-classes-attendance.component.css'
} )
export class ParentClassesAttendanceComponent implements OnDestroy , ParentClassesChild {

	classObject : InputSignal<ParentClassesData> = input.required<ParentClassesData>();

	private destroyed$ : Subject<void> = new Subject();

	protected state : WritableSignal<AppState> = signal( 'loading' );

	private readonly loadDataObserver : Subject<number> = new Subject<number>();

	private readonly session : WritableSignal<number> = signal( 0 );

	private readonly classSessionService : ClassSessionService = inject( ClassSessionService );

	private readonly diemDanhService : DiemDanhService = inject( DiemDanhService );

	private readonly coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

	protected readonly selectedStatus : WritableSignal<ParentAttendanceStatus | ''> = signal( '' );

	protected searchKeyword : WritableSignal<string> = signal( '' );

	protected readonly attendanceRecords : WritableSignal<AttendanceRecord[]> = signal( [] );

	readonly summary : Signal<AttendanceSummary> = computed( () : AttendanceSummary => {
		return {
			total     : this.attendanceRecords().length ,
			present   : _filter( this.attendanceRecords() , ( { status } : AttendanceRecord ) : boolean => [ 'PRESENT' , 'LATE' ].includes( status ) ).length ,
			late      : _filter( this.attendanceRecords() , { status : 'LATE' } ).length ,
			unexcused : _filter( this.attendanceRecords() , { status : 'UNEXCUSED' } ).length ,
			excused   : _filter( this.attendanceRecords() , { status : 'EXCUSED' } ).length
		};
	} );

	readonly filteredRecords : Signal<AttendanceRecord[]> = computed( () : AttendanceRecord[] => {
		let records : AttendanceRecord[]           = [ ... this.attendanceRecords() ];
		const status : '' | ParentAttendanceStatus = this.selectedStatus();
		const keyword : string                     = this.searchKeyword().trim().toLowerCase();

		if ( status ) {
			records = status === 'PRESENT' ? _filter( records , ( { status } : AttendanceRecord ) : boolean => [ 'PRESENT' , 'LATE' ].includes( status ) ) : _filter( records , { status } );
		}

		if ( keyword ) {
			records = records.filter( ( r : AttendanceRecord ) : boolean =>
				r.session?.topic.toLowerCase().includes( keyword ) ||
				r.session?.title.toLowerCase().includes( keyword ) ||
				r.room.toLowerCase().includes( keyword ) ||
				r.teacher?.full_name.toLowerCase().includes( keyword )
			);
		}
		return orderBy( records , [ ( session : AttendanceRecord ) : Date => new Date( session.classDate ) ] , [ 'desc' ] );
	} );

	readonly attendanceRate : Signal<number> = computed( () : number => {
		const { total , present } : AttendanceSummary = this.summary();
		if ( total === 0 ) return 0;
		return Math.floor( ( present / total ) * 100 );
	} );

	readonly cssClassOptions : IctuDropdownOptionElement<string>[] = [
		{ value : 'PRESENT' , label : 'status-present' } ,
		{ value : 'UNEXCUSED' , label : 'status-absent' } ,
		{ value : 'LATE' , label : 'status-late' } ,
		{ value : 'EXCUSED' , label : 'status-excused' } ,
		{ value : 'WAITING' , label : 'status-present' } ,
		{ value : 'NOT_ATTENDED_YET' , label : 'status-present' }
	];

	readonly iconClassOptions : IctuDropdownOptionElement<string>[] = [
		{ value : 'PRESENT' , label : 'fa-classic fa-solid fa-circle-check' } ,
		{ value : 'UNEXCUSED' , label : 'fa-classic fa-solid fa-times-circle' } ,
		{ value : 'LATE' , label : 'fa-classic fa-solid fa-clock' } ,
		{ value : 'EXCUSED' , label : 'fa-classic fa-solid fa-circle-minus' } ,
		{ value : 'WAITING' , label : 'fa-classic fa-solid fa-circle-question' } ,
		{ value : 'NOT_ATTENDED_YET' , label : 'fa-classic fa-solid fa-circle-exclamation' }
	];

	readonly labelOptions : IctuDropdownOptionElement<string>[] = [
		{ value : 'PRESENT' , label : 'Có mặt' } ,
		{ value : 'UNEXCUSED' , label : 'Nghỉ không phép' } ,
		{ value : 'LATE' , label : 'Đến muộn' } ,
		{ value : 'EXCUSED' , label : 'Nghỉ có phép' } ,
		{ value : 'WAITING' , label : 'Đang chờ xếp lớp' } ,
		{ value : 'NOT_ATTENDED_YET' , label : 'Không tham gia' }
	];

	private _timeSlots : BranchTimeSlots = null;

	constructor() {
		toObservable( this.classObject ).pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged( ( previous : ParentClassesData , current : ParentClassesData ) : boolean => previous?.id === current.id && previous?.student?.id === current.student?.id )
		).subscribe( () : void => {
			this.loadData();
		} );

		this.loadDataObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this._loadData();
		} );
	}

	private loadData() : void {
		this.loadDataObserver.next( this.session() );
	}

	private increaseSession() : void {
		this.session.update( ( value : number ) : number => 1 + value );
	}

	protected reload( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData();
	}

	private _loadData() : void {
		this.state.set( 'loading' );
		joinSources<ParentClassesAttendanceResponse>( {
			checkins  : this.loadCheckIns() ,
			timeSlots : this.loadTimeSlots() ,
			sessions  : of( [] )
		} ).pipe(
			takeUntil( this.destroyed$ ) ,
			switchMap( ( { checkins , timeSlots } : ParentClassesAttendanceResponse ) : Observable<ParentClassesAttendanceResponse> => {
				const ids : number[] = checkins.length ? _map( checkins , 'class_session_id' ) : [];
				if ( ids.length ) {
					return this.loadClassSessionByIds( ids ).pipe(
						map( ( sessions : ClassSession[] ) : ParentClassesAttendanceResponse => ( { checkins , timeSlots , sessions } ) )
					);
				} else {
					return of( { checkins , timeSlots , sessions : [] } );
				}
			} ) ,
			map( ( { checkins , timeSlots , sessions } : ParentClassesAttendanceResponse ) : AttendanceRecord[] => {
				return checkins.map( ( checkIn : DiemDanh ) : AttendanceRecord => {
					const session : AttendanceRecordSession = _find( sessions , { id : checkIn.class_session_id } );
					const _t : BranchTimeSlot               = session?.time_slot_order ? find( timeSlots , { order : session.time_slot_order } ) : null;
					return {
						... checkIn ,
						session ,
						shift     : _t ? `${ _t.name } - [ ${ _t.start } - ${ _t.end } ]` : '' ,
						room      : session && session[ 'room' ] ? session[ 'room' ][ 'name' ] : '' ,
						classDate : session?.time_start || '' ,
						assistant : session ? session[ 'assistants' ] : null ,
						teacher   : session ? session[ 'teacher' ] : null
					};
				} );
			} )
		).subscribe( {
			next  : ( attendanceRecords : AttendanceRecord[] ) : void => {
				this.attendanceRecords.set( attendanceRecords );
				this.state.set( 'success' );
				this.increaseSession();
			} ,
			error : () : void => {
				this.state.set( 'error' );
				this.increaseSession();
			}
		} );
	}

	private loadClassSessionByIds( ids : number[] ) : Observable<ClassSession[]> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'parent_id' , value : '0' , condition : IctuQueryCondition.equal }
		];
		const queryParams : IctuQueryParams     = {
			limit      : -1 ,
			paged      : 1 ,
			include    : ids.join( ',' ) ,
			include_by : 'id' ,
			with       : 'room,teacher,assistants' ,
			select     : 'id,topic,title,type,class_id,learning_mode,course_id,course_lesson_id,teacher_id,assistant_id,time_start,time_slot_order,room_id,status'
		};
		return this.classSessionService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassSession[]> ) : ClassSession[] => response.data )
		);
	}

	private loadCheckIns() : Observable<DiemDanh[]> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'class_id' , value : this.classObject().id.toString( 10 ) , condition : IctuQueryCondition.equal } ,
			{ conditionName : 'course_id' , value : this.classObject().course_id.toString( 10 ) , condition : IctuQueryCondition.equal , orWhere : 'and' } ,
			{ conditionName : 'hocsinh_id' , value : this.classObject().student.id.toString( 10 ) , condition : IctuQueryCondition.equal , orWhere : 'and' }
		];
		const queryParams : IctuQueryParams     = {
			limit   : -1 ,
			paged   : 1 ,
			order   : 'ASC' ,
			orderby : 'created_at' ,
			select  : 'id,class_session_id,class_id,hocsinh_id,course_id,reason,status,class_session_id_parent,parent_id,created_at'
		};
		return this.diemDanhService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<DiemDanh[]> ) : DiemDanh[] => response.data )
		);
	}

	private loadTimeSlots() : Observable<BranchTimeSlots> {
		if ( this._timeSlots ) {
			return of( this._timeSlots );
		}
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'id' , value : this.classObject().csdt_id.toString( 10 ) , condition : IctuQueryCondition.equal }
		];
		const queryParams : IctuQueryParams     = {
			limit  : 1 ,
			paged  : 1 ,
			select : 'id,donvi_id,time_slots'
		};
		return this.coSoDaoTaoService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<CoSoDaoTao[]> ) : BranchTimeSlots => {
				this._timeSlots = response.data.length ? ( response.data[ 0 ]?.time_slots || null ) : null;
				return this._timeSlots;
			} )
		);
	}

	protected setFilter( status : ParentAttendanceStatus | '' ) : void {
		this.selectedStatus.set( status );
	}

	protected clearFilters() : void {
		this.selectedStatus.set( '' );
		this.searchKeyword.set( '' );
	}

	// protected onSearchChange( event : Event ) : void {
	// 	const target = event.target as HTMLInputElement;
	// 	this.searchKeyword.set( target.value );
	// }

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
