import { ValueTransformer } from 'typeorm';

/**
 * Драйвер pg повертає decimal як рядок ("45000.00"), щоб не втратити точність.
 * Для цін у межах decimal(10,2) точності number достатньо, тому перетворюємо
 * значення на число при читанні з БД.
 */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};
