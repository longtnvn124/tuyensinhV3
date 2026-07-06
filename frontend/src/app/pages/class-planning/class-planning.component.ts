import { Component , computed , inject , InputSignal , ModelSignal , OnDestroy , OnInit , Signal , signal , WritableSignal } from '@angular/core';
import { ActivatedRoute , Router } from '@angular/router';
import { AppState } from '@models/app-state';
import { AuthenticationService } from '@services/authentication.service';
import { map , Subject , takeUntil } from 'rxjs';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { ClassPlanningMakerComponent } from './children/class-planning-maker/class-planning-maker.component';
import { NgClass } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { DividerModule } from 'primeng/divider';
import { ClassPlanningAdditionalLessonComponent } from './children/class-planning-additional-lesson/class-planning-additional-lesson.component';
import { MatButton } from '@angular/material/button';
import { Tooltip } from 'primeng/tooltip';
import { ClassPlanningStudentsComponent } from '@pages/class-planning/children/class-planning-students/class-planning-students.component';
import { Class , ClassExtend , ClassPlanningCommand , LEARNING_MODE_OPTIONS , LearningMode } from '@models/class';
import { ClassesService } from '@services/classes.service';
import { ClassPlanningFormComponent } from '@pages/class-planning/children/class-planning-form/class-planning-form.component';
import { ClassPlanningDistributionComponent } from '@pages/class-planning/children/class-planning-distribution/class-planning-distribution.component';
import { Course } from '@models/course';
import { ClassPlanningCurriculumComponent } from '@pages/class-planning/children/class-planning-curriculum/class-planning-curriculum.component';
import { ComingSoonComponent } from '@components/coming-soon/coming-soon.component';
import { CeoRole , TeacherRole , TeachingAssistantRole , TrainingManagementRole } from '@models/role';
import { ClassProgressLessonComponent } from '@pages/class-progress/children/class-progress-lesson/class-progress-lesson.component';
import { ENVIRONMENT } from '@env';
import { IctuDropdownOptionMapPipe } from '@pipes/ictu-dropdown-option-map.pipe';
import { IctuDropdownOptionElement } from '@models/ictu-dropdown-option';

type ClassPlanningMenuName = 'class-planning-form' | 'plan' | 'students' | 'supplementary' | 'classDate' | 'class-planning-curriculum' | 'class-planning-distribution' | 'plan-teaching-assistant';

type ClassPlanningMenuItem = {
    name : ClassPlanningMenuName;
    label : string;
};

// export type ClassPlanningRole = 'manager' | 'teacher';

export type ClassPlanningRole = TeacherRole | TrainingManagementRole | CeoRole | TeachingAssistantRole;

export interface ClassPlanningChild {
    class_id : InputSignal<number>;
    role : InputSignal<ClassPlanningRole>;
}

export interface ClassPlanningAnimationLoading {
    enable : boolean;
    heading : string;
}

export interface ClassPlanningChildComponent {
    classObject : ModelSignal<ClassExtend>;
    animationLoading : ModelSignal<ClassPlanningAnimationLoading>;
    course : ModelSignal<Course>;
    role : InputSignal<ClassPlanningRole>
}

@Component( {
    selector    : 'app-class-planning' ,
    standalone  : true ,
    imports : [ NgClass , LoadingProgressComponent , ClassPlanningMakerComponent , MatMenuModule , DividerModule , ClassPlanningAdditionalLessonComponent , MatButton , Tooltip , ClassPlanningStudentsComponent , ClassPlanningStudentsComponent , ClassPlanningStudentsComponent , ClassPlanningFormComponent , ClassPlanningDistributionComponent , ClassPlanningCurriculumComponent , ComingSoonComponent , ClassProgressLessonComponent , IctuDropdownOptionMapPipe ] ,
    templateUrl : './class-planning.component.html' ,
    styleUrl    : './class-planning.component.css'
} )
export default class ClassPlanningComponent implements OnInit , OnDestroy {

    private activatedRoute : ActivatedRoute = inject( ActivatedRoute );

    private router : Router = inject( Router );

    private service : ClassesService = inject( ClassesService );

    private auth : AuthenticationService = inject( AuthenticationService );

    private destroy$ : Subject<void> = new Subject<void>();

    protected readonly state : WritableSignal<AppState | 'unauthorized' | 'invalid' | 'notFound'> = signal<AppState | 'unauthorized' | 'invalid' | 'notFound'>( 'loading' );

    protected readonly navList : WritableSignal<ClassPlanningMenuItem[]> = signal<ClassPlanningMenuItem[]>( [] );

