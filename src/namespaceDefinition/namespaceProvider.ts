import * as vs from "vscode";
import { DefinitionProvider } from "vscode";
import { TextDecoder } from "util";
import * as path from "path";
import * as fs from "fs";
const vsfs = vs.workspace.fs;

const namespaceUri = /(?<=["'])\/?(([\w_-\d]+):|\.\/|(\.\.\/)*)(([\w_-\d]+\/)*[\w_-\d]+\.[\w\d]+)(?=["'])/;

export class NamespaceProvider implements DefinitionProvider {
    // 暂时不做，可能需要监控目录和配置文件修改
    // namespace映射缓存
    // namespaceMap: Map<string, string>;

    // public constructor() {
    //     this.namespaceMap = new Map();
    // }

    public async provideDefinition(
        document: vs.TextDocument,
        position: vs.Position,
        token: vs.CancellationToken
    ): Promise<vs.Definition | undefined> {
        // 正则匹配鼠标指向的路径
        const uriRange = document.getWordRangeAtPosition(
            position,
            namespaceUri
        );
        // 鼠标未指向uri
        if (!uriRange) {
            return undefined;
        }
        // 鼠标指向uri
        const uri = document.getText(uriRange);
        const currentDir = document.uri.fsPath;
        let location: vs.Location | undefined;

        // 直接检查是否是合法路径,是则直接返回定位
        if ((location = this.locateFile(path.join(currentDir, "..", uri)))) {
            return location;
        }
        // 尝试解析和查找namespace
        else if (uri.indexOf(":")) {
            const [namespace, innerPath] = uri.split(":");
            const root = await this.getNamespaceRoot(namespace);
            if (root) {
                // 查找到namespace对应文件夹后，检查路径是否合法
                const targetFile = path.join(root, innerPath);
                if ((location = this.locateFile(targetFile))) {
                    return location;
                }
            }
        }
        vs.window.showErrorMessage(`Cannot locate file: ${uri}`);
        throw vs.FileSystemError.FileNotFound(uri);
    }

    /**
     * 尝试定位一个路径指向的文件
     * @param uri 目标文件路径
     * @returns 找到则返回vscode.Location对象，否则返回undefined
     */
    private locateFile(uri: string) {
        if (fs.existsSync(path.resolve(uri))) {
            return new vs.Location(vs.Uri.file(uri), new vs.Position(0, 0));
        } else {
            return undefined;
        }
    }

    /**
     * 得到namespace所对应的绝对路径
     * @param namespace 目标namespace
     * @returns 异步返回绝对路径或未找到则返回空字符串
     */
    private async getNamespaceRoot(namespace: string): Promise<string> {
        const targetUri = await searchNamespaceConfig(namespace);
        if (targetUri && targetUri.path) {
            // 兼容windows下带盘符的绝对路径
            let fsPath = targetUri.path.replace(/\/([\w]:)/, "$1");
            return path.join(fsPath, "..");
        } else {
            return "";
        }
    }
}

/**
 * 查找设置目标namespace的配置文件
 * @param namespace 目标namespace
 * @returns 异步返回配置文件Uri
 */
async function searchNamespaceConfig(
    namespace: string
): Promise<vs.Uri | undefined> {
    let fisConfigFileList: vs.Uri[] = await getFisConfigFiles();
    // 配置文件解析Promise组
    let promises: Promise<vs.Uri | undefined>[] = [];
    for (const fisConfig of fisConfigFileList) {
        promises.push(testConfig(fisConfig, namespace));
    }
    const results = await Promise.all(promises);

    let targetUri;
    for (let uri of results) {
        if (uri) {
            targetUri = uri;
        }
    }
    return targetUri;
}

/**
 * 用vscode workspace API查找工作环境下的所有fis-conf.js配置文件
 * @returns 异步返回配置文件Uri列表
 */
async function getFisConfigFiles(): Promise<vs.Uri[]> {
    let fisConfigFiles = await vs.workspace.findFiles(
        "**/fis-conf.js",
        "**/node_modules/**"
    );
    return fisConfigFiles;
}

/**
 * 检索配置文件中关于fis.set(namespace, "xxxx")的设置
 * @param fisConfig fis-conf.js配置文件的Uri
 * @param namespace 目标namespace
 * @returns 一个Promise,检索到目标则返回该配置文件Uri，否则返回undefined
 */
function testConfig(
    fisConfig: vs.Uri,
    namespace: string
): Promise<vs.Uri | undefined> {
    return new Promise((resolve) => {
        const regex = new RegExp(
            `fis\\.set\\(\\s*['"]namespace['"]\\s*,\\s*['"]${namespace}['"]`
        );
        vsfs.readFile(fisConfig).then(
            (config) => {
                const configStr = new TextDecoder("utf-8").decode(config);
                if (regex.test(configStr)) {
                    resolve(fisConfig);
                } else {
                    resolve(undefined);
                }
            },
            (error) => {
                console.error(error);
            }
        );
    });
}
