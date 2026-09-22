import { Test, TestingModule } from '@nestjs/testing';
import { BigTasksController } from './big-tasks.controller.js';

describe('BigTasksController', () => {
  let controller: BigTasksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BigTasksController],
    }).compile();

    controller = module.get<BigTasksController>(BigTasksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
