import { NgModule } from '@angular/core';
import { RouterModule , Routes } from '@angular/router';
import { adminModuleChildGuard } from "@guards/admin-module-child.guard";

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
				loadComponent : () : Promise<any> => import('./children/sales-dashboard/sales-dashboard.component')
			} ,
			{
				path          : 'members' ,
				loadComponent : () : Promise<any> => import('./children/sales-members/sales-members.component')
			} ,
			{
				path          : 'sources' ,
				loadComponent : () : Promise<any> => import('./children/sales-sources/sales-sources.component')
			} ,
			{
				path          : 'assigned-data' ,
				loadComponent : () : Promise<any> => import('./children/sales-assigned-data/sales-assigned-data.component')
			} ,
			{
				path          : 'progress' ,
				loadComponent : () : Promise<any> => import('./children/sales-progress/sales-progress.component')
			},
			{
				path          : 'attendance' ,
				loadComponent : () : Promise<any> => import('./children/sales-attendance-absent/sales-attendance-absent.component')
			},
			{
				path          : 'learning-statistic' ,
				loadComponent : () : Promise<any> => import('./children/sales-learning-statistic/sales-learning-statistic.component')
			},
		]
	}
];

@NgModule( {
	imports : [ RouterModule.forChild( routes ) ] ,
	exports : [ RouterModule ]
} )
export class SalesRoutingModule {}
