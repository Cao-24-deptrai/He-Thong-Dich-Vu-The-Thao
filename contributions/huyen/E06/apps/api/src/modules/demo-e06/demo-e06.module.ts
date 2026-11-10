import { Module } from '@nestjs/common';
import { DemoE06Controller } from './demo-e06.controller.js';

@Module({ controllers: [DemoE06Controller] })
export class DemoE06Module {}
