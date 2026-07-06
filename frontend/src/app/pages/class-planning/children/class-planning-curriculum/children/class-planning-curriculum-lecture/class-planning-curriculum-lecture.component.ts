import { Component , input , InputSignal , OnDestroy , signal , Signal , viewChild } from '@angular/core';
import { ClassLessonLectureContent } from '@pages/class-planning/children/class-planning-curriculum/class-planning-curriculum.component';
import { SafeHtmlPipe } from '@pipes/safe-html.pipe';
import { Tooltip } from 'primeng/tooltip';
import { CourseLessonMediaDecodePipe } from '@pages/class-planning/children/class-planning-curriculum/children/class-planning-curriculum-lecture/course-lesson-media-decode.pipe';
import { ClassCurriculumLectureMediaVideoComponent } from '@components/class-curriculums/class-curriculum-lecture-media-video/class-curriculum-lecture-media-video.component';
import { ClassCurriculumLectureMediaAudioComponent } from '@components/class-curriculums/class-curriculum-lecture-media-audio/class-curriculum-lecture-media-audio.component';
import { ClassCurriculumLectureMediaPictureComponent } from '@components/class-curriculums/class-curriculum-lecture-media-picture/class-curriculum-lecture-media-picture.component';
import { ClassCurriculumLectureMediaDocumentComponent } from '@components/class-curriculums/class-curriculum-lecture-media-document/class-curriculum-lecture-media-document.component';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { Class } from '@models/class';
import { Course } from '@models/course';
import { ClassPlanningRole } from '@pages/class-planning/class-planning.component';
import { Carousel } from 'primeng/carousel';
import { debounceTime , merge , of , Subject , takeUntil } from 'rxjs';
import { ExcerptFromDocumentToSlidesPipe } from '@pages/class-planning/children/class-planning-curriculum/children/class-planning-curriculum-lecture/excerpt-from-document-to-slides.pipe';
import { ExcerptFromDocumentLoaderDirective } from '@pages/class-planning/children/class-planning-curriculum/children/class-planning-curriculum-lecture/excerpt-from-document-loader.directive';
import { MatTooltip } from '@angular/material/tooltip';
import { CourseLessonPlanContentPageItemSlide } from '@models/course-lesson-plan';

@Component( {
    selector    : 'class-planning-curriculum-lecture' ,
    standalone  : true ,
    imports     : [ SafeHtmlPipe , Tooltip , CourseLessonMediaDecodePipe , ClassCurriculumLectureMediaVideoComponent , ClassCurriculumLectureMediaAudioComponent , ClassCurriculumLectureMediaPictureComponent , ClassCurriculumLectureMediaDocumentComponent , Carousel , ExcerptFromDocumentToSlidesPipe , ExcerptFromDocumentLoaderDirective , MatTooltip ] ,
    templateUrl : './class-planning-curriculum-lecture.component.html' ,
    styleUrls   : [ '../../class-planning-curriculum.component.css' , './class-planning-curriculum-lecture.component.css' ]
} )
export class ClassPlanningCurriculumLectureComponent implements OnDestroy {

    lecture : InputSignal<ClassLessonLectureContent[]> = input.required<ClassLessonLectureContent[]>();

    class : InputSignal<Class> = input.required<Class>();

    course : InputSignal<Course> = input.required<Course>();

    role : InputSignal<ClassPlanningRole> = input.required<ClassPlanningRole>();

    readonly teacherAvatar : Signal<string> = signal( '' );

    responsiveOptions = [
        {
            breakpoint : '1400px' ,
            numVisible : 4 ,
            numScroll  : 1
        } ,
        {
            breakpoint : '1199px' ,
            numVisible : 3 ,
            numScroll  : 1
        } ,
        {
            breakpoint : '767px' ,
            numVisible : 2 ,
            numScroll  : 1
        } ,
        {
            breakpoint : '575px' ,
            numVisible : 1 ,
            numScroll  : 1
        }
    ];

    slides = [ 1 , 2 , 3 , 4 , 5 , 6 , 7 , 8 , 9 , 10 ];

    readonly slide : Signal<Carousel> = viewChild<Carousel>( Carousel );

    private destroyed$ : Subject<void> = new Subject();

    private resetCarouselObserver : Subject<void> = new Subject();

    constructor () {
        toObservable( this.slide ).pipe(
            takeUntilDestroyed()
        ).subscribe( ( _carousel : Carousel ) : void => {
            this.registerCarouselEvents( _carousel );
        } )
    }

    private registerCarouselEvents ( carousel : Carousel ) : void {
        this.resetCarouselObserver.next();
        if ( carousel ) {
            merge<[ any , any ]>(
                of( '' ) ,
                carousel.onPage.asObservable()
            ).pipe(
                takeUntil( merge( this.resetCarouselObserver , this.destroyed$ ) ) ,
                debounceTime( 100 )
            ).subscribe( () : void => {
                const wrapper : HTMLDivElement = carousel.el.nativeElement;
                wrapper.querySelectorAll( '.p-carousel-item-active .class-planning-curriculum-lecture__efd-section__slide__img' ).forEach( ( element : HTMLImageElement ) : void => {
                    const myEvent = new CustomEvent( 'excerptFromDocumentTrigger' , {
                        detail     : {} ,
                        bubbles    : false , // Allows the event to bubble up through the DOM
                        cancelable : true // Allows the event to be cancelable using preventDefault()
                    } );
                    element.dispatchEvent( myEvent );
                } )
            } );
        }
    }

    btnReloadImage ( slide : CourseLessonPlanContentPageItemSlide ) : void {
        slide.state = 'loading';
    }

    onImageLoad ( slide : CourseLessonPlanContentPageItemSlide ) : void {
        slide.state = slide.state === 'loading' ? 'loaded' : slide.state;
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
