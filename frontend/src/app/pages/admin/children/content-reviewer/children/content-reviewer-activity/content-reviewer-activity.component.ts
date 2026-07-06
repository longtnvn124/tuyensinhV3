import { Component , computed , input , InputSignal , output , OutputEmitterRef , Signal , signal , WritableSignal } from '@angular/core';
import { ContentReviewerComponent } from '@pages/admin/children/content-reviewer/models/content-reviewer-component';
import { ContentReviewerData } from '@pages/admin/children/content-reviewer/models/content-reviewer-data';
import { Textarea } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { debounceTime , Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass , NgOptimizedImage } from '@angular/common';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';
import { MatTooltip } from '@angular/material/tooltip';

export type StaffRole = 'TEACHER' | 'ASSISTANT';

export type RewriteFeedbackDto = Pick<ContentReviewerData , 'id' | 'comment' | 'comment_origin'>

@Component( {
	selector    : 'app-content-reviewer-activity' ,
	imports     : [ Textarea , FormsModule , NgOptimizedImage , EmployeePhotoPipe , NgClass , MatTooltip ] ,
	templateUrl : './content-reviewer-activity.component.html' ,
	styleUrls   : [ '../../css/timeline.css' , './content-reviewer-activity.component.css' ]
} )
export class ContentReviewerActivityComponent implements ContentReviewerComponent {

	data : InputSignal<ContentReviewerData> = input.required<ContentReviewerData>();

	disableRewrite : InputSignal<boolean> = input<boolean>( false );

	onRewriteFeedback : OutputEmitterRef<RewriteFeedbackDto> = output<RewriteFeedbackDto>();

	protected readonly staffRole : Signal<StaffRole> = computed( () : StaffRole => this.data()?.employee?.user_id === this.data()?.class_session?.teacher_id ? 'TEACHER' : 'ASSISTANT' );

	protected readonly staffName : Signal<string> = computed( () : string => this.data()?.employee?.full_name || 'staff name' );

	protected readonly rewrite : WritableSignal<boolean> = signal( false );

	private changeObserver : Subject<RewriteFeedbackDto> = new Subject<RewriteFeedbackDto>();

	constructor() {
		this.changeObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 )
		).subscribe( ( info : RewriteFeedbackDto ) : void => {
			this.onRewriteFeedback.emit( info );
		} );
	}

	protected openRewriteFeedback() : void {
		this.rewrite.set( true );
		if ( !this.data().comment_origin ) {
			this.data().comment_origin = this.data().comment;
		}
	}

	protected triggerChanged() : void {
		this.changeObserver.next( {
			id             : this.data().id ,
			comment        : this.data().comment ,
			comment_origin : this.data().comment_origin
		} );
	}
}
