import { NgModule } from '@angular/core';
import { RouterModule , Routes } from '@angular/router';
import { adminModuleGuard } from '@guards/admin-module.guard';
import { AdminLayoutComponent } from '@pages/admin/admin-layout/admin-layout.component';

const routes : Routes = [
	{
		path      : '' ,
		component : AdminLayoutComponent ,
		children  : [
			{
				path       : '' ,
				redirectTo : 'account' ,
				pathMatch  : 'prefix'
			} ,
			{
				path          : '404' ,
				loadComponent : () : Promise<any> => import('@pages/admin/children/admin-not-found-404/admin-not-found-404.component')
			} ,
			{
				path         : 'account' ,
				canActivate  : [ adminModuleGuard ] ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/account/account.module').then( ( m ) : any => m.AccountModule )
			} ,
			{
				path       : '**' ,
				redirectTo : '404' ,
				pathMatch  : 'prefix'
			}
		]
	}
];

@NgModule( {
	imports : [ RouterModule.forChild( routes ) ] ,
	exports : [ RouterModule ]
} )
export class AdminRoutingModule {
}
