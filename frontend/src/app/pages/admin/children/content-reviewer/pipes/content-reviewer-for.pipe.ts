import { Pipe , PipeTransform } from '@angular/core';
import { ContentReviewerData , ContentReviewerMedia } from '@pages/admin/children/content-reviewer/models/content-reviewer-data';

@Pipe( {
	name : 'contentReviewerFor'
} )
export class ContentReviewerForPipe implements PipeTransform {

	transform( post : ContentReviewerData ) : 'candidate' | 'members' {
		switch ( true ) {
			case post.dataType === 'ClassActivity':
			case post.dataType === 'ClassMedia' && ( post as ContentReviewerMedia ).type === 'SPEAKING_TEST':
				return 'candidate';
			case post.dataType === 'ClassMedia' && ( post as ContentReviewerMedia ).type === 'ACTIVITY':
				return post.objects.length === 1 ? 'candidate' : 'members';
			default:
				return 'members';
		}
	}
}
