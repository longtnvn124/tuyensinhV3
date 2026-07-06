import { Component , input , InputSignal , model , ModelSignal , OnDestroy } from '@angular/core';
import { ClassSessionChild } from '@pages/class-session/models/class-session-child';
import { Subject } from 'rxjs';
import { Class } from '@models/class';
import { ClassSession } from '@models/class-session';

@Component( {
	selector    : 'class-session-assignments' ,
	imports     : [] ,
	templateUrl : './class-session-assignments.component.html' ,
	styleUrl    : './class-session-assignments.component.css'
} )
export class ClassSessionAssignmentsComponent implements OnDestroy , ClassSessionChild {

	canChanges : InputSignal<boolean> = input.required<boolean>();

	classObject : InputSignal<Class> = input.required<Class>();

	classSession : ModelSignal<ClassSession> = model.required<ClassSession>();

	private destroyed$ : Subject<void> = new Subject<void>();

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
