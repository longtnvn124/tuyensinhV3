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
                loadComponent : () : Promise<any> => import('./children/teacher-dashboard/teacher-dashboard.component')
            } ,
            {
                path          : 'classes' ,
                loadComponent : () : Promise<any> => import('./children/teacher-classes/teacher-classes.component')
            } ,
            {
                path          : 'schedule' ,
                loadComponent : () : Promise<any> => import('./children/teacher-schedule/teacher-schedule.component')
            } ,
            {
                path          : 'assignment' ,
                loadComponent : () : Promise<any> => import('./children/teacher-scoring/teacher-scoring.component')
            } ,
            {
                path          : 'income' ,
                loadComponent : () : Promise<any> => import('./children/teacher-income/teacher-income.component')
            } ,
            {
                path          : 'library' ,
                loadComponent : () : Promise<any> => import('./children/teacher-library/teacher-library.component')
            } ,
            {
                path          : 'schedule-remedial-session' ,
                loadComponent : () : Promise<any> => import('./children/teacher-schedule-remedial-session/teacher-schedule-remedial-session.component')
            }
        ]
    }
];

@NgModule( {
    imports : [ RouterModule.forChild( routes ) ] ,
    exports : [ RouterModule ]
} )
export class TeacherRoutingModule {}
