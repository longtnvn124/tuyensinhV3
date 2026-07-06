import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrainingManagementRoutingModule } from './training-management-routing.module';
import { ROLE_PROVIDER } from "@app/providers/admin-role.provider";

@NgModule( {
	providers : [ ROLE_PROVIDER.training_management ] ,
	imports   : [
		CommonModule ,
		TrainingManagementRoutingModule
	]
} )
export class TrainingManagementModule {}
