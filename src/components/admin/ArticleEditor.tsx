import { useEffect, useRef, useState } from 'react';
import Cherry from 'cherry-markdown';
import 'cherry-markdown/dist/cherry-markdown.css';
import type { GitHubClient } from './github';
import { splitFrontmatter, stringifyArticle } from './github';
import type { ArticleEditState, ArticleFrontmatter } from './types';

interface Props {
	client: GitHubClient;
	initial: ArticleEditState;
	onBack: () => void;
}

function todayStr(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${m}-${day}`;
}

function suggestSlug(title: string): string {
	const slug = title
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_-]+/g, '-')
		.replace(/^-+|-+$/g, '');
	if (slug) return slug;
	return `post-${Date.now().toString(36)}`;
}

function stripExt(filename: string): string {
	return filename.replace(/\.(md|mdx)$/, '');
}

export default function ArticleEditor({ client, initial, onBack }: Props) {
	const editorRef = useRef<HTMLDivElement>(null);
	const cherryRef = useRef<Cherry | null>(null);

	// 初始化时拆分 frontmatter 和正文
	const parsed = splitFrontmatter(initial.content);
	const [fm, setFm] = useState<ArticleFrontmatter>({
		title: parsed.fm.title || '新文章',
		description: parsed.fm.description || '',
		pubDate: parsed.fm.pubDate || todayStr(),
		updatedDate: parsed.fm.updatedDate,
		heroImage: parsed.fm.heroImage,
		tags: parsed.fm.tags || [],
		draft: parsed.fm.draft ?? true,
	});
	const [tagsText, setTagsText] = useState((parsed.fm.tags || []).join(', '));
	const [slug, setSlug] = useState(stripExt(initial.filename));
	const [slugTouched, setSlugTouched] = useState(!initial.isNew);
	const [sha, setSha] = useState(initial.sha);
	const [isNew, setIsNew] = useState(initial.isNew);

	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
	const [error, setError] = useState('');

	// 标题变化时自动生成 slug（仅当用户未手动编辑过 slug）
	function onTitleChange(value: string) {
		setFm((p) => ({ ...p, title: value }));
		if (!slugTouched) {
			setSlug(suggestSlug(value));
		}
	}

	// 初始化 Cherry 编辑器（只执行一次）
	useEffect(() => {
		if (!editorRef.current || cherryRef.current) return;
		const cherry = new Cherry({
			el: editorRef.current,
			value: parsed.body,
			locale: 'zh_CN',
			editor: {
				defaultModel: 'edit&preview',
				height: '100%',
				convertWhenPaste: true,
			},
			fileUpload: (file, callback) => {
				client
					.uploadImage(file)
					.then((url) => callback(url, { name: file.name }))
					.catch((e: unknown) => {
						setError(`图片上传失败：${e instanceof Error ? e.message : e}`);
						setStatus('error');
					});
			},
			callback: {
				afterChange: () => setStatus('dirty'),
			},
		});
		cherryRef.current = cherry;
		return () => {
			try {
				cherry.destroy?.();
			} catch {
				/* ignore */
			}
			cherryRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function buildContent(): string {
		const updatedFm: ArticleFrontmatter = {
			...fm,
			tags: tagsText
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean),
		};
		const body = cherryRef.current?.getValue() ?? '';
		return stringifyArticle(updatedFm, body);
	}

	async function handleSave(publish: boolean) {
		setError('');
		if (!slug.trim()) {
			setError('请填写文件名（slug）');
			return;
		}
		if (!fm.title.trim()) {
			setError('请填写标题');
			return;
		}
		setSaving(true);
		setStatus('saving');
		try {
			const filename = `${slug.trim().replace(/\.md$/, '')}.md`;
			const publishFm: ArticleFrontmatter = { ...fm, draft: publish ? false : fm.draft };
			// 重新构造，确保 draft 状态正确
			const updatedFm: ArticleFrontmatter = {
				...publishFm,
				tags: tagsText
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean),
			};
			const body = cherryRef.current?.getValue() ?? '';
			const content = stringifyArticle(updatedFm, body);

			const newSha = await client.saveArticle(
				{ filename, content, sha, isNew },
				isNew ? `新建文章 ${filename}` : `更新文章 ${filename}`,
			);
			setSha(newSha);
			setIsNew(false);
			setFm((p) => ({ ...p, draft: publishFm.draft }));
			setStatus('saved');
		} catch (e) {
			setError(e instanceof Error ? e.message : '保存失败');
			setStatus('error');
		} finally {
			setSaving(false);
		}
	}

	const statusText =
		status === 'saving'
			? '保存中…'
			: status === 'saved'
				? '已保存'
				: status === 'error'
					? '保存失败'
					: isNew
						? '未保存的新文章'
						: '有更改未保存';

	return (
		<div className="editor-wrap">
			<div className="editor-topbar">
				<button className="btn-secondary" onClick={onBack}>
					← 返回列表
				</button>
				<div className="save-status" data-status={status}>
					{statusText}
				</div>
				<div className="editor-actions">
					<button className="btn-secondary" disabled={saving} onClick={() => handleSave(false)}>
						保存草稿
					</button>
					<button className="btn-primary" disabled={saving} onClick={() => handleSave(true)}>
						{saving ? '保存中…' : '保存并发布'}
					</button>
				</div>
			</div>

			{error && <div className="editor-error">{error}</div>}

			<div className="meta-form">
				<div className="meta-row">
					<label className="meta-field meta-field-title">
						<span>标题</span>
						<input
							type="text"
							value={fm.title}
							onChange={(e) => onTitleChange(e.target.value)}
							placeholder="文章标题"
						/>
					</label>
					<label className="meta-field meta-field-slug">
						<span>文件名</span>
						<input
							type="text"
							value={slug}
							onChange={(e) => {
								setSlug(e.target.value);
								setSlugTouched(true);
							}}
							placeholder="post-slug"
						/>
						<small>.md</small>
					</label>
				</div>

				<label className="meta-field">
					<span>摘要</span>
					<input
						type="text"
						value={fm.description}
						onChange={(e) => setFm((p) => ({ ...p, description: e.target.value }))}
						placeholder="一句话描述这篇文章"
					/>
				</label>

				<div className="meta-row">
					<label className="meta-field">
						<span>发布日期</span>
						<input
							type="date"
							value={fm.pubDate}
							onChange={(e) => setFm((p) => ({ ...p, pubDate: e.target.value }))}
						/>
					</label>
					<label className="meta-field">
						<span>标签（逗号分隔）</span>
						<input
							type="text"
							value={tagsText}
							onChange={(e) => setTagsText(e.target.value)}
							placeholder="技术, 随笔"
						/>
					</label>
					<label className="meta-field meta-field-hero">
						<span>头图 URL（可选）</span>
						<input
							type="text"
							value={fm.heroImage ?? ''}
							onChange={(e) => setFm((p) => ({ ...p, heroImage: e.target.value || undefined }))}
							placeholder="/images/xxx.png"
						/>
					</label>
				</div>

				<label className="meta-checkbox">
					<input
						type="checkbox"
						checked={fm.draft ?? false}
						onChange={(e) => setFm((p) => ({ ...p, draft: e.target.checked }))}
					/>
					<span>标记为草稿（草稿在生产环境不显示）</span>
				</label>
			</div>

			<div className="cherry-container" ref={editorRef} />
		</div>
	);
}
