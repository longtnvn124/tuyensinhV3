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
                loadComponent : () : Promise<any> => import('./children/ta-dashboard/ta-dashboard.component')
            } ,
            {
                path          : 'calendar' ,
                loadComponent : () : Promise<any> => import('./children/ta-calendar/ta-calendar.component')
            } ,
            {
                path          : 'classes' ,
                loadComponent : () : Promise<any> => import('./children/ta-classes/ta-classes.component')
            } ,
            {
                path          : 'schedule-remedial-session' ,
                loadComponent : () : Promise<any> => import('./children/ta-schedule-remedial-session/ta-schedule-remedial-session.component')
            }
        ]
    }
];

@NgModule( {
    imports : [ RouterModule.forChild( routes ) ] ,
    exports : [ RouterModule ]
} )
export class TeachingAssistantRoutingModule {}
