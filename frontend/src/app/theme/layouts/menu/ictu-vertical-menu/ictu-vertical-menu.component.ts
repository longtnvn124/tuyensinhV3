import { Component , computed , DestroyRef , inject , input , InputSignal , OnInit , Signal , signal , WritableSignal } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { CommonModule , Location , LocationStrategy , NgOptimizedImage } from '@angular/common';
import { IctuNavigation , IctuNavigationItem } from '@theme/types/navigation';
import { IctuMenuItemComponent } from '@theme/layouts/menu/ictu-vertical-menu/ictu-menu-item/ictu-menu-item.component';
import { NotificationService } from '@services/notification.service';
import { ActivatedRoute , Event , NavigationEnd , Router , RouterLink , RouterLinkActive } from '@angular/router';
import { MatMenuTrigger } from '@angular/material/menu';
import { User } from '@models/user';
import { AuthenticationService } from '@services/authentication.service';
import { LayoutService } from '@theme/services/layout.service';
import { SafeUrlPipe } from '@pipes/safe-url.pipe';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component( {
	selector    : 'ictu-vertical-menu' ,
	imports     : [ SharedModule , CommonModule , IctuMenuItemComponent , NgOptimizedImage , SafeUrlPipe , RouterLink , RouterLinkActive ] ,
	templateUrl : './ictu-vertical-menu.component.html' ,
	styleUrl    : './ictu-vertical-menu.component.scss'
} )
export class IctuVerticalMenuComponent implements OnInit {

	collapsed : InputSignal<boolean> = input.required<boolean>();

	menus : InputSignal<IctuNavigation[]> = input.required<IctuNavigation[]>();

	private location : Location = inject( Location );

	private notification : NotificationService = inject( NotificationService );

	private locationStrategy : LocationStrategy = inject( LocationStrategy );

	logo : InputSignal<string> = input<string>( '' );

	version : InputSignal<string> = input<string>( '' );

	private auth : AuthenticationService = inject( AuthenticationService );

	private layoutService : LayoutService = inject( LayoutService );

	menuActivated : WritableSignal<IctuNavigation | undefined> = signal<undefined>( undefined );

	collapsedMenuChild : WritableSignal<IctuNavigation | undefined> = signal<undefined>( undefined );

	readonly expandedMenuIds : WritableSignal<Set<string>> = signal<Set<string>>( new Set() );

	private activatedRoute : ActivatedRoute = inject( ActivatedRoute );

	private router : Router = inject( Router );

	private destroyRef : DestroyRef = inject( DestroyRef );

	private timedOutCloser : any;

	private _menuTrigger : MatMenuTrigger;

	get activatedMenuTrigger() : MatMenuTrigger {
		return this._menuTrigger;
	}

	private openMenuTriggerOnHover( trigger : MatMenuTrigger ) : void {
		trigger.openMenu();
		this._menuTrigger = trigger;
	}

	readonly user : WritableSignal<User> = signal<User>( null );

	readonly avatar : Signal<string> = computed( () : string => this.user()?.avatar || 'images/user/circle-avatar-placeholder.png' );

	readonly displayName : Signal<string> = computed( () : string => this.user() ? this.user().display_name : 'Empty display name' );

	readonly email : Signal<string> = computed( () : string => this.user() ? this.user().email : 'Empty email' );

	constructor() {
		this.auth.onUserSetup.pipe(
			takeUntilDestroyed()
		).subscribe( ( user : User ) : void => {
			this.user.set( user );
		} );
	}

