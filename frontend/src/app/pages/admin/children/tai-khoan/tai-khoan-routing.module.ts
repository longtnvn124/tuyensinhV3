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
				redirectTo : 'ho-so' ,
				pathMatch  : 'prefix'
			} ,
			{
				path          : 'ho-so' ,
				loadComponent : () : Promise<any> => import('./children/ho-so/ho-so.component')
			} ,
			{
				path          : 'cap-nhat-mat-khau' ,
				loadComponent : () : Promise<any> => import('./children/cap-nhat-mat-khau/cap-nhat-mat-khau.component')
			} ,
			{
				path          : 'cap-nhat-thong-tin' ,
				loadComponent : () : Promise<any> => import('./children/cap-nhat-thong-tin/cap-nhat-thong-tin.component')
			} ,
			{
				path          : 'lich-su-truy-cap' ,
				loadComponent : () : Promise<any> => import('./children/lich-su-truy-cap/lich-su-truy-cap.component')
			}
		]
	}
];

@NgModule( {
	imports : [ RouterModule.forChild( routes ) ] ,
	exports : [ RouterModule ]
} )
export class TaiKhoanRoutingModule {
}
