import { Module } from '@nestjs/common';
import { SubTasksController } from './sub-tasks.controller.js';
import { SubTasksService } from './sub-tasks.service.js';

@Module({
  controllers: [SubTasksController],
  providers: [SubTasksService]
})
export class SubTasksModule {}
