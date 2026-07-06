import { Component, inject, OnDestroy, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { IctuBasePermission, IctuPermissionControl } from '@models/ictu-base-model';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { AuthenticationService } from '@services/authentication.service';
import { AppState } from '@models/app-state';
import { map, Subject } from 'rxjs';
import { IctuDataTable } from '@models/datatable';
import { LopHoc } from '@app/models/lop-hoc';
import { Router } from '@angular/router';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MultiSelectModule } from 'primeng/multiselect';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { InputText } from 'primeng/inputtext';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { TeacherClassesCalendarComponent } from '@pages/admin/children/teacher/children/teacher-classes-calendar/teacher-classes-calendar.component';
import { Class, ClassPlanningCommand } from '@app/models/class';
import { SysRoleName } from '@app/models/role';
import { PROVIDED_ROLE } from '@app/providers/admin-role.provider';
import { classesSearchInfo, ClassesService } from '@app/services/classes.service';
import { CourseRoutingOverview } from '@app/components/course-overview/course-overview.component';
import { TooltipModule } from 'primeng/tooltip';

type LopHocMode = 'listHS' | 'listDF' | 'lich' | 'baitap' | 'lopBT';

@Component({
	selector: 'app-teacher-classes',
	imports: [ReactiveFormsModule, FormsModule, FloatLabelModule, MultiSelectModule, MatMenuModule, MatIconModule, MatButtonModule, MatTooltipModule, TeacherClassesCalendarComponent, IctuPaginatorComponent, InputText, LoadingProgressComponent, TooltipModule],
	templateUrl: './teacher-classes.component.html',
	styleUrl: './teacher-classes.component.css'
})
export default class TeacherClassesComponent
	implements OnInit, OnDestroy, IctuBasePermission {
	optionList: IctuDropdownOption<number>[] = [
		{ value: 0, label: 'Dừng hoạt động' },
		{ value: 1, label: 'Đang hoạt động' }
	];

	private service: ClassesService = inject(ClassesService);

	private auth: AuthenticationService = inject(AuthenticationService);

	get donviId(): number {
		return this.auth.user.donvi_id;
	}

	get teacher_Userid(): number {
		return this.auth.user.id;
	}

	state: WritableSignal<AppState> = signal<AppState>('loading');

	private roleUsed: SysRoleName = inject(PROVIDED_ROLE);

	private onDestroy$: Subject<string> = new Subject<string>();

	private _temp: { paged: number; resetPaginator: boolean } = {
		paged: 1,
		resetPaginator: true
	};

	searchInfo: classesSearchInfo = {
		search: null
	};

	dataTable: IctuDataTable<Class> = new IctuDataTable<Class>();

	permissionControl: Signal<IctuPermissionControl> = signal<IctuPermissionControl>(new IctuPermissionControl(this.auth.getUserPermission('teacher/classes')));

	mode: WritableSignal<LopHocMode> = signal<LopHocMode>('listDF');

	lopHocActive: WritableSignal<LopHoc> = signal<LopHoc>(null);

	setMode(mode: LopHocMode, lophoc: LopHoc) {
		switch (mode) {
			case 'listHS':
				this.lopHocActive.set(lophoc);
				this.mode.set('listHS');
				break;
			case 'listDF':
				this.lopHocActive.set(lophoc);
				this.mode.set('listDF');
				break;
			case 'lich':
				this.lopHocActive.set(lophoc);
				this.mode.set('lich');
				break;
			case 'baitap':
				this.lopHocActive.set(lophoc);
				this.mode.set('baitap');
				break;
			case 'lopBT':
				this.lopHocActive.set(lophoc);
				this.mode.set('lopBT');
				break;
		}
	}

	updateMode(event: { mode: LopHocMode }): void {
		this.mode.set(event.mode);
	}

	constructor(private router: Router) {
	}

	ngOnInit(): void {
		this.loadData(1, true);
	}

	loadData(paged: number = 1, resetPaginator: boolean = true): void {
		this.state.set('loading');
		this._temp = { paged, resetPaginator };
		this.service.load(
			this.searchInfo,
			this.donviId,
			this.teacher_Userid,
			0,
			'teacher',
			{
				limit: this.dataTable.paginator.rows(),
				paged
			}
		).pipe(
			map((res): Class[] => {
				if (resetPaginator) {
					return this.dataTable.paginator.setupPaginator(res);
				}
				else {
					this.dataTable.paginator.changePage(paged);
					return res.data;
				}
			})
		).subscribe({
			next: (data: any): void => {
				this.dataTable.fillData(data);
				this.state.set('success');
			},
			error: (): void => {
				this.state.set('error');
			}
		});
	}

	reload(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData(this._temp.paged, this._temp.resetPaginator);
	}

	onChangePage(paged: number): void {
		this.loadData(paged, false);
	}

	onSearchData(): void {
		this.loadData(1, true);
	}

	ngOnDestroy(): void {
		this.onDestroy$.next('OnDestroy');
		this.onDestroy$.complete();
	}

	btnBackToList() {
		this.lopHocActive.set(null);
	}

	getToClassPlanning(item: any): void {
		const _hashcode: ClassPlanningCommand = {
			classId: item.id,
			role: this.roleUsed,
			userId: this.auth.user.id
		};
		void this.router.navigate(['class-planning'], {
			queryParams: {
				hashcode: this.auth.encrypt(JSON.stringify(_hashcode)),
				viewer: 'by_'.concat(this.roleUsed)
			}
		});
	}

	getToCourseOverView(item: Class): void {
		const _hashcode: CourseRoutingOverview = {
			userId: this.auth.user.id,
			course_id: item.course_id,
			class_id: item.id
		};
		void this.router.navigate(['/course-overview'], {
			queryParams: {
				hashcode: this.auth.encrypt(JSON.stringify(_hashcode)),
				viewer: 'by_'.concat(this.roleUsed)
			}
		});
	}
}
