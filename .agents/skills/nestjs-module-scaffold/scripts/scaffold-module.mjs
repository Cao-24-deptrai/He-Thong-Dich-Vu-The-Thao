#!/usr/bin/env node
// Tạo khung một module NestJS theo đúng quy ước dự án.
// Dùng: node scaffold-module.mjs <ten-module> [--root apps/api/src/modules] [--dry-run]
// Ví dụ: node scaffold-module.mjs gym-access
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const rootIdx = args.indexOf('--root');
const root = rootIdx >= 0 ? args[rootIdx + 1] : 'apps/api/src/modules';
const name = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--root');
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('Tên module phải là kebab-case, ví dụ: gym-access');
  process.exit(1);
}
const pascal = name.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');
const camel = pascal[0].toLowerCase() + pascal.slice(1);
const dir = path.join(root, name);
if (fs.existsSync(dir)) { console.error(`${dir} đã tồn tại, không ghi đè.`); process.exit(1); }

const files = {
  [`${name}.module.ts`]: `import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ${pascal}Controller } from './controllers/${name}.controller';
import { ${pascal}Service } from './services/${name}.service';
import { ${pascal}Repository } from './repositories/${name}.repository';
import { ${pascal}, ${pascal}Schema } from './schemas/${name}.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: ${pascal}.name, schema: ${pascal}Schema }])],
  controllers: [${pascal}Controller],
  providers: [${pascal}Service, ${pascal}Repository],
  exports: [${pascal}Service], // chỉ export service công khai; không export repository
})
export class ${pascal}Module {}
`,
  'index.ts': `// API công khai của module ${name}. Module khác CHỈ import từ file này.
export { ${pascal}Module } from './${name}.module';
export { ${pascal}Service } from './services/${name}.service';
`,
  [`controllers/${name}.controller.ts`]: `import { Controller, Get } from '@nestjs/common';
import { ${pascal}Service } from '../services/${name}.service';

// Controller mỏng: nhận DTO (zod), kiểm tra quyền (guard), gọi service. Không có nghiệp vụ ở đây.
@Controller('${name}')
export class ${pascal}Controller {
  constructor(private readonly ${camel}Service: ${pascal}Service) {}

  @Get('health')
  health() {
    return this.${camel}Service.health();
  }
}
`,
  [`services/${name}.service.ts`]: `import { Injectable } from '@nestjs/common';
import { ${pascal}Repository } from '../repositories/${name}.repository';

@Injectable()
export class ${pascal}Service {
  constructor(private readonly repo: ${pascal}Repository) {}

  health() {
    return { module: '${name}', ok: true };
  }
}
`,
  [`repositories/${name}.repository.ts`]: `import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { ${pascal}, ${pascal}Document } from '../schemas/${name}.schema';

@Injectable()
export class ${pascal}Repository {
  constructor(@InjectModel(${pascal}.name) private readonly model: Model<${pascal}Document>) {}

  // Mọi hàm ghi nhận \`session\` tùy chọn để chạy trong transaction do service mở.
  async findById(id: string, session?: ClientSession) {
    return this.model.findById(id).session(session ?? null).lean();
  }
}
`,
  [`schemas/${name}.schema.ts`]: `import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ${pascal}Document = HydratedDocument<${pascal}>;

@Schema({ timestamps: true, collection: '${name.replace(/-/g, '_')}' })
export class ${pascal} {
  // TODO: khai báo trường theo mục 5 của docs/SPEC.md.
  // Tiền: Number nguyên (validate Number.isSafeInteger), không Decimal128.
  @Prop({ default: 0 })
  version!: number;
}

export const ${pascal}Schema = SchemaFactory.createForClass(${pascal});
// TODO: khai báo chỉ mục (đặc biệt unique index chống trùng) ngay tại đây.
`,
  [`dto/.gitkeep`]: '',
  [`events/.gitkeep`]: '',
  [`tests/${name}.service.spec.ts`]: `describe('${pascal}Service', () => {
  it('should be implemented', () => {
    // TODO: viết test đơn vị. Nếu module chạm tiền/đặt chỗ: thêm ${name}.race.spec.ts.
    expect(true).toBe(true);
  });
});
`,
};

for (const [rel, content] of Object.entries(files)) {
  const p = path.join(dir, rel);
  console.log(`${dry ? '[dry-run] ' : ''}tạo ${p}`);
  if (!dry) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); }
}
console.log(`\nXong. Việc tiếp theo: (1) import ${pascal}Module vào AppModule, (2) điền schema + index, (3) cập nhật packages/contracts, (4) viết test.`);
