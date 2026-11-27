import { Body, Controller, Get, Post } from '@nestjs/common';
import { FeaturesService } from './features.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';

@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Public()
  @Get()
  findAll() {
    return this.featuresService.findAll();
  }

  @Roles(Role.ADMIN, Role.STORE_MANAGER)
  @Post()
  create(@Body() dto: CreateFeatureDto) {
    return this.featuresService.create(dto);
  }
}
