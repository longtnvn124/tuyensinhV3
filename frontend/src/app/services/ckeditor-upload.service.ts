import { inject , Injectable } from '@angular/core';
import { IctuFileService } from "@services/ictu-file.service";
import { firstValueFrom , map , tap } from "rxjs";
import { UploadInfo } from "@models/file";
import { filter } from "rxjs/operators";

export class IctuCkeditorUploadAdapter {

	private ictuFileService : IctuFileService = inject( IctuFileService );

	constructor ( private loader : any ) {
	}

	async upload () : Promise<string> {
		const file : File        = await this.loader.file;
		const allowed : string[] = [ 'image/jpeg' , 'image/png' , 'image/webp' ];
		if ( ! allowed.includes( file.type ) ) throw new Error( '❌ Định dạng ảnh không hợp lệ' );
		return firstValueFrom( this.ictuFileService.uploadWithProgress( file ).pipe(
			tap( ( response : UploadInfo ) : void => {
				this.loader.uploadTotal = response.total;
				this.loader.uploaded    = response.uploaded;
			} ) ,
			filter( ( response : UploadInfo ) : boolean => response.state === 'DONE' ) ,
			map( ( response : UploadInfo ) : any => {
				return { default : this.ictuFileService.getPublicLink( response.response ) }
			} )
		) );
	}

	abort () : void {
	}
}

@Injectable( {
	providedIn : 'root'
} )
export class CkeditorUploadService {

	createUploadAdapter ( loader : any ) : IctuCkeditorUploadAdapter {
		return new IctuCkeditorUploadAdapter( loader );
	}
}
