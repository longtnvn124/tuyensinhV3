import { Pipe , PipeTransform } from '@angular/core';

@Pipe( {
    name       : 'ilIsFolderHasChild' ,
    standalone : true
} )
export class IlIsFolderHasChildPipe implements PipeTransform {

    transform( value : unknown , ... args : unknown[] ) : unknown {
        return null;
    }

}
