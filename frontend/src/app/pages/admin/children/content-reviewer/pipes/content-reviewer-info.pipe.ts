import { Pipe , PipeTransform } from '@angular/core';
import { ContentReviewerData , ContentReviewerMedia } from '@pages/admin/children/content-reviewer/models/content-reviewer-data';

type ContentReviewerInfoType = 'className' | 'lessonName' | 'activityIcon' | 'teachingDay' | 'activityName' | 'cssClass';

@Pipe( {
	name       : 'contentReviewerInfo' ,
	standalone : true
} )
export class ContentReviewerInfoPipe implements PipeTransform {

	transform( post : ContentReviewerData , key : ContentReviewerInfoType , prefix? : string ) : string {
		if ( !post ) {
			return '';
		}
		switch ( key ) {
			case 'className':
				return post.activity_class?.name || 'No class';
			case 'lessonName':
				return post.class_session ? [ post.class_session?.topic?.trim() , post.class_session?.title?.trim() ].filter( Boolean ).join( ' - ' ) : 'Hoạt động ngoại khóa';
			case 'activityIcon':
				return post.dataType === 'ClassActivity' ? 'fa-comment-alt-lines' : post.type === 'SPEAKING_TEST' ? 'fa-microphone' : 'fa-photo-video';
			case 'teachingDay':
				return post.class_session?.time_start || post.created_at;
			case 'activityName':
				if ( post.dataType === 'ClassActivity' ) {
					return 'Nhận xét';
				}
				const _mediaPost : ContentReviewerMedia = post as ContentReviewerMedia;
				return _mediaPost.type === 'SPEAKING_TEST' ? 'Speaking Test' : 'Hoạt động';
			case 'cssClass':
				const _className : string = post.dataType === 'ClassActivity' ? 'daily' : post.type === 'SPEAKING_TEST' ? 'speaking' : 'project';
				return prefix ? [ prefix , _className ].join( '-' ) : _className;
			default:
				return '';
		}
	}

}
