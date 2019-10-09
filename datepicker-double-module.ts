import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SatDoubleCalendar } from './double-calendar';
import { SatDoubleDatepicker, SatDoubleDatepickerContent, } from './double-datepicker';
import { SatNativeDateModule } from '../saturn-datepicker/src/datetime';
import { SatDatepickerModule } from './../saturn-datepicker/src/datepicker/datepicker-module';


@NgModule({
  imports: [
    CommonModule,
    SatDatepickerModule,
    SatNativeDateModule
  ],
  exports: [
    SatDoubleCalendar,
    SatDoubleDatepicker,
    SatDoubleDatepickerContent
  ],
  declarations: [
    SatDoubleCalendar,
    SatDoubleDatepicker,
    SatDoubleDatepickerContent,
  ],
  entryComponents: [
    SatDoubleDatepickerContent,
  ]
})
export class SatDatepickerDoubleModule { }
