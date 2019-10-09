import { _SatDatepickerContentMixinBase, MAT_DATEPICKER_SCROLL_STRATEGY } from './../saturn-datepicker/src/datepicker/datepicker';
import { matDatepickerAnimations } from './datepicker-animations';
import { Optional } from '@angular/core';
import { Directionality } from '@angular/cdk/bidi';
import { DOCUMENT } from '@angular/common';
import { UP_ARROW, ESCAPE } from '@angular/cdk/keycodes';
import { Subscription, Subject, merge } from 'rxjs';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { Output, ComponentRef, NgZone, ViewContainerRef, Inject } from '@angular/core';
import { ComponentType, ComponentPortal } from '@angular/cdk/portal';
import { Input, EventEmitter } from '@angular/core';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ScrollStrategy, OverlayRef, Overlay, PositionStrategy, OverlayConfig } from '@angular/cdk/overlay';
import { ThemePalette, DateAdapter, CanColor, } from '@angular/material';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { take, filter } from 'rxjs/operators';
import { SatDoubleCalendar } from './double-calendar';
import { SatDatepickerRangeValue, SatCalendarCellCssClasses, SatDatepickerInput } from '../saturn-datepicker/src/datepicker';
import { createMissingDateImplError } from '../saturn-datepicker/src/datepicker/datepicker-errors';

/** Used to generate a unique ID for each datepicker instance. */
let datepickerUid = 0;

@Component({
    // moduleId: module.id,
    // tslint:disable-next-line: component-selector
    selector: 'sat-double-datepicker-content',
    templateUrl: 'double-datepicker-content.html',
    styleUrls: ['double-datepicker-content.css'],
    // tslint:disable-next-line: no-host-metadata-property
    host: {
        class:
            'mat-datepicker-content mat-double-datepicker-content',
        '[@transformPanel]': '"enter"',
        '[class.mat-datepicker-content-touch]': 'datepicker.touchUi'
    },
    animations: [
        matDatepickerAnimations.transformPanel,
        matDatepickerAnimations.fadeInCalendar,
    ],
    exportAs: 'matDoubleDatepickerContent',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    // tslint:disable-next-line: no-inputs-metadata-property
    inputs: ['color']
})
export class SatDoubleDatepickerContent<D> extends _SatDatepickerContentMixinBase implements AfterViewInit, CanColor {

    /** Reference to the internal calendar component. */
    // @ViewChild(SatDoubleCalendar, { static: false }) _calendar: SatDoubleCalendar<D>;
    @ViewChild(SatDoubleCalendar) _calendar: SatDoubleCalendar<D>;

    /** Reference to the datepicker that created the overlay. */
    datepicker: SatDoubleDatepicker<D>;

    /** Whether the datepicker is above or below the input. */
    _isAbove: boolean;

    constructor(elementRef: ElementRef) {
        super(elementRef);
    }

    ngAfterViewInit() {
        this._calendar.focusActiveCell();
    }

    close() {
        if (this.datepicker.closeAfterSelection) {
            this.datepicker.close();
        }
    }
}
@Component({
    // moduleId: module.id,
    // tslint:disable-next-line: component-selector
    selector: 'sat-double-datepicker',
    template: '',
    exportAs: 'matDoubleDatepicker',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
})
// tslint:disable-next-line: component-class-suffix
export class SatDoubleDatepicker<D> {
    /** Whenever datepicker is for selecting range of dates. */
    @Input()
    get rangeMode(): boolean {
        return this._rangeMode;
    }
    set rangeMode(mode: boolean) {
        this._rangeMode = mode;
        if (this.rangeMode) {
            this._validSelected = null;
        } else {
            this._beginDate = this._endDate = null;
        }
    }
    private _rangeMode;

    /** Start of dates interval. */
    @Input()
    get beginDate(): D | null { return this._beginDate; }
    set beginDate(value: D | null) {
        this._validSelected = null;
        this._beginDate = this._getValidDateOrNull(this._dateAdapter.deserialize(value));
    }
    _beginDate: D | null;

    /** End of dates interval. */
    @Input()
    get endDate(): D | null { return this._endDate; }
    set endDate(value: D | null) {
        this._validSelected = null;
        this._endDate = this._getValidDateOrNull(this._dateAdapter.deserialize(value));
    }
    _endDate: D | null;

    private _scrollStrategy: () => ScrollStrategy;

    /** An input indicating the type of the custom header component for the calendar, if set. */
    @Input() calendarHeaderComponent: ComponentType<any>;

    /** An input indicating the type of the custom footer component for the calendar, if set. */
    @Input() calendarFooterComponent: ComponentType<any>;

