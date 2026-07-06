import { Component , inject , OnDestroy , OnInit , signal , WritableSignal } from '@angular/core';
import { MAT_DIALOG_DATA , MatDialogRef } from '@angular/material/dialog';
import { map , Observable , Subject , takeUntil } from 'rxjs';
import { AppState } from '@models/app-state';
import { ClassSessionStudentFeedbackAuthor , ClassSessionStudentFeedbackInfo } from '@pages/class-session/children/class-session-student-feedback/class-session-student-feedback.component';
import { FormControl , FormGroup , FormsModule , ReactiveFormsModule , Validators } from '@angular/forms';
import { ClassMedia , ClassMediaCriteriaScores , ClassMediaType } from '@models/class-media';
import { FormGroupType } from '@models/common';
import { IctuBasicFile } from '@models/file';
import { NgClass , NgOptimizedImage } from '@angular/common';
import { PublicAssetPipe } from '@pipes/public-asset.pipe';
import { MatButton } from '@angular/material/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { IctuCriteriaScoresControlComponent } from '@components/form-controls/ictu-criteria-scores-control/ictu-criteria-scores-control.component';
import { Textarea } from 'primeng/textarea';
import { ClassMediaService } from '@services/class-media.service';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { IctuFileInputComponent } from '@components/form-controls/ictu-file-input/ictu-file-input.component';
import { NgScrollbar } from 'ngx-scrollbar';

type StudentSpeakingTestFormFields = Pick<ClassMedia , 'donvi_id' | 'class_id' | 'class_session_id' | 'type' | 'student_ids' | 'content' | 'speaking_test' | 'criteria_scores'>

@Component( {
	selector    : 'app-class-session-student-speaking-tests' ,
	standalone  : true ,
	imports     : [ NgOptimizedImage , PublicAssetPipe , MatButton , NgClass , LoadingProgressComponent , FormsModule , ReactiveFormsModule , IctuCriteriaScoresControlComponent , Textarea , IctuFileInputComponent , NgScrollbar ] ,
	templateUrl : './class-session-student-speaking-tests.component.html' ,
	styleUrls   : [ '../class-session-student-feedback/class-session-student-feedback.component.css' , './class-session-student-speaking-tests.component.css' ]
} )
export class ClassSessionStudentSpeakingTestsComponent implements OnDestroy , OnInit {

	public dialogRef : MatDialogRef<ClassSessionStudentSpeakingTestsComponent , boolean> = inject( MatDialogRef<ClassSessionStudentSpeakingTestsComponent , boolean> );

	public data : ClassSessionStudentFeedbackInfo = inject( MAT_DIALOG_DATA );

	private destroyed$ : Subject<void> = new Subject<void>();

	private session : WritableSignal<number> = signal( 0 );

	protected readonly state : WritableSignal<AppState | 'submitting'> = signal( 'loading' );

	private loadDataObserver : Subject<number> = new Subject<number>();

	private submitDataObserver : Subject<number> = new Subject<number>();

	private dirty : boolean = false;

	private classMediaService : ClassMediaService = inject( ClassMediaService );

	protected readonly formGroup : FormGroupType<StudentSpeakingTestFormFields> = new FormGroup( {
		donvi_id         : new FormControl<number>( 0 , Validators.required ) ,
		class_id         : new FormControl<number>( 0 , Validators.required ) ,
		class_session_id : new FormControl<number>( 0 , Validators.required ) ,
		type             : new FormControl<ClassMediaType>( 'SPEAKING_TEST' , Validators.required ) ,
		student_ids      : new FormControl<number[]>( [ 0 ] , Validators.required ) ,
		content          : new FormControl<string>( '' ) ,
		speaking_test    : new FormControl<IctuBasicFile[]>( [] ) ,
		criteria_scores  : new FormControl<ClassMediaCriteriaScores[]>( [] )
	} );

	protected readonly author : WritableSignal<ClassSessionStudentFeedbackAuthor> = signal( null );

	private classMediaID : number = 0;

	constructor() {
		this.loadDataObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this._loadData();
		} );

		this.submitDataObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this._submit();
		} );
	}

	ngOnInit() : void {
		this.triggerLoadData();
	}

	private _loadData() : void {
		this.state.set( 'loading' );
		this._request().pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( classMedia : ClassMedia ) : void => {
				this.classMediaID = classMedia?.id || 0;
				this.setForm( classMedia );
				this.state.set( 'success' );
				this.increateSession();
			} ,
			error : () : void => {
				this.state.set( 'error' );
				this.increateSession();
			}
		} );
	}

	private setForm( post : StudentSpeakingTestFormFields ) : void {
		this.formGroup.reset( {
			donvi_id         : this.data.classSession.donvi_id ,
			class_id         : this.data.classSession.class_id ,
			class_session_id : this.data.classSession.id ,
			type             : 'SPEAKING_TEST' ,
			student_ids      : [ this.data.student.id ] ,
			content          : post?.content || '' ,
			speaking_test    : post?.speaking_test || [] ,
			criteria_scores  : post?.criteria_scores || [ { 'criteria' : 'Pronunciation' , 'score' : 0 } , { 'criteria' : 'Fluency' , 'score' : 0 } , { 'criteria' : 'Vocabulary' , 'score' : 0 } ]
		} );
	}

	private _request() : Observable<ClassMedia> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'class_session_id' , value : this.data.classSession.id.toString() , condition : IctuQueryCondition.equal } ,
			{ conditionName : 'class_id' , value : this.data.classSession.class_id.toString() , condition : IctuQueryCondition.equal , orWhere : 'and' } ,
			{ conditionName : 'type' , value : 'SPEAKING_TEST' , condition : IctuQueryCondition.equal , orWhere : 'and' }
		];
		const queryParams : IctuQueryParams     = {
			limit : 1 ,
			paged : 1
		};
		queryParams[ 'student_ids' ]            = this.data.student.id;
		return this.classMediaService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassMedia[]> ) : ClassMedia => response.data.length ? response.data[ 0 ] : null )
		);
	}

	private _submit() : void {
		const info : StudentSpeakingTestFormFields = this.formGroup.getRawValue();
		this.state.set( 'submitting' );
		this._getSubmitRequest( info ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( postID : number ) : void => {
				this.classMediaID = postID;
				this.setForm( info );
				this.state.set( 'success' );
				this.increateSession();
			} ,
			error : () : void => {
				this.state.set( 'success' );
				this.increateSession();
			}
		} );
	}

	private _getSubmitRequest( info : Partial<ClassMedia> ) : Observable<number> {
		return this.classMediaID ? this.classMediaService.update( this.classMediaID , info ).pipe( map( () : number => this.classMediaID ) ) : this.classMediaService.create( info );
	}

	protected getControl<K extends keyof StudentSpeakingTestFormFields>( key : K ) : FormControl<StudentSpeakingTestFormFields[K]> {
		return this.formGroup.controls[ key ];
	}

	private triggerLoadData() : void {
		this.loadDataObserver.next( this.session() );
	}

	protected reload( event : KeyboardEvent | MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.triggerLoadData();
	}

	private increateSession() : void {
		this.session.update( ( value : number ) : number => 1 + value );
	}

	protected close() : void {
		this.dialogRef.close( this.dirty );
	}

	protected submitData() : void {
		this.submitDataObserver.next( this.session() );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
