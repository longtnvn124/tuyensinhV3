import { Component , inject , OnDestroy , signal , Signal , WritableSignal } from '@angular/core';
import { AuthenticationService } from '@services/authentication.service';
import { PickRole } from '@models/role';
import { DatePicker } from 'primeng/datepicker';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { NgScrollbar } from 'ngx-scrollbar';
import { AppState } from '@models/app-state';
import { Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { AcademicReportComponent } from "@app/components/academic-report/academic-report.component";

@Component( {
    selector    : 'app-review-and-approval-contents' ,
    imports: [FormsModule, AcademicReportComponent] ,
    templateUrl : './review-and-approval-contents.component.html' ,
    styleUrl    : './review-and-approval-contents.component.css'
} )
export default class ReviewAndApprovalContentsComponent implements OnDestroy {

    private readonly auth : AuthenticationService = inject( AuthenticationService );

    protected readonly isModMedia : Signal<boolean> = signal<boolean>( this.auth.roles.some( ( i : PickRole ) : boolean => i.name === 'mod_media' ) );

    protected readonly isModComments : Signal<boolean> = signal<boolean>( this.auth.roles.some( ( i : PickRole ) : boolean => i.name === 'mod_comments' ) );

    protected readonly state : WritableSignal<AppState> = signal<AppState>( 'loading' );

    private destroyed$ : Subject<void> = new Subject<void>();

    protected readonly filterByDate : WritableSignal<Date> = signal( new Date() );

    protected data : WritableSignal<any[]> = signal( [] );

    constructor () {
        toObservable( this.filterByDate ).pipe(
            takeUntilDestroyed()
        ).subscribe( () : void => {
            this.loadData();
        } )
    }

    private loadData () : void {
        this.state.set( 'loading' );
    }

    protected reload ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.loadData();
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