    protected readonly activeMenu : WritableSignal<ClassPlanningMenuName> = signal<ClassPlanningMenuName>( null );

    protected readonly class_id : Signal<number> = computed( () : number => this.classObject() ? this.classObject().id : 0 );

    protected readonly heading : Signal<string> = computed( () : string => this.classObject() ? `Lớp : ${ this.classObject().name }` : 'Thêm lớp mới' );

    protected readonly classObject : WritableSignal<ClassExtend> = signal( null );

    protected readonly learningModeOptions : Signal<IctuDropdownOptionElement<LearningMode>[]> = signal<IctuDropdownOptionElement<LearningMode>[]>( LEARNING_MODE_OPTIONS );

    protected readonly course : WritableSignal<Course> = signal( null );

    protected readonly role : Signal<ClassPlanningRole> = computed( () : ClassPlanningRole => this._role() );

    private readonly _role : WritableSignal<ClassPlanningRole> = signal( 'teacher' );

    private _class_id : number = 0;

    is_LopBT : boolean = false;

    private get userID () : number {
        return this.auth.user?.id ?? 0;
    }

    private extractedInfo : ClassPlanningCommand;

    protected readonly animationLoading : WritableSignal<ClassPlanningAnimationLoading> = signal<ClassPlanningAnimationLoading>( { enable : false , heading : 'Loading...' } );

    ngOnInit () : void {
        if ( ! this.auth.userHasRole( [ 'teacher' , 'training_management' , 'ceo' , 'teaching_assistant' ] ) ) {
            this.state.set( 'unauthorized' ); // người dùng không có quyền truy cập router này
        }
        else {
            this.navList.set( [
                { label : 'Thông tin lớp học' , name : 'class-planning-form' } ,
                { label : 'Chương trình giảng dạy' , name : 'class-planning-curriculum' } ,
                { label : 'Danh sách học sinh' , name : 'students' } ,
                // { label : 'Lớp bổ trợ' , name : 'supplementary' } ,
                { label : 'Chương trình giảng dạy' , name : 'plan' } ,
                { label : 'Phân phối chương trình' , name : 'class-planning-distribution' }
            ] );

            if ( ! ENVIRONMENT.production ) {
                this.navList.update( ( items : ClassPlanningMenuItem[] ) : ClassPlanningMenuItem[] => {
                    const _lastMenuItem : ClassPlanningMenuItem = items.pop();
                    return [ ... items , { label : 'Chương trình giảng dạy' , name : 'plan-teaching-assistant' } , _lastMenuItem ];
                } );
            }
            const extractedInfo : ClassPlanningCommand = this.activatedRoute.snapshot.queryParamMap.has( 'hashcode' ) ? this.decryptCode( this.activatedRoute.snapshot.queryParamMap.get( 'hashcode' ) ) : null;
            if ( extractedInfo && [ 'teacher' , 'training_management' , 'ceo' , 'teaching_assistant' ].includes( extractedInfo.role ) && ( extractedInfo.userId === this.userID ) ) {
                if ( extractedInfo.classId === 0 ) {
                    this.navList.update( () : ClassPlanningMenuItem[] => ( [ { label : 'Thông tin lớp học' , name : 'class-planning-form' } ] ) );
                    this.state.set( 'success' );
                }
                else {
                    if ( extractedInfo.role === 'training_management' || extractedInfo.role === 'ceo' ) {
                        this._role.set( 'training_management' );
                    }
                    else if ( extractedInfo.role === 'teacher' ) {
                        this._role.set( 'teacher' );
                    }
                    else if ( extractedInfo.role === 'teaching_assistant' ) {
                        this._role.set( 'teaching_assistant' );
                    }
                    this._class_id = extractedInfo.classId;

                    if ( this._role() === 'teacher' ) {
                        this.navList.update( ( menuItems : ClassPlanningMenuItem[] ) : ClassPlanningMenuItem[] => {
                            return menuItems.filter( ( { name } : ClassPlanningMenuItem ) : boolean => [ 'students' , 'plan' ].includes( name ) )
                        } );
                    }
                    else if ( this._role() === 'teaching_assistant' ) {
                        this.navList.update( ( menuItems : ClassPlanningMenuItem[] ) : ClassPlanningMenuItem[] => {
                            return menuItems.filter( ( { name } : ClassPlanningMenuItem ) : boolean => [ 'students' , 'plan-teaching-assistant' ].includes( name ) )
                        } );
                    }
                    else if ( this._role() === 'training_management' ) {
                        this.navList.update( ( menuItems : ClassPlanningMenuItem[] ) : ClassPlanningMenuItem[] => {
                            return menuItems.filter( ( { name } : ClassPlanningMenuItem ) : boolean =>
                                name !== 'plan-teaching-assistant' && name != 'plan'
                            );
                        } );
                    }
                    this.loadData();
                }
                this.activeMenu.set( this.navList()[ 0 ].name );
                this.extractedInfo = extractedInfo;
            }
            else {
                this.state.set( 'invalid' );
            }
        }
    }

