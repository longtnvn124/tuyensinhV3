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
                redirectTo : 'contents' ,
                pathMatch  : 'prefix'
            } ,
            {
                path          : 'contents' ,
                loadComponent : () : Promise<any> => import('./children/review-and-approval-contents/review-and-approval-contents.component')
            }
        ]
    }
];

@NgModule( {
    imports : [ RouterModule.forChild( routes ) ] ,
    exports : [ RouterModule ]
} )
export class ReviewAndApprovalRoutingModule {}
