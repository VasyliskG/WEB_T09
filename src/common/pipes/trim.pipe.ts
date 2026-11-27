import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type === 'custom') {
      return value;
    }
    return this.trimDeep(value);
  }

  private trimDeep(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.trimDeep(item));
    }
    if (this.isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, this.trimDeep(item)]),
      );
    }
    return value;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const proto = Object.getPrototypeOf(value) as object | null;
    return proto === Object.prototype || proto === null;
  }
}
