import { NgModule } from '@angular/core';
import { RouterModule , Routes } from '@angular/router';
import { adminModuleChildGuard } from "@app/guards";

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
				loadComponent : () : Promise<any> => import('./children/student-dashboard/student-dashboard')
			} ,
			{
				path          : 'classes' ,
				loadComponent : () : Promise<any> => import('./children/student-classes/student-classes')
			} ,
			{
				path          : 'calendar' ,
				loadComponent : () : Promise<any> => import('./children/student-calendar/student-calendar')
			} ,
			{
				path          : 'assignments' ,
				loadComponent : () : Promise<any> => import('./children/student-assignments/student-assignments')
			} ,
			{
				path          : 'messages' ,
				loadComponent : () : Promise<any> => import('./children/student-messages/student-messages')
			}
		]
	}
];

@NgModule( {
	imports : [ RouterModule.forChild( routes ) ] ,
	exports : [ RouterModule ]
} )
export class StudentRoutingModule {}
