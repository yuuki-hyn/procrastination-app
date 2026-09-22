import { Test, TestingModule } from '@nestjs/testing';
import { SubTasksController } from './sub-tasks.controller.js';

describe('SubTasksController', () => {
  let controller: SubTasksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubTasksController],
    }).compile();

    controller = module.get<SubTasksController>(SubTasksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
