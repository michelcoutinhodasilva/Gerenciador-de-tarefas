import { TestBed } from '@angular/core/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { App } from './app';

describe('App', () => {
  it('cria a aplicação com a área de avisos', async () => {
    TestBed.configureTestingModule({ providers: [MessageService, ConfirmationService] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('p-toast')).not.toBeNull();
  });
});
