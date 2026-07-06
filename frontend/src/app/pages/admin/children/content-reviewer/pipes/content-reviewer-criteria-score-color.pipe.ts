import { Pipe , PipeTransform } from '@angular/core';

@Pipe( {
	name : 'contentReviewerCriteriaScoreColor'
} )
export class ContentReviewerCriteriaScoreColorPipe implements PipeTransform {

	transform( score : number ) : string {
		if ( score >= 8 ) return '#10b981';
		if ( score >= 6 ) return '#f59e0b';
		return '#f43f5e';
	}

}
