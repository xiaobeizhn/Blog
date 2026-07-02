import { useCallback, useEffect, useState } from 'react';
import AuthGate, { clearStoredToken, tryAutoLogin } from './AuthGate';
import { GitHubClient } from './github';
import type { ArticleEditState, ArticleListItem, AdminView, GitHubUser } from './types';
import ArticleList from './ArticleList';
import ArticleEditor from './ArticleEditor';
import './admin.css';

export default function AdminApp() {
	const [client, setClient] = useState<GitHubClient | null>(null);
	const [user, setUser] = useState<GitHubUser | null>(null);
	const [authing, setAuthing] = useState(true);

	const [view, setView] = useState<AdminView>('list');
	const [articles, setArticles] = useState<ArticleListItem[]>([]);
	const [listLoading, setListLoading] = useState(false);
	const [listError, setListError] = useState('');
	const [current, setCurrent] = useState<ArticleEditState | null>(null);

	// 启动时尝试自动登录
	useEffect(() => {
		const saved = tryAutoLogin();
		if (!saved) {
			setAuthing(false);
			return;
		}
		const c = new GitHubClient(saved);
		c.verifyToken()
			.then((u) => {
				setClient(c);
				setUser(u);
			})
			.catch(() => {
				clearStoredToken();
			})
			.finally(() => setAuthing(false));
	}, []);

	const handleAuth = useCallback((c: GitHubClient, u: GitHubUser) => {
		setClient(c);
		setUser(u);
	}, []);

	const handleLogout = useCallback(() => {
		clearStoredToken();
		setClient(null);
		setUser(null);
		setView('list');
		setCurrent(null);
	}, []);

	const loadList = useCallback(async () => {
		if (!client) return;
		setListLoading(true);
		setListError('');
		try {
			const list = await client.listArticles();
			// 按日期倒序
			list.sort((a, b) => (a.pubDate < b.pubDate ? 1 : a.pubDate > b.pubDate ? -1 : 0));
			setArticles(list);
		} catch (e) {
			setListError(e instanceof Error ? e.message : '加载失败');
		} finally {
			setListLoading(false);
		}
	}, [client]);

	// 登录后加载列表
	useEffect(() => {
		if (client && view === 'list') {
			loadList();
		}
	}, [client, view, loadList]);

	async function handleEdit(filename: string) {
		if (!client) return;
		try {
			const state = await client.loadArticle(filename);
			setCurrent(state);
			setView('editor');
		} catch (e) {
			setListError(e instanceof Error ? e.message : '打开失败');
		}
	}

	function handleNew() {
		const template = `title: '新文章'\ndescription: ''\npubDate: '${new Date().toISOString().slice(0, 10)}'\ntags: []\ndraft: true\n---\n\n在这里开始写作…`;
		const full = `---\n${template}\n`;
		setCurrent({ filename: 'new-post.md', content: full, sha: '', isNew: true });
		setView('editor');
	}

	async function handleDelete(filename: string, sha: string) {
		if (!client) return;
		try {
			await client.deleteArticle(filename, sha);
			await loadList();
		} catch (e) {
			setListError(e instanceof Error ? e.message : '删除失败');
		}
	}

	if (authing) {
		return (
			<div className="admin-root">
				<div className="admin-loading">正在验证登录…</div>
			</div>
		);
	}

	if (!client || !user) {
		return (
			<div className="admin-root">
				<AuthGate onAuth={handleAuth} />
			</div>
		);
	}

	return (
		<div className="admin-root">
			<header className="admin-header">
				<div className="admin-header-inner">
					<a href="/" className="back-home">← 返回博客</a>
					<h1>管理后台</h1>
					<div className="user-info">
						<img src={user.avatar_url} alt={user.login} className="avatar" />
						<span>{user.name || user.login}</span>
						<button className="btn-link" onClick={handleLogout}>退出</button>
					</div>
				</div>
			</header>

			<main className="admin-main">
				{listError && view === 'list' && (
					<div className="editor-error">{listError}</div>
				)}
				{view === 'list' && (
					<ArticleList
						articles={articles}
						loading={listLoading}
						onEdit={handleEdit}
						onNew={handleNew}
						onDelete={handleDelete}
						onRefresh={loadList}
					/>
				)}
				{view === 'editor' && current && (
					<ArticleEditor
						key={current.filename + (current.isNew ? '-new' : '')}
						client={client}
						initial={current}
						onBack={() => {
							setCurrent(null);
							setView('list');
						}}
					/>
				)}
			</main>
		</div>
	);
}
