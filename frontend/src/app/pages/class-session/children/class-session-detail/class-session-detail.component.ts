import { Component , input , InputSignal , model , ModelSignal , OnDestroy } from '@angular/core';
import { ClassSessionChild } from '@pages/class-session/models/class-session-child';
import { Class } from '@models/class';
import { ClassSession } from '@models/class-session';
import { Subject } from 'rxjs';
import { SysRoleName } from '@models/role';

@Component( {
	selector    : 'class-session-detail' ,
	imports     : [] ,
	templateUrl : './class-session-detail.component.html' ,
	styleUrl    : './class-session-detail.component.css'
} )
export class ClassSessionDetailComponent implements OnDestroy , ClassSessionChild {

	canChanges : InputSignal<boolean> = input.required<boolean>();

	classObject : InputSignal<Class> = input.required<Class>();

	role : InputSignal<SysRoleName> = input.required<SysRoleName>();

	classSession : ModelSignal<ClassSession> = model.required<ClassSession>();

	private destroyed$ : Subject<void> = new Subject<void>();

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
