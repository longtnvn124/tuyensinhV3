import { Component , inject , OnDestroy , OnInit , signal , WritableSignal } from '@angular/core';
import { FormControl , FormGroup , ReactiveFormsModule , Validators } from '@angular/forms';
import { Employee , EmployeeFormSocial , SocialMedia } from '@models/employee';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { EmployeesService } from '@services/employees.service';
import { filter , Subject , takeUntil } from 'rxjs';
import { AppState } from '@models/app-state';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { MatButton } from '@angular/material/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';

type AboutMeFormGroup = FormGroup<{
	bio : FormControl<string | null>;
	social_media : FormGroup<EmployeeFormSocial>
}>

type AboutMeInfo = Pick<Employee , 'bio' | 'social_media'>

@Component( {
	selector    : 'account-info-tab-about-me' ,
	imports     : [ ReactiveFormsModule , InputText , Textarea , MatButton , LoadingProgressComponent ] ,
	templateUrl : './account-info-tab-about-me.component.html' ,
	styleUrl    : './account-info-tab-about-me.component.css'
} )
export class AccountInfoTabAboutMeComponent implements OnDestroy {

	private auth : AuthenticationService = inject( AuthenticationService );

	private notification : NotificationService = inject<NotificationService>( NotificationService );

	private employeesService : EmployeesService = inject( EmployeesService );

	private destroyed$ : Subject<void> = new Subject<void>();

	private submitObserver : Subject<number> = new Subject<number>();

	protected readonly state : WritableSignal<AppState | 'empty'> = signal<AppState>( 'loading' );

	protected readonly formGroup : AboutMeFormGroup = new FormGroup( {
		bio          : new FormControl<string>( '' , [ Validators.maxLength( 250 ) ] ) ,
		social_media : new FormGroup<EmployeeFormSocial>( {
			facebook  : new FormControl<string>( '' , Validators.maxLength( 100 ) ) ,
			instagram : new FormControl<string>( '' , Validators.maxLength( 100 ) ) ,
			tiktok    : new FormControl<string>( '' , Validators.maxLength( 100 ) ) ,
			linkedIn  : new FormControl<string>( '' , Validators.maxLength( 100 ) ) ,
			youtube   : new FormControl<string>( '' , Validators.maxLength( 100 ) )
		} )
	} );

	private readonly session : WritableSignal<number> = signal( 0 );

	constructor() {
		this.auth.onEmployeeSetup.pipe(
			takeUntilDestroyed()
		).subscribe( ( employee : Employee ) : void => {
			if ( employee ) {
				const { bio , social_media } = employee;
				this.formGroup.reset( {
					bio          : bio ,
					social_media : Object.assign<SocialMedia , SocialMedia>( { facebook : '' , instagram : '' , tiktok : '' , linkedIn : '' , youtube : '' } , social_media )
				} );
				this.formGroup.enable();
				this.state.set( 'success' );
			} else {
				this.formGroup.disable();
				this.state.set( 'empty' );
			}
		} );

		this.submitObserver.pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this.submitData();
		} );
	}

	private submitData() : void {
		this.state.set( 'loading' );
		this.employeesService.update( this.auth.employee.id , {
			bio          : this.getControl( 'bio' ).value.trim() ,
			social_media : this.getControl( 'social_media' ).value
		} ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : () : void => {
				this.auth.employee = { ... this.auth.employee , bio : this.getControl( 'bio' ).value.trim() , social_media : this.getControl( 'social_media' ).value };
				this.state.set( 'success' );
				this.notification.toastSuccess( 'Cập nhật thành công' );
				this.increaseSession();
			} ,
			error : () : void => {
				this.state.set( 'success' );
				this.notification.toastError( 'Cập nhật thất bại' );
				this.increaseSession();
			}
		} );
	}

	protected getControl<K extends keyof AboutMeInfo>( key : K ) : FormControl<AboutMeInfo[K]> {
		return this.formGroup.get( key as string ) as FormControl<AboutMeInfo[K]>;
	}

	protected btnSave( event : Event ) : void {
		event.preventDefault();
		event.stopPropagation();
		if ( this.formGroup.valid ) {
			this.state.set( 'loading' );
			this.submitObserver.next( this.session() );
		}
	}

	protected preventKeyDown( event : Event ) : void {
		event.preventDefault();
		event.stopPropagation();
	}

	private increaseSession() : void {
		this.session.update( ( _oldSession : number ) : number => 1 + _oldSession );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
