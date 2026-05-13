create database if not exists asset_manager
  default character set utf8mb4
  collate utf8mb4_unicode_ci;

use asset_manager;

drop table if exists monthly_snapshots;
drop table if exists accounts;
drop table if exists account_names;
drop table if exists investment_types;

create table account_names (
  id bigint primary key auto_increment,
  name varchar(100) not null unique,
  identifier varchar(80),
  sort_order int not null default 100,
  remark varchar(500),
  active tinyint(1) not null default 1,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table investment_types (
  id bigint primary key auto_increment,
  name varchar(50) not null unique,
  risk_level enum('HIGH', 'MEDIUM', 'LOW', 'NONE'),
  sort_order int not null default 100,
  remark varchar(500),
  active tinyint(1) not null default 1,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table accounts (
  id bigint primary key auto_increment,
  name varchar(100) not null,
  institution varchar(100),
  account_no_masked varchar(80),
  asset_category enum('ASSET', 'LIABILITY') not null,
  investment_type varchar(50),
  risk_level enum('HIGH', 'MEDIUM', 'LOW', 'NONE'),
  custom_fields json,
  remark varchar(500),
  active tinyint(1) not null default 1,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  index idx_accounts_category (asset_category),
  index idx_accounts_investment_type (investment_type),
  index idx_accounts_risk_level (risk_level)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

insert into investment_types (name, sort_order, remark)
values
  ('股票', 10, '权益类资产'),
  ('基金', 20, '公募基金、指数基金等'),
  ('债券', 30, '债券及固收类产品'),
  ('货币', 40, '货币基金、余额宝等'),
  ('现金', 50, '银行卡活期、现金等'),
  ('银行理财', 60, '银行理财产品'),
  ('信用负债', 90, '信用卡、消费贷等负债类型');

insert into account_names (name, identifier, sort_order, remark)
values
  ('招商银行储蓄卡', '尾号 8888', 10, '示例账户名称'),
  ('支付宝余额宝', null, 20, '示例账户名称'),
  ('股票账户', 'A 股账户', 30, '示例账户名称'),
  ('基金账户', null, 40, '示例账户名称'),
  ('信用卡账单', '尾号 6666', 50, '示例账户名称');

create table monthly_snapshots (
  id bigint primary key auto_increment,
  account_id bigint not null,
  snapshot_month date not null,
  amount decimal(18, 2) not null default 0,
  note varchar(500),
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  unique key uk_snapshot_account_month (account_id, snapshot_month),
  index idx_snapshot_month (snapshot_month),
  constraint fk_snapshot_account
    foreign key (account_id) references accounts(id)
    on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

insert into accounts
  (name, institution, account_no_masked, asset_category, investment_type, risk_level, custom_fields, remark)
values
  ('招商银行储蓄卡', '招商银行', '尾号 8888', 'ASSET', '现金', 'LOW', json_object('用途', '日常备用金'), '示例账户'),
  ('支付宝余额宝', '支付宝', null, 'ASSET', '货币', 'LOW', json_object('平台', '支付宝'), '示例账户'),
  ('股票账户', '东方财富证券', 'A 股账户', 'ASSET', '股票', 'HIGH', json_object('市场', 'A股'), '示例账户'),
  ('基金账户', '天天基金', null, 'ASSET', '基金', 'MEDIUM', json_object('平台', '天天基金'), '示例账户'),
  ('信用卡账单', '招商银行', '尾号 6666', 'LIABILITY', '信用负债', 'LOW', json_object('还款日', '每月20日'), '示例负债');

insert into monthly_snapshots (account_id, snapshot_month, amount, note)
select id, '2026-01-01',
       case name
         when '招商银行储蓄卡' then 26000
         when '支付宝余额宝' then 12000
         when '股票账户' then 68000
         when '基金账户' then 36000
         when '信用卡账单' then 6800
       end,
       '初始化示例数据'
from accounts;

insert into monthly_snapshots (account_id, snapshot_month, amount, note)
select id, '2026-02-01',
       case name
         when '招商银行储蓄卡' then 31000
         when '支付宝余额宝' then 10000
         when '股票账户' then 72000
         when '基金账户' then 39000
         when '信用卡账单' then 5200
       end,
       '初始化示例数据'
from accounts;

insert into monthly_snapshots (account_id, snapshot_month, amount, note)
select id, '2026-03-01',
       case name
         when '招商银行储蓄卡' then 28000
         when '支付宝余额宝' then 15000
         when '股票账户' then 76500
         when '基金账户' then 41000
         when '信用卡账单' then 7900
       end,
       '初始化示例数据'
from accounts;

insert into monthly_snapshots (account_id, snapshot_month, amount, note)
select id, '2026-04-01',
       case name
         when '招商银行储蓄卡' then 33500
         when '支付宝余额宝' then 13800
         when '股票账户' then 74500
         when '基金账户' then 45200
         when '信用卡账单' then 4300
       end,
       '初始化示例数据'
from accounts;

insert into monthly_snapshots (account_id, snapshot_month, amount, note)
select id, '2026-05-01',
       case name
         when '招商银行储蓄卡' then 35000
         when '支付宝余额宝' then 16000
         when '股票账户' then 81200
         when '基金账户' then 47000
         when '信用卡账单' then 6100
       end,
       '初始化示例数据'
from accounts;
