import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeacherRoutingModule } from './teacher-routing.module';
import { ROLE_PROVIDER } from '@app/providers/admin-role.provider';

@NgModule( {
    providers : [ ROLE_PROVIDER.teacher ] ,
    imports   : [ CommonModule , TeacherRoutingModule ]
} )
export class TeacherModule {}
