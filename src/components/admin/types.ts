// 管理端类型定义

/** GitHub API 返回的目录条目 */
export interface GitHubContentItem {
	name: string;
	path: string;
	sha: string;
	size: number;
	type: 'file' | 'dir';
	download_url: string | null;
}

/** GitHub API 返回的文件详情 */
export interface GitHubFile extends GitHubContentItem {
	content: string; // base64 编码
	encoding: 'base64';
}

/** 文章 frontmatter（与 content.config.ts 的 schema 对应） */
export interface ArticleFrontmatter {
	title: string;
	description: string;
	pubDate: string;
	updatedDate?: string;
	heroImage?: string;
	tags?: string[];
	draft?: boolean;
}

/** 管理端展示的文章条目 */
export interface ArticleListItem {
	filename: string; // 如 hello-world.md
	title: string;
	description: string;
	pubDate: string;
	tags: string[];
	draft: boolean;
	sha: string;
}

/** 编辑器中的文章状态 */
export interface ArticleEditState {
	filename: string;
	content: string; // 完整 markdown（含 frontmatter）
	sha: string; // 用于更新时的冲突检测
	isNew: boolean;
}

/** GitHub 用户信息（认证后展示） */
export interface GitHubUser {
	login: string;
	name: string | null;
	avatar_url: string;
}

/** 管理端视图状态 */
export type AdminView = 'list' | 'editor';
