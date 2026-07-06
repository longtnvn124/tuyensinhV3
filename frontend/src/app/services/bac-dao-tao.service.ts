import { Injectable } from '@angular/core';
import { HttpParams } from "@angular/common/http";
import {
	Dto ,
	dto2IctuPaginator ,
	DtoObject ,
	IctuConditionParam ,
	IctuPaginator ,
	IctuQueryCondition ,
	IctuQueryParams
} from "@models/dto";
import { BacDaoTao } from "@models/bac-dao-tao";
import { map , Observable } from "rxjs";
import { paramsConditionBuilder } from "@utilities/helper";
import { IctuBaseServiceClass } from "@models/ictu-base-service.class";
import { IctuDropdownOption } from '../models/ictu-dropdown-option';

@Injectable( {
	providedIn : 'any'
} )
export class BacDaoTaoService extends IctuBaseServiceClass<BacDaoTao> {
	
	constructor () {
		super( 'dm-bacdaotao' );
	}
	
	list ( donvi_id : number , search? : string , queryInfo? : Pick<IctuQueryParams , 'limit' | 'paged'> ) : Observable<IctuPaginator<BacDaoTao>> {
		const fromObject : IctuQueryParams = Object.assign<IctuQueryParams , IctuQueryParams>( {
			include    : donvi_id.toString() ,
			include_by : 'donvi_id' ,
			limit      : 20 ,
			paged      : 1
		} , queryInfo );
		
		const conditions : IctuConditionParam[] = search ? [
			{
				conditionName : 'ten' ,
				value         : `%${ search }%` ,
				condition     : IctuQueryCondition.like ,
			}
		] : []
		const params : HttpParams               = paramsConditionBuilder( conditions , new HttpParams( { fromObject } ) );
		return this.http.get<DtoObject<BacDaoTao[]>>( this.api , { params } ).pipe( map( ( res : DtoObject<BacDaoTao[]> ) : IctuPaginator<BacDaoTao> => dto2IctuPaginator( res ) ) );
	}
	loadOptions ( donvi_id : number ,_queryParams? : Partial<IctuQueryParams> ) : Observable<IctuDropdownOption<number>[]> {
				const queryParams : IctuQueryParams = Object.assign<IctuQueryParams , IctuQueryParams>( {
					limit      : -1 ,
					paged      : 1 ,
					include    : donvi_id ,
			        include_by : 'donvi_id' ,
					order      : 'ASC' ,
					orderby    : 'ten' ,
					select     : 'id,ten'
				} , _queryParams );
				return this.query( [] , queryParams ).pipe( map( ( { data } : DtoObject<BacDaoTao[]> ) : IctuDropdownOption<number>[] => data.map( ( csdt : BacDaoTao ) : IctuDropdownOption<number> => ( {
					value : csdt.id ,
					label : csdt.ten
				} ) ) ) )
			}
	
	// create ( info : Partial<BacDaoTao> ) : Observable<number> {
	// 	return this.http.post<DtoObject<number>>( this.api , info ).pipe( map( ( r : Dto ) : number => r.data ) );
	// }
	//
	// update ( id : number , info : Partial<BacDaoTao> ) : Observable<any> {
	// 	return this.http.put<DtoObject<any>>( ''.concat( this.api , id.toString( 10 ) ) , info ).pipe( map( ( r : Dto ) : any => r.data ) );
	// }
	//
	// delete ( id : number ) : Observable<any> {
	// 	return this.http.delete<DtoObject<any>>( ''.concat( this.api , id.toString( 10 ) ) ).pipe( map( ( r : Dto ) : any => r.data ) );
	// }
	//
	// query ( conditions : IctuConditionParam[] , queryParams? : IctuQueryParams ) : Observable<DtoObject<BacDaoTao[]>> {
	// 	const params : HttpParams = paramsConditionBuilder( conditions , new HttpParams( { fromObject : queryParams || {} } ) );
	// 	return this.http.get<DtoObject<BacDaoTao[]>>( this.api , { params } );
	// }
}
