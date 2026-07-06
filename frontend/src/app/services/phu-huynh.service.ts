import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { Observable } from 'rxjs';
import { PhuHuynh } from '@models/phu-huynh';

export interface PhuHuynhSearchInfo {
	search : string;
}

@Injectable( {
	providedIn : 'any'
} )
export class PhuHuynhService extends IctuBaseServiceClass<PhuHuynh> {
	constructor() {
		super( 'phuhuynh' );
	}

	load( info : PhuHuynhSearchInfo , user_id : number , parent_id : number , _queryParams? : Partial<IctuQueryParams> ) : Observable<DtoObject<PhuHuynh[]>> {
		const queryParams : IctuQueryParams     = Object.assign<IctuQueryParams , IctuQueryParams>( { limit : 20 , paged : 1 , order : 'ASC' , orderby : 'created_at' } , _queryParams );
		const conditions : IctuConditionParam[] = [];
		if ( parent_id == 0 ) {
			conditions.push( {
				conditionName : 'id' ,
				value         : user_id.toString() ,
				condition     : IctuQueryCondition.equal ,
				orWhere       : 'and'
			} );
		}
		if ( user_id == 0 ) {
			conditions.push( {
				conditionName : 'parent_id' ,
				value         : parent_id.toString() ,
				condition     : IctuQueryCondition.equal ,
				orWhere       : 'and'
			} );
		}
		if ( info.search ) {
			conditions.push(
				{
					conditionName : 'hoten' ,
					value         : `%${ info.search }%` ,
					condition     : IctuQueryCondition.like ,
					orWhere       : 'or'
				} ,
				{
					conditionName : 'maso' ,
					value         : `%${ info.search }%` ,
					condition     : IctuQueryCondition.like
				}
			);
		}
		return this.query( conditions , queryParams );
	}
}
