import { Component } from '@angular/core';
import { LearningStatisticComponentComponent } from "@app/components/learning-statistic-component/learning-statistic-component.component";

@Component({
  selector: 'app-sales-learning-statistic',
  imports: [ LearningStatisticComponentComponent],
  templateUrl: './sales-learning-statistic.component.html',
  styleUrl: './sales-learning-statistic.component.css',
})
export default class SalesLearningStatisticComponent {

}
