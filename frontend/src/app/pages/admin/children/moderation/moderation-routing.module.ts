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
                loadComponent : () : Promise<any> => import('./children/moderation-dashboard/moderation-dashboard.component')
            } ,
            {
                path          : 'media' ,
                loadComponent : () : Promise<any> => import('./children/moderation-media/moderation-media.component')
            } ,
            {
                path          : 'comments' ,
                loadComponent : () : Promise<any> => import('./children/moderation-comments/moderation-comments.component')
            }
        ]
    }
];

@NgModule( {
    imports : [ RouterModule.forChild( routes ) ] ,
    exports : [ RouterModule ]
} )
export class ModerationRoutingModule {}
