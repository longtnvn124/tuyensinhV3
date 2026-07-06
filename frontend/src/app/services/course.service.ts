import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { map , Observable } from 'rxjs';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { Course } from '@models/course';

export interface CourseSearchInfo {
	search : string;
}

@Injectable( {
	providedIn : 'any'
} )
export class CoursesService extends IctuBaseServiceClass<Course> {
	constructor () {
		super( 'courses' );
	}

	load (
		info : CourseSearchInfo ,
		donvi_id : number ,
		_queryParams? : Partial<IctuQueryParams>
	) : Observable<DtoObject<Course[]>> {
		const queryParams : IctuQueryParams     = Object.assign<
			IctuQueryParams ,
			IctuQueryParams
		>(
			{
				limit      : 20 ,
				paged      : 1 ,
				include    : donvi_id ,
				include_by : 'donvi_id' ,
				order      : 'DESC' ,
				orderby    : 'created_at'
			} ,
			_queryParams
		);
		const conditions : IctuConditionParam[] = [];
		if ( info.search ) {
			conditions.push(
				{
					conditionName : 'title' ,
					value         : `%${ info.search }%` ,
					condition     : IctuQueryCondition.like
				} ,
				{
					conditionName : 'desc' ,
					value         : `%${ info.search }%` ,
					condition     : IctuQueryCondition.like ,
					orWhere       : 'or'
				}
			);
		}

		return this.query( conditions , queryParams );
	}

	loadOptions ( donViID : number ) : Observable<IctuDropdownOption<number>[]> {
		const conditions : IctuConditionParam[] = [ {
			conditionName : 'donvi_id' ,
			value         : donViID.toString( 10 ) ,
			condition     : IctuQueryCondition.equal
		} ];
		const queryParams : IctuQueryParams     = {
			limit   : -1 ,
			paged   : 1 ,
			order   : 'ASC' ,
			orderby : 'title'
		};
		return this.query( conditions , queryParams ).pipe(
			map( ( { data } : DtoObject<Course[]> ) : IctuDropdownOption<number>[] => {
				return data.map( ( { id , title } : Course ) : IctuDropdownOption<number> => ( { value : id , label : title } ) );
			} )
		);
	}

	loadOptionsFull (
		donvi_id : number ,
		_queryParams? : Partial<IctuQueryParams>
	) : Observable<Course[]> {
		const queryParams : IctuQueryParams = Object.assign<
			IctuQueryParams ,
			IctuQueryParams
		>(
			{
				limit      : -1 ,
				paged      : 1 ,
				include    : donvi_id ,
				include_by : 'donvi_id' ,
				order      : 'ASC'
			} ,
			_queryParams
		);
		return this.query( [] , queryParams ).pipe(
			map( ( { data } : DtoObject<Course[]> ) : Course[] => {
				return data;
			} )
		);
	}
}
