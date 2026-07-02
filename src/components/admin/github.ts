// GitHub Contents API 封装 + base64 / frontmatter 工具
import type {
	ArticleEditState,
	ArticleFrontmatter,
	ArticleListItem,
	GitHubContentItem,
	GitHubFile,
	GitHubUser,
} from './types';
import { REPO } from '../../consts';

const API = 'https://api.github.com';

function headers(token: string): HeadersInit {
	return {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
	};
}

// ===== UTF-8 安全的 base64 =====
export function toBase64(str: string): string {
	const bytes = new TextEncoder().encode(str);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

export function fromBase64(b64: string): string {
	const clean = b64.replace(/\s/g, '');
	const binary = atob(clean);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
}

export function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			resolve(result.split(',')[1] ?? '');
		};
		reader.onerror = () => reject(new Error('读取文件失败'));
		reader.readAsDataURL(file);
	});
}

// ===== Frontmatter 解析 / 序列化 =====
/** 从完整 markdown 中提取 frontmatter 和正文 */
export function splitFrontmatter(raw: string): { fm: ArticleFrontmatter; body: string } {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) {
		return { fm: { title: '', description: '', pubDate: '' }, body: raw };
	}
	const yaml = match[1];
	const body = match[2];
	const fm: ArticleFrontmatter = { title: '', description: '', pubDate: '' };

	// 解析 tags 块列表形式: tags:\n  - a\n  - b
	const lines = yaml.split(/\r?\n/);
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const kvMatch = line.match(/^(\w+):\s*(.*)$/);
		if (kvMatch) {
			const [, key, value] = kvMatch;
			if (value.trim() === '') {
				// 可能是块式数组，向下找 - 项
				if (key === 'tags') {
					const tags: string[] = [];
					let j = i + 1;
					while (j < lines.length && /^\s*-\s+/.test(lines[j])) {
						tags.push(stripQuotes(lines[j].replace(/^\s*-\s+/, '')));
						j++;
					}
					fm.tags = tags;
				}
			} else {
				fm[key as keyof ArticleFrontmatter] = parseValue(key, value) as never;
			}
		}
	}
	return { fm, body };
}

function parseValue(key: string, raw: string): unknown {
	const v = raw.trim();
	if (key === 'tags') {
		// 内联数组 ['a', 'b']
		const inner = v.replace(/^\[/, '').replace(/\]$/, '');
		return inner
			.split(',')
			.map((s) => stripQuotes(s.trim()))
			.filter(Boolean);
	}
	if (key === 'draft') {
		return v === 'true';
	}
	return stripQuotes(v);
}

