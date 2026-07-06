import { Pipe , PipeTransform } from '@angular/core';
import { ContentReviewerData , ContentReviewerDataState } from '@pages/admin/children/content-reviewer/models/content-reviewer-data';

const ContentReviewerStateControl : Record<ContentReviewerDataState , ( post : ContentReviewerData ) => boolean> = {
	approved : ( post : ContentReviewerData ) : boolean => post.status === 'APPROVED' ,
	rejected : ( post : ContentReviewerData ) : boolean => post.status === 'REJECTED' ,
	featured : ( post : ContentReviewerData ) : boolean => post.status === 'APPROVED' && !!post.featured
};

@Pipe( {
	name       : 'contentReviewerState' ,
	standalone : true
} )
export class ContentReviewerStatePipe implements PipeTransform {

	transform( post : ContentReviewerData , state : ContentReviewerDataState ) : boolean {
		return ContentReviewerStateControl[ state ]( post );
	}

}
