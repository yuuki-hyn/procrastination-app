import { Test, TestingModule } from '@nestjs/testing';
import { BigTasksService } from './big-tasks.service.js';

describe('BigTasksService', () => {
  let service: BigTasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BigTasksService],
    }).compile();

    service = module.get<BigTasksService>(BigTasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
