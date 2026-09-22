import { Test, TestingModule } from '@nestjs/testing';
import { SubTasksService } from './sub-tasks.service.js';

describe('SubTasksService', () => {
  let service: SubTasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubTasksService],
    }).compile();

    service = module.get<SubTasksService>(SubTasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
