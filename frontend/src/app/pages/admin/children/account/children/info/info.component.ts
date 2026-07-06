import { Component , computed , inject , Signal , signal , WritableSignal } from '@angular/core';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { AppState } from '@models/app-state';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthenticationService } from '@services/authentication.service';
import { User } from '@models/user';
import { debounceTime , merge , take } from 'rxjs';
import { Employee } from '@models/employee';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { AccountInfoEmployeeProfileComponent } from '@pages/admin/children/account/children/info/children/account-info-employee-profile/account-info-employee-profile.component';
import { AccountInfoTabAboutMeComponent } from '@pages/admin/children/account/children/info/children/account-info-tab-about-me/account-info-tab-about-me.component';
import { AccountInfoParentProfileComponent } from '@pages/admin/children/account/children/info/children/account-info-parent-profile/account-info-parent-profile.component';
import { AccountInfoTabSettingsComponent } from '@pages/admin/children/account/children/info/children/account-info-tab-settings/account-info-tab-settings.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountInfoTabUserComponent } from '@pages/admin/children/account/children/info/children/account-info-tab-user/account-info-tab-user.component';

type AccountInfoSessionName = 'USER' | 'PROFILE' | 'SETTINGS' | 'ABOUT_ME';

type InfoProfileType = 'employee' | 'parent' | 'student';

@Component( {
	selector    : 'app-info' ,
	imports     : [ LoadingProgressComponent , ReactiveFormsModule , AccountInfoEmployeeProfileComponent , AccountInfoTabAboutMeComponent , AccountInfoParentProfileComponent , AccountInfoTabSettingsComponent , AccountInfoTabUserComponent ] ,
	templateUrl : './info.component.html' ,
	styleUrl    : './info.component.css'
} )
export default class InfoComponent {

	private auth : AuthenticationService = inject( AuthenticationService );

	readonly state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	readonly user : WritableSignal<User> = signal<User>( null );

	readonly employee : WritableSignal<Employee> = signal<Employee>( null );

	readonly avatar : Signal<string> = computed( () : string => this.user() ? this.user().avatar : 'assets/images/user/avatar-2.jpg' );

	readonly profileType : Signal<InfoProfileType> = computed( () : InfoProfileType => {
		switch ( true ) {
			case this.auth.userHasRole( [ 'parent' ] ):
				return 'parent';
			case this.auth.userHasRole( [ 'student' ] ):
				return 'student';
			default:
				return 'employee';
		}
	} );

	protected readonly tabActive : WritableSignal<AccountInfoSessionName> = signal<AccountInfoSessionName>( 'USER' );

	protected dmLinhVuc : WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>( [] );

	constructor() {
		merge<[ any , any ]>(
			this.auth.onUserSetup ,
			this.auth.onEmployeeSetup
		).pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 ) ,
			take( 1 )
		).subscribe( () : void => {
			this.state.set( 'success' );
		} );

		this.auth.onUserSetup.pipe(
			takeUntilDestroyed()
		).subscribe( ( u : User ) : void => {
			this.user.set( u );
		} );

		this.auth.onEmployeeSetup.pipe(
			takeUntilDestroyed()
		).subscribe( ( e : Employee ) : void => {
			this.employee.set( e );
		} );

	}

	public activeTab( tab : AccountInfoSessionName , event : Event ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.tabActive.update( () : AccountInfoSessionName => tab );
	}
}
