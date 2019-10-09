import {
    Component,
    ViewEncapsulation,
    ChangeDetectionStrategy,
    EventEmitter,
    Input,
    Output,
    ViewChild,
    Optional,
    Inject,
    ChangeDetectorRef
} from '@angular/core';
import { SatDoubleDatepicker } from './double-datepicker';
import { MatDateFormats, MAT_DATE_FORMATS } from '@angular/material';
import { ComponentType } from '@angular/cdk/portal';
import {
    SatCalendar,
    matDatepickerAnimations,
    SatDatepickerIntl
} from '../saturn-datepicker/src/datepicker';
import { DateAdapter } from '../saturn-datepicker/src/datetime/date-adapter';

/** Used to generate a unique ID for each datepicker instance. */
let doubleCalendarUid = 0;
/**
 * A calendar that is used as part of the datepicker.
 * @docs-private
 */
@Component({
    // moduleId: module.id,
    // tslint:disable-next-line: component-selector
    selector: 'sat-double-calendar',
    templateUrl: 'double-calendar.html',
    styleUrls: ['double-calendar.css'],
    // tslint:disable-next-line: no-host-metadata-property
    host: {
        class: 'mat-calendar mat-double-calendar',
    },
    animations: [
        matDatepickerAnimations.transformPanel,
        matDatepickerAnimations.fadeInCalendar,
    ],
    exportAs: 'matDoubleCalendar',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
// tslint:disable-next-line: component-class-suffix
export class SatDoubleCalendar<D> extends SatCalendar<D> {

    id = `sat-double-calendar-${doubleCalendarUid++}`;

    // @ViewChild('calendar1', { static: false }) calendar1: SatCalendar<D>;
    // @ViewChild('calendar2', { static: false }) calendar2: SatCalendar<D>;
    @ViewChild('calendar1') calendar1: SatCalendar<D>;
    @ViewChild('calendar2') calendar2: SatCalendar<D>;

    datepicker: SatDoubleDatepicker<D>;

    @Input()
    get startAt2(): D | null { return this._startAt2; }
    set startAt2(value: D | null) {
        this._startAt2 = this._getValidDateOrNull2(this._dateAdapter2.deserialize(value));
    }
    // tslint:disable-next-line: variable-name
    private _startAt2: D | null;

    /** An input indicating the type of the custom header component for the calendar, if set. */
    @Input() calendarHeaderComponent: ComponentType<any>;

    /** An input indicating the type of the custom footer component for the calendar, if set. */
    @Input() calendarFooterComponent: ComponentType<any>;

    @Output() beginDateSelectedChange = new EventEmitter<D>();

    constructor(
        // tslint:disable-next-line: variable-name
        _intl: SatDatepickerIntl,
        // tslint:disable-next-line: variable-name
        @Optional() public _dateAdapter2: DateAdapter<D>,
        // tslint:disable-next-line: variable-name
        @Optional() @Inject(MAT_DATE_FORMATS) private _dateFormats2: MatDateFormats,
        // tslint:disable-next-line: variable-name
        private _changeDetectorRef2: ChangeDetectorRef) {

        super(_intl, _dateAdapter2, _dateFormats2, _changeDetectorRef2);
        this.rangeMode = true;
        this.startAt2 = this._dateAdapter2.addCalendarMonths(this._dateAdapter2.today(), 1);
    }

    close() {
        if (this.datepicker.closeAfterSelection) {
            this.datepicker.close();
        }
    }

    setBeginDateSelected($event: D | null) {
        if (this.beginDate !== $event) {
            this.beginDate = $event;
            if (!this._dateAdapter2.sameDate(this.calendar1.beginDate, this.beginDate)) {
                this.calendar1._dateSelected(this.beginDate);
            }
            if (!this._dateAdapter2.sameDate(this.calendar2.beginDate, this.beginDate)) {
                this.calendar2._dateSelected(this.beginDate);
            }
        }
        console.log('aa');
        this.beginDateSelectedChange.emit($event);

    }

    selectRange($event) {
        console.log('bb');
        this.beginDate = $event.begin;
        this.endDate = $event.end;
        if (!this._dateAdapter2.sameDate(this.calendar1.beginDate, this.beginDate)
            || !this._dateAdapter2.sameDate(this.calendar1.endDate, this.endDate)) {
            this.calendar1.beginDate = this.beginDate;
            this.calendar1._dateSelected(this.endDate);
        }
        if (!this._dateAdapter2.sameDate(this.calendar2.beginDate, this.beginDate)
            || !this._dateAdapter2.sameDate(this.calendar2.endDate, this.endDate)) {
            this.calendar2.beginDate = this.beginDate;
            this.calendar2._dateSelected(this.endDate);
        }

        this.dateRangesChange.emit($event);
    }

    focusActiveCell() {
        this.calendar1.focusActiveCell();
    }

    select(date: D): void {
        console.log(this);
        // console.log(super);
        this.selectedChange.emit(date);
    }

    selectYear($event) {
        this.yearSelected.emit($event);
    }

    selectMonth($event) {
        this.monthSelected.emit($event);
    }

    private _getValidDateOrNull2(obj: any): D | null {
        return (this._dateAdapter2.isDateInstance(obj) && this._dateAdapter2.isValid(obj)) ? obj : null;
    }
}
