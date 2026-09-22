import { Module } from '@nestjs/common';
import { BigTasksController } from './big-tasks.controller.js';
import { BigTasksService } from './big-tasks.service.js';

@Module({
  controllers: [BigTasksController],
  providers: [BigTasksService]
})
export class BigTasksModule {}
