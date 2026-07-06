import { Pipe , PipeTransform } from '@angular/core';
import { ContentReviewerData } from '@pages/admin/children/content-reviewer/models/content-reviewer-data';
import { isArray } from 'lodash-es';

@Pipe( {
	name : 'contentReviewerHasStudents'
} )
export class ContentReviewerHasStudentsPipe implements PipeTransform {

	transform( post : ContentReviewerData ) : boolean {
		return isArray( post.objects ) && post.objects.length > 0;
	}

}
