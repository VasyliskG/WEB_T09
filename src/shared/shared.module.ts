import { Module } from '@nestjs/common';
import { SlugService } from './slug/slug.service';
import { appConfigProvider } from './config/app-config.provider';
import { feeCalculatorProvider } from './config/fee-calculator.provider';
import { STORE_CONFIG } from './config/app-config.provider';
import { FEE_CALCULATOR } from './config/fee-calculator.provider';
import { RequestIdService } from './request-id/request-id.service';

@Module({
  providers: [
    SlugService,
    appConfigProvider,
    feeCalculatorProvider,
    RequestIdService,
  ],
  exports: [SlugService, STORE_CONFIG, FEE_CALCULATOR, RequestIdService],
})
export class SharedModule {}
