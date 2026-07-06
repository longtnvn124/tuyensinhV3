import { Injectable } from '@angular/core';
import { ClassLecture } from "@models/class-lecture";
import { IctuBaseServiceClass } from "@models/ictu-base-service.class";
import { map , Observable } from "rxjs";
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from "@models/dto";

interface QueryClassLessonLectureSingleParams {
	donvi_id : number,
	class_id : number,
	course_lesson_id : number,
	user_id_teacher? : number,
}

@Injectable( {
	providedIn : 'any'
} )
export class ClassLectureService extends IctuBaseServiceClass<ClassLecture> {

	constructor () {
		super( 'class-lecture' );
	}

	getClassLessonLecture ( { donvi_id , course_lesson_id , class_id , user_id_teacher } : QueryClassLessonLectureSingleParams , _queryParams? : IctuQueryParams ) : Observable<ClassLecture> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'class_id' , condition : IctuQueryCondition.equal , value : class_id.toString( 10 ) } ,
			{ conditionName : 'course_lesson_id' , condition : IctuQueryCondition.equal , value : course_lesson_id.toString( 10 ) , orWhere : "and" } ,
			{ conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : donvi_id.toString( 10 ) , orWhere : "and" }
		];
		if ( user_id_teacher ) {
			conditions.push( { conditionName : 'created_by' , condition : IctuQueryCondition.equal , value : user_id_teacher.toString( 10 ) , orWhere : "and" } );
		}
		const queryParams : IctuQueryParams = Object.assign<IctuQueryParams , IctuQueryParams>( { paged : 1 , limit : 1 , order : 'ASC' , orderby : 'id' } , _queryParams );
		return this.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassLecture[]> ) : ClassLecture => response.data.length ? response.data[ 0 ] : null )
		)
	}
}
