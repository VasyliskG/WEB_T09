import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { GadgetsService } from './gadgets.service';
import { CreateGadgetDto } from './dto/create-gadget.dto';
import { UpdateGadgetDto } from './dto/update-gadget.dto';
import { GadgetAggregateDto } from './dto/gadget-aggregate.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { RequestIdService } from '../shared/request-id/request-id.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';

@Controller('gadgets')
export class GadgetsController {
  constructor(
    private readonly gadgetsService: GadgetsService,
    private readonly requestIdService: RequestIdService,
  ) {}

  /** GET /gadgets?feature=5G&brand=TechCorp&search=...&page=1&limit=10 */
  @Public()
  @Get()
  findAll(
    @Query() query: PaginationQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('X-Request-Id', this.requestIdService.getId());
    return this.gadgetsService.findAll(query);
  }

  /** Повний агрегат: brand (M:1) + features (M:N) + warranty (1:1) */
  @Public()
  @Get(':id/full')
  findFull(@Param('id', ParseUUIDPipe) id: string) {
    return this.gadgetsService.findFullAggregate(id);
  }

  /** Гаджет з вкладеним брендом (relations: ['brand']) */
  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.gadgetsService.findOne(id);
  }

  /** Створення агрегата в одній транзакції */
  @Roles(Role.ADMIN, Role.STORE_MANAGER)
  @Post('transactional')
  createTransactional(@Body() dto: GadgetAggregateDto) {
    return this.gadgetsService.createTransactional(dto);
  }

  /** Повна заміна агрегата в одній транзакції */
  @Roles(Role.ADMIN, Role.STORE_MANAGER)
  @Put(':id/transactional')
  replaceTransactional(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GadgetAggregateDto,
  ) {
    return this.gadgetsService.replaceTransactional(id, dto);
  }

  @Roles(Role.ADMIN, Role.STORE_MANAGER)
  @Post()
  create(@Body() dto: CreateGadgetDto) {
    return this.gadgetsService.create(dto);
  }

  @Roles(Role.ADMIN, Role.STORE_MANAGER)
  @Patch(':id/restore')
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.gadgetsService.restore(id);
  }

  @Roles(Role.ADMIN, Role.STORE_MANAGER)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGadgetDto) {
    return this.gadgetsService.update(id, dto);
  }

  /** Фізичне видалення — спрацьовують ON DELETE CASCADE для warranty та gadget_features */
  // Незворотна операція — лише адміністратор
  @Roles(Role.ADMIN)
  @Delete(':id/permanent')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePermanently(@Param('id', ParseUUIDPipe) id: string) {
    return this.gadgetsService.removePermanently(id);
  }

  /** М'яке видалення (deletedAt) */
  @Roles(Role.ADMIN, Role.STORE_MANAGER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.gadgetsService.remove(id);
  }
}
