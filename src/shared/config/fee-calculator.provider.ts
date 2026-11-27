import { Provider } from '@nestjs/common';
import { STORE_CONFIG, StoreConfig } from './app-config.provider';

export const FEE_CALCULATOR = 'FEE_CALCULATOR';

export interface FeeCalculator {
  calculateTax(amount: number): number;
}

export const feeCalculatorProvider: Provider = {
  provide: FEE_CALCULATOR,
  useFactory: (config: StoreConfig): FeeCalculator => ({
    calculateTax: (amount: number) => amount * (config.taxPercent / 100),
  }),
  inject: [STORE_CONFIG],
};
