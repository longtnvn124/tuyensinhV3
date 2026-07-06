import { InputSignal } from '@angular/core';
import { ParentClassesData } from '@pages/admin/children/parent/children/parent-classes/parent-classes.component';

export interface ParentClassesChild {
	classObject : InputSignal<ParentClassesData>;
}
