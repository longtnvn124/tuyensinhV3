import { Component , computed , inject , OnDestroy , OnInit , Signal , signal , WritableSignal } from '@angular/core';
import { Subject } from 'rxjs';
import { SysRoleName } from '@models/role';
import { AppState } from '@models/app-state';
import { AuthenticationService } from '@services/authentication.service';
import { ActivatedRoute , Router } from '@angular/router';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButton } from '@angular/material/button';
import { IctuBankModule } from '@module/ictu-bank/ictu-bank.module';

export interface BankEditorQueryParams {
    bankID : number;
    userID : number;
    donViID : number;
    role : SysRoleName;
}

@Component( {
    selector    : 'app-bank-editor' ,
    imports     : [ LoadingProgressComponent , MatButton , IctuBankModule ] ,
    templateUrl : './bank-editor.component.html' ,
    styleUrl    : './bank-editor.component.css'
} )
export default class BankEditorComponent implements OnInit , OnDestroy {

    state : WritableSignal<AppState | 'unauthorized'> = signal<AppState | 'unauthorized'>( 'unauthorized' );

    private auth : AuthenticationService = inject( AuthenticationService );

    private activatedRoute : ActivatedRoute = inject( ActivatedRoute );

    private router : Router = inject( Router );

    private destroyed$ : Subject<void> = new Subject<void>();

    private readonly donViID : Signal<number> = signal<number>( this.auth.user.donvi_id );

    private readonly userID : Signal<number> = signal<number>( this.auth.user.id );

    protected readonly bankID : Signal<number> = computed( () : number => this.queryParams()?.bankID ?? 0 );

    private readonly queryParams : WritableSignal<BankEditorQueryParams> = signal( null );

    constructor () {
        toObservable( this.queryParams ).pipe(
            takeUntilDestroyed() ,
            filter( Boolean )
        ).subscribe( () : void => {
            this.state.set( 'success' );
        } )
    }

    ngOnInit () : void {
        const queryParams : BankEditorQueryParams = this.activatedRoute.snapshot.queryParamMap.has( 'hashcode' ) ? this.decryptCode( this.activatedRoute.snapshot.queryParamMap.get( 'hashcode' ) ) : null;
        if ( this.validateQueryParams( queryParams ) ) {
            this.queryParams.set( queryParams );
        }
        else {
            this.state.set( 'unauthorized' );
        }
    }

    private decryptCode ( hashcode : string ) : BankEditorQueryParams {
        if ( hashcode ) {
            try {
                const decryptedText : string = this.auth.decrypt( hashcode );
                return decryptedText ? Object.assign<BankEditorQueryParams , any>( { userID : 0 , bankID : 0 , donViID : 0 , role : 'training_management' } , JSON.parse( decryptedText ) ) : null;
            }
            catch ( e ) {
                return null;
            }
        }
        return null;
    }

    private validateQueryParams ( queryParams : BankEditorQueryParams ) : boolean {
        return ! ( ! queryParams || queryParams.donViID !== this.donViID() || queryParams.userID !== this.userID() );
    }

    protected reload ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        // this.loadData( this.courseID() );
    }

    protected backToBankList () : void {
        switch ( this.queryParams().role ) {
            case 'training_management':
                void this.router.navigateByUrl( '/admin/training-management/banks' );
                break;
            default:
                void this.router.navigateByUrl( '/admin' );
                break;
        }
    }

    protected onBankFormClosed ( dirty : boolean ) : void {
        this.backToBankList();
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
