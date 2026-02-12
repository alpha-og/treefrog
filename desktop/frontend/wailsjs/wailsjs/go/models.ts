export namespace main {
	
	export class AuthUser {
	    id: string;
	    email: string;
	    firstName: string;
	    lastName: string;
	    imageUrl: string;
	
	    static createFrom(source: any = {}) {
	        return new AuthUser(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.email = source["email"];
	        this.firstName = source["firstName"];
	        this.lastName = source["lastName"];
	        this.imageUrl = source["imageUrl"];
	    }
	}
	export class AuthState {
	    isAuthenticated: boolean;
	    user?: AuthUser;
	
	    static createFrom(source: any = {}) {
	        return new AuthState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.isAuthenticated = source["isAuthenticated"];
	        this.user = this.convertValues(source["user"], AuthUser);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class BuildStatus {
	    id: string;
	    state: string;
	    message: string;
	    startedAt: string;
	    endedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new BuildStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.state = source["state"];
	        this.message = source["message"];
	        this.startedAt = source["startedAt"];
	        this.endedAt = source["endedAt"];
	    }
	}
	export class CompilationMetrics {
	    totalAttempts: number;
	    successfulCompiles: number;
	    failedCompiles: number;
	    totalDuration: number;
	    averageDuration: number;
	    minDuration: number;
	    maxDuration: number;
	    successRate: number;
	    lastAttempt: string;
	    lastSuccess: string;
	    lastFailure: string;
	
	    static createFrom(source: any = {}) {
	        return new CompilationMetrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalAttempts = source["totalAttempts"];
	        this.successfulCompiles = source["successfulCompiles"];
	        this.failedCompiles = source["failedCompiles"];
	        this.totalDuration = source["totalDuration"];
	        this.averageDuration = source["averageDuration"];
	        this.minDuration = source["minDuration"];
	        this.maxDuration = source["maxDuration"];
	        this.successRate = source["successRate"];
	        this.lastAttempt = source["lastAttempt"];
	        this.lastSuccess = source["lastSuccess"];
	        this.lastFailure = source["lastFailure"];
	    }
	}
	export class RendererConfig {
	    mode: string;
	    port: number;
	    autoStart: boolean;
	    imageSource: string;
	    imageRef: string;
	    remoteUrl: string;
	    remoteToken: string;
	    customRegistry?: string;
	    customTarPath?: string;
	    maxRetries: number;
	    retryDelay: number;
	    retryBackoff: number;
	    retryTimeout: number;
	
	    static createFrom(source: any = {}) {
	        return new RendererConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mode = source["mode"];
	        this.port = source["port"];
	        this.autoStart = source["autoStart"];
	        this.imageSource = source["imageSource"];
	        this.imageRef = source["imageRef"];
	        this.remoteUrl = source["remoteUrl"];
	        this.remoteToken = source["remoteToken"];
	        this.customRegistry = source["customRegistry"];
	        this.customTarPath = source["customTarPath"];
	        this.maxRetries = source["maxRetries"];
	        this.retryDelay = source["retryDelay"];
	        this.retryBackoff = source["retryBackoff"];
	        this.retryTimeout = source["retryTimeout"];
	    }
	}
	export class Config {
	    projectRoot: string;
	    compilerUrl: string;
	    compilerToken: string;
	    renderer?: RendererConfig;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.projectRoot = source["projectRoot"];
	        this.compilerUrl = source["compilerUrl"];
	        this.compilerToken = source["compilerToken"];
	        this.renderer = this.convertValues(source["renderer"], RendererConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class FileContent {
	    content: string;
	    isBinary: boolean;
	
	    static createFrom(source: any = {}) {
	        return new FileContent(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.content = source["content"];
	        this.isBinary = source["isBinary"];
	    }
	}
	export class FileEntry {
	    name: string;
	    path: string;
	    isDir: boolean;
	    size: number;
	    modTime: string;
	    entries?: FileEntry[];
	
	    static createFrom(source: any = {}) {
	        return new FileEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.isDir = source["isDir"];
	        this.size = source["size"];
	        this.modTime = source["modTime"];
	        this.entries = this.convertValues(source["entries"], FileEntry);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GitStatus {
	    raw: string;
	
	    static createFrom(source: any = {}) {
	        return new GitStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.raw = source["raw"];
	    }
	}
	export class ProjectInfo {
	    name: string;
	    root: string;
	    compilerUrl: string;
	
	    static createFrom(source: any = {}) {
	        return new ProjectInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.root = source["root"];
	        this.compilerUrl = source["compilerUrl"];
	    }
	}
	export class RemoteCompilerHealth {
	    url: string;
	    isHealthy: boolean;
	    lastCheck: string;
	    consecutiveFails: number;
	    lastError: string;
	    responseTime: number;
	    upSince: string;
	
	    static createFrom(source: any = {}) {
	        return new RemoteCompilerHealth(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	        this.isHealthy = source["isHealthy"];
	        this.lastCheck = source["lastCheck"];
	        this.consecutiveFails = source["consecutiveFails"];
	        this.lastError = source["lastError"];
	        this.responseTime = source["responseTime"];
	        this.upSince = source["upSince"];
	    }
	}
	
	export class RendererStatus {
	    state: string;
	    mode: string;
	    message: string;
	    port: number;
	    logs: string;
	
	    static createFrom(source: any = {}) {
	        return new RendererStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.state = source["state"];
	        this.mode = source["mode"];
	        this.message = source["message"];
	        this.port = source["port"];
	        this.logs = source["logs"];
	    }
	}
	export class SyncTeXResult {
	    page: number;
	    x: number;
	    y: number;
	
	    static createFrom(source: any = {}) {
	        return new SyncTeXResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.x = source["x"];
	        this.y = source["y"];
	    }
	}

}

