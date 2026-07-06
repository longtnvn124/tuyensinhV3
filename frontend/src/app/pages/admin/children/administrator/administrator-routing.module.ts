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
				loadComponent : () : Promise<any> => import('./children/qt-dashboard/qt-dashboard.component')
			} ,
			{
				path          : 'co-so-dao-tao' ,
				loadComponent : () : Promise<any> => import('./children/qt-co-so-dao-tao/qt-co-so-dao-tao.component')
			} ,
			{
				path          : 'phong-hoc' ,
				loadComponent : () : Promise<any> => import('./children/qt-phong-hoc/qt-phong-hoc.component')
			} ,
			{
				path          : 'bac-dao-tao' ,
				loadComponent : () : Promise<any> => import('./children/qt-bac-dao-tao/qt-bac-dao-tao.component')
			} ,
			{
				path          : 'linh-vuc-dao-tao' ,
				loadComponent : () : Promise<any> => import('./children/qt-linh-vuc-dao-tao/qt-linh-vuc-dao-tao.component')
			} ,
			{
				path          : 'giao-vien' ,
				loadComponent : () : Promise<any> => import('./children/qt-giao-vien/qt-giao-vien.component')
			} ,
			{
				path          : 'lop-hoc' ,
				loadComponent : () : Promise<any> => import('./children/qt-lop-hoc/qt-lop-hoc.component')
			} ,
			{
				path          : 'hoc-sinh' ,
				loadComponent : () : Promise<any> => import('./children/qt-hoc-sinh/qt-hoc-sinh.component')
			} ,
			{
				path          : 'tuyen-dung' ,
				loadComponent : () : Promise<any> => import('./children/qt-tuyen-dung/qt-tuyen-dung.component')
			} ,
			{
				path          : 'hop-dong-lao-dong' ,
				loadComponent : () : Promise<any> => import('./children/qt-hop-dong-lao-dong/qt-hop-dong-lao-dong.component')
			} ,
			{
				path          : 'doi-tac-tuyen-sinh' ,
				loadComponent : () : Promise<any> => import('./children/qt-doi-tac-tuyen-sinh/qt-doi-tac-tuyen-sinh.component')
			} ,
			{
				path          : 'khuyen-mai-hoc-bong' ,
				loadComponent : () : Promise<any> => import('./children/qt-khuyen-mai-hoc-bong/qt-khuyen-mai-hoc-bong.component')
			} ,
			{
				path       : '**' ,
				redirectTo : 'dashboard' ,
				pathMatch  : 'prefix'
			}
		]
	}
];

@NgModule( {
	imports : [ RouterModule.forChild( routes ) ] ,
	exports : [ RouterModule ]
} )
export class AdministratorRoutingModule {
}
