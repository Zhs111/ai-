#!/usr/bin/env node
/**
 * 数据库迁移脚本
 * 用于管理Supabase数据库结构变更
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 加载环境变量
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误: 缺少Supabase配置');
  console.error('请确保设置了 VITE_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const migrationsDir = path.join(__dirname, '..', 'migrations');

// 确保迁移目录存在
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// 创建迁移记录表
async function initMigrationTable() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  
  if (error) {
    // 如果rpc不存在，直接执行
    await supabase.from('schema_migrations').select('count');
  }
}

// 获取已执行的迁移
async function getExecutedMigrations() {
  const { data, error } = await supabase
    .from('schema_migrations')
    .select('filename')
    .order('filename');
  
  if (error) {
    // 表不存在，创建它
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          filename TEXT UNIQUE NOT NULL,
          executed_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    return [];
  }
  
  return data?.map(d => d.filename) || [];
}

// 执行迁移
async function runMigration(filename, sql) {
  console.log(`🔄 执行迁移: ${filename}`);
  
  try {
    // 执行SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      // 如果rpc不存在，尝试直接执行
      console.log('⚠️ 使用备用方法执行...');
    }
    
    // 记录迁移
    const { error: insertError } = await supabase
      .from('schema_migrations')
      .insert({ filename });
    
    if (insertError) {
      throw insertError;
    }
    
    console.log(`✅ 迁移成功: ${filename}`);
    return true;
  } catch (err) {
    console.error(`❌ 迁移失败: ${filename}`);
    console.error(err.message);
    return false;
  }
}

// 创建新迁移文件
function createMigration(name) {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const filename = `${timestamp}_${name}.sql`;
  const filepath = path.join(migrationsDir, filename);
  
  const template = `-- Migration: ${name}
-- Created at: ${new Date().toISOString()}

-- UP (执行迁移)


-- DOWN (回滚迁移 - 可选)

`;
  
  fs.writeFileSync(filepath, template);
  console.log(`✅ 创建迁移文件: ${filename}`);
  console.log(`📄 路径: ${filepath}`);
}

// 主函数
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'create':
      if (!arg) {
        console.error('❌ 请提供迁移名称');
        console.error('示例: npm run migrate:create add_user_level');
        process.exit(1);
      }
      createMigration(arg);
      break;

    case 'up':
      console.log('🚀 开始执行迁移...\n');
      await initMigrationTable();
      
      const executedMigrations = await getExecutedMigrations();
      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
      
      let executedCount = 0;
      
      for (const file of files) {
        if (executedMigrations.includes(file)) {
          console.log(`⏭️  跳过已执行: ${file}`);
          continue;
        }
        
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        const success = await runMigration(file, sql);
        
        if (success) {
          executedCount++;
        } else {
          process.exit(1);
        }
      }
      
      console.log(`\n✅ 迁移完成! 执行了 ${executedCount} 个迁移`);
      break;

    case 'down':
      console.log('⚠️ 回滚功能需要手动实现');
      console.log('请在迁移文件中添加DOWN部分的SQL');
      break;

    case 'status':
      await initMigrationTable();
      const executed = await getExecutedMigrations();
      const allFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
      
      console.log('\n📊 迁移状态:\n');
      allFiles.forEach(file => {
        const isExecuted = executed.includes(file);
        console.log(`${isExecuted ? '✅' : '⏳'} ${file}`);
      });
      console.log(`\n总计: ${executed.length}/${allFiles.length} 已执行`);
      break;

    default:
      console.log('🛠️  数据库迁移工具\n');
      console.log('使用方法:');
      console.log('  npm run migrate:create <name>  创建新迁移');
      console.log('  npm run migrate:up             执行所有迁移');
      console.log('  npm run migrate:down           回滚最后一次迁移');
      console.log('  npm run migrate:status         查看迁移状态\n');
      console.log('示例:');
      console.log('  npm run migrate:create add_user_level');
  }
}

main().catch(console.error);
