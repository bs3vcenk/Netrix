import { Component } from '@angular/core';
import { trigger, state, style, animate, transition } from "@angular/animations";

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  animations: [
    trigger('animChange', [
      state('opaque', style({ opacity: 1 })),
      state('transparent', style({ opacity: 0 })),
      transition('transparent => opaque', animate('500ms ease-out'))
    ])
  ]
})
export class Tab4Page {

  titleState = "transparent";

  constructor() {}

  ngOnInit() {
    this.titleState = "opaque";
  }

}
