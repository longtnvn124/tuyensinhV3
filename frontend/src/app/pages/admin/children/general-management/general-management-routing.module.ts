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
				loadComponent : () : Promise<any> => import('./children/gm-dashboard/gm-dashboard.component')
			} ,
			{
				path          : 'employees' ,
				loadComponent : () : Promise<any> => import('./children/gm-employees/gm-employees.component')
			} ,
			{
				path          : 'recruitment' ,
				loadComponent : () : Promise<any> => import('./children/gm-recruitment/gm-recruitment.component')
			} ,
			{
				path          : 'contracts' ,
				loadComponent : () : Promise<any> => import('./children/gm-contracts/gm-contracts.component')
			}
		]
	}
];

@NgModule( {
	imports : [ RouterModule.forChild( routes ) ] ,
	exports : [ RouterModule ]
} )
export class GeneralManagementRoutingModule {}
