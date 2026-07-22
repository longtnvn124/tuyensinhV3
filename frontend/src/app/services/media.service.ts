import { inject , Injectable } from '@angular/core';
import { IctuDocument , IctuDocumentDownloadResult , IctuDriveFile , IctuFile , IctuMedia , IctuPreviewFileContent } from '../models/ictu-file';

import { MatDialog , MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom , lastValueFrom , Observable } from 'rxjs';


interface FileExploreSettings extends Object {
	newPreviewer? : boolean;
	gridMode? : boolean;
	multipleMode? : boolean;
	canDelete? : boolean;
	storeLabel? : string[];
	acceptFileType? : string[]; // filter file by file's extension. Eg: ['pdf','doc','docx','ppt','pptx']
	driveFolder? : string;
}

export interface AvatarMakerSetting {
	maintainAspectRatio? : boolean;
	aspectRatio : number;
	resizeToWidth : number;
	imageQuality? : number;
	format? : OutputFormat;
	resizeToHeight? : number;
	cropperMinWidth? : number;
	cropperMinHeight? : number;
	cropperMaxHeight? : number;
	cropperMaxWidth? : number;
	cropperStaticWidth? : number;
	cropperStaticHeight? : number;
	dirRectImage? : {
		enable : boolean;
		dataUrl : string
	};
	rotateShow?:boolean
}

@Injectable( {
	providedIn : 'any'
} )
export class MediaService {

	private dialog : MatDialog = inject( MatDialog );

	tplDownloadFile( file : IctuFile | IctuDriveFile | IctuDocument ) : Promise<DownloadProcess> {
		const dialogRef : MatDialogRef<DownloadProgressComponent> = this.dialog.open( DownloadProgressComponent , { data : { file } , disableClose : true , panelClass : 'ictu-modal-class ictu-modal-style-02' } );
		return firstValueFrom( dialogRef.afterClosed() );
	}

	// tplDownloadFileDocument( file : IctuDocument ) : Promise<DownloadProcess> {
	// 	const popup : NgbModalRef            = this.modalService.open( DownloadProgressComponent , { size : 'sm' , backdrop : 'static' , centered : true , windowClass : 'ictu-modal-class ictu-modal-style-02' } );
	// 	popup.componentInstance.fileDocument = file;
	// 	return popup.result;
	// }

	mediaPlayer( data : IctuMedia ) : Promise<any> {
		const dialogRef : MatDialogRef<MediaPlayerComponent> = this.dialog.open( MediaPlayerComponent , { data , disableClose : true , panelClass : 'ictu-modal-class ictu-modal-no-background --modal-show-full--true' } );
		return firstValueFrom( dialogRef.afterClosed() );
	}


	//---------------------------CallAvatarMakerV2=-----------------------------
    callAvatarMakerV2( options : AvatarMakerSetting ) : Promise<AvatarMaker> {
        const option : NgbModalOptions = {
            size        : 'lg' ,
            backdrop    : 'static' ,
            centered    : true ,
            windowClass : 'ovic-modal-class ovic-modal-no-background not-result'
        };
        const panel                    = this.modalService.open( OvicAvataMakerV2Component , option );
        Object.keys( options ).forEach( key => panel.componentInstance[ key ] = options[ key ] );
        return panel.result;
    }

}
