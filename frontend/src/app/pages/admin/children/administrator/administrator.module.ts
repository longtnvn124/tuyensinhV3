import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdministratorRoutingModule } from './administrator-routing.module';
import { ROLE_PROVIDER } from "@app/providers/admin-role.provider";

@NgModule( {
	providers : [ ROLE_PROVIDER.admin ] ,
	imports   : [
		CommonModule ,
		AdministratorRoutingModule
	]
} )
export class AdministratorModule {
}
