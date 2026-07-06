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
				loadComponent : () : Promise<any> => import('./children/accountant-dashboard/accountant-dashboard.component')
			},
			{
				path          : 'student-fee' ,
				loadComponent : () : Promise<any> => import('./children/accountant-student-fee/accountant-student-fee.component')
			},
			{
				path          : 'income-pricing' ,
				loadComponent : () : Promise<any> => import('./children/accountant-pricing/accountant-pricing.component')
			},
			{
				path          : 'statistical-stat' ,
				loadComponent : () : Promise<any> => import('./children/accountant-income-stat/accountant-income-stat.component')
			},
			{
				path          : 'statistical-revenue' ,
				loadComponent : () : Promise<any> => import('./children/accountant-revenue/accountant-revenue.component')
			}
		]
	}
];

@NgModule( {
	imports : [ RouterModule.forChild( routes ) ] ,
	exports : [ RouterModule ]
} )
export class AccountantRoutingModule {}
