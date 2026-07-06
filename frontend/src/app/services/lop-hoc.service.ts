import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { Observable } from 'rxjs';
import { ClassRelative } from '@app/models/class';

export interface LopHocSearchInfo {
	search : string;
	namhoc : number;
}

@Injectable( {
	providedIn : 'any'
} )
export class LopHocService extends IctuBaseServiceClass<ClassRelative> {
	constructor () {
		super( 'classes' );
	}

	load (
		info : LopHocSearchInfo ,
		donvi_id : number ,
		parent_id : number ,
		_queryParams? : Partial<IctuQueryParams>
	) : Observable<DtoObject<ClassRelative[]>> {
		const queryParams : IctuQueryParams     = Object.assign<
			IctuQueryParams ,
			IctuQueryParams
		>(
			{
				limit      : 20 ,
				paged      : 1 ,
				include    : donvi_id ,
				include_by : 'donvi_id' ,
				order      : 'ASC' ,
				orderby    : 'name'
			} ,
			_queryParams
		);
		const conditions : IctuConditionParam[] = [];
		conditions.push( {
			conditionName : 'parent_id' ,
			value         : parent_id.toString() ,
			condition     : IctuQueryCondition.equal ,
			orWhere       : 'and'
		} );
		// if (info.namhoc) {
		//     conditions.push({
		//         conditionName: 'namhoc',
		//         value: info.namhoc.toString(),
		//         condition: IctuQueryCondition.equal,
		//         orWhere: 'and',
		//     });
		// }
		if ( info.search ) {
			conditions.push( {
				conditionName : 'name' ,
				value         : `%${ info.search }%` ,
				condition     : IctuQueryCondition.like
			} );
		}
		return this.query( conditions , queryParams );
	}

	loadNamHoc (
		donvi_id : number ,
		parent_id : number ,
		_queryParams? : Partial<IctuQueryParams>
	) : Observable<DtoObject<ClassRelative[]>> {
		const queryParams : IctuQueryParams     = Object.assign<
			IctuQueryParams ,
			IctuQueryParams
		>(
			{
				limit      : 20 ,
				paged      : 1 ,
				include    : donvi_id ,
				include_by : 'donvi_id' ,
				order      : 'ASC' ,
				orderby    : 'name'
			} ,
			_queryParams
		);
		const conditions : IctuConditionParam[] = [];
		if ( parent_id ) {
			conditions.push( {
				conditionName : 'parent_id' ,
				value         : parent_id.toString() ,
				condition     : IctuQueryCondition.equal ,
				orWhere       : 'and'
			} );
		}
		return this.query( conditions , queryParams );
	}

	loadPermissionGV (
		info : LopHocSearchInfo ,
		donvi_id : number ,
		giaovien_id : number ,
		parent_id : number ,
		_queryParams? : Partial<IctuQueryParams>
	) : Observable<DtoObject<ClassRelative[]>> {
		const queryParams : IctuQueryParams = Object.assign<
			IctuQueryParams ,
			IctuQueryParams
		>(
			{
				limit      : 20 ,
				paged      : 1 ,
				include    : donvi_id ,
				include_by : 'donvi_id' ,
				order      : 'ASC' ,
				orderby    : 'created_at' ,
				with       : 'course'
			} ,
			_queryParams
		);

		const searchConditions : IctuConditionParam[] = [];
		searchConditions.push( {
			conditionName : 'parent_id' ,
			value         : parent_id.toString() ,
			condition     : IctuQueryCondition.equal ,
			orWhere       : 'and'
		} );
		if ( info.namhoc ) {
			searchConditions.push( {
				conditionName : 'namhoc' ,
				value         : info.namhoc.toString() ,
				condition     : IctuQueryCondition.equal ,
				orWhere       : 'and'
			} );
		}

		if ( info.search ) {
			searchConditions.push( {
				conditionName : 'name' ,
				value         : `%${ info.search }%` ,
				condition     : IctuQueryCondition.like ,
				orWhere       : 'and'
			} );
		}

		const conditions : IctuConditionParam[] = [];

		conditions.push(
			{
				conditionName : 'teacher_ids' ,
				value         : giaovien_id.toString() ,
				condition     : IctuQueryCondition.equal
			} ,
			// ... searchConditions ,
			// {
			// 	conditionName : 'user_ids_assistants' ,
			// 	value         : `%|${ giaovien_id }|%` ,
			// 	condition     : IctuQueryCondition.like ,
			// 	orWhere       : 'or'
			// } ,
			// ... searchConditions
		);

		return this.query( conditions , queryParams );
	}
}
