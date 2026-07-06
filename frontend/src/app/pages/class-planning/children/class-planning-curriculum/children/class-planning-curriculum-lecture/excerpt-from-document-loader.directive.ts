import { Directive , ElementRef , HostListener , inject , model , ModelSignal , OnDestroy } from '@angular/core';
import { CourseLessonPlanContentPageItemSlide , CourseLessonPlanContentPageItemSlideState } from '@models/course-lesson-plan';
import { Subject , takeUntil } from 'rxjs';
import { IctuFileService } from '@services/ictu-file.service';

@Directive( {
    selector : '[excerptFromDocumentLoader]'
} )
export class ExcerptFromDocumentLoaderDirective implements OnDestroy {

    excerptFromDocumentLoader : ModelSignal<CourseLessonPlanContentPageItemSlide> = model.required<CourseLessonPlanContentPageItemSlide>()

    private destroyed$ : Subject<void> = new Subject<void>();

    private elementRef : ElementRef<HTMLImageElement> = inject( ElementRef );

    private fileService : IctuFileService = inject( IctuFileService );

    @HostListener( 'excerptFromDocumentTrigger' ) onTrigger () : void {
        this.triggerEvent();
    }

    @HostListener( 'load' ) onLoad () : void {
        if ( this.excerptFromDocumentLoader() && [ 'loading' , 'error' ].includes( this.excerptFromDocumentLoader().state ) ) {
            this.changeState( 'loaded' );
        }
    }

    @HostListener( 'error' ) onError () : void {
        this.changeState( 'error' );
    }

    private triggerEvent () : void {
        if ( this.excerptFromDocumentLoader() && [ 'init' , 'error' ].includes( this.excerptFromDocumentLoader().state ) ) {
            this.changeState( 'loading' );
            this.fileService.getLinkMediaPdfPage( this.excerptFromDocumentLoader().fileID , this.excerptFromDocumentLoader().order ).pipe(
                takeUntil( this.destroyed$ )
            ).subscribe( {
                next  : ( src : string ) : void => {
                    this.elementRef.nativeElement.src = src;
                } ,
                error : () : void => {
                    this.changeState( 'error' );
                }
            } )
        }
    }

    private changeState ( state : CourseLessonPlanContentPageItemSlideState ) : void {
        this.excerptFromDocumentLoader.update( ( info : CourseLessonPlanContentPageItemSlide ) : CourseLessonPlanContentPageItemSlide => {
            info.state = state;
            return info;
        } );
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }

}
