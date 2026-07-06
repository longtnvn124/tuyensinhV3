import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CeoRoutingModule } from './ceo-routing.module';
import { ROLE_PROVIDER } from "@app/providers/admin-role.provider";

@NgModule( {
	providers : [ ROLE_PROVIDER.ceo ] ,
	imports   : [
		CommonModule ,
		CeoRoutingModule
	]
} )
export class CeoModule {
}
