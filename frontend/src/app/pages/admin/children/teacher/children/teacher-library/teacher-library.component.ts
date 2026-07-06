import { Component , inject , signal , WritableSignal } from '@angular/core';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { User } from '@models/user';
import { AuthenticationService } from '@services/authentication.service';
import { filter , take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IctuLibraryComponent } from '@components/ictu-library/ictu-library.component';

type TeacherLibraryInfo = Pick<User , 'id' | 'donvi_id'>

@Component( {
    selector    : 'app-teacher-library' ,
    standalone  : true ,
    imports : [ LoadingProgressComponent , IctuLibraryComponent ] ,
    templateUrl : './teacher-library.component.html' ,
    styleUrl    : './teacher-library.component.css'
} )
export default class TeacherLibraryComponent {

    protected readonly user : WritableSignal<TeacherLibraryInfo> = signal( null );

    private auth : AuthenticationService = inject( AuthenticationService );

    constructor() {
        this.auth.onUserSetup.pipe(
            takeUntilDestroyed() ,
            filter( Boolean ) ,
            take( 1 )
        ).subscribe( ( { id , donvi_id } : User ) : void => {
            this.user.set( { id , donvi_id } );
        } );
    }

}
