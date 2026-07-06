import { Component, computed, inject, OnDestroy, Signal, signal, WritableSignal } from '@angular/core';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { AppState } from '@models/app-state';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import { BranchOption, CoSoDaoTao } from '@models/co-so-dao-tao';
import { ClassSession } from '@models/class-session';
import { debounceTime, distinctUntilChanged, filter, map, merge, Observable, of, Subject, takeUntil } from 'rxjs';
import { AuthenticationService } from '@services/authentication.service';
import { EmployeesService } from '@services/employees.service';
import dayjs from '@setup/dayjs';
import { Dayjs } from 'dayjs';
import { Employee, SimpleEmployee } from '@models/employee';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { DatePicker } from 'primeng/datepicker';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';
import { FindInArrayPipe } from '@pipes/find-in-array.pipe';
import { NgScrollbar } from 'ngx-scrollbar';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { ClassSessionService } from '@services/class-session.service';
import { cloneDeep } from 'lodash-es';
import { joinSources } from '@utilities/join-sources';
import { ClassTimeSlotInfoPipe, getClassTimeSlotInfo } from '@pages/admin/children/training-management/children/tm-calendar3/pipes/class-time-slot-info.pipe';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Class } from '@models/class';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { AlignmentType, BorderStyle, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { A4_LANDSCAPE, cmToTwip } from '@utilities/docx-helper';
import { Helper } from '@utilities/helper';
import * as ExcelJS from 'exceljs';
import Worksheet from 'exceljs/index';
import { BidiModule } from "@angular/cdk/bidi";
import { FormatVndPipe } from '@app/pipes/format-vnd.pipe';

const getMonthBoundaryDates: (date: Dayjs | string | Date) => Date[] = (date: Dayjs | string | Date): Date[] => {
  const givenDate: Dayjs = dayjs(date);
  return [givenDate.startOf('month').toDate(), givenDate.endOf('month').toDate()];
}

interface CtsSearchInfo {
  branchID: number,
  employeeID: number,
  dateStart: string,
  dateEnd: string,
}

const ctsSearchInfo2String: (info: CtsSearchInfo) => string = ({ branchID, employeeID, dateStart, dateEnd }: CtsSearchInfo): string => [branchID.toString(), employeeID.toString(), dateStart, dateEnd].join('-')

interface TeachingStatistic {
  employee: SimpleEmployee,
  monday: ClassSessionExtends[],
  tuesday: ClassSessionExtends[],
  wednesday: ClassSessionExtends[],
  thursday: ClassSessionExtends[],
  friday: ClassSessionExtends[],
  saturday: ClassSessionExtends[],
  sunday: ClassSessionExtends[],
  totalLectureSessions: number;         // Number of lecture sessions
  totalOneOnOneSessions: number;        // Number of one-on-one sessions
  totalTeachingAssistantSessions: number; // Number of teaching assistant sessions
  totalSupportSessions: number;    // Total number of support sessions
  sum: number;
  total_price: number
}

interface ClassSessionExtends extends ClassSession {
  class?: Pick<Class, 'id' | 'name' | 'desc' | 'started_date' | 'code'>,
}

function createWeekdayCell(sessions: ClassSessionExtends[], branches: BranchOption[]): TableCell {
  if (!sessions || sessions.length === 0) {
    return new TableCell({
      children: [new Paragraph('')]
    });
  }

  const paragraphs: Paragraph[] = [];

  sessions.forEach((session: ClassSessionExtends, index: number): void => {
    const branch: Pick<CoSoDaoTao, 'time_slots'> = branches.find((i: BranchOption): boolean => session.csdt_id === i.id);
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Ngày ${session.time_start ? dayjs(session.time_start).format('DD/MM/YYYY') : '--/--/----'}`,
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: getClassTimeSlotInfo(session, branch.time_slots),
            bold: true
          })
        ]
      })
    );
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: session.class?.name
          })
        ]
      })
    );

    // Dòng gạch ngăn (trừ ca cuối)
    if (index < sessions.length - 1) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '----------------------'
            })
          ]
        })
      );
    }
  });

  return new TableCell({
    children: paragraphs,
    verticalAlign: 'top'
  });
}

function createStatisticRow(row: TeachingStatistic, rowIndex: number, branches: BranchOption[]): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          children: [
            new TextRun({ text: rowIndex.toString() })
          ],
          alignment: 'center'
        })],
        verticalAlign: 'center'
      }),
      new TableCell({
        children: [new Paragraph(row.employee.full_name)],
        verticalAlign: 'center'
      }),
      createWeekdayCell(row.monday, branches),
      createWeekdayCell(row.tuesday, branches),
      createWeekdayCell(row.wednesday, branches),
      createWeekdayCell(row.thursday, branches),
      createWeekdayCell(row.friday, branches),
      createWeekdayCell(row.saturday, branches),
      createWeekdayCell(row.sunday, branches),
      new TableCell({
        children: [new Paragraph({
          children: [
            new TextRun({ text: row.totalLectureSessions.toString() })
          ],
          alignment: 'center'
        })],
        verticalAlign: 'center'
      }),
      new TableCell({
        children: [new Paragraph({
          children: [
            new TextRun({ text: row.totalTeachingAssistantSessions.toString() })
          ],
          alignment: 'center'
        })],
        verticalAlign: 'center'
      }),
      new TableCell({
        children: [new Paragraph({
          children: [
            new TextRun({ text: row.totalOneOnOneSessions.toString() })
          ],
          alignment: 'center'
        })],
        verticalAlign: 'center'
      }),
      new TableCell({
        children: [new Paragraph({
          children: [
            new TextRun({ text: row.totalSupportSessions.toString() })
          ],
          alignment: 'center'
        })],
        verticalAlign: 'center'
      })
    ]
  });
}

type ExportType = 'word' | 'excel';

interface ExcelCelFormat {
  order: number,
  id: string,
  name: string,
  totalLectureSessions: number;         // Number of lecture sessions
  totalOneOnOneSessions: number;        // Number of one-on-one sessions
  totalTeachingAssistantSessions: number; // Number of teaching assistant sessions
  totalSupportSessions: number;    // Total number of support sessions
  note: string;
}

function applyBorder(cell: ExcelJS.Cell): void {
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
}

function saveAsExcelFile(buffer: any, fileName: string): void {
  const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
  const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
  saveAs(data, fileName + '_export_' + new Date().getTime() + '.xlsx');
}
@Component({
  selector: 'app-accountant-income-stat',
  imports: [LoadingProgressComponent, DatePicker, EmployeePhotoPipe, FindInArrayPipe, NgScrollbar, MatMenu, MatMenuItem, FormsModule, MatMenuTrigger, ClassTimeSlotInfoPipe, NgTemplateOutlet, MatButton, MatTooltip, DatePipe, BidiModule, FormatVndPipe],
  templateUrl: './accountant-income-stat.component.html',
  styleUrl: './accountant-income-stat.component.css',
})
export default class AccountantIncomeStatComponent implements OnDestroy {

  private employeesService: EmployeesService = inject(EmployeesService);

  private auth: AuthenticationService = inject(AuthenticationService);

  private coSoDaoTaoService: CoSoDaoTaoService = inject(CoSoDaoTaoService);

  private classSessionService: ClassSessionService = inject(ClassSessionService);

  state: WritableSignal<AppState> = signal<AppState>('loading');

  teachingStatistics: WritableSignal<TeachingStatistic[]> = signal<TeachingStatistic[]>([]);

  readonly branchOptions: WritableSignal<BranchOption[]> = signal<BranchOption[]>([]);

  readonly branchID: WritableSignal<number> = signal(0);

  readonly selectedBranch: Signal<BranchOption> = computed((): BranchOption => this.branchOptions().find((o: BranchOption): boolean => o.id === this.branchID()))

  private destroyed$: Subject<void> = new Subject<void>();

  protected readonly rangeDates: WritableSignal<Date[]> = signal(getMonthBoundaryDates(new Date()));

  private readonly dateStart: Signal<string> = computed((): string => {
    return this.rangeDates()[0] ? [dayjs(this.rangeDates()[0]).format('YYYY-MM-DD'), '00:00:00'].join(' ') : '';
  });

  private readonly dateEnd: Signal<string> = computed((): string => {
    return this.rangeDates()[1] ? [dayjs(this.rangeDates()[1]).format('YYYY-MM-DD'), '23:23:00'].join(' ') : '';
  });

  private fileName: Signal<string> = computed((): string => this.rangeDates().length ? Helper.removeAccents(`Từ ngày ${dayjs(this.rangeDates()[0]).format('DD/MM/YYYY')} đến ngày ${dayjs(this.rangeDates()[1]).format('DD/MM/YYYY')}`) : '')

  get donViID(): number {
    return this.auth.user.donvi_id;
  }

  readonly employees: WritableSignal<SimpleEmployee[]> = signal<SimpleEmployee[]>([]);

  readonly filterByEmployeeID: WritableSignal<number> = signal(0);

  private exportingObserver: Subject<ExportType> = new Subject<ExportType>();

  constructor() {
    merge<[number, number, Date[]]>(
      toObservable(this.branchID),
      toObservable(this.filterByEmployeeID),
      toObservable(this.rangeDates).pipe(
        filter((rangeDates: Date[]): boolean => rangeDates.every(Boolean))
      )
    ).pipe(
      takeUntilDestroyed(),
      map((): CtsSearchInfo => ({
        branchID: this.branchID(),
        employeeID: this.filterByEmployeeID(),
        dateStart: this.dateStart(),
        dateEnd: this.dateEnd()
      })),
      debounceTime(100),
      distinctUntilChanged((p: CtsSearchInfo, c: CtsSearchInfo): boolean => ctsSearchInfo2String(p) === ctsSearchInfo2String(c))
    ).subscribe((): void => {
      this.loadData();
    });

    this.exportingObserver.asObservable().pipe(
      takeUntilDestroyed(),
      debounceTime(100)
    ).subscribe((type: ExportType): void => {
      switch (type) {
        case 'word':
          this.exportToWord(this.teachingStatistics());
          return;
        case 'excel':
          void this.exportTOExcel(this.teachingStatistics());
          return;
      }

    })
  }

  private loadData(): void {
    this.state.set('loading');
    if (this.branchID()) {
      joinSources<{
        teachingStatistics: TeachingStatistic[],
        classSessions: ClassSession[]
      }>({
        teachingStatistics: this.teachingStatisticLoader(),
        classSessions: this.loadClassSessions()
      }).pipe(
        takeUntil(this.destroyed$),
        map(({ teachingStatistics, classSessions }: { teachingStatistics: TeachingStatistic[], classSessions: ClassSessionExtends[] }): TeachingStatistic[] => {
          return classSessions.reduce((reducer: TeachingStatistic[], classSession: ClassSessionExtends): TeachingStatistic[] => {

            const dayOfWeek: number = new Date(classSession.time_start).getDay();

            const pushToDay = (stat: TeachingStatistic) => {
              switch (dayOfWeek) {
                case 1:
                  stat.monday.push(classSession);
                  break;
                case 2:
                  stat.tuesday.push(classSession);
                  break;
                case 3:
                  stat.wednesday.push(classSession);
                  break;
                case 4:
                  stat.thursday.push(classSession);
                  break;
                case 5:
                  stat.friday.push(classSession);
                  break;
                case 6:
                  stat.saturday.push(classSession);
                  break;
                case 0:
                  stat.sunday.push(classSession);
                  break;
              }
            };

            if (classSession.teacher_id) {
              const index = reducer.findIndex(
                (t: TeachingStatistic) => t.employee.user_id === classSession.teacher_id
              );

              if (index !== -1) {
                const stat = reducer[index];
                pushToDay(stat);

                switch (true) {
                  case (classSession.parent_id !== 0):
                    stat.totalSupportSessions++;
                    break;

                  case (classSession.learning_mode === 'one_on_one'):
                    stat.totalOneOnOneSessions++;
                    break;

                  case (stat.employee.user_id === classSession.teacher_id):
                    stat.totalLectureSessions++;
                    break;

                  case (classSession.assistant_id === stat.employee.user_id):
                    stat.totalTeachingAssistantSessions++;
                    break;
                }
              }
            }
            if (classSession.assistant_id) {

              const index = reducer.findIndex(
                (t: TeachingStatistic) => t.employee.user_id === classSession.assistant_id
              );

              if (index !== -1) {
                const stat = reducer[index];
                pushToDay(stat);

                switch (true) {
                  case (classSession.parent_id !== 0):
                    stat.totalSupportSessions++;
                    break;

                  case (classSession.learning_mode === 'one_on_one'):
                    stat.totalOneOnOneSessions++;
                    break;

                  case (stat.employee.user_id === classSession.teacher_id):
                    stat.totalLectureSessions++;
                    break;

                  case (classSession.assistant_id === stat.employee.user_id):
                    stat.totalTeachingAssistantSessions++;
                    break;
                }
              }
            }

            return reducer;
          }, teachingStatistics);
        })
      ).subscribe({
        next: (data: TeachingStatistic[]): void => {
          let tam = Helper.cloneObject(data);
          tam = tam.map((item) => {
            return {
              ...item,
              sum: item.totalLectureSessions + item.totalOneOnOneSessions + item.totalSupportSessions + item.totalTeachingAssistantSessions
            }
          })
          this.teachingStatistics.set(tam);
          console.log(tam);
          this.state.set('success');
        },
        error: (): void => {
          this.state.set('error');
        }
      })
    }
    else {
      this.branchesLoader().pipe(
        takeUntil(this.destroyed$)
      ).subscribe({
        next: (branches: BranchOption[]): void => {
          if (branches.length > 0) {
            this.branchOptions.set(branches);
            this.branchID.set(branches[0].id);
          }
          else {
            this.state.set('success');
          }
        },
        error: (): void => {
          this.state.set('error');
        }
      })
    }
  }

  private loadClassSessions(): Observable<ClassSessionExtends[]> {
    let conditions: IctuConditionParam[] = [];
    if (this.filterByEmployeeID()) {

    }
    else {
      conditions = [
        { conditionName: 'time_start', condition: IctuQueryCondition.greaterThanToEqualsTo, value: this.dateStart(), orWhere: 'and' },
        { conditionName: 'time_start', condition: IctuQueryCondition.lessThanOrEqualsTo, value: this.dateEnd(), orWhere: 'and' },
        { conditionName: 'csdt_id', condition: IctuQueryCondition.equal, value: this.branchID().toString(), orWhere: 'and' },
        { conditionName: 'status', condition: IctuQueryCondition.equal, value: '2', orWhere: 'and' }
      ];
    }
    const queryParams: IctuQueryParams = {
      limit: -1,
      paged: 1,
      include: this.donViID.toString(),
      include_by: 'donvi_id',
      order: 'ASC',
      orderby: 'time_start',
      with: 'class'
    };

    return this.classSessionService.query(conditions, queryParams).pipe(
      map((response: DtoObject<ClassSession[]>): ClassSessionExtends[] => response.data)
    );
  }

  private teachingStatisticLoader(): Observable<TeachingStatistic[]> {
    return this.employeesLoader().pipe(
      map((employees: SimpleEmployee[]): TeachingStatistic[] => {
        return cloneDeep(employees).map((employee: SimpleEmployee): TeachingStatistic => {
          return {
            employee,
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
            totalLectureSessions: 0,
            totalSupportSessions: 0,
            totalOneOnOneSessions: 0,
            totalTeachingAssistantSessions: 0,
            sum: 0,
            total_price: 0
          }
        });
      })
    )
  }

  private employeesLoader(): Observable<SimpleEmployee[]> {
    if (this.employees().length) {
      return of(this.employees())
    }
    const queryParams: IctuQueryParams = {
      limit: -1,
      paged: 1,
      include: this.donViID,
      include_by: 'donvi_id',
      order: 'ASC',
      orderby: 'name',
      select: 'id,photo,user_id,email,phone,name,full_name,code,donvi_id,csdt_id,gender,dob,positions'
    };
    const conditions: IctuConditionParam[] = [];
    if (this.branchID()) {
      conditions.push(
        { conditionName: 'positions', condition: IctuQueryCondition.like, value: '%|teacher|%' },
        { conditionName: 'csdt_id', condition: IctuQueryCondition.equal, value: this.branchID().toString(), orWhere: 'and' },
        { conditionName: 'positions', condition: IctuQueryCondition.like, value: '%|teaching_assistant|%', orWhere: 'or' },
        { conditionName: 'csdt_id', condition: IctuQueryCondition.equal, value: this.branchID().toString(), orWhere: 'and' }
      )
    }
    else {
      conditions.push(
        { conditionName: 'positions', condition: IctuQueryCondition.like, value: '%|teacher|%' },
        { conditionName: 'positions', condition: IctuQueryCondition.like, value: '%|teaching_assistant|%', orWhere: 'or' }
      )
    }
    return this.employeesService.query(conditions, queryParams, 'all').pipe(
      map((response: DtoObject<Employee[]>): SimpleEmployee[] => {
        this.employees.set(response.data);
        return this.employees();
      })
    )
  }

  private branchesLoader(): Observable<BranchOption[]> {
    const queryParams: IctuQueryParams = {
      limit: -1,
      paged: 1,
      include: this.donViID,
      include_by: 'donvi_id',
      order: 'ASC',
      orderby: 'ten',
      select: 'id,donvi_id,ten,kyhieu,mota,address,time_slots'
    };
    const conditions: IctuConditionParam[] = [];
    return this.coSoDaoTaoService.query(conditions, queryParams).pipe(
      map((response: DtoObject<CoSoDaoTao[]>): BranchOption[] => response.data)
    );
  }

  protected btnSelectBranch(branchID: number): void {
    this.branchID.set(branchID);
  }

  protected reload(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.loadData();
  }

  protected avoidCloseMenuByClicking(event: MouseEvent | KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private exportToWord(statistics: TeachingStatistic[]): void {
    const tableHeaders: string[] = ['STT', 'Giáo viên', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN', 'Dạy chính', 'Trợ giảng', 'Lớp 1-1', 'Bổ trợ'];
    const headerRow = new TableRow({
      children: tableHeaders.map((text: string): TableCell =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text, bold: true })
              ],
              alignment: AlignmentType.CENTER
            })
          ],
          verticalAlign: 'center'
        })
      )
    });
    const dataRows: TableRow[] = statistics.map((row: TeachingStatistic, index: number): TableRow => createStatisticRow(row, (1 + index), this.branchOptions()));
    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },
      rows: [headerRow, ...dataRows],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 }
      },
      margins: {
        marginUnitType: WidthType.DXA,
        top: cmToTwip(.1),
        right: cmToTwip(.1),
        bottom: cmToTwip(.1),
        left: cmToTwip(.1)
      }
    });
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Times New Roman',
              size: 24 // 13pt × 2
            },
            paragraph: {
              // alignment : AlignmentType.JUSTIFIED ,
              spacing: {
                line: 276 // 1.5 lines
              }
              // indent    : {
              //     firstLine : 720 // 1.27 cm
              // }
            }
          }
        }
      },
      sections: [{
        properties: {
          page: {
            size: A4_LANDSCAPE,
            margin: {
              top: cmToTwip(1),
              bottom: cmToTwip(1),
              left: cmToTwip(1),
              right: cmToTwip(1)
            }
          }
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'BÁO CÁO THỐNG KÊ GIỜ GIẢNG',
                bold: true
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              after: cmToTwip(0.2)
            },
            indent: {
              firstLine: 0
            }
          }),
          new Paragraph({
            text: `Từ ngày ${dayjs(this.rangeDates()[0]).format('DD/MM/YYYY')} đến ngày ${dayjs(this.rangeDates()[1]).format('DD/MM/YYYY')}`,
            alignment: AlignmentType.CENTER,
            spacing: {
              after: cmToTwip(0.3)
            },
            indent: {
              firstLine: 0
            }
          }),
          table
        ]
      }]
    });
    Packer.toBlob(doc).then((blob: Blob): void => {
      saveAs(blob, `${this.fileName()}.docx`);
    });
  }

  private async exportTOExcel(statistics: TeachingStatistic[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet: Worksheet = workbook.addWorksheet('Danh sách');
    worksheet.columns = [
      { header: 'STT', key: 'order', width: 5 },
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Họ và tên', key: 'name', width: 25 },
      { header: 'Dạy chính', key: 'totalLectureSessions', width: 15 },
      { header: 'Trợ giảng', key: 'totalTeachingAssistantSessions', width: 15 },
      { header: 'Lớp 1-1', key: 'totalOneOnOneSessions', width: 15 },
      { header: 'Bổ trợ', key: 'totalSupportSessions', width: 15 },
      { header: 'Ghi chú', key: 'note', width: 20 }
    ];
    const data: ExcelCelFormat[] = statistics.map((item: TeachingStatistic, index: number): ExcelCelFormat => ({
      order: 1 + index,
      id: item.employee.code,
      name: item.employee.full_name,
      totalLectureSessions: item.totalLectureSessions,
      totalTeachingAssistantSessions: item.totalTeachingAssistantSessions,
      totalOneOnOneSessions: item.totalOneOnOneSessions,
      totalSupportSessions: item.totalSupportSessions,
      note: ''
    }));
    worksheet.addRows(data);

    // 3. Định dạng Header (Dòng 1)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Times New Roman', size: 12, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      applyBorder(cell);
    });

    // 4. Định dạng các dòng dữ liệu
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Bỏ qua header
        row.eachCell((cell, colNumber) => {
          // Font mặc định
          cell.font = { name: 'Times New Roman', size: 12 };

          // Căn lề: Cột 2 (ID) và 3 (Họ tên) căn trái, còn lại căn giữa
          if (colNumber === 2 || colNumber === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          }
          else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          // Border
          applyBorder(cell);
        });
      }
    });

    // 5. Xuất file
    const buffer: ExcelJS.Buffer = await workbook.xlsx.writeBuffer();
    saveAsExcelFile(buffer, this.fileName());
  }

  btnExportData(type: ExportType): void {
    this.exportingObserver.next(type);
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}

