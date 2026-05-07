import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { createUserSchema, type CreateUserDto } from './dto/create-user.dto';
import { updateUserSchema, type UpdateUserDto } from './dto/update-user.dto';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe';
import {
  AdminAccessGuard,
  SuperAdminAccessGuard,
} from '../../guards/admin-access.guard';
import type { AuthenticatedRequest } from '../../guards/access-token.guard';
import { Query } from '@nestjs/common';
import { UserFilter } from './user.constants';
@UseGuards(AdminAccessGuard)
@UseGuards(SuperAdminAccessGuard)
@Controller('admin/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createUserSchema)) createUserDto: CreateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userService.create(createUserDto, request.auth.sub);
  }

  @Get()
  findAll(
    @Query('filter')
    filter?: 'all' | 'active' | 'deleted',
  ) {
    console.log('Received filter query:', filter);
    return this.userService.findAll({
      filter,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.userService.remove(id, request.auth.sub);
  }
}
