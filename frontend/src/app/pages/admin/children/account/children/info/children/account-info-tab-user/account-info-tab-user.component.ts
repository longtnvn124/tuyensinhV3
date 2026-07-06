import { Component , computed , inject , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { FormControl , FormGroup , FormsModule , ReactiveFormsModule , Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { MatButton } from '@angular/material/button';
import { NgOptimizedImage } from '@angular/common';
import { UserService } from '@services/user.service';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { AppState } from '@models/app-state';
import { User } from '@models/user';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime , firstValueFrom , Subject , take , takeUntil } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { IctuImageResizeComponent , ImageResizerConfig , ImageResizerDto } from '@components/ictu-image-resize/ictu-image-resize.component';
import { MatDialog , MatDialogRef } from '@angular/material/dialog';
import { FormGroupType } from '@models/common';
import { Date2textPipe } from '@pipes/date2text.pipe';

type UserFormFields = Pick<User , 'username' | 'display_name' | 'email' | 'phone'>

@Component( {
	selector    : 'account-info-tab-user' ,
	imports     : [ FormsModule , InputText , MatButton , NgOptimizedImage , ReactiveFormsModule , Date2textPipe ] ,
	templateUrl : './account-info-tab-user.component.html' ,
	styleUrl    : './account-info-tab-user.component.css'
} )
export class AccountInfoTabUserComponent implements OnDestroy {

	private userService : UserService = inject( UserService );

	private auth : AuthenticationService = inject( AuthenticationService );

	private notificationService : NotificationService = inject( NotificationService );

	readonly state : WritableSignal<AppState | 'submitting'> = signal<AppState>( 'loading' );

	readonly user : WritableSignal<User> = signal<User>( null );

	readonly avatar : Signal<string> = computed( () : string => this.user() ? this.user().avatar : 'assets/images/user/avatar-2.jpg' );

	private formSubmitObserver : Subject<number> = new Subject();

	private changeAvatarObserver : Subject<number> = new Subject();

	private readonly session : WritableSignal<number> = signal( 0 );

	private dialog : MatDialog = inject( MatDialog );

	private destroyed$ : Subject<void> = new Subject<void>();

	protected readonly formGroup : FormGroupType<UserFormFields> = new FormGroup( {
		username     : new FormControl<string>( '' ) ,
		email        : new FormControl<string>( '' ) ,
		display_name : new FormControl<string>( '' , [ Validators.required , Validators.minLength( 2 ) , Validators.maxLength( 250 ) ] ) ,
		phone        : new FormControl<string>( '' )
	} );

	constructor() {

		this.auth.onUserSetup.pipe(
			takeUntilDestroyed()
		).subscribe( ( u : User ) : void => {
			this.user.set( u );
			this.formGroup.reset( {
				username     : u.username ,
				email        : u.email ,
				display_name : u.display_name ,
				phone        : u.phone
			} );
			this.getControl( 'username' ).disable();
			this.getControl( 'email' ).disable();
			this.getControl( 'phone' ).disable();
		} );

		this.auth.onUserSetup.pipe(
			takeUntilDestroyed() ,
			take( 1 ) ,
			debounceTime( 500 )
		).subscribe( () : void => {
			this.state.set( 'success' );
		} );

		this.changeAvatarObserver.pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this.openAvatarFileChoose();
		} );

		this.formSubmitObserver.pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this._submitForm();
		} );
	}

	protected getControl<K extends keyof UserFormFields>( key : K ) : FormControl<UserFormFields[K]> {
		return this.formGroup.get( key as string ) as FormControl<UserFormFields[K]>;
	}

	private openAvatarFileChoose() : void {
		const inputPanel : HTMLInputElement = Object.assign<HTMLInputElement , any>( document.createElement<'input'>( 'input' ) , {
			type   : 'file' ,
			accept : 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon'
		} );
		inputPanel.onchange                 = () : void => {
			if ( inputPanel.files.length ) {
				const file : File = inputPanel.files[ 0 ];
				switch ( true ) {
					case ( ![ 'png' , 'jpeg' , 'jpg' , 'webp' ].includes( file.name.split( '.' ).pop().toLowerCase() ) ):
						this.notificationService.toastError( 'Hệ thống chỉ chấp nhận file có phần mở rộng là jpg, jpeg, png, webp' , 'Lỗi định dạng file' );
						this.increaseSession();
						break;
					case ( ( file.size / ( 1024 * 1024 ) ) > 10 ):
						this.notificationService.toastError( 'Dung lượng file upload không được vượt quá 10Mb!' , 'Lỗi dung lượng file' );
						this.increaseSession();
						break;
					default:
						void this.makeAvatar( file );
						break;
				}
			} else {
				this.increaseSession();
			}
			setTimeout( () : void => {
				inputPanel.remove();
			} , 1000 );
		};
		inputPanel.onchange                 = () : void => {
			this.increaseSession();
		};
		inputPanel.oncancel                 = () : void => {
			this.increaseSession();
		};
		inputPanel.click();
	}

	private async makeAvatar( file : File ) : Promise<void> {
		try {
			const data : Partial<ImageResizerConfig> = {
				resizeToWidth : 200 ,
				aspectRatio   : 1 ,
				format        : 'png' ,
				dataUrl       : URL.createObjectURL( file )
			};

			const dialogRef : MatDialogRef<IctuImageResizeComponent> = this.dialog.open( IctuImageResizeComponent , {
				data ,
				disableClose : true ,
				panelClass   : 'image-resizer-panel'
			} );

			const result : ImageResizerDto = await firstValueFrom( dialogRef.afterClosed() );
			if ( !result.error ) {
				const fileName : string = `user-avatar-${ this.auth.user.id }-${ Date.now() }.png`;
				const file : File       = this.auth.helper.blobToFile( result.data.blob , fileName );
				this.state.set( 'submitting' );
				this.auth.updateAvatar( file ).pipe(
					takeUntil( this.destroyed$ )
				).subscribe( {
					next  : () : void => {
						this.state.set( 'success' );
						this.notificationService.toastSuccess( 'Cập nhật avatar thành công' );
						this.increaseSession();
					} ,
					error : () : void => {
						this.state.set( 'success' );
						this.notificationService.toastError( 'Cập nhật avatar thất bại' );
						this.increaseSession();
					}
				} );
			} else {
				this.increaseSession();
			}
		} catch ( e ) {
			console.log( e );
			this.increaseSession();
		}
	}

	private increaseSession() : void {
		this.session.update( ( _oldSession : number ) : number => 1 + _oldSession );
	}

	protected btnUploadAvatar() : void {
		this.changeAvatarObserver.next( this.session() );
	}

	protected btnSubmitForm() : void {
		this.formSubmitObserver.next( this.session() );
	}

	private _submitForm() : void {
		this.state.set( 'submitting' );
		this.userService.update( { display_name : this.getControl( 'display_name' ).value } ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : () : void => {
				this.auth.saveUser( { ... this.auth.user , display_name : this.getControl( 'display_name' ).value } );
				this.notificationService.toastSuccess( 'Cập nhật thông tin thành công' );
				this.state.set( 'success' );
				this.increaseSession();
			} ,
			error : () : void => {
				this.state.set( 'success' );
				this.notificationService.toastError( 'Cập nhật thông tin thất bại' );
				this.increaseSession();
			}
		} );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
