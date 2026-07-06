import { InputSignal , ModelSignal } from '@angular/core';
import { Class } from '@models/class';
import { ClassSession } from '@models/class-session';

export interface ClassSessionChild {
	canChanges : InputSignal<boolean>
	classObject : InputSignal<Class>,
	classSession : ModelSignal<ClassSession>,
}