function stripQuotes(s: string): string {
	const m = s.match(/^['"](.*)['"]$/);
	return m ? m[1] : s;
}

/** 把 frontmatter + 正文序列化为完整 markdown */
export function stringifyArticle(fm: ArticleFrontmatter, body: string): string {
	const lines: string[] = ['---'];
	lines.push(`title: ${quoteString(fm.title)}`);
	lines.push(`description: ${quoteString(fm.description)}`);
	lines.push(`pubDate: '${fm.pubDate}'`);
	if (fm.updatedDate) lines.push(`updatedDate: '${fm.updatedDate}'`);
	if (fm.heroImage) lines.push(`heroImage: '${fm.heroImage}'`);
	if (fm.tags && fm.tags.length > 0) {
		lines.push(`tags: [${fm.tags.map((t) => quoteString(t)).join(', ')}]`);
	}
	if (fm.draft) lines.push(`draft: true`);
	lines.push('---', '');
	return lines.join('\n') + body;
}

function quoteString(s: string): string {
	// 用单引号包裹，转义内部单引号
	return `'${s.replace(/'/g, "''")}'`;
}

// ===== GitHubClient =====
export class GitHubClient {
	token: string;

	constructor(token: string) {
		this.token = token;
	}

	private repoUrl(path: string): string {
		const p = path ? `/${path}` : '';
		return `${API}/repos/${REPO.owner}/${REPO.name}/contents${p}`;
	}

	/** 验证 token 并返回用户信息 */
	async verifyToken(): Promise<GitHubUser> {
		const res = await fetch(`${API}/user`, { headers: headers(this.token) });
		if (!res.ok) throw new Error('Token 无效或已过期');
		return res.json();
	}

	/** 列出所有文章 */
	async listArticles(): Promise<ArticleListItem[]> {
		const res = await fetch(`${this.repoUrl(REPO.contentPath)}?ref=${REPO.branch}`, {
			headers: headers(this.token),
		});
		if (res.status === 404) return []; // 目录还不存在
		if (!res.ok) throw new Error(`读取文章列表失败 (${res.status})`);
		const items = (await res.json()) as GitHubContentItem[];
		const files = items.filter((i) => i.type === 'file' && /\.(md|mdx)$/.test(i.name));

		// 并行拉取每个文件以解析 frontmatter
		const results = await Promise.allSettled(files.map((f) => this.getArticleMeta(f)));
		return results
			.filter((r): r is PromiseFulfilledResult<ArticleListItem> => r.status === 'fulfilled')
			.map((r) => r.value);
	}

	private async getArticleMeta(item: GitHubContentItem): Promise<ArticleListItem> {
		const file = await this.getFileByPath(item.path);
		const content = fromBase64(file.content);
		const { fm } = splitFrontmatter(content);
		return {
			filename: item.name,
			title: fm.title || item.name,
			description: fm.description || '',
			pubDate: fm.pubDate || '',
			tags: fm.tags || [],
			draft: fm.draft === true,
			sha: item.sha,
		};
	}

	/** 获取单个文件（含内容） */
	async getFileByPath(path: string): Promise<GitHubFile> {
		const res = await fetch(`${this.repoUrl(path)}?ref=${REPO.branch}`, {
			headers: headers(this.token),
		});
		if (!res.ok) throw new Error(`读取文件失败 (${res.status})`);
		return res.json();
	}

	/** 加载文章进入编辑器 */
	async loadArticle(filename: string): Promise<ArticleEditState> {
		const path = `${REPO.contentPath}/${filename}`;
		const file = await this.getFileByPath(path);
		return {
			filename,
			content: fromBase64(file.content),
			sha: file.sha,
			isNew: false,
		};
	}

	/** 保存（新建或更新）文章 */
	async saveArticle(state: ArticleEditState, message: string): Promise<string> {
		const path = `${REPO.contentPath}/${state.filename}`;
		const body: Record<string, unknown> = {
			message,
			content: toBase64(state.content),
			branch: REPO.branch,
		};
		if (state.sha) body.sha = state.sha; // 更新需要 sha 做冲突检测

		const res = await fetch(this.repoUrl(path), {
			method: 'PUT',
			headers: { ...headers(this.token), 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
		if (!res.ok) {
			const err = (await res.json().catch(() => ({}))) as { message?: string };
			if (res.status === 409) {
				throw new Error('文章已被其他方式修改，请刷新后重试（SHA 冲突）');
			}
			throw new Error(err.message || `保存失败 (${res.status})`);
		}
		const data = await res.json();
		return data.content?.sha as string;
	}

	/** 删除文章 */
	async deleteArticle(filename: string, sha: string): Promise<void> {
		const path = `${REPO.contentPath}/${filename}`;
		const res = await fetch(this.repoUrl(path), {
			method: 'DELETE',
			headers: { ...headers(this.token), 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: `删除文章 ${filename}`, sha, branch: REPO.branch }),
		});
		if (!res.ok) {
			const err = (await res.json().catch(() => ({}))) as { message?: string };
			throw new Error(err.message || `删除失败 (${res.status})`);
		}
	}

	/** 上传图片，返回网站可用的 URL */
	async uploadImage(file: File): Promise<string> {
		const filename = `${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
		const path = `${REPO.imagesPath}/${filename}`;
		const base64 = await fileToBase64(file);
		const res = await fetch(this.repoUrl(path), {
			method: 'PUT',
			headers: { ...headers(this.token), 'Content-Type': 'application/json' },
			body: JSON.stringify({
				message: `上传图片 ${filename}`,
				content: base64,
				branch: REPO.branch,
			}),
		});
		if (!res.ok) {
			const err = (await res.json().catch(() => ({}))) as { message?: string };
			throw new Error(err.message || `图片上传失败 (${res.status})`);
		}
		return `${REPO.imagesUrlPrefix}/${filename}`;
	}
}
