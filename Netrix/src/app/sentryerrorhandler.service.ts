import { Injectable, ErrorHandler } from '@angular/core';
import * as Sentry from 'sentry-cordova';

@Injectable({
  providedIn: 'root'
})
export class SentryErrorHandler extends ErrorHandler {

  handleError(error) {
    super.handleError(error);
    try {
      Sentry.captureException(error.originalError || error);
    } catch(e) {
      console.error(e);
    }
  }

}
