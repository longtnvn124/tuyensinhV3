import { Component , forwardRef , signal , WritableSignal } from '@angular/core';
import { ControlValueAccessor , FormsModule , NG_VALUE_ACCESSOR } from '@angular/forms';
import { ClassMediaCriteriaScores } from '@models/class-media';
import { InputText } from 'primeng/inputtext';
import { MatSlider , MatSliderThumb } from '@angular/material/slider';
import { MatButton } from '@angular/material/button';
import { Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { isArray } from 'lodash-es';

@Component( {
	selector    : 'ictu-criteria-scores-control' ,
	standalone  : true ,
	imports     : [ InputText , MatSlider , MatSliderThumb , FormsModule , MatButton ] ,
	providers   : [ {
		provide     : NG_VALUE_ACCESSOR ,
		useExisting : forwardRef( () : typeof IctuCriteriaScoresControlComponent => IctuCriteriaScoresControlComponent ) ,
		multi       : true
	} ] ,
	templateUrl : './ictu-criteria-scores-control.component.html' ,
	styleUrl    : './ictu-criteria-scores-control.component.css'
} )
export class IctuCriteriaScoresControlComponent implements ControlValueAccessor {

	value : WritableSignal<ClassMediaCriteriaScores[]> = signal( [] );

	readonly disabled : WritableSignal<boolean> = signal( false );

	private onChangeFn : ( _ : any ) => void = ( _ : any ) : void => {
	};

	private onTouchedFn : () => void = () : void => {
	};

	private addNewItemObserver : Subject<number> = new Subject();

	private section : WritableSignal<number> = signal( 0 );

	constructor() {
		this.addNewItemObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this.addNewItem();
		} );
	}

	registerOnChange( fn : any ) : void {
		this.onChangeFn = fn;
	}

	registerOnTouched( fn : any ) : void {
		this.onTouchedFn = fn;
	}

	setDisabledState( isDisabled : boolean ) : void {
		this.disabled.set( isDisabled );
	}

	writeValue( value : ClassMediaCriteriaScores[] ) : void {
		this.value.set( isArray( value ) ? value : [] );
	}

	protected triggerChanges() : void {
		this.onChangeFn( this.value() );
		this.onTouchedFn();
	}

	formatLabel( value : number ) : string {
		if ( value >= 1000 ) {
			return Math.round( value / 1000 ) + 'k';
		}
		return `${ value }`;
	}

	protected btnAddItem() : void {
		this.addNewItemObserver.next( this.section() );
	}

	private increaseSection() : void {
		this.section.update( ( previousSection : number ) : number => 1 + previousSection );
	}

	private addNewItem() : void {
		this.value.update( ( oldValue : ClassMediaCriteriaScores[] ) : ClassMediaCriteriaScores[] => ( [ ... oldValue , { score : 0 , criteria : '' } ] ) );
		this.triggerChanges();
		this.increaseSection();
	}

	protected btnRemoveItem( indexItem : number ) : void {
		this.value.update( ( oldValue : ClassMediaCriteriaScores[] ) : ClassMediaCriteriaScores[] => oldValue.filter( ( _ : ClassMediaCriteriaScores , index : number ) : boolean => index !== indexItem ) );
		this.triggerChanges();
	}
}
