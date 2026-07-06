import { Component , OnDestroy , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { CollapseState } from "@theme/directives/collapse.directive";
import { CollapsePanelComponent } from "@theme/components/collapse-panel.component";
import { takeUntilDestroyed , toObservable } from "@angular/core/rxjs-interop";
import { map , Subject , takeUntil } from "rxjs";

@Component( {
	selector    : 'app-student-dashboard' ,
	imports     : [
		CollapsePanelComponent
	] ,
	templateUrl : './student-dashboard.html' ,
	styleUrl    : './student-dashboard.css'
} )
export default class StudentDashboard implements OnDestroy {

	readonly btnDetailLabel : WritableSignal<string> = signal( 'Chi tiết' );

	private readonly detailPanel : Signal<CollapsePanelComponent> = viewChild<CollapsePanelComponent>( 'collapseMenu' );

	private destroyed$ : Subject<void> = new Subject<void>();

	constructor () {
		toObservable( this.detailPanel ).pipe(
			takeUntilDestroyed()
		).subscribe( ( panel : CollapsePanelComponent ) : void => {
			panel.panel.collapseState.pipe(
				map( ( state : CollapseState ) : string => state === 'open' ? 'Thu gọn' : 'Chi tiết' ) ,
				takeUntil( this.destroyed$ )
			).subscribe( ( btnLabel : string ) : void => {
				this.btnDetailLabel.set( btnLabel );
			} );
		} );
	}

	btnDetailsToggle () : void {
		this.detailPanel().panel.toggle();
	}

	ngOnDestroy () : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}

}
