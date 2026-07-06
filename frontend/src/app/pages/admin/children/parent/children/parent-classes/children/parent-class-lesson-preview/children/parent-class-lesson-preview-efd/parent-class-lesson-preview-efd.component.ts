import { Component , computed , inject , input , InputSignal , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { FlipBookComponent } from '@theme/components/flip-book.component';
import { IctuFileService } from '@services/ictu-file.service';
import { Subject , takeUntil } from 'rxjs';
import { ParentClassLessonChildComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/model/parent-class-lesson-child-component';
import { PublicClassLessonPlanContentItem } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/model/public-class-lesson-plan-content-item';
import { CourseLessonPlanContentPageItem } from '@models/course-lesson-plan';
import { AppState } from '@models/app-state';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { assign , isNumber } from 'lodash-es';

@Component( {
	selector    : 'parent-class-lesson-preview-efd' ,
	imports     : [ FlipBookComponent ] ,
	templateUrl : './parent-class-lesson-preview-efd.component.html' ,
	styleUrl    : './parent-class-lesson-preview-efd.component.css'
} )
export class ParentClassLessonPreviewEfdComponent implements OnDestroy , ParentClassLessonChildComponent {

	classLessonPlanContentItem : InputSignal<PublicClassLessonPlanContentItem> = input.required();

	private readonly page : Signal<CourseLessonPlanContentPageItem> = computed( () : CourseLessonPlanContentPageItem => {
		return this.classLessonPlanContentItem()?.page || null;
	} );

	protected readonly images : WritableSignal<string[]> = signal( [] );

	private fileService : IctuFileService = inject( IctuFileService );

	private loadDataObserver : Subject<number> = new Subject<number>();

	private destroyed$ : Subject<void> = new Subject();

	protected readonly state : WritableSignal<AppState> = signal( 'loading' );

	private readonly session : WritableSignal<number> = signal( 0 );

	constructor() {
		this.loadDataObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this.validateInfo();
		} );

		toObservable( this.page ).pipe(
			takeUntilDestroyed()
		).subscribe( () : void => {
			this.reloadImages();
		} );
	}

	private reloadImages() : void {
		this.loadDataObserver.next( this.session() );
	}

	private validateInfo() : void {
		const { id_file , end , start } : CourseLessonPlanContentPageItem = assign<CourseLessonPlanContentPageItem , CourseLessonPlanContentPageItem>( { id_file : 0 , end : 0 , start : 0 } , this.page() );
		if ( isNumber( id_file ) && isNumber( start ) && isNumber( end ) && id_file && start && end ) {
			this.state.set( 'loading' );
			this._loadImages( this.page() );
		} else {
			this.images.set( [] );
			this.state.set( 'success' );
		}
	}

	private _loadImages( { id_file , end , start } : CourseLessonPlanContentPageItem ) : void {
		const pages : number[] = Array.from( { length : end - start + 1 } , ( _ : unknown , i : number ) : number => start + i );
		this.fileService.getMultiMediaPdfPage( id_file , pages ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( response : string[] ) : void => {
				this.images.set( response );
				this.state.set( 'success' );
				this.increaseSession();
			} ,
			error : () : void => {
				this.state.set( 'error' );
				this.increaseSession();
			}
		} );
	}

	private increaseSession() : void {
		this.session.update( ( value : number ) : number => 1 + value );
	}

	protected btnReload( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.reloadImages();
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
