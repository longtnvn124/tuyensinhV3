import { Pipe , PipeTransform } from '@angular/core';
import { ClassSession } from '@models/class-session';

/**
 * Check can session be changed by its status and ordering
 * @param classSession - Class session
 * @param limitation - The highest ordering number of activated session;
 * */
export function canSessionBeChanged ( classSession : ClassSession , limitation : number = 0 ) : boolean {
    return classSession.status === 0 && classSession.ordering > limitation;
}

@Pipe( {
    name : 'canSessionBeChanged'
} )
export class CanSessionBeChangedPipe implements PipeTransform {

    transform ( classSession : ClassSession , limitation : number = 0 ) : boolean {
        return canSessionBeChanged( classSession , limitation );
    }

}
