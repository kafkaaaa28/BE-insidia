import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;

  const userService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes creator id from auth payload when creating user', async () => {
    const dto = {
      email: 'user@example.com',
      role: 'USER_BIASA' as const,
    };

    await controller.create(dto, {
      auth: {
        sub: 'admin-1',
      },
    } as never);

    expect(userService.create).toHaveBeenCalledWith(dto, 'admin-1');
  });

  it('passes string id to update without numeric coercion', async () => {
    const dto = {
      name: 'Updated User',
    };

    await controller.update('cuid-user-id', dto);

    expect(userService.update).toHaveBeenCalledWith('cuid-user-id', dto);
  });

  it('passes actor id from auth payload when deleting user', async () => {
    await controller.remove('cuid-user-id', {
      auth: {
        sub: 'admin-1',
      },
    } as never);

    expect(userService.remove).toHaveBeenCalledWith('cuid-user-id', 'admin-1');
  });
});
