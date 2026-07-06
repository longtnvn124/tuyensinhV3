import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentReviewerRoutingModule } from './content-reviewer-routing.module';
import { ROLE_PROVIDER } from '@app/providers/admin-role.provider';

@NgModule( {
	providers : [ ROLE_PROVIDER.content_reviewer ] ,
	imports   : [
		CommonModule ,
		ContentReviewerRoutingModule
	]
} )
export class ContentReviewerModule {}
