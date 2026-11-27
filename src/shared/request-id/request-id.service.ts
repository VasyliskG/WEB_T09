import { Injectable, Scope } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable({ scope: Scope.TRANSIENT })
export class RequestIdService {
  readonly id = randomUUID();

  getId(): string {
    return this.id;
  }
}
