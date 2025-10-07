# 项目结构说明文档

本文档详细说明了3813-Assignment项目中各个关键目录和文件的作用。

## 服务端 (Server)

### server/server2.js
**主服务器文件**
- 项目的主要服务器入口文件
- 基于Express.js框架构建Web服务器
- 集成Socket.IO实现实时通信功能
- 配置CORS跨域访问策略
- 设置各种中间件（JSON解析、文件上传限制等）
- 连接MongoDB数据库
- 注册所有API路由模块
- 启动HTTP服务器并监听指定端口

### server/routes/
**路由模块目录**
- 包含所有API端点的路由处理逻辑
- 每个文件对应不同的业务模块

#### routes/auth.js
- 用户认证相关路由
- 处理用户注册、登录、登出等操作
- JWT令牌的生成和管理

#### routes/groups.js
- 群组管理相关路由
- 群组的创建、加入、退出、权限管理
- 频道管理和消息处理

#### routes/upload.js
- 文件上传相关路由
- 支持头像、图片、文档等多种文件类型的上传
- 文件存储管理和删除功能

#### routes/admin.js
- 管理员功能路由
- 用户管理、系统配置等超级管理员权限操作

#### routes/profile.js
- 用户资料管理路由
- 用户信息的查看、修改、头像上传等功能

### server/models/
**数据模型目录**

#### models/mongoDataStore.js
- MongoDB数据存储操作的统一接口
- 封装所有数据库CRUD操作
- 提供用户、群组、消息等数据的存取方法

#### models/mongodb/
- MongoDB数据模型定义目录

##### mongodb/User.js
- 用户数据模型
- 定义用户字段结构（用户名、密码、角色等）
- 密码加密和验证方法

##### mongodb/Group.js
- 群组数据模型
- 定义群组基本信息和管理权限

##### mongodb/Channel.js
- 频道数据模型
- 定义群组内频道结构

##### mongodb/Message.js
- 消息数据模型
- 定义聊天消息的结构和类型

##### mongodb/GroupApplication.js
- 群组申请数据模型
- 处理用户加入群组的申请流程

### server/middleware/
**中间件目录**

#### middleware/auth.js
- JWT身份验证中间件
- 验证用户访问令牌的有效性
- 保护需要认证的API端点

## 客户端 (Client)

### client/src/main.ts
**Angular应用启动文件**
- Angular应用的入口点
- 配置应用的根组件和路由
- 设置HTTP客户端模块
- 注册全局HTTP拦截器（用于自动添加认证头）
- 启动Angular应用的引导过程

### client/src/app/components/
**Angular组件目录**
- 包含所有用户界面组件
- 每个子目录对应一个功能模块

#### components/chat/
- 聊天界面组件
- 实时消息显示和发送功能

#### components/dashboard/
- 用户仪表板组件
- 显示用户概览信息和快捷操作

#### components/login/
- 用户登录组件
- 登录表单和认证界面

#### components/profile/
- 用户资料组件
- 用户信息展示和编辑功能

### client/src/app/services/
**Angular服务目录**
- 提供数据访问和业务逻辑服务
- 封装与后端API的通信

#### services/auth.service.ts
- 用户认证服务
- 处理登录、注册、令牌管理等认证相关操作

#### services/group.service.ts
- 群组管理服务
- 群组CRUD操作和权限管理

#### services/profile.service.ts
- 用户资料服务
- 用户信息获取和更新

#### services/socket.service.ts
- WebSocket通信服务
- 实时消息收发和连接管理

#### services/upload.service.ts
- 文件上传服务
- 处理文件上传到服务器的逻辑


