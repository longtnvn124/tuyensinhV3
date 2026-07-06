import { Component , computed , model , ModelSignal , OnDestroy , OnInit , output , OutputEmitterRef , Signal , signal , WritableSignal } from '@angular/core';
import { Subject } from 'rxjs';
import { LibraryFolder } from '@models/library';
import { IctuLibraryFolder } from '@components/ictu-library/ictu-library.component';
import { IlFilterRootFolderPipe } from '@components/ictu-library/pipes/il-filter-root-folder.pipe';

@Component( {
	selector    : 'app-library-folder-tree' ,
	standalone  : true ,
	imports : [
		IlFilterRootFolderPipe
	] ,
	templateUrl : './library-folder-tree.component.html' ,
	styleUrl    : './library-folder-tree.component.css'
} )
export class LibraryFolderTreeComponent implements OnInit , OnDestroy {
	
	folders : ModelSignal<IctuLibraryFolder[]> = model.required<IctuLibraryFolder[]>();
	
	deleteFolder : OutputEmitterRef<LibraryFolder> = output<LibraryFolder>();
	renameFolder : OutputEmitterRef<LibraryFolder> = output<LibraryFolder>();
	createFolder : OutputEmitterRef<LibraryFolder> = output<LibraryFolder>();
	folderSelect : OutputEmitterRef<number>        = output<number>();
	
	private destroyed$ : Subject<void> = new Subject<void>();
	
	private session : WritableSignal<number> = signal( 0 );
	
	constructor() {
	
	}
	
	ngOnInit() : void {
	
	}
	
	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
	
}