    private decryptCode ( encrypted : string ) : ClassPlanningCommand {
        if ( encrypted ) {
            try {
                const str : string = this.auth.decrypt( encrypted );
                return str ? Object.assign<ClassPlanningCommand , any>( { userId : 0 , classId : 0 , role : 'teacher' } , JSON.parse( str ) ) : null;
            }
            catch ( e ) {
                return null;
            }
        }
        return null;
    }

    private loadData () : void {
        if ( ( this.role() === 'training_management' && ! this.auth.userHasRole( [ 'training_management' ] ) ) || ( this.role() === 'teacher' && ! this.auth.userHasRole( [ 'teacher' ] ) ) || ( this.role() === 'ceo' && ! this.auth.userHasRole( [ 'ceo' ] ) ) ) {
            this.state.set( 'unauthorized' );
        }
        this.state.set( 'loading' );
        const conditions : IctuConditionParam[] = [
            {
                conditionName : 'id' ,
                value         : this._class_id.toString( 10 ) ,
                condition     : IctuQueryCondition.equal
            } ,
            {
                conditionName : 'donvi_id' ,
                value         : this.auth.user.donvi_id.toString( 10 ) ,
                condition     : IctuQueryCondition.equal ,
                orWhere       : 'and'
            }
        ];
        const queryParams : IctuQueryParams     = {
            limit : 1 ,
            paged : 1 ,
            with  : 'teachers,assistants,course'
        };
        this.service.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<Class[]> ) : { state : AppState | 'invalid' | 'notFound'; classObject : ClassExtend } => {
                if ( response.data?.length ) {
                    const _class : ClassExtend      = response.data[ 0 ];
                    const assignedUserID : number[] = [ ... ( _class.teacher_ids || [] ) , ... ( _class.assistant_ids || [] ) ];
                    return {
                        state       : this.role() === 'training_management' || this.role() === 'teacher' || this.role() === 'teaching_assistant' ? 'success' : this.auth.employee && assignedUserID.includes( this.userID ) ? 'success' : 'invalid' ,
                        classObject : _class
                    };
                }
                else {
                    return {
                        state       : 'notFound' ,
                        classObject : null
                    };
                }
            } ) ,
            takeUntil( this.destroy$ )
        ).subscribe( {
            next  : ( { state , classObject } : { state : AppState | 'invalid' | 'notFound', classObject : ClassExtend } ) : void => {
                this.classObject.set( classObject );
                this.is_LopBT = classObject.parent_id != 0;
                this.state.set( state );
            } ,
            error : () : void => {
                this.state.set( 'error' );
            }
        } );
    }

    reload ( e : MouseEvent ) : void {
        e.preventDefault();
        e.stopPropagation();
        this.loadData();
    }

    selectMenu ( nav : ClassPlanningMenuItem ) : void {
        this.activeMenu.set( nav.name );
    }

    backToClassList () : void {
        if ( this.auth.userHasRole( [ 'training_management' ] ) ) {
            void this.router.navigate( [ 'admin/training-management/classes' ] );
        }
        else if ( ( this.auth.userHasRole( [ 'ceo' ] ) ) ) {
            void this.router.navigate( [ 'admin/ceo/classes' ] );
        }
        else if ( ( this.auth.userHasRole( [ 'teacher' ] ) ) ) {
            void this.router.navigate( [ 'admin/teacher/classes' ] );
        }
        else if ( ( this.auth.userHasRole( [ 'teaching_assistant' ] ) ) ) {
            void this.router.navigate( [ 'admin/teaching-assistant/classes' ] );
        }
    }

    // get userRole() : Pick< , any>{
    // 	return this.any
    // }

    getRole () : string {
        return this._role();
    }

    protected async updateQueryParams ( classId : number ) : Promise<void> {
        const _hashcode : ClassPlanningCommand = { ... this.extractedInfo , classId };
        await this.router.navigate( [] , {
            relativeTo          : this.activatedRoute ,
            queryParams         : {
                hashcode : this.auth.encrypt( JSON.stringify( _hashcode ) )
            } ,
            queryParamsHandling : 'merge'
        } );
        this.ngOnInit();
    }

    ngOnDestroy () : void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
