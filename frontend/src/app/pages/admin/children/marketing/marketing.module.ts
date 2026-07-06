import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketingRoutingModule } from './marketing-routing.module';
import { ROLE_PROVIDER } from "@app/providers/admin-role.provider";

@NgModule( {
	providers : [ ROLE_PROVIDER.marketing ] ,
	imports   : [
		CommonModule ,
		MarketingRoutingModule
	]
} )
export class MarketingModule {}