	ngOnInit() : void {
		const _currentMenuId : string | undefined = this.activatedRoute.snapshot.children[ 0 ]?.routeConfig?.path;
		this.tryActiveMenuByRouting( _currentMenuId );

		this.router.events.pipe(
			takeUntilDestroyed( this.destroyRef ) ,
			filter( ( event : Event ) : boolean => event instanceof NavigationEnd )
		).subscribe( ( router : NavigationEnd ) : void => {
			this.tryActiveMenuByRouting( router.url ? router.url.replace( /\/?admin\/?/gmi , '' ).replace( /^\//gmi , '' ) : null );
		} );
	}


	private tryActiveMenuByRouting( router : string | undefined | null ) : void {
		if ( !router ) {
			return;
		}
		const segments : string[] = router.split( '/' ).filter( ( s : string ) : boolean => !!s );
		for ( const parent of this.menus() ) {
			if ( segments[ 0 ] === parent.id ) {
				if ( segments.length > 1 ) {
					const child : IctuNavigationItem | undefined = parent.child?.find( ( c : IctuNavigationItem ) : boolean => c.id === segments[ 1 ] );
					if ( child ) {
						this.menuActivated.set( { ...parent , id : child.id , title : child.title , icon : child.icon , url : child.url } as IctuNavigation );
						this.expandedMenuIds.update( ( s : Set<string> ) : Set<string> => new Set( s ).add( parent.id ) );
						return;
					}
				}
				this.menuActivated.set( parent );
				return;
			}
		}
	}

	isExpanded( menuId : string ) : boolean {
		return this.expandedMenuIds().has( menuId );
	}

	hasActiveChild( menu : IctuNavigation ) : boolean {
		return !!menu.child?.some( ( c : IctuNavigation ) : boolean => this.menuActivated()?.id === c.id );
	}

	toggleSubmenu( menu : IctuNavigation ) : void {
		if ( !menu.child?.length ) {
			void this.navigateToMenu( menu );
			return;
		}
		this.expandedMenuIds.update( ( set : Set<string> ) : Set<string> => {
			const next : Set<string> = new Set( set );
			if ( next.has( menu.id ) ) {
				next.delete( menu.id );
			} else {
				next.add( menu.id );
			}
			return next;
		} );
	}

	async navigateToMenu( menu : IctuNavigation ) : Promise<void> {
		const parent : IctuNavigation | undefined = this.menus().find( ( m : IctuNavigation ) : boolean => !!m.child?.some( ( c : IctuNavigationItem ) : boolean => c.id === menu.id ) );
		const path : string[]                      = parent ? [ 'admin' , parent.id , menu.id ] : [ 'admin' , menu.id ];
		try {
			await this.router.navigate( path );
		} catch ( e ) {
			alert( e );
		}
		this.menuActivated.set( menu );
	}

	fireOutClick() : void {
		let current_url : string = this.location.path();
		const baseHref : string  = this.locationStrategy.getBaseHref();
		if ( baseHref ) {
			current_url = baseHref + this.location.path();
		}
		const link : string        = 'a.nav-link[ href=\'' + current_url + '\' ]';
		const ele : Element | null = document.querySelector( link );
		if ( ele !== null && ele !== undefined ) {
			const parent : HTMLElement | null                  = ele.parentElement;
			const up_parent : HTMLElement | null | undefined   = parent?.parentElement?.parentElement;
			const last_parent : HTMLElement | null | undefined = up_parent?.parentElement;
			if ( parent?.classList.contains( 'coded-hasmenu' ) ) {
				parent.classList.add( 'coded-trigger' );
				parent.classList.add( 'active' );
			} else if ( up_parent?.classList.contains( 'coded-hasmenu' ) ) {
				up_parent.classList.add( 'coded-trigger' );
				up_parent.classList.add( 'active' );
			} else if ( last_parent?.classList.contains( 'coded-hasmenu' ) ) {
				last_parent.classList.add( 'coded-trigger' );
				last_parent.classList.add( 'active' );
			}
		}
	}

	toggleMenu() : void {
		this.layoutService.toggleSideDrawer();
	}

	async showChildMenu( menu : IctuNavigation , event? : MouseEvent ) : Promise<void> {
		if ( event ) {
			event.preventDefault();
		}
		if ( this.collapsed() ) {
			this.collapsedMenuChild.set( menu );
		}
	}

	confirmSignOut() : void {
		this.notification.confirmSignOut();
	}

	mouseEnter( trigger : MatMenuTrigger , menu? : IctuNavigation , event? : MouseEvent ) : void {
		if ( menu ) {
			void this.showChildMenu( menu , event );
		}
		if ( this.timedOutCloser ) {
			clearTimeout( this.timedOutCloser );
		}
		this.openMenuTriggerOnHover( trigger );
	}

	mouseLeave( trigger : MatMenuTrigger ) : void {
		this.timedOutCloser = setTimeout( () : void => {
			trigger.closeMenu();
		} , 50 );
	}

	activeCurrentParent() : void {
		this.menuActivated.set( this.collapsedMenuChild() );
	}

	clickPreventDefault( event : MouseEvent ) : void {
		event.stopPropagation();
		event.preventDefault();
	}

}
