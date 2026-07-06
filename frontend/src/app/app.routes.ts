import { Routes } from '@angular/router';
import { PreviewComponent , previewRoutes } from '@pages/preview';
import { adminGuard } from '@guards/admin.guard';

export const routes : Routes = [
	{
		path         : 'admin' ,
		canActivate  : [ adminGuard ] ,
		loadChildren : () : Promise<any> => import('@pages/admin/admin.module').then( m => m.AdminModule )
	} ,
	{
		path          : 'class-planning' ,
		canActivate   : [ adminGuard ] ,
		loadComponent : () : Promise<any> => import('@pages/class-planning/class-planning.component')
	} ,
	{
		path          : 'edit-course' ,
		canActivate   : [ adminGuard ] ,
		loadComponent : () : Promise<any> => import('@pages/edit-course/edit-course.component')
	} ,
	{
		path          : 'scoring' ,
		canActivate   : [ adminGuard ] ,
		loadComponent : () : Promise<any> => import('@app/pages/admin/children/teacher/children/teacher-scoring/children/homework-score/homework-score.component')
	} ,
	{
		path          : 'preview-course' ,
		canActivate   : [ adminGuard ] ,
		loadComponent : () : Promise<any> => import('@components/preview-course/preview-course.component')
	} ,
	{
		path          : 'course-overview' ,
		canActivate   : [ adminGuard ] ,
		loadComponent : () : Promise<any> => import('@components/course-overview/course-overview.component')
	} ,
	// {
	// 	path          : 'scan' ,
	// 	canActivate   : [ adminGuard ] ,
	// 	loadComponent : () : Promise<any> => import('@pages/scan-cccd/scan-cccd.component')
	// } ,
	{
		path          : 'class-progress' ,
		canActivate   : [ adminGuard ] ,
		loadComponent : () : Promise<any> => import('@pages/class-progress/class-progress.component')
	} ,
	{
		path          : 'class-session' ,
		canActivate   : [ adminGuard ] ,
		loadComponent : () : Promise<any> => import('@pages/class-session/class-session.component')
	} ,
	{
		path         : 'auth' ,
		loadChildren : () : Promise<any> => import('@pages/auth/auth.module').then( m => m.AuthModule )
	} ,
	{
		path          : 'throw-error' ,
		loadComponent : () : Promise<any> => import('@pages/throw-error/throw-error.component').then( c => c.ThrowErrorComponent )
	} ,
	{
		path          : 'unauthorized' ,
		loadComponent : () : Promise<any> => import('@pages/unauthorized/unauthorized.component').then( c => c.UnauthorizedComponent )
	} ,
	{
		path          : 'bank-editor' ,
		loadComponent : () : Promise<any> => import('@pages/bank-editor/bank-editor.component')
	} ,
	{
		path      : 'preview' ,
		component : PreviewComponent ,
		children  : previewRoutes
	} ,
	{
		path       : '**' ,
		redirectTo : '/auth/login' ,
		pathMatch  : 'full'
	}
];
