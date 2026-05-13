# 资产管理系统 MVP

一个单用户资产管理系统，用月度快照记录不同账户的人民币余额，并分析资产、负债、投资类型和风险等级的趋势与占比。

## 技术栈

- 后端：Java 17、Spring Boot 3、MyBatis、MySQL
- 前端：Vue 3、Vite、Axios、ECharts
- 数据库：MySQL 8+

## 功能

- 账户管理：银行卡、股票账户、支付宝、微信等账户都可以自定义录入
- 账户字段：资产/负债、投资类型、风险等级、自定义 JSON 字段、备注、启停状态
- 月度快照：每个月为每个账户维护当月总余额
- 统计分析：
  - 总资产、总负债、净资产
  - 资产/负债月度曲线
  - 投资类型增长曲线
  - 风险等级增长曲线
  - 指定月份的投资类型占比
  - 指定月份的风险等级占比
  - 可按全部、资产、负债筛选分析范围

## 初始化数据库

```sql
source database/schema.sql;
```

或者在 MySQL 客户端中执行 [database/schema.sql](database/schema.sql)。

默认数据库连接配置在 [backend/src/main/resources/application.yml](backend/src/main/resources/application.yml)：

```yaml
spring:
  datasource:
    url: ${MYSQL_URL:jdbc:mysql://192.168.31.93:3306/asset_manager}
    username: ${MYSQL_USERNAME:root}
    password: ${MYSQL_PASSWORD:}
```

启动后端前请设置数据库密码环境变量：

```powershell
$env:MYSQL_PASSWORD="你的数据库密码"
```

## 启动后端

```bash
cd backend
mvn spring-boot:run
```

后端地址：http://localhost:8080

## 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端地址：http://localhost:5173

## 主要接口

- `GET /api/accounts`：账户列表
- `POST /api/accounts`：新增账户
- `PUT /api/accounts/{id}`：更新账户
- `DELETE /api/accounts/{id}`：删除账户
- `GET /api/snapshots/summary?month=2026-05`：月度汇总和账户快照
- `POST /api/snapshots/batch`：批量保存月度余额
- `GET /api/analytics/trend/category`：资产/负债曲线
- `GET /api/analytics/trend/investment-type`：投资类型曲线
- `GET /api/analytics/trend/risk`：风险等级曲线
- `GET /api/analytics/distribution/investment-type`：投资类型占比
- `GET /api/analytics/distribution/risk`：风险等级占比
