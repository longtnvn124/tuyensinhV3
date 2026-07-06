import { Component } from '@angular/core';
import { ContentReviewerListComponent } from '@pages/admin/children/content-reviewer/children/content-reviewer-list/content-reviewer-list.component';

@Component( {
	selector    : 'app-content-reviewer-approved-list' ,
	imports     : [ ContentReviewerListComponent ] ,
	templateUrl : './content-reviewer-approved-list.component.html' ,
	styleUrl    : './content-reviewer-approved-list.component.css'
} )
export default class ContentReviewerApprovedListComponent {

}
