import { Component , input , InputSignal , signal , WritableSignal } from '@angular/core';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';

@Component( {
	selector    : 'app-class-progress-calculator' ,
	templateUrl : './class-progress-calculator.component.html' ,
	styleUrl    : './class-progress-calculator.component.css'
} )
export class ClassProgressCalculatorComponent {

	value : InputSignal<number> = input.required<number>();

	readonly progress : WritableSignal<number> = signal( 0 );

	constructor() {
		toObservable( this.value ).pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 )
		).subscribe( ( value : number ) : void => {
			this.progress.set( Math.max( 0 , Math.min( value , 100 ) ) );
		} );
	}
}
