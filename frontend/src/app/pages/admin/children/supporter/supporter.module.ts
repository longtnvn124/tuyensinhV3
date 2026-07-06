import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupporterRoutingModule } from './supporter-routing.module';
import { ROLE_PROVIDER } from "@app/providers/admin-role.provider";

@NgModule( {
	providers : [ ROLE_PROVIDER.supporter ] ,
	imports   : [
		CommonModule ,
		SupporterRoutingModule
	]
} )
export class SupporterModule {}
