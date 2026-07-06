import { Component , computed , inject , input , InputSignal , model , ModelSignal , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { ClassSessionChild } from '@pages/class-session/models/class-session-child';
import { Class } from '@models/class';
import { ClassSession } from '@models/class-session';
import { debounceTime , filter , map , Observable , of , Subject , takeUntil } from 'rxjs';
import { AppState } from '@models/app-state';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { HocSinh , StudentPopupInfo } from '@models/hoc-sinh';
import { DiemDanh } from '@models/diem-danh';
import { MatButton } from '@angular/material/button';
import { ClassAttendanceStatDashoffsetPipe } from '@pages/class-session/pipes/class-attendance-stat-dashoffset.pipe';
import { MatTooltip } from '@angular/material/tooltip';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { ClassSessionService } from '@services/class-session.service';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { AuthenticationService } from '@services/authentication.service';
import { HocSinhLopHocService } from '@services/hoc-sinh-lop-hoc.service';
import { HocSinhLopHoc } from '@models/hoc-sinh-lop-hoc';
import { joinSources } from '@utilities/join-sources';
import { map as _map , sortBy , find as _find } from 'lodash-es';
import { DiemDanhService } from '@services/diem-danh.service';
import { DatePipe , NgOptimizedImage } from '@angular/common';
import { PublicAssetPipe } from '@pipes/public-asset.pipe';
import { StudentAvatarPipe } from '@pipes/student-avatar.pipe';
import { NgScrollbar } from 'ngx-scrollbar';
import { InputText } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { MatMenu , MatMenuContent , MatMenuTrigger } from '@angular/material/menu';
import { ParentInfoPopupComponent } from '@components/popup/parent-info-popup/parent-info-popup.component';
import { MatDialog } from '@angular/material/dialog';
import { ClassSessionStudentFeedbackComponent , ClassSessionStudentFeedbackInfo } from '@pages/class-session/children/class-session-student-feedback/class-session-student-feedback.component';
import { ClassSessionStudentSpeakingTestsComponent } from '@pages/class-session/children/class-session-student-speaking-tests/class-session-student-speaking-tests.component';

type AttendanceStudentParticipationType =
    | 'regular' // học sinh của lớp học
    | 'cross_class' // học sinh lớp khác hợp ghép vào buỏi học hiện tại
    | 'makeup' // học sinh lớp khác học bù
    | 'trial' //học thử

interface AttendanceStudent extends HocSinh {
    _diemDanh : Partial<DiemDanh>;
    _dirty : boolean;
    _participationType : AttendanceStudentParticipationType;
}

interface ClassSessionAttendanceReportKey {
    total : number;
    present : number;// = count(đi học + đi muộn)
    absent : number; // = count(vắng có phép + vắng không phép)
    late : number; // = count(vắng có phép + vắng không phép)
}

interface ClassSessionAttendanceCounterKey {
    media : number; // Số media đã upload
    feedbacks : number; // Số feedback đã tạo
    speakingTests : number; // Số học sinh có bài speaking testSố feedback đã tạo
}

export interface ClassAttendanceReportItem<T> {
    key : keyof T;
    label : string;
    icon : string;
    value : number;
    total : number;
    color : string;
}

export const circumference : number = 2 * Math.PI * 45; // 2 * Math.PI * 45; // r=45


type OpenDialogEventName = 'PARENT' | 'STUDENT_FEEDBACK' | 'STUDENT_SPEAKING_TEST';

interface OpenDialogEvent {
    name : OpenDialogEventName,
    data : AttendanceStudent,
    session : number
}

@Component( {
    selector    : 'class-session-attendance' ,
    standalone  : true ,
    imports     : [ MatButton , ClassAttendanceStatDashoffsetPipe , MatTooltip , LoadingProgressComponent , DatePipe , NgOptimizedImage , PublicAssetPipe , StudentAvatarPipe , NgScrollbar , InputText , FormsModule , MatMenu , MatMenuContent , MatMenuTrigger ] ,
    templateUrl : './class-session-attendance.component.html' ,
    styleUrl    : './class-session-attendance.component.css'
} )
export class ClassSessionAttendanceComponent implements OnDestroy , ClassSessionChild {

    canChanges : InputSignal<boolean> = input.required<boolean>();

    classObject : InputSignal<Class> = input.required<Class>();

    classSession : ModelSignal<ClassSession> = model.required<ClassSession>();

    private destroyed$ : Subject<void> = new Subject<void>();

    private classSessionService : ClassSessionService = inject( ClassSessionService );

    private hocSinhLopHocService : HocSinhLopHocService = inject( HocSinhLopHocService );

    private diemDanhService : DiemDanhService = inject( DiemDanhService );

    private auth : AuthenticationService = inject( AuthenticationService );

    protected state : WritableSignal<AppState | 'submitting'> = signal( 'loading' );

    private session : WritableSignal<number> = signal( 0 );

    protected readonly disabled : Signal<boolean> = computed( () : boolean => !this.canChanges() || this.classSession()?.status !== 1 );

    private loadDataObserver : Subject<number> = new Subject<number>();

    private submitObserver : Subject<number> = new Subject<number>();

    private openDialogEventObserver : Subject<OpenDialogEvent> = new Subject<OpenDialogEvent>();

    readonly circumference : Signal<string> = signal( circumference.toString() );

    readonly reports : WritableSignal<ClassAttendanceReportItem<ClassSessionAttendanceReportKey>[]> = signal<ClassAttendanceReportItem<ClassSessionAttendanceReportKey>[]>( [
        { key : 'total' , label : 'Tổng số học sinh' , icon : 'fa-classic fa-solid fa-user-friends f-14' , value : 0 , total : 0 , color : '#4680ff' } ,
        { key : 'present' , label : 'Có mặt' , icon : 'fa-classic fa-solid fa-check f-14' , value : 0 , total : 0 , color : '#16a34a' } ,
        { key : 'absent' , label : 'Văng mặt' , icon : 'fa-classic fa-solid fa-x f-14' , value : 0 , total : 0 , color : '#dc2626' } ,
        { key : 'late' , label : 'Đi muộn' , icon : 'fa-classic fa-solid fa-alarm-exclamation f-14' , value : 0 , total : 0 , color : '#d97706' }
    ] );

    readonly counter : WritableSignal<ClassAttendanceReportItem<ClassSessionAttendanceCounterKey>[]> = signal<ClassAttendanceReportItem<ClassSessionAttendanceCounterKey>[]>( [
        { key : 'media' , label : 'Media' , icon : 'fa-classic fa-solid fa-photo-video f-14' , value : 2 , total : 2 , color : '#f10075' } ,
        { key : 'feedbacks' , label : 'Nhận xét' , icon : 'fa-classic fa-solid fa-comment-alt-lines f-14' , value : 5 , total : 5 , color : '#8b7eff' } ,
        { key : 'speakingTests' , label : 'Speaking Tests' , icon : 'fa-classic fa-solid fa-user-microphone f-14' , value : 15 , total : 15 , color : '#2e8ef7' }
    ] );

    protected readonly attendances : WritableSignal<AttendanceStudent[]> = signal<AttendanceStudent[]>( [] );

    protected readonly dirty : Signal<boolean> = computed( () : boolean => {
        return this.canChanges() ? this.attendances().some( ( row : AttendanceStudent ) : boolean => row._dirty ) : false;
    } );

    private dialog : MatDialog = inject( MatDialog );

    protected readonly readonly : Signal<boolean> = computed( () : boolean => {
        return this.classSession().status !== 1 || !this.canChanges();
    } );

    constructor() {
        this.loadDataObserver.asObservable().pipe(
            takeUntilDestroyed() ,
            distinctUntilChanged()
        ).subscribe( () : void => {
            this.loadData();
        } );

        toObservable( this.classSession ).pipe(
            takeUntilDestroyed() ,
            filter( Boolean )
        ).subscribe( () : void => {
            this.triggerLoadData();
        } );

        toObservable( this.attendances ).pipe(
            takeUntilDestroyed()
        ).subscribe( ( attendances : AttendanceStudent[] ) : void => {
            this.updateReports( attendances );
        } );

        this.submitObserver.asObservable().pipe(
            takeUntilDestroyed() ,
            debounceTime( 500 ) ,
            distinctUntilChanged()
        ).subscribe( () : void => {
            this.submitData();
        } );

        this.openDialogEventObserver.asObservable().pipe(
            takeUntilDestroyed() ,
            distinctUntilChanged( ( previous : OpenDialogEvent , current : OpenDialogEvent ) : boolean => previous?.session === current.session )
        ).subscribe( ( info : OpenDialogEvent ) : void => {
            this.handleButtonEvent( info );
        } );
    }

    private updateReports( attendances : AttendanceStudent[] ) : void {
        const report : ClassSessionAttendanceReportKey = attendances.reduce( ( reducer : ClassSessionAttendanceReportKey , s : AttendanceStudent ) : ClassSessionAttendanceReportKey => {
            reducer.total += 1;
            switch ( s._diemDanh.status ) {
                case 'EXCUSED':
                case 'UNEXCUSED':
                    reducer.absent += 1;
                    break;
                case 'LATE':
                    reducer.present += 1;
                    reducer.late += 1;
                    break;
                case 'PRESENT':
                    reducer.present += 1;
                    break;
            }
            return reducer;
        } , { total : 0 , absent : 0 , late : 0 , present : 0 } );
        this.reports.update( ( reports : ClassAttendanceReportItem<ClassSessionAttendanceReportKey>[] ) : ClassAttendanceReportItem<ClassSessionAttendanceReportKey>[] => {
            return reports.map( ( item : ClassAttendanceReportItem<ClassSessionAttendanceReportKey> ) : ClassAttendanceReportItem<ClassSessionAttendanceReportKey> => {
                return { ... item , total : report.total , value : report[ item.key ] };
            } );
        } );
    }

    private triggerLoadData() : void {
        this.loadDataObserver.next( this.session() );
    }

    private increateSession() : void {
        this.session.update( ( value : number ) : number => 1 + value );
    }

    private loadData() : void {
        this.state.set( 'loading' );
        const donViID : number        = this.auth.user.donvi_id;
        const classID : number        = this.classSession().class_id;
        const classSessionID : number = this.classSession().id;
        joinSources<{
            students : AttendanceStudent[],
            extraStudents : AttendanceStudent[],
            checkIns : DiemDanh[]
        }>( {
            students      : this.getClassStudents( classID , donViID ) ,
            extraStudents : this.getExtraStudents( classSessionID , donViID ) ,
            checkIns      : this.loadDiemDanh( classSessionID , donViID )
        } ).pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( {
            next  : ( { students , extraStudents , checkIns } : { students : AttendanceStudent[], extraStudents : AttendanceStudent[], checkIns : DiemDanh[] } ) : void => {
                this.attendances.set( _map( [ ... sortBy( students , [ 'name' , 'full_name' ] ) , ... sortBy( extraStudents , [ 'name' , 'full_name' ] ) ] , ( s : AttendanceStudent ) : AttendanceStudent => {
                    return {
                        ... s ,
                        _diemDanh : _find( checkIns , { hocsinh_id : s.id } ) || {
                            class_session_id : classSessionID ,
                            donvi_id         : donViID ,
                            csdt_id          : this.classObject().csdt_id ?? 0 ,
                            phuhuynh_id      : s.phuhuynh_id ,
                            class_id         : classID ,
                            hocsinh_id       : s.id ,
                            reason           : '' ,
                            status           : 'PRESENT' ,
                            course_id        : this.classObject().course_id
                        }
                    };
                } ) );
                this.state.set( 'success' );
                this.increateSession();
            } ,
            error : () : void => {
                this.state.set( 'error' );
                this.increateSession();
            }
        } );
    }

    private getExtraStudents( classSessionID : number , donViID : number ) : Observable<AttendanceStudent[]> {
        const conditions : IctuConditionParam[] = [
            { conditionName : 'id' , condition : IctuQueryCondition.equal , value : classSessionID.toString( 10 ) } ,
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : donViID.toString( 10 ) , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = {
            limit  : 1 ,
            paged  : 1 ,
            select : 'id,extra_student_ids' ,
            with   : 'extra_students'
        };
        return this.classSessionService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<ClassSession[]> ) : HocSinh[] => response.data.length ? response.data[ 'extra_students' ] : [] ) ,
            map( ( students : HocSinh[] ) : AttendanceStudent[] => _map( students , ( s : HocSinh ) : AttendanceStudent => ( { ... s , _dirty : false , _diemDanh : null , _participationType : 'cross_class' } ) ) )
        );
    }

    private getClassStudents( classID : number , donViID : number ) : Observable<AttendanceStudent[]> {
        const conditions : IctuConditionParam[] = [
            { conditionName : 'class_id' , condition : IctuQueryCondition.equal , value : classID.toString( 10 ) } ,
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : donViID.toString( 10 ) , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = {
            limit  : -1 ,
            paged  : 1 ,
            select : 'id,class_id,hocsinh_id' ,
            with   : 'hocsinh'
        };
        return this.hocSinhLopHocService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<HocSinhLopHoc[]> ) : HocSinh[] => response.data.length ? _map( response.data , ( s : HocSinhLopHoc ) : HocSinh => s[ 'hocsinh' ] as HocSinh ) : [] ) ,
            map( ( students : HocSinh[] ) : AttendanceStudent[] => _map( students , ( s : HocSinh ) : AttendanceStudent => ( { ... s , _dirty : false , _diemDanh : null , _participationType : 'regular' } ) ) )
        );
    }

    private loadDiemDanh( classSessionID : number , donViID : number ) : Observable<DiemDanh[]> {
        const conditions : IctuConditionParam[] = [
            { conditionName : 'class_session_id' , value : classSessionID.toString() , condition : IctuQueryCondition.equal } ,
            { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : donViID.toString( 10 ) , orWhere : 'and' }
        ];
        const queryParams : IctuQueryParams     = {
            limit : -1 ,
            paged : 1
        };
        return this.diemDanhService.query( conditions , queryParams ).pipe(
            map( ( response : DtoObject<DiemDanh[]> ) : DiemDanh[] => response.data )
        );
    }

    protected changeAttendanceStatus( student : AttendanceStudent , status : DiemDanh['status'] ) : void {
        if ( student._diemDanh.status !== status ) {
            this.attendances.update( ( list : AttendanceStudent[] ) : AttendanceStudent[] => list.map( ( s : AttendanceStudent ) : AttendanceStudent => {
                if ( s.id === student.id ) {
                    s._diemDanh.status = status;
                    s._dirty           = true;
                }
                return s;
            } ) );
        }
    }

    protected btnOpenDialog( name : OpenDialogEventName , data : AttendanceStudent , disabled : boolean = false ) : void {
        if ( !disabled ) {
            this.openDialogEventObserver.next( { session : this.session() , name , data } );
        }
    }

    private handleButtonEvent( { name , data } : OpenDialogEvent ) : void {
        let afterDialogClosedEvent : Observable<boolean>;
        const studentPopupInfo : StudentPopupInfo = {
            ... data ,
            _studentLevel : this.classObject().name
        };

        const feedbackInfo : ClassSessionStudentFeedbackInfo = {
            student      : studentPopupInfo ,
            classSession : this.classSession() ,
            readonly     : this.readonly()
        };
        switch ( name ) {
            case 'PARENT':
                afterDialogClosedEvent = this.dialog.open( ParentInfoPopupComponent , {
                    data       : studentPopupInfo ,
                    width      : '600px' ,
                    maxWidth   : 'calc(var(--device-width) - 60px)' ,
                    autoFocus  : false ,
                    panelClass : 'student-parent-info-panel'
                } ).afterClosed().pipe(
                    map( () : boolean => false )
                );
                break;
            case 'STUDENT_FEEDBACK':
                afterDialogClosedEvent = this.dialog.open<ClassSessionStudentFeedbackComponent , ClassSessionStudentFeedbackInfo , boolean>( ClassSessionStudentFeedbackComponent , {
                    data       : feedbackInfo ,
                    width      : '600px' ,
                    maxWidth   : 'calc(var(--device-width) - 60px)' ,
                    autoFocus  : false ,
                    panelClass : 'student-parent-info-panel'
                } ).afterClosed();
                break;
            case 'STUDENT_SPEAKING_TEST':
                afterDialogClosedEvent = this.dialog.open<ClassSessionStudentSpeakingTestsComponent , ClassSessionStudentFeedbackInfo , boolean>( ClassSessionStudentSpeakingTestsComponent , {
                    data       : feedbackInfo ,
                    width      : '600px' ,
                    maxWidth   : 'calc(var(--device-width) - 60px)' ,
                    autoFocus  : false ,
                    panelClass : 'student-parent-info-panel'
                } ).afterClosed();
                break;
            default:
                afterDialogClosedEvent = of( false );
                break;
        }

        afterDialogClosedEvent.pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( {
            next  : ( dirty : boolean ) : void => {
                this.increateSession();
                console.log( dirty );
            } ,
            error : () : void => {
                this.increateSession();
            }
        } );
    }

    protected btnSubmitData() : void {
        if ( this.dirty() ) {
            this.state.set( 'submitting' );
            this.submitObserver.next( this.session() );
        }
    }

    private submitData() : void {

    }

    ngOnDestroy() : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
