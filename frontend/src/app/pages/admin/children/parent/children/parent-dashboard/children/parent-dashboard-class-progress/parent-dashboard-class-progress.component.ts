import { Component , inject , input , InputSignal , OnDestroy , signal , WritableSignal } from '@angular/core';
import { map , Observable , Subject , takeUntil } from 'rxjs';
import { Class , CLASS_TIME_SLOT_DAY_TRANSLATOR , ClassTimeSlot , ClassTimeSlotDay } from '@models/class';
import { ClassSession } from '@models/class-session';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { ClassSessionService } from '@services/class-session.service';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { AppState } from '@models/app-state';
import { HocSinh } from '@models/hoc-sinh';
import { AppLanguage } from '@environmentModel';
import { filter as _filter , map as _map } from 'lodash-es';
import { DiemDanhService } from '@services/diem-danh.service';
import { DiemDanh } from '@models/diem-danh';
import { joinSources } from '@utilities/join-sources';
import { NgOptimizedImage } from '@angular/common';
import { PublicAssetPipe } from '@pipes/public-asset.pipe';

interface ClassProgressCard {
	name : string;
	level : string;
	attendanceRate : number;
	completionRate : number;
	shiftInfo : string;
}

export interface ParentDashboardClassProgressInput {
	student : HocSinh,
	classObject : Pick<Class , 'id' | 'name' | 'time_slots' | 'status' | 'course_id'>,
}

export type ClassCheckIn = Pick<DiemDanh , 'id' | 'class_id' | 'hocsinh_id' | 'course_id' | 'reason' | 'status'>

interface ParentDashboardReport {
	classSessions : ClassSession[],
	classCheckIns : ClassCheckIn[],
}

@Component( {
	selector    : 'parent-dashboard-class-progress' ,
	imports : [
		NgOptimizedImage ,
		PublicAssetPipe
	] ,
	templateUrl : './parent-dashboard-class-progress.component.html' ,
	styleUrl    : './parent-dashboard-class-progress.component.css'
} )
export class ParentDashboardClassProgressComponent implements OnDestroy {

	info : InputSignal<ParentDashboardClassProgressInput> = input.required<ParentDashboardClassProgressInput>();

	private destroyed$ : Subject<void> = new Subject<void>();

	private loadDataObserver : Subject<number> = new Subject<number>();

	private readonly classSessionService : ClassSessionService = inject( ClassSessionService );

	private readonly diemDanhService : DiemDanhService = inject( DiemDanhService );

	private readonly session : WritableSignal<number> = signal( 0 );

	protected readonly child : WritableSignal<ClassProgressCard> = signal( {
		name           : '' ,
		level          : '' ,
		attendanceRate : 0 ,
		completionRate : 0 ,
		shiftInfo      : ''
	} );

	protected state : WritableSignal<AppState | 'empty'> = signal( 'loading' );

	constructor() {
		this.loadDataObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this.loadData();
		} );

		toObservable( this.info ).pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged( ( previous : ParentDashboardClassProgressInput , current : ParentDashboardClassProgressInput ) : boolean => previous?.classObject.id === current.classObject.id && previous?.student?.id === current.student?.id )
		).subscribe( () : void => {
			this.triggerLoadData();
		} );
	}

	protected btnReload( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.triggerLoadData();
	}

	private triggerLoadData() : void {
		this.loadDataObserver.next( this.session() );
	}

	private loadData() : void {
		this.state.set( 'loading' );
		const { classObject , student } : ParentDashboardClassProgressInput = this.info();
		joinSources<ParentDashboardReport>( {
			classSessions : this.loadClassSessions( classObject ) ,
			classCheckIns : this.loadCheckinData( { classObject , student } )
		} ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( { classSessions , classCheckIns } : ParentDashboardReport ) : void => {
				const _classDays : string = this.info().classObject.time_slots?.length ? [ ... new Set( _map( this.info().classObject.time_slots , ( _slot : ClassTimeSlot ) : string => this.transform( _slot.day ) ) ) ].join( ', ' ) : '';
				this.child.set( {
					level          : classObject.name ,
					completionRate : classSessions.length ? Math.floor( ( _filter( classSessions , { status : 2 } ).length / classSessions.length ) * 100 ) : 0 ,
					attendanceRate : classCheckIns.length ? Math.floor( ( _filter( classCheckIns , ( _check : ClassCheckIn ) : boolean => [ 'PRESENT' , 'LATE' ].includes( _check.status ) ).length / classCheckIns.length ) * 100 ) : 0 ,
					name           : student.full_name ,
					shiftInfo      : _classDays ? `${ _classDays } hàng tuần` : '--:--'
				} );
				this.increaseSession();
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.increaseSession();
				this.state.set( 'error' );
			}
		} );
	}

	private transform( day : ClassTimeSlotDay , lang : AppLanguage = 'vn' ) : string {
		return CLASS_TIME_SLOT_DAY_TRANSLATOR[ lang ][ day ] ?? 'unknown';
	}

	private loadClassSessions( classObject : Pick<Class , 'id' | 'course_id'> ) : Observable<ClassSession[]> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'class_id' , condition : IctuQueryCondition.equal , value : classObject.id.toString( 10 ) } ,
			{ conditionName : 'course_id' , condition : IctuQueryCondition.equal , value : classObject.course_id.toString( 10 ) , orWhere : 'and' }
		];
		const queryParams : IctuQueryParams     = {
			select : 'id,class_id,status' ,
			paged  : 1 ,
			limit  : -1
		};
		return this.classSessionService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassSession[]> ) : ClassSession[] => response.data )
		);
	}

	private loadCheckinData( { classObject , student } : ParentDashboardClassProgressInput ) : Observable<ClassCheckIn[]> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'hocsinh_id' , condition : IctuQueryCondition.equal , value : student.id.toString( 10 ) } ,
			{ conditionName : 'class_id' , condition : IctuQueryCondition.equal , value : classObject.id.toString( 10 ) , orWhere : 'and' } ,
			{ conditionName : 'course_id' , condition : IctuQueryCondition.equal , value : classObject.course_id.toString( 10 ) , orWhere : 'and' } ,
			{ conditionName : 'parent_id' , condition : IctuQueryCondition.equal , value : '0' , orWhere : 'and' }
		];
		const queryParams : IctuQueryParams     = {
			select : 'id,class_id,hocsinh_id,course_id,reason,status' ,
			paged  : 1 ,
			limit  : -1
		};
		return this.diemDanhService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<DiemDanh[]> ) : DiemDanh[] => response.data )
		);
	}

	private increaseSession() : void {
		this.session.update( ( value : number ) : number => 1 + value );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
