import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountantRoutingModule } from './accountant-routing.module';
import { ROLE_PROVIDER } from "@app/providers/admin-role.provider";

@NgModule( {
	providers : [ ROLE_PROVIDER.accountant ] ,
	imports   : [
		CommonModule ,
		AccountantRoutingModule
	]
} )
export class AccountantModule {}
