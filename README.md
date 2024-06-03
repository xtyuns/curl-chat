# curl-chat
在终端中使用大语言模型的对话服务

https://github.com/xtyuns/curl-chat/assets/41326335/26abf041-0047-4c8b-bae6-f9b8cfb927cd


## 安装依赖:

```bash
bun install
```

## 运行服务:


以 `.env.template` 为模板创建一份 `.env` 文件并填写大模型服务参数



```bash
bun run dev
```

## 使用
```bash
curl -d 'who are you' 127.0.0.1:3000
```