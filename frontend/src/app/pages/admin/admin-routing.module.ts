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
				redirectTo : 'dashboard' ,
				pathMatch  : 'prefix'
			} ,

			{
				path         : 'account' ,
				canActivate  : [ adminModuleGuard ] ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/account/account.module').then( ( m ) : any => m.AccountModule )
			} ,
            {
                path          : 'dashboard' ,
                loadComponent : () : Promise<any> => import('@pages/admin/children/dashboard/dashboard.component').then( ( m ) : any => m.DashboardComponent )
            },
            {
                path          : 'nganh-chuongtrinh' ,
                loadComponent : () : Promise<any> => import('@app/pages/admin/children/nganh-hoc/nganh-hoc.component').then( ( m ) : any => m.NganhhocComponent ),
            },
			{
                path          : 'hoso' ,
                loadChildren : () : Promise<any> => import('@app/pages/admin/children/hoso/hoso.module').then( ( m ) : any => m.HosoModule ),
            },
            {
                path          : 'dot-xettuyen' ,
                loadComponent : () : Promise<any> => import('@app/pages/admin/children/dot-xettuyen/dot-xettuyen.component').then( ( m ) : any => m.DotXettuyenComponent ),
            },

            {
                path          : 'hoidong-xettuyen' ,
                loadComponent : () : Promise<any> => import('@app/pages/admin/children/hoidong-xettuyen/hoidong-xettuyen.component').then( ( m ) : any => m.HoidongXettuyenComponent ),
            },

	
            {
                path          : 'hoso-them' ,
                loadComponent : () : Promise<any> => import('@app/pages/admin/children/hoso/hoso-them/hoso-them.component').then( ( m ) : any => m.HosoThemComponent ),
            },
					// {
            //     path          : 'hoso-tuyensinh' ,
            //     loadComponent : () : Promise<any> => import('@app/pages/admin/children/hoso-tuyensinh/hoso-tuyensinh.component').then( ( m ) : any => m.HosoTuyensinhComponent ),
            // },

            {
				path          : '404' ,
				loadComponent : () : Promise<any> => import('@pages/admin/children/admin-not-found-404/admin-not-found-404.component')
			} ,

			{
				path         : 'he-thong' ,
				loadChildren : () : Promise<any> => import('@pages/admin/children/he-thong/he-thong.module').then( ( m ) : any => m.HeThongModule )
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
