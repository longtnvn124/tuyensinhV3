import { NgModule } from '@angular/core';
import { RouterModule , Routes } from '@angular/router';
import { adminModuleChildGuard } from '@app/guards';

const routes : Routes = [
	{
		path             : '' ,
		canActivateChild : [ adminModuleChildGuard ] ,
		children         : [
			{
				path       : '' ,
				redirectTo : 'dashboard' ,
				pathMatch  : 'prefix'
			} ,
			{
				path          : 'dashboard' ,
				loadComponent : () : Promise<any> => import('./children/cr-dashboard/cr-dashboard.component')
			} ,
			{
				path          : 'approved' ,
				loadComponent : () : Promise<any> => import('./children/content-reviewer-approved-list/content-reviewer-approved-list.component')
			} ,
			{
				path          : 'rejected' ,
				loadComponent : () : Promise<any> => import('./children/content-reviewer-rejected-list/content-reviewer-rejected-list.component')
			} ,
			{
				path          : 'pending-review' ,
				loadComponent : () : Promise<any> => import('./children/content-reviewer-pending-review-list/content-reviewer-pending-review-list.component')
			}
		]
	}
];

@NgModule( {
	imports : [ RouterModule.forChild( routes ) ] ,
	exports : [ RouterModule ]
} )
export class ContentReviewerRoutingModule {}
