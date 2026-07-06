import { Component } from '@angular/core';
import { ContentReviewerListComponent } from '@pages/admin/children/content-reviewer/children/content-reviewer-list/content-reviewer-list.component';

@Component( {
	selector    : 'app-content-reviewer-rejected-list' ,
	imports     : [ ContentReviewerListComponent ] ,
	templateUrl : './content-reviewer-rejected-list.component.html' ,
	styleUrl    : './content-reviewer-rejected-list.component.css'
} )
export default class ContentReviewerRejectedListComponent {

}
