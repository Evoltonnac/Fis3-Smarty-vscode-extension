# Fis3-Smarty

## Features

### 1. fis3-smarty 的自动补全，包含：

-   block
-   widget
-   include
-   require
-   extends
-   assign
-   if elseif else
-   foreach break
-   capture

### 2. fis3-smarty 语法高亮（基于 smarty）

### 3. 根据路径跳转到定义文件

支持 fis3 所定义的命名空间路径的快捷跳转，需要在工作区内打开带有 fis-conf.js 的项目文件夹。\
如：模块 test1 中引入了模块 test2 中的文件，此时 vscode 中需要同时打开 test1 和 test2 模块代码文件夹，且 test2 中存在标准的 fis-conf.js 配置文件。

## Requirements

可以安装 smarty 插件来获得 smarty 语法高亮
