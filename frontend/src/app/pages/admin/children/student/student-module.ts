import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentRoutingModule } from './student-routing-module';
import { ROLE_PROVIDER } from "@app/providers/admin-role.provider";

@NgModule( {
	providers : [ ROLE_PROVIDER.student ] ,
	imports   : [
		CommonModule ,
		StudentRoutingModule
	]
} )
export class StudentModule {}