    /** The date to open the calendar to initially. */
    @Input()
    get startAt(): D | null {
        // If an explicit startAt is set we start there, otherwise we start at whatever the currently
        // selected value is.
        if (this.rangeMode) {
            return this._startAt || (this._datepickerInput && this._datepickerInput.value ?
                (<SatDatepickerRangeValue<D>>this._datepickerInput.value).begin : null);
        }
        return this._startAt || (this._datepickerInput ? <D | null>this._datepickerInput.value : null);
    }
    set startAt(value: D | null) {
        this._startAt = this._getValidDateOrNull(this._dateAdapter.deserialize(value));
    }
    private _startAt: D | null;

    /** The view that the calendar should start in. */
    @Input() startView: 'month' | 'year' | 'multi-year' = 'month';

    /** Color palette to use on the datepicker's calendar. */
    @Input()
    get color(): ThemePalette {
        return this._color ||
            (this._datepickerInput ? this._datepickerInput._getThemePalette() : undefined);
    }
    set color(value: ThemePalette) {
        this._color = value;
    }
    _color: ThemePalette;

    /**
     * Whether the calendar UI is in touch mode. In touch mode the calendar opens in a dialog rather
     * than a popup and elements have more padding to allow for bigger touch targets.
     */
    @Input()
    get touchUi(): boolean { return this._touchUi; }
    set touchUi(value: boolean) {
        this._touchUi = coerceBooleanProperty(value);
    }
    private _touchUi = false;

    /** Whether the datepicker pop-up should be disabled. */
    @Input()
    get disabled(): boolean {
        return this._disabled === undefined && this._datepickerInput ?
            this._datepickerInput.disabled : !!this._disabled;
    }
    set disabled(value: boolean) {
        const newValue = coerceBooleanProperty(value);

        if (newValue !== this._disabled) {
            this._disabled = newValue;
            this._disabledChange.next(newValue);
        }
    }
    private _disabled: boolean;

    /**
     * Emits selected year in multiyear view.
     * This doesn't imply a change on the selected date.
     */
    @Output() readonly yearSelected: EventEmitter<D> = new EventEmitter<D>();

    /**
     * Emits selected month in year view.
     * This doesn't imply a change on the selected date.
     */
    @Output() readonly monthSelected: EventEmitter<D> = new EventEmitter<D>();

    /** Classes to be passed to the date picker panel. Supports the same syntax as `ngClass`. */
    @Input() panelClass: string | string[];

    /** Function that can be used to add custom CSS classes to dates. */
    @Input() dateClass: (date: D) => SatCalendarCellCssClasses;

    /** Emits when the datepicker has been opened. */
    @Output('opened') openedStream: EventEmitter<void> = new EventEmitter<void>();

    /** Emits when the datepicker has been closed. */
    @Output('closed') closedStream: EventEmitter<void> = new EventEmitter<void>();

    /** Enables datepicker closing after selection */
    @Input() closeAfterSelection = true;

    /** In range mod, enable datepicker to select the first date selected as a one-day-range,
     * if the user closes the picker before selecting another date
     */
    @Input() selectFirstDateOnClose = false;

    /** Order the views when clicking on period label button */
    @Input() orderPeriodLabel: 'month' | 'multi-year' = 'multi-year';

    /** Whether the calendar is open. */
    @Input()
    get opened(): boolean { return this._opened; }
    set opened(value: boolean) { value ? this.open() : this.close(); }
    private _opened = false;

    /** The id for the datepicker calendar. */
    id: string = `sat-datepicker-${datepickerUid++}`;

    /** The currently selected date. */
    get _selected(): D | null { return this._validSelected; }
    set _selected(value: D | null) { this._validSelected = value; }
    private _validSelected: D | null = null;

    /** The minimum selectable date. */
    get _minDate(): D | null {
        return this._datepickerInput && this._datepickerInput.min;
    }

    /** The maximum selectable date. */
    get _maxDate(): D | null {
        return this._datepickerInput && this._datepickerInput.max;
    }

    get _dateFilter(): (date: D | null) => boolean {
        return this._datepickerInput && this._datepickerInput._dateFilter;
    }

    /** A reference to the overlay when the calendar is opened as a popup. */
    _popupRef: OverlayRef;

    /** A reference to the dialog when the calendar is opened as a dialog. */
    private _dialogRef: MatDialogRef<SatDoubleDatepickerContent<D>> | null;

    /** A portal containing the calendar for this datepicker. */
    private _calendarPortal: ComponentPortal<SatDoubleDatepickerContent<D>>;

    /** Reference to the component instantiated in popup mode. */
    private _popupComponentRef: ComponentRef<SatDoubleDatepickerContent<D>> | null;

    /** The element that was focused before the datepicker was opened. */
    private _focusedElementBeforeOpen: HTMLElement | null = null;

