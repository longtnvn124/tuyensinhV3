import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@app/models/ictu-base-service.class';
import { LibraryFile , LibraryFilters , LibraryFolder } from '@app/models/library';
import { map , Observable , of } from 'rxjs';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';

type LibraryQueryParams = IctuQueryParams & {
    search? : string;
    type_filter? : string;
};

@Injectable( {
    providedIn : 'any'
} )
export class LibraryService extends IctuBaseServiceClass<LibraryFolder> {

    constructor() {
        super( 'folders' );
    }

    // ── Folder operations ──

    loadFolders( parentId : number ) : Observable<LibraryFolder[]> {
        const conditions : IctuConditionParam[] = [
            { conditionName : 'parent_id' , condition : IctuQueryCondition.equal , value : parentId.toString( 10 ) }
        ];
        const queryParams : IctuQueryParams     = {
            paged   : 1 ,
            limit   : -1 ,
            orderby : 'ordering' ,
            order   : 'ASC' ,
            with    : 'files'
        };
        return this.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<LibraryFolder[]> ) : LibraryFolder[] => response.data )
        );
    }

    loadAllFolders( donviId : number , userId : number ) : Observable<LibraryFolder[]> {
        return of( [] );
        // const conditions : IctuConditionParam[] = [
        //     { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : donviId.toString( 10 ) } ,
        //     { conditionName : 'user_id' , condition : IctuQueryCondition.equal , value : userId.toString( 10 ) }
        // ];
        // return this.query<LibraryFolder>( conditions , { paged : 1 , limit : -1 , orderby : 'sort_order' , order : 'asc' } , 'folders' ).pipe( map( r => r.data ) );
    }

    createFolder( data : Partial<LibraryFolder> ) : Observable<number> {
        return this.http.post<DtoObject<number>>( `${ this.api }folder` , data ).pipe( map( r => r.data ) );
    }

    updateFolder( id : number , data : Partial<LibraryFolder> ) : Observable<any> {
        return this.http.put( `${ this.api }folder/${ id }` , data );
    }

    deleteFolder( id : number ) : Observable<any> {
        return this.http.delete( `${ this.api }folder/${ id }` );
    }

    // ── File operations ──

    loadFiles(
        folderId : number ,
        donviId : number ,
        paged : number ,
        limit : number ,
        filters : LibraryFilters
    ) : Observable<DtoObject<LibraryFile[]>> {

        return of( null );

        // const conditions : IctuConditionParam[] = [
        //     { conditionName : 'folder_id' , condition : IctuQueryCondition.equal , value : folderId.toString( 10 ) } ,
        //     { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : donviId.toString( 10 ) }
        // ];
        // return this.query<LibraryFile>( conditions , this.buildQueryParams( paged , limit , filters ) );
    }

    loadRootFiles(
        donviId : number ,
        paged : number ,
        limit : number ,
        filters : LibraryFilters
    ) : Observable<DtoObject<LibraryFile[]>> {

        return of( null );

        // const conditions : IctuConditionParam[] = [
        //     { conditionName : 'folder_id' , condition : IctuQueryCondition.equal , value : '0' } ,
        //     { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : donviId.toString( 10 ) }
        // ];
        // return this.query<LibraryFile>( conditions , this.buildQueryParams( paged , limit , filters ) );
    }

    linkFileToLibrary( fileId : number , folderId : number , name : string , donviId : number , userId : number ) : Observable<number> {
        return this.create( {
            file_id   : fileId ,
            folder_id : folderId ,
            name      : name ,
            donvi_id  : donviId ,
            user_id   : userId
        } as any );
    }

    unlinkFile( id : number ) : Observable<any> {
        return this.delete( id );
    }

    // ── Private helpers ──

    private buildQueryParams( paged : number , limit : number , filters : LibraryFilters ) : LibraryQueryParams {
        const queryParams : LibraryQueryParams = {
            limit ,
            paged ,
            with : 'file'
        };

        if ( filters.search ) {
            queryParams.search = filters.search;
        }
        if ( filters.typeFilter && filters.typeFilter !== 'all' ) {
            queryParams.type_filter = filters.typeFilter;
        }

        return queryParams;
    }
}
