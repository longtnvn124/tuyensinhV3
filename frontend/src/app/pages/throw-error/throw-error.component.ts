import { Component , inject , signal , WritableSignal } from '@angular/core';
import { AuthenticationService } from '@services/authentication.service';
import { find } from 'lodash-es';
import { ENVIRONMENT } from '@env';
import { AppState } from '@models/app-state';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { ActivatedRoute , ParamMap } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component( {
	selector    : 'app-throw-error' ,
	imports     : [ LoadingProgressComponent ] ,
	templateUrl : './throw-error.component.html' ,
	styleUrl    : './throw-error.component.css'
} )
export class ThrowErrorComponent {

	protected readonly state : WritableSignal<AppState> = signal( 'loading' );

	private auth : AuthenticationService = inject( AuthenticationService );

	private activatedRoute : ActivatedRoute = inject( ActivatedRoute );

	constructor() {
		this.activatedRoute.queryParamMap.pipe(
			takeUntilDestroyed() ,
			map( ( params : ParamMap ) : boolean => {
				if ( params.has( 'time' ) && /^\d+$/g.test( params.get( 'time' ) ) ) {
					const moment : number = parseInt( params.get( 'time' ) , 10 );
					return moment + 5000 > Date.now();
				}
				return false;
			} )
		).subscribe( ( isValid : boolean ) : void => {
			if ( isValid ) {
				this.state.set( 'success' );
			} else {
				this.refreshAndRedirectToLogin( true );
			}
		} );
	}

	protected btnGetHome( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		if ( this.auth.userLoggedIn ) {
			const currentAppVersion : number = parseInt( ENVIRONMENT.appVersion.replace( /\./gmi , '' ) , 10 );
			const lastAppVersion : number    = find( this.auth.configs , { config_key : '__APP_VERSION' } )?.value ?? 0;
			const hasNewAppVersion : boolean = lastAppVersion > currentAppVersion;
			this.refreshAndRedirectToLogin( !hasNewAppVersion );
		} else {
			this.refreshAndRedirectToLogin( true );
		}
	}

	private refreshAndRedirectToLogin( removeSession : boolean = false ) : void {
		if ( removeSession ) {
			this.auth.clearSession();
		}
		const url : URL = new URL( window.location.href.split( '?' )[ 0 ] );
		url.pathname    = 'auth/login';
		url.searchParams.set( 'session' , Date.now().toString( 10 ) );
		window.location.assign( url.toString() );
	}

}
