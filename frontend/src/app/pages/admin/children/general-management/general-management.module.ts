import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeneralManagementRoutingModule } from './general-management-routing.module';
import { ROLE_PROVIDER } from "@app/providers/admin-role.provider";

@NgModule( {
	providers : [ ROLE_PROVIDER.general_management ] ,
	imports   : [
		CommonModule ,
		GeneralManagementRoutingModule
	]
} )
export class GeneralManagementModule {}
