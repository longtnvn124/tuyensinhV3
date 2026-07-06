import { Component , inject , OnDestroy , OnInit , signal , WritableSignal } from '@angular/core';
import { StudentPopupInfo } from '@models/hoc-sinh';
import { map , Subject , takeUntil } from 'rxjs';
import { MAT_DIALOG_DATA , MatDialogRef } from '@angular/material/dialog';
import { PublicAssetPipe } from '@pipes/public-asset.pipe';
import { DatePipe , NgOptimizedImage } from '@angular/common';
import { PhuHuynh } from '@models/phu-huynh';
import { AppState } from '@models/app-state';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { PhuHuynhService } from '@services/phu-huynh.service';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { map as _map } from 'lodash-es';
import { Helper } from '@utilities/helper';

export interface StudentRelative extends PhuHuynh {
	cardColor : string;
	relationshipIcon : string;
}

type StudentRelationshipKey = 'bo' | 'cha' | 'me' | 'ong' | 'ba' | 'bac' | 'chu' | 'co' | 'gi' | 'cau' | 'mo' | 'thim' | 'anh' | 'chi' | 'nguoi-dua-don';

// type StudentRelationshipKey =
// 	| 'father'
// 	| 'mother'
// 	| 'grandfather'
// 	| 'grandmother'
// 	| 'uncle_paternal_older'     // bác (anh của bố)
// 	| 'uncle_paternal_younger'   // chú (em của bố)
// 	| 'aunt_paternal'            // cô (chị/em của bố)
// 	| 'aunt_married_to_uncle'    // thím
// 	| 'uncle_maternal'           // cậu
// 	| 'aunt_maternal'            // dì
// 	| 'aunt_married_to_uncle_maternal' // mợ
// 	| 'older_brother'
// 	| 'older_sister'
// | 'guardian'
// | 'pickup_person';


const RELATIONSHIP_COLORS : Record<StudentRelationshipKey , string> = {
	'bo'            : '#4680ff' ,
	'cha'           : '#4680ff' ,
	'chu'           : '#4680ff' ,
	'bac'           : '#4680ff' ,
	'cau'           : '#4680ff' ,
	'me'            : '#ec407a' ,
	'mo'            : '#ec407a' ,
	'gi'            : '#ec407a' ,
	'co'            : '#ec407a' ,
	'thim'          : '#ec407a' ,
	'ong'           : '#8d6e63' ,
	'ba'            : '#ab47bc' ,
	'anh'           : '#26a69a' ,
	'chi'           : '#ff7043' ,
	'nguoi-dua-don' : '#66bb6a'
} as const;

function getRelationshipColor( relationship : string ) : string {
	const _key : StudentRelationshipKey | string = Helper.removeAccents( relationship );
	return RELATIONSHIP_COLORS[ _key ] || '#78909c';
}

const RELATIONSHIP_ICONS : Record<StudentRelationshipKey , string> = {
	'bo'            : 'ti ti-man' ,
	'cha'           : 'ti ti-man' ,
	'chu'           : 'ti ti-man' ,
	'bac'           : 'ti ti-man' ,
	'cau'           : 'ti ti-man' ,
	'ong'           : 'ti ti-old' ,
	'ba'            : 'ti ti-woman' ,
	'me'            : 'ti ti-woman' ,
	'mo'            : 'ti ti-woman' ,
	'gi'            : 'ti ti-woman' ,
	'co'            : 'ti ti-woman' ,
	'thim'          : 'ti ti-woman' ,
	'anh'           : 'ti ti-man' ,
	'chi'           : 'ti ti-woman' ,
	'nguoi-dua-don' : 'ti ti-user-star'
};

function getRelationshipIcon( relationship : string ) : string {
	const _key : StudentRelationshipKey | string = Helper.removeAccents( relationship );
	return RELATIONSHIP_ICONS[ _key ] || 'ti ti-user';
}

@Component( {
	selector    : 'app-parent-info-popup' ,
	standalone  : true ,
	imports     : [ PublicAssetPipe , NgOptimizedImage , LoadingProgressComponent , DatePipe ] ,
	templateUrl : './parent-info-popup.component.html' ,
	styleUrl    : './parent-info-popup.component.css'
} )
export class ParentInfoPopupComponent implements OnDestroy , OnInit {

	public dialogRef : MatDialogRef<ParentInfoPopupComponent , null> = inject( MatDialogRef<ParentInfoPopupComponent , null> );

	public data : StudentPopupInfo = inject( MAT_DIALOG_DATA );

	private destroyed$ : Subject<void> = new Subject<void>();

	protected readonly relatives : WritableSignal<StudentRelative[]> = signal( [] );

	protected readonly state : WritableSignal<AppState> = signal( 'loading' );

	private session : WritableSignal<number> = signal( 0 );

	private loadDataObserver : Subject<number> = new Subject<number>();

	private phuHuynhService : PhuHuynhService = inject( PhuHuynhService );

	constructor() {
		this.loadDataObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this.loadData();
		} );
	}

	ngOnInit() : void {
		this.triggerLoadData();
	}

	private triggerLoadData() : void {
		this.loadDataObserver.next( this.session() );
	}

	protected reload( event : KeyboardEvent | MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.triggerLoadData();
	}

	private loadData() : void {
		this.state.set( 'loading' );
		const conditions : IctuConditionParam[] = [ {
			conditionName : 'id' ,
			value         : this.data.phuhuynh_id.toString() ,
			condition     : IctuQueryCondition.equal
		} ];
		const queryParams : IctuQueryParams     = {
			limit : 1 ,
			paged : 1
		};
		this.phuHuynhService.query( conditions , queryParams ).pipe(
			takeUntil( this.destroyed$ ) ,
			map( ( response : DtoObject<PhuHuynh[]> ) : PhuHuynh[] => response.data )
		).subscribe( {
			next  : ( payload : PhuHuynh[] ) : void => {
				this.relatives.set( _map( payload , ( p : PhuHuynh ) : StudentRelative => ( { ... p , cardColor : getRelationshipColor( p.vaitro ) , relationshipIcon : getRelationshipIcon( p.vaitro ) } ) ) );
				this.state.set( 'success' );
				this.increateSession();
			} ,
			error : () : void => {
				this.state.set( 'error' );
				this.increateSession();
			}
		} );
	}

	private increateSession() : void {
		this.session.update( ( value : number ) : number => 1 + value );
	}

	protected close() : void {
		this.dialogRef.close( null );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
