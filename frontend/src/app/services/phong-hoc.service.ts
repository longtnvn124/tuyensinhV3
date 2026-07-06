import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from "@models/ictu-base-service.class";
import { PhongHoc } from "@models/phong-hoc";
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from "@models/dto";
import { Observable } from "rxjs";

export interface PhongHocSearchInfo {
	search : string,
	csdt_id : number,
}

@Injectable( {
	providedIn : 'any'
} )
export class PhongHocService extends IctuBaseServiceClass<PhongHoc> {

	constructor () {
		super( 'dm-phonghoc' );
	}

	load ( info : PhongHocSearchInfo , donvi_id : number , _queryParams? : Partial<IctuQueryParams> ) : Observable<DtoObject<PhongHoc[]>> {
		const queryParams : IctuQueryParams = Object.assign<IctuQueryParams , IctuQueryParams>( {
			limit      : 20 ,
			paged      : 1 ,
			include    : donvi_id ,
			include_by : 'donvi_id' ,
			order      : 'ASC' ,
			orderby    : 'name'
		} , _queryParams );

		if ( info.csdt_id ) {
			queryParams.include    = info.csdt_id;
			queryParams.include_by = 'csdt_id';
		}
		const conditions : IctuConditionParam[] = [];
		if ( info.search ) {
			conditions.push(
				{
					conditionName : 'name' ,
					value         : `%${ info.search }%` ,
					condition     : IctuQueryCondition.like
				} ,
				{
					conditionName : 'description' ,
					value         : `%${ info.search }%` ,
					condition     : IctuQueryCondition.like ,
					orWhere       : "or"
				} ,
				{
					conditionName : 'code' ,
					value         : `%${ info.search }%` ,
					condition     : IctuQueryCondition.like ,
					orWhere       : "or"
				}
			)
		}

		return this.query( conditions , queryParams );
	}

}
