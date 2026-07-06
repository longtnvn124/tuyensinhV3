import { Component , inject , OnDestroy , OnInit , signal , WritableSignal } from '@angular/core';
import { NgClass , NgOptimizedImage } from '@angular/common';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { PublicAssetPipe } from '@pipes/public-asset.pipe';
import { MAT_DIALOG_DATA , MatDialogRef } from '@angular/material/dialog';
import { map , Observable , Subject , takeUntil } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { AppState } from '@models/app-state';
import { StudentPopupInfo } from '@models/hoc-sinh';
import { ClassActivitiesService } from '@services/class-activities.service';
import { ClassActivity , ClassActivityType } from '@models/class-activities';
import { FormGroupType } from '@models/common';
import { FormControl , FormGroup , ReactiveFormsModule , Validators } from '@angular/forms';
import { IctuBasicFile } from '@models/file';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { MatButton } from '@angular/material/button';
import { Textarea } from 'primeng/textarea';
import { ClassSession } from '@models/class-session';
import { Employee } from '@models/employee';

export interface ClassSessionStudentFeedbackInfo {
	student : StudentPopupInfo,
	classSession : ClassSession,
	readonly : boolean
}

type ClassSessionStudentFeedbackFormControls = Pick<ClassActivity , 'donvi_id' | 'class_id' | 'class_session_id' | 'comment' | 'type' | 'student_ids' | 'media'>

type ClassSessionStudentFeedbackFormGroup = FormGroupType<ClassSessionStudentFeedbackFormControls>

export type ClassSessionStudentFeedbackAuthorRole = 'teacher' | 'assistant' | 'other';

export interface ClassSessionStudentFeedbackAuthor extends Pick<Employee , 'id' | 'full_name' | 'email' | 'phone' | 'gender' | 'photo' | 'user_id'> {
	_role : ClassSessionStudentFeedbackAuthorRole;
}

@Component( {
	selector    : 'app-class-session-student-feedback' ,
	standalone  : true ,
	imports     : [ LoadingProgressComponent , NgOptimizedImage , PublicAssetPipe , MatButton , ReactiveFormsModule , Textarea , NgClass ] ,
	templateUrl : './class-session-student-feedback.component.html' ,
	styleUrl    : './class-session-student-feedback.component.css'
} )
export class ClassSessionStudentFeedbackComponent implements OnDestroy , OnInit {

	public dialogRef : MatDialogRef<ClassSessionStudentFeedbackComponent , boolean> = inject( MatDialogRef<ClassSessionStudentFeedbackComponent , boolean> );

	public data : ClassSessionStudentFeedbackInfo = inject( MAT_DIALOG_DATA );

	private destroyed$ : Subject<void> = new Subject<void>();

	private session : WritableSignal<number> = signal( 0 );

	protected readonly state : WritableSignal<AppState> = signal( 'loading' );

	private loadDataObserver : Subject<number> = new Subject<number>();

	private submitDataObserver : Subject<number> = new Subject<number>();

	private dirty : boolean = false;

	private classActivitiesService : ClassActivitiesService = inject( ClassActivitiesService );

	protected readonly formGroup : ClassSessionStudentFeedbackFormGroup = new FormGroup( {
		donvi_id         : new FormControl<number>( 0 ) ,
		class_session_id : new FormControl<number>( 0 ) ,
		class_id         : new FormControl<number>( 0 ) ,
		comment          : new FormControl<string>( '' , Validators.required ) ,
		student_ids      : new FormControl<number[]>( [] ) ,
		media            : new FormControl<IctuBasicFile[]>( [] ) ,
		type             : new FormControl<ClassActivityType>( 'HOAT_DONG' )
	} );

	protected readonly author : WritableSignal<ClassSessionStudentFeedbackAuthor> = signal( null );

	protected readonly feedback : WritableSignal<Pick<ClassActivity , 'id' | 'donvi_id' | 'class_id' | 'class_session_id' | 'type' | 'student_ids' | 'comment' | 'media' | 'created_by'>> = signal( null );

	protected readonly isSubmitting : WritableSignal<boolean> = signal( false );

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
			next  : ( feedback : ClassActivity ) : void => {
				this.feedback.set( feedback );
				this.increateSession();
				if ( !this.data.readonly ) {
					// this.formGroup.get( 'comment' ).disable();
					this.formGroup.reset( {
						donvi_id         : this.data.classSession.donvi_id ,
						class_session_id : this.data.classSession.id ,
						class_id         : this.data.classSession.class_id ,
						comment          : feedback?.comment || '' ,
						student_ids      : feedback?.student_ids || [ this.data.student.id ] ,
						media            : feedback?.media || [] ,
						type             : feedback?.type || 'HOAT_DONG'
					} );
				}
				if ( feedback && feedback.employee ) {
					let _role : ClassSessionStudentFeedbackAuthorRole = 'other';
					switch ( feedback.created_by ) {
						case this.data.classSession.teacher_id :
							if ( this.data.classSession.teacher_id ) {
								_role = 'teacher';
							}
							break;
						case this.data.classSession.assistant_id :
							if ( this.data.classSession.assistant_id ) {
								_role = 'assistant';
							}
							break;
						default:
							break;
					}
					this.author.set( { ... feedback.employee , _role } );
				} else {
					this.author.set( null );
				}
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.increateSession();
				this.state.set( 'error' );
			}
		} );
	}

	protected getControl<K extends keyof ClassSessionStudentFeedbackFormControls>( key : K ) : FormControl<ClassSessionStudentFeedbackFormControls[K]> {
		return this.formGroup.controls[ key ];
	}

	private _request() : Observable<ClassActivity> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'class_session_id' , value : this.data.classSession.id.toString() , condition : IctuQueryCondition.equal } ,
			{ conditionName : 'class_id' , value : this.data.classSession.class_id.toString() , condition : IctuQueryCondition.equal , orWhere : 'and' }
		];
		const queryParams : IctuQueryParams     = {
			limit  : 1 ,
			paged  : 1 ,
			select : 'id,donvi_id,class_id,class_session_id,type,student_ids,comment,media,created_by' ,
			with   : 'employee'
		};
		queryParams[ 'student_ids' ]            = this.data.student.id;
		return this.classActivitiesService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassActivity[]> ) : ClassActivity => response.data.length ? response.data[ 0 ] : null )
		);
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

	private _submit() : void {
		this.isSubmitting.set( true );
		this.submitRequest().pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( created : boolean ) : void => {
				if ( created ) {
					this.dirty = true;
				}
				this.increateSession();
				this.isSubmitting.set( false );
				this.triggerLoadData();
			} ,
			error : () : void => {
				this.dirty = true;
				this.increateSession();
				this.isSubmitting.set( false );
				this.triggerLoadData();
			}
		} );
	}

	private submitRequest() : Observable<boolean> {
		const info : Partial<ClassActivity> = { ... this.formGroup.getRawValue() };
		return this.feedback()
		       ? this.classActivitiesService.update( this.feedback().id , info ).pipe( map( () : boolean => false ) )
		       : this.classActivitiesService.create( info ).pipe( map( () : boolean => true ) );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