    /** Subscription to value changes in the associated input element. */
    private _inputSubscription = Subscription.EMPTY;

    /** The input element this datepicker is associated with. */
    _datepickerInput: SatDatepickerInput<D>;

    /** Emits when the datepicker is disabled. */
    readonly _disabledChange = new Subject<boolean>();

    /** Emits new selected date when selected date changes. */
    readonly _selectedChanged = new Subject<SatDatepickerRangeValue<D> | D>();

    /** The date already selected by the user in range mode. */
    private _beginDateSelected: D | null;

    constructor(private _dialog: MatDialog,
        private _overlay: Overlay,
        private _ngZone: NgZone,
        private _viewContainerRef: ViewContainerRef,
        @Inject(MAT_DATEPICKER_SCROLL_STRATEGY) scrollStrategy: any,
        @Optional() private _dateAdapter: DateAdapter<D>,
        @Optional() private _dir: Directionality,
        @Optional() @Inject(DOCUMENT) private _document: any) {
        if (!this._dateAdapter) {
            throw createMissingDateImplError('DateAdapter');
        }

        this._scrollStrategy = scrollStrategy;
    }

    ngOnDestroy() {
        this.close();
        this._inputSubscription.unsubscribe();
        this._disabledChange.complete();

        if (this._popupRef) {
            this._popupRef.dispose();
            this._popupComponentRef = null;
        }
    }

    /** Selects the given date */
    select(date: D): void {
        let oldValue = this._selected;
        this._selected = date;
        if (!this._dateAdapter.sameDate(oldValue, this._selected)) {
            this._selectedChanged.next(date);
        }
    }


    /** Selects the given date range */
    _selectRange(dates: SatDatepickerRangeValue<D>): void {
        this._beginDateSelected = null;
        if (!this._dateAdapter.sameDate(dates.begin, this.beginDate) ||
            !this._dateAdapter.sameDate(dates.end, this.endDate)) {
            this._selectedChanged.next(dates);
        }
        this._beginDate = dates.begin;
        this._endDate = dates.end;
    }
    /** Emits the selected year in multiyear view */
    _selectYear(normalizedYear: D): void {
        this.yearSelected.emit(normalizedYear);
    }

    /** Emits selected month in year view */
    _selectMonth(normalizedMonth: D): void {
        this.monthSelected.emit(normalizedMonth);
    }

    /**
     * Register an input with this datepicker.
     * @param input The datepicker input to register with this datepicker.
     */
    _registerInput(input: SatDatepickerInput<D>): void {
        if (this._datepickerInput) {
            throw Error('A SatDatepicker can only be associated with a single input.');
        }
        this._datepickerInput = input;
        this._inputSubscription =
            this._datepickerInput._valueChange
                .subscribe((value: SatDatepickerRangeValue<D> | D | null) => {
                    if (value === null) {
                        this.beginDate = this.endDate = this._selected = null;
                        return;
                    }
                    if (value && value.hasOwnProperty('begin') && value.hasOwnProperty('end')) {
                        value = <SatDatepickerRangeValue<D>>value;
                        if (value.begin && value.end &&
                            this._dateAdapter.compareDate(value.begin, value.end) <= 0) {
                            this.beginDate = value.begin;
                            this.endDate = value.end;
                        } else {
                            this.beginDate = this.endDate = null;
                        }
                    } else {
                        this._selected = <D>value;
                    }
                });
    }

    /** Open the calendar. */
    open(): void {
        if (this._opened || this.disabled) {
            return;
        }
        if (!this._datepickerInput) {
            throw Error('Attempted to open an SatDatepicker with no associated input.');
        }
        if (this._document) {
            this._focusedElementBeforeOpen = this._document.activeElement;
        }

        this.touchUi ? this._openAsDialog() : this._openAsPopup();
        this._opened = true;
        this.openedStream.emit();
    }

    /** Close the calendar. */
    close(): void {
        if (!this._opened) {
            return;
        }
        if (this._popupRef && this._popupRef.hasAttached()) {
            this._popupRef.detach();
        }
        if (this._dialogRef) {
            this._dialogRef.close();
            this._dialogRef = null;
        }
        if (this._calendarPortal && this._calendarPortal.isAttached) {
            this._calendarPortal.detach();
        }
        if (this._beginDateSelected && this.selectFirstDateOnClose) {
            this._selectRange({ begin: this._beginDateSelected, end: this._beginDateSelected });
        }

        const completeClose = () => {
            // The `_opened` could've been reset already if
            // we got two events in quick succession.
            if (this._opened) {
                this._opened = false;
                this.closedStream.emit();
                this._focusedElementBeforeOpen = null;
            }
        };

        if (this._focusedElementBeforeOpen &&
            typeof this._focusedElementBeforeOpen.focus === 'function') {
            // Because IE moves focus asynchronously, we can't count on it being restored before we've
            // marked the datepicker as closed. If the event fires out of sequence and the element that
            // we're refocusing opens the datepicker on focus, the user could be stuck with not being
            // able to close the calendar at all. We work around it by making the logic, that marks
            // the datepicker as closed, async as well.
            this._focusedElementBeforeOpen.focus();
            setTimeout(completeClose);
        } else {
            completeClose();
        }
    }

