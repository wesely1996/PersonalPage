import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-search-input',
  standalone: true,
  templateUrl: './search-input.component.html',
  styleUrl: './search-input.component.scss',
})
export class SearchInputComponent {
  @Input() placeholder = 'Search...';
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  onInput(event: Event) {
    const target = event.target as HTMLInputElement | null;
    this.valueChange.emit(target?.value ?? '');
  }
}
