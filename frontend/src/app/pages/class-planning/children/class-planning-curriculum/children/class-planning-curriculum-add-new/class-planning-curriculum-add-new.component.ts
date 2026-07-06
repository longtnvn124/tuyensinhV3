import { Component , computed , inject , input , InputSignal , model , ModelSignal , OnDestroy , output , OutputEmitterRef , Signal , signal , WritableSignal } from '@angular/core';
import { Class , ClassLesson , LessonType , validateClassLesson } from '@models/class';
import { Course } from '@models/course';
import { MatButton } from '@angular/material/button';
import { filter , Subject , takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { cloneDeep , sortBy } from 'lodash-es';
import { InputText } from 'primeng/inputtext';
import { CourseLesson } from '@models/course-lesson';
import { Select } from 'primeng/select';
import { AppState } from '@models/app-state';
import { ClassesService } from '@services/classes.service';
import { v4 as uuid4 } from 'uuid';

interface CourseLessonOption {
    id : number;
    title : string;
    supTitle : string;
    searchText : string;
}

@Component( {
    selector    : 'class-planning-curriculum-add-new' ,
    imports     : [ MatButton , InputText , FormsModule , Select ] ,
    templateUrl : './class-planning-curriculum-add-new.component.html' ,
    styleUrl    : './class-planning-curriculum-add-new.component.css'
} )
export class ClassPlanningCurriculumAddNewComponent implements OnDestroy {

    classObject : ModelSignal<Class> = model.required<Class>();

    course : InputSignal<Course> = input.required<Course>();

    courseLessons : InputSignal<CourseLesson[]> = input.required<CourseLesson[]>();

    courseLessonOptionSelected : WritableSignal<number> = signal( null );

    readonly courseLessonOptions : Signal<CourseLessonOption[]> = computed( () : CourseLessonOption[] => {
        if ( this.courseLessons()?.length ) {
            const _parents : CourseLesson[] = sortBy( cloneDeep<CourseLesson[]>( this.courseLessons().filter( ( o : CourseLesson ) : boolean => o.parent_id === 0 ) ) , 'ordering' );
            return _parents.reduce( ( reducer : CourseLessonOption[] , parentLesson : CourseLesson ) : CourseLessonOption[] => {
                const _child : CourseLessonOption[] = sortBy( cloneDeep<CourseLesson[]>( this.courseLessons().filter( ( _l2 : CourseLesson ) : boolean => _l2.parent_id === parentLesson.id ) ) , 'ordering' ).map( ( { id , title } : CourseLesson ) : CourseLessonOption => ( { id , title , supTitle : parentLesson.title , searchText : [ parentLesson.title , title ].join( ' ' ) } ) );
                reducer.push( ... _child );
                return reducer;
            } , new Array<CourseLessonOption>() );
        }
        return []
    } );

    state : WritableSignal<AppState> = signal( 'success' );

    close : OutputEmitterRef<boolean> = output();

    private destroyed$ : Subject<void> = new Subject();

    private saveFormObserver : Subject<ClassLesson> = new Subject();

    readonly lessonType : WritableSignal<LessonType> = signal( 'lesson' );

    readonly topic : WritableSignal<string> = signal( '' );

    readonly teacherID : WritableSignal<number> = signal( 0 );

    readonly lessonID : Signal<number> = computed( () : number => this.courseLessonOptionSelected() ?? 0 );

    readonly dataValid : Signal<boolean> = computed( () : boolean => ( this.lessonType() === 'lesson' ? ( this.lessonID() > 0 ) : !! this.topic() ) );

    private readonly classesService : ClassesService = inject( ClassesService );

    constructor () {
        this.saveFormObserver.asObservable().pipe(
            takeUntilDestroyed() ,
            filter( validateClassLesson )
        ).subscribe( ( value : ClassLesson ) : void => {
            this._updateData( value );
        } );
    }

    private _updateData ( node : ClassLesson ) : void {
        const curriculum : ClassLesson[] = cloneDeep( this.classObject().curriculum );
        if ( curriculum.length ) {
            curriculum.push( { ... node , ordering : ( Math.max( 0 , ... curriculum.map( ( _l : ClassLesson ) : number => _l.ordering ) ) + 1 ) } );
        }
        else {
            curriculum.push( { ... node , ordering : 1 } );
        }
        this.state.set( 'loading' );
        this.classesService.update( this.classObject().id , { curriculum , sync_required : 1 } ).pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( {
            next  : () : void => {
                this.classObject.update( ( _class : Class ) : Class => {
                    return { ... _class , curriculum , sync_required : 1 };
                } );
                this.close.emit( true );
            } ,
            error : () : void => {
                this.state.set( 'error' );
            }
        } )
    }

    btnSave () : void {
        if ( this.dataValid() && this.state() !== 'loading' ) {
            this.saveFormObserver.next( {
                ordering         : 0 ,
                title            : this.topic() ,
                course_lesson_id : this.lessonID() ,
                teacher_id       : this.teacherID() ,
                type             : this.lessonType() ,
                code             : uuid4()
            } );
        }
    }

    btnCancel () : void {
        this.close.emit( false );
    }

    btnSetLessonType ( type : LessonType ) : void {
        if ( this.lessonType() !== type ) {
            this.courseLessonOptionSelected.set( null );
            this.topic.set( '' );
            this.lessonType.set( type );
        }
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
