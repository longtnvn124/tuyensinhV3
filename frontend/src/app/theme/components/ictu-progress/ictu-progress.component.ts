import { Component , computed , inject , Signal , signal , WritableSignal } from '@angular/core';
import { MAT_DIALOG_DATA , MatDialogRef } from '@angular/material/dialog';
import { ProgressAnimationConfig , ProgressAnimationControl } from '@services/notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface IctuProgressComponentConfig {
	eventControl : ProgressAnimationControl,
	heading : string
}

@Component( {
	selector    : 'app-ictu-progress' ,
	imports     : [] ,
	templateUrl : './ictu-progress.component.html' ,
	styleUrl    : './ictu-progress.component.css'
} )
export class IctuProgressComponent {
	
	private readonly dialogRef : MatDialogRef<IctuProgressComponent , void> = inject<MatDialogRef<IctuProgressComponent , void>>( MatDialogRef );
	
	private readonly data : IctuProgressComponentConfig = inject<IctuProgressComponentConfig>( MAT_DIALOG_DATA );
	
	protected readonly percent : Signal<number> = computed( () : number => Math.max( Math.min( 100 , this.config().percent ) , 0 ) );
	
	protected readonly heading : Signal<string> = computed( () : string => this.config().heading );
	
	private readonly config : WritableSignal<ProgressAnimationConfig> = signal( {
		disabled : false ,
		heading  : this.data.heading || '' ,
		percent  : 0
	} );
	
	constructor() {
		this.data.eventControl.pipe(
			takeUntilDestroyed()
		).subscribe( {
			next     : ( event : Partial<ProgressAnimationConfig> ) : void => {
				if ( event.disabled ) {
					this.close();
				} else {
					this.config.update( ( value : ProgressAnimationConfig ) : ProgressAnimationConfig => {
						return { ... Object.assign( value , event ) };
					} );
				}
			} ,
			error    : () : void => {
				this.close();
			} ,
			complete : () : void => {
				this.close();
			}
		} );
	}
	
	private close() : void {
		if ( this.dialogRef ) {
			this.dialogRef.close();
		}
	}
	
}
