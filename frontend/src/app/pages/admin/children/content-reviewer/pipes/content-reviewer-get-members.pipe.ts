import { Pipe , PipeTransform } from '@angular/core';
import { ContentReviewerData } from '@pages/admin/children/content-reviewer/models/content-reviewer-data';
import { Members } from '@pages/admin/children/content-reviewer/models/content-reviewer-component';
import { HocSinh } from '@models/hoc-sinh';
import { isArray } from 'lodash-es';

@Pipe( {
	name : 'contentReviewerGetMembers'
} )
export class ContentReviewerGetMembersPipe implements PipeTransform {

	transform( post : ContentReviewerData ) : Members[] {
		let members : Members[] = [];
		if ( isArray( post.objects ) && post.objects.length > 1 ) {
			if ( post.objects.length > 5 ) {
				/*members = [ 0 , 1 , 2 , 3 , 4 ].map( ( _ : number , index : number ) : Members => ( { info : post.objects[ index ] } ) );*/
				members.push(
					{ info : post.objects[ 0 ] } ,
					{ info : post.objects[ 1 ] } ,
					{ info : post.objects[ 2 ] } ,
					{ info : post.objects[ 3 ] } ,
					{ info : post.objects[ 4 ] } ,
					{ info : null , label : `${ post.objects.length - 5 }+` }
				);
			} else {
				members = post.objects.map( ( s : HocSinh ) : Members => ( { info : s } ) );
			}
		}
		return members;
	}
}
