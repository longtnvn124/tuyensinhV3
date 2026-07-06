import { Component, inject, OnDestroy, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { AppState } from '@app/models/app-state';
import { Class, ClassPlanningCommand } from '@app/models/class';
import { IctuDataTable2 } from '@app/models/datatable';
import { IctuPermissionControl } from '@app/models/ictu-base-model';
import { IctuDropdownOption } from '@app/models/ictu-dropdown-option';
import { SysRoleName } from '@app/models/role';
import { PROVIDED_ROLE } from '@app/providers/admin-role.provider';
import { AuthenticationService } from '@app/services/authentication.service';
import { classesSearchInfo, ClassesService } from '@app/services/classes.service';
import { Subject, takeUntil } from 'rxjs';
import { IctuPaginatorComponent } from '@app/theme/components/ictu-paginator/ictu-paginator.component';
import { LoadingProgressComponent } from '@app/theme/components/loading-progress/loading-progress.component';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { ClassSessionCommand } from '@app/models/class-session';
import { DtoObject } from "@models/dto";
import { CourseRoutingOverview } from '@app/components/course-overview/course-overview.component';
import { TooltipModule } from 'primeng/tooltip';

@Component({
	selector: 'app-ta-classes',
	imports: [IctuPaginatorComponent, LoadingProgressComponent, FormsModule, InputText, TooltipModule],
	templateUrl: './ta-classes.component.html',
	styleUrl: './ta-classes.component.css'
})
export default class TaClassesComponent implements OnInit, OnDestroy {
	protected optionList: IctuDropdownOption<number>[] = [
		{ value: 0, label: 'Dừng hoạt động' },
		{ value: 1, label: 'Đang hoạt động' }
	];

	private service: ClassesService = inject(ClassesService);

	private auth: AuthenticationService = inject(AuthenticationService);

	get donviID(): number {
		return this.auth.user.donvi_id;
	}

	get userID(): number {
		return this.auth.user.id;
	}

	protected readonly state: WritableSignal<AppState> = signal<AppState>('loading');

	private roleUsed: SysRoleName = inject(PROVIDED_ROLE);

	private destroy$: Subject<void> = new Subject<void>();

	private _temp: { paged: number; resetPaginator: boolean } = {
		paged: 1,
		resetPaginator: true
	};

	protected searchInfo: classesSearchInfo = { search: null };

	protected readonly dataTable: IctuDataTable2<Class> = new IctuDataTable2<Class>();

	permissionControl: Signal<IctuPermissionControl> = signal<IctuPermissionControl>(new IctuPermissionControl(this.auth.getUserPermission('teaching-assistant/classes')));

	private router: Router = inject(Router);

	ngOnInit(): void {
		this.loadData(1, true);
	}

	protected loadData(paged: number = 1, resetPaginator: boolean = true): void {
		this.state.set('loading');
		this._temp = { paged, resetPaginator };
		this.service.load(
			this.searchInfo,
			this.donviID,
			this.userID,
			0,
			'TA',
			{
				limit: this.dataTable.paginator.rows(),
				paged
			}
		).pipe(
			takeUntil(this.destroy$)
		).subscribe({
			next: (response: DtoObject<Class[]>): void => {
				this.dataTable.fillRawData(response, this._temp);
				this.state.set('success');
			},
			error: (): void => {
				this.state.set('error');
			}
		});
	}

	protected reload(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData(this._temp.paged, this._temp.resetPaginator);
	}

	protected onChangePage(paged: number): void {
		this.loadData(paged, false);
	}

	protected onSearchData(): void {
		this.loadData(1, true);
	}

	protected getToClassProgress({ id }: Class): void {
		const _hashcode: ClassSessionCommand = {
			id: 2,
			role: this.roleUsed,
			userId: this.userID
		};
		void this.router.navigate(['class-progress'], {
			queryParams: {
				hashcode: this.auth.encrypt(JSON.stringify(_hashcode)),
				viewer: 'by_'.concat(this.roleUsed)
			}
		});
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

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