    setBeginDateSelected(date: D): void {
        this._beginDateSelected = date;
    }

    /** Open the calendar as a dialog. */
    private _openAsDialog(): void {
        // Usually this would be handled by `open` which ensures that we can only have one overlay
        // open at a time, however since we reset the variables in async handlers some overlays
        // may slip through if the user opens and closes multiple times in quick succession (e.g.
        // by holding down the enter key).
        if (this._dialogRef) {
            this._dialogRef.close();
        }

        this._dialogRef = this._dialog.open<SatDoubleDatepickerContent<D>>(SatDoubleDatepickerContent, {
            direction: this._dir ? this._dir.value : 'ltr',
            viewContainerRef: this._viewContainerRef,
            panelClass: 'mat-datepicker-dialog',
        });

        this._dialogRef.afterClosed().subscribe(() => this.close());
        this._dialogRef.componentInstance.datepicker = this;
        this._setColor();
    }

    /** Open the calendar as a popup. */
    private _openAsPopup(): void {
        if (!this._calendarPortal) {
            this._calendarPortal = new ComponentPortal<SatDoubleDatepickerContent<D>>(SatDoubleDatepickerContent,
                this._viewContainerRef);
        }

        if (!this._popupRef) {
            this._createPopup();
        }

        if (!this._popupRef.hasAttached()) {
            this._popupComponentRef = this._popupRef.attach(this._calendarPortal);
            this._popupComponentRef.instance.datepicker = this;
            this._setColor();

            // Update the position once the calendar has rendered.
            this._ngZone.onStable.asObservable().pipe(take(1)).subscribe(() => {
                this._popupRef.updatePosition();
            });
        }
    }

    /** Create the popup. */
    private _createPopup(): void {
        const overlayConfig = new OverlayConfig({
            positionStrategy: this._createPopupPositionStrategy(),
            hasBackdrop: true,
            backdropClass: 'mat-overlay-transparent-backdrop',
            direction: this._dir,
            scrollStrategy: this._scrollStrategy(),
            panelClass: 'mat-datepicker-popup',
        });

        this._popupRef = this._overlay.create(overlayConfig);
        this._popupRef.overlayElement.setAttribute('role', 'dialog');

        merge(
            this._popupRef.backdropClick(),
            this._popupRef.detachments(),
            this._popupRef.keydownEvents().pipe(filter(event => {
                // Closing on alt + up is only valid when there's an input associated with the datepicker.
                return event.keyCode === ESCAPE ||
                    (this._datepickerInput && event.altKey && event.keyCode === UP_ARROW);
            }))
        ).subscribe(() => this.close());
    }

    /** Create the popup PositionStrategy. */
    private _createPopupPositionStrategy(): PositionStrategy {
        return this._overlay.position()
            .flexibleConnectedTo(this._datepickerInput.getConnectedOverlayOrigin())
            .withTransformOriginOn('.mat-datepicker-content')
            .withFlexibleDimensions(false)
            .withViewportMargin(8)
            .withLockedPosition()
            .withPositions([
                {
                    originX: 'start',
                    originY: 'bottom',
                    overlayX: 'start',
                    overlayY: 'top'
                },
                {
                    originX: 'start',
                    originY: 'top',
                    overlayX: 'start',
                    overlayY: 'bottom'
                },
                {
                    originX: 'end',
                    originY: 'bottom',
                    overlayX: 'end',
                    overlayY: 'top'
                },
                {
                    originX: 'end',
                    originY: 'top',
                    overlayX: 'end',
                    overlayY: 'bottom'
                }
            ]);
    }

    /**
     * @param obj The object to check.
     * @returns The given object if it is both a date instance and valid, otherwise null.
     */
    private _getValidDateOrNull(obj: any): D | null {
        return (this._dateAdapter.isDateInstance(obj) && this._dateAdapter.isValid(obj)) ? obj : null;
    }

    /** Passes the current theme color along to the calendar overlay. */
    private _setColor(): void {
        const color = this.color;
        if (this._popupComponentRef) {
            this._popupComponentRef.instance.color = color;
        }
        if (this._dialogRef) {
            this._dialogRef.componentInstance.color = color;
        }
    }
}
