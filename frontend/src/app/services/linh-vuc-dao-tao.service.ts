import { Injectable } from '@angular/core';
import { LinhVucDaoTao } from "@models/linh-vuc-dao-tao";
import { map , Observable } from "rxjs";
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from "@models/dto";
import { IctuDropdownOption } from "@models/ictu-dropdown-option";
import { IctuBaseServiceClass } from "@models/ictu-base-service.class";

const linhVucDaoTao2IctuDropdownOption : ( data : LinhVucDaoTao[] ) => IctuDropdownOption<number>[] = ( data : LinhVucDaoTao[] ) : IctuDropdownOption<number>[] => {
	return data.map( ( item : LinhVucDaoTao ) : IctuDropdownOption<number> => ( {
		value : item.id ,
		label : item.ten
	} ) )
}

@Injectable( {
	providedIn : 'any'
} )
export class LinhVucDaoTaoService extends IctuBaseServiceClass<LinhVucDaoTao> {

	constructor () {
		super( 'dm-linhvuc' );
	}

	loadParentOptions () : Observable<IctuDropdownOption<number>[]> {
		const conditions : IctuConditionParam[] = [
			{
				conditionName : 'parent_id' ,
				value         : '0' ,
				condition     : IctuQueryCondition.equal
			}
		];
		const params : IctuQueryParams          = {
			limit   : -1 ,
			paged   : 1 ,
			order   : 'ASC' ,
			orderby : 'ten' ,
			select  : 'id,ten'
		};
		return this.query( conditions , params ).pipe( map( ( res : DtoObject<LinhVucDaoTao[]> ) : IctuDropdownOption<number>[] => ( [
			{
				value : 0 ,
				label : 'Không có lĩnh vực cha'
			} , ... res.data.map( ( item : LinhVucDaoTao ) : IctuDropdownOption<number> => ( {
				value : item.id ,
				label : item.ten
			} ) )
		] ) ) );
	}

	loadChildOptions () : Observable<IctuDropdownOption<number>[]> {
		const conditions : IctuConditionParam[] = [
			{
				conditionName : 'parent_id' ,
				value         : '0' ,
				condition     : IctuQueryCondition.notEqual
			}
		];
		const params : IctuQueryParams          = {
			limit   : -1 ,
			paged   : 1 ,
			order   : 'ASC' ,
			orderby : 'ten' ,
			select  : 'id,ten'
		};
		return this.query( conditions , params ).pipe( map( ( res : DtoObject<LinhVucDaoTao[]> ) : IctuDropdownOption<number>[] => ( [
			... res.data.map( ( item : LinhVucDaoTao ) : IctuDropdownOption<number> => ( {
				value : item.id ,
				label : item.ten
			} ) )
		] ) ) );
	}

	/**
	 * loadOptions
	 * @var emptyOption = { value : 0 , label : 'Không có lĩnh vục' }
	 * */
	loadOptions ( emptyOption? : IctuDropdownOption<number> , grouped : boolean = false ) : Observable<IctuDropdownOption<number>[]> {
		const conditions : IctuConditionParam[] = [];
		if ( ! grouped ) {
			conditions.push( {
				conditionName : 'parent_id' ,
				value         : '0' ,
				condition     : IctuQueryCondition.greaterThan
			} )
		}
		const params : IctuQueryParams = {
			limit   : -1 ,
			paged   : 1 ,
			order   : 'ASC' ,
			orderby : 'ten' ,
			select  : 'id,ten,parent_id'
		};
		return this.query( conditions , params ).pipe( map( ( res : DtoObject<LinhVucDaoTao[]> ) : IctuDropdownOption<number>[] => {
			let convertedItems : IctuDropdownOption<number>[] = [];
			if ( grouped ) {
				convertedItems = res.data.filter( ( i : LinhVucDaoTao ) : boolean => i.parent_id === 0 ).reduce( ( reducer : IctuDropdownOption<number>[] , item : LinhVucDaoTao ) : IctuDropdownOption<number>[] => {
					reducer.push( {
						value : item.id ,
						label : item.ten ,
						items : linhVucDaoTao2IctuDropdownOption( res.data.filter( ( i : LinhVucDaoTao ) : boolean => i.parent_id === item.id ) )
					} )
					return reducer;
				} , [] );
			}
			else {
				convertedItems = linhVucDaoTao2IctuDropdownOption( res.data );
			}
			return emptyOption ? [ emptyOption , ... convertedItems ] : convertedItems;
		} ) );
	}

	load ( search? : string , _queryParams? : Partial<IctuQueryParams> ) : Observable<DtoObject<LinhVucDaoTao[]>> {
		const queryParams : IctuQueryParams = Object.assign<IctuQueryParams , IctuQueryParams>( {
			limit   : 20 ,
			paged   : 1 ,
			order   : 'ASC' ,
			orderby : 'ten'
		} , _queryParams );

		const conditions : IctuConditionParam[] = [];
		if ( search ) {
			conditions.push( {
				conditionName : 'ten' ,
				value         : `%${ search }%` ,
				condition     : IctuQueryCondition.like
			} )
		}
		return this.query( conditions , queryParams );
	}

	// loadOptions ( _queryParams? : Partial<IctuQueryParams> ) : Observable<IctuDropdownOption<number>[]> {
	// 	const queryParams : IctuQueryParams = Object.assign<IctuQueryParams , IctuQueryParams>( {
	// 		limit : -1 ,
	// 		paged : 1 ,
	//
	// 		order   : 'ASC' ,
	// 		orderby : 'ten' ,
	// 		select  : 'id,ten'
	// 	} , _queryParams );
	// 	return this.query( [] , queryParams ).pipe( map( ( { data } : DtoObject<LinhVucDaoTao[]> ) : IctuDropdownOption<number>[] => data.map( ( csdt : LinhVucDaoTao ) : IctuDropdownOption<number> => ( {
	// 		value : csdt.id ,
	// 		label : csdt.ten
	// 	} ) ) ) )
	// }
}
