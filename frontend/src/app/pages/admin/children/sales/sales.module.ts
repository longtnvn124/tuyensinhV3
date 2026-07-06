import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SalesRoutingModule } from './sales-routing.module';
import { ROLE_PROVIDER } from "@app/providers/admin-role.provider";

@NgModule( {
	providers : [ ROLE_PROVIDER.sales ] ,
	imports   : [
		CommonModule ,
		SalesRoutingModule
	]
} )
export class SalesModule {}
