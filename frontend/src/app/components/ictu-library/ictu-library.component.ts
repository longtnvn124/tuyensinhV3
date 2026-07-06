import { Component , inject , input , InputSignal , OnDestroy , OnInit , signal , WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute , ParamMap , Router , RouterModule } from '@angular/router';
import { map , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { v4 as uuid4 } from 'uuid';
import { AppState } from '@models/app-state';
import { IctuDataTable } from '@models/datatable';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { LibraryFile , LibraryFolder , LibraryDisplayItem , LibraryFilters , LibraryItemType } from '@models/library';
import { LibraryService } from '@services/library.service';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { IctuFileService } from '@services/ictu-file.service';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { FormatBytesPipe } from '@pipes/format-bytes.pipe';
import { SafeUrlPipe } from '@pipes/safe-url.pipe';
import { InputText } from 'primeng/inputtext';
import { NgScrollbar } from 'ngx-scrollbar';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { IctuFile , IctuFolder } from '@models/file';
import { LibraryFolderTreeComponent } from '@components/ictu-library/components/library-folder-tree/library-folder-tree.component';
import { map as _map } from 'lodash-es';
import dayjs from '@setup/dayjs';

interface Breadcrumb {
	id : number;
	name : string;
}

type IctuLibraryButtonEventName = 'createFolder' | 'deleteFolder' | 'editFolder' | 'callFilePicker';

interface IctuLibraryButtonEvent {
	name : IctuLibraryButtonEventName;
	object : IctuFile;
}

export interface IctuLibraryFolder extends Pick<IctuFolder , 'id' | 'parent_id' | 'name' | 'title' | 'type' | 'user_id'> {
	isOpened : boolean;
	depth : number;
}

function calculateDepth( menu : IctuLibraryFolder , menuMap : Map<number , IctuLibraryFolder> , visited = new Set<number>() ) : number {
	
	if ( menu.depth >= 0 ) {
		return menu.depth;
	}
	
	if ( visited.has( menu.id ) ) {
		throw new Error( `Circular reference detected at menu ${ menu.id }` );
	}
	
	visited.add( menu.id );
	
	if ( menu.parent_id === 0 ) {
		menu.depth = 0;
		return 0;
	}
	
	const parent : IctuLibraryFolder = menuMap.get( menu.parent_id );
	
	if ( !parent ) {
		throw new Error( `Parent menu ${ menu.parent_id } not found` );
	}
	
	menu.depth = calculateDepth( parent , menuMap , visited ) + 1;
	
	visited.delete( menu.id );
	
	return menu.depth;
}

@Component( {
	selector    : 'app-ictu-library' ,
	standalone  : true ,
	imports     : [ CommonModule , FormsModule , RouterModule , MatInputModule , LoadingProgressComponent , InputText , MatTooltip , FormatBytesPipe , SafeUrlPipe , NgScrollbar , LibraryFolderTreeComponent ] ,
	templateUrl : './ictu-library.component.html' ,
	styleUrl    : './ictu-library.component.css'
} )
export class IctuLibraryComponent implements OnInit , OnDestroy {
	
	userId : InputSignal<number> = input.required();
	
	donviId : InputSignal<number> = input.required();
	
	private auth : AuthenticationService       = inject( AuthenticationService );
	private libraryService : LibraryService    = inject( LibraryService );
	private fileService : IctuFileService      = inject( IctuFileService );
	private notification : NotificationService = inject( NotificationService );
	private router : Router                    = inject( Router );
	private route : ActivatedRoute             = inject( ActivatedRoute );
	private dialog : MatDialog                 = inject( MatDialog );
	
	state : WritableSignal<AppState | 'undefined' | 'createPersonalStoragePartition'> = signal<AppState>( 'loading' );
	search : WritableSignal<string>                                                   = signal( '' );
	typeFilter : WritableSignal<string>                                               = signal( 'all' );
	
	// ── Folder data ──
	folders : LibraryFolder[]      = [];
	activeFolderId : number | null = null;
	breadcrumb : Breadcrumb[]      = [ { id : 0 , name : 'Thư viện' } ];
	
	// ── Display items (merged folders + files) ──
	displayItems : LibraryDisplayItem[]         = [];
	filteredDisplayItems : LibraryDisplayItem[] = [];
	
	// ── Pagination via IctuDataTable ──
	dataTable : IctuDataTable<LibraryDisplayItem> = new IctuDataTable<LibraryDisplayItem>();
	
	private _temp : { paged : number; resetPaginator : boolean } = {
		paged          : 1 ,
		resetPaginator : true
	};
	
	private destroyed$ : Subject<void> = new Subject<void>();
	
	protected readonly parentID : WritableSignal<number> = signal( 0 );
	
	protected folders2 : WritableSignal<IctuLibraryFolder[]> = signal( [] );
	
	private session : WritableSignal<number> = signal( 0 );
	
	private createPersonalStoragePartitionObserver : Subject<number> = new Subject<number>();
	
	constructor() {
		toObservable<number>( this.parentID ).pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( ( id : number ) : void => {
			console.log( id );
		} );
		
		this.createPersonalStoragePartitionObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this.startCreatingPersonalStoragePartition();
		} );
	}
	
	ngOnInit() : void {
		// this.route.paramMap.pipe(
		//     takeUntil( this.destroyed$ )
		// ).subscribe( ( params : ParamMap ) : void => {
		//     const folderIdParam : string = params.get( 'folderId' );
		//     this.activeFolderId          = folderIdParam ? Number( folderIdParam ) : null;
		//     this.loadData( 1 , true );
		// } );
		
		this.loadFolders();
	}
	
	private loadFolders() : void {
		this.state.set( 'loading' );
		const queryParams : IctuQueryParams = {
			select : 'id,parent_id,name,title,type,user_id'
		};
		this.fileService.loadFolders( queryParams ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( folders : IctuFolder[] ) : void => {
				console.log( folders );
				if ( folders.length ) {
					
					
					// this.folders2.set( [ {
					// 	user_id   : this.userId() ,
					// 	type      : 'folder' ,
					// 	name      : uuid4() ,
					// 	parent_id : 0 ,
					// 	id        : 0 ,
					// 	isOpened  : true ,
					// 	title     : 'Library' ,
					// 	depth     : 0
					// } , ... _map<IctuFolder , IctuLibraryFolder>( folders , ( { id , parent_id , name , title , type , user_id } : IctuFolder ) : IctuLibraryFolder => ( { id , parent_id , name , title , type , user_id , isOpened : false , depth : -1 } ) ) ] );
					
					const libraryFolder : IctuLibraryFolder[]                = _map<IctuFolder , IctuLibraryFolder>( folders , ( { id , parent_id , name , title , type , user_id } : IctuFolder ) : IctuLibraryFolder => ( { id , parent_id , name , title , type , user_id , isOpened : false , depth : -1 } ) );
					const libraryFolderMap : Map<number , IctuLibraryFolder> = libraryFolder.reduce( ( reducer : Map<number , IctuLibraryFolder> , _folder : IctuLibraryFolder ) : Map<number , IctuLibraryFolder> => {
						reducer.set( _folder.id , _folder );
						return reducer;
					} , new Map<number , IctuLibraryFolder> );
					this.folders2.set( _map<IctuLibraryFolder , IctuLibraryFolder>( libraryFolder , ( _iFolder : IctuLibraryFolder ) : IctuLibraryFolder => ( { ... _iFolder , depth : calculateDepth( _iFolder , libraryFolderMap ) } ) ) );
					console.log( this.folders2() );
					this.state.set( 'success' );
				} else {
					this.state.set( 'undefined' );
				}
			} ,
			error : () : void => {
				this.state.set( 'error' );
			}
		} );
	}
	
	loadData( paged : number = 1 , resetPaginator : boolean = true ) : void {
		// this.state.set( 'loading' );
		// this._temp = { paged , resetPaginator };
		//
		// // Load folders for the tree
		// this.libraryService.loadAllFolders( this.donviId() , this.userId() ).pipe( takeUntil( this.destroyed$ ) ).subscribe( {
		//     next  : ( folders : LibraryFolder[] ) : void => {
		//         this.folders = folders;
		//         this.state.set( 'success' );
		//     } ,
		//     error : () : void => {
		//         this.folders = [];
		//         this.state.set( 'success' );
		//     }
		// } );
		//
		// return;
		//
		// // Load files in current folder
		// const filters : LibraryFilters = {
		//     search     : this.search().trim() || undefined ,
		//     typeFilter : this.typeFilter() === 'all' ? undefined : ( this.typeFilter() as any )
		// };
		//
		// if ( this.activeFolderId !== null ) {
		//     this.libraryService.loadFiles( this.activeFolderId , this.donviId() , 1 , 9999 , filters ).pipe(
		//         takeUntil( this.destroyed$ )
		//     ).subscribe( {
		//         next  : ( response : DtoObject<LibraryFile[]> ) : void => {
		//             this.processLoadedData( response.data , resetPaginator , paged );
		//         } ,
		//         error : () : void => {
		//             this.state.set( 'error' );
		//         }
		//     } );
		// } else {
		//     // Root level: load root files + root folders
		//     this.libraryService.loadRootFiles( this.donviId() , 1 , 9999 , filters ).pipe(
		//         takeUntil( this.destroyed$ )
		//     ).subscribe( {
		//         next  : ( response : DtoObject<LibraryFile[]> ) : void => {
		//             this.processLoadedData( response.data , resetPaginator , paged );
		//         } ,
		//         error : () : void => {
		//             this.state.set( 'error' );
		//         }
		//     } );
		// }
		
		this.buildBreadcrumb();
	}
	
	private processLoadedData( files : LibraryFile[] , resetPaginator : boolean , paged : number ) : void {
		// Merge folders and files into display items
		this.displayItems = this.buildDisplayItems( files );
		this.applyClientSideFilters();
		
		if ( resetPaginator ) {
			this.dataTable.paginator.setupPaginator( {
				data            : this.filteredDisplayItems ,
				recordsFiltered : this.filteredDisplayItems.length ,
				recordsTotal    : this.filteredDisplayItems.length ,
				draw            : 1
			} as any );
			this.dataTable.fillData( this.filteredDisplayItems.slice( 0 , this.dataTable.paginator.rows() ) );
		} else {
			this.dataTable.paginator.changePage( paged );
			this.dataTable.fillData( this.filteredDisplayItems );
		}
		this.state.set( 'success' );
	}
	
	private buildDisplayItems( files : LibraryFile[] ) : LibraryDisplayItem[] {
		const items : LibraryDisplayItem[] = [];
		
		// Add root-level folders (when at root) or sibling folders
		if ( this.activeFolderId === null ) {
			const rootFolders = this.folders.filter( f => f.parent_id === null );
			for ( const folder of rootFolders ) {
				items.push( this.folderToDisplayItem( folder ) );
			}
		} else {
			const childFolders = this.folders.filter( f => f.parent_id === this.activeFolderId );
			for ( const folder of childFolders ) {
				items.push( this.folderToDisplayItem( folder ) );
			}
		}
		
		// Add files
		for ( const file of files ) {
			items.push( {
				type         : 'file' as LibraryItemType ,
				id           : file.id ,
				name         : file.name ,
				ext          : file.file_ext ,
				size         : file.file_size ,
				fileId       : file.file_id ,
				fileUrl      : file.file_url ,
				fileLocation : file.file_location ,
				createdAt    : file.created_at ,
				updatedAt    : file.updated_at
			} );
		}
		
		// Sort by updatedAt DESC
		items.sort( ( a , b ) => new Date( b.updatedAt ).getTime() - new Date( a.updatedAt ).getTime() );
		
		return items;
	}
	
	private folderToDisplayItem( folder : LibraryFolder ) : LibraryDisplayItem {
		return {
			type      : 'folder' as LibraryItemType ,
			id        : folder.id ,
			name      : folder.name ,
			createdAt : folder.created_at ,
			updatedAt : folder.updated_at
		};
	}
	
	private applyClientSideFilters() : void {
		let items        = [ ... this.displayItems ];
		const searchTerm = this.search().trim().toLowerCase();
		
		if ( searchTerm ) {
			items = items.filter( item => item.name.toLowerCase().includes( searchTerm ) );
		}
		
		if ( this.typeFilter() !== 'all' ) {
			items = items.filter( item => {
				if ( item.type === 'folder' ) return true;
				return this.matchesTypeFilter( item.ext || '' , this.typeFilter() );
			} );
		}
		
		this.filteredDisplayItems = items;
	}
	
	private matchesTypeFilter( ext : string , filter : string ) : boolean {
		const imageExtensions : string[] = [ 'jpg' , 'jpeg' , 'png' , 'gif' , 'bmp' , 'webp' , 'svg' ];
		const docExtensions : string[]   = [ 'pdf' , 'doc' , 'docx' , 'xls' , 'xlsx' , 'ppt' , 'pptx' , 'txt' ];
		const videoExtensions : string[] = [ 'mp4' , 'avi' , 'mov' , 'wmv' , 'flv' , 'mkv' ];
		const audioExtensions : string[] = [ 'mp3' , 'wav' , 'ogg' , 'aac' , 'wma' ];
		
		switch ( filter ) {
			case 'image':
				return imageExtensions.includes( ext.toLowerCase() );
			case 'document':
				return docExtensions.includes( ext.toLowerCase() );
			case 'video':
				return videoExtensions.includes( ext.toLowerCase() );
			case 'audio':
				return audioExtensions.includes( ext.toLowerCase() );
			default:
				return true;
		}
	}
	
	private buildBreadcrumb() : void {
		this.breadcrumb = [ { id : null , name : 'Thư viện' } ];
		if ( this.activeFolderId !== null && this.folders.length > 0 ) {
			const chain : Breadcrumb[]    = [];
			let currentId : number | null = this.activeFolderId;
			while ( currentId !== null ) {
				const folder = this.folders.find( f => f.id === currentId );
				if ( folder ) {
					chain.unshift( { id : folder.id , name : folder.name } );
					currentId = folder.parent_id;
				} else {
					break;
				}
			}
			this.breadcrumb.push( ... chain );
		}
	}
	
	// ── Navigation ──
	
	navigateToFolder( folderId : number | null ) : void {
		// if ( folderId !== null ) {
		//     void this.router.navigate( [ '/admin/teacher/library/folder' , folderId ] );
		// } else {
		//     void this.router.navigate( [ '/admin/teacher/library' ] );
		// }
	}
	
	// ── Search & Filter ──
	
	onSearchData() : void {
		this.loadData( 1 , true );
	}
	
	onTypeFilterChange() : void {
		this.loadData( 1 , true );
	}
	
	onChangePage( paged : number ) : void {
		this.loadData( paged , false );
	}
	
	openCreateFolderDialog() : void {
		
		
		
		const name = prompt( 'Nhập tên thư mục mới:' );
		if ( name && name.trim() ) {
			this.state.set( 'loading' );
			this.libraryService.createFolder( {
				name       : name.trim() ,
				parent_id  : this.activeFolderId ,
				donvi_id   : this.donviId ,
				user_id    : this.userId ,
				sort_order : 0
			} as any ).pipe( takeUntil( this.destroyed$ ) ).subscribe( {
				next  : () : void => {
					this.notification.toastSuccess( 'Tạo thư mục thành công' );
					this.loadData( 1 , true );
				} ,
				error : () : void => {
					this.notification.toastError( 'Tạo thư mục thất bại' );
					this.state.set( 'success' );
				}
			} );
		}
	}
	
	renameFolder( folder : LibraryFolder ) : void {
		const name = prompt( 'Đổi tên thư mục:' , folder.name );
		if ( name && name.trim() && name.trim() !== folder.name ) {
			this.state.set( 'loading' );
			this.libraryService.updateFolder( folder.id , { name : name.trim() } as any ).pipe( takeUntil( this.destroyed$ ) ).subscribe( {
				next  : () : void => {
					this.notification.toastSuccess( 'Đổi tên thành công' );
					this.loadData( 1 , true );
				} ,
				error : () : void => {
					this.notification.toastError( 'Đổi tên thất bại' );
					this.state.set( 'success' );
				}
			} );
		}
	}
	
	onRenameFolder( folderId : number ) : void {
		const folder = this.folders.find( f => f.id === folderId );
		if ( folder ) {
			this.renameFolder( folder );
		}
	}
	
	deleteFolder( folder : LibraryFolder ) : void {
		this.notification.confirmDelete( 1 ).pipe( takeUntil( this.destroyed$ ) ).subscribe( {
			next : ( confirmed : boolean ) : void => {
				if ( confirmed ) {
					this.state.set( 'loading' );
					this.libraryService.deleteFolder( folder.id ).pipe( takeUntil( this.destroyed$ ) ).subscribe( {
						next  : () : void => {
							this.notification.toastSuccess( 'Xóa thư mục thành công' );
							this.loadData( 1 , true );
						} ,
						error : () : void => {
							this.notification.toastError( 'Xóa thư mục thất bại' );
							this.state.set( 'success' );
						}
					} );
				}
			}
		} );
	}
	
	// ── File operations ──
	
	deleteFile( item : LibraryDisplayItem ) : void {
		this.notification.confirmDelete( 1 ).pipe( takeUntil( this.destroyed$ ) ).subscribe( {
			next : ( confirmed : boolean ) : void => {
				if ( confirmed ) {
					this.state.set( 'loading' );
					this.libraryService.unlinkFile( item.id ).pipe( takeUntil( this.destroyed$ ) ).subscribe( {
						next  : () : void => {
							this.notification.toastSuccess( 'Xóa tệp thành công' );
							this.loadData( 1 , true );
						} ,
						error : () : void => {
							this.notification.toastError( 'Xóa tệp thất bại' );
							this.state.set( 'success' );
						}
					} );
				}
			}
		} );
	}
	
	downloadFile( item : LibraryDisplayItem ) : void {
		if ( item.fileUrl ) {
			window.open( item.fileUrl , '_blank' );
		}
	}
	
	previewFile( item : LibraryDisplayItem ) : void {
		// Forward to the preview dialog — logic handled in the dialog component
		// For now, open file URL in a new tab as fallback
		if ( item.fileUrl ) {
			window.open( item.fileUrl , '_blank' );
		}
	}
	
	openUploadDialog() : void {
		// const dialogRef = this.dialog.open( LibraryUploadDialogComponent , {
		//     width        : '600px' ,
		//     disableClose : true ,
		//     data         : {
		//         folderId : this.activeFolderId || 0 ,
		//         donviId  : this.donviId ,
		//         userId   : this.userId
		//     }
		// } );
		//
		// dialogRef.afterClosed().pipe( takeUntil( this.destroyed$ ) ).subscribe( {
		//     next : ( result : boolean ) : void => {
		//         if ( result ) {
		//             this.loadData( 1 , true );
		//         }
		//     }
		// } );
	}
	
	reload( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData( this._temp.paged , this._temp.resetPaginator );
	}
	
	// ── Preview helpers ──
	isPdf( ext? : string ) : boolean {
		return ext?.toLowerCase() === 'pdf';
	}
	
	isImage( ext? : string ) : boolean {
		return [ 'jpg' , 'jpeg' , 'png' , 'gif' , 'bmp' , 'webp' , 'svg' ].includes( ext?.toLowerCase() || '' );
	}
	
	isVideo( ext? : string ) : boolean {
		return [ 'mp4' , 'avi' , 'mov' , 'wmv' , 'flv' , 'mkv' ].includes( ext?.toLowerCase() || '' );
	}
	
	isAudio( ext? : string ) : boolean {
		return [ 'mp3' , 'wav' , 'ogg' , 'aac' , 'wma' ].includes( ext?.toLowerCase() || '' );
	}
	
	trackByFn( _ : number , item : LibraryDisplayItem ) : string {
		return `${ item.type }-${ item.id }`;
	}
	
	protected createPersonalStoragePartition() : void {
		this.createPersonalStoragePartitionObserver.next( this.session() );
		this.state.set( 'createPersonalStoragePartition' );
	}
	
	private startCreatingPersonalStoragePartition() : void {
		this.checkIsPersonalStoragePartitionCreated().pipe(
			takeUntil( this.destroyed$ ) ,
			switchMap( ( created : boolean ) : Observable<number> => created ? of( 1 ) : this.createNewPersonalStoragePartition() )
		).subscribe( {
			next  : () : void => {
				this.notification.toastSuccess( 'Khởi tạo không gian lưu trữ cá nhân thành công.' );
				this.loadFolders();
				this.increaseSession();
			} ,
			error : () : void => {
				this.state.set( 'undefined' );
				this.notification.toastError( 'Khởi tạo không gian lưu trữ cá nhân thất bại.' );
				this.increaseSession();
			}
		} );
	}
	
	private checkIsPersonalStoragePartitionCreated() : Observable<boolean> {
		return this.fileService.getRootFolder().pipe(
			map( ( folder : IctuFolder ) : boolean => !!folder )
		);
	}
	
	private createNewPersonalStoragePartition() : Observable<number> {
		const info : Partial<IctuFolder> = {
			name      : uuid4() ,
			title     : 'Workspace' ,
			parent_id : 0 ,
			public    : 0 ,
			type      : 'folder' ,
			user_id   : this.userId() ,
			url       : dayjs( new Date() ).format( 'YYYY/MM' )
		};
		return this.fileService.createFolder( info );
	}
	
	private increaseSession() : void {
		this.session.update( ( oldSessionNumber : number ) : number => 1 + oldSessionNumber );
	}
	
	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}

