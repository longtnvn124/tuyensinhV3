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
				path         : 'ceo' ,
				canActivate  : [ adminModuleGuard ] ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/ceo/ceo.module').then( ( m ) : any => m.CeoModule )
			} ,
			{
				path         : 'general-management' ,
				canActivate  : [ adminModuleGuard ] ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/general-management/general-management.module').then( ( m ) : any => m.GeneralManagementModule )
			} ,
			{
				path         : 'teacher' ,
				canActivate  : [ adminModuleGuard ] ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/teacher/teacher.module').then( ( m ) : any => m.TeacherModule )
			} ,


			{
				path         : 'training-management' ,
				canActivate  : [ adminModuleGuard ] ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/training-management/training-management.module').then( ( m ) : any => m.TrainingManagementModule )
			} ,
			{
				path         : 'account' ,
				canActivate  : [ adminModuleGuard ] ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/account/account.module').then( ( m ) : any => m.AccountModule )
			} ,
			{
				path         : 'thong-bao' ,
				canActivate  : [ adminModuleGuard ] ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/thong-bao/thong-bao.module').then( ( m ) : any => m.ThongBaoModule )
			} ,
			{
				path         : 'sales' ,
				canActivate  : [ adminModuleGuard ] ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/sales/sales.module').then( ( m ) : any => m.SalesModule )
			} ,
			{
				path         : 'teaching-assistant' ,
				canActivate  : [ adminModuleGuard ] ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/teaching-assistant/teaching-assistant.module').then( ( m ) : any => m.TeachingAssistantModule )
			} ,
			{
				path         : 'moderation' ,
				canActivate  : [ adminModuleGuard ] ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/moderation/moderation.module').then( ( m ) : any => m.ModerationModule )
			} ,
			{
				path         : 'marketing' ,
				canActivate  : [ adminModuleGuard ] ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/marketing/marketing.module').then( ( m ) : any => m.MarketingModule )
			} ,
			{
				path         : 'accountant' ,
				canActivate  : [ adminModuleGuard ] ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/accountant/accountant.module').then( ( m ) : any => m.AccountantModule )
			} ,
			{
				path         : 'content-reviewer' ,
				canActivate  : [ adminModuleGuard ] ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/content-reviewer/content-reviewer.module').then( ( m ) : any => m.ContentReviewerModule )
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
