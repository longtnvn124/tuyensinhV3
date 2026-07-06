import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { ClassSession , ClassSessionFitter } from '@models/class-session';
import { map , Observable } from 'rxjs';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';

@Injectable( {
	providedIn : 'any'
} )
export class ClassSessionService extends IctuBaseServiceClass<ClassSession> {

	constructor() {
		super( 'class-session' );
	}

	loadSession( filter : ClassSessionFitter , _queryParams? : IctuQueryParams ) : Observable<ClassSession[]> {
		const conditions : IctuConditionParam[] = [
			{
				conditionName : 'donvi_id' ,
				condition     : IctuQueryCondition.equal ,
				value         : filter.donvi_id.toString()
			} ,
			{
				conditionName : 'csdt_id' ,
				condition     : IctuQueryCondition.equal ,
				value         : filter.csdt_id.toString() ,
				orWhere       : 'and'
			} ,
			{
				conditionName : 'time_start' ,
				condition     : IctuQueryCondition.greaterThanToEqualsTo ,
				value         : filter.timeStart ,
				orWhere       : 'and'
			} ,
			{
				conditionName : 'time_end' ,
				condition     : IctuQueryCondition.lessThanOrEqualsTo ,
				value         : filter.timeEnd ,
				orWhere       : 'and'
			}
		];
		const queryParams : IctuQueryParams     = Object.assign<IctuQueryParams , IctuQueryParams>( {
			order   : 'ASC' ,
			orderby : 'time_start'
		} , _queryParams );
		return this.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassSession[]> ) : ClassSession[] => response.data )
		);
	}

}
