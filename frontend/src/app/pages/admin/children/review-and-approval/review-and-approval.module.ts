import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewAndApprovalRoutingModule } from './review-and-approval-routing.module';
import { ROLE_PROVIDER } from '@app/providers/admin-role.provider';

@NgModule( {
    providers : [ ROLE_PROVIDER.mod_comments ] ,
    imports   : [
        CommonModule ,
        ReviewAndApprovalRoutingModule
    ]
} )
export class ReviewAndApprovalModule {}
