import { Component , ElementRef , input , InputSignal , Signal , viewChild } from '@angular/core';
import { getClientResource } from '@utilities/helper';
import { toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { ParentClassLessonChildComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/model/parent-class-lesson-child-component';
import { PublicClassLessonPlanContentItem } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/model/public-class-lesson-plan-content-item';

@Component( {
	selector    : 'parent-class-lesson-preview-text' ,
	imports     : [] ,
	templateUrl : './parent-class-lesson-preview-text.component.html' ,
	styleUrl    : './parent-class-lesson-preview-text.component.css'
} )
export class ParentClassLessonPreviewTextComponent implements ParentClassLessonChildComponent {

	classLessonPlanContentItem : InputSignal<PublicClassLessonPlanContentItem> = input.required();

	iframe : Signal<ElementRef<HTMLIFrameElement>> = viewChild( 'iframe' );

	constructor() {
		toObservable( this.iframe ).pipe(
			distinctUntilChanged()
		).subscribe( ( tag : ElementRef<HTMLIFrameElement> ) : void => {
			const iframe : HTMLIFrameElement = tag.nativeElement;
			iframe.srcdoc                    = `<!DOCTYPE html><html><head><link type="text/css" rel="stylesheet" href="${ getClientResource( 'tinymce/skins/ui/oxide/content.min.css' ) }"><link type="text/css" rel="stylesheet" href="${ getClientResource( 'tinymce/skins/content/default/content.min.css' ) }"><style type="text/css">body { font-family: times new roman, times;font-size: 18px;line-height: 1.4; margin: 0;} body p {margin-block-start: 0;margin-block-end: 10px;} body> *:first-child{ margin-top: 0;} body> *:last-child{ margin-bottom: 0;} .text-secondary{ color: rgb(108, 117, 125);}</style></head><body id="tinymce" class="mce-content-body ">${ this.classLessonPlanContentItem().content || '<p class="text-secondary">...</p>' }</body></html>`;
			iframe.onload                    = () : void => {
				this.resizeIframe( iframe );
			};
		} );
	}

	private resizeIframe( iframe : HTMLIFrameElement ) : void {
		const doc : Document = iframe.contentDocument;

		if ( !doc?.body ) {
			return;
		}

		const height : number = Math.max(
			doc.body.scrollHeight ,
			doc.documentElement.scrollHeight
		);

		iframe.style.height = `${ height + 5 }px`;
	}
}
