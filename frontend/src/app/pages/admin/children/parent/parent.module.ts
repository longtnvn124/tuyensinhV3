import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentRoutingModule } from './parent-routing.module';
import { ROLE_PROVIDER } from '@app/providers/admin-role.provider';

@NgModule( {
	providers : [ ROLE_PROVIDER.parent ] ,
	imports   : [
		CommonModule ,
		ParentRoutingModule
	]
} )
export class ParentModule {}
