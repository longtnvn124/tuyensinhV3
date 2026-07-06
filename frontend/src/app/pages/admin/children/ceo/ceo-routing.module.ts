import { NgModule } from '@angular/core';
import { RouterModule , Routes } from '@angular/router';
import { adminModuleChildGuard } from '@guards/admin-module-child.guard';

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
                loadComponent : () : Promise<any> => import('./children/ceo-dashboard/ceo-dashboard.component')
            } ,
            {
                path          : 'branches' ,
                loadComponent : () : Promise<any> => import('./children/ceo-branches/ceo-branches.component')
            } ,
            {
                path          : 'class-rooms' ,
                loadComponent : () : Promise<any> => import('./children/ceo-class-rooms/ceo-class-rooms.component')
            } ,
            {
                path          : 'training-levels' ,
                loadComponent : () : Promise<any> => import('./children/ceo-training-levels/ceo-training-levels.component')
            } ,
            {
                path          : 'training-fields' ,
                loadComponent : () : Promise<any> => import('./children/ceo-training-fields/ceo-training-fields.component')
            } ,
            {
                path          : 'teachers' ,
                loadComponent : () : Promise<any> => import('./children/ceo-teachers/ceo-teachers.component')
            } ,
            {
                path          : 'classes-schedules' ,
                loadComponent : () : Promise<any> => import('./children/ceo-classes-schedules/ceo-classes-schedules.component')
            } ,
            {
                path          : 'session-detail' ,
                loadComponent : () : Promise<any> => import('@components/session-detail/session-detail.component')
            } ,
            {
                path          : 'classes' ,
                loadComponent : () : Promise<any> => import('./children/ceo-classes/ceo-classes.component')
            } ,
            {
                path          : 'students' ,
                loadComponent : () : Promise<any> => import('./children/ceo-students/ceo-students.component')
            } ,
            {
                path          : 'recruitment' ,
                loadComponent : () : Promise<any> => import('./children/ceo-recruitment/ceo-recruitment.component')
                // @pages/scan-cccd/scan-cccd.component
            } ,
            {
                path          : 'contracts' ,
                loadComponent : () : Promise<any> => import('./children/ceo-contracts/ceo-contracts.component')
            } ,
            {
                path          : 'recruitment-partners' ,
                loadComponent : () : Promise<any> => import('./children/ceo-recruitment-partners/ceo-recruitment-partners.component')
            } ,
            {
                path          : 'deals-and-scholarships' ,
                loadComponent : () : Promise<any> => import('./children/ceo-deals-and-scholarships/ceo-deals-and-scholarships.component')
            } ,
            {
                path          : 'teaching-statistic' ,
                loadComponent : () : Promise<any> => import('./children/ceo-teaching-statistic/ceo-teaching-statistic.component')
            },
            {
                path          : 'learning-statistic' ,
                loadComponent : () : Promise<any> => import('./children/ceo-learning-statistic/ceo-learning-statistic.component')
            }
        ]
    }
];

@NgModule( {
    imports : [ RouterModule.forChild( routes ) ] ,
    exports : [ RouterModule ]
} )
export class CeoRoutingModule {
}
