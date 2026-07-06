import { Pipe , PipeTransform } from '@angular/core';

@Pipe( {
    name       : 'ilFolderChildren' ,
    standalone : true
} )
export class IlFolderChildrenPipe implements PipeTransform {

    transform( value : unknown , ... args : unknown[] ) : unknown {
        return null;
    }

}
