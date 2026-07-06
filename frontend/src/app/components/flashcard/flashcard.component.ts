import { Component , computed , inject , input , InputSignal , OnDestroy , Signal } from '@angular/core';
import { Word } from '@models/word';
import { debounceTime , Subject } from 'rxjs';
import { SafeHtmlPipe } from '@pipes/safe-html.pipe';
import { IctuMediaLoaderDirective } from '@directives/ictu-media-loader.directive';
import { tokenGetter } from '@app/app.config';
import { IctuFileService } from '@services/ictu-file.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export type PickWord = Pick<Word , 'id' | 'title' | 'type' | 'audio' | 'define' | 'thumbnail' | 'transcription' | 'bacdaotao_ids'>;

@Component( {
	selector    : 'app-flashcard' ,
	standalone  : true ,
	imports     : [ SafeHtmlPipe , IctuMediaLoaderDirective ] ,
	templateUrl : './flashcard.component.html' ,
	styleUrl    : './flashcard.component.css'
} )
export class FlashcardComponent implements OnDestroy {

	word : InputSignal<PickWord> = input.required<PickWord>();

	private fileService : IctuFileService = inject( IctuFileService );

	private destroyed$ : Subject<void> = new Subject<void>();

	protected readonly audioSrc : Signal<string> = computed( () : string => {
		let src : string = '';
		if ( this.word()?.audio && this.word().audio.id ) {
			const url : URL = new URL( [ this.fileService.fileHostingServiceApi , 'file/' , this.word().audio.id ].join( '' ) );
			url.searchParams.set( 'token' , tokenGetter() );
			src = url.toString();
		}
		return src;
	} );

	private audio : HTMLAudioElement | null = null;

	private togglePlayObserver : Subject<HTMLAudioElement> = new Subject();

	constructor() {
		this.destroyed$.asObservable().subscribe( () : void => {
			if ( this.audio ) {
				this.audio.pause();
				this.audio.remove();
			}
		} );

		this.togglePlayObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 )
		).subscribe( ( audio : HTMLAudioElement ) : void => {
			void this.togglePlay( audio );
		} );
	}

	private async togglePlay( audio : HTMLAudioElement ) : Promise<void> {
		try {
			if ( audio.paused ) {
				await this.audio.play();
			} else {
				this.audio.pause();
			}
		} catch ( e ) {
			console.log( e );
		}
	}

	private createAudio() : HTMLAudioElement {
		if ( !this.audio ) {
			this.audio = new Audio( this.audioSrc() );
		}
		return this.audio;
	}

	protected btnPlayAudio( event : MouseEvent ) : void {
		event.stopPropagation();
		event.preventDefault();
		this.togglePlayObserver.next( this.createAudio() );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
