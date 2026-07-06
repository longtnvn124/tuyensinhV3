import { Component } from '@angular/core';
import { ContentReviewerListComponent } from '@pages/admin/children/content-reviewer/children/content-reviewer-list/content-reviewer-list.component';

@Component( {
	selector    : 'app-content-reviewer-pending-review-list' ,
	imports     : [ ContentReviewerListComponent ] ,
	templateUrl : './content-reviewer-pending-review-list.component.html' ,
	styleUrl    : './content-reviewer-pending-review-list.component.css'
} )
export default class ContentReviewerPendingReviewListComponent {

}
