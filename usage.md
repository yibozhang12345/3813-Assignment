# 项目启动说明

## 环境要求
- Node.js 16+
- npm 8+
- Angular CLI 17+

## 安装和运行步骤
### 初始化数据库
已完成

### 安装依赖
```powershell
# 安装服务器端依赖
cd server
npm install

# 安装客户端依赖
cd ../client
npm install
```

### 启动服务器
```powershell
cd server
npm run dev
```
服务器将在 http://localhost:3000 启动

### 启动客户端
```powershell
cd client
npm start
```
客户端将在 http://localhost:4200 启动

### 默认管理员信息
应用启动时自动创建：
- **超级管理员**:
  - 用户名: `super`
  - 密码: `123456`
  - 邮箱: `super@admin.com`

### 测试
```powershell
# 客户端测试
cd client
npm run test:coverage
```
```powershell
# 服务端测试
cd server
npm run test:coverage
```