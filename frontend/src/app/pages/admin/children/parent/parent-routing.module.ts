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
				loadComponent : () : Promise<any> => import('./children/parent-dashboard/parent-dashboard.component')
			} ,
			{
				path          : 'classes' ,
				loadComponent : () : Promise<any> => import('./children/parent-classes/parent-classes.component')
			} ,
			{
				path          : 'finance' ,
				loadComponent : () : Promise<any> => import('./children/parent-finance/parent-finance.component')
			} ,
			{
				path          : 'schedule' ,
				loadComponent : () : Promise<any> => import('./children/parent-schedule/parent-schedule.component')
			}
		]
	}
];

@NgModule( {
	imports : [ RouterModule.forChild( routes ) ] ,
	exports : [ RouterModule ]
} )
export class ParentRoutingModule {}
