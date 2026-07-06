import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeachingAssistantRoutingModule } from './teaching-assistant-routing.module';
import { ROLE_PROVIDER } from "@app/providers/admin-role.provider";

@NgModule( {
	providers    : [ ROLE_PROVIDER.teaching_assistant ] ,
	declarations : [] ,
	imports      : [
		CommonModule ,
		TeachingAssistantRoutingModule
	]
} )
export class TeachingAssistantModule {}
