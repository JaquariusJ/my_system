# 资产管理系统 MVP

一个单用户资产管理系统，按月记录不同账户的人民币余额，并分析资产、负债、投资类型和风险等级的变化趋势与占比。

## 技术栈

- 后端：Java 17、Spring Boot 3、MyBatis、MySQL
- 前端：Vue 3、Vite、Ant Design Vue、Axios、ECharts
- 数据库：MySQL 8+

## 当前功能

- 首页总览
  - 总资产、总负债、净资产、账户数量
  - 资产 / 负债曲线
  - 风险等级曲线
  - 投资类型增长曲线
  - 投资类型占比
  - 风险等级占比
- 我的资产
  - 资产管理
  - 账户名称管理
  - 投资类型管理
- 账户基础数据维护
  - 账户名称可独立维护
  - 投资类型可独立维护
  - 投资类型绑定风险等级
- 月度资产记录
  - 按月份维护账户余额快照
  - 支持资产 / 负债
  - 负债可不设置投资类型和风险等级
- 统计分析
  - 按月份查看总资产、总负债、净资产
  - 查看账户、资产类型、投资类型、风险等级占比
  - 支持筛选查询

## 目录结构

```text
backend/     Spring Boot + MyBatis 后端
frontend/    Vue3 + Vite 前端
database/    MySQL 初始化脚本
dev-tools/   本地临时 API 服务
```

## 初始化数据库

执行：

```sql
source database/schema.sql;
```

或者在 MySQL 客户端中手动执行 [database/schema.sql](</C:/Users/Administrator/Documents/New project 2/database/schema.sql>)。

## 数据库配置

后端默认从环境变量读取数据库连接信息，配置文件在 [backend/src/main/resources/application.yml](</C:/Users/Administrator/Documents/New project 2/backend/src/main/resources/application.yml>)。

默认配置示例：

```yaml
spring:
  datasource:
    url: ${MYSQL_URL:jdbc:mysql://192.168.31.93:3306/asset_manager?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true}
    username: ${MYSQL_USERNAME:root}
    password: ${MYSQL_PASSWORD:}
```

启动前请先设置环境变量：

```powershell
$env:MYSQL_PASSWORD="你的数据库密码"
```

如有需要，也可以同时设置：

```powershell
$env:MYSQL_URL="jdbc:mysql://192.168.31.93:3306/asset_manager?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true"
$env:MYSQL_USERNAME="root"
$env:MYSQL_PASSWORD="你的数据库密码"
```

## 启动后端

```bash
cd backend
mvn spring-boot:run
```

后端默认地址：

```text
http://127.0.0.1:8080
```

说明：当前这台机器如果没有安装 JDK 17，则正式 Java 后端无法直接运行。

## 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认地址：

```text
http://127.0.0.1:5173
```

## 临时本地 API

在正式 Java 后端无法运行时，可使用 [dev-tools/mysql-api-server.cjs](</C:/Users/Administrator/Documents/New project 2/dev-tools/mysql-api-server.cjs>) 作为临时 API。

安装依赖：

```bash
cd dev-tools
npm install
```

启动：

```bash
node mysql-api-server.cjs
```

## 主要接口

- `GET /api/accounts`：账户列表
- `POST /api/accounts`：新增账户
- `PUT /api/accounts/{id}`：更新账户
- `DELETE /api/accounts/{id}`：删除账户
- `GET /api/account-names`：账户名称列表
- `POST /api/account-names`：新增账户名称
- `PUT /api/account-names/{id}`：更新账户名称
- `DELETE /api/account-names/{id}`：删除账户名称
- `GET /api/investment-types`：投资类型列表
- `POST /api/investment-types`：新增投资类型
- `PUT /api/investment-types/{id}`：更新投资类型
- `DELETE /api/investment-types/{id}`：删除投资类型
- `GET /api/snapshots/summary?month=2026-05`：指定月份资产汇总
- `POST /api/snapshots`：保存月度快照
- `GET /api/snapshots/months`：已存在数据的月份列表
- `GET /api/analytics/trend/category`：资产 / 负债曲线
- `GET /api/analytics/trend/investment-type`：投资类型曲线
- `GET /api/analytics/trend/risk`：风险等级曲线
- `GET /api/analytics/distribution/investment-type`：投资类型占比
- `GET /api/analytics/distribution/risk`：风险等级占比
