import { NgModule } from '@angular/core';
import { RouterModule , Routes } from '@angular/router';
import { adminModuleChildGuard } from '@guards/admin-module-child.guard';

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
				loadComponent : () : Promise<any> => import('./children/marketing-dashboard/marketing-dashboard.component')
			} ,
			{
				path          : 'class-activities' ,
				loadComponent : () : Promise<any> => import('./children/mk-class-activities/mk-class-activities.component')
			}
		]
	}
];

@NgModule( {
	imports : [ RouterModule.forChild( routes ) ] ,
	exports : [ RouterModule ]
} )
export class MarketingRoutingModule {}
