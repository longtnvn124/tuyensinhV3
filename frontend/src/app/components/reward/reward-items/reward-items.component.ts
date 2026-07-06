import { Component } from '@angular/core';
import { ComingSoonComponent } from '@components/coming-soon/coming-soon.component';

@Component( {
    selector    : 'app-reward-items' ,
    imports     : [ ComingSoonComponent ] ,
    templateUrl : './reward-items.component.html' ,
    styleUrl    : './reward-items.component.css'
} )
export default class RewardItemsComponent {

}
