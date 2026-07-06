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
                loadComponent : () : Promise<any> => import('./children/tm-dashboard/tm-dashboard.component')
            } ,
            {
                path          : 'courses' ,
                loadComponent : () : Promise<any> => import('./children/tm-courses/tm-courses.component')
            } ,
            {
                path          : 'teachers' ,
                loadComponent : () : Promise<any> => import('./children/tm-teachers/tm-teachers.component')
            } ,
            {
                path          : 'classes' ,
                loadComponent : () : Promise<any> => import('./children/tm-classes/tm-classes.component')
            } ,
            {
                path          : 'students' ,
                loadComponent : () : Promise<any> => import('./children/tm-students/tm-students.component')
            } ,
            {
                path          : 'calendar' ,
                loadComponent : () : Promise<any> => import('./children/tm-calendar3/tm-calendar3.component')
            } ,
            {
                path          : 'interns' ,
                loadComponent : () : Promise<any> => import('./children/tm-interns/tm-interns.component')
            } ,
            {
                path          : 'teaching-assistants' ,
                loadComponent : () : Promise<any> => import('./children/tm-teaching-assistants/tm-teaching-assistants.component')
            } ,
            {
                path          : 'banks' ,
                loadComponent : () : Promise<any> => import('./children/tm-banks/tm-banks')
            } ,
            {
                path          : 'absence-makeup-management' ,
                loadComponent : () : Promise<any> => import('./children/tm-absence-makeup-management-2/tm-absence-makeup-management-2.component')
            } ,
            {
                path          : 'reward-dashboard' ,
                loadComponent : () : Promise<any> => import('@components/reward/reward-reports/reward-reports.component')
            } ,
            {
                path          : 'reward-items' ,
                loadComponent : () : Promise<any> => import('@components/reward/reward-items/reward-items.component')
            } ,
            {
                path          : 'reward-points' ,
                loadComponent : () : Promise<any> => import('@components/reward/reward-points/reward-points.component')
            } ,
            {
                path          : 'redemption-requests' ,
                loadComponent : () : Promise<any> => import('@components/reward/redemption-requests/redemption-requests.component')
            } ,
            {
                path          : 'redemption-history' ,
                loadComponent : () : Promise<any> => import('@components/reward/redemption-history/redemption-history.component')
            },
            {
                path          : 'absence-combine-management' ,
                loadComponent : () : Promise<any> => import('./children/tm-absence-combine-management/tm-absence-combine-management.component')
            } ,
        ]
    }
];

@NgModule( {
    imports : [ RouterModule.forChild( routes ) ] ,
    exports : [ RouterModule ]
} )
export class TrainingManagementRoutingModule {}
