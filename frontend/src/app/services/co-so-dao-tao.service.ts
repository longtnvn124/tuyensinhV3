import { inject , Injectable } from '@angular/core';
import { CoSoDaoTao } from '@models/co-so-dao-tao';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { map , Observable , of } from 'rxjs';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { AuthenticationService } from '@services/authentication.service';
import { User } from '@models/user';
import { cloneDeep } from 'lodash-es';
import { Employee } from '@models/employee';

export type BranchOption = Pick<CoSoDaoTao , 'id' | 'donvi_id' | 'ten' | 'address'>

interface PersonalBranches {
	userID : number,
	options : BranchOption[]
}

/**
 * Chọn cơ sở đào tạo mặc định cho employee
 */
export const selectDefaultBranch : ( employee : Employee , branches : BranchOption[] ) => BranchOption | null = ( employee : Employee , branches : BranchOption[] ) : BranchOption | null => {
	if ( !branches || branches.length === 0 ) {
		return null;
	}
	const matchedBranch : BranchOption = branches.find( ( branch : BranchOption ) : boolean => branch.id === employee?.csdt_id );
	return matchedBranch || branches[ 0 ];
};

@Injectable( {
	providedIn : 'any'
} )
export class CoSoDaoTaoService extends IctuBaseServiceClass<CoSoDaoTao> {

	private auth : AuthenticationService = inject<AuthenticationService>( AuthenticationService );

	private _key : string = '50u^X7$f_O8h';

	constructor() {
		super( 'dm-csdt' );
	}

	load( search : string , donvi_id : number , _queryParams? : Partial<IctuQueryParams> ) : Observable<DtoObject<CoSoDaoTao[]>> {
		const queryParams : IctuQueryParams = Object.assign<IctuQueryParams , IctuQueryParams>( {
			limit      : 20 ,
			paged      : 1 ,
			include    : donvi_id ,
			include_by : 'donvi_id' ,
			order      : 'ASC' ,
			orderby    : 'ten'
		} , _queryParams );

		const conditions : IctuConditionParam[] = [];
		if ( search ) {
			conditions.push(
				{
					conditionName : 'ten' ,
					value         : `%${ search }%` ,
					condition     : IctuQueryCondition.like
				} ,
				{
					conditionName : 'kyhieu' ,
					value         : `%${ search }%` ,
					condition     : IctuQueryCondition.like ,
					orWhere       : 'or'
				}
			);
		}
		return this.query( conditions , queryParams );
	}

	loadOptions( donvi_id : number , _queryParams? : Partial<IctuQueryParams> ) : Observable<IctuDropdownOption<number>[]> {
		const queryParams : IctuQueryParams = Object.assign<IctuQueryParams , IctuQueryParams>( {
			limit      : -1 ,
			paged      : 1 ,
			include    : donvi_id ,
			include_by : 'donvi_id' ,
			order      : 'ASC' ,
			orderby    : 'ten' ,
			select     : 'id,ten'
		} , _queryParams );
		return this.query( [] , queryParams ).pipe( map( ( { data } : DtoObject<CoSoDaoTao[]> ) : IctuDropdownOption<number>[] => data.map( ( csdt : CoSoDaoTao ) : IctuDropdownOption<number> => ( {
			value : csdt.id ,
			label : csdt.ten
		} ) ) ) );
	}

	public loadMyBranches() : Observable<BranchOption[]> {
		if ( !this.auth.user || !this.auth.user.donvi_id ) {
			return of( [] );
		}
		const user : User             = this.auth.user;
		const info : PersonalBranches = this.getSavedPersonalBranches();
		if ( info?.userID === user.id ) {
			return of( info.options );
		} else {
			return this.myBranchesObserver( user ).pipe(
				map( ( options : BranchOption[] ) : BranchOption[] => this.saveUserBranches( user , options ) )
			);
		}
	}

	private getSavedPersonalBranches() : PersonalBranches {
		const raw : string   = localStorage.getItem( this._key );
		const _text : string = raw ? this.auth.decrypt( raw ) : null;
		return _text ? JSON.parse( _text ) : null;
	}

	private saveUserBranches( user : User , options : BranchOption[] ) : BranchOption[] {
		const info : PersonalBranches = {
			userID : user.id ,
			options
		};
		localStorage.setItem( this._key , this.auth.encrypt( JSON.stringify( info ) ) );
		return cloneDeep( options );
	}

	private myBranchesObserver( user : User ) : Observable<BranchOption[]> {
		const conditions : IctuConditionParam[] = [];
		const queryParams : IctuQueryParams     = {
			limit      : 20 ,
			paged      : 1 ,
			include    : user.donvi_id.toString() ,
			include_by : 'donvi_id' ,
			select     : 'id,donvi_id,ten,address' ,
			order      : 'ASC' ,
			orderby    : 'ten'
		};
		return this.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<CoSoDaoTao[]> ) : CoSoDaoTao[] => response.data )
		);
	}

}
